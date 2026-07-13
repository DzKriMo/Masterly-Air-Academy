"""
Tests for flight-training service layer.

Covers conflict detection (student, instructor, aircraft overlapping slots)
and flight-log aggregation.
"""
import datetime
import pytest
from django.utils import timezone
from apps.flight_training.models import FlightLesson, Aircraft
from apps.flight_training.services import ConflictDetectionService, FlightLogService


@pytest.mark.django_db
class TestConflictDetection:
    """Scheduling conflict detection for flight lessons."""

    def _create_lesson(self, **overrides):
        """Helper to create a FlightLesson with sensible defaults."""
        defaults = dict(
            student__=None,   # placeholder
            instructor__=None,
            aircraft__=None,
            scheduled_date__=None,
            start_time__=None,
            end_time__=None,
            status='scheduled',
        )
        defaults.update(overrides)
        return FlightLesson.objects.create(**overrides)

    # ------------------------------------------------------------------
    # Student-availability checks
    # ------------------------------------------------------------------

    def test_no_conflict_when_slots_dont_overlap(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Non-overlapping time slots produce no conflicts."""
        now = timezone.now()
        # Existing lesson: 10:00 - 11:00
        FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now,
            end_time=now + datetime.timedelta(hours=1),
            status='scheduled',
        )

        # Proposed slot: 11:30 - 12:30 (no overlap)
        new_start = now + datetime.timedelta(hours=1, minutes=30)
        new_end = now + datetime.timedelta(hours=2, minutes=30)
        conflicts = ConflictDetectionService.resolve_all(
            student_profile.id,
            flight_instructor_profile.id,
            aircraft.id,
            new_start,
            new_end,
        )
        assert conflicts == []

    def test_detects_overlapping_student_flight(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """When the student already has a lesson in the time window."""
        now = timezone.now()
        FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now,
            end_time=now + datetime.timedelta(hours=2),
            status='scheduled',
        )

        new_start = now + datetime.timedelta(minutes=30)
        new_end = now + datetime.timedelta(hours=2, minutes=30)
        conflicts = ConflictDetectionService.resolve_all(
            student_profile.id,
            flight_instructor_profile.id,
            aircraft.id,
            new_start,
            new_end,
        )
        # At minimum the student overlap should be detected
        student_conflicts = [
            c for c in conflicts if 'student'.casefold() in c.casefold()
        ]
        assert len(student_conflicts) >= 1

    def test_detects_overlapping_instructor_flight(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """When the instructor already has a lesson in the time window."""
        now = timezone.now()
        FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now,
            end_time=now + datetime.timedelta(hours=2),
            status='scheduled',
        )

        new_start = now + datetime.timedelta(minutes=30)
        new_end = now + datetime.timedelta(hours=2, minutes=30)
        conflicts = ConflictDetectionService.resolve_all(
            student_profile.id,
            flight_instructor_profile.id,
            aircraft.id,
            new_start,
            new_end,
        )
        instructor_conflicts = [
            c for c in conflicts if 'instructor'.casefold() in c.casefold()
        ]
        assert len(instructor_conflicts) >= 1

    # ------------------------------------------------------------------
    # Aircraft-availability checks
    # ------------------------------------------------------------------

    def test_detects_aircraft_unavailable(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Aircraft in 'maintenance' status is reported as unavailable."""
        now = timezone.now()
        aircraft.status = 'maintenance'
        aircraft.save()

        conflicts = ConflictDetectionService.check_aircraft_availability(
            aircraft.id,
            now + datetime.timedelta(hours=1),
            now + datetime.timedelta(hours=2),
        )
        assert len(conflicts) >= 1
        assert 'maintenance'.casefold() in conflicts[0].casefold()

    def test_detects_overlapping_aircraft_booking(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """When the aircraft is already booked for another lesson."""
        now = timezone.now()
        FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now,
            end_time=now + datetime.timedelta(hours=1),
            status='in_progress',
        )

        new_start = now + datetime.timedelta(minutes=30)
        new_end = now + datetime.timedelta(hours=1, minutes=30)
        conflicts = ConflictDetectionService.check_aircraft_availability(
            aircraft.id,
            new_start,
            new_end,
        )
        assert len(conflicts) >= 1

    def test_aircraft_maintenance_due(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Conflict when maintenance is due before the proposed end time."""
        now = timezone.now()
        aircraft.next_maintenance = now + datetime.timedelta(hours=1)
        aircraft.save()

        new_start = now + datetime.timedelta(minutes=30)
        new_end = now + datetime.timedelta(hours=2)
        conflicts = ConflictDetectionService.check_aircraft_availability(
            aircraft.id,
            new_start,
            new_end,
        )
        assert len(conflicts) >= 1
        assert 'maintenance'.casefold() in conflicts[0].casefold()

    # ------------------------------------------------------------------
    # Instructor qualification checks
    # ------------------------------------------------------------------

    def test_instructor_not_qualified(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Conflict when the instructor is not qualified on the aircraft model."""
        # FlightInstructor has authorized_aircraft_types=['172', 'PA28']
        # Aircraft model is '172' — so should pass.  Change to an unlisted one.
        aircraft.model = 'SR22'
        aircraft.save()

        conflicts = ConflictDetectionService.check_instructor_qualification(
            flight_instructor_profile.id,
            aircraft.id,
        )
        assert len(conflicts) >= 1
        assert 'not qualified'.casefold() in conflicts[0].casefold()

    def test_instructor_qualified(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """No conflict when the instructor is qualified on the aircraft model."""
        conflicts = ConflictDetectionService.check_instructor_qualification(
            flight_instructor_profile.id,
            aircraft.id,
        )
        assert conflicts == []

    # ------------------------------------------------------------------
    # Exclusion of own lesson ID
    # ------------------------------------------------------------------

    def test_exclude_own_lesson_id(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """An overlapping lesson is ignored when its ID is excluded."""
        now = timezone.now()
        lesson = FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now,
            end_time=now + datetime.timedelta(hours=1),
            status='scheduled',
        )

        conflicts = ConflictDetectionService.resolve_all(
            student_profile.id,
            flight_instructor_profile.id,
            aircraft.id,
            now,
            now + datetime.timedelta(hours=1),
            exclude_lesson_id=lesson.id,
        )
        assert conflicts == []


@pytest.mark.django_db
class TestFlightLogService:
    """Flight-log aggregation for student progress tracking."""

    def _build_flight(self, student, instructor, aircraft, day_offset,
                      duration=1.0, grade=80.0, result='passed'):
        """Create a completed flight lesson relative to 'now'."""
        now = timezone.now()
        base = now + datetime.timedelta(days=day_offset)
        return FlightLesson.objects.create(
            student=student,
            instructor=instructor,
            aircraft=aircraft,
            scheduled_date=base.date(),
            start_time=base,
            end_time=base + datetime.timedelta(hours=duration),
            flight_duration=duration,
            briefing_duration=0.5,
            debrief_duration=0.3,
            status='completed',
            grade=grade,
            result=result,
        )

    def test_aggregates_completed_flights(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Multiple completed flights are correctly aggregated."""
        self._build_flight(student_profile, flight_instructor_profile, aircraft, 0, duration=1.5)
        self._build_flight(student_profile, flight_instructor_profile, aircraft, 1, duration=2.0)
        self._build_flight(student_profile, flight_instructor_profile, aircraft, 2, duration=0.5)

        result = FlightLogService.get_student_log(student_profile.id)

        assert result['total_flight_hours'] == 4.0
        assert result['total_lessons'] == 3
        assert len(result['lessons']) == 3
        # Lessons are ordered by scheduled_date ascending
        assert result['lessons'][0]['duration'] == 1.5
        assert result['lessons'][1]['duration'] == 2.0
        assert result['lessons'][2]['duration'] == 0.5

    def test_returns_zero_for_new_student(self, student_profile):
        """A student with no completed flights gets zero counts."""
        result = FlightLogService.get_student_log(student_profile.id)

        assert result['total_flight_hours'] == 0.0
        assert result['total_lessons'] == 0
        assert result['lessons'] == []

    def test_ignores_non_completed_flights(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Scheduled, cancelled, or in-progress lessons are excluded."""
        now = timezone.now()

        FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now,
            end_time=now + datetime.timedelta(hours=1),
            flight_duration=1.0,
            status='scheduled',
        )
        FlightLesson.objects.create(
            student=student_profile,
            instructor=flight_instructor_profile,
            aircraft=aircraft,
            scheduled_date=now.date(),
            start_time=now + datetime.timedelta(hours=2),
            end_time=now + datetime.timedelta(hours=3),
            flight_duration=1.0,
            status='cancelled',
        )

        result = FlightLogService.get_student_log(student_profile.id)
        assert result['total_lessons'] == 0
        assert result['total_flight_hours'] == 0.0

    def test_student_log_includes_grades(
        self, student_profile, flight_instructor_profile, aircraft
    ):
        """Each lesson in the log includes grade and result."""
        self._build_flight(student_profile, flight_instructor_profile, aircraft, 0,
                           duration=1.0, grade=92.0, result='passed')
        result = FlightLogService.get_student_log(student_profile.id)

        lesson = result['lessons'][0]
        assert lesson['grade'] == 92.0
        assert lesson['result'] == 'passed'
        assert lesson['aircraft'] == 'G-ABCD'

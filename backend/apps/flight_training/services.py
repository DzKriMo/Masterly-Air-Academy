"""Flight training services: conflict detection, scheduling."""


class ConflictDetectionService:
    """Detects scheduling conflicts for flight lessons."""

    @staticmethod
    def check_student_availability(student_id, start_time, end_time, exclude_lesson_id=None):
        from .models import FlightLesson
        overlapping = FlightLesson.objects.filter(
            student_id=student_id,
            status__in=['scheduled', 'in_progress'],
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_lesson_id:
            overlapping = overlapping.exclude(id=exclude_lesson_id)
        if overlapping.exists():
            return [f'Student has an overlapping lesson at {overlapping.first().start_time}']
        return []

    @staticmethod
    def check_instructor_availability(instructor_id, start_time, end_time, exclude_lesson_id=None):
        from .models import FlightLesson
        overlapping = FlightLesson.objects.filter(
            instructor_id=instructor_id,
            status__in=['scheduled', 'in_progress'],
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_lesson_id:
            overlapping = overlapping.exclude(id=exclude_lesson_id)
        if overlapping.exists():
            return [f'Instructor has an overlapping lesson at {overlapping.first().start_time}']
        return []

    @staticmethod
    def check_aircraft_availability(aircraft_id, start_time, end_time, exclude_lesson_id=None):
        from .models import FlightLesson, Aircraft
        # Check for overlapping flights
        overlapping = FlightLesson.objects.filter(
            aircraft_id=aircraft_id,
            status__in=['scheduled', 'in_progress'],
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_lesson_id:
            overlapping = overlapping.exclude(id=exclude_lesson_id)
        if overlapping.exists():
            return [f'Aircraft is booked for another lesson at {overlapping.first().start_time}']

        # Check maintenance status
        try:
            aircraft = Aircraft.objects.get(id=aircraft_id)
            if aircraft.status not in ['available', 'in_use']:
                return [f'Aircraft is {aircraft.status}']
            if aircraft.next_maintenance and end_time:
                from datetime import datetime, date
                from django.utils import timezone
                # Normalize types before comparing
                maint = aircraft.next_maintenance
                if isinstance(maint, datetime):
                    maint = maint.date()
                end = end_time
                if isinstance(end, datetime):
                    end = end.date()
                elif isinstance(end, str):
                    from django.utils.dateparse import parse_datetime
                    parsed = parse_datetime(end)
                    end = parsed.date() if parsed else None
                elif hasattr(end_time, 'date'):
                    end = end_time.date()
                if isinstance(maint, date) and isinstance(end, date) and maint < end:
                    reg = getattr(aircraft, 'registration', '')
                    return [f'{reg} has maintenance due on {maint} — cannot schedule flight on {end}']
        except Aircraft.DoesNotExist:
            return ['Aircraft not found']

        return []

    @staticmethod
    def check_instructor_rest(instructor_id, start_time):
        """Instructor must have 12 hours rest between lessons."""
        from django.utils import timezone
        from datetime import timedelta
        from .models import FlightLesson
        cutoff = start_time - timedelta(hours=12)
        recent = FlightLesson.objects.filter(
            instructor_id=instructor_id,
            end_time__gte=cutoff,
            status='completed'
        ).order_by('-end_time').first()
        if recent:
            return [f'Instructor had a lesson ending at {recent.end_time}. Minimum 12h rest required.']
        return []

    @staticmethod
    def check_instructor_qualification(instructor_id, aircraft_id):
        from .models import Aircraft
        from apps.students.models import FlightInstructor
        try:
            aircraft = Aircraft.objects.get(id=aircraft_id)
            instructor = FlightInstructor.objects.get(id=instructor_id)
            if aircraft.model and instructor.authorized_aircraft_types:
                if aircraft.model not in instructor.authorized_aircraft_types:
                    authorized = ', '.join(instructor.authorized_aircraft_types)
                    return [f'You are not qualified to fly {aircraft.registration} ({aircraft.model}). Your authorized types: {authorized}']
        except (Aircraft.DoesNotExist, FlightInstructor.DoesNotExist):
            pass
        return []

    @staticmethod
    def resolve_all(student_id, instructor_id, aircraft_id, start_time, end_time, exclude_lesson_id=None):
        conflicts = []
        conflicts += ConflictDetectionService.check_student_availability(student_id, start_time, end_time, exclude_lesson_id)
        conflicts += ConflictDetectionService.check_instructor_availability(instructor_id, start_time, end_time, exclude_lesson_id)
        conflicts += ConflictDetectionService.check_aircraft_availability(aircraft_id, start_time, end_time, exclude_lesson_id)
        conflicts += ConflictDetectionService.check_instructor_qualification(instructor_id, aircraft_id)
        conflicts += ConflictDetectionService.check_instructor_rest(instructor_id, start_time)
        return conflicts


class FlightLogService:
    """Aggregates flight data for a student."""

    @staticmethod
    def get_student_log(student_id):
        from .models import FlightLesson, FlightLessonTemplate
        from apps.students.models import Student
        lessons = FlightLesson.objects.filter(
            student_id=student_id, status='completed'
        ).order_by('scheduled_date').select_related('instructor', 'aircraft')

        total_hours = sum(
            float(l.flight_duration) for l in lessons if l.flight_duration
        )
        total_lessons = lessons.count()

        # Get student program info for progress calculation
        try:
            student = Student.objects.get(id=student_id)
            program_code = student.program
        except Student.DoesNotExist:
            program_code = None

        # Calculate program progress
        program_progress = 0
        if program_code:
            total_templates = FlightLessonTemplate.objects.filter(
                program__program=program_code
            ).count()
            completed_for_program = lessons.filter(
                student__program=program_code
            ).count()
            program_progress = round(
                (completed_for_program / total_templates * 100) if total_templates > 0 else 0, 1
            )

        return {
            'student_id': str(student_id),
            'total_flight_hours': round(total_hours, 1),
            'total_lessons': total_lessons,
            'program': program_code,
            'program_progress': program_progress,
            'lessons': [
                {
                    'date': l.scheduled_date,
                    'aircraft': l.aircraft.registration,
                    'duration': float(l.flight_duration) if l.flight_duration else 0,
                    'grade': float(l.grade) if l.grade else None,
                    'result': l.result,
                    'instructor_name': f'{l.instructor.first_name} {l.instructor.last_name}' if l.instructor else None,
                    'exercises_completed': l.exercises_completed,
                    'competencies_acquired': l.competencies_acquired,
                    'observations': l.observations,
                }
                for l in lessons
            ],
        }

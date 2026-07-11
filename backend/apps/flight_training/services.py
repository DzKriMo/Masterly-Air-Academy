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
            if aircraft.next_maintenance and aircraft.next_maintenance < end_time:
                return [f'Aircraft maintenance due before flight']
        except Aircraft.DoesNotExist:
            return ['Aircraft not found']

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
                    return [f'Instructor is not qualified on {aircraft.model}']
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
        return conflicts


class FlightLogService:
    """Aggregates flight data for a student."""

    @staticmethod
    def get_student_log(student_id):
        from .models import FlightLesson
        lessons = FlightLesson.objects.filter(
            student_id=student_id, status='completed'
        ).order_by('scheduled_date')

        total_hours = sum(
            float(l.flight_duration) for l in lessons if l.flight_duration
        )
        total_lessons = lessons.count()

        return {
            'student_id': str(student_id),
            'total_flight_hours': round(total_hours, 1),
            'total_lessons': total_lessons,
            'lessons': [
                {
                    'date': l.scheduled_date,
                    'aircraft': l.aircraft.registration,
                    'duration': float(l.flight_duration) if l.flight_duration else 0,
                    'grade': float(l.grade) if l.grade else None,
                    'result': l.result,
                }
                for l in lessons
            ],
        }

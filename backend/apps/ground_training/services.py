"""Ground training services: room conflict detection, attendance bulk operations."""


class RoomConflictService:
    """Checks for scheduling conflicts when booking a room."""

    @staticmethod
    def check_room_conflicts(room, scheduled_date, start_time, end_time, exclude_course_id=None):
        from .models import Course
        conflicts = Course.objects.filter(
            room=room,
            scheduled_date=scheduled_date,
            status__in=['scheduled', 'in_progress'],
        )
        if exclude_course_id:
            conflicts = conflicts.exclude(id=exclude_course_id)

        overlapping = []
        for course in conflicts:
            if start_time < course.end_time and end_time > course.start_time:
                overlapping.append(course)

        return overlapping

    @staticmethod
    def is_room_available(room, scheduled_date, start_time, end_time, exclude_course_id=None):
        conflicts = RoomConflictService.check_room_conflicts(
            room, scheduled_date, start_time, end_time, exclude_course_id
        )
        return len(conflicts) == 0


class AttendanceService:
    """Bulk attendance operations."""

    @staticmethod
    def bulk_record(course, date, records):
        """records: list of {student_id, status, notes}"""
        from .models import AttendanceRecord
        created = []
        for record in records:
            att, _ = AttendanceRecord.objects.update_or_create(
                student_id=record['student_id'],
                course=course,
                date=date,
                defaults={
                    'status': record['status'],
                    'notes': record.get('notes', ''),
                },
            )
            created.append(att)
        return created

    @staticmethod
    def get_student_attendance_rate(student, academic_year=None):
        from .models import AttendanceRecord
        qs = AttendanceRecord.objects.filter(student=student)
        if academic_year:
            qs = qs.filter(course__academic_year=academic_year)

        total = qs.count()
        if total == 0:
            return 0.0

        present_or_late = qs.filter(status__in=['present', 'late']).count()
        return round((present_or_late / total) * 100, 1)

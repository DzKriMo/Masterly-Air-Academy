from rest_framework import serializers
from .models import (
    Subject, Module, ModuleLesson, ModuleDocument, ModuleExercise,
    Room, Course, CourseEnrollment, AttendanceRecord,
    GroundEvaluation, TimeEntry,
)


class ModuleLessonSerializer(serializers.ModelSerializer):
    module_title = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    has_video = serializers.SerializerMethodField()
    video_status = serializers.SerializerMethodField()
    video_watched_seconds = serializers.SerializerMethodField()
    video_tab_switches = serializers.SerializerMethodField()

    class Meta:
        model = ModuleLesson
        fields = [
            'id', 'module', 'lesson_no', 'title', 'content', 'video_url',
            'is_mandatory', 'has_video', 'module_title', 'subject_code',
            'video_status', 'video_watched_seconds', 'video_tab_switches',
        ]

    def get_module_title(self, obj):
        return obj.module.title if obj.module else ''

    def get_subject_code(self, obj):
        return obj.module.subject.code if obj.module and obj.module.subject else ''

    def get_has_video(self, obj):
        return bool(obj.video_url)

    def _student_view(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        student = getattr(request.user, 'student_profile', None)
        if student is None:
            return None
        view = self.context.get('_lesson_video_views', {}).get((obj.id, student.id))
        if view is not None:
            return view
        view = obj.video_views.filter(student=student).first()
        if self.context.get('_cache_lesson_views'):
            self.context.setdefault('_lesson_video_views', {})[(obj.id, student.id)] = view
        return view

    def get_video_status(self, obj):
        view = self._student_view(obj)
        return view.status if view else None

    def get_video_watched_seconds(self, obj):
        view = self._student_view(obj)
        return view.watched_seconds if view else 0

    def get_video_tab_switches(self, obj):
        view = self._student_view(obj)
        return view.tab_switches if view else 0


class ModuleDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuleDocument
        fields = ['id', 'module', 'name', 'file_url', 'type']


class ModuleExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuleExercise
        fields = ['id', 'module', 'title', 'instructions', 'due_date', 'created_at']


class ModuleSerializer(serializers.ModelSerializer):
    lessons = ModuleLessonSerializer(many=True, read_only=True)
    documents = ModuleDocumentSerializer(many=True, read_only=True)
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'subject', 'subject_name', 'title', 'title_ar', 'title_fr', 'description', 'description_ar', 'description_fr', 'duration', 'order', 'status', 'lessons', 'documents']

    def get_subject_name(self, obj):
        return obj.subject.title_en if obj.subject else ''


class SubjectSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'title_en', 'title_fr', 'title_ar',
            'description_en', 'description_fr', 'description_ar',
            'total_hours', 'program', 'status',
            'bibliography', 'required_documents', 'prerequisites',
            'modules', 'created_at', 'updated_at',
        ]


class SubjectListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no nested modules)."""
    module_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'code', 'title_en', 'title_fr', 'title_ar', 'total_hours', 'program', 'status', 'bibliography', 'required_documents', 'prerequisites', 'module_count']

    def get_module_count(self, obj):
        count = getattr(obj, 'module_count', None)
        if count is not None:
            return count
        return obj.modules.count()


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'location', 'equipment', 'status']


class CourseSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source='room.name', read_only=True)
    promotion_code = serializers.CharField(source='promotion.code', read_only=True)
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'subject', 'subject_code', 'instructor', 'instructor_name',
            'promotion', 'promotion_code', 'title', 'title_ar', 'title_fr', 'scheduled_date', 'start_time', 'end_time',
            'room', 'room_name', 'status', 'notes', 'enrollment_count',
            'created_at', 'updated_at',
        ]

    def get_instructor_name(self, obj):
        return f'{obj.instructor.first_name} {obj.instructor.last_name}'

    def get_enrollment_count(self, obj):
        count = getattr(obj, 'enrollment_count', None)
        if count is not None:
            return count
        return obj.enrollments.count()


class CourseCreateSerializer(serializers.ModelSerializer):
    """Used for creating courses — auto-assigns instructor and promotion."""
    class Meta:
        model = Course
        fields = ['subject', 'instructor', 'promotion', 'title', 'title_ar', 'title_fr', 'scheduled_date', 'start_time', 'end_time', 'room', 'notes', 'status']
        extra_kwargs = {
            'instructor': {'required': False},
            'promotion': {'required': False},
        }

    def validate(self, data):
        request = self.context.get('request')

        if not data.get('instructor') and request:
            from apps.students.models import GroundInstructor
            gi, _ = GroundInstructor.objects.get_or_create(
                user=request.user,
                defaults={
                    'first_name': request.user.get_full_name() or request.user.email or '',
                    'last_name': '',
                    'status': 'active',
                }
            )
            data['instructor'] = gi

        if not data.get('promotion'):
            from apps.students.models import Promotion
            promo = Promotion.objects.filter(status='in_progress').order_by('-start_date').first()
            if not promo:
                raise serializers.ValidationError({'promotion': 'No active promotion configured.'})
            data['promotion'] = promo

        # Convert empty strings to None for optional FK fields
        if not data.get('room'):
            data['room'] = None

        from .services import RoomConflictService
        room = data.get('room')
        date = data.get('scheduled_date')
        start = data.get('start_time')
        end = data.get('end_time')

        if room and date and start and end:
            conflicts = RoomConflictService.check_room_conflicts(room, date, start, end)
            if conflicts:
                raise serializers.ValidationError({'room': f'Room is already booked: {conflicts[0].title}'})

        if not data.get('instructor'):
            raise serializers.ValidationError({'instructor': 'This field is required.'})
        if not data.get('promotion'):
            raise serializers.ValidationError({'promotion': 'This field is required.'})

        return data


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseEnrollment
        fields = ['id', 'student', 'student_name', 'course', 'status', 'enrolled_at']

    def get_student_name(self, obj):
        return obj.student.full_name


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'student', 'student_name', 'course', 'date', 'status', 'notes', 'recorded_at']

    def get_student_name(self, obj):
        return obj.student.full_name


class BulkAttendanceSerializer(serializers.Serializer):
    """Accepts a list of attendance records for bulk creation."""
    course_id = serializers.UUIDField(required=False)
    date = serializers.DateField(required=False)
    records = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(allow_blank=True),
            allow_empty=False,
        )
    )

    def validate_records(self, value):
        for record in value:
            if 'student_id' not in record:
                raise serializers.ValidationError('Each record must have a student_id.')
            if 'status' not in record:
                raise serializers.ValidationError('Each record must have a status.')
            valid_statuses = ['present', 'absent', 'late', 'excused_absence']
            if record['status'] not in valid_statuses:
                raise serializers.ValidationError(f'Invalid status: {record["status"]}')
        return value


class StudentProgressSerializer(serializers.Serializer):
    """Structured student progress across all subjects."""
    student_id = serializers.UUIDField()
    student_name = serializers.CharField()
    total_courses = serializers.IntegerField()
    completed_courses = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    subjects = serializers.ListField()


class GroundEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    subject_code = serializers.CharField(source='course.subject.code', read_only=True)

    class Meta:
        model = GroundEvaluation
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.full_name


class BulkEvaluationSerializer(serializers.Serializer):
    course_id = serializers.UUIDField(required=False)
    records = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField(allow_blank=True), allow_empty=False),
    )

    def validate_records(self, value):
        for record in value:
            if 'student' not in record:
                raise serializers.ValidationError('Each record must have a student field.')
            # score is optional but if present must be 0-100
            score = record.get('score')
            if score:
                try:
                    s = int(score)
                    if s < 0 or s > 100:
                        raise serializers.ValidationError(f'Score must be between 0 and 100, got {s}')
                except ValueError:
                    raise serializers.ValidationError(f'Invalid score value: {score}')
        return value


class TimeEntrySerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = '__all__'
        read_only_fields = ['instructor']

    def get_instructor_name(self, obj):
        return obj.instructor.get_full_name() or obj.instructor.email

    def get_total_hours(self, obj):
        if obj.clock_in and obj.clock_out:
            from datetime import datetime, timedelta
            ci = datetime.combine(obj.date, obj.clock_in)
            co = datetime.combine(obj.date, obj.clock_out)
            if co < ci:
                co += timedelta(days=1)
            total = (co - ci).total_seconds() / 3600
            total -= obj.break_minutes / 60
            return round(max(total, 0), 2)
        return None

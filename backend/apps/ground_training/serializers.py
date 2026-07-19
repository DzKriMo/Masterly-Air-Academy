from rest_framework import serializers
from .models import (
    Subject, Module, ModuleLesson, ModuleDocument, ModuleExercise,
    Room, Course, CourseEnrollment, AttendanceRecord,
    GroundEvaluation,
)


class ModuleLessonSerializer(serializers.ModelSerializer):
    module_title = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()

    class Meta:
        model = ModuleLesson
        fields = ['id', 'module', 'lesson_no', 'title', 'content', 'video_url', 'module_title', 'subject_code']

    def get_module_title(self, obj):
        return obj.module.title if obj.module else ''

    def get_subject_code(self, obj):
        return obj.module.subject.code if obj.module and obj.module.subject else ''


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

    class Meta:
        model = Module
        fields = ['id', 'subject', 'title', 'title_ar', 'title_fr', 'description', 'description_ar', 'description_fr', 'duration', 'order', 'status', 'lessons', 'documents']


class SubjectSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'title_en', 'title_fr', 'title_ar',
            'description_en', 'description_fr', 'description_ar',
            'total_hours', 'program', 'academic_year', 'status',
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
        return obj.modules.count()


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'location', 'equipment', 'status']


class CourseSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source='room.name', read_only=True)
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'subject', 'subject_code', 'instructor', 'instructor_name',
            'academic_year', 'title', 'title_ar', 'title_fr', 'scheduled_date', 'start_time', 'end_time',
            'room', 'room_name', 'status', 'notes', 'enrollment_count',
            'created_at', 'updated_at',
        ]

    def get_instructor_name(self, obj):
        return f'{obj.instructor.first_name} {obj.instructor.last_name}'

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class CourseCreateSerializer(serializers.ModelSerializer):
    """Used for creating courses — auto-assigns instructor and academic_year."""
    class Meta:
        model = Course
        fields = ['subject', 'instructor', 'academic_year', 'title', 'title_ar', 'title_fr', 'scheduled_date', 'start_time', 'end_time', 'room', 'notes', 'status']

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

        if not data.get('academic_year'):
            from apps.core.models import AcademicYear
            ay = AcademicYear.objects.filter(is_active=True).first()
            if not ay:
                raise serializers.ValidationError({'academic_year': 'No active academic year configured.'})
            data['academic_year'] = ay

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
        if not data.get('academic_year'):
            raise serializers.ValidationError({'academic_year': 'This field is required.'})

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

    class Meta:
        model = GroundEvaluation
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.full_name

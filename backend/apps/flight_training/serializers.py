from rest_framework import serializers
from .models import (
    FlightProgram, FlightLessonTemplate, Aircraft,
    FlightLesson, FlightPreparation, FlightStatus,
    InstructorAvailability, ResourceBooking, MaintenanceRecord,
    Simulator, SimulatorSession, FlightExercise, FlightLogEntry,
)


class FlightProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightProgram
        fields = ['id', 'code', 'title', 'description', 'program', 'status']


class FlightLessonTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightLessonTemplate
        fields = [
            'id', 'program', 'lesson_number', 'title', 'title_ar', 'title_fr', 'objective',
            'competencies', 'planned_duration', 'briefing_time',
            'flight_time', 'debriefing_time', 'success_criteria',
        ]


class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = [
            'id', 'registration', 'manufacturer', 'model',
            'serial_number', 'year_of_manufacture', 'base_location',
            'status', 'airframe_hours', 'engine_hours', 'propeller_hours',
            'last_maintenance', 'next_maintenance',
            'insurance_expiry', 'certification_expiry',
            'created_at', 'updated_at',
        ]


class AircraftListSerializer(serializers.ModelSerializer):
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = Aircraft
        fields = [
            'id', 'registration', 'manufacturer', 'model', 'serial_number',
            'year_of_manufacture', 'status', 'airframe_hours', 'engine_hours',
            'total_hours', 'last_maintenance', 'next_maintenance',
            'insurance_expiry', 'certification_expiry', 'base_location',
        ]

    def get_total_hours(self, obj):
        return float(obj.airframe_hours or 0)


class FlightLessonSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    instructor_name = serializers.SerializerMethodField()
    aircraft_reg = serializers.CharField(source='aircraft.registration', read_only=True)
    has_preparation = serializers.SerializerMethodField()

    class Meta:
        model = FlightLesson
        fields = [
            'id', 'student', 'student_name', 'instructor', 'instructor_name',
            'aircraft', 'aircraft_reg', 'lesson_template', 'scheduled_date',
            'start_time', 'end_time', 'flight_duration', 'briefing_duration',
            'debrief_duration', 'status', 'exercises_completed',
            'competencies_acquired', 'difficulties', 'observations',
            'recommendations', 'grade', 'result', 'pedagogical_note',
            'departure_time', 'arrival_time', 'signed_by_instructor',
            'has_preparation', 'created_at', 'updated_at',
        ]

    def get_student_name(self, obj):
        return obj.student.full_name

    def get_instructor_name(self, obj):
        return f'{obj.instructor.first_name} {obj.instructor.last_name}'

    def get_has_preparation(self, obj):
        return hasattr(obj, 'preparation') and obj.preparation is not None


class FlightLessonCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightLesson
        fields = [
            'student', 'instructor', 'aircraft', 'lesson_template',
            'scheduled_date', 'start_time', 'end_time', 'status',
        ]
        extra_kwargs = {
            'instructor': {'required': False},
            'lesson_template': {'required': False},
            'status': {'required': False},
        }

    def validate(self, data):
        # Skip full validation for partial updates (e.g. cancel/reschedule)
        if self.partial:
            return data

        request = self.context.get('request')

        if not data.get('instructor') and request:
            from apps.students.models import FlightInstructor
            fi, _ = FlightInstructor.objects.get_or_create(
                user=request.user,
                defaults={
                    'first_name': request.user.get_full_name() or request.user.email or '',
                    'last_name': '',
                    'status': 'active',
                }
            )
            data['instructor'] = fi

        if not data.get('instructor'):
            raise serializers.ValidationError({'instructor': 'This field is required.'})

        from .services import ConflictDetectionService
        if data.get('start_time') and data.get('end_time'):
            conflicts = ConflictDetectionService.resolve_all(
                student_id=data['student'].id,
                instructor_id=data['instructor'].id,
                aircraft_id=data['aircraft'].id,
                start_time=data.get('start_time'),
                end_time=data.get('end_time'),
            )
            if conflicts:
                raise serializers.ValidationError({'conflicts': conflicts})
        return data


class FlightPreparationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student = serializers.UUIDField(source='flight_lesson.student_id', read_only=True)
    aircraft = serializers.UUIDField(source='flight_lesson.aircraft_id', read_only=True)
    aircraft_reg = serializers.SerializerMethodField()

    class Meta:
        model = FlightPreparation
        fields = [
            'id', 'flight_lesson', 'student', 'student_name',
            'aircraft', 'aircraft_reg',
            'weather_check', 'notam_check', 'performance_check',
            'document_check', 'medical_check',
            'lesson_objectives', 'briefing_notes', 'prepared_at',
        ]

    def get_student_name(self, obj):
        lesson = obj.flight_lesson
        return lesson.student.full_name if lesson and lesson.student else ''

    def get_aircraft_reg(self, obj):
        lesson = obj.flight_lesson
        return lesson.aircraft.registration if lesson and lesson.aircraft else ''


class FlightEvaluationSerializer(serializers.Serializer):
    flight_duration = serializers.DecimalField(max_digits=4, decimal_places=1, required=True)
    exercises_completed = serializers.ListField(child=serializers.CharField(), default=list)
    competencies_acquired = serializers.ListField(child=serializers.CharField(), default=list)
    difficulties = serializers.CharField(required=False, allow_blank=True)
    observations = serializers.CharField(required=False, allow_blank=True)
    recommendations = serializers.CharField(required=False, allow_blank=True)
    grade = serializers.DecimalField(max_digits=4, decimal_places=1, required=True)
    result = serializers.CharField(required=True)
    pedagogical_note = serializers.CharField(required=False, allow_blank=True)
    departure_time = serializers.DateTimeField(required=False, allow_null=True)
    arrival_time = serializers.DateTimeField(required=False, allow_null=True)
    signed_by_instructor = serializers.BooleanField(required=False, default=False)


class ResourceBookingSerializer(serializers.ModelSerializer):
    resource_name = serializers.SerializerMethodField()

    class Meta:
        model = ResourceBooking
        fields = ['id', 'resource_type', 'resource_id', 'resource_name', 'start_time', 'end_time', 'activity_type', 'activity_id', 'status', 'notes']

    def get_resource_name(self, obj):
        if obj.resource_type == 'aircraft':
            from .models import Aircraft
            a = Aircraft.objects.filter(id=obj.resource_id).first()
            return a.registration if a else ''
        if obj.resource_type == 'simulator':
            from .models import Simulator
            s = Simulator.objects.filter(id=obj.resource_id).first()
            return s.name if s else ''
        if obj.resource_type == 'room':
            from apps.ground_training.models import Room
            r = Room.objects.filter(id=obj.resource_id).first()
            return r.name if r else ''
        return ''


class InstructorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorAvailability
        fields = ['id', 'instructor', 'day_of_week', 'start_time', 'end_time', 'is_available']


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    aircraft_registration = serializers.CharField(source='aircraft.registration', read_only=True, default='')

    class Meta:
        model = MaintenanceRecord
        fields = ['id', 'aircraft', 'aircraft_registration', 'type', 'description', 'start_date', 'end_date', 'status', 'notes', 'created_at']


class SimulatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Simulator
        fields = [
            'id', 'name', 'manufacturer', 'model_name', 'qualification_type',
            'location', 'status', 'last_maintenance', 'next_maintenance', 'created_at',
        ]


class SimulatorSessionSerializer(serializers.ModelSerializer):
    simulator_name = serializers.CharField(source='simulator.name', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = SimulatorSession
        fields = [
            'id', 'simulator', 'simulator_name', 'student', 'student_name',
            'instructor', 'instructor_name', 'scheduled_date', 'duration',
            'status', 'notes', 'created_at',
        ]

    def get_instructor_name(self, obj):
        return f'{obj.instructor.first_name} {obj.instructor.last_name}'


class FlightExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightExercise
        fields = [
            'id', 'code', 'title', 'title_ar', 'title_fr',
            'category', 'description', 'program',
            'is_active', 'order', 'created_at', 'updated_at',
        ]


class FlightLogEntrySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    aircraft_reg = serializers.CharField(source='aircraft.registration', read_only=True, default=None)
    validated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FlightLogEntry
        fields = [
            'id', 'student', 'student_name', 'student_number',
            'aircraft', 'aircraft_reg', 'aircraft_text',
            'date', 'departure_time', 'arrival_time',
            'flight_duration', 'exercises', 'notes',
            'status', 'validated_by', 'validated_by_name',
            'validated_at', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['student', 'validated_by', 'validated_at', 'status', 'created_at', 'updated_at']

    def get_validated_by_name(self, obj):
        if obj.validated_by:
            return f'{obj.validated_by.first_name} {obj.validated_by.last_name}'
        return None


class FlightLogEntryValidateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

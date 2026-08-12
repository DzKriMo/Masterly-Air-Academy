from rest_framework import serializers
from .models import Student, MedicalCertificate, FlightInstructor, GroundInstructor, AdminProfile, Promotion


class PromotionSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)
    program_name = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = ['id', 'code', 'program', 'program_name', 'name', 'start_date', 'end_date', 'status', 'main_instructor', 'student_count', 'created_at', 'updated_at']

    def get_program_name(self, obj):
        return obj.get_program_display()


class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    user_id = serializers.CharField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', required=False, allow_null=True)
    instructor_name = serializers.SerializerMethodField()
    medical_certificate = serializers.SerializerMethodField()
    medical_expiry = serializers.SerializerMethodField()
    emergency_contact = serializers.SerializerMethodField()
    emergency_phone = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    promotion_code = serializers.CharField(read_only=True)
    main_instructor = serializers.PrimaryKeyRelatedField(queryset=FlightInstructor.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Student
        fields = [
            'id', 'user_id', 'student_number', 'first_name', 'last_name',
            'full_name', 'email', 'phone', 'address', 'date_of_birth',
            'nationality', 'program', 'status', 'enrollment_date',
            'promotion', 'promotion_code',
            'main_instructor', 'instructor_name',
            'medical_certificate', 'medical_expiry',
            'emergency_contact', 'emergency_phone', 'notes',
        ]

    def get_full_name(self, obj):
        return obj.full_name

    def get_instructor_name(self, obj):
        if obj.main_instructor:
            return f'{obj.main_instructor.first_name} {obj.main_instructor.last_name}'
        return ''

    def get_medical_certificate(self, obj):
        cert = obj.medical_certificates.order_by('-expiry_date').first()
        return cert.issuer if cert else ''

    def get_medical_expiry(self, obj):
        cert = obj.medical_certificates.order_by('-expiry_date').first()
        return str(cert.expiry_date) if cert else None

    def get_emergency_contact(self, obj):
        return ''

    def get_emergency_phone(self, obj):
        return ''

    def get_notes(self, obj):
        return ''

    def update(self, instance, validated_data):
        email = validated_data.pop('email', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if email is not None and instance.user_id:
            instance.user.email = email
            instance.user.save(update_fields=['email'])
        return instance


class MedicalCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalCertificate
        fields = ['id', 'student', 'issue_date', 'expiry_date', 'issuer', 'file_url', 'status']


class FlightInstructorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    user_id = serializers.CharField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', required=False, allow_null=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = FlightInstructor
        fields = [
            'id', 'user_id', 'name', 'email', 'first_name', 'last_name',
            'license_number', 'qualifications', 'status',
            'total_flight_hours', 'instruction_hours', 'student_count',
        ]
        read_only_fields = ['id', 'user_id', 'name', 'student_count']

    def get_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'

    def get_student_count(self, obj):
        return obj.assigned_students.count()

    def update(self, instance, validated_data):
        email = validated_data.pop('email', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if email is not None and instance.user_id:
            instance.user.email = email
            instance.user.save(update_fields=['email'])
        return instance


class GroundInstructorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    user_id = serializers.CharField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', required=False, allow_null=True)
    phone = serializers.SerializerMethodField()
    license_number = serializers.SerializerMethodField()
    total_flight_hours = serializers.SerializerMethodField()
    instruction_hours = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = GroundInstructor
        fields = [
            'id', 'user_id', 'name', 'email', 'phone', 'first_name', 'last_name',
            'license_number', 'qualifications', 'status',
            'total_flight_hours', 'instruction_hours', 'student_count',
            'medical_expiry', 'hire_date', 'authorized_subjects',
        ]
        read_only_fields = [
            'id', 'user_id', 'name', 'phone', 'license_number',
            'total_flight_hours', 'instruction_hours', 'student_count',
        ]

    def get_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip() or (obj.user.email if obj.user_id else '')

    def get_phone(self, obj):
        return ''

    def get_license_number(self, obj):
        return ''

    def get_total_flight_hours(self, obj):
        return 0

    def get_instruction_hours(self, obj):
        return 0

    def get_student_count(self, obj):
        return 0

    def update(self, instance, validated_data):
        email = validated_data.pop('email', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if email is not None and instance.user_id:
            instance.user.email = email
            instance.user.save(update_fields=['email'])
        return instance


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminProfile
        fields = ['id', 'user', 'first_name', 'last_name', 'department']

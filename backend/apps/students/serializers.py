from rest_framework import serializers
from .models import Student, MedicalCertificate, FlightInstructor, AdminProfile


class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    user_id = serializers.CharField(source='user.id', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    medical_certificate = serializers.SerializerMethodField()
    medical_expiry = serializers.DateField(read_only=True)
    emergency_contact = serializers.SerializerMethodField()
    emergency_phone = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'user_id', 'student_number', 'first_name', 'last_name',
            'full_name', 'email', 'phone', 'address', 'date_of_birth',
            'nationality', 'program', 'status', 'enrollment_date',
            'instructor_name', 'medical_certificate', 'medical_expiry',
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

    def get_emergency_contact(self, obj):
        return ''

    def get_emergency_phone(self, obj):
        return ''

    def get_notes(self, obj):
        return ''


class MedicalCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalCertificate
        fields = ['id', 'student', 'issue_date', 'expiry_date', 'issuer', 'file_url', 'status']


class FlightInstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightInstructor
        fields = ['id', 'first_name', 'last_name', 'license_number', 'status', 'total_flight_hours', 'instruction_hours']


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminProfile
        fields = ['id', 'user', 'first_name', 'last_name', 'department']

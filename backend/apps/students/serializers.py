from rest_framework import serializers
from .models import Student, MedicalCertificate, FlightInstructor, AdminProfile


class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    user_id = serializers.CharField(source='user.id', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'user_id', 'student_number', 'first_name', 'last_name', 'full_name', 'program', 'status', 'enrollment_date']

    def get_full_name(self, obj):
        return obj.full_name


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

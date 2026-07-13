from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import HasRolePermission
from .models import Student, MedicalCertificate, FlightInstructor, AdminProfile
from .serializers import StudentListSerializer, MedicalCertificateSerializer, FlightInstructorSerializer, AdminProfileSerializer


class StudentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentListSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'
    search_fields = ['first_name', 'last_name', 'student_number']
    filterset_fields = ['program', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(user=self.request.user)
        return qs


class MedicalCertificateViewSet(viewsets.ModelViewSet):
    queryset = MedicalCertificate.objects.all()
    serializer_class = MedicalCertificateSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        return qs


class AdminProfileViewSet(viewsets.ModelViewSet):
    queryset = AdminProfile.objects.all()
    serializer_class = AdminProfileSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'accounts.manage'


class FlightInstructorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FlightInstructor.objects.all()
    serializer_class = FlightInstructorSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'
    search_fields = ['first_name', 'last_name']

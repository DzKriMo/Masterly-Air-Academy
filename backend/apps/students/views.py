from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission
from .models import Student, MedicalCertificate, FlightInstructor, AdminProfile
from .serializers import StudentListSerializer, MedicalCertificateSerializer, FlightInstructorSerializer, AdminProfileSerializer


class StudentViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        student = self.get_object()
        student.status = 'suspended'
        student.save()
        return Response({'status': 'suspended'})

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        student = self.get_object()
        student.status = 'active'
        student.save()
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        student = self.get_object()
        student.status = 'archived'
        student.save()
        return Response({'status': 'archived'})


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


class GroundInstructorViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'

    def list(self, request):
        from django.contrib.auth import get_user_model
        from .serializers import GroundInstructorSerializer
        User = get_user_model()
        instructors = User.objects.filter(
            role__in=['ground_instructor', 'chief_ground_instructor']
        ).values('id', 'email', 'status', 'first_name', 'last_name')
        data = []
        for u in instructors:
            data.append({
                'id': str(u['id']),
                'name': f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u['email'],
                'email': u['email'],
                'phone': '',
                'license_number': '',
                'qualifications': [],
                'status': u.get('status', 'active'),
                'total_flight_hours': 0,
                'instruction_hours': 0,
                'student_count': 0,
            })
        return Response(GroundInstructorSerializer(data, many=True).data)

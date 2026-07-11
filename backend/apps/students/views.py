from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import HasRolePermission
from .models import Student
from .serializers import StudentListSerializer


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

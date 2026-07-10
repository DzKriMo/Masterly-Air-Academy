from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission
from .models import (
    Subject, Module, ModuleLesson, ModuleDocument, Room,
    Course, CourseEnrollment, AttendanceRecord,
)
from .serializers import (
    SubjectSerializer, SubjectListSerializer,
    ModuleSerializer, ModuleLessonSerializer, ModuleDocumentSerializer,
    RoomSerializer,
    CourseSerializer, CourseCreateSerializer,
    CourseEnrollmentSerializer,
    AttendanceRecordSerializer, BulkAttendanceSerializer,
    StudentProgressSerializer,
)


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.prefetch_related('modules__lessons').all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['program', 'status', 'academic_year']
    search_fields = ['code', 'title_en', 'title_fr']
    ordering_fields = ['code', 'total_hours', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SubjectListSerializer
        return SubjectSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(status='active')
        return qs


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related('subject').prefetch_related('lessons', 'documents').all()
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['subject', 'status']

    @action(detail=True, methods=['get'])
    def lessons(self, request, pk=None):
        module = self.get_object()
        lessons = module.lessons.all()
        return Response(ModuleLessonSerializer(lessons, many=True).data)

    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        module = self.get_object()
        file = request.FILES.get('file')
        name = request.data.get('name', file.name if file else 'Document')
        doc_type = request.data.get('type', 'pdf')

        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Simple local storage (MinIO comes in Sprint 7)
        from django.core.files.storage import default_storage
        path = default_storage.save(f'module_docs/{module.id}/{file.name}', file)
        file_url = f'/media/{path}'

        doc = ModuleDocument.objects.create(
            module=module,
            name=name,
            file_url=file_url,
            type=doc_type,
        )
        return Response(ModuleDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']
    search_fields = ['name', 'location']


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['status', 'subject', 'academic_year', 'instructor']
    search_fields = ['title', 'subject__title_en']
    ordering_fields = ['scheduled_date', 'start_time']

    def get_queryset(self):
        qs = Course.objects.select_related('subject', 'instructor', 'room').all()
        if self.request.user.role == 'student':
            return qs.filter(enrollments__student__user=self.request.user)
        if self.request.user.role == 'ground_instructor':
            return qs.filter(instructor__user=self.request.user)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CourseCreateSerializer
        return CourseSerializer

    @action(detail=True, methods=['post'])
    def attendance(self, request, pk=None):
        course = self.get_object()
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        created = []
        for record in serializer.validated_data['records']:
            att, _ = AttendanceRecord.objects.update_or_create(
                student_id=record['student_id'],
                course=course,
                date=serializer.validated_data['date'],
                defaults={
                    'status': record['status'],
                    'notes': record.get('notes', ''),
                },
            )
            created.append(att)

        return Response(
            AttendanceRecordSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        course = self.get_object()
        enrollments = course.enrollments.select_related('student').all()
        return Response(CourseEnrollmentSerializer(enrollments, many=True).data)


class CourseEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = CourseEnrollment.objects.select_related('student', 'course').all()
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['course', 'student', 'status']

    @action(detail=False, methods=['post'])
    def bulk_enroll(self, request):
        course_id = request.data.get('course_id')
        student_ids = request.data.get('student_ids', [])

        if not course_id or not student_ids:
            return Response(
                {'error': 'course_id and student_ids are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrolled = []
        for sid in student_ids:
            enrollment, _ = CourseEnrollment.objects.get_or_create(
                student_id=sid,
                course_id=course_id,
            )
            enrolled.append(enrollment)

        return Response(
            CourseEnrollmentSerializer(enrolled, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related('student', 'course').all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'attendance.view'
    filterset_fields = ['course', 'student', 'status', 'date']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        return qs


class StudentProgressViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Return progress for the authenticated student."""
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        enrollments = CourseEnrollment.objects.filter(student=student)
        total = enrollments.count()
        completed = enrollments.filter(course__status='completed').count()

        attendance_records = AttendanceRecord.objects.filter(student=student)
        total_att = attendance_records.count()
        present_att = attendance_records.filter(status='present').count()

        subjects_data = []
        for enrollment in enrollments.select_related('course__subject'):
            subj = enrollment.course.subject
            subjects_data.append({
                'subject_code': subj.code,
                'subject_title': subj.title_en,
                'course_title': enrollment.course.title,
                'status': enrollment.course.status,
                'scheduled_date': enrollment.course.scheduled_date,
            })

        return Response({
            'student_id': str(student.id),
            'student_name': student.full_name,
            'total_courses': total,
            'completed_courses': completed,
            'attendance_rate': round((present_att / total_att * 100) if total_att > 0 else 0, 1),
            'subjects': subjects_data,
        })

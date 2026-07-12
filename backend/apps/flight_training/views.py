from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission
from .models import (
    Aircraft, FlightLesson, FlightPreparation, FlightStatus,
    InstructorAvailability, ResourceBooking, MaintenanceRecord,
)
from .serializers import (
    AircraftSerializer, AircraftListSerializer,
    FlightLessonSerializer, FlightLessonCreateSerializer,
    FlightPreparationSerializer, FlightEvaluationSerializer,
    ResourceBookingSerializer, InstructorAvailabilitySerializer,
)
from .models import MaintenanceRecord
from .services import ConflictDetectionService, FlightLogService


class AircraftViewSet(viewsets.ModelViewSet):
    queryset = Aircraft.objects.all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'fleet.view'
    filterset_fields = ['status', 'manufacturer']
    search_fields = ['registration', 'manufacturer', 'model']
    ordering_fields = ['registration', 'airframe_hours']

    def get_serializer_class(self):
        if self.action == 'list':
            return AircraftListSerializer
        return AircraftSerializer


class FlightLessonViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'
    filterset_fields = ['status', 'student', 'instructor', 'aircraft']
    search_fields = ['student__first_name', 'student__last_name', 'aircraft__registration']
    ordering_fields = ['scheduled_date', 'start_time']

    def get_queryset(self):
        qs = FlightLesson.objects.select_related('student', 'instructor', 'aircraft').all()
        if self.request.user.role == 'student':
            try:
                from apps.students.models import Student
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            try:
                from apps.students.models import FlightInstructor
                fi = FlightInstructor.objects.get(user=self.request.user)
                return qs.filter(instructor=fi)
            except FlightInstructor.DoesNotExist:
                return qs.none()
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return FlightLessonCreateSerializer
        return FlightLessonSerializer

    @action(detail=True, methods=['post'])
    def preparation(self, request, pk=None):
        lesson = self.get_object()
        if hasattr(lesson, 'preparation'):
            return Response({'error': 'Preparation already exists'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FlightPreparationSerializer(data={
            **request.data,
            'flight_lesson': str(lesson.id),
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        lesson = self.get_object()
        serializer = FlightEvaluationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lesson.flight_duration = data['flight_duration']
        lesson.exercises_completed = data['exercises_completed']
        lesson.competencies_acquired = data['competencies_acquired']
        lesson.difficulties = data.get('difficulties', '')
        lesson.observations = data.get('observations', '')
        lesson.recommendations = data.get('recommendations', '')
        lesson.grade = data['grade']
        lesson.result = data['result']
        lesson.pedagogical_note = data.get('pedagogical_note', '')
        lesson.status = FlightStatus.COMPLETED
        lesson.end_time = __import__('django.utils.timezone').utils.timezone.now()
        lesson.save()

        return Response(FlightLessonSerializer(lesson).data)

    @action(detail=False, methods=['get'])
    def conflicts(self, request):
        student_id = request.query_params.get('student_id')
        instructor_id = request.query_params.get('instructor_id')
        aircraft_id = request.query_params.get('aircraft_id')
        start_time = request.query_params.get('start_time')
        end_time = request.query_params.get('end_time')

        if not all([student_id, instructor_id, aircraft_id, start_time, end_time]):
            return Response({'error': 'Missing required parameters'}, status=status.HTTP_400_BAD_REQUEST)

        conflicts = ConflictDetectionService.resolve_all(
            student_id=student_id,
            instructor_id=instructor_id,
            aircraft_id=aircraft_id,
            start_time=start_time,
            end_time=end_time,
        )
        return Response({'has_conflicts': len(conflicts) > 0, 'conflicts': conflicts})


class FlightPreparationViewSet(viewsets.ModelViewSet):
    queryset = FlightPreparation.objects.select_related('flight_lesson').all()
    serializer_class = FlightPreparationSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'


class ResourceBookingViewSet(viewsets.ModelViewSet):
    queryset = ResourceBooking.objects.all()
    serializer_class = ResourceBookingSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'schedule.view'
    filterset_fields = ['resource_type', 'status']


class InstructorAvailabilityViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = InstructorAvailability.objects.all()
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            from apps.students.models import FlightInstructor
            try:
                fi = FlightInstructor.objects.get(user=self.request.user)
                return qs.filter(instructor=fi)
            except FlightInstructor.DoesNotExist:
                return qs.none()
        return qs

    def get_serializer_class(self):
        return InstructorAvailabilitySerializer


class FlightLogViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        from apps.students.models import Student
        student_id = request.query_params.get('student_id')
        if request.user.role == 'student':
            try:
                student = Student.objects.get(user=request.user)
                student_id = str(student.id)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=404)

        if not student_id:
            return Response({'error': 'student_id required'}, status=400)

        log = FlightLogService.get_student_log(student_id)
        return Response(log)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related('aircraft').all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'fleet.view'
    filterset_fields = ['aircraft', 'type', 'status']

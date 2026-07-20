from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission
from .models import (
    Aircraft, FlightLesson, FlightPreparation, FlightStatus,
    FlightProgram, FlightLessonTemplate,
    InstructorAvailability, ResourceBooking, MaintenanceRecord,
    Simulator, SimulatorSession,
)
from .serializers import (
    AircraftSerializer, AircraftListSerializer,
    FlightProgramSerializer, FlightLessonTemplateSerializer,
    FlightLessonSerializer, FlightLessonCreateSerializer,
    FlightPreparationSerializer, FlightEvaluationSerializer,
    ResourceBookingSerializer, InstructorAvailabilitySerializer,
    MaintenanceRecordSerializer,
    SimulatorSerializer, SimulatorSessionSerializer,
)
from .models import MaintenanceRecord
from .services import ConflictDetectionService, FlightLogService


class FlightProgramViewSet(viewsets.ModelViewSet):
    queryset = FlightProgram.objects.all()
    serializer_class = FlightProgramSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'


class FlightLessonTemplateViewSet(viewsets.ModelViewSet):
    queryset = FlightLessonTemplate.objects.all()
    serializer_class = FlightLessonTemplateSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'
    filterset_fields = ['program']


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

    @action(detail=True, methods=['get', 'post'])
    def preparation(self, request, pk=None):
        lesson = self.get_object()
        if request.method == 'GET':
            if not hasattr(lesson, 'preparation'):
                return Response({'exists': False, 'data': None})
            return Response({'exists': True, 'data': FlightPreparationSerializer(lesson.preparation).data})

        serializer = FlightPreparationSerializer(data={
            **request.data,
            'flight_lesson': str(lesson.id),
        })
        serializer.is_valid(raise_exception=True)
        if hasattr(lesson, 'preparation'):
            prep = lesson.preparation
            for attr, value in serializer.validated_data.items():
                setattr(prep, attr, value)
            prep.save()
            return Response(FlightPreparationSerializer(prep).data)
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
        lesson.departure_time = data.get('departure_time')
        lesson.arrival_time = data.get('arrival_time')
        lesson.signed_by_instructor = data.get('signed_by_instructor', False)
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

    @action(detail=True, methods=['post'])
    def authorize_solo(self, request, pk=None):
        lesson = self.get_object()

        # Validate student has valid medical certificate
        from apps.students.models import MedicalCertificate
        from django.utils import timezone
        valid_medical = MedicalCertificate.objects.filter(
            student=lesson.student, status='valid',
            expiry_date__gte=timezone.now().date()
        ).exists()
        if not valid_medical:
            return Response({'error': 'Student does not have a valid medical certificate'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate minimum 15 flight hours
        from django.db.models import Sum
        total_hours = FlightLesson.objects.filter(
            student=lesson.student, status=FlightStatus.COMPLETED
        ).aggregate(total=Sum('flight_duration'))['total'] or 0
        if float(total_hours) < 15:
            return Response({'error': 'Student must have at least 15 flight hours'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate competencies acquired exist
        if not lesson.competencies_acquired or len(lesson.competencies_acquired) == 0:
            return Response({'error': 'No competencies acquired recorded for this lesson'}, status=status.HTTP_400_BAD_REQUEST)

        # Update pedagogical note
        lesson.pedagogical_note = (lesson.pedagogical_note or '') + ' | SOLO AUTHORIZED'
        lesson.save()

        # Create notifications
        from apps.notifications.services import NotificationService
        NotificationService.notify(
            lesson.student.user, 'solo_authorized',
            'Solo Flight Authorized',
            f'You have been authorized for solo flight by {lesson.instructor.first_name} {lesson.instructor.last_name}',
            {'lesson_id': str(lesson.id)}
        )
        NotificationService.notify_role('chief_flight_instructor', 'solo_authorized',
            'Solo Flight Authorized',
            f'Solo authorized for {lesson.student.full_name}',
            {'lesson_id': str(lesson.id)}
        )

        # Log to AuditLog
        from apps.core.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action='validate',
            entity='FlightLesson',
            entity_id=lesson.id,
            new_values={'pedagogical_note': lesson.pedagogical_note, 'solo_authorized': True},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )

        return Response({'status': 'solo_authorized', 'lesson_id': str(lesson.id)})


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
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'schedule.view'

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
            # Non-student users: return empty log
            return Response({'total_flight_hours': 0, 'total_lessons': 0, 'lessons': []})

        log = FlightLogService.get_student_log(student_id)
        return Response(log)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related('aircraft').all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'fleet.view'
    filterset_fields = ['aircraft', 'type', 'status']

    def perform_create(self, serializer):
        record = serializer.save()
        # Update the aircraft's next_maintenance to match this record
        if record.aircraft:
            aircraft = record.aircraft
            aircraft.next_maintenance = record.start_date
            if aircraft.status == 'active':
                aircraft.status = 'in_maintenance'
            aircraft.save(update_fields=['next_maintenance', 'status'])


class SimulatorViewSet(viewsets.ModelViewSet):
    queryset = Simulator.objects.all()
    serializer_class = SimulatorSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'
    filterset_fields = ['status', 'qualification_type']
    search_fields = ['name', 'manufacturer', 'model_name']


class SimulatorSessionViewSet(viewsets.ModelViewSet):
    queryset = SimulatorSession.objects.select_related('simulator', 'student', 'instructor').all()
    serializer_class = SimulatorSessionSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'
    filterset_fields = ['simulator', 'student', 'instructor', 'status']
    search_fields = ['simulator__name', 'student__first_name', 'student__last_name']

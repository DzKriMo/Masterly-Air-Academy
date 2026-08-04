from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from apps.accounts.permissions import HasRolePermission

from .models import (
    Aircraft, FlightLesson, FlightPreparation, FlightStatus,
    FlightProgram, FlightLessonTemplate,
    InstructorAvailability, ResourceBooking, MaintenanceRecord,
    Simulator, SimulatorSession, FlightExercise, FlightLogEntry,
)
from .serializers import (
    AircraftSerializer, AircraftListSerializer,
    FlightProgramSerializer, FlightLessonTemplateSerializer,
    FlightLessonSerializer, FlightLessonCreateSerializer,
    FlightPreparationSerializer, FlightEvaluationSerializer,
    ResourceBookingSerializer, InstructorAvailabilitySerializer,
    MaintenanceRecordSerializer,
    SimulatorSerializer, SimulatorSessionSerializer,
    FlightExerciseSerializer, FlightLogEntrySerializer, FlightLogEntryValidateSerializer,
)
from .models import MaintenanceRecord
from .services import ConflictDetectionService, FlightLogService


def _user_has_permission(user, permission):
    all_perms = user.get_all_permissions()
    return permission in all_perms or any(p.endswith(f'.{permission}') for p in all_perms)


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
        if self.request.user.role == 'flight_instructor':
            try:
                from apps.students.models import FlightInstructor
                fi = FlightInstructor.objects.get(user=self.request.user)
                return qs.filter(instructor=fi)
            except FlightInstructor.DoesNotExist:
                return qs.none()
        if self.request.user.role == 'chief_flight_instructor':
            return qs
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return FlightLessonCreateSerializer
        return FlightLessonSerializer

    def perform_create(self, serializer):
        lesson = serializer.save()
        try:
            from apps.notifications.services import NotificationService
            NotificationService.flight_scheduled(lesson)
        except Exception:
            pass

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
        if not _user_has_permission(request.user, 'flight_training.evaluate'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
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

        try:
            from apps.notifications.services import NotificationService
            NotificationService.flight_evaluated(lesson)
        except Exception:
            pass

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
        if not _user_has_permission(request.user, 'flight_training.evaluate'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
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

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        lesson = self.get_object()
        user = request.user

        all_perms = user.get_all_permissions()
        has_view = 'flight_training.view' in all_perms or 'flight_training.manage' in all_perms
        has_view = has_view or any(p.endswith('.flight_training.view') or p.endswith('.flight_training.manage') for p in all_perms)
        is_owner = hasattr(lesson.student, 'user') and lesson.student.user == user
        is_instructor = hasattr(lesson.instructor, 'user') and lesson.instructor.user == user

        if not (has_view or is_owner or is_instructor):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        from weasyprint import HTML
        from django.utils.timezone import localtime

        student = lesson.student
        instructor = lesson.instructor
        aircraft = lesson.aircraft

        dep = localtime(lesson.departure_time).strftime('%d/%m/%Y %H:%M') if lesson.departure_time else '—'
        arr = localtime(lesson.arrival_time).strftime('%d/%m/%Y %H:%M') if lesson.arrival_time else '—'
        sched = lesson.scheduled_date.strftime('%d/%m/%Y') if lesson.scheduled_date else '—'
        now_str = localtime(__import__('django.utils.timezone').utils.timezone.now()).strftime('%d/%m/%Y %H:%M')

        exercises = lesson.exercises_completed or []
        competencies = lesson.competencies_acquired or []

        def badges(items, color='#c4943c'):
            if not items:
                return '<span style="color:#9ca3af">—</span>'
            return ' '.join(
                f'<span style="display:inline-block;background:{color}15;color:{color};border:1px solid {color}40;padding:2px 8px;border-radius:12px;font-size:10px;margin:1px 2px">{item}</span>'
                for item in items
            )

        signature_block = ''
        if lesson.signed_by_instructor:
            signature_block = f'''
            <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb">
                <p style="font-size:12px;color:#374151"><strong>Digitally signed by:</strong> {instructor.first_name} {instructor.last_name}</p>
                <p style="font-size:10px;color:#9ca3af">Signed electronically on {now_str}</p>
            </div>'''

        grade_val = float(lesson.grade) if lesson.grade else None
        result_label = {'passed': 'PASSED', 'failed': 'FAILED', 'partial': 'PARTIAL'}.get(lesson.result, lesson.result or '—')
        result_color = {'passed': '#16a34a', 'failed': '#dc2626', 'partial': '#f59e0b'}.get(lesson.result, '#374151')

        html = f'''<html><head><meta charset="utf-8"><style>
        @page {{ size: A4; margin: 1.8cm; }}
        body {{ font-family: "Helvetica Neue", Arial, sans-serif; color: #1f2937; }}
        .header {{ border-bottom: 3px solid #c4943c; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }}
        .logo {{ font-size: 22px; color: #c4943c; font-weight: 800; }}
        .subtitle {{ font-size: 12px; color: #6b7280; }}
        .title {{ font-size: 18px; font-weight: 700; color: #0a1628; margin: 6px 0 14px 0; }}
        .grid {{ display: flex; flex-wrap: wrap; gap: 12px 32px; margin-bottom: 18px; }}
        .field {{ min-width: 140px; }}
        .field-label {{ font-size: 9px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 2px; }}
        .field-value {{ font-size: 13px; color: #1f2937; font-weight: 500; }}
        .section-title {{ font-size: 13px; font-weight: 700; color: #c4943c; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 16px 0 8px 0; }}
        .chips {{ margin-bottom: 6px; }}
        .result-badge {{ display: inline-block; padding: 4px 16px; border-radius: 6px; font-weight: 800; font-size: 14px; }}
        .text-block {{ font-size: 12px; line-height: 1.5; color: #4b5563; margin-bottom: 6px; }}
        .footer {{ margin-top: 30px; font-size: 9px; color: #d1d5db; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }}
        th {{ background: #0a1628; color: #c4943c; padding: 6px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }}
        td {{ padding: 5px 10px; border-bottom: 1px solid #e5e7eb; }}
        </style></head><body>

        <div class="header">
          <div>
            <div class="logo">MASTERLY AIR ACADEMY</div>
            <div class="subtitle">Flight Training Report</div>
          </div>
          <div style="text-align:right">
            <div class="field-label">Report Date</div>
            <div class="field-value" style="font-size:11px">{now_str}</div>
          </div>
        </div>

        <h2 class="title">Flight Lesson Report</h2>

        <div class="section-title">Flight Details</div>
        <div class="grid">
          <div class="field"><div class="field-label">Student</div><div class="field-value">{student.full_name}</div></div>
          <div class="field"><div class="field-label">Student #</div><div class="field-value">{student.student_number or '—'}</div></div>
          <div class="field"><div class="field-label">Program</div><div class="field-value">{student.program or '—'}</div></div>
          <div class="field"><div class="field-label">Instructor</div><div class="field-value">{instructor.first_name} {instructor.last_name}</div></div>
          <div class="field"><div class="field-label">Aircraft</div><div class="field-value">{aircraft.registration} ({aircraft.manufacturer} {aircraft.model or ''})</div></div>
        </div>

        <div class="section-title">Time & Duration</div>
        <div class="grid">
          <div class="field"><div class="field-label">Scheduled Date</div><div class="field-value">{sched}</div></div>
          <div class="field"><div class="field-label">Departure</div><div class="field-value">{dep}</div></div>
          <div class="field"><div class="field-label">Arrival</div><div class="field-value">{arr}</div></div>
          <div class="field"><div class="field-label">Flight Duration</div><div class="field-value">{float(lesson.flight_duration) if lesson.flight_duration else '—'} h</div></div>
        </div>

        <div class="section-title">Exercises Completed</div>
        <div class="chips">{badges(exercises)}</div>

        <div class="section-title">Competencies Acquired</div>
        <div class="chips">{badges(competencies)}</div>

        <div class="section-title">Evaluation</div>
        <div class="grid">
          <div class="field"><div class="field-label">Grade</div><div class="field-value">{f'{grade_val}/10' if grade_val is not None else '—'}</div></div>
          <div class="field"><div class="field-label">Result</div><span class="result-badge" style="background:{result_color}15;color:{result_color}">{result_label}</span></div>
        </div>

        <div class="section-title">Difficulties Encountered</div>
        <div class="text-block">{lesson.difficulties or 'None reported'}</div>

        <div class="section-title">Observations</div>
        <div class="text-block">{lesson.observations or 'None recorded'}</div>

        <div class="section-title">Recommendations</div>
        <div class="text-block">{lesson.recommendations or 'None'}</div>

        <div class="section-title">Pedagogical Note</div>
        <div class="text-block">{lesson.pedagogical_note or '—'}</div>

        <div class="section-title">Logbook Summary</div>
        <table>
          <tr><th>Date</th><th>Departure</th><th>Arrival</th><th>Duration</th><th>Aircraft</th><th>Instructor</th><th>Grade</th><th>Result</th></tr>
          <tr>
            <td>{sched}</td><td>{dep}</td><td>{arr}</td>
            <td>{float(lesson.flight_duration) if lesson.flight_duration else '—'} h</td>
            <td>{aircraft.registration}</td>
            <td>{instructor.first_name} {instructor.last_name}</td>
            <td>{f'{grade_val}/10' if grade_val is not None else '—'}</td>
            <td style="color:{result_color};font-weight:700">{result_label}</td>
          </tr>
        </table>

        {signature_block}

        <div class="footer">Masterly Air Academy — Flight Training Report — Generated on {now_str}</div>
        </body></html>'''

        try:
            pdf = HTML(string=html).write_pdf()
            resp = HttpResponse(pdf, content_type='application/pdf')
            resp['Content-Disposition'] = f'attachment; filename="flight-report-{lesson.student.student_number or lesson.id}.pdf"'
            return resp
        except ImportError:
            return HttpResponse('PDF generation not available', status=501)


class FlightPreparationViewSet(viewsets.ModelViewSet):
    queryset = FlightPreparation.objects.select_related('flight_lesson').all()
    serializer_class = FlightPreparationSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(flight_lesson__student=student)
            except Student.DoesNotExist:
                return qs.none()
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            from apps.students.models import FlightInstructor
            try:
                fi = FlightInstructor.objects.get(user=self.request.user)
                return qs.filter(instructor=fi)
            except FlightInstructor.DoesNotExist:
                return qs.none()
        return qs


class FlightLogEntryViewSet(viewsets.ModelViewSet):
    serializer_class = FlightLogEntrySerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'
    filterset_fields = ['status', 'student']
    search_fields = ['student__first_name', 'student__last_name']

    def get_queryset(self):
        user = self.request.user
        qs = FlightLogEntry.objects.select_related('student', 'aircraft', 'validated_by').all()
        if user.role in ('student',):
            try:
                from apps.students.models import Student
                student = Student.objects.get(user=user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        if user.role in ('flight_instructor', 'chief_flight_instructor'):
            try:
                from apps.students.models import FlightInstructor
                fi = FlightInstructor.objects.get(user=user)
                return qs.filter(student__main_instructor=fi)
            except FlightInstructor.DoesNotExist:
                return qs.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        from apps.students.models import Student
        student = Student.objects.get(user=user)
        serializer.save(student=student)

    @action(detail=True, methods=['post'])
    def validate_entry(self, request, pk=None):
        user = request.user
        if user.role not in ('flight_instructor', 'chief_flight_instructor', 'system_admin'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        entry = self.get_object()
        val_serializer = FlightLogEntryValidateSerializer(data=request.data)
        val_serializer.is_valid(raise_exception=True)
        data = val_serializer.validated_data

        from django.utils import timezone
        from apps.students.models import FlightInstructor

        fi = FlightInstructor.objects.get(user=user)
        entry.status = data['status']
        entry.validated_by = fi
        entry.validated_at = timezone.now()
        if data['status'] == 'rejected':
            entry.rejection_reason = data.get('rejection_reason', '')
        else:
            entry.rejection_reason = None
        entry.save()

        return Response(FlightLogEntrySerializer(entry).data)


class ResourceBookingViewSet(viewsets.ModelViewSet):
    queryset = ResourceBooking.objects.all()
    serializer_class = ResourceBookingSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'schedule.view'
    filterset_fields = ['resource_type', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(created_by=self.request.user)
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            return qs.filter(created_by=self.request.user)
        return qs


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
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'

    def list(self, request):
        from apps.students.models import Student, FlightInstructor
        student_id = request.query_params.get('student_id')
        if request.user.role == 'student':
            try:
                student = Student.objects.get(user=request.user)
                student_id = str(student.id)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=404)
        elif student_id:
            # Scope access: admins/CFI/chiefs may view any student's log; other
            # staff (e.g. flight instructors) may only view students assigned to them.
            if not (
                request.user.is_superuser
                or request.user.role in (
                    'system_admin', 'chief_flight_instructor', 'director_general',
                    'head_of_training', 'training_admin',
                )
            ):
                try:
                    instructor = FlightInstructor.objects.get(user=request.user)
                    Student.objects.get(id=student_id, main_instructor=instructor)
                except (Student.DoesNotExist, FlightInstructor.DoesNotExist):
                    return Response({'error': 'Permission denied'}, status=403)

        if not student_id:
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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            from apps.students.models import FlightInstructor
            try:
                fi = FlightInstructor.objects.get(user=self.request.user)
                return qs.filter(instructor=fi)
            except FlightInstructor.DoesNotExist:
                return qs.none()
        return qs



class FlightExerciseViewSet(viewsets.ModelViewSet):
    queryset = FlightExercise.objects.all()
    serializer_class = FlightExerciseSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'
    filterset_fields = ['category', 'program', 'is_active']
    search_fields = ['code', 'title']
    ordering_fields = ['category', 'order', 'code']


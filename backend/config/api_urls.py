from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import CustomTokenObtainPairSerializer
from apps.accounts.views import CurrentUserView, UpdateProfileView, LogoutView
from apps.ground_training.views import (
    SubjectViewSet, ModuleViewSet, RoomViewSet,
    CourseViewSet, CourseEnrollmentViewSet, AttendanceRecordViewSet,
    StudentProgressViewSet, ModuleLessonViewSet, ModuleDocumentViewSet,
)
from apps.flight_training.views import (
    AircraftViewSet, FlightLessonViewSet, FlightPreparationViewSet,
    ResourceBookingViewSet, InstructorAvailabilityViewSet, FlightLogViewSet,
    MaintenanceRecordViewSet, FlightProgramViewSet, FlightLessonTemplateViewSet,
)
from apps.exams.views import (
    QuestionBankViewSet, ExamViewSet, QuizViewSet,
    CertificateViewSet, StudentCompetencyViewSet,
    ProgressCheckViewSet, SkillTestViewSet, PracticalEvaluationViewSet,
    QuizAttemptViewSet,
)
from apps.administration.views import (
    ApplicationViewSet, InvoiceViewSet, PaymentViewSet, DocumentViewSet, ContractViewSet,
)
from apps.quality_safety.views import (
    AuditViewSet, NonConformityViewSet, CAPAViewSet,
    RiskAssessmentViewSet, SafetyEventViewSet, QualityDocumentViewSet,
    QualityDashboardView,
)
from apps.quality_safety.serializers import QualityDocumentSerializer
from apps.students.views import StudentViewSet, MedicalCertificateViewSet, AdminProfileViewSet, FlightInstructorViewSet
from apps.exams.serializers import CertificateSerializer
from apps.notifications.views import NotificationViewSet, MessageViewSet
from apps.core.views import SystemSettingViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from apps.administration.exports import ExportStudentsView, ExportInvoicesView, ExportFlightsView


from apps.accounts.permissions import HasRolePermission


class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'dashboard.view'
    def get(self, request):
        from apps.students.models import Student
        from apps.ground_training.models import Course
        from apps.flight_training.models import Aircraft, FlightLesson
        from apps.administration.models import Invoice
        from apps.quality_safety.models import Audit, NonConformity
        fl = FlightLesson.objects.all()
        inv = Invoice.objects.all()
        return Response({"students": Student.objects.count(), "courses": Course.objects.count(), "aircraft": Aircraft.objects.count(), "flights": fl.count(), "flight_hours": round(sum(float(f.flight_duration or 0) for f in fl), 1), "revenue": round(sum(float(i.amount) for i in inv.filter(status="paid")), 2), "outstanding": round(sum(float(i.amount) for i in inv.filter(status__in=["issued","partially_paid"])), 2), "audits": Audit.objects.filter(status="planned").count(), "ncrs": NonConformity.objects.filter(status="open").count()})


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view_own'

    def get(self, request):
        from apps.students.models import Student
        from apps.ground_training.models import CourseEnrollment, AttendanceRecord, Course
        from apps.flight_training.models import FlightLesson
        from apps.administration.models import Invoice
        from apps.exams.models import ExamAttempt, Certificate

        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        from datetime import timedelta
        from django.utils import timezone

        # Flight hours
        flight_lessons = FlightLesson.objects.filter(student=student)
        total_flight_hours = round(
            sum(float(f.flight_duration or 0) for f in flight_lessons), 1
        )
        total_lessons_completed = flight_lessons.filter(status='completed').count()

        # Theory progress
        enrollments = CourseEnrollment.objects.filter(student=student)
        total_courses = enrollments.count()
        completed_courses = enrollments.filter(course__status='completed').count()
        theory_progress = round(
            (completed_courses / total_courses * 100) if total_courses > 0 else 0, 1
        )

        # Flight progress
        all_flight_lessons = flight_lessons.count()
        flight_progress = round(
            (total_lessons_completed / all_flight_lessons * 100) if all_flight_lessons > 0 else 0, 1
        )

        # Exam average
        exam_attempts = ExamAttempt.objects.filter(student=student, score__isnull=False)
        exam_average = round(
            sum(float(a.score) for a in exam_attempts) / exam_attempts.count()
        ) if exam_attempts.count() > 0 else 0

        # Upcoming schedule (course enrollment + flight lessons, next 3)
        upcoming_courses = Course.objects.filter(
            enrollments__student=student,
            scheduled_date__gte=timezone.now().date(),
            status__in=['scheduled', 'in_progress'],
        ).order_by('scheduled_date', 'start_time')[:3]

        upcoming_flights = FlightLesson.objects.filter(
            student=student,
            scheduled_date__gte=timezone.now().date(),
            status='scheduled',
        ).order_by('scheduled_date')[:3]

        upcoming_schedule = []
        for c in upcoming_courses:
            upcoming_schedule.append({
                'type': 'course',
                'title': c.title,
                'date': str(c.scheduled_date),
                'time': f'{c.start_time.strftime("%H:%M")}-{c.end_time.strftime("%H:%M")}',
            })
        for f in upcoming_flights:
            upcoming_schedule.append({
                'type': 'flight',
                'title': f'Flight with {f.instructor.first_name} {f.instructor.last_name}',
                'date': str(f.scheduled_date),
                'aircraft': f.aircraft.registration,
            })
        upcoming_schedule = sorted(upcoming_schedule, key=lambda x: x['date'])[:3]

        # Recent results (exam attempts, last 5)
        recent_results = []
        for a in exam_attempts.order_by('-completed_at')[:5]:
            recent_results.append({
                'exam': a.exam.code,
                'score': float(a.score) if a.score else None,
                'passed': a.is_passed,
                'date': str(a.completed_at.date()) if a.completed_at else None,
            })

        # Unpaid invoices count
        unpaid_invoices_count = Invoice.objects.filter(
            student=student,
            status__in=['issued', 'overdue', 'partially_paid'],
        ).count()

        # Expiring documents (medical certificates expiring within 30 days)
        from apps.students.models import MedicalCertificate
        expiring_soon = MedicalCertificate.objects.filter(
            student=student,
            status='valid',
            expiry_date__lte=timezone.now().date() + timedelta(days=30),
            expiry_date__gte=timezone.now().date(),
        )
        expiring_documents = [
            {
                'type': 'medical_certificate',
                'expiry_date': str(m.expiry_date),
                'issuer': m.issuer,
            }
            for m in expiring_soon
        ]

        return Response({
            'total_flight_hours': total_flight_hours,
            'total_lessons_completed': total_lessons_completed,
            'theory_progress': theory_progress,
            'flight_progress': flight_progress,
            'exam_average': exam_average,
            'upcoming_schedule': upcoming_schedule,
            'recent_results': recent_results,
            'unpaid_invoices_count': unpaid_invoices_count,
            'expiring_documents': expiring_documents,
        })


@api_view(['GET'])
def verify_certificate(request):
    number = request.query_params.get('number', '')
    if not number:
        return Response({'valid': False, 'message': 'Certificate number required'}, status=400)
    from apps.exams.models import Certificate
    try:
        cert = Certificate.objects.get(certificate_number=number)
        return Response({'valid': True, 'certificate': CertificateSerializer(cert).data})
    except Certificate.DoesNotExist:
        return Response({'valid': False, 'message': 'Certificate not found'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_reports(request):
    from datetime import timedelta
    from django.utils import timezone
    from django.db.models import Sum
    from decimal import Decimal
    from apps.administration.models import Invoice, Payment
    from apps.students.models import Student

    period = request.query_params.get('period', 'month')
    year = int(request.query_params.get('year', timezone.now().year))

    invoices_qs = Invoice.objects.filter(created_at__year=year)
    paid_invoices = invoices_qs.filter(status='paid')
    all_invoices = invoices_qs.filter(status__in=['issued', 'paid', 'partially_paid', 'overdue'])

    # Revenue by month
    revenue_by_month = []
    for m in range(1, 13):
        month_paid = paid_invoices.filter(created_at__month=m)
        rev = round(sum(float(i.amount) for i in month_paid), 2)
        revenue_by_month.append({'month': m, 'revenue': rev})

    # Revenue by program
    revenue_by_program = []
    from apps.students.models import TrainingProgram
    for prog_code, prog_label in TrainingProgram.choices:
        prog_invoices = paid_invoices.filter(student__program=prog_code)
        rev = round(sum(float(i.amount) for i in prog_invoices), 2)
        if rev > 0:
            revenue_by_program.append({'program': prog_code, 'program_name': prog_label, 'revenue': rev})

    # Outstanding by age
    now = timezone.now()
    outstanding_invoices = all_invoices.exclude(status='paid')
    buckets = {
        '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0,
    }
    for inv in outstanding_invoices:
        due = inv.due_at
        if due:
            days_overdue = (now - due).days
            if days_overdue <= 30:
                name = '0_30'
            elif days_overdue <= 60:
                name = '31_60'
            elif days_overdue <= 90:
                name = '61_90'
            else:
                name = '90_plus'
        else:
            name = '0_30'
        buckets[name] = round(buckets[name] + float(inv.amount), 2)

    outstanding_by_age = [
        {'label': '0-30 days', 'total': buckets['0_30']},
        {'label': '31-60 days', 'total': buckets['31_60']},
        {'label': '61-90 days', 'total': buckets['61_90']},
        {'label': '90+ days', 'total': buckets['90_plus']},
    ]

    # Top debtors (top 10)
    debtor_totals = {}
    for inv in all_invoices.exclude(status='paid'):
        name = inv.student.full_name
        sid = str(inv.student.id)
        if sid not in debtor_totals:
            debtor_totals[sid] = {'student_id': sid, 'student_name': name, 'total_outstanding': 0}
        debtor_totals[sid]['total_outstanding'] = round(
            debtor_totals[sid]['total_outstanding'] + float(inv.amount), 2
        )
    top_debtors = sorted(
        debtor_totals.values(), key=lambda x: x['total_outstanding'], reverse=True
    )[:10]

    # Collection rate
    total_issued = sum(float(i.amount) for i in all_invoices)
    total_collected = sum(float(i.amount) for i in paid_invoices)
    collection_rate = round(
        (total_collected / total_issued * 100) if total_issued > 0 else 0, 1
    )

    return Response({
        'revenue_by_month': revenue_by_month,
        'revenue_by_program': revenue_by_program,
        'outstanding_by_age': outstanding_by_age,
        'top_debtors': top_debtors,
        'collection_rate': collection_rate,
    })
from apps.ground_training.pdf import generate_attendance_pdf
from apps.quality_safety.pdf import generate_audit_report_pdf
from apps.exams.pdf import generate_certificate_pdf as _cert_pdf, generate_invoice_pdf as _inv_pdf


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def certificate_pdf(request, cert_id):
    from apps.exams.models import Certificate
    cert = Certificate.objects.get(id=cert_id)
    return _cert_pdf(cert)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_pdf(request, inv_id):
    from apps.administration.models import Invoice
    inv = Invoice.objects.get(id=inv_id)
    return _inv_pdf(inv)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_view(request):
    q = request.query_params.get('q', '')
    if not q: return Response({'results': []})

    # Try Meilisearch first, fall back to DB queries
    from apps.core.search import search_meilisearch, MEILI_AVAILABLE

    if MEILI_AVAILABLE:
        hits = search_meilisearch(q)
        if hits:
            results = []
            for hit in hits[:20]:
                results.append({
                    'type': hit.get('type', 'unknown'),
                    'title': hit.get('full_name') or hit.get('title') or hit.get('registration', ''),
                    'id': hit.get('id', ''),
                    'subtitle': hit.get('program') or hit.get('subject_code') or hit.get('manufacturer', ''),
                    'status': hit.get('status', ''),
                })
            return Response({'results': results, 'source': 'meilisearch'})

    # DB fallback
    from apps.students.models import Student
    from apps.ground_training.models import Course
    from apps.flight_training.models import Aircraft
    results = []
    for s in Student.objects.filter(first_name__icontains=q)[:5]:
        results.append({'type': 'student', 'title': s.full_name, 'id': str(s.id)})
    for c in Course.objects.filter(title__icontains=q)[:5]:
        results.append({'type': 'course', 'title': c.title, 'id': str(c.id)})
    for a in Aircraft.objects.filter(registration__icontains=q)[:3]:
        results.append({'type': 'aircraft', 'title': a.registration, 'id': str(a.id)})
    return Response({'results': results, 'source': 'database'})


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'modules', ModuleViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'course-enrollments', CourseEnrollmentViewSet)
router.register(r'attendance', AttendanceRecordViewSet, basename='attendance')
router.register(r'aircraft', AircraftViewSet)
router.register(r'flight-lessons', FlightLessonViewSet, basename='flightlesson')
router.register(r'flight-preparations', FlightPreparationViewSet)
router.register(r'resource-bookings', ResourceBookingViewSet)
router.register(r'instructor-availability', InstructorAvailabilityViewSet, basename='availability')
router.register(r'question-bank', QuestionBankViewSet)
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'quizzes', QuizViewSet)
router.register(r'certificates', CertificateViewSet, basename='certificate')
router.register(r'competencies', StudentCompetencyViewSet)
router.register(r'applications', ApplicationViewSet)
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'audits', AuditViewSet)
router.register(r'non-conformities', NonConformityViewSet, basename='ncr')
router.register(r'capas', CAPAViewSet)
router.register(r'risk-assessments', RiskAssessmentViewSet)
router.register(r'safety-events', SafetyEventViewSet)
router.register(r'students', StudentViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'quality-documents', QualityDocumentViewSet, basename='qdoc')
router.register(r'maintenance-records', MaintenanceRecordViewSet, basename='maint')
router.register(r'flight-programs', FlightProgramViewSet)
router.register(r'flight-lesson-templates', FlightLessonTemplateViewSet)
router.register(r'medical-certificates', MedicalCertificateViewSet)
router.register(r'progress-checks', ProgressCheckViewSet)
router.register(r'skill-tests', SkillTestViewSet)
router.register(r'practical-evaluations', PracticalEvaluationViewSet)
router.register(r'module-lessons', ModuleLessonViewSet)
router.register(r'module-documents', ModuleDocumentViewSet)
router.register(r'quiz-attempts', QuizAttemptViewSet)
router.register(r'flight-instructors', FlightInstructorViewSet)
router.register(r'admin-profiles', AdminProfileViewSet)
router.register(r'system-settings', SystemSettingViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('students/progress/', StudentProgressViewSet.as_view({'get': 'list'}), name='student-progress'),
    path('students/flight-log/', FlightLogViewSet.as_view({'get': 'list'}), name='flight-log'),
    path('dashboard/kpis/', DashboardKPIView.as_view(), name='dashboard-kpis'),
    path('student/dashboard/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('student/certificates/verify/', verify_certificate, name='verify-certificate'),
    path('quality/dashboard/', QualityDashboardView.as_view(), name='quality-dashboard'),
    path('finance/reports/', finance_reports, name='finance-reports'),
    path('export/students/', ExportStudentsView.as_view(), name='export-students'),
    path('export/invoices/', ExportInvoicesView.as_view(), name='export-invoices'),
    path('export/flights/', ExportFlightsView.as_view(), name='export-flights'),
    path('attendance/<uuid:course_id>/pdf/', generate_attendance_pdf, name='attendance-pdf'),
    path('audits/<uuid:audit_id>/pdf/', generate_audit_report_pdf, name='audit-pdf'),
    path('certificates/<uuid:cert_id>/pdf/', certificate_pdf, name='certificate-pdf'),
    path('invoices/<uuid:inv_id>/pdf/', invoice_pdf, name='invoice-pdf'),
    path('search/', search_view, name='search'),

    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='me'),
    path('profile/', UpdateProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('', include(router.urls)),
]

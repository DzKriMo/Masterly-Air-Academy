from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import CustomTokenObtainPairSerializer
from apps.accounts.views import CurrentUserView, UpdateProfileView, LogoutView
from apps.ground_training.views import (
    SubjectViewSet, ModuleViewSet, RoomViewSet,
    CourseViewSet, CourseEnrollmentViewSet, AttendanceRecordViewSet,
    StudentProgressViewSet,
)
from apps.flight_training.views import (
    AircraftViewSet, FlightLessonViewSet, FlightPreparationViewSet,
    ResourceBookingViewSet, InstructorAvailabilityViewSet, FlightLogViewSet,
    MaintenanceRecordViewSet,
)
from apps.exams.views import (
    QuestionBankViewSet, ExamViewSet, QuizViewSet,
    CertificateViewSet, StudentCompetencyViewSet,
)
from apps.administration.views import (
    ApplicationViewSet, InvoiceViewSet, PaymentViewSet, DocumentViewSet, ContractViewSet,
)
from apps.quality_safety.views import (
    AuditViewSet, NonConformityViewSet, CAPAViewSet,
    RiskAssessmentViewSet, SafetyEventViewSet, QualityDocumentViewSet,
)
from apps.quality_safety.serializers import QualityDocumentSerializer
from apps.students.views import StudentViewSet
from apps.notifications.views import NotificationViewSet, MessageViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from apps.administration.exports import export_students, export_invoices, export_flights


class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        from apps.students.models import Student
        from apps.ground_training.models import Course
        from apps.flight_training.models import Aircraft, FlightLesson
        from apps.administration.models import Invoice
        from apps.quality_safety.models import Audit, NonConformity
        fl = FlightLesson.objects.all()
        inv = Invoice.objects.all()
        return Response({"students": Student.objects.count(), "courses": Course.objects.count(), "aircraft": Aircraft.objects.count(), "flights": fl.count(), "flight_hours": round(sum(float(f.flight_duration or 0) for f in fl), 1), "revenue": round(sum(float(i.amount) for i in inv.filter(status="paid")), 2), "outstanding": round(sum(float(i.amount) for i in inv.filter(status__in=["issued","partially_paid"])), 2), "audits": Audit.objects.filter(status="planned").count(), "ncrs": NonConformity.objects.filter(status="open").count()})
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
    from apps.students.models import Student
    from apps.ground_training.models import Course, Subject
    from apps.flight_training.models import Aircraft
    from apps.administration.models import Invoice
    results = []
    for s in Student.objects.filter(first_name__icontains=q)[:5]:
        results.append({'type': 'student', 'title': s.full_name, 'id': str(s.id)})
    for c in Course.objects.filter(title__icontains=q)[:5]:
        results.append({'type': 'course', 'title': c.title, 'id': str(c.id)})
    for a in Aircraft.objects.filter(registration__icontains=q)[:3]:
        results.append({'type': 'aircraft', 'title': a.registration, 'id': str(a.id)})
    return Response({'results': results})


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
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('students/progress/', StudentProgressViewSet.as_view({'get': 'list'}), name='student-progress'),
    path('students/flight-log/', FlightLogViewSet.as_view({'get': 'list'}), name='flight-log'),
    path('dashboard/kpis/', DashboardKPIView.as_view(), name='dashboard-kpis'),
    path('export/students/', export_students, name='export-students'),
    path('export/invoices/', export_invoices, name='export-invoices'),
    path('export/flights/', export_flights, name='export-flights'),
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

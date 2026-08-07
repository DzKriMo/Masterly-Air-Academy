from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    CurrentUserView, UpdateProfileView, LogoutView, UserViewSet,
    CustomTokenObtainPairView, GroupViewSet, PermissionViewSet,
)
from apps.ground_training.views import (
    SubjectViewSet, ModuleViewSet, RoomViewSet,
    CourseViewSet, CourseEnrollmentViewSet, AttendanceRecordViewSet,
    StudentProgressViewSet, ModuleLessonViewSet, ModuleDocumentViewSet,
    ModuleExerciseViewSet, GroundEvaluationViewSet,
    TimeEntryViewSet,
)
from apps.flight_training.views import (
    AircraftViewSet, FlightLessonViewSet, FlightPreparationViewSet,
    ResourceBookingViewSet, InstructorAvailabilityViewSet, FlightLogViewSet,
    MaintenanceRecordViewSet, FlightProgramViewSet, FlightLessonTemplateViewSet,
    SimulatorViewSet, SimulatorSessionViewSet, FlightExerciseViewSet,
    FlightLogEntryViewSet,
)
from apps.exams.views import (
    QuestionBankViewSet, ExamViewSet, QuizViewSet,
    CertificateViewSet, StudentCompetencyViewSet,
    ProgressCheckViewSet, SkillTestViewSet, PracticalEvaluationViewSet,
    ExamAttemptViewSet, QuizAttemptViewSet, CertificatePdfView,
)
from apps.exams.final_views import (
    FinalExamQuestionViewSet, FinalExamViewSet,
    exam_access, exam_submit, exam_status,
)
from apps.administration.views import (
    ApplicationViewSet, InvoiceViewSet, PaymentViewSet, DocumentViewSet,
    ContractViewSet, InvoicePdfView,
)
from apps.quality_safety.views import (
    AuditViewSet, NonConformityViewSet, CAPAViewSet,
    RiskAssessmentViewSet, SafetyEventViewSet, QualityDocumentViewSet,
    QualityDashboardView,
)
from apps.students.views import (
    StudentViewSet, MedicalCertificateViewSet, AdminProfileViewSet,
    FlightInstructorViewSet, GroundInstructorViewSet, PromotionViewSet,
)
from apps.notifications.views import NotificationViewSet, MessageViewSet, NotificationBroadcastViewSet
from apps.core.views import SystemSettingViewSet, AuditLogViewSet, search_view, TriggerBackupView, create_media_token
from apps.core.report_views import (
    DashboardKPIView, StudentDashboardView, verify_certificate, finance_reports,
    StudentReportView, FinancialReportView, ExamReportsView, FleetReportView, student_history,
)
from apps.administration.exports import (
    ExportStudentsView, ExportUsersView, ExportPaymentsView, ExportInvoicesView,
    ExportFlightsView, ExportAuditLogsView, ExportCertificatesView, ExportCoursesView,
    ExportExamsView, FlightsPdfView, CoursesPdfView,
)
from apps.quality_safety.exports import (
    ExportAuditsView, ExportNCRsView, ExportCAPAsView, ExportSafetyEventsView,
    ExportRiskAssessmentsView,
)
from apps.ground_training.pdf import AttendancePdfView
from apps.quality_safety.pdf import AuditReportPdfView
from apps.flight_training.tv_views import tv_schedule
from apps.administration.contact_views import submit_contact


router = DefaultRouter()
router.register(r'users', UserViewSet)
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
router.register(r'promotions', PromotionViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'quality-documents', QualityDocumentViewSet, basename='qdoc')
router.register(r'maintenance-records', MaintenanceRecordViewSet, basename='maint')
router.register(r'flight-programs', FlightProgramViewSet)
router.register(r'flight-lesson-templates', FlightLessonTemplateViewSet)
router.register(r'flight-exercises', FlightExerciseViewSet)
router.register(r'flight-log-entries', FlightLogEntryViewSet)
router.register(r'final-exam-questions', FinalExamQuestionViewSet)
router.register(r'final-exams', FinalExamViewSet)
router.register(r'medical-certificates', MedicalCertificateViewSet)
router.register(r'progress-checks', ProgressCheckViewSet)
router.register(r'skill-tests', SkillTestViewSet)
router.register(r'practical-evaluations', PracticalEvaluationViewSet)
router.register(r'module-lessons', ModuleLessonViewSet)
router.register(r'module-documents', ModuleDocumentViewSet)
router.register(r'module-exercises', ModuleExerciseViewSet)
router.register(r'ground-evaluations', GroundEvaluationViewSet)
router.register(r'time-entries', TimeEntryViewSet)
router.register(r'exam-attempts', ExamAttemptViewSet, basename='exam-attempt')
router.register(r'quiz-attempts', QuizAttemptViewSet)
router.register(r'flight-instructors', FlightInstructorViewSet)
router.register(r'ground-instructors', GroundInstructorViewSet, basename='ground-instructor')
router.register(r'admin-profiles', AdminProfileViewSet)
router.register(r'system-settings', SystemSettingViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'simulators', SimulatorViewSet)
router.register(r'simulator-sessions', SimulatorSessionViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'permissions', PermissionViewSet)

urlpatterns = [
    path('students/progress/', StudentProgressViewSet.as_view({'get': 'list'}), name='student-progress'),
    path('students/flight-log/', FlightLogViewSet.as_view({'get': 'list'}), name='flight-log'),
    path('dashboard/kpis/', DashboardKPIView.as_view(), name='dashboard-kpis'),
    path('student/dashboard/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('certificates/verify/', verify_certificate, name='verify-certificate'),
    path('schedule/tv/', tv_schedule, name='tv-schedule'),
    path('quality/dashboard/', QualityDashboardView.as_view(), name='quality-dashboard'),
    path('finance/reports/', finance_reports, name='finance-reports'),
    path('export/students/', ExportStudentsView.as_view(), name='export-students'),
    path('export/users/', ExportUsersView.as_view(), name='export-users'),
    path('export/payments/', ExportPaymentsView.as_view(), name='export-payments'),
    path('export/invoices/', ExportInvoicesView.as_view(), name='export-invoices'),
    path('export/flights/', ExportFlightsView.as_view(), name='export-flights'),
    path('attendance/<uuid:course_id>/pdf/', AttendancePdfView.as_view(), name='attendance-pdf'),
    path('audits/<uuid:audit_id>/pdf/', AuditReportPdfView.as_view(), name='audit-pdf'),
    path('certificates/<uuid:cert_id>/pdf/', CertificatePdfView.as_view(), name='certificate-pdf'),
    path('invoices/<uuid:inv_id>/pdf/', InvoicePdfView.as_view(), name='invoice-pdf'),
    path('contact/submit/', submit_contact, name='submit-contact'),
    path('search/', search_view, name='search'),
    path('system/backup/', TriggerBackupView.as_view(), name='trigger-backup'),
    path('media-token/', create_media_token, name='media-token'),
    path('notifications/broadcast/', NotificationBroadcastViewSet.as_view({'post': 'create'}), name='notification-broadcast'),
    path('export/audit-logs/', ExportAuditLogsView.as_view(), name='export-audit-logs'),
    path('export/courses/', ExportCoursesView.as_view(), name='export-courses'),
    path('export/certificates/', ExportCertificatesView.as_view(), name='export-certificates'),
    path('export/exams/', ExportExamsView.as_view(), name='export-exams'),
    path('courses/export/pdf/', CoursesPdfView.as_view(), name='courses-export-pdf'),
    path('courses/export/excel/', ExportCoursesView.as_view(), name='courses-export-excel'),
    path('flights/export/pdf/', FlightsPdfView.as_view(), name='flights-export-pdf'),

    path('export/audits/', ExportAuditsView.as_view(), name='export-audits'),
    path('export/non-conformities/', ExportNCRsView.as_view(), name='export-ncrs'),
    path('export/capas/', ExportCAPAsView.as_view(), name='export-capas'),
    path('export/safety-events/', ExportSafetyEventsView.as_view(), name='export-safety-events'),
    path('export/risk-assessments/', ExportRiskAssessmentsView.as_view(), name='export-risk-assessments'),
    path('reports/students/', StudentReportView.as_view(), name='report-students'),
    path('reports/financial/', FinancialReportView.as_view(), name='report-financial'),

    # Public final exam endpoints (no auth)
    path('exam/access/', exam_access, name='exam-access'),
    path('exam/submit/', exam_submit, name='exam-submit'),
    path('exam/status/<str:access_code>/', exam_status, name='exam-status'),

    path('reports/exams/', ExamReportsView.as_view(), name='report-exams'),
    path('reports/fleet/', FleetReportView.as_view(), name='report-fleet'),
    path('students/me/history/', student_history, name='student-history'),

    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='me'),
    path('profile/', UpdateProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('', include(router.urls)),
]

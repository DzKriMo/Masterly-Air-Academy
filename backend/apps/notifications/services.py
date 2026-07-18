"""Notification service — creates notifications triggered by key events."""

from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Notification

User = get_user_model()


class NotificationService:
    """Centralized notification creation. Called from views, signals, or tasks."""

    @staticmethod
    def notify(user, type: str, title: str, message: str, data: dict = None):
        """Send a notification to a single user."""
        return Notification.objects.create(
            user=user,
            type=type,
            title=title,
            message=message,
            data=data or {},
        )

    @staticmethod
    def notify_role(role: str, type: str, title: str, message: str, data: dict = None):
        """Send a notification to all active users with a given role."""
        users = User.objects.filter(role=role, status='active', is_active=True)
        notifications = []
        for user in users:
            notifications.append(NotificationService.notify(user, type, title, message, data))
        return notifications

    @staticmethod
    def notify_roles(roles: list, type: str, title: str, message: str, data: dict = None):
        """Send a notification to all active users with any of the given roles."""
        users = User.objects.filter(role__in=roles, status='active', is_active=True)
        notifications = []
        for user in users:
            notifications.append(NotificationService.notify(user, type, title, message, data))
        return notifications

    # ── Pre-built event triggers ──────────────────────────

    @staticmethod
    def flight_scheduled(lesson):
        """Notify student + instructor when a flight is scheduled."""
        msg = f"Flight on {lesson.scheduled_date} with {lesson.aircraft.registration}"
        data = {'flight_id': str(lesson.id), 'date': str(lesson.scheduled_date)}
        NotificationService.notify(lesson.student.user, 'flight_scheduled',
                                     'Flight Scheduled', msg, data)
        NotificationService.notify(lesson.instructor.user, 'flight_scheduled',
                                     'New Flight Assigned', msg, data)

    @staticmethod
    def flight_evaluated(lesson):
        """Notify student when their flight is evaluated."""
        grade_str = f" - Grade: {lesson.grade}" if lesson.grade else ""
        msg = f"Flight on {lesson.scheduled_date} evaluated: {lesson.result or 'Completed'}{grade_str}"
        NotificationService.notify(
            lesson.student.user, 'flight_evaluated',
            'Flight Evaluation Posted', msg,
            {'flight_id': str(lesson.id), 'grade': str(lesson.grade) if lesson.grade else None}
        )

    @staticmethod
    def exam_result(attempt):
        """Notify student when exam results are available."""
        passed = "Passed" if attempt.is_passed else "Failed"
        msg = f"Exam {attempt.exam.code}: {passed} — Score: {attempt.score}"
        NotificationService.notify(
            attempt.student.user, 'exam_result',
            'Exam Result Available', msg,
            {'exam_id': str(attempt.exam.id), 'score': str(attempt.score), 'passed': attempt.is_passed}
        )

    @staticmethod
    def course_scheduled(course):
        """Notify enrolled students when a new course is scheduled."""
        from apps.ground_training.models import CourseEnrollment
        enrollments = CourseEnrollment.objects.filter(course=course)
        for enrollment in enrollments:
            msg = f"New course: {course.title} on {course.scheduled_date}"
            NotificationService.notify(
                enrollment.student.user, 'course_scheduled',
                'New Course Scheduled', msg,
                {'course_id': str(course.id)}
            )

    @staticmethod
    def invoice_created(invoice):
        """Notify student of new invoice."""
        msg = f"Invoice #{invoice.invoice_number}: {invoice.amount} {invoice.currency}"
        NotificationService.notify(
            invoice.student.user, 'invoice_created',
            'New Invoice', msg,
            {'invoice_id': str(invoice.id), 'amount': str(invoice.amount)}
        )

    @staticmethod
    def document_expiring(user, document_type: str, doc_name: str, expiry_date):
        """Warn about an expiring document."""
        days_left = (expiry_date - timezone.now().date()).days
        msg = f"{document_type} '{doc_name}' expires in {days_left} days ({expiry_date})"
        NotificationService.notify(
            user, 'document_expiring',
            'Document Expiring Soon', msg,
            {'document': doc_name, 'expiry': str(expiry_date), 'days_left': days_left}
        )

    @staticmethod
    def ncr_opened(ncr):
        """Notify quality roles when a new NCR is opened."""
        msg = f"NCR opened: {ncr.title} (Severity: {ncr.severity})"
        NotificationService.notify_roles(
            ['quality_manager', 'compliance_monitoring_manager', 'safety_manager'],
            'ncr_opened', 'New Non-Conformity', msg,
            {'ncr_id': str(ncr.id)}
        )

    @staticmethod
    def capa_assigned(capa):
        """Notify responsible person when a CAPA is assigned."""
        if capa.responsible:
            msg = f"CAPA assigned: {capa.title} — Due: {capa.due_date}"
            NotificationService.notify(
                capa.responsible, 'capa_assigned',
                'CAPA Assigned to You', msg,
                {'capa_id': str(capa.id)}
            )

    @staticmethod
    def progress_check_scheduled(check):
        """Notify student + examiner about a progress check."""
        msg = f"Progress Check scheduled for {check.scheduled_date.strftime('%Y-%m-%d')}"
        NotificationService.notify(check.student.user, 'progress_check',
                                     'Progress Check Scheduled', msg,
                                     {'check_id': str(check.id)})
        NotificationService.notify(check.examiner.user, 'progress_check',
                                     'Progress Check Assignment', msg,
                                     {'check_id': str(check.id)})

    @staticmethod
    def skill_test_authorized(test):
        """Notify student when a skill test is authorized."""
        msg = f"Your Skill Test has been authorized for {test.scheduled_date.strftime('%Y-%m-%d')}"
        NotificationService.notify(test.student.user, 'skill_test',
                                     'Skill Test Authorized', msg,
                                     {'test_id': str(test.id)})

    @staticmethod
    def exam_published(exam):
        """Notify students when an exam is published."""
        from apps.students.models import Student
        students = Student.objects.filter(program=exam.program, status='active')
        msg = f"Exam {exam.code} - {exam.title or 'Untitled'} has been published"
        for student in students:
            NotificationService.notify(
                student.user, 'exam_published',
                'Exam Published', msg,
                {'exam_id': str(exam.id), 'exam_code': exam.code}
            )

    @staticmethod
    def certificate_issued(certificate):
        """Notify student when a certificate is issued."""
        msg = f"Certificate #{certificate.certificate_number} has been issued"
        NotificationService.notify(
            certificate.student.user, 'certificate_issued',
            'Certificate Issued', msg,
            {'certificate_id': str(certificate.id), 'number': certificate.certificate_number}
        )

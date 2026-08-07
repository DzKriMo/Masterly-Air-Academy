"""Notification service — creates notifications triggered by key events."""

import json

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Notification

User = get_user_model()

try:
    import redis
except ImportError:  # pragma: no cover
    redis = None


def get_redis_client():
    """Return a Redis client for pub/sub, or None if unavailable."""
    if redis is None:
        return None
    try:
        return redis.Redis.from_url(
            settings.REDIS_URL,
            socket_timeout=2,
            socket_connect_timeout=2,
            decode_responses=True,
        )
    except Exception:  # pragma: no cover
        return None


def publish_user_event(user_id, payload):
    """Publish a real-time event to a user's Redis channel (best-effort)."""
    try:
        client = get_redis_client()
        if client is not None:
            client.publish(f'notifications:user:{user_id}', json.dumps(payload))
    except Exception:
        pass


def publish_message_event(user_id, payload):
    """Publish a real-time message event to a user's Redis channel (best-effort)."""
    try:
        client = get_redis_client()
        if client is not None:
            client.publish(f'messages:user:{user_id}', json.dumps(payload))
    except Exception:
        pass


def serialize_message(msg):
    """Return a JSON-safe dict for a Message (UUIDs/datetimes serialized to strings)."""
    from rest_framework.renderers import JSONRenderer
    from .serializers import MessageSerializer
    return json.loads(JSONRenderer().render(MessageSerializer(msg).data))


class NotificationService:
    """Centralized notification creation. Called from views, signals, or tasks."""

    @staticmethod
    def _preference(user):
        """Return (email_enabled, in_app_enabled, muted_types) for a user."""
        try:
            pref = getattr(user, 'notification_preference', None)
        except Exception:
            pref = None
        if pref is None:
            try:
                from .models import NotificationPreference
                pref = NotificationPreference.objects.filter(user=user).first()
            except Exception:
                pref = None
        if pref is None:
            return True, True, []
        return pref.email_enabled, pref.in_app_enabled, (pref.muted_types or [])

    @staticmethod
    def notify(user, type: str, title: str, message: str, data: dict = None):
        """Send a notification to a single user.

        This is the single creation funnel: it respects the user's in-app
        preference, publishes a real-time SSE event, and returns the created
        Notification (or None when muted).
        """
        if not user:
            return None
        _, in_app_enabled, muted_types = NotificationService._preference(user)
        if not in_app_enabled or type in muted_types:
            return None
        notif = Notification.objects.create(
            user=user,
            type=type,
            title=title,
            message=message,
            data=data or {},
        )
        publish_user_event(
            str(user.id),
            {
                'id': str(notif.id),
                'type': notif.type,
                'title': notif.title,
                'message': notif.message,
                'data': notif.data,
                'created_at': notif.created_at.isoformat(),
            },
        )
        return notif

    @staticmethod
    def notify_role(role: str, type: str, title: str, message: str, data: dict = None):
        """Send a notification to all active users with a given role."""
        users = User.objects.filter(role=role, status='active', is_active=True)
        notifications = []
        for user in users:
            n = NotificationService.notify(user, type, title, message, data)
            if n is not None:
                notifications.append(n)
        return notifications

    @staticmethod
    def notify_students_in_promotions(promotion_ids, type: str, title: str, message: str, data: dict = None):
        """Send a notification to all active students in the given promotion(s)."""
        from apps.students.models import Student
        user_ids = Student.objects.filter(
            promotion_id__in=promotion_ids,
            status='active',
            user__status='active',
            user__is_active=True,
        ).values_list('user_id', flat=True).distinct()
        notifications = []
        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                continue
            n = NotificationService.notify(user, type, title, message, data)
            if n is not None:
                notifications.append(n)
        return notifications

    @staticmethod
    def notify_roles(roles: list, type: str, title: str, message: str, data: dict = None):
        """Send a notification to all active users with any of the given roles."""
        users = User.objects.filter(role__in=roles, status='active', is_active=True)
        notifications = []
        for user in users:
            n = NotificationService.notify(user, type, title, message, data)
            if n is not None:
                notifications.append(n)
        return notifications

    @staticmethod
    def send_email_notification(user, subject, message):
        """Queue an email notification to a user (respects email preference)."""
        if not user or not user.email:
            return
        email_enabled, _, muted_types = NotificationService._preference(user)
        if not email_enabled:
            return
        try:
            from .tasks import send_email_notification_task
            send_email_notification_task.delay(str(user.id), subject, message)
        except Exception:
            # Fallback to synchronous send if Celery broker is unavailable
            try:
                html_message = render_to_string('emails/notification.html', {
                    'subject': subject,
                    'message': message,
                })
                text_message = render_to_string('emails/notification.txt', {
                    'subject': subject,
                    'message': message,
                })
                send_mail(
                    subject=subject,
                    message=text_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    html_message=html_message,
                    fail_silently=True,
                )
            except Exception:
                pass  # Email failures should not break the app

    # ── Pre-built event triggers ──────────────────────────

    @staticmethod
    def flight_scheduled(lesson):
        """Notify student + instructor when a flight is scheduled."""
        msg = f"Flight on {lesson.scheduled_date} with {lesson.aircraft.registration}"
        data = {'flight_id': str(lesson.id), 'date': str(lesson.scheduled_date)}
        NotificationService.notify(lesson.student.user, 'flight_scheduled',
                                     'Flight Scheduled', msg, data)
        NotificationService.send_email_notification(lesson.student.user,
                                                      'Flight Scheduled', msg)
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
        NotificationService.send_email_notification(
            attempt.student.user, 'Exam Result Available', msg
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
        NotificationService.send_email_notification(
            invoice.student.user, 'New Invoice', msg
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
        # Also email all active users with quality roles
        quality_users = User.objects.filter(
            role__in=['quality_manager', 'compliance_monitoring_manager', 'safety_manager'],
            status='active', is_active=True
        )
        for u in quality_users:
            NotificationService.send_email_notification(
                u, 'New Non-Conformity', msg
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
            NotificationService.send_email_notification(
                capa.responsible, 'CAPA Assigned to You', msg
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
        NotificationService.send_email_notification(
            certificate.student.user, 'Certificate Issued', msg
        )

import uuid
from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    INFO = 'info', 'Info'
    WARNING = 'warning', 'Warning'
    SUCCESS = 'success', 'Success'
    ERROR = 'error', 'Error'
    BROADCAST = 'broadcast', 'Broadcast'
    ANNOUNCEMENT = 'announcement', 'Announcement'
    REMINDER = 'reminder', 'Reminder'
    # Training / academic
    FLIGHT_SCHEDULED = 'flight_scheduled', 'Flight Scheduled'
    FLIGHT_EVALUATED = 'flight_evaluated', 'Flight Evaluated'
    SOLO_AUTHORIZED = 'solo_authorized', 'Solo Authorized'
    COURSE_SCHEDULED = 'course_scheduled', 'Course Scheduled'
    EXAM_PUBLISHED = 'exam_published', 'Exam Published'
    EXAM_RESULT = 'exam_result', 'Exam Result'
    QUIZ_RESULT = 'quiz_result', 'Quiz Result'
    MODULE_PUBLISHED = 'module_published', 'Module Published'
    ENROLLMENT = 'enrollment', 'Enrollment'
    PROGRESS_CHECK = 'progress_check', 'Progress Check'
    SKILL_TEST = 'skill_test', 'Skill Test'
    CERTIFICATE_ISSUED = 'certificate_issued', 'Certificate Issued'
    DOCUMENT_EXPIRING = 'document_expiring', 'Document Expiring'
    # Administration / finance
    APPLICATION = 'application', 'Application'
    CONTACT_FORM = 'contact_form', 'Contact Form'
    INVOICE_CREATED = 'invoice_created', 'Invoice Created'
    INVOICE_OVERDUE = 'invoice_overdue', 'Invoice Overdue'
    PAYMENT_RECEIVED = 'payment_received', 'Payment Received'
    CONTRACT_SIGNED = 'contract_signed', 'Contract Signed'
    # Quality / safety
    NCR_OPENED = 'ncr_opened', 'NCR Opened'
    NCR_CLOSED = 'ncr_closed', 'NCR Closed'
    AUDIT_PLANNED = 'audit_planned', 'Audit Planned'
    AUDIT_COMPLETED = 'audit_completed', 'Audit Completed'
    CAPA_ASSIGNED = 'capa_assigned', 'CAPA Assigned'
    CAPA_DUE = 'capa_due', 'CAPA Due'
    SAFETY_EVENT = 'safety_event', 'Safety Event'
    QUALITY_DOC_APPROVED = 'quality_doc_approved', 'Quality Document Approved'
    DEADLINE = 'deadline', 'Deadline'
    TASK_ASSIGNED = 'task_assigned', 'Task Assigned'


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=40, choices=NotificationType.choices, default=NotificationType.INFO)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f'{self.type}: {self.title}'


class NotificationPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preference')
    email_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    # Types the user has muted entirely (e.g. ["marketing"])
    muted_types = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_preferences'
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'

    def __str__(self):
        return f'{self.user.email}: email={self.email_enabled}, in_app={self.in_app_enabled}'


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=255, blank=True, null=True)
    body = models.TextField()
    # Thread support: message this one is a reply to (null = thread root).
    reply_to = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    # Attachments: list of {name, size, content_type, url}
    attachments = models.JSONField(default=list, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['-created_at']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        indexes = [
            models.Index(fields=['receiver', '-created_at']),
            models.Index(fields=['receiver', 'is_read']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['reply_to', 'created_at']),
        ]

    @property
    def root(self):
        """First message in this conversation thread (self if no parent)."""
        node = self
        while node.reply_to is not None:
            node = node.reply_to
        return node

    def __str__(self):
        return f'{self.sender.email} → {self.receiver.email}: {self.subject or "No subject"}'

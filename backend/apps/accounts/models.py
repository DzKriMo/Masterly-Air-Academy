import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    DIRECTOR_GENERAL = 'director_general', 'Director General'
    HEAD_OF_TRAINING = 'head_of_training', 'Head of Training'
    CHIEF_GROUND_INSTRUCTOR = 'chief_ground_instructor', 'Chief Ground Instructor'
    GROUND_INSTRUCTOR = 'ground_instructor', 'Ground Instructor'
    CHIEF_FLIGHT_INSTRUCTOR = 'chief_flight_instructor', 'Chief Flight Instructor'
    FLIGHT_INSTRUCTOR = 'flight_instructor', 'Flight Instructor'
    SYSTEM_ADMIN = 'system_admin', 'System Admin'
    ADMIN_RESPONSIBLE = 'admin_responsible', 'Admin Responsible'
    ADMIN_AGENT = 'admin_agent', 'Admin Agent'
    FINANCE_RESPONSIBLE = 'finance_responsible', 'Finance Responsible'
    ACCOUNTING_AGENT = 'accounting_agent', 'Accounting Agent'
    ADMISSIONS_RESPONSIBLE = 'admissions_responsible', 'Admissions Responsible'
    QUALITY_MANAGER = 'quality_manager', 'Quality Manager'
    COMPLIANCE_MONITORING_MANAGER = 'compliance_monitoring_manager', 'Compliance Monitoring Manager'
    SAFETY_MANAGER = 'safety_manager', 'Safety Manager'
    SCHEDULER = 'scheduler', 'Scheduler'
    STUDENT = 'student', 'Student'
    CANDIDATE = 'candidate', 'Candidate'
    GRADUATE = 'graduate', 'Graduate'


class UserStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    ARCHIVED = 'archived', 'Archived'
    PENDING = 'pending', 'Pending'


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=50, choices=UserRole.choices, default=UserRole.STUDENT)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['status']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return self.email

    @property
    def permissions_list(self):
        return list(self.get_all_permissions())

    @property
    def role_list(self):
        return [g.name for g in self.groups.all()]


class RefreshToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    token = models.CharField(max_length=500, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'refresh_tokens'

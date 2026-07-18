import uuid
from django.conf import settings
from django.db import models


class TrainingProgram(models.TextChoices):
    PPL = 'PPL', 'Private Pilot License'
    CPL = 'CPL', 'Commercial Pilot License'
    IR = 'IR', 'Instrument Rating'
    MEP = 'MEP', 'Multi-Engine Piston'
    MCC = 'MCC', 'Multi-Crew Cooperation'


class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    student_number = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)
    enrollment_date = models.DateField()
    status = models.CharField(max_length=20, default='active')
    program = models.CharField(max_length=10, choices=TrainingProgram.choices)
    academic_year = models.ForeignKey('core.AcademicYear', on_delete=models.SET_NULL, null=True, blank=True)
    main_instructor = models.ForeignKey('FlightInstructor', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_students')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'students'
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['student_number']),
            models.Index(fields=['program']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.student_number})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class MedicalCertificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='medical_certificates')
    issue_date = models.DateField()
    expiry_date = models.DateField()
    issuer = models.CharField(max_length=255, blank=True, null=True)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=20, default='valid')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medical_certificates'
        verbose_name = 'Medical Certificate'
        verbose_name_plural = 'Medical Certificates'

    def __str__(self):
        return f'Medical - {self.student.full_name} (expires {self.expiry_date})'


class GroundInstructor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ground_instructor_profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    qualifications = models.JSONField(default=list, blank=True)
    authorized_subjects = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, default='active')
    hire_date = models.DateField(null=True, blank=True)
    medical_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ground_instructors'
        verbose_name = 'Ground Instructor'
        verbose_name_plural = 'Ground Instructors'

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class FlightInstructor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='flight_instructor_profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    qualifications = models.JSONField(default=list, blank=True)
    authorized_aircraft_types = models.JSONField(default=list, blank=True)
    total_flight_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    instruction_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    status = models.CharField(max_length=20, default='active')
    hire_date = models.DateField(null=True, blank=True)
    medical_expiry = models.DateField(null=True, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'flight_instructors'
        verbose_name = 'Flight Instructor'
        verbose_name_plural = 'Flight Instructors'

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.license_number or "N/A"})'


class AdminProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='admin_profile')
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'admin_profiles'

    def __str__(self):
        return self.user.email

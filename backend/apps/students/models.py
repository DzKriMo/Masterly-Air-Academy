import uuid
from django.conf import settings
from django.db import models


class TrainingProgram(models.TextChoices):
    PPL = 'PPL', 'Private Pilot License'
    CPL = 'CPL', 'Commercial Pilot License'
    IR = 'IR', 'Instrument Rating'
    MEP = 'MEP', 'Multi-Engine Piston'
    MCC = 'MCC', 'Multi-Crew Cooperation'


class PromotionStatus(models.TextChoices):
    IN_PROGRESS = 'in_progress', 'In Progress'
    GRADUATED = 'graduated', 'Graduated'
    ARCHIVED = 'archived', 'Archived'


class Promotion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    program = models.CharField(max_length=10, choices=TrainingProgram.choices)
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=PromotionStatus.choices, default=PromotionStatus.IN_PROGRESS)
    main_instructor = models.ForeignKey('FlightInstructor', on_delete=models.SET_NULL, null=True, blank=True, related_name='promotions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promotions'
        ordering = ['-start_date']
        verbose_name = 'Promotion'
        verbose_name_plural = 'Promotions'
        indexes = [
            models.Index(fields=['program']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'{self.code} - {self.name}'

    @property
    def student_count(self):
        return self.students.count()


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
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)
    enrollment_date = models.DateField()
    status = models.CharField(max_length=20, default='active')
    program = models.CharField(max_length=10, choices=TrainingProgram.choices)
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
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

    @property
    def promotion_code(self):
        return self.promotion.code if self.promotion_id else ''

    def generate_student_number(self):
        from django.utils import timezone
        if self.promotion_id:
            prefix = f"STU-{self.promotion.code}-"
        else:
            prefix = f"STU-{self.enrollment_date.year}-"
        seq = 1
        last = Student.objects.filter(student_number__startswith=prefix).order_by('student_number').last()
        if last:
            try:
                seq = int(last.student_number[len(prefix):]) + 1
            except (ValueError, TypeError):
                seq = Student.objects.filter(student_number__startswith=prefix).count() + 1
        return f"{prefix}{seq:03d}"

    def save(self, *args, **kwargs):
        from django.db import IntegrityError
        if not self.student_number or self.student_number.startswith(('APP-', 'AP-')):
            self.student_number = self.generate_student_number()
        max_retries = 5
        for attempt in range(max_retries):
            try:
                super().save(*args, **kwargs)
                return
            except IntegrityError:
                if attempt == max_retries - 1:
                    raise
                self.student_number = self.generate_student_number()


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

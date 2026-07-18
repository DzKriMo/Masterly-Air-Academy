import uuid
from django.db import models
from apps.students.models import TrainingProgram


class FlightStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    POSTPONED = 'postponed', 'Postponed'


class FlightProgram(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=10, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    program = models.CharField(max_length=10, choices=TrainingProgram.choices)
    status = models.CharField(max_length=20, default='active')

    class Meta:
        db_table = 'flight_programs'
        verbose_name = 'Flight Program'
        verbose_name_plural = 'Flight Programs'

    def __str__(self):
        return f'{self.code} - {self.title}'


class FlightLessonTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(FlightProgram, on_delete=models.CASCADE, related_name='lesson_templates')
    lesson_number = models.IntegerField()
    title = models.CharField(max_length=255)
    title_ar = models.CharField(max_length=255, blank=True, null=True)
    title_fr = models.CharField(max_length=255, blank=True, null=True)
    objective = models.TextField(blank=True, null=True)
    competencies = models.JSONField(default=list, blank=True)
    planned_duration = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    briefing_time = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    flight_time = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    debriefing_time = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    success_criteria = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'flight_lesson_templates'
        unique_together = ['program', 'lesson_number']
        ordering = ['program', 'lesson_number']

    def __str__(self):
        return f'{self.program.code} - Lesson {self.lesson_number}: {self.title}'


class Aircraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.CharField(max_length=20, unique=True)
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    year_of_manufacture = models.IntegerField(null=True, blank=True)
    base_location = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, default='available')
    airframe_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    engine_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    propeller_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    last_maintenance = models.DateTimeField(null=True, blank=True)
    next_maintenance = models.DateTimeField(null=True, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    certification_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aircraft'
        verbose_name = 'Aircraft'
        verbose_name_plural = 'Aircraft'
        ordering = ['registration']

    def __str__(self):
        return f'{self.registration} ({self.manufacturer} {self.model or ""})'


class FlightLesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='flight_lessons')
    instructor = models.ForeignKey('students.FlightInstructor', on_delete=models.CASCADE, related_name='flight_lessons')
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, related_name='flight_lessons')
    lesson_template = models.ForeignKey(FlightLessonTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_date = models.DateField()
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    flight_duration = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    briefing_duration = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    debrief_duration = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    status = models.CharField(max_length=20, choices=FlightStatus.choices, default=FlightStatus.SCHEDULED)
    exercises_completed = models.JSONField(default=list, blank=True)
    competencies_acquired = models.JSONField(default=list, blank=True)
    difficulties = models.TextField(blank=True, null=True)
    observations = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    grade = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    result = models.CharField(max_length=20, blank=True, null=True)
    pedagogical_note = models.TextField(blank=True, null=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    signed_by_instructor = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'flight_lessons'
        ordering = ['-scheduled_date']
        verbose_name = 'Flight Lesson'
        verbose_name_plural = 'Flight Lessons'
        indexes = [
            models.Index(fields=['student', 'scheduled_date']),
            models.Index(fields=['instructor', 'scheduled_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Flight: {self.student.full_name} - {self.scheduled_date} ({self.status})'


class FlightPreparation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flight_lesson = models.OneToOneField(FlightLesson, on_delete=models.CASCADE, related_name='preparation')
    weather_check = models.BooleanField(default=False)
    notam_check = models.BooleanField(default=False)
    performance_check = models.BooleanField(default=False)
    document_check = models.BooleanField(default=False)
    medical_check = models.BooleanField(default=False)
    lesson_objectives = models.TextField(blank=True, null=True)
    briefing_notes = models.TextField(blank=True, null=True)
    prepared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'flight_preparations'
        verbose_name = 'Flight Preparation'
        verbose_name_plural = 'Flight Preparations'

    def __str__(self):
        return f'Prep: {self.flight_lesson}'


class ResourceBooking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource_type = models.CharField(max_length=30)
    resource_id = models.UUIDField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    activity_type = models.CharField(max_length=30, blank=True, null=True)
    activity_id = models.UUIDField(null=True, blank=True)
    status = models.CharField(max_length=20, default='confirmed')
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'resource_bookings'
        indexes = [
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['start_time', 'end_time']),
        ]

    def __str__(self):
        return f'{self.resource_type} booking ({self.start_time})'


class MaintenanceRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_records')
    type = models.CharField(max_length=30)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='scheduled')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'maintenance_records'
        verbose_name = 'Maintenance Record'
        verbose_name_plural = 'Maintenance Records'

    def __str__(self):
        return f'{self.aircraft} - {self.type}'


class InstructorAvailability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instructor = models.ForeignKey('students.FlightInstructor', on_delete=models.CASCADE, related_name='availability')
    day_of_week = models.IntegerField(help_text='0=Monday, 6=Sunday')
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = 'instructor_availability'
        verbose_name = 'Instructor Availability'
        verbose_name_plural = 'Instructor Availabilities'

    def __str__(self):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return f'{self.instructor.last_name} - {days[self.day_of_week]}'


class Simulator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
    model_name = models.CharField(max_length=100, blank=True, null=True)
    qualification_type = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, default='available')
    last_maintenance = models.DateTimeField(null=True, blank=True)
    next_maintenance = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'simulators'

    def __str__(self):
        return f'{self.name} ({self.manufacturer} {self.model_name or ""})'


class SimulatorSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    simulator = models.ForeignKey(Simulator, on_delete=models.CASCADE, related_name='sessions')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    instructor = models.ForeignKey('students.FlightInstructor', on_delete=models.CASCADE)
    scheduled_date = models.DateTimeField()
    duration = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    status = models.CharField(max_length=20, default='scheduled')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'simulator_sessions'

    def __str__(self):
        return f'{self.simulator.name} - {self.scheduled_date}'

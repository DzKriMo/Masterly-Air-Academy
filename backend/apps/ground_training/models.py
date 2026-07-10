import uuid
from django.db import models
from apps.students.models import TrainingProgram


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    title_en = models.CharField(max_length=255)
    title_fr = models.CharField(max_length=255)
    title_ar = models.CharField(max_length=255)
    description_en = models.TextField(blank=True, null=True)
    description_fr = models.TextField(blank=True, null=True)
    description_ar = models.TextField(blank=True, null=True)
    total_hours = models.IntegerField()
    program = models.CharField(max_length=10, choices=TrainingProgram.choices)
    academic_year = models.ForeignKey('core.AcademicYear', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subjects'
        ordering = ['code']
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'

    def __str__(self):
        return f'{self.code} - {self.title_en}'


class Module(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    duration = models.IntegerField(help_text='Duration in hours')
    order = models.IntegerField()
    status = models.CharField(max_length=20, default='active')

    class Meta:
        db_table = 'modules'
        ordering = ['order']
        unique_together = ['subject', 'order']
        verbose_name = 'Module'
        verbose_name_plural = 'Modules'

    def __str__(self):
        return f'{self.subject.code} - M{self.order}: {self.title}'


class ModuleLesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    lesson_no = models.IntegerField()
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'module_lessons'
        unique_together = ['module', 'lesson_no']
        ordering = ['lesson_no']

    def __str__(self):
        return f'Lesson {self.lesson_no}: {self.title or "Untitled"}'


class ModuleDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255, blank=True, null=True)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    type = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'module_documents'

    def __str__(self):
        return self.name or 'Document'


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    capacity = models.IntegerField()
    location = models.CharField(max_length=255, blank=True, null=True)
    equipment = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, default='available')

    class Meta:
        db_table = 'rooms'
        verbose_name = 'Room'
        verbose_name_plural = 'Rooms'

    def __str__(self):
        return f'{self.name} (cap. {self.capacity})'


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='courses')
    instructor = models.ForeignKey('students.GroundInstructor', on_delete=models.CASCADE, related_name='courses')
    academic_year = models.ForeignKey('core.AcademicYear', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    scheduled_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, default='scheduled')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courses'
        ordering = ['-scheduled_date', 'start_time']
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'

    def __str__(self):
        return f'{self.title} - {self.scheduled_date}'


class CourseEnrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='active')

    class Meta:
        db_table = 'course_enrollments'
        unique_together = ['student', 'course']

    def __str__(self):
        return f'{self.student.full_name} → {self.course.title}'


class AttendanceRecord(models.Model):
    class AttendanceStatus(models.TextChoices):
        PRESENT = 'present', 'Present'
        ABSENT = 'absent', 'Absent'
        LATE = 'late', 'Late'
        EXCUSED = 'excused_absence', 'Excused Absence'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='attendance_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices)
    notes = models.TextField(blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance_records'
        unique_together = ['student', 'course', 'date']

    def __str__(self):
        return f'{self.student.full_name} - {self.course.scheduled_date} - {self.status}'

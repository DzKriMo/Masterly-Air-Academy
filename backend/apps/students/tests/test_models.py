"""
Tests for the Student model.

Verifies creation, computed properties, and unique constraints
are enforced at the database level.
"""
import pytest
from django.db import IntegrityError
from django.core.exceptions import ValidationError


@pytest.mark.django_db
class TestStudentModel:
    """Model-level tests for the Student entity."""

    def test_create_student(self, student_profile):
        """A valid student is persisted and can be retrieved."""
        from apps.students.models import Student
        saved = Student.objects.get(id=student_profile.id)
        assert saved.first_name == 'John'
        assert saved.last_name == 'Doe'
        assert saved.student_number == 'STU-001'
        assert saved.program == 'PPL'
        assert saved.status == 'active'
        assert str(saved) == 'John Doe (STU-001)'

    def test_student_full_name(self, student_profile):
        """The full_name property joins first and last name."""
        assert student_profile.full_name == 'John Doe'

    def test_student_full_name_updates(self, student_profile):
        """Changing name fields is reflected in the full_name property."""
        student_profile.first_name = 'Jonathan'
        student_profile.save()
        # Fetch fresh from DB
        student_profile.refresh_from_db()
        assert student_profile.full_name == 'Jonathan Doe'

    def test_student_unique_number(self, student_profile, academic_year):
        """Creating a second student with the same student_number is rejected."""
        from apps.students.models import Student
        from django.contrib.auth import get_user_model
        User = get_user_model()
        other_user = User.objects.create_user(
            username='dup_student', email='duplicate@masterly.test',
            password='testpass123', role='student',
            first_name='Jane', last_name='Doe',
        )
        with pytest.raises(IntegrityError):
            Student.objects.create(
                user=other_user,
                student_number='STU-001',  # Same as existing
                first_name='Jane',
                last_name='Doe',
                date_of_birth='2000-01-01',
                enrollment_date='2025-09-01',
                status='active',
                program='CPL',
                academic_year=academic_year,
            )

    def test_student_default_status(self, student_profile):
        """The default status is 'active'."""
        assert student_profile.status == 'active'

    def test_student_ordering(self, student_profile, second_student_profile):
        """Students are ordered by last_name then first_name."""
        from apps.students.models import Student
        students = list(Student.objects.all())
        # Alice Wonder comes before John Doe
        assert students[0].last_name == 'Doe'
        assert students[1].last_name == 'Wonder'

    def test_student_str_representation(self, student_profile):
        """String representation shows name and student number."""
        assert str(student_profile) == 'John Doe (STU-001)'

    def test_student_cascade_delete(self, student_profile, user_student):
        """Deleting the user also deletes the student profile."""
        from apps.students.models import Student
        user_student.delete()
        assert Student.objects.filter(id=student_profile.id).count() == 0

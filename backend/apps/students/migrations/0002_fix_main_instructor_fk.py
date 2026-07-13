# Generated manually to fix Student.main_instructor FK
# from 'self' (Student) → 'FlightInstructor'

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='student',
            name='main_instructor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_students',
                to='students.flightinstructor',
            ),
        ),
    ]

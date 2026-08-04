# Generated manually
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('flight_training', '0006_alter_flightexercise_program'),
        ('students', '0004_remove_student_academic_year_promotion_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='FlightLogEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('aircraft_text', models.CharField(blank=True, max_length=100, null=True)),
                ('date', models.DateField()),
                ('departure_time', models.DateTimeField(blank=True, null=True)),
                ('arrival_time', models.DateTimeField(blank=True, null=True)),
                ('flight_duration', models.DecimalField(decimal_places=1, max_digits=4)),
                ('exercises', models.JSONField(blank=True, default=list)),
                ('notes', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('validated_at', models.DateTimeField(blank=True, null=True)),
                ('rejection_reason', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('aircraft', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='log_entries', to='flight_training.aircraft')),
                ('student', models.ForeignKey(on_delete=models.CASCADE, related_name='log_entries', to='students.student')),
                ('validated_by', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='validated_log_entries', to='students.flightinstructor')),
            ],
            options={
                'verbose_name': 'Flight Log Entry',
                'verbose_name_plural': 'Flight Log Entries',
                'db_table': 'flight_log_entries',
                'ordering': ['-date', '-created_at'],
                'indexes': [
                    models.Index(fields=['student', 'status'], name='flight_log__student_7ccefb_idx'),
                    models.Index(fields=['status'], name='flight_log__status_8b1c7d_idx'),
                ],
            },
        ),
    ]

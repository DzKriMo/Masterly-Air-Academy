import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ground_training', '0009_alter_modulelesson_video_url'),
        ('students', '0004_remove_student_academic_year_promotion_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='modulelesson',
            name='is_mandatory',
            field=models.BooleanField(default=False, help_text='When a lesson video is marked mandatory it is tracked: view progress is recorded and playback pauses when the tab switches.'),
        ),
        migrations.CreateModel(
            name='LessonVideoView',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('watched_seconds', models.IntegerField(default=0, help_text='Per-second time actually watched (accreted while tab is active).')),
                ('duration', models.IntegerField(default=0, help_text='Video duration in seconds.')),
                ('status', models.CharField(choices=[('in_progress', 'In Progress'), ('completed', 'Completed')], default='in_progress', max_length=20)),
                ('tab_switches', models.IntegerField(default=0, help_text='Number of times the student left the tab during the video.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='video_views', to='ground_training.modulelesson')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_video_views', to='students.student')),
            ],
            options={
                'db_table': 'lesson_video_views',
                'ordering': ['-updated_at'],
                'unique_together': {('lesson', 'student')},
            },
        ),
    ]

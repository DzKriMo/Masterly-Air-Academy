# Generated manually
from django.db import migrations, models
import apps.exams.final_models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0006_skilltest_exercises'),
        ('students', '0004_remove_student_academic_year_promotion_and_more'),
        ('ground_training', '0010_lessonvideoview_modulelesson_is_mandatory'),
    ]

    operations = [
        migrations.CreateModel(
            name='FinalExamQuestion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('question_text', models.TextField()),
                ('question_type', models.CharField(choices=[('mcq', 'Multiple Choice'), ('scq', 'Single Choice'), ('essay', 'Essay'), ('true_false', 'True/False')], default='mcq', max_length=20)),
                ('difficulty', models.CharField(choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')], default='medium', max_length=10)),
                ('options', models.JSONField(blank=True, default=list)),
                ('correct_answer', models.TextField(blank=True, null=True)),
                ('explanation', models.TextField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('module', models.ForeignKey(on_delete=models.CASCADE, related_name='final_questions', to='ground_training.module')),
                ('subject', models.ForeignKey(on_delete=models.CASCADE, related_name='final_questions', to='ground_training.subject')),
            ],
            options={
                'verbose_name': 'Final Exam Question',
                'verbose_name_plural': 'Final Exam Questions',
                'db_table': 'final_exam_questions',
                'ordering': ['subject', 'module', 'difficulty'],
                'indexes': [
                    models.Index(fields=['subject', 'module'], name='final_q_subject_mod'),
                    models.Index(fields=['difficulty'], name='final_q_difficulty'),
                    models.Index(fields=['question_type'], name='final_q_type'),
                ],
            },
        ),
        migrations.CreateModel(
            name='FinalExam',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('hash', models.CharField(default=apps.exams.final_models.generate_exam_hash, max_length=32, unique=True)),
                ('title', models.CharField(max_length=255)),
                ('title_ar', models.CharField(blank=True, max_length=255, null=True)),
                ('title_fr', models.CharField(blank=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('generated', 'Generated'), ('in_progress', 'In Progress'), ('completed', 'Completed')], default='draft', max_length=20)),
                ('duration_minutes', models.IntegerField(default=120)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=models.SET_NULL, related_name='created_final_exams', to='accounts.user')),
                ('promotions', models.ManyToManyField(blank=True, related_name='final_exams', to='students.promotion')),
                ('subject', models.ForeignKey(on_delete=models.CASCADE, related_name='final_exams', to='ground_training.subject')),
            ],
            options={
                'verbose_name': 'Final Exam',
                'verbose_name_plural': 'Final Exams',
                'db_table': 'final_exams',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FinalExamModuleConfig',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('question_count', models.IntegerField(default=10)),
                ('difficulty_distribution', models.JSONField(default=dict)),
                ('type_distribution', models.JSONField(default=dict)),
                ('exam', models.ForeignKey(on_delete=models.CASCADE, related_name='module_configs', to='exams.finalexam')),
                ('module', models.ForeignKey(on_delete=models.CASCADE, related_name='final_exam_configs', to='ground_training.module')),
            ],
            options={
                'db_table': 'final_exam_module_configs',
                'unique_together': {('exam', 'module')},
            },
        ),
        migrations.CreateModel(
            name='FinalExamAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('access_code', models.CharField(default=apps.exams.final_models.generate_access_code, max_length=16, unique=True)),
                ('questions', models.JSONField(default=list)),
                ('answers', models.JSONField(blank=True, default=dict)),
                ('score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('status', models.CharField(default='pending', max_length=20)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('exam', models.ForeignKey(on_delete=models.CASCADE, related_name='assignments', to='exams.finalexam')),
                ('student', models.ForeignKey(on_delete=models.CASCADE, related_name='final_exam_assignments', to='students.student')),
            ],
            options={
                'db_table': 'final_exam_assignments',
                'ordering': ['student__last_name', 'student__first_name'],
                'unique_together': {('exam', 'student')},
            },
        ),
    ]

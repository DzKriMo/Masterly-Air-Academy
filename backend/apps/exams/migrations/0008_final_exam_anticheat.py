from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0007_final_exam_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='finalexamassignment',
            name='violations',
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.AddField(
            model_name='finalexamassignment',
            name='is_flagged',
            field=models.BooleanField(default=False),
        ),
    ]
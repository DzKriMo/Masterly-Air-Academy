from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0008_final_exam_anticheat'),
    ]

    operations = [
        migrations.AddField(
            model_name='finalexamquestion',
            name='points',
            field=models.DecimalField(max_digits=5, decimal_places=2, default=1.0),
        ),
        migrations.AddField(
            model_name='finalexamassignment',
            name='manual_scores',
            field=models.JSONField(default=dict, blank=True),
        ),
        migrations.AddField(
            model_name='finalexamassignment',
            name='essay_graded',
            field=models.BooleanField(default=False),
        ),
    ]

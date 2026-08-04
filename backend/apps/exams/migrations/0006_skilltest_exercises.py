# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0005_fix_long_qr_and_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='skilltest',
            name='exercises',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

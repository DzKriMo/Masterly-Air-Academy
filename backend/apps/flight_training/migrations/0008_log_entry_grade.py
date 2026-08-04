# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flight_training', '0007_flight_log_entry'),
    ]

    operations = [
        migrations.AddField(
            model_name='flightlogentry',
            name='grade',
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name='flightlogentry',
            name='instructor_notes',
            field=models.TextField(blank=True, null=True),
        ),
    ]

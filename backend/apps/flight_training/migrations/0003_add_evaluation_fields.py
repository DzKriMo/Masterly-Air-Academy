# Generated manually for P2 Instructor Portal features

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flight_training', '0002_add_i18n_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='flightlesson',
            name='departure_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='flightlesson',
            name='arrival_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='flightlesson',
            name='signed_by_instructor',
            field=models.BooleanField(default=False),
        ),
    ]

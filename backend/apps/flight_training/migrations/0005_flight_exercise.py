# Generated manually
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('flight_training', '0004_simulator_simulatorsession'),
    ]

    operations = [
        migrations.CreateModel(
            name='FlightExercise',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=20, unique=True)),
                ('title', models.CharField(max_length=255)),
                ('title_ar', models.CharField(blank=True, max_length=255, null=True)),
                ('title_fr', models.CharField(blank=True, max_length=255, null=True)),
                ('category', models.CharField(choices=[('maneuver', 'Maneuver'), ('procedure', 'Procedure'), ('emergency', 'Emergency'), ('navigation', 'Navigation'), ('other', 'Other')], default='other', max_length=30)),
                ('description', models.TextField(blank=True, null=True)),
                ('program', models.CharField(blank=True, choices=[('PPL', 'PPL – Private Pilot Licence'), ('CPL', 'CPL – Commercial Pilot Licence'), ('IR', 'IR – Instrument Rating'), ('MEP', 'MEP – Multi-Engine Piston'), ('MCC', 'MCC – Multi-Crew Cooperation')], max_length=10, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Flight Exercise',
                'verbose_name_plural': 'Flight Exercises',
                'db_table': 'flight_exercises',
                'ordering': ['category', 'order', 'code'],
            },
        ),
    ]

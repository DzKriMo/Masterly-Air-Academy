# Generated manually to add photo field to Student model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_fix_main_instructor_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='photo',
            field=models.ImageField(blank=True, null=True, upload_to='students/photos/'),
        ),
    ]

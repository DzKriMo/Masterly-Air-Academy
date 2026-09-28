import uuid

from django.db import migrations, models


def backfill_verification_tokens(apps, schema_editor):
    """Give every existing certificate a unique, unguessable verify token.

    Added in three steps on purpose: the column is introduced nullable and
    without a unique index (a SQL-level default would assign the *same* value
    to every existing row and trip the constraint), then each row is given its
    own UUID, and only then is uniqueness enforced.
    """
    Certificate = apps.get_model('exams', 'Certificate')
    for cert in Certificate.objects.all().iterator():
        cert.verification_token = uuid.uuid4()
        cert.save(update_fields=['verification_token'])


def clear_verification_tokens(apps, schema_editor):
    Certificate = apps.get_model('exams', 'Certificate')
    Certificate.objects.update(verification_token=None)


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0010_rename_final_q_subject_mod_final_exam__subject_9b1604_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='verification_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.RunPython(backfill_verification_tokens, clear_verification_tokens),
        migrations.AlterField(
            model_name='certificate',
            name='verification_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]

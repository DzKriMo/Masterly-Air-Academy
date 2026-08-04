from django.db import migrations


def seed_categories(apps, schema_editor):
    LibraryCategory = apps.get_model('administration', 'LibraryCategory')
    defaults = [
        ('Training Materials', 'Courses, lessons, manuals and training resources', 'book', 'blue'),
        ('Regulations & Policies', 'Official rules, policies and compliance documents', 'shield', 'red'),
        ('Forms & Templates', 'Fillable forms and document templates', 'document', 'green'),
        ('Exams & Tests', 'Exam papers, mock tests and question banks', 'clipboard', 'gold'),
        ('Admin & Operations', 'Internal operational and administrative files', 'gear', 'gray'),
        ('Videos', 'Recorded lessons, briefings and tutorials', 'video', 'purple'),
        ('General', 'Miscellaneous shared documents', 'folder', 'navy'),
    ]
    for name, description, icon, color in defaults:
        LibraryCategory.objects.update_or_create(
            name=name,
            defaults={'description': description, 'icon': icon, 'color': color},
        )


def grant_scheduler_documents_view(apps, schema_editor):
    from django.contrib.auth.models import Group, Permission
    try:
        group = Group.objects.get(name='scheduler')
        perm = Permission.objects.filter(codename='documents.view').first()
        if group and perm:
            group.permissions.add(perm)
    except Group.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('administration', '0002_librarycategory_document_description_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
        migrations.RunPython(grant_scheduler_documents_view, migrations.RunPython.noop),
    ]

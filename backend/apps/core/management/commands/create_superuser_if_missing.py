from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser if none exists, or reset password if needed'

    def handle(self, *args, **options):
        email = 'admin@masterly-air-academy.dz'
        password = 'admin123'

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': 'admin',
                'role': 'system_admin',
                'status': 'active',
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
                'first_name': 'System',
                'last_name': 'Administrator',
            }
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Superuser created: {email} / {password}'
            ))
        else:
            # Ensure the password is always correct
            user.set_password(password)
            user.role = 'system_admin'
            user.status = 'active'
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Superuser password reset: {email} / {password}'
            ))

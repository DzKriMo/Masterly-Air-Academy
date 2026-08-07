import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser only if none exists, using an env-provided password.'

    def handle(self, *args, **options):
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@masterly-air-academy.dz')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD') or os.environ.get('SUPERUSER_PASSWORD')

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('A superuser already exists; skipping creation.'))
            return

        if not password:
            if settings.DEBUG:
                password = 'admin123'
                self.stdout.write(self.style.WARNING(
                    'DEBUG=True: no DJANGO_SUPERUSER_PASSWORD set, using dev default password.'
                ))
            else:
                raise CommandError(
                    'DJANGO_SUPERUSER_PASSWORD (or SUPERUSER_PASSWORD) must be set when DEBUG is disabled '
                    'to create the initial superuser. Set it in your environment or .env (see .env.example).'
                )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
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
                f'Superuser created: {email}'
            ))
        else:
            user.username = username
            user.role = 'system_admin'
            user.status = 'active'
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Existing account promoted to superuser: {email}'
            ))

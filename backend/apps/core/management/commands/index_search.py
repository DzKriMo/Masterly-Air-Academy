"""Management command: Index all models into Meilisearch."""
from django.core.management.base import BaseCommand
from apps.core.search import index_all


class Command(BaseCommand):
    help = 'Index all searchable models into Meilisearch'

    def handle(self, *args, **options):
        result = index_all()
        self.stdout.write(self.style.SUCCESS(result))

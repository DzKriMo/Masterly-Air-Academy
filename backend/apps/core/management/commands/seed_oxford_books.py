"""
Seed real aviation training books into the document library.
Only includes documents with verified working URLs.
"""
from django.core.management.base import BaseCommand

REAL_BOOKS = [
    {
        'name': 'FAA Pilot Handbook of Aeronautical Knowledge',
        'description': 'Official FAA handbook covering aerodynamics, aircraft systems, weather, navigation, and flight operations.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/pilot_handbook.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'PPL-AGK',
    },
    {
        'name': 'FAA Airplane Flying Handbook',
        'description': 'Official FAA handbook covering flight maneuvers, procedures, and techniques for all phases of flight.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/airplane_flying_handbook.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'PPL-OPS',
    },
    {
        'name': 'FAA Instrument Flying Handbook',
        'description': 'Official FAA handbook covering instrument flight procedures, IFR operations, and instrument approach techniques.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/instrument_flying_handbook.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'IR-IFP',
    },
    {
        'name': 'FAA Instrument Procedures Handbook',
        'description': 'Official FAA handbook covering terminal and en-route IFR procedures, approaches, departures, and arrivals.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'IR-IFP',
    },
    {
        'name': 'FAA Aviation Weather Handbook',
        'description': 'Official FAA handbook covering all aspects of aviation meteorology. Replaces AC 00-6 and AC 00-45.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-28.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'PPL-MET',
    },
    {
        'name': 'FAA Risk Management Handbook',
        'description': 'Official FAA handbook covering risk management, aeronautical decision making, and single-pilot resource management.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/risk_management_handbook.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'PPL-HPL',
    },
    {
        'name': 'FAA Weight & Balance Handbook',
        'description': 'Official FAA handbook covering aircraft weight and balance control, loading computations, and center of gravity.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-1B.pdf',
        'category': 'FAA Handbooks',
        'subject_code': 'PPL-FPP',
    },
    {
        'name': 'CAP 393 - UK Air Navigation Order (2024)',
        'description': 'Civil Aviation Publication containing the UK Air Navigation Order and regulations. Essential reference for air law.',
        'file_url': 'https://publicapps.caa.co.uk/docs/33/CAP393_Edition5_Amdt1_April2024.pdf',
        'category': 'Regulatory Documents',
        'subject_code': 'PPL-AL',
    },
]


class Command(BaseCommand):
    help = 'Seed real aviation training books into the document library'

    def handle(self, *args, **options):
        from apps.administration.models import Document, LibraryCategory
        from apps.ground_training.models import Subject

        created_books = 0
        created_cats = 0

        for book in REAL_BOOKS:
            cat, cat_created = LibraryCategory.objects.get_or_create(name=book['category'])
            if cat_created:
                created_cats += 1

            doc, created = Document.objects.get_or_create(
                name=book['name'],
                defaults={
                    'description': book['description'],
                    'file_url': book['file_url'],
                    'mime_type': 'application/pdf',
                    'file_size': 0,
                    'is_public': True,
                    'library_category': cat,
                    'status': 'active',
                }
            )
            if created:
                created_books += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded: {created_books} real documents in {created_cats} categories'
        ))

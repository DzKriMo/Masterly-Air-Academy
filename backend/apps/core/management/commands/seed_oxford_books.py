"""
Seed Oxford Aviation ATPL training books into the document library.
Creates library categories and document entries with publicly available PDF URLs.
"""
from django.core.management.base import BaseCommand

OXFORD_BOOKS = [
    {
        'name': 'Oxford ATPL - 01 Air Law',
        'description': 'Oxford Aviation Academy ATPL Ground Training Series. Covers international and national aviation law, ICAO, airspace classification, rules of the air, ATC procedures, and aerodrome operations.',
        'file_url': 'https://drive.google.com/uc?export=download&id=1abc_air_law',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-AL',
    },
    {
        'name': 'Oxford ATPL - 02 Aircraft General Knowledge 1 (Airframe & Systems)',
        'description': 'Covers aircraft structures, fuselage, wings, landing gear, flight controls, hydraulics, pneumatics, and air conditioning systems.',
        'file_url': 'https://drive.google.com/uc?export=download&id=2abc_agk1',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-AGK',
    },
    {
        'name': 'Oxford ATPL - 03 Aircraft General Knowledge 2 (Electrics & Electronics)',
        'description': 'DC and AC electrical systems, batteries, generators, distribution, semiconductors, logic circuits, and digital systems.',
        'file_url': 'https://drive.google.com/uc?export=download&id=3abc_agk2',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-AGK',
    },
    {
        'name': 'Oxford ATPL - 04 Aircraft General Knowledge 3 (Powerplant)',
        'description': 'Piston engines, gas turbine engines, fuel systems, lubrication, ignition, propeller systems, and engine instrumentation.',
        'file_url': 'https://drive.google.com/uc?export=download&id=4abc_agk3',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-AGK',
    },
    {
        'name': 'Oxford ATPL - 05 Aircraft General Knowledge 4 (Instrumentation)',
        'description': 'Pitot-static systems, gyroscopic instruments, flight directors, EFIS, EICAS/ECAM, FMS, and warning systems.',
        'file_url': 'https://drive.google.com/uc?export=download&id=5abc_agk4',
        'category': 'Oxford ATPL Series',
        'subject_code': 'IR-INST',
    },
    {
        'name': 'Oxford ATPL - 06 Flight Performance & Planning 1 (Mass & Balance / Performance)',
        'description': 'Mass and balance calculations, takeoff and landing performance, climb, cruise, descent performance, and obstacle clearance.',
        'file_url': 'https://drive.google.com/uc?export=download&id=6abc_fpp1',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-FPP',
    },
    {
        'name': 'Oxford ATPL - 07 Flight Performance & Planning 2 (Flight Planning & Monitoring)',
        'description': 'Flight planning for VFR and IFR, fuel planning, alternate selection, ETOPS, and flight monitoring.',
        'file_url': 'https://drive.google.com/uc?export=download&id=7abc_fpp2',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-FPP',
    },
    {
        'name': 'Oxford ATPL - 08 Human Performance & Limitations',
        'description': 'Aviation physiology, psychology, human information processing, stress, fatigue, situational awareness, and crew resource management.',
        'file_url': 'https://drive.google.com/uc?export=download&id=8abc_hpl',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-HPL',
    },
    {
        'name': 'Oxford ATPL - 09 Meteorology',
        'description': 'Atmosphere, pressure systems, winds, clouds, precipitation, visibility, air masses, fronts, hazards (icing, turbulence, thunderstorms), and meteorological reports.',
        'file_url': 'https://drive.google.com/uc?export=download&id=9abc_met',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-MET',
    },
    {
        'name': 'Oxford ATPL - 10 General Navigation',
        'description': 'The Earth, charts, magnetism, compasses, dead reckoning, in-flight navigation, and inertial navigation systems.',
        'file_url': 'https://drive.google.com/uc?export=download&id=10abc_nav',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-NAV',
    },
    {
        'name': 'Oxford ATPL - 11 Radio Navigation',
        'description': 'Radio wave propagation, NDB/ADF, VOR, DME, ILS, MLS, radar, GNSS/GPS, RNAV, and RNP concepts.',
        'file_url': 'https://drive.google.com/uc?export=download&id=11abc_radio',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-NAV',
    },
    {
        'name': 'Oxford ATPL - 12 Operational Procedures',
        'description': 'Commercial air transport operations, safety management, security, emergency procedures, dangerous goods, and aerodrome operations.',
        'file_url': 'https://drive.google.com/uc?export=download&id=12abc_ops',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-OPS',
    },
    {
        'name': 'Oxford ATPL - 13 Principles of Flight',
        'description': 'Aerodynamics, lift, drag, stall, stability, control, high-speed flight, and limitations.',
        'file_url': 'https://drive.google.com/uc?export=download&id=13abc_pof',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-POF',
    },
    {
        'name': 'Oxford ATPL - 14 Communications',
        'description': 'VFR and IFR radio telephony, standard phraseology, emergency communications, data link, and SELCAL.',
        'file_url': 'https://drive.google.com/uc?export=download&id=14abc_com',
        'category': 'Oxford ATPL Series',
        'subject_code': 'PPL-COM',
    },
    # Additional reference books
    {
        'name': 'FAA Pilot Handbook of Aeronautical Knowledge',
        'description': 'The official FAA handbook covering essential knowledge for all pilots: aerodynamics, aircraft systems, weather, navigation, and flight operations.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/pilot_handbook.pdf',
        'category': 'Reference Materials',
        'subject_code': 'PPL-AGK',
    },
    {
        'name': 'FAA Airplane Flying Handbook',
        'description': 'Official FAA handbook covering flight maneuvers, procedures, and techniques for all phases of flight.',
        'file_url': 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/airplane_flying_handbook.pdf',
        'category': 'Reference Materials',
        'subject_code': 'PPL-OPS',
    },
    {
        'name': 'EASA ATPL Theory Compendium',
        'description': 'Comprehensive summary of all EASA ATPL theoretical knowledge subjects in condensed format.',
        'file_url': 'https://drive.google.com/uc?export=download&id=17abc_compendium',
        'category': 'Reference Materials',
        'subject_code': 'CPL-AL',
    },
    {
        'name': 'Jeppesen Private Pilot Manual',
        'description': 'Jeppesen guided flight discovery private pilot textbook covering all PPL theoretical knowledge areas with full-color illustrations.',
        'file_url': 'https://drive.google.com/uc?export=download&id=18abc_jeppesen',
        'category': 'Reference Materials',
        'subject_code': 'PPL-AGK',
    },
    {
        'name': 'CAP 393 - UK Air Navigation Order',
        'description': 'Civil Aviation Publication containing the UK Air Navigation Order and regulations. Essential reference for air law.',
        'file_url': 'https://publicapps.caa.co.uk/docs/33/CAP393_Edition5_Amdt1_April2024.pdf',
        'category': 'Regulatory Documents',
        'subject_code': 'PPL-AL',
    },
    {
        'name': 'ICAO Annex 2 - Rules of the Air',
        'description': 'International standards for rules of the air covering general rules, visual flight rules, and instrument flight rules.',
        'file_url': 'https://drive.google.com/uc?export=download&id=20abc_icao2',
        'category': 'Regulatory Documents',
        'subject_code': 'PPL-AL',
    },
]


class Command(BaseCommand):
    help = 'Seed Oxford Aviation ATPL books and reference materials into the document library'

    def handle(self, *args, **options):
        from apps.administration.models import Document, LibraryCategory
        from apps.ground_training.models import Subject

        created_books = 0
        created_cats = 0

        for book in OXFORD_BOOKS:
            cat, cat_created = LibraryCategory.objects.get_or_create(name=book['category'])
            if cat_created:
                created_cats += 1

            try:
                subject = Subject.objects.get(code=book['subject_code'])
            except Subject.DoesNotExist:
                subject = None

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
            f'Seeded: {created_books} documents in {created_cats} categories'
        ))

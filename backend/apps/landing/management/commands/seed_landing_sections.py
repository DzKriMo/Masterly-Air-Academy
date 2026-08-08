"""Seed landing sections with the academy's current static landing content.

Transfers the existing landing page content (hero, about, programs, why-us,
accreditations) into editable draft sections plus starter sections for
gallery, videos and testimonials. Idempotent and non-destructive: existing
section content is preserved, only empty sections are filled, and titles /
descriptions / ordering are refreshed on every run.

Usage:
    python manage.py seed_landing_sections [--publish]
"""

from django.core.management.base import BaseCommand

from apps.landing.models import LandingSection


def L(en, fr, ar):
    """Localized field helper."""
    return {"en": en, "fr": fr, "ar": ar}


SECTIONS = [
    {
        "key": "hero",
        "title": "Hero",
        "description": "Main banner at the top of the landing page.",
        "sort_order": 0,
        "blocks": [
            {
                "type": "hero",
                "data": {
                    "badge": L(
                        "Approved Training Organization",
                        "Organisme de Formation Agree",
                        "منظمة تدريب معتمدة",
                    ),
                    "title": L(
                        "Your Aviation Career Starts Here",
                        "Votre Carriere Aeronautique Commence Ici",
                        "مسيرتك المهنية في الطيران تبدأ هنا",
                    ),
                    "subtitle": L(
                        "Masterly Air Academy delivers world-class flight training with a modern fleet, experienced instructors, and a rigorous curriculum designed to produce safe, competent, and professional pilots.",
                        "Masterly Air Academy offre une formation au pilotage de classe mondiale avec une flotte moderne et des instructeurs experimentes.",
                        "تقدم أكاديمية ماسترلي للطيران تدريباً بمستوى عالمي مع أسطول حديث ومدربين ذوي خبرة.",
                    ),
                    "image": {"key": "/logo.png", "alt": "Masterly Air Academy"},
                    "ctas": [
                        {"text": L("Explore Programs", "Explorer les Programmes", "استكشاف البرامج"), "link": "#programs"},
                        {"text": L("Contact Us", "Contactez-Nous", "اتصل بنا"), "link": "#contact"},
                    ],
                },
            }
        ],
    },
    {
        "key": "about",
        "title": "About the Academy",
        "description": "Introduction to the academy with key strengths.",
        "sort_order": 1,
        "blocks": [
            {
                "type": "rich_text",
                "data": {
                    "kicker": L("About the Academy", "A propos de l'Academie", "عن الأكاديمية"),
                    "heading": L(
                        "Training Pilots to the Highest Standard",
                        "Former des Pilotes au Plus Haut Niveau",
                        "تدريب الطيارين بأعلى المعايير",
                    ),
                    "body": L(
                        "Masterly Air Academy is an Approved Training Organization (ATO) dedicated to producing pilots who meet and exceed industry standards.\n\nWe operate a modern fleet of single and multi-engine aircraft, supported by experienced instructors.\n\nEvery step of your journey is tracked, assessed, and supported through our integrated training management system.",
                        "Masterly Air Academy est un Organisme de Formation Agree (ATO) dedie a la production de pilotes qui repondent aux normes.\n\nNous exploitons une flotte moderne d'avions, soutenue par des instructeurs experimentes.\n\nChaque etape de votre parcours est suivie grace a notre systeme integre de gestion.",
                        "أكاديمية ماسترلي للطيران هي منظمة تدريب معتمدة مكرسة لتخريج طيارين يلبون معايير الصناعة.\n\nنشغل أسطولاً حديثاً من الطائرات، مدعوماً بمدربين ذوي خبرة.\n\nيتم تتبع كل خطوة في رحلتك من خلال نظام إدارة التدريب المتكامل.",
                    ),
                },
            },
            {
                "type": "features",
                "data": {
                    "heading": "",
                    "kicker": "",
                    "items": [
                        {
                            "title": L("Modern Fleet", "Flotte Moderne", "أسطول حديث"),
                            "description": L(
                                "Glass-cockpit aircraft maintained to the highest standards.",
                                "Avions a cockpits numeriques maintenus aux normes les plus elevees.",
                                "طائرات ذات قمرة قيادة زجاجية بأعلى المعايير.",
                            ),
                        },
                        {
                            "title": L("Expert Team", "Equipe Experimentee", "فريق خبير"),
                            "description": L(
                                "Instructors with thousands of hours of instructional and operational experience.",
                                "Instructeurs avec des milliers d'heures d'experience.",
                                "مدربون بآلاف الساعات من الخبرة.",
                            ),
                        },
                        {
                            "title": L("Structured Curriculum", "Programme Structure", "منهج منظم"),
                            "description": L(
                                "Approved syllabus aligned with international aviation standards.",
                                "Programme approuve conforme aux normes internationales.",
                                "منهج معتمد متوافق مع المعايير الدولية.",
                            ),
                        },
                        {
                            "title": L("Full Support", "Support Complet", "دعم كامل"),
                            "description": L(
                                "Dedicated ground school, briefing facilities, and student progress tracking.",
                                "Ecole au sol dediee, salles de briefing et suivi des progres.",
                                "مدرسة أرضية مخصصة ومرافق إحاطة وتتبع تقدم الطالب.",
                            ),
                        },
                    ],
                },
            },
        ],
    },
    {
        "key": "why_us",
        "title": "Why Us",
        "description": "Reasons students choose the academy.",
        "sort_order": 2,
        "blocks": [
            {
                "type": "features",
                "data": {
                    "kicker": L(
                        "Why Masterly Air Academy",
                        "Pourquoi Masterly Air Academy",
                        "لماذا أكاديمية ماسترلي للطيران",
                    ),
                    "heading": L(
                        "Built for Serious Training",
                        "Construite pour une Formation Serieuse",
                        "مبنية للتدريب الجاد",
                    ),
                    "items": [
                        {
                            "title": L("ATO Certified", "ATO Certifiee", "معتمدة ATO"),
                            "description": L(
                                "Fully approved by the civil aviation authority.",
                                "Approuvee par l'autorite de l'aviation civile.",
                                "معتمدة بالكامل من قبل سلطة الطيران المدني.",
                            ),
                        },
                        {
                            "title": L("Modern Fleet", "Flotte Moderne", "أسطول حديث"),
                            "description": L(
                                "Glass-cockpit aircraft maintained to the highest standards.",
                                "Avions a cockpits numeriques maintenus aux normes les plus elevees.",
                                "طائرات ذات قمرة قيادة زجاجية بأعلى المعايير.",
                            ),
                        },
                        {
                            "title": L("Efficient Training", "Formation Efficace", "تدريب فعال"),
                            "description": L(
                                "Structured progression with clear milestones and integrated digital tracking.",
                                "Progression structuree avec jalons clairs et suivi numerique.",
                                "تقدم منظم مع مراحل واضحة وتتبع رقمي متكامل.",
                            ),
                        },
                    ],
                },
            }
        ],
    },
    {
        "key": "programs",
        "title": "Training Programs",
        "description": "The pilot training programs offered by the academy.",
        "sort_order": 3,
        "blocks": [
            {
                "type": "programs",
                "data": {
                    "kicker": L("Training Programs", "Programmes de Formation", "برامج التدريب"),
                    "heading": L("Choose Your Path", "Choisissez Votre Voie", "اختر مسارك"),
                    "subtitle": L(
                        "Structured programs from your first discovery flight to airline-ready certification.",
                        "Des programmes structures depuis votre premier vol jusqu'a la certification.",
                        "برامج منظمة من أول رحلة استكشافية إلى شهادة الطيار التجاري.",
                    ),
                    "durationLabel": L("Duration", "Duree", "المدة"),
                    "prereqLabel": L("Prerequisites", "Prerequis", "المتطلبات"),
                    "items": [
                        {
                            "code": "PPL",
                            "image": {"key": "/images/ppl.png", "alt": "PPL"},
                            "title": L("Private Pilot License", "Licence de Pilote Prive", "رخصة طيار خاص"),
                            "description": L(
                                "The foundation of your aviation career. Learn basic flight maneuvers, navigation, and aircraft handling.",
                                "Le fondement de votre carriere. Apprenez les manoeuvres de base, la navigation et le pilotage.",
                                "أساس مسيرتك في الطيران. تعلم مناورات الطيران الأساسية والملاحة.",
                            ),
                            "duration": L("6-8 months", "6-8 mois", "٦-٨ أشهر"),
                            "prereq": L("Class 2 Medical Certificate", "Certificat Medical Classe 2", "شهادة طبية فئة ٢"),
                            "link": "#programs",
                        },
                        {
                            "code": "CPL",
                            "image": {"key": "/images/cpl.png", "alt": "CPL"},
                            "title": L("Commercial Pilot License", "Licence de Pilote Commercial", "رخصة طيار تجاري"),
                            "description": L(
                                "Advanced training for professional pilots. Master complex aircraft operations and multi-engine handling.",
                                "Formation avancee pour pilotes professionnels. Maitrisez les operations complexes et le pilotage multimoteur.",
                                "تدريب متقدم للطيارين المحترفين. إتقان العمليات المعقدة والطيران متعدد المحركات.",
                            ),
                            "duration": L("12-18 months", "12-18 mois", "١٢-١٨ شهراً"),
                            "prereq": L("PPL + Class 1 Medical Certificate", "PPL + Certificat Medical Classe 1", "PPL + شهادة طبية فئة ١"),
                            "link": "#programs",
                        },
                        {
                            "code": "IR",
                            "image": {"key": "/images/IR.png", "alt": "IR"},
                            "title": L("Instrument Rating", "Instrument Rating", "الطيران بالأجهزة"),
                            "description": L(
                                "Fly solely by reference to instruments. Essential for commercial operations in all weather conditions.",
                                "Volez uniquement aux instruments. Essentiel pour les operations commerciales par tous les temps.",
                                "الطيران بالاعتماد على الأجهزة فقط. أساسي للعمليات التجارية.",
                            ),
                            "duration": L("3-4 months", "3-4 mois", "٣-٤ أشهر"),
                            "prereq": L("PPL + 50 hours cross-country", "PPL + 50h navigation", "PPL + ٥٠ ساعة عبر البلاد"),
                            "link": "#programs",
                        },
                        {
                            "code": "MEP",
                            "image": {"key": "/images/mep.png", "alt": "MEP"},
                            "title": L("Multi-Engine Piston", "Multi-Moteur Piston", "متعدد المحركات"),
                            "description": L(
                                "Transition to multi-engine aircraft. Learn asymmetric flight management and engine-out procedures.",
                                "Transition vers les avions multimoteurs. Apprenez la gestion du vol asymetrique.",
                                "الانتقال إلى الطائرات متعددة المحركات. تعلم إدارة الطيران غير المتماثل.",
                            ),
                            "duration": L("1-2 months", "1-2 mois", "١-٢ شهر"),
                            "prereq": L("CPL or in progress", "CPL ou en cours", "CPL أو قيد التقدم"),
                            "link": "#programs",
                        },
                        {
                            "code": "MCC",
                            "image": {"key": "/images/mcc.png", "alt": "MCC"},
                            "title": L("Multi-Crew Cooperation", "Cooperation Multi-Equipage", "التعاون متعدد الطاقم"),
                            "description": L(
                                "Prepare for airline operations. Develop crew resource management and multi-pilot cockpit discipline.",
                                "Preparation aux operations aeriennes. Developpez la gestion des ressources de l'equipage.",
                                "الاستعداد لعمليات الخطوط الجوية. تطوير إدارة موارد الطاقم.",
                            ),
                            "duration": L("2-3 weeks", "2-3 semaines", "٢-٣ أسابيع"),
                            "prereq": L("CPL + IR", "CPL + IR", "CPL + IR"),
                            "link": "#programs",
                        },
                    ],
                },
            }
        ],
    },
    {
        "key": "accreditations",
        "title": "Accreditations",
        "description": "Official approvals and accreditations.",
        "sort_order": 4,
        "blocks": [
            {
                "type": "logos",
                "data": {
                    "kicker": L(
                        "Accreditations & Approvals",
                        "Agrements et Approbations",
                        "الاعتمادات والموافقات",
                    ),
                    "heading": L(
                        "Approved & Recognized By",
                        "Approuve et Reconnu Par",
                        "معتمدة ومعترف بها من قبل",
                    ),
                    "items": [
                        {
                            "key": "/images/1.webp",
                            "alt": L(
                                "Ministry of Interior & Transport",
                                "Ministere de l'Interieur et des Transports",
                                "وزارة الداخلية والنقل",
                            ),
                        },
                        {
                            "key": "/images/3.png",
                            "alt": L(
                                "National Civil Aviation Agency",
                                "Agence Nationale de l'Aviation Civile",
                                "الوكالة الوطنية للطيران المدني",
                            ),
                        },
                    ],
                },
            }
        ],
    },
    {
        "key": "gallery",
        "title": "Gallery",
        "description": "Photo gallery shown on the landing page.",
        "sort_order": 5,
        "blocks": [
            {
                "type": "gallery",
                "data": {
                    "heading": L("Gallery", "Galerie", "المعرض"),
                    "items": [],
                },
            }
        ],
    },
    {
        "key": "videos",
        "title": "Videos",
        "description": "Video showcase (YouTube links or uploaded media).",
        "sort_order": 6,
        "blocks": [
            {
                "type": "video",
                "data": {
                    "heading": L("Videos", "Videos", "الفيديوهات"),
                    "items": [],
                },
            }
        ],
    },
    {
        "key": "testimonials",
        "title": "Testimonials",
        "description": "Student and graduate testimonials.",
        "sort_order": 7,
        "blocks": [
            {
                "type": "testimonials",
                "data": {
                    "heading": L("Testimonials", "Temoignages", "آراء الطلاب"),
                    "items": [],
                },
            }
        ],
    },
]


class Command(BaseCommand):
    help = "Seed landing sections with the current academy landing content."

    def add_arguments(self, parser):
        parser.add_argument(
            '--publish', action='store_true',
            help='Publish the seeded content immediately (default: keep as drafts).',
        )
        parser.add_argument(
            '--force', action='store_true',
            help='Overwrite existing section content with the seed (default: keep manager edits).',
        )

    def handle(self, *args, **options):
        created = 0
        filled = 0
        kept = 0
        for spec in SECTIONS:
            obj, was_created = LandingSection.objects.get_or_create(key=spec['key'])
            if was_created:
                created += 1
            obj.title = spec['title']
            obj.description = spec.get('description')
            obj.sort_order = spec['sort_order']
            if not obj.content or options['force']:
                obj.content = spec['blocks']
                filled += 1
            else:
                kept += 1
            if options['publish'] and (options['force'] or obj.status != 'published'):
                obj.published_content = obj.content or []
                obj.published_version = (obj.published_version or 0) + 1
                obj.status = 'published'
            obj.save()
        self.stdout.write(self.style.SUCCESS(
            f'Landing sections ready: {created} created, {filled} filled, {kept} already had content.'
        ))
        if options['publish']:
            self.stdout.write(self.style.SUCCESS('Seeded sections published.'))

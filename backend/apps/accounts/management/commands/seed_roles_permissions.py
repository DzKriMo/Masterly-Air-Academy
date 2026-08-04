"""
Management command to seed 19 Django Groups with 98 permissions across 19 domains.
Maps directly to the architecture.md §7.3 RBAC matrix.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


# 19 domains with their actions → 98 total permissions
PERMISSION_DOMAINS = {
    'dashboard': ['view', 'view_reports'],
    'users': ['view', 'create', 'update', 'delete', 'manage'],
    'students': ['view', 'create', 'update', 'delete', 'manage', 'view_own'],
    'candidates': ['view', 'create', 'update', 'delete', 'manage', 'view_own'],
    'ground_training': ['view', 'create', 'update', 'delete', 'manage', 'view_own', 'evaluate'],
    'flight_training': ['view', 'create', 'update', 'delete', 'manage', 'view_own', 'evaluate'],
    'exams': ['view', 'create', 'update', 'delete', 'manage', 'view_own', 'grade'],
    'attendance': ['view', 'create', 'update', 'manage', 'view_own'],
    'documents': ['view', 'create', 'update', 'delete', 'manage', 'view_own'],
    'applications': ['view', 'create', 'update', 'manage', 'approve', 'view_own'],
    'fleet': ['view', 'create', 'update', 'delete', 'manage'],
    'schedule': ['view', 'create', 'update', 'delete', 'manage', 'view_own'],
    'finance': ['view', 'view_own', 'create', 'update', 'delete', 'manage', 'view_reports'],
    'invoicing': ['view', 'view_own', 'create', 'update', 'delete', 'manage'],
    'quality': ['view', 'create', 'update', 'delete', 'manage', 'approve'],
    'safety': ['view', 'create', 'update', 'delete', 'manage'],
    'audit_logs': ['view'],
    'academic_years': ['view', 'create', 'update', 'delete', 'manage'],
    'promotions': ['view', 'create', 'update', 'delete', 'manage'],
    'settings': ['view', 'manage'],
    'notifications': ['view', 'broadcast', 'manage'],
}

# 19 roles with their assigned permission domains + actions
ROLE_DEFINITIONS = {
    'system_admin': {
        'label': 'System Administrator',
        'permissions': 'ALL',
    },
    'director_general': {
        'label': 'Director General',
        'domains': {
            'dashboard': ['view', 'view_reports'],
            'students': ['view'], 'candidates': ['view'],
            'ground_training': ['view'], 'flight_training': ['view'],
            'exams': ['view'], 'documents': ['view'],
            'fleet': ['view'], 'schedule': ['view'],
            'finance': ['view', 'view_reports'], 'invoicing': ['view'],
            'quality': ['view'], 'safety': ['view'],
            'academic_years': ['view'], 'promotions': ['view'], 'settings': ['view'],
            'audit_logs': ['view'],
            'notifications': ['view', 'broadcast'],
        },
    },
    'head_of_training': {
        'label': 'Head of Training',
        'domains': {
            'dashboard': ['view'],
            'students': ['view', 'update'], 'candidates': ['view', 'update'],
            'ground_training': ['manage'],
            'flight_training': ['manage'],
            'exams': ['manage'],
            'attendance': ['manage'],
            'documents': ['view', 'update'],
            'applications': ['view', 'approve'],
            'fleet': ['view'],
            'schedule': ['manage'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'chief_ground_instructor': {
        'label': 'Chief Ground Instructor',
        'domains': {
            'dashboard': ['view'],
            'students': ['view'],
            'ground_training': ['manage'],
            'exams': ['view', 'create', 'update', 'grade'],
            'attendance': ['view', 'create', 'update'],
            'documents': ['view'],
            'schedule': ['view', 'update'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'ground_instructor': {
        'label': 'Ground Instructor',
        'domains': {
            'dashboard': ['view'],
            'students': ['view'],
            'ground_training': ['view_own', 'evaluate'],
            'exams': ['view', 'grade'],
            'attendance': ['view', 'create', 'update'],
            'schedule': ['view_own'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'chief_flight_instructor': {
        'label': 'Chief Flight Instructor',
        'domains': {
            'dashboard': ['view'],
            'students': ['view'],
            'ground_training': ['view'],
            'flight_training': ['manage'],
            'exams': ['view', 'create', 'update', 'grade'],
            'attendance': ['view', 'create', 'update'],
            'documents': ['view'],
            'fleet': ['view', 'update'],
            'schedule': ['view', 'update'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'flight_instructor': {
        'label': 'Flight Instructor',
        'domains': {
            'dashboard': ['view'],
            'students': ['view'],
            'ground_training': ['view'],
            'flight_training': ['view_own', 'evaluate'],
            'exams': ['view', 'grade'],
            'attendance': ['view', 'create', 'update'],
            'fleet': ['view'],
            'schedule': ['view_own'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'admin_responsible': {
        'label': 'Admin Responsible',
        'domains': {
            'dashboard': ['view'],
            'students': ['manage'], 'candidates': ['manage'],
            'documents': ['manage'],
            'applications': ['manage'],
            'academic_years': ['view'], 'promotions': ['view'],
            'audit_logs': ['view'],
            'notifications': ['view', 'broadcast'],
        },
    },
    'admin_agent': {
        'label': 'Admin Agent',
        'domains': {
            'dashboard': ['view'],
            'students': ['view', 'create', 'update'],
            'candidates': ['view', 'create', 'update'],
            'documents': ['view', 'create', 'update'],
            'applications': ['view', 'create', 'update'],
            'academic_years': ['view'], 'promotions': ['view'],
            'notifications': ['view', 'broadcast'],
        },
    },
    'finance_responsible': {
        'label': 'Finance Responsible',
        'domains': {
            'dashboard': ['view'],
            'students': ['view'],
            'finance': ['manage'],
            'invoicing': ['view', 'create', 'update', 'manage'],
            'documents': ['view'],
            'academic_years': ['view'], 'promotions': ['view'],
            'audit_logs': ['view'],
        },
    },
    'accounting_agent': {
        'label': 'Accounting Agent',
        'domains': {
            'dashboard': ['view'],
            'students': ['view'],
            'finance': ['view', 'create', 'update'],
            'invoicing': ['view', 'create', 'update'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'admissions_responsible': {
        'label': 'Admissions Responsible',
        'domains': {
            'dashboard': ['view'],
            'candidates': ['manage'],
            'applications': ['manage'],
            'students': ['view'],
            'documents': ['view', 'manage'],
            'academic_years': ['view'], 'promotions': ['view'],
        },
    },
    'quality_manager': {
        'label': 'Quality Manager',
        'domains': {
            'dashboard': ['view'],
            'quality': ['manage'],
            'safety': ['view', 'create', 'update'],
            'students': ['view'],
            'documents': ['view', 'create'],
            'ground_training': ['view'], 'flight_training': ['view'],
            'exams': ['view'],
            'academic_years': ['view'], 'promotions': ['view'],
            'audit_logs': ['view'],
            'notifications': ['view', 'broadcast'],
        },
    },
    'compliance_monitoring_manager': {
        'label': 'Compliance Monitoring Manager',
        'domains': {
            'dashboard': ['view'],
            'quality': ['view', 'create', 'update', 'approve'],
            'safety': ['view', 'create', 'update'],
            'documents': ['view'],
            'audit_logs': ['view'],
        },
    },
    'safety_manager': {
        'label': 'Safety Manager',
        'domains': {
            'dashboard': ['view'],
            'safety': ['manage'],
            'quality': ['view'],
            'documents': ['view', 'create'],
            'students': ['view'],
            'audit_logs': ['view'],
            'notifications': ['view', 'broadcast'],
        },
    },
    'training_admin': {
        'label': 'Training Administrator',
        'domains': {
            'dashboard': ['view'],
            'students': ['manage'], 'candidates': ['manage'],
            'ground_training': ['manage'],
            'flight_training': ['manage'],
            'exams': ['manage'],
            'attendance': ['manage'],
            'documents': ['view', 'create', 'update', 'delete'],
            'applications': ['manage'],
            'fleet': ['view'],
            'schedule': ['manage'],
            'academic_years': ['view'], 'promotions': ['view'],
            'users': ['view'],
            'invoices': ['view'],
        },
    },
    'scheduler': {
        'label': 'Scheduler',
        'domains': {
            'dashboard': ['view'],
            'schedule': ['manage'],
            'fleet': ['view', 'update'],
            'students': ['view'],
            'ground_training': ['view'], 'flight_training': ['view'],
            'academic_years': ['view'], 'promotions': ['view'],
            'documents': ['view'],
            'notifications': ['view', 'broadcast'],
        },
    },
    'student': {
        'label': 'Student',
        'domains': {
            'dashboard': ['view'],
            'students': ['view_own'],
            'ground_training': ['view', 'view_own'],
            'flight_training': ['view_own'],
            'exams': ['view', 'view_own'],
            'attendance': ['view_own'],
            'documents': ['view_own'],
            'schedule': ['view_own'],
            'academic_years': ['view'], 'promotions': ['view'],
            'invoicing': ['view_own'],
            'finance': ['view_own'],
        },
    },
    'candidate': {
        'label': 'Candidate',
        'domains': {
            'dashboard': ['view'],
            'candidates': ['view_own'],
            'documents': ['view_own'],
            'applications': ['view_own'],
        },
    },
    'graduate': {
        'label': 'Graduate',
        'domains': {
            'dashboard': ['view'],
            'documents': ['view_own'],
        },
    },
}


class Command(BaseCommand):
    help = 'Seed 19 Django Groups with 98 permissions across 19 domains'

    def handle(self, *args, **options):
        self._create_all_permissions()
        self._create_groups_and_assign()
        self._seed_exercises()

    def _create_all_permissions(self):
        """Create all 98 custom permissions as Django Permission objects."""
        content_type, _ = ContentType.objects.get_or_create(
            app_label='accounts',
            model='custompermission',
        )

        created_count = 0
        for domain, actions in PERMISSION_DOMAINS.items():
            for action in actions:
                codename = f'{domain}.{action}'
                perm, created = Permission.objects.get_or_create(
                    codename=codename,
                    defaults={
                        'name': f'{domain.replace("_", " ").title()} - {action.replace("_", " ").title()}',
                        'content_type': content_type,
                    },
                )
                if created:
                    created_count += 1

        self.stdout.write(f'Permissions: {created_count} created, '
                          f'{Permission.objects.count()} total')

    def _create_groups_and_assign(self):
        """Create 19 groups and assign permissions."""
        system_admin_group = None

        for role_name, config in ROLE_DEFINITIONS.items():
            group, created = Group.objects.get_or_create(name=role_name)

            if config.get('permissions') == 'ALL':
                # System admin gets ALL permissions
                all_perms = Permission.objects.all()
                group.permissions.set(all_perms)
                system_admin_group = group
                self.stdout.write(
                    f'  {role_name} ({config["label"]}): '
                    f'{all_perms.count()} permissions (ALL)'
                )
            else:
                # Assign specific domain permissions
                perm_codenames = []
                for domain, actions in config['domains'].items():
                    for action in actions:
                        perm_codenames.append(f'{domain}.{action}')

                perms = Permission.objects.filter(codename__in=perm_codenames)
                group.permissions.set(perms)
                self.stdout.write(
                    f'  {role_name} ({config["label"]}): '
                    f'{perms.count()} permissions'
                )

            if created:
                self.stdout.write(f'    → Group created')

        # Assign all users to their corresponding role groups
        from django.contrib.auth import get_user_model
        User = get_user_model()
        assigned = 0
        for user in User.objects.all():
            group = Group.objects.filter(name=user.role).first()
            if group and not user.groups.filter(id=group.id).exists():
                user.groups.add(group)
                assigned += 1
        if assigned:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n{assigned} users assigned to their role groups'
                )
            )

    def _seed_exercises(self):
        """Seed standard flight exercises if none exist."""
        from apps.flight_training.models import FlightExercise

        if FlightExercise.objects.exists():
            return

        exercises = [
            ('EX-TKF', 'Takeoff', 'إقلاع', 'Décollage', 'maneuver', None, 1),
            ('EX-LDG', 'Landing', 'هبوط', 'Atterrissage', 'maneuver', None, 2),
            ('EX-STP', 'Steep Turns', 'منعطفات حادة', 'Virages serrés', 'maneuver', None, 3),
            ('EX-STL', 'Slow Flight', 'طيران بطيء', 'Vol lent', 'maneuver', None, 4),
            ('EX-STL2', 'Stall Recovery', 'استعادة من الانهيار', 'Récupération décrochage', 'emergency', None, 5),
            ('EX-SPN', 'Spin Awareness', 'الوعي بالدوران', 'Sensibilisation vrille', 'emergency', None, 6),
            ('EX-ENG', 'Engine Failure', 'عطل المحرك', 'Panne moteur', 'emergency', None, 7),
            ('EX-FOR', 'Forced Landing', 'هبوط اضطراري', 'Atterrissage forcé', 'emergency', None, 8),
            ('EX-FIR', 'Fire Drill', 'تمرين حريق', 'Exercice incendie', 'emergency', None, 9),
            ('EX-PRE', 'Pre-flight Inspection', 'فحص ما قبل الطيران', 'Inspection pré-vol', 'procedure', None, 10),
            ('EX-CKL', 'Checklist Usage', 'استخدام قائمة الفحص', 'Utilisation checklist', 'procedure', None, 11),
            ('EX-RDO', 'Radio Communication', 'اتصالات لاسلكية', 'Communications radio', 'procedure', None, 12),
            ('EX-ATC', 'ATC Procedures', 'إجراءات المراقبة', 'Procédures ATC', 'procedure', None, 13),
            ('EX-CIR', 'Circuit Patterns', 'أنماط الدوران', 'Circuits piste', 'maneuver', None, 14),
            ('EX-XWD', 'Crosswind Landing', 'هبوط مع رياح جانبية', 'Atterrissage vent travers', 'maneuver', None, 15),
            ('EX-GLD', 'Glide Approach', 'اقتراب انزلاقي', 'Approche planée', 'maneuver', None, 16),
            ('EX-NAV', 'Visual Navigation', 'ملاحة بصرية', 'Navigation visuelle', 'navigation', None, 17),
            ('EX-IFR', 'IFR Procedures', 'إجراءات الطيران الآلي', 'Procédures IFR', 'navigation', 'IR', 18),
            ('EX-MEP', 'Asymmetric Flight', 'طيران غير متماثل', 'Vol asymétrique', 'emergency', 'MEP', 19),
            ('EX-MCC', 'Crew Coordination', 'تنسيق الطاقم', 'Coordination équipage', 'procedure', 'MCC', 20),
            ('EX-SLO', 'Solo Navigation', 'ملاحة فردية', 'Navigation solo', 'navigation', None, 21),
            ('EX-NGT', 'Night Flying', 'طيران ليلي', 'Vol de nuit', 'maneuver', None, 22),
            ('EX-ABR', 'Aborted Takeoff', 'إلغاء الإقلاع', 'Décollage interrompu', 'emergency', None, 23),
            ('EX-ILS', 'ILS Approach', 'اقتراب ILS', 'Approche ILS', 'navigation', 'IR', 24),
        ]

        created = 0
        for code, title, title_ar, title_fr, category, program, order in exercises:
            FlightExercise.objects.get_or_create(
                code=code,
                defaults={
                    'title': title, 'title_ar': title_ar, 'title_fr': title_fr,
                    'category': category, 'program': program, 'order': order,
                },
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f'{created} flight exercises seeded')
        )


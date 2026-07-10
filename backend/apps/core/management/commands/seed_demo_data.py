"""
Management command to seed demo data for testing.
Creates: students, instructors, subjects, aircraft, flights, etc.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo data for testing all portals'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # ── Academic Year ─────────────────────────────────
        from apps.core.models import AcademicYear
        ay, _ = AcademicYear.objects.get_or_create(
            name='2025-2026',
            defaults={'start_date': '2025-09-01', 'end_date': '2026-07-31', 'is_active': True},
        )

        # ── Students ──────────────────────────────────────
        from apps.students.models import Student
        students_data = [
            {'first_name': 'Ahmed', 'last_name': 'Benali', 'program': 'PPL', 'student_number': 'STU-001'},
            {'first_name': 'Fatima', 'last_name': 'Mansouri', 'program': 'CPL', 'student_number': 'STU-002'},
            {'first_name': 'Youssef', 'last_name': 'Tazi', 'program': 'IR', 'student_number': 'STU-003'},
            {'first_name': 'Amina', 'last_name': 'Alaoui', 'program': 'PPL', 'student_number': 'STU-004'},
            {'first_name': 'Omar', 'last_name': 'Chafik', 'program': 'CPL', 'student_number': 'STU-005'},
        ]
        students = []
        for data in students_data:
            user, _ = User.objects.get_or_create(
                email=f'{data["first_name"].lower()}@student.maa.dz',
                defaults={
                    'username': data['student_number'].lower(),
                    'role': 'student',
                    'status': 'active',
                    'is_active': True,
                },
            )
            user.set_password('student123')
            user.first_name = data['first_name']
            user.last_name = data['last_name']
            user.save()

            student, _ = Student.objects.get_or_create(
                student_number=data['student_number'],
                defaults={
                    'user': user,
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'date_of_birth': date(2000, 5, 15),
                    'nationality': 'Moroccan',
                    'phone': '+212600000000',
                    'enrollment_date': date.today(),
                    'program': data['program'],
                    'academic_year': ay,
                    'status': 'active',
                },
            )
            students.append(student)
            self.stdout.write(f'  Student: {student}')

        # ── Instructors ───────────────────────────────────
        from apps.students.models import GroundInstructor, FlightInstructor
        gi_user, _ = User.objects.get_or_create(
            email='gi@masterly-air-academy.dz',
            defaults={
                'username': 'gi_instructor',
                'role': 'ground_instructor',
                'status': 'active',
                'is_active': True,
                'first_name': 'Karim',
                'last_name': 'Bensaid',
            },
        )
        gi_user.set_password('instructor123')
        gi_user.save()
        gi, _ = GroundInstructor.objects.get_or_create(
            user=gi_user,
            defaults={
                'first_name': 'Karim',
                'last_name': 'Bensaid',
                'qualifications': ['Navigation', 'Meteorology'],
                'authorized_subjects': ['NAV-101', 'MET-201'],
                'hire_date': date(2020, 1, 15),
            },
        )

        fi_user, _ = User.objects.get_or_create(
            email='fi@masterly-air-academy.dz',
            defaults={
                'username': 'fi_instructor',
                'role': 'flight_instructor',
                'status': 'active',
                'is_active': True,
                'first_name': 'Hassan',
                'last_name': 'Ouazzani',
            },
        )
        fi_user.set_password('instructor123')
        fi_user.save()
        fi, _ = FlightInstructor.objects.get_or_create(
            user=fi_user,
            defaults={
                'first_name': 'Hassan',
                'last_name': 'Ouazzani',
                'license_number': 'ATPL-12345',
                'qualifications': ['PPL', 'CPL', 'IR'],
                'authorized_aircraft_types': ['C172', 'PA28'],
                'total_flight_hours': 3500,
                'instruction_hours': 1200,
                'hire_date': date(2019, 3, 1),
            },
        )
        self.stdout.write(f'  Instructor (FI): {fi}')
        self.stdout.write(f'  Instructor (GI): {gi}')

        # ── Aircraft ──────────────────────────────────────
        from apps.flight_training.models import Aircraft
        aircraft_data = [
            {'registration': 'CN-TAA', 'manufacturer': 'Cessna', 'model': 'C172S', 'airframe_hours': 4520},
            {'registration': 'CN-TAB', 'manufacturer': 'Piper', 'model': 'PA28-181', 'airframe_hours': 3800},
            {'registration': 'CN-TAC', 'manufacturer': 'Diamond', 'model': 'DA40', 'airframe_hours': 2100},
        ]
        aircraft_list = []
        for ad in aircraft_data:
            ac, _ = Aircraft.objects.get_or_create(
                registration=ad['registration'],
                defaults={
                    'manufacturer': ad['manufacturer'],
                    'model': ad['model'],
                    'airframe_hours': ad['airframe_hours'],
                    'engine_hours': ad['airframe_hours'],
                    'status': 'available',
                    'next_maintenance': timezone.now() + timedelta(days=30),
                },
            )
            aircraft_list.append(ac)
            self.stdout.write(f'  Aircraft: {ac}')

        # ── Subjects ──────────────────────────────────────
        from apps.ground_training.models import Subject
        subjects_data = [
            {'code': 'NAV-101', 'title': 'Principles of Navigation', 'hours': 60, 'program': 'PPL'},
            {'code': 'MET-201', 'title': 'Aviation Meteorology', 'hours': 45, 'program': 'PPL'},
            {'code': 'REG-301', 'title': 'Air Law & Regulations', 'hours': 40, 'program': 'CPL'},
        ]
        for sd in subjects_data:
            subject, _ = Subject.objects.get_or_create(
                code=sd['code'],
                defaults={
                    'title_en': sd['title'],
                    'title_fr': sd['title'],
                    'title_ar': sd['title'],
                    'total_hours': sd['hours'],
                    'program': sd['program'],
                    'academic_year': ay,
                    'status': 'active',
                },
            )
            self.stdout.write(f'  Subject: {subject}')

        # ── Modules ─────────────────────────────────────
        from apps.ground_training.models import Module, Room, Course, CourseEnrollment
        nav = Subject.objects.get(code='NAV-101')
        Module.objects.get_or_create(subject=nav, title='Earth and Navigation', duration=15, order=1, defaults={'status': 'active'})
        Module.objects.get_or_create(subject=nav, title='Charts and Publications', duration=15, order=2, defaults={'status': 'active'})
        Module.objects.get_or_create(subject=nav, title='Flight Planning', duration=20, order=3, defaults={'status': 'active'})
        Module.objects.get_or_create(subject=nav, title='Radio Navigation', duration=10, order=4, defaults={'status': 'active'})

        met = Subject.objects.get(code='MET-201')
        Module.objects.get_or_create(subject=met, title='Atmosphere and Pressure', duration=12, order=1, defaults={'status': 'active'})
        Module.objects.get_or_create(subject=met, title='Clouds and Precipitation', duration=12, order=2, defaults={'status': 'active'})
        Module.objects.get_or_create(subject=met, title='Weather Hazards', duration=10, order=3, defaults={'status': 'active'})
        Module.objects.get_or_create(subject=met, title='METAR and TAF', duration=11, order=4, defaults={'status': 'active'})
        self.stdout.write(f'  Modules: 8 created (NAV + MET)')

        # ── Rooms ───────────────────────────────────────
        room1, _ = Room.objects.get_or_create(name='Classroom A', defaults={'capacity': 25, 'location': 'Ground Floor'})
        room2, _ = Room.objects.get_or_create(name='Classroom B', defaults={'capacity': 15, 'location': 'First Floor'})
        self.stdout.write(f'  Rooms: {room1}, {room2}')

        # ── Courses ─────────────────────────────────────
        today = date.today()
        course1, _ = Course.objects.get_or_create(
            subject=nav, instructor=gi, academic_year=ay, title='Navigation Basics',
            scheduled_date=today, start_time='09:00', end_time='11:00',
            defaults={'room': room1, 'status': 'scheduled'},
        )
        course2, _ = Course.objects.get_or_create(
            subject=met, instructor=gi, academic_year=ay, title='Weather Fundamentals',
            scheduled_date=today + timedelta(days=1), start_time='10:00', end_time='12:00',
            defaults={'room': room2, 'status': 'scheduled'},
        )
        self.stdout.write(f'  Courses: {course1}, {course2}')

        # ── Enrollments ─────────────────────────────────
        for s in students:
            CourseEnrollment.objects.get_or_create(student=s, course=course1)
            CourseEnrollment.objects.get_or_create(student=s, course=course2)
        self.stdout.write(f'  Enrollments: {CourseEnrollment.objects.count()} created')

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo data seeded: {len(students)} students, 2 instructors, '
            f'{len(aircraft_list)} aircraft, 3 subjects, 8 modules, 2 rooms, 2 courses'
        ))

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
            from django.contrib.auth.models import Group
            student_group = Group.objects.filter(name='student').first()
            if student_group:
                user.groups.add(student_group)

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
        from django.contrib.auth.models import Group
        gi_group = Group.objects.filter(name='ground_instructor').first()
        if gi_group:
            gi_user.groups.add(gi_group)

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
        from django.contrib.auth.models import Group
        fi_group = Group.objects.filter(name='flight_instructor').first()
        if fi_group:
            fi_user.groups.add(fi_group)

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

        # ── Flight Lessons ───────────────────────────────
        from apps.flight_training.models import FlightLesson
        from django.utils import timezone as tz
        now = tz.now()
        flight1, _ = FlightLesson.objects.get_or_create(
            student=students[0], instructor=fi, aircraft=aircraft_list[0],
            scheduled_date=today,
            defaults={'start_time': now.replace(hour=14, minute=0), 'end_time': now.replace(hour=15, minute=30), 'status': 'scheduled'},
        )
        flight2, _ = FlightLesson.objects.get_or_create(
            student=students[1], instructor=fi, aircraft=aircraft_list[1],
            scheduled_date=today - timedelta(days=1),
            defaults={'start_time': now.replace(hour=9, minute=0) - timedelta(days=1),
                      'end_time': now.replace(hour=10, minute=30) - timedelta(days=1),
                      'status': 'completed', 'flight_duration': 1.5, 'grade': 8.5, 'result': 'passed'},
        )
        flight3, _ = FlightLesson.objects.get_or_create(
            student=students[2], instructor=fi, aircraft=aircraft_list[0],
            scheduled_date=today + timedelta(days=2),
            defaults={'start_time': now.replace(hour=10, minute=0) + timedelta(days=2),
                      'end_time': now.replace(hour=11, minute=30) + timedelta(days=2), 'status': 'scheduled'},
        )
        self.stdout.write(f'  Flights: 3 created (1 completed, 2 scheduled)')

        # ── Exam Questions ───────────────────────────────
        from apps.exams.models import QuestionBank, Exam
        questions_data = [
            {'question': 'What is the standard altimeter setting above transition altitude?', 'options': ['QNH', 'QFE', '1013.25 hPa', '29.92 inHg'], 'answer': '1013.25 hPa'},
            {'question': 'What does VFR stand for?', 'options': ['Visual Flight Rules', 'Variable Frequency Radio', 'Vertical Flight Reference', 'Visual Frequency Range'], 'answer': 'Visual Flight Rules'},
            {'question': 'The four forces acting on an aircraft in flight are:', 'options': ['Lift, Weight, Thrust, Drag', 'Lift, Gravity, Power, Friction', 'Speed, Altitude, Heading, Position', 'Pitch, Roll, Yaw, Thrust'], 'answer': 'Lift, Weight, Thrust, Drag'},
            {'question': 'What is Vne?', 'options': ['Never Exceed Speed', 'Normal Operating Speed', 'Best Rate of Climb Speed', 'Stall Speed'], 'answer': 'Never Exceed Speed'},
            {'question': 'Carburetor icing is most likely to occur at:', 'options': ['High power settings', 'Low power settings during descent', 'Cruise altitude', 'Takeoff'], 'answer': 'Low power settings during descent'},
            {'question': 'What color is the port (left) navigation light?', 'options': ['Green', 'Red', 'White', 'Blue'], 'answer': 'Red'},
        ]
        for qd in questions_data:
            QuestionBank.objects.get_or_create(
                question_text=qd['question'],
                defaults={
                    'subject': nav, 'question_type': 'multiple_choice',
                    'options': qd['options'], 'correct_answer': qd['answer'],
                    'difficulty': 'medium',
                },
            )
        self.stdout.write(f'  Questions: {QuestionBank.objects.count()} created')

        # ── Exam ─────────────────────────────────────────
        exam, _ = Exam.objects.get_or_create(
            code='NAV-PPL-01',
            defaults={
                'title': 'Navigation Theory Exam',
                'subject': nav, 'program': 'PPL', 'type': 'theory',
                'duration': 30, 'question_count': 6, 'passing_grade': 70,
                'max_attempts': 3, 'status': 'published',
            },
        )
        self.stdout.write(f'  Exam: {exam.code}')

        # ── Invoices ─────────────────────────────────────
        from apps.administration.models import Invoice, Payment
        inv1, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0001', student=students[0],
            defaults={'type': 'tuition', 'description': 'PPL Program - Semester 1', 'amount': 45000, 'currency': 'MAD', 'status': 'paid', 'issued_at': timezone.now(), 'due_at': timezone.now() + timedelta(days=30)},
        )
        inv2, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0002', student=students[1],
            defaults={'type': 'tuition', 'description': 'CPL Program - Semester 1', 'amount': 75000, 'currency': 'MAD', 'status': 'issued', 'issued_at': timezone.now(), 'due_at': timezone.now() + timedelta(days=30)},
        )
        inv3, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0003', student=students[0],
            defaults={'type': 'flight_hours', 'description': 'Additional Flight Hours - 10h', 'amount': 15000, 'currency': 'MAD', 'status': 'overdue', 'issued_at': timezone.now() - timedelta(days=60), 'due_at': timezone.now() - timedelta(days=30)},
        )
        Payment.objects.get_or_create(invoice=inv1, student=students[0], defaults={'amount': 45000, 'currency': 'MAD', 'method': 'bank_transfer', 'reference': 'TRF-001'})
        Payment.objects.get_or_create(invoice=inv2, student=students[1], defaults={'amount': 30000, 'currency': 'MAD', 'method': 'cash', 'reference': 'CSH-001'})
        self.stdout.write(f'  Invoices: 3 created, 2 payments recorded')

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo data seeded: {len(students)} students, 2 instructors, '
            f'{len(aircraft_list)} aircraft, 3 subjects, 8 modules, 2 rooms, 2 courses, 3 flights'
        ))

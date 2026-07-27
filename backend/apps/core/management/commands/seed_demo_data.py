"""
Management command to seed comprehensive demo data.
Creates fully populated portals as if data were entered manually.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from datetime import date, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed comprehensive demo data for all portals'

    def handle(self, *args, **options):
        self.stdout.write('Seeding comprehensive demo data...')
        now = timezone.now()
        today = date.today()

        # ── Academic Year ─────────────────────────────────
        from apps.core.models import AcademicYear
        ay, _ = AcademicYear.objects.get_or_create(
            name='2025-2026',
            defaults={
                'start_date': '2025-09-01', 'end_date': '2026-07-31',
                'is_active': True,
            },
        )

        # ── Ensure admin exists ───────────────────────────
        admin, _ = User.objects.get_or_create(
            email='admin@masterly-air-academy.dz',
            defaults={
                'username': 'admin', 'role': 'system_admin',
                'status': 'active', 'is_active': True,
                'first_name': 'System', 'last_name': 'Admin',
            },
        )
        admin.set_password('Admin@2026')
        admin.save()
        g = Group.objects.filter(name='system_admin').first()
        if g: admin.groups.add(g)

        # ── Ensure special accounts exist ─────────────────
        specials = [
            ('director@masterly-air-academy.dz', 'director123', 'director_general', 'Director', 'General'),
            ('finance@masterly-air-academy.dz', 'finance123', 'finance_responsible', 'Finance', 'Manager'),
            ('quality@masterly-air-academy.dz', 'quality123', 'quality_manager', 'Quality', 'Manager'),
            ('scheduler@masterly-air-academy.dz', 'scheduler123', 'scheduler', 'Scheduler', 'User'),
        ]
        for email, pw, role, fn, ln in specials:
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': role, 'role': role,
                    'status': 'active', 'is_active': True,
                    'first_name': fn, 'last_name': ln,
                },
            )
            u.set_password(pw)
            u.save()
            g = Group.objects.filter(name=role).first()
            if g: u.groups.add(g)

        # ── Students ──────────────────────────────────────
        from apps.students.models import Student
        students_data = [
            {'first_name': 'Ahmed', 'last_name': 'Benali', 'program': 'PPL', 'student_number': 'STU-001', 'email': 'ahmed@student.maa.dz'},
            {'first_name': 'Fatima', 'last_name': 'Mansouri', 'program': 'CPL', 'student_number': 'STU-002', 'email': 'fatima@student.maa.dz'},
            {'first_name': 'Youssef', 'last_name': 'Tazi', 'program': 'IR', 'student_number': 'STU-003', 'email': 'youssef@student.maa.dz'},
            {'first_name': 'Amina', 'last_name': 'Alaoui', 'program': 'PPL', 'student_number': 'STU-004', 'email': 'amina@student.maa.dz'},
            {'first_name': 'Omar', 'last_name': 'Chafik', 'program': 'CPL', 'student_number': 'STU-005', 'email': 'omar@student.maa.dz'},
        ]
        students = []
        for d in students_data:
            user, _ = User.objects.get_or_create(
                email=d['email'],
                defaults={
                    'username': d['student_number'].lower(),
                    'role': 'student', 'status': 'active',
                    'is_active': True,
                },
            )
            user.set_password('student123')
            user.first_name = d['first_name']
            user.last_name = d['last_name']
            user.save()
            sg = Group.objects.filter(name='student').first()
            if sg: user.groups.add(sg)

            student, _ = Student.objects.get_or_create(
                student_number=d['student_number'],
                defaults={
                    'user': user,
                    'first_name': d['first_name'],
                    'last_name': d['last_name'],
                    'date_of_birth': date(2000, 5, 15),
                    'nationality': 'Moroccan',
                    'phone': '+212600000000',
                    'enrollment_date': today - timedelta(days=90),
                    'program': d['program'],
                    'academic_year': ay,
                    'status': 'active',
                },
            )
            students.append(student)

        # ── Instructors ───────────────────────────────────
        from apps.students.models import GroundInstructor, FlightInstructor
        gi_user, _ = User.objects.get_or_create(
            email='gi@masterly-air-academy.dz',
            defaults={
                'username': 'gi_instructor', 'role': 'ground_instructor',
                'status': 'active', 'is_active': True,
                'first_name': 'Karim', 'last_name': 'Bensaid',
            },
        )
        gi_user.set_password('instructor123')
        gi_user.save()
        gig = Group.objects.filter(name='ground_instructor').first()
        if gig: gi_user.groups.add(gig)

        gi, _ = GroundInstructor.objects.get_or_create(
            user=gi_user,
            defaults={
                'first_name': 'Karim', 'last_name': 'Bensaid',
                'qualifications': ['Navigation', 'Meteorology'],
                'authorized_subjects': ['NAV-101', 'MET-201'],
                'hire_date': date(2020, 1, 15),
            },
        )

        fi_user, _ = User.objects.get_or_create(
            email='fi@masterly-air-academy.dz',
            defaults={
                'username': 'fi_instructor', 'role': 'flight_instructor',
                'status': 'active', 'is_active': True,
                'first_name': 'Hassan', 'last_name': 'Ouazzani',
            },
        )
        fi_user.set_password('instructor123')
        fi_user.save()
        fig = Group.objects.filter(name='flight_instructor').first()
        if fig: fi_user.groups.add(fig)

        fi, _ = FlightInstructor.objects.get_or_create(
            user=fi_user,
            defaults={
                'first_name': 'Hassan', 'last_name': 'Ouazzani',
                'license_number': 'ATPL-12345',
                'qualifications': ['PPL', 'CPL', 'IR'],
                'authorized_aircraft_types': ['C172', 'PA28'],
                'total_flight_hours': 3500,
                'instruction_hours': 1200,
                'hire_date': date(2019, 3, 1),
            },
        )

        # Assign main_instructor (Hassan to Ahmed, Fatima, Youssef; None for others)
        for s in students[:3]:
            Student.objects.filter(id=s.id).update(main_instructor=fi)

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
                    'next_maintenance': now + timedelta(days=60),
                },
            )
            aircraft_list.append(ac)

        # ── Subjects ──────────────────────────────────────
        from apps.ground_training.models import Subject
        subjects_data = [
            {'code': 'NAV-101', 'title': 'Principles of Navigation', 'hours': 60, 'program': 'PPL'},
            {'code': 'MET-201', 'title': 'Aviation Meteorology', 'hours': 45, 'program': 'PPL'},
            {'code': 'REG-301', 'title': 'Air Law & Regulations', 'hours': 40, 'program': 'CPL'},
        ]
        subjects = []
        for sd in subjects_data:
            subj, _ = Subject.objects.get_or_create(
                code=sd['code'],
                defaults={
                    'title_en': sd['title'],
                    'title_fr': sd['title'],
                    'title_ar': sd['title'],
                    'description_en': f'Comprehensive course on {sd["title"].lower()}.',
                    'total_hours': sd['hours'],
                    'program': sd['program'],
                    'academic_year': ay,
                    'status': 'active',
                },
            )
            subjects.append(subj)

        nav, met, reg = subjects

        # ── Modules ───────────────────────────────────────
        from apps.ground_training.models import Module, Room, Course, CourseEnrollment
        modules_created = 0
        for subj, module_list in [
            (nav, [
                ('Earth and Navigation', 15, 1),
                ('Charts and Publications', 15, 2),
                ('Flight Planning', 20, 3),
                ('Radio Navigation', 10, 4),
            ]),
            (met, [
                ('Atmosphere and Pressure', 12, 1),
                ('Clouds and Precipitation', 12, 2),
                ('Weather Hazards', 10, 3),
                ('METAR and TAF', 11, 4),
            ]),
            (reg, [
                ('Chicago Convention', 10, 1),
                ('ICAO Annexes', 10, 2),
                ('National Regulations', 10, 3),
                ('Licensing Requirements', 10, 4),
            ]),
        ]:
            for title, duration, order in module_list:
                Module.objects.get_or_create(
                    subject=subj, title=title, order=order,
                    defaults={'duration': duration, 'status': 'active'},
                )
                modules_created += 1

        # ── Module Lessons (content) ──────────────────────
        from apps.ground_training.models import ModuleLesson
        for module in Module.objects.all():
            ModuleLesson.objects.get_or_create(
                module=module, lesson_no=1,
                defaults={
                    'title': f'Introduction to {module.title}',
                    'content': f'# {module.title}\n\nThis is the introductory lesson for {module.title}. Students will learn the fundamental concepts and principles.',
                },
            )
            ModuleLesson.objects.get_or_create(
                module=module, lesson_no=2,
                defaults={
                    'title': f'Advanced {module.title}',
                    'content': f'# Advanced {module.title}\n\nBuilding on the introduction, this lesson covers advanced topics in {module.title}.',
                },
            )

        # ── Rooms ─────────────────────────────────────────
        room1, _ = Room.objects.get_or_create(name='Classroom A', defaults={'capacity': 25, 'location': 'Ground Floor', 'status': 'available'})
        room2, _ = Room.objects.get_or_create(name='Classroom B', defaults={'capacity': 15, 'location': 'First Floor', 'status': 'available'})

        # ── Courses (past + present) ──────────────────────
        course1, _ = Course.objects.get_or_create(
            subject=nav, instructor=gi, academic_year=ay, title='Navigation Basics',
            scheduled_date=today - timedelta(days=30), start_time='09:00', end_time='11:00',
            defaults={'room': room1, 'status': 'completed'},
        )
        course2, _ = Course.objects.get_or_create(
            subject=met, instructor=gi, academic_year=ay, title='Weather Fundamentals',
            scheduled_date=today - timedelta(days=28), start_time='10:00', end_time='12:00',
            defaults={'room': room2, 'status': 'completed'},
        )
        course3, _ = Course.objects.get_or_create(
            subject=nav, instructor=gi, academic_year=ay, title='Advanced Navigation',
            scheduled_date=today + timedelta(days=7), start_time='09:00', end_time='12:00',
            defaults={'room': room1, 'status': 'scheduled'},
        )

        # ── Enroll all students in all courses ───────────
        for c in [course1, course2, course3]:
            for s in students:
                CourseEnrollment.objects.get_or_create(student=s, course=c)

        # ── Attendance ────────────────────────────────────
        from apps.ground_training.models import AttendanceRecord
        for s in students[:3]:
            for course, status in [(course1, 'present'), (course2, 'present')]:
                AttendanceRecord.objects.get_or_create(
                    student=s, course=course, date=course.scheduled_date,
                    defaults={'status': status},
                )
        # One student absent for course1
        AttendanceRecord.objects.update_or_create(
            student=students[3], course=course1, date=course1.scheduled_date,
            defaults={'status': 'absent'},
        )

        # ── Ground Evaluations ───────────────────────────
        from apps.ground_training.models import GroundEvaluation
        for s in students[:3]:
            GroundEvaluation.objects.get_or_create(
                student=s, course=course1,
                defaults={
                    'score': random.choice([75, 82, 88, 91, 95]),
                    'status': 'completed',
                    'feedback': 'Good understanding of basic navigation concepts.',
                    'flagged': False,
                },
            )
        # Ahmed also has a MET evaluation
        GroundEvaluation.objects.get_or_create(
            student=students[0], course=course2,
            defaults={
                'score': 90, 'status': 'completed',
                'feedback': 'Excellent understanding of weather principles.',
                'flagged': False,
            },
        )

        # ── Flight Lessons ───────────────────────────────
        from apps.flight_training.models import FlightLesson, FlightPreparation

        # Ahmed: 1 completed, 2 scheduled
        ahmed_flight_completed, _ = FlightLesson.objects.get_or_create(
            student=students[0], instructor=fi, aircraft=aircraft_list[0],
            scheduled_date=today - timedelta(days=14),
            defaults={
                'start_time': now - timedelta(days=14, hours=-14),
                'end_time': now - timedelta(days=14, hours=-15, minutes=-30),
                'status': 'completed',
                'flight_duration': 1.5, 'grade': 85, 'result': 'passed',
                'exercises_completed': ['Steep turns', 'Stall recovery', 'Forced landing'],
                'competencies_acquired': ['Aircraft handling', 'Emergency procedures'],
                'difficulties': 'None',
                'observations': 'Good progress, confident in stall recovery.',
            },
        )
        ahmed_flight_upcoming_1, _ = FlightLesson.objects.get_or_create(
            student=students[0], instructor=fi, aircraft=aircraft_list[0],
            scheduled_date=today + timedelta(days=2),
            defaults={
                'start_time': now + timedelta(days=2, hours=14),
                'end_time': now + timedelta(days=2, hours=15, minutes=30),
                'status': 'scheduled',
            },
        )
        ahmed_flight_upcoming_2, _ = FlightLesson.objects.get_or_create(
            student=students[0], instructor=fi, aircraft=aircraft_list[1],
            scheduled_date=today + timedelta(days=5),
            defaults={
                'start_time': now + timedelta(days=5, hours=9),
                'end_time': now + timedelta(days=5, hours=10, minutes=30),
                'status': 'scheduled',
            },
        )

        # Fatima: 1 completed
        FlightLesson.objects.get_or_create(
            student=students[1], instructor=fi, aircraft=aircraft_list[1],
            scheduled_date=today - timedelta(days=7),
            defaults={
                'start_time': now - timedelta(days=7, hours=-9),
                'end_time': now - timedelta(days=7, hours=-10, minutes=-30),
                'status': 'completed', 'flight_duration': 1.5, 'grade': 78,
                'result': 'passed',
                'exercises_completed': ['Navigation exercise', 'Radio communication'],
                'competencies_acquired': ['Navigation', 'Radio procedures'],
            },
        )

        # Youssef: 1 scheduled
        FlightLesson.objects.get_or_create(
            student=students[2], instructor=fi, aircraft=aircraft_list[0],
            scheduled_date=today + timedelta(days=3),
            defaults={
                'start_time': now + timedelta(days=3, hours=10),
                'end_time': now + timedelta(days=3, hours=11, minutes=30),
                'status': 'scheduled',
            },
        )

        # Amina and Omar each get 1 scheduled
        for student in students[3:5]:
            FlightLesson.objects.get_or_create(
                student=student, instructor=fi, aircraft=aircraft_list[2],
                scheduled_date=today + timedelta(days=10),
                defaults={
                    'start_time': now + timedelta(days=10, hours=14),
                    'end_time': now + timedelta(days=10, hours=15, minutes=30),
                    'status': 'scheduled',
                },
            )

        # ── Flight Preparation for Ahmed's completed flight ─
        FlightPreparation.objects.get_or_create(
            flight_lesson=ahmed_flight_completed,
            defaults={
                'pre_flight_completed': True,
                'weather_checked': True,
                'notam_checked': True,
                'weight_balance_computed': True,
                'fuel_required': 80,
                'fuel_loaded': 85,
                'notes': 'All checks completed. Aircraft serviceable.',
                'signed_by_student': True,
                'signed_by_instructor': True,
            },
        )

        # ── Exam Questions ───────────────────────────────
        from apps.exams.models import QuestionBank
        questions_by_subject = {
            nav: [
                ('What is the standard altimeter setting above transition altitude?', '1013.25 hPa'),
                ('What does VFR stand for?', 'Visual Flight Rules'),
                ('The four forces acting on an aircraft in flight are:', 'Lift, Weight, Thrust, Drag'),
                ('What is Vne?', 'Never Exceed Speed'),
                ('What does QNH represent?', 'Altitude above mean sea level'),
                ('What is the difference between true and magnetic north?', 'Variation'),
                ('What is a great circle route?', 'Shortest distance between two points on a sphere'),
                ('What type of compass is used in light aircraft?', 'Whiskey compass'),
            ],
            met: [
                ('What is the standard lapse rate in the troposphere?', '1.98°C per 1000 ft'),
                ('What is the definition of a front?', 'Boundary between two air masses'),
                ('What does METAR stand for?', 'Meteorological Aerodrome Report'),
                ('What is the most severe type of icing?', 'Clear ice'),
                ('What is visibility measured in?', 'Meters or statute miles'),
                ('What causes a sea breeze?', 'Temperature difference between land and sea'),
            ],
            reg: [
                ('What is the minimum age for a PPL?', '17 years'),
                ('How often must a Class 1 medical be renewed?', 'Every 12 months'),
                ('What document must be carried on all flights?', 'Flight authorization'),
                ('What is the maximum flight time without a break?', '8 hours'),
            ],
        }
        for subj, qs in questions_by_subject.items():
            options_pool = [
                ['1013.25 hPa', 'QNH', 'QFE', '29.92 inHg'],
                ['Visual Flight Rules', 'Variable Frequency Radio', 'Vertical Flight Reference', 'Visual Frequency Range'],
                ['Lift, Weight, Thrust, Drag', 'Lift, Gravity, Power, Friction', 'Speed, Altitude, Heading, Position', 'Pitch, Roll, Yaw, Thrust'],
                ['Never Exceed Speed', 'Normal Operating Speed', 'Best Rate of Climb Speed', 'Stall Speed'],
                ['Altitude above mean sea level', 'Height above aerodrome', 'Pressure altitude', 'Density altitude'],
                ['Variation', 'Deviation', 'Inclination', 'Dip'],
                ['Shortest distance between two points on a sphere', 'Straight line on a map', 'The equator', 'Line of constant bearing'],
                ['Whiskey compass', 'Gyro compass', 'Flux gate compass', 'GPS compass'],
                ['1.98°C per 1000 ft', '3°C per 1000 ft', '2.5°C per 1000 ft', '1.5°C per 1000 ft'],
                ['Boundary between two air masses', 'Area of high pressure', 'Line of thunderstorms', 'Cold air pool'],
                ['Meteorological Aerodrome Report', 'Manual Environmental Tracking Report', 'Measured Altitude Reading', 'Morning Temperature Report'],
                ['Clear ice', 'Rime ice', 'Mixed ice', 'Frost'],
                ['Meters or statute miles', 'Kilometers only', 'Nautical miles', 'Feet'],
                ['Temperature difference between land and sea', 'Wind', 'Coriolis effect', 'Tides'],
                ['17 years', '16 years', '18 years', '21 years'],
                ['Every 12 months', 'Every 6 months', 'Every 24 months', 'Every 36 months'],
                ['Flight authorization', 'Passport', 'Medical certificate only', 'Logbook'],
                ['8 hours', '6 hours', '10 hours', '12 hours'],
            ]
            for idx, (qt, ans) in enumerate(qs):
                opts = options_pool[idx] if idx < len(options_pool) else ['Option A', 'Option B', 'Option C', ans]
                QuestionBank.objects.get_or_create(
                    question_text=qt,
                    defaults={
                        'subject': subj,
                        'question_type': 'multiple_choice',
                        'options': opts,
                        'correct_answer': ans,
                        'difficulty': 'easy' if idx < 3 else 'medium',
                    },
                )

        # ── Exam ─────────────────────────────────────────
        from apps.exams.models import Exam, ExamAttempt, Certificate
        exam, _ = Exam.objects.get_or_create(
            code='NAV-PPL-01',
            defaults={
                'title': 'Navigation Theory Exam',
                'subject': nav, 'program': 'PPL', 'type': 'theory',
                'duration': 30, 'question_count': 6, 'passing_grade': 70,
                'max_attempts': 3, 'status': 'published',
            },
        )

        # Ahmed passed the exam
        qs_list = list(QuestionBank.objects.filter(subject=nav)[:6])
        attempt, created = ExamAttempt.objects.get_or_create(
            exam=exam, student=students[0], attempt=1,
            defaults={
                'score': 85, 'is_passed': True,
                'started_at': now - timedelta(days=20),
                'completed_at': now - timedelta(days=20, hours=-1),
                'answers': {str(i): {'selected': q.correct_answer, 'correct': True} for i, q in enumerate(qs_list)},
            },
        )
        if created:
            Certificate.objects.get_or_create(
                student=students[0],
                defaults={
                    'type': 'theory', 'program': 'PPL',
                    'title': 'NAV-PPL-01 - Passed',
                    'issued_date': now - timedelta(days=20),
                    'certificate_number': 'CERT-2026-001',
                    'status': 'issued',
                },
            )

        # Fatima attempted but hasn't passed yet
        ExamAttempt.objects.get_or_create(
            exam=exam, student=students[1], attempt=1,
            defaults={
                'score': 55, 'is_passed': False,
                'started_at': now - timedelta(days=15),
                'completed_at': now - timedelta(days=15, hours=-1),
                'answers': {},
            },
        )

        # ── Quiz + Module Exercises ──────────────────────
        from apps.exams.models import Quiz, QuizAttempt
        nav_module = Module.objects.filter(subject=nav, order=1).first()
        if nav_module:
            quiz, _ = Quiz.objects.get_or_create(
                title='Navigation Basics Quiz', module=nav_module,
                defaults={'duration': 15, 'max_attempts': 3, 'passing_grade': 70},
            )
            QuizAttempt.objects.get_or_create(
                quiz=quiz, student=students[0],
                defaults={'score': 90, 'completed_at': now - timedelta(days=25)},
            )

        from apps.ground_training.models import ModuleExercise
        for module in Module.objects.all()[:2]:
            ModuleExercise.objects.get_or_create(
                module=module, title=f'{module.title} - Exercise 1',
                defaults={
                    'description': 'Complete the following questions based on the lesson material.',
                    'exercise_type': 'homework',
                    'max_score': 100,
                },
            )

        # ── Progress Check for Ahmed (completed) ─────────
        from apps.exams.models import ProgressCheck, SkillTest, PracticalEvaluation
        ProgressCheck.objects.get_or_create(
            student=students[0], examiner=fi,
            scheduled_date=today - timedelta(days=5),
            defaults={
                'status': 'completed', 'result': 'satisfactory',
                'completed_date': now - timedelta(days=5),
                'observations': 'Ahmed demonstrates good understanding of flight maneuvers.',
                'lessons_to_repeat': [],
            },
        )

        # ── Skill Test for Ahmed (authorized) ────────────
        SkillTest.objects.get_or_create(
            student=students[0], examiner=fi,
            scheduled_date=today + timedelta(days=15),
            defaults={
                'status': 'authorized', 'authorized_by': fi,
            },
        )

        # ── Practical Evaluation for Ahmed ───────────────
        PracticalEvaluation.objects.get_or_create(
            student=students[0], instructor=fi,
            defaults={
                'status': 'completed', 'result': 'passed',
                'grade': 88, 'completed_date': now - timedelta(days=10),
                'feedback': 'Competent pilot with good decision-making skills.',
            },
        )

        # ── Medical Certificate for Ahmed ────────────────
        from apps.students.models import MedicalCertificate
        MedicalCertificate.objects.get_or_create(
            student=students[0], type='class1',
            defaults={
                'issued_date': today - timedelta(days=60),
                'expiry_date': today + timedelta(days=300),
                'status': 'valid',
                'issued_by': 'Dr. Mohamed Alami',
                'notes': 'No restrictions.',
            },
        )

        # ── Documents for Ahmed ──────────────────────────
        from apps.administration.models import Document
        Document.objects.get_or_create(
            name='Enrollment Contract.pdf', student=students[0],
            defaults={
                'type': 'contract', 'category': 'enrollment',
                'file_url': '/media/documents/sample_contract.pdf',
                'uploaded_by': admin,
                'status': 'active',
            },
        )
        Document.objects.get_or_create(
            name='PPL Syllabus.pdf', student=students[0],
            defaults={
                'type': 'syllabus', 'category': 'training',
                'file_url': '/media/documents/ppl_syllabus.pdf',
                'uploaded_by': admin,
                'status': 'active',
            },
        )

        # ── Invoices ─────────────────────────────────────
        from apps.administration.models import Invoice, Payment, Contract
        inv1, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0001', student=students[0],
            defaults={
                'type': 'tuition', 'description': 'PPL Program - Semester 1',
                'amount': 45000, 'currency': 'DZD',
                'status': 'paid',
                'issued_at': now - timedelta(days=90),
                'due_at': now - timedelta(days=60),
            },
        )
        Payment.objects.get_or_create(
            invoice=inv1, student=students[0],
            defaults={
                'amount': 45000, 'currency': 'DZD',
                'method': 'bank_transfer', 'reference': 'TRF-2026-001',
                'paid_at': now - timedelta(days=85),
            },
        )

        Invoice.objects.get_or_create(
            invoice_number='INV-2026-0003', student=students[0],
            defaults={
                'type': 'flight_hours', 'description': 'Additional Flight Hours - 10h',
                'amount': 15000, 'currency': 'DZD',
                'status': 'overdue',
                'issued_at': now - timedelta(days=60),
                'due_at': now - timedelta(days=30),
            },
        )

        inv2, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0002', student=students[1],
            defaults={
                'type': 'tuition', 'description': 'CPL Program - Semester 1',
                'amount': 75000, 'currency': 'DZD',
                'status': 'partially_paid',
                'issued_at': now - timedelta(days=60),
                'due_at': now + timedelta(days=30),
            },
        )
        Payment.objects.get_or_create(
            invoice=inv2, student=students[1],
            defaults={
                'amount': 30000, 'currency': 'DZD',
                'method': 'cash', 'reference': 'CSH-001',
                'paid_at': now - timedelta(days=30),
            },
        )

        Invoice.objects.get_or_create(
            invoice_number='INV-2026-0004', student=students[3],
            defaults={
                'type': 'tuition', 'description': 'PPL Program - Semester 1',
                'amount': 45000, 'currency': 'DZD',
                'status': 'issued',
                'issued_at': now - timedelta(days=30),
                'due_at': now + timedelta(days=30),
            },
        )

        # ── Contract for Ahmed ───────────────────────────
        Contract.objects.get_or_create(
            student=students[0],
            defaults={
                'contract_number': 'CTR-2026-0001',
                'type': 'training',
                'status': 'signed',
                'start_date': today - timedelta(days=90),
                'end_date': today + timedelta(days=275),
                'total_amount': 45000,
                'terms': 'Standard PPL training contract. Payment in installments.',
                'signed_by_student': True,
                'signed_by_school': True,
                'signed_at': now - timedelta(days=90),
            },
        )

        # ── Messages ─────────────────────────────────────
        from apps.notifications.models import Message
        messages = [
            (fi_user, students[0].user, 'Flight Lesson Confirmation',
             'Your flight lesson on Advanced Navigation is confirmed for tomorrow at 14:00. Please be at the hangar 30 minutes before.'),
            (fi_user, students[0].user, 'Progress Check Reminder',
             'Your progress check is scheduled for next week. Please review your emergency procedures.'),
            (gi_user, students[0].user, 'Course Material',
             'The updated Navigation course material has been uploaded to your portal. Please review before the next class.'),
            (admin, fi_user, 'Instructor Meeting',
             'Monthly instructor meeting this Friday at 10:00 in the conference room.'),
        ]
        for sender, receiver, subject, body in messages:
            Message.objects.get_or_create(
                sender=sender, receiver=receiver, subject=subject,
                defaults={'body': body, 'is_read': False},
            )

        # Mark some as read
        first_msg = Message.objects.filter(receiver=students[0].user).first()
        if first_msg:
            Message.objects.filter(id=first_msg.id).update(is_read=True, read_at=now - timedelta(days=1))

        # ── Notifications ─────────────────────────────────
        from apps.notifications.models import Notification
        notifications = [
            (students[0].user, 'info', 'Welcome to Masterly Air Academy',
             'Your student account has been created. Explore your dashboard to get started.'),
            (students[0].user, 'reminder', 'Flight Lesson Tomorrow',
             'You have a flight lesson scheduled tomorrow at 14:00 with Hassan Ouazzani.'),
            (students[0].user, 'success', 'Exam Passed',
             'Congratulations! You passed the Navigation Theory Exam with 85%.'),
            (students[0].user, 'warning', 'Invoice Overdue',
             'Your invoice INV-2026-0003 for 15,000 DZD is overdue. Please make payment.'),
            (fi_user, 'reminder', 'Flight Lesson with Ahmed',
             'You have a flight lesson with Ahmed Benali tomorrow at 14:00.'),
            (fi_user, 'info', 'New Student Assigned',
             'Amina Alaoui has been assigned to you as a student.'),
            (gi_user, 'info', 'Course Assigned',
             'You have been assigned to teach Advanced Navigation starting next week.'),
            (admin, 'info', 'Audit Reminder',
             'Annual Safety Audit 2026 is scheduled for next month.'),
        ]
        for user, ntype, title, body in notifications:
            Notification.objects.get_or_create(
                user=user, type=ntype, title=title,
                defaults={'message': body},
            )

        # ── Quality & Safety ──────────────────────────────
        from apps.quality_safety.models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent
        audit1, _ = Audit.objects.get_or_create(
            title='Annual Safety Audit 2026',
            defaults={
                'type': 'safety', 'scope': 'Full flight operations review',
                'scheduled_date': now + timedelta(days=30),
                'status': 'planned', 'lead_auditor': admin,
            },
        )
        audit2, _ = Audit.objects.get_or_create(
            title='Q1 Compliance Review',
            defaults={
                'type': 'compliance', 'scope': 'Review of all training records',
                'scheduled_date': now - timedelta(days=30),
                'status': 'completed', 'lead_auditor': admin,
                'completed_date': now - timedelta(days=25),
            },
        )
        ncr1, _ = NonConformity.objects.get_or_create(
            audit=audit2, title='Missing pre-flight checklist signature',
            defaults={
                'description': 'Three flights in January lacked instructor signature on pre-flight checklist.',
                'severity': 'major', 'status': 'open',
                'due_date': now + timedelta(days=15),
            },
        )
        ncr2, _ = NonConformity.objects.get_or_create(
            audit=audit2, title='Expired medical certificate on file',
            defaults={
                'description': 'Student file STU-003 has an expired Class 2 medical.',
                'severity': 'critical', 'status': 'open',
                'due_date': now + timedelta(days=7),
            },
        )
        CAPA.objects.get_or_create(
            non_conformity=ncr1, title='Implement digital checklist verification',
            defaults={'type': 'corrective', 'description': 'Deploy electronic checklist system with mandatory signature.', 'status': 'open', 'due_date': now + timedelta(days=30)},
        )
        CAPA.objects.get_or_create(
            non_conformity=ncr2, title='Review and update all student medical records',
            defaults={'type': 'corrective', 'description': 'Audit all student files for valid medical certificates.', 'status': 'open', 'due_date': now + timedelta(days=14)},
        )
        RiskAssessment.objects.get_or_create(
            hazard='Aircraft engine failure during takeoff',
            defaults={
                'description': 'Catastrophic engine failure at low altitude',
                'probability': 1, 'severity': 5,
                'mitigation_measures': 'Pre-flight checks, regular maintenance, rejected takeoff procedure',
                'risk_level': 5,
            },
        )
        RiskAssessment.objects.get_or_create(
            hazard='Mid-air collision in training area',
            defaults={
                'description': 'Multiple aircraft operating in congested training zone',
                'probability': 2, 'severity': 5,
                'mitigation_measures': 'Radio communication protocols, traffic awareness, see-and-avoid',
                'risk_level': 10,
            },
        )
        SafetyEvent.objects.get_or_create(
            title='Bird strike on final approach',
            defaults={
                'type': 'incident',
                'description': 'Small bird struck left wing during final approach. No damage. Aircraft landed safely.',
                'reported_by': admin, 'status': 'reported',
            },
        )
        SafetyEvent.objects.get_or_create(
            title='Runway incursion near miss',
            defaults={
                'type': 'near_miss',
                'description': 'Aircraft taxied onto active runway without clearance during training session.',
                'reported_by': admin, 'status': 'reported',
            },
        )

        # ── Simulator Sessions ───────────────────────────
        from apps.flight_training.models import Simulator, SimulatorSession
        sim, _ = Simulator.objects.get_or_create(
            name='FNPT II MCC', manufacturer='ALSIM',
            defaults={
                'model_name': 'AL250', 'qualification_type': 'FNPT II',
                'status': 'available',
            },
        )
        SimulatorSession.objects.get_or_create(
            simulator=sim, student=students[0], instructor=fi,
            scheduled_date=today + timedelta(days=8),
            defaults={
                'start_time': now + timedelta(days=8, hours=14),
                'end_time': now + timedelta(days=8, hours=15, minutes=30),
                'status': 'scheduled',
            },
        )

        # ── Quality Documents ────────────────────────────
        from apps.quality_safety.models import QualityDocument
        QualityDocument.objects.get_or_create(
            title='Safety Management System Manual',
            defaults={
                'type': 'manual',
                'status': 'published',
                'file_url': '/media/quality/sms_manual.pdf',
                'version': '1.0',
            },
        )

        # ── System Settings ──────────────────────────────
        from apps.core.models import SystemSetting
        defaults = [
            ('school_name', 'Masterly Air Academy', 'text'),
            ('school_address', 'Mohamed V Avenue, Casablanca, Morocco', 'text'),
            ('school_phone', '+212 5XX-XXXXXX', 'text'),
            ('currency', 'DZD', 'text'),
            ('locale', 'en', 'text'),
            ('flight_hour_rate', '15000', 'number'),
            ('dual_instruction_rate', '18000', 'number'),
            ('cancellation_policy_hours', '24', 'number'),
        ]
        for key, value, stype in defaults:
            SystemSetting.objects.get_or_create(
                key=key,
                defaults={'value': value, 'type': stype, 'category': 'general', 'description': ''},
            )

        # ── Summary ──────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(f'\nDemo data seeded successfully!'))
        self.stdout.write(f'  Students: {Student.objects.count()}')
        self.stdout.write(f'  Instructors (FI): {FlightInstructor.objects.count()}')
        self.stdout.write(f'  Instructors (GI): {GroundInstructor.objects.count()}')
        self.stdout.write(f'  Aircraft: {Aircraft.objects.count()}')
        self.stdout.write(f'  Subjects: {Subject.objects.count()}')
        self.stdout.write(f'  Modules: {Module.objects.count()}')
        self.stdout.write(f'  Module Lessons: {ModuleLesson.objects.count()}')
        self.stdout.write(f'  Courses: {Course.objects.count()}')
        self.stdout.write(f'  Flight Lessons: {FlightLesson.objects.count()}')
        self.stdout.write(f'  Exams: {Exam.objects.count()}')
        self.stdout.write(f'  Questions: {QuestionBank.objects.count()}')
        self.stdout.write(f'  Exam Attempts: {ExamAttempt.objects.count()}')
        self.stdout.write(f'  Certificates: {Certificate.objects.count()}')
        self.stdout.write(f'  Invoices: {Invoice.objects.count()}')
        self.stdout.write(f'  Payments: {Payment.objects.count()}')
        self.stdout.write(f'  Contracts: {Contract.objects.count()}')
        self.stdout.write(f'  Messages: {Message.objects.count()}')
        self.stdout.write(f'  Notifications: {Notification.objects.count()}')
        self.stdout.write(f'\n  Login credentials:')
        self.stdout.write(f'    Admin:     admin@masterly-air-academy.dz / Admin@2026')
        self.stdout.write(f'    Director:  director@masterly-air-academy.dz / director123')
        self.stdout.write(f'    Finance:   finance@masterly-air-academy.dz / finance123')
        self.stdout.write(f'    Quality:   quality@masterly-air-academy.dz / quality123')
        self.stdout.write(f'    Scheduler: scheduler@masterly-air-academy.dz / scheduler123')
        self.stdout.write(f'    FI:        fi@masterly-air-academy.dz / instructor123')
        self.stdout.write(f'    GI:        gi@masterly-air-academy.dz / instructor123')
        self.stdout.write(f'    Students:  ahmed@student.maa.dz / student123 (and others)')

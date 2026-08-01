from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from apps.accounts.permissions import HasRolePermission
from apps.students.models import Student, MedicalCertificate, TrainingProgram
from apps.ground_training.models import Course, CourseEnrollment
from apps.flight_training.models import Aircraft, FlightLesson
from apps.administration.models import Invoice, Payment
from apps.quality_safety.models import Audit, NonConformity
from apps.exams.models import ExamAttempt, Certificate
from apps.exams.serializers import CertificateSerializer


class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'dashboard.view'
    def get(self, request):
        fl = FlightLesson.objects.all()
        inv = Invoice.objects.all()
        return Response({"students": Student.objects.count(), "courses": Course.objects.count(), "aircraft": Aircraft.objects.count(), "flights": fl.count(), "flight_hours": round(sum(float(f.flight_duration or 0) for f in fl), 1), "revenue": round(sum(float(i.amount) for i in inv.filter(status="paid")), 2), "outstanding": round(sum(float(i.amount) for i in inv.filter(status__in=["issued","partially_paid"])), 2), "audits": Audit.objects.filter(status="planned").count(), "ncrs": NonConformity.objects.filter(status="open").count()})


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view_own'

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        # Flight hours
        flight_lessons = FlightLesson.objects.filter(student=student)
        total_flight_hours = round(
            sum(float(f.flight_duration or 0) for f in flight_lessons), 1
        )
        total_lessons_completed = flight_lessons.filter(status='completed').count()

        # Theory progress
        enrollments = CourseEnrollment.objects.filter(student=student)
        total_courses = enrollments.count()
        completed_courses = enrollments.filter(course__status='completed').count()
        theory_progress = round(
            (completed_courses / total_courses * 100) if total_courses > 0 else 0, 1
        )

        # Flight progress
        all_flight_lessons = flight_lessons.count()
        flight_progress = round(
            (total_lessons_completed / all_flight_lessons * 100) if all_flight_lessons > 0 else 0, 1
        )

        # Exam average
        exam_attempts = ExamAttempt.objects.filter(student=student, score__isnull=False)
        exam_average = round(
            sum(float(a.score) for a in exam_attempts) / exam_attempts.count()
        ) if exam_attempts.count() > 0 else 0

        # Upcoming schedule (course enrollment + flight lessons, next 3)
        upcoming_courses = Course.objects.filter(
            enrollments__student=student,
            scheduled_date__gte=timezone.now().date(),
            status__in=['scheduled', 'in_progress'],
        ).order_by('scheduled_date', 'start_time')[:3]

        upcoming_flights = FlightLesson.objects.filter(
            student=student,
            scheduled_date__gte=timezone.now().date(),
            status='scheduled',
        ).order_by('scheduled_date')[:3]

        upcoming_schedule = []
        for c in upcoming_courses:
            upcoming_schedule.append({
                'type': 'course',
                'title': c.title,
                'date': str(c.scheduled_date),
                'time': f'{c.start_time.strftime("%H:%M")}-{c.end_time.strftime("%H:%M")}',
            })
        for f in upcoming_flights:
            upcoming_schedule.append({
                'type': 'flight',
                'title': f'Flight with {f.instructor.first_name} {f.instructor.last_name}',
                'date': str(f.scheduled_date),
                'aircraft': f.aircraft.registration,
            })
        upcoming_schedule = sorted(upcoming_schedule, key=lambda x: x['date'])[:3]

        # Recent results (exam attempts, last 5)
        recent_results = []
        for a in exam_attempts.order_by('-completed_at')[:5]:
            recent_results.append({
                'exam': a.exam.code,
                'score': float(a.score) if a.score else None,
                'passed': a.is_passed,
                'date': str(a.completed_at.date()) if a.completed_at else None,
            })

        # Exam counts
        passed_exams_count = ExamAttempt.objects.filter(student=student, is_passed=True).count()
        failed_exams_count = ExamAttempt.objects.filter(student=student, is_passed=False).count()

        # Notifications (last 5 unread)
        from apps.notifications.models import Notification
        notifications_qs = Notification.objects.filter(user=request.user, is_read=False).order_by('-created_at')[:5]
        notifications_data = []
        for n in notifications_qs:
            notifications_data.append({
                'id': str(n.id),
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'created_at': str(n.created_at),
                'data': n.data,
            })

        # Unpaid invoices count
        unpaid_invoices_count = Invoice.objects.filter(
            student=student,
            status__in=['issued', 'overdue', 'partially_paid'],
        ).count()

        # Program progress milestones (enrollments + competencies)
        from apps.exams.models import StudentCompetency
        milestones = []
        if total_courses > 0:
            milestones.append({'label': 'Theory Progress', 'current': completed_courses, 'target': total_courses})
        if all_flight_lessons > 0:
            program_hour_targets = {'PPL': 45, 'CPL': 200, 'IR': 50, 'MEP': 15, 'MCC': 40}
            milestones.append({'label': 'Flight Hours', 'current': total_flight_hours, 'target': program_hour_targets.get(student.program, 45)})
        competency_qs = StudentCompetency.objects.filter(student=student)
        if competency_qs.exists():
            milestones.append({'label': 'Competencies Acquired', 'current': competency_qs.filter(status='acquired').count(), 'target': competency_qs.count()})
        program_progress = {
            'theory_progress': theory_progress,
            'flight_progress': flight_progress,
            'milestones': milestones,
        }

        # Expiring documents (medical certificates expiring within 30 days)
        expiring_soon = MedicalCertificate.objects.filter(
            student=student,
            status='valid',
            expiry_date__lte=timezone.now().date() + timedelta(days=30),
            expiry_date__gte=timezone.now().date(),
        )
        expiring_documents = [
            {
                'type': 'medical_certificate',
                'expiry_date': str(m.expiry_date),
                'issuer': m.issuer,
            }
            for m in expiring_soon
        ]

        return Response({
            'student_number': student.student_number,
            'program': student.program,
            'total_flight_hours': total_flight_hours,
            'total_lessons_completed': total_lessons_completed,
            'theory_progress': theory_progress,
            'flight_progress': flight_progress,
            'exam_average': exam_average,
            'passed_exams_count': passed_exams_count,
            'failed_exams_count': failed_exams_count,
            'notifications': notifications_data,
            'recent_notifications': notifications_data,
            'upcoming_schedule': upcoming_schedule,
            'recent_results': recent_results,
            'unpaid_invoices_count': unpaid_invoices_count,
            'expiring_documents': expiring_documents,
            'program_progress': program_progress,
        })


@api_view(['GET'])
@permission_classes([])  # Public endpoint — no auth required
def verify_certificate(request):
    number = request.query_params.get('number', '')
    if not number:
        return Response({'valid': False, 'message': 'Certificate number required'}, status=400)
    try:
        cert = Certificate.objects.get(certificate_number=number)
        return Response({'valid': True, 'certificate': CertificateSerializer(cert).data})
    except Certificate.DoesNotExist:
        return Response({'valid': False, 'message': 'Certificate not found'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_reports(request):
    from django.db.models import Sum
    from decimal import Decimal

    period = request.query_params.get('period', 'month')
    year = int(request.query_params.get('year', timezone.now().year))

    invoices_qs = Invoice.objects.filter(created_at__year=year)
    paid_invoices = invoices_qs.filter(status='paid')
    all_invoices = invoices_qs.filter(status__in=['issued', 'paid', 'partially_paid', 'overdue'])

    # Revenue by month
    revenue_by_month = []
    for m in range(1, 13):
        month_paid = paid_invoices.filter(created_at__month=m)
        rev = round(sum(float(i.amount) for i in month_paid), 2)
        revenue_by_month.append({'month': m, 'revenue': rev})

    # Revenue by program
    revenue_by_program = []
    for prog_code, prog_label in TrainingProgram.choices:
        prog_invoices = paid_invoices.filter(student__program=prog_code)
        rev = round(sum(float(i.amount) for i in prog_invoices), 2)
        if rev > 0:
            revenue_by_program.append({'program': prog_code, 'program_name': prog_label, 'revenue': rev})

    # Outstanding by age
    now = timezone.now()
    outstanding_invoices = all_invoices.exclude(status='paid')
    buckets = {
        '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0,
    }
    for inv in outstanding_invoices:
        due = inv.due_at
        if due:
            days_overdue = (now - due).days
            if days_overdue <= 30:
                name = '0_30'
            elif days_overdue <= 60:
                name = '31_60'
            elif days_overdue <= 90:
                name = '61_90'
            else:
                name = '90_plus'
        else:
            name = '0_30'
        buckets[name] = round(buckets[name] + float(inv.amount), 2)

    outstanding_by_age = [
        {'label': '0-30 days', 'total': buckets['0_30']},
        {'label': '31-60 days', 'total': buckets['31_60']},
        {'label': '61-90 days', 'total': buckets['61_90']},
        {'label': '90+ days', 'total': buckets['90_plus']},
    ]

    # Top debtors (top 10)
    debtor_totals = {}
    for inv in all_invoices.exclude(status='paid'):
        name = inv.student.full_name
        sid = str(inv.student.id)
        if sid not in debtor_totals:
            debtor_totals[sid] = {'student_id': sid, 'student_name': name, 'total_outstanding': 0}
        debtor_totals[sid]['total_outstanding'] = round(
            debtor_totals[sid]['total_outstanding'] + float(inv.amount), 2
        )
    top_debtors = sorted(
        debtor_totals.values(), key=lambda x: x['total_outstanding'], reverse=True
    )[:10]

    # Collection rate
    total_issued = sum(float(i.amount) for i in all_invoices)
    total_collected = sum(float(i.amount) for i in paid_invoices)
    collection_rate = round(
        (total_collected / total_issued * 100) if total_issued > 0 else 0, 1
    )

    return Response({
        'revenue_by_month': revenue_by_month,
        'revenue_by_program': revenue_by_program,
        'outstanding_by_age': outstanding_by_age,
        'top_debtors': top_debtors,
        'collection_rate': collection_rate,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRolePermission])
def student_report(request):
    """GET /api/reports/students/ — aggregated student data"""
    from django.db.models import Count
    total = Student.objects.count()
    by_program = list(Student.objects.values('program').annotate(count=Count('id')))
    by_status = list(Student.objects.values('status').annotate(count=Count('id')))
    new_this_month = Student.objects.filter(enrollment_date__month=timezone.now().month, enrollment_date__year=timezone.now().year).count()
    return Response({
        'total': total, 'by_program': by_program, 'by_status': by_status,
        'new_this_month': new_this_month,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRolePermission])
def financial_report(request):
    """GET /api/reports/financial/ — revenue, payments, outstanding"""
    from django.db.models import Count, Sum
    total_invoiced = Invoice.objects.aggregate(s=Sum('amount'))['s'] or 0
    total_paid = Payment.objects.aggregate(s=Sum('amount'))['s'] or 0
    overdue = Invoice.objects.filter(status='overdue').aggregate(s=Sum('amount'))['s'] or 0
    by_status = list(Invoice.objects.values('status').annotate(count=Count('id'), total=Sum('amount')))
    return Response({
        'total_invoiced': round(float(total_invoiced), 2), 'total_paid': round(float(total_paid), 2),
        'overdue': round(float(overdue), 2), 'by_status': by_status,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRolePermission])
def exam_reports(request):
    """GET /api/reports/exams/ -- pass rates, results summary"""
    from apps.exams.models import Exam, ExamAttempt
    from django.db.models import Count, Avg
    total_exams = Exam.objects.count()
    total_attempts = ExamAttempt.objects.count()
    passed = ExamAttempt.objects.filter(is_passed=True).count()
    pass_rate = round((passed / total_attempts * 100) if total_attempts > 0 else 0, 1)
    avg_score = ExamAttempt.objects.filter(score__isnull=False).aggregate(a=Avg('score'))['a'] or 0
    return Response({
        'total_exams': total_exams, 'total_attempts': total_attempts,
        'passed': passed, 'pass_rate': pass_rate, 'avg_score': round(float(avg_score), 1),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRolePermission])
def fleet_report(request):
    """GET /api/reports/fleet/ — aircraft usage, instructor utilization"""
    from apps.students.models import FlightInstructor
    from django.db.models import Sum, Count

    aircraft = []
    for a in Aircraft.objects.all():
        hours = FlightLesson.objects.filter(aircraft=a, status='completed').aggregate(s=Sum('flight_duration'))['s'] or 0
        aircraft.append({'registration': a.registration, 'hours': round(float(hours), 1), 'status': a.status, 'lessons': FlightLesson.objects.filter(aircraft=a).count()})

    instructors = []
    for fi in FlightInstructor.objects.filter(status='active'):
        hours = FlightLesson.objects.filter(instructor=fi, status='completed').aggregate(s=Sum('flight_duration'))['s'] or 0
        instructors.append({'name': f'{fi.first_name} {fi.last_name}', 'hours': round(float(hours), 1), 'students': fi.flight_lessons.values('student').distinct().count()})

    return Response({'aircraft': aircraft, 'instructors': instructors})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_history(request):
    """GET /api/students/me/history/ -- chronological academic history"""
    from apps.students.models import Student
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student profile not found'}, status=404)

    from apps.exams.models import ExamAttempt, ProgressCheck, SkillTest, Certificate
    events = []
    for a in ExamAttempt.objects.filter(student=student).select_related('exam'):
        events.append({'type': 'exam', 'date': str(a.completed_at.date()) if a.completed_at else str(a.started_at.date()), 'title': f'Exam: {a.exam.code}', 'detail': f'Score: {a.score}% - {"Passed" if a.is_passed else "Failed"}', 'id': str(a.id)})
    for p in ProgressCheck.objects.filter(student=student):
        events.append({'type': 'progress_check', 'date': str(p.scheduled_date.date()), 'title': 'Progress Check', 'detail': p.result or 'Pending', 'id': str(p.id)})
    for s in SkillTest.objects.filter(student=student):
        events.append({'type': 'skill_test', 'date': str(s.scheduled_date.date()), 'title': 'Skill Test', 'detail': s.result or 'Pending', 'id': str(s.id)})
    for c in Certificate.objects.filter(student=student):
        events.append({'type': 'certificate', 'date': str(c.issue_date), 'title': f'Certificate: {c.title or c.type}', 'detail': c.certificate_number, 'id': str(c.id)})
    events.sort(key=lambda x: x['date'], reverse=True)
    return Response({'events': events})

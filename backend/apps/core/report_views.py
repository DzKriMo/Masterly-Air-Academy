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
        from django.db.models import Sum
        fl = FlightLesson.objects.all()
        inv = Invoice.objects.all()
        total_collected = Payment.objects.aggregate(s=Sum('amount'))['s'] or 0
        outstanding_qs = inv.exclude(status__in=['draft', 'cancelled', 'paid']).annotate(
            paid_total=Sum('payments__amount')
        )
        outstanding = round(sum(
            (float(i.amount) - float(i.paid_total or 0)) for i in outstanding_qs
        ), 2)
        return Response({"students": Student.objects.count(), "courses": Course.objects.count(), "aircraft": Aircraft.objects.count(), "flights": fl.count(), "flight_hours": round(sum(float(f.flight_duration or 0) for f in fl), 1), "revenue": round(float(total_collected), 2), "outstanding": outstanding, "audits": Audit.objects.filter(status="planned").count(), "ncrs": NonConformity.objects.filter(status="open").count()})


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
        exam_attempts = ExamAttempt.objects.filter(student=student, score__isnull=False).select_related('exam')
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
        ).select_related('instructor', 'aircraft').order_by('scheduled_date')[:3]

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
            'promotion_code': student.promotion_code,
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

    invoices_qs = Invoice.objects.filter(created_at__year=year).select_related('student')
    all_invoices = invoices_qs.filter(status__in=['issued', 'paid', 'partially_paid', 'overdue'])
    invoiced = all_invoices.annotate(paid_total=Sum('payments__amount'))

    def balance_of(inv):
        return max(float(inv.amount) - float(inv.paid_total or 0), 0)

    # Revenue by month (money actually collected via payments)
    payments_year = Payment.objects.filter(paid_at__year=year)
    monthly_totals = dict(
        payments_year.values_list('paid_at__month').annotate(total=Sum('amount'))
    )
    revenue_by_month = [
        {'month': m, 'revenue': round(float(monthly_totals.get(m) or 0), 2)}
        for m in range(1, 13)
    ]

    # Revenue by program (money actually collected via payments)
    program_totals = dict(
        payments_year.values_list('student__program').annotate(total=Sum('amount'))
    )
    revenue_by_program = []
    for prog_code, prog_label in TrainingProgram.choices:
        rev = round(float(program_totals.get(prog_code) or 0), 2)
        if rev > 0:
            revenue_by_program.append({'program': prog_code, 'program_name': prog_label, 'revenue': rev})

    # Outstanding by age (remaining balances)
    now = timezone.now()
    outstanding_invoices = [inv for inv in invoiced if balance_of(inv) > 0]
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
        buckets[name] = round(buckets[name] + balance_of(inv), 2)

    outstanding_by_age = [
        {'label': '0-30 days', 'total': buckets['0_30']},
        {'label': '31-60 days', 'total': buckets['31_60']},
        {'label': '61-90 days', 'total': buckets['61_90']},
        {'label': '90+ days', 'total': buckets['90_plus']},
    ]

    # Top debtors (top 10, by remaining balance)
    debtor_totals = {}
    for inv in invoiced:
        bal = balance_of(inv)
        if bal <= 0:
            continue
        name = inv.student.full_name
        sid = str(inv.student.id)
        if sid not in debtor_totals:
            debtor_totals[sid] = {'student_id': sid, 'student_name': name, 'total_outstanding': 0}
        debtor_totals[sid]['total_outstanding'] = round(
            debtor_totals[sid]['total_outstanding'] + bal, 2
        )
    top_debtors = sorted(
        debtor_totals.values(), key=lambda x: x['total_outstanding'], reverse=True
    )[:10]

    # Collection rate (collected / invoiced)
    total_issued = sum(float(inv.amount) for inv in invoiced)
    total_collected = sum(float(inv.paid_total or 0) for inv in invoiced)
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


class StudentReportView(APIView):
    """GET /api/reports/students/ — aggregated student data"""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'

    def get(self, request):
        from django.db.models import Count
        total = Student.objects.count()
        by_program = list(Student.objects.values('program').annotate(count=Count('id')))
        by_status = list(Student.objects.values('status').annotate(count=Count('id')))
        new_this_month = Student.objects.filter(enrollment_date__month=timezone.now().month, enrollment_date__year=timezone.now().year).count()
        return Response({
            'total': total, 'by_program': by_program, 'by_status': by_status,
            'new_this_month': new_this_month,
        })


class FinancialReportView(APIView):
    """GET /api/reports/financial/ — revenue, payments, outstanding"""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'finance.view_reports'

    def get(self, request):
        from django.db.models import Count, Sum
        total_invoiced = Invoice.objects.aggregate(s=Sum('amount'))['s'] or 0
        total_paid = Payment.objects.aggregate(s=Sum('amount'))['s'] or 0
        invoiced = Invoice.objects.filter(status__in=['issued', 'partially_paid', 'overdue']).annotate(
            paid_total=Sum('payments__amount')
        )
        overdue = round(sum(
            max(float(i.amount) - float(i.paid_total or 0), 0) for i in invoiced.filter(status='overdue')
        ), 2)
        by_status = list(Invoice.objects.values('status').annotate(count=Count('id'), total=Sum('amount')))
        return Response({
            'total_invoiced': round(float(total_invoiced), 2), 'total_paid': round(float(total_paid), 2),
            'overdue': round(float(overdue), 2), 'by_status': by_status,
        })


class ExamReportsView(APIView):
    """GET /api/reports/exams/ -- pass rates, results summary"""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'

    def get(self, request):
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


class FleetReportView(APIView):
    """GET /api/reports/fleet/ — aircraft usage, instructor utilization"""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'fleet.view'

    def get(self, request):
        from apps.students.models import FlightInstructor
        from django.db.models import Sum, Count

        flight_agg = dict(
            FlightLesson.objects.filter(status='completed')
            .values_list('aircraft_id').annotate(hours=Sum('flight_duration'))
        )
        lesson_counts = dict(
            FlightLesson.objects.values_list('aircraft_id').annotate(c=Count('id'))
        )
        aircraft = []
        for a in Aircraft.objects.all():
            aircraft.append({
                'registration': a.registration,
                'hours': round(float(flight_agg.get(a.id) or 0), 1),
                'status': a.status,
                'lessons': lesson_counts.get(a.id, 0),
            })

        instructor_hours = dict(
            FlightLesson.objects.filter(status='completed')
            .values_list('instructor_id').annotate(hours=Sum('flight_duration'))
        )
        instructor_students = dict(
            FlightLesson.objects.values_list('instructor_id')
            .annotate(c=Count('student', distinct=True))
        )
        instructors = []
        for fi in FlightInstructor.objects.filter(status='active'):
            instructors.append({
                'name': f'{fi.first_name} {fi.last_name}',
                'hours': round(float(instructor_hours.get(fi.id) or 0), 1),
                'students': instructor_students.get(fi.id, 0),
            })

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

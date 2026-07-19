from apps.students.models import Student, FlightInstructor
from apps.administration.models import Invoice, Payment, Document, Contract
from apps.exams.models import Exam, ExamAttempt, Certificate, PracticalEvaluation, StudentCompetency, ProgressCheck
from apps.notifications.models import Notification
from datetime import timedelta, date
import random

student = Student.objects.get(first_name='Ahmed', last_name='Benali')
user = student.user
today = date.today()
fi = FlightInstructor.objects.first()

# Documents
docs = [
    ('Training Contract', 'contract', 'administrative', 'approved', 1),
    ('Medical Certificate Class 2', 'medical', 'medical', 'approved', 1),
    ('Passport Copy', 'id', 'administrative', 'approved', 1),
    ('Payment Receipt Q1', 'receipt', 'financial', 'approved', 1),
]
for name, dtype, cat, status, ver in docs:
    Document.objects.get_or_create(student=student, name=name, defaults={
        'type': dtype, 'category': cat, 'status': status, 'version': ver,
        'file_url': '/media/documents/sample.pdf'
    })

# Invoices + Payments
inv_data = [
    ('INV-2026-A001', 'tuition', 450000, 'paid', 180, 170),
    ('INV-2026-A002', 'tuition', 350000, 'paid', 90, 85),
    ('INV-2026-A003', 'exam_fee', 25000, 'paid', 30, 28),
    ('INV-2026-A004', 'tuition', 200000, 'partially_paid', 5, None),
]
for inv_num, itype, amt, st, days_ago, paid_days_ago in inv_data:
    issued = today - timedelta(days=days_ago)
    paid_dt = today - timedelta(days=paid_days_ago) if paid_days_ago else None
    inv, _ = Invoice.objects.get_or_create(invoice_number=inv_num, defaults={
        'student': student, 'type': itype, 'amount': amt, 'currency': 'DZD',
        'status': st, 'issued_at': issued, 'due_at': issued + timedelta(days=30),
        'paid_at': paid_dt
    })
    if st == 'paid' and paid_dt:
        Payment.objects.get_or_create(invoice=inv, student=student, amount=amt, defaults={
            'method': 'bank_transfer', 'currency': 'DZD'
        })

# Contract
Contract.objects.get_or_create(contract_number='CTR-2026-001', defaults={
    'student': student, 'type': 'training',
    'start_date': today - timedelta(days=365),
    'end_date': today + timedelta(days=365), 'status': 'active'
})

# Exams
exam_nav, _ = Exam.objects.get_or_create(code='NAV-PPL-01', defaults={
    'title': 'Navigation PPL Exam', 'program': 'PPL', 'type': 'final_exam',
    'duration': 120, 'question_count': 40, 'passing_grade': 75, 'max_attempts': 3, 'status': 'active'
})
exam_met, _ = Exam.objects.get_or_create(code='MET-PPL-01', defaults={
    'title': 'Meteorology PPL Exam', 'program': 'PPL', 'type': 'module_exam',
    'duration': 90, 'question_count': 30, 'passing_grade': 70, 'max_attempts': 3, 'status': 'active'
})
exam_law, _ = Exam.objects.get_or_create(code='REG-PPL-01', defaults={
    'title': 'Air Law PPL Exam', 'program': 'PPL', 'type': 'module_exam',
    'duration': 60, 'question_count': 25, 'passing_grade': 70, 'max_attempts': 3, 'status': 'active'
})

# Exam Attempts
for ex, att, score, passed, days_ago in [
    (exam_nav, 1, 68, False, 50), (exam_nav, 2, 82, True, 35),
    (exam_met, 1, 75, True, 40), (exam_law, 1, 88, True, 20),
]:
    dt = today - timedelta(days=days_ago)
    ExamAttempt.objects.get_or_create(exam=ex, student=student, attempt=att, defaults={
        'score': score, 'is_passed': passed, 'completed_at': dt,
        'started_at': dt - timedelta(hours=1)
    })

# Certificates
Certificate.objects.get_or_create(certificate_number='CERT-2026-A001', defaults={
    'student': student, 'type': 'medical', 'title': 'Medical Certificate Class 2',
    'program': 'PPL', 'issue_date': today - timedelta(days=180), 'status': 'issued'
})
Certificate.objects.get_or_create(certificate_number='CERT-2026-A002', defaults={
    'student': student, 'type': 'completion', 'title': 'Ground School Completion',
    'program': 'PPL', 'issue_date': today - timedelta(days=20), 'status': 'issued'
})

# Progress Check
if fi:
    ProgressCheck.objects.get_or_create(student=student, scheduled_date=today - timedelta(days=10), defaults={
        'examiner': fi, 'result': 'passed',
        'observations': 'Good control. Ready for solo navigation.',
        'status': 'completed', 'completed_date': today - timedelta(days=10)
    })

# Practical Evaluations
if fi:
    for i in range(3):
        dt = today - timedelta(days=60 - i * 20)
        g = round(random.uniform(6.5, 9.0), 1)
        PracticalEvaluation.objects.get_or_create(student=student, date=dt, defaults={
            'instructor': fi, 'lesson_type': 'flight', 'grade': g, 'result': 'passed',
            'competencies': {'Takeoff': 'acquired', 'Landing': 'acquired' if i > 0 else 'in_progress'},
            'observations': 'Good performance.', 'strengths': 'Radio, control',
            'improvements': 'Crosswind landings', 'decision': 'Continue'
        })

# Competencies
comps = [
    ('Pre-flight Inspection', 'acquired'), ('Engine Start', 'acquired'),
    ('Taxiing', 'acquired'), ('Takeoff', 'acquired'), ('Straight & Level', 'acquired'),
    ('Turning', 'acquired'), ('Stalling', 'acquired'), ('Landing', 'acquired'),
    ('Radio Communication', 'acquired'), ('Navigation', 'in_progress'),
    ('Emergency Procedures', 'in_progress'), ('Night Flying', 'not_started'),
    ('Instrument Flying', 'not_started'),
]
for comp, status in comps:
    StudentCompetency.objects.get_or_create(
        student=student, program='PPL', competency=comp, defaults={'status': status}
    )

# Notifications
notifs = [
    ('flight_scheduled', 'Flight Scheduled', 'Flight scheduled with CN-TAB', 1),
    ('flight_evaluated', 'Flight Evaluation', 'Flight evaluated: Passed - Grade: 8.0', 7),
    ('exam_result', 'Exam Result', 'Exam NAV-PPL-01: Passed - 82%', 35),
    ('exam_result', 'Exam Result', 'Exam MET-PPL-01: Passed - 75%', 40),
    ('certificate_issued', 'Certificate Issued', 'Certificate CERT-2026-A001 issued', 180),
    ('progress_check', 'Progress Check', 'Progress Check completed: Passed', 10),
    ('document_expiring', 'Document Expiring', 'Medical Certificate expires in 15 days', 5),
    ('invoice_created', 'New Invoice', 'Invoice INV-2026-A004: 200,000 DZD', 5),
]
for ntype, title, msg, days_ago in notifs:
    Notification.objects.get_or_create(user=user, type=ntype, title=title, defaults={
        'message': msg, 'created_at': today - timedelta(days=days_ago)
    })

cnt = Document.objects.filter(student=student).count()
cnt_i = Invoice.objects.filter(student=student).count()
cnt_e = ExamAttempt.objects.filter(student=student).count()
cnt_c = Certificate.objects.filter(student=student).count()
cnt_eval = PracticalEvaluation.objects.filter(student=student).count()
cnt_comp = StudentCompetency.objects.filter(student=student).count()
cnt_notif = Notification.objects.filter(user=user).count()
print(f'Done: {cnt} docs, {cnt_i} inv, {cnt_e} exams, {cnt_c} certs, {cnt_eval} evals, {cnt_comp} comps, {cnt_notif} notifs')

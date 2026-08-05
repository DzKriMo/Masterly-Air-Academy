import random
from datetime import timedelta
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission

from .final_models import (
    FinalExamQuestion, FinalExam, FinalExamModuleConfig, FinalExamAssignment,
    FinalExamStatus,
)
from .final_serializers import (
    FinalExamQuestionSerializer, FinalExamQuestionBulkSerializer,
    FinalExamSerializer, FinalExamCreateSerializer,
    FinalExamModuleConfigSerializer, FinalExamAssignmentSerializer,
    FinalExamAccessSerializer, FinalExamSubmitSerializer,
)
from .final_bulk_import import import_questions, generate_template


def compute_assignment_points(assignment):
    """Return (max_points, earned_points, auto_correct, auto_total, essay_question_ids)."""
    ids = assignment.questions or []
    qs = FinalExamQuestion.objects.filter(id__in=ids)
    qmap = {str(q.id): q for q in qs}
    answers = assignment.answers or {}
    manual = assignment.manual_scores or {}

    max_points = 0.0
    earned = 0.0
    auto_correct = 0
    auto_total = 0
    essays = []
    for qid, q in qmap.items():
        max_points += float(q.points)
        ans = answers.get(qid)
        if q.question_type in ('mcq', 'scq', 'true_false'):
            auto_total += 1
            if ans is not None and str(ans).strip().lower() == str(q.correct_answer).strip().lower():
                earned += float(q.points)
                auto_correct += 1
        else:
            essays.append(qid)
            earned += float(manual.get(qid, 0) or 0)

    return round(max_points, 2), round(earned, 2), auto_correct, auto_total, essays


def final_score_percent(max_points, earned_points):
    return round((earned_points / max_points * 100) if max_points else 0, 2)


class FinalExamQuestionViewSet(viewsets.ModelViewSet):
    queryset = FinalExamQuestion.objects.select_related('subject', 'module').all()
    serializer_class = FinalExamQuestionSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.manage'
    filterset_fields = ['subject', 'module', 'difficulty', 'question_type', 'is_active']
    search_fields = ['question_text']

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        serializer = FinalExamQuestionBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        questions = serializer.validated_data['questions']
        created = 0
        errors = []
        for i, q in enumerate(questions):
            try:
                FinalExamQuestion.objects.create(
                    subject_id=q.get('subject'),
                    module_id=q.get('module'),
                    question_text=q.get('question_text', ''),
                    question_type=q.get('question_type', 'mcq'),
                    difficulty=q.get('difficulty', 'medium'),
                    options=q.get('options', []),
                    correct_answer=q.get('correct_answer', ''),
                    explanation=q.get('explanation', ''),
                )
                created += 1
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})
        return Response({'created': created, 'errors': errors})

    @action(detail=False, methods=['get'], url_path='template')
    def template(self, request):
        from django.http import HttpResponse
        fmt = request.query_params.get('fmt', 'csv').lower()
        if fmt == 'xlsx':
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = 'final_exam_question_template.xlsx'
        else:
            content_type = 'text/csv'
            filename = 'final_exam_question_template.csv'
        response = HttpResponse(generate_template(fmt), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['post'], url_path='import')
    def import_bank(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        result = import_questions(file)
        return Response(result)


class FinalExamViewSet(viewsets.ModelViewSet):
    queryset = FinalExam.objects.select_related('subject', 'created_by').prefetch_related(
        'module_configs__module', 'promotions'
    ).all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.manage'
    filterset_fields = ['subject', 'status']
    search_fields = ['title']

    def get_queryset(self):
        return FinalExam.objects.select_related('subject', 'created_by').prefetch_related(
            'module_configs__module', 'promotions'
        ).all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return FinalExamCreateSerializer
        return FinalExamSerializer

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user if user.is_authenticated else None)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        exam = self.get_object()
        if exam.status != FinalExamStatus.DRAFT:
            return Response({'error': 'Exam already generated'}, status=400)

        students = []
        for promo in exam.promotions.all():
            students.extend(list(promo.students.filter(status='active')))

        if not students:
            return Response({'error': 'No students found in selected promotions'}, status=400)

        configs = exam.module_configs.all()
        assignments = []
        errors = []

        for student in students:
            question_ids = []
            for cfg in configs:
                module_questions = list(FinalExamQuestion.objects.filter(
                    subject=exam.subject, module=cfg.module, is_active=True
                ))
                if not module_questions:
                    errors.append(f'No questions for module {cfg.module.title}')
                    continue

                by_difficulty = {}
                for q in module_questions:
                    by_difficulty.setdefault(q.difficulty, []).append(q)

                dist = cfg.difficulty_distribution or {}
                picked = []
                selected = set(question_ids)
                for diff, count in dist.items():
                    pool = [q for q in by_difficulty.get(diff, []) if str(q.id) not in selected]
                    for q in random.sample(pool, min(int(count), len(pool))):
                        picked.append(str(q.id))
                        selected.add(str(q.id))

                module_ids = {str(q.id) for q in module_questions}
                module_picked = [qid for qid in picked if qid in module_ids]
                remaining = max(0, cfg.question_count - len(module_picked))
                if remaining > 0:
                    unused = [q for q in module_questions if str(q.id) not in selected]
                    for q in random.sample(unused, min(remaining, len(unused))):
                        picked.append(str(q.id))
                        selected.add(str(q.id))

                question_ids.extend(picked)

            random.shuffle(question_ids)

            assignment = FinalExamAssignment.objects.create(
                exam=exam, student=student, questions=question_ids,
            )
            assignments.append(assignment)

        exam.status = FinalExamStatus.GENERATED
        exam.save()

        return Response({
            'status': 'generated',
            'assignments': len(assignments),
            'errors': errors,
        })

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        exam = self.get_object()
        assignments = exam.assignments.select_related('student').order_by(
            'student__last_name', 'student__first_name'
        )

        from weasyprint import HTML
        from django.http import HttpResponse

        cards = ''
        for i, a in enumerate(assignments):
            s = a.student
            cards += f'''
            <div class="card">
                <div class="card-header">MASTERLY AIR ACADEMY</div>
                <div class="card-title">{exam.title}</div>
                <div class="card-fields">
                    <div class="field"><span class="label">Student</span><span class="value">{s.full_name}</span></div>
                    <div class="field"><span class="label">Student #</span><span class="value">{s.student_number or '—'}</span></div>
                    <div class="field"><span class="label">Access Code</span><span class="value code">{a.access_code}</span></div>
                    <div class="field"><span class="label">Portal</span><span class="value">/exams/{exam.hash}</span></div>
                </div>
            </div>
            '''
            if (i + 1) % 3 == 0 and i < len(assignments) - 1:
                cards += '<div class="page-break"></div>'

        html = f'''<html><head><meta charset="utf-8"><style>
        @page {{ size: A4; margin: 1.5cm; }}
        body {{ font-family: "Helvetica Neue", Arial, sans-serif; }}
        .card {{ border: 2px dashed #c4943c; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; page-break-inside: avoid; min-height: 180px; }}
        .card-header {{ font-size: 12px; color: #c4943c; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }}
        .card-title {{ font-size: 16px; font-weight: 700; color: #0a1628; margin-bottom: 10px; }}
        .field {{ display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dotted #e5e7eb; }}
        .label {{ font-size: 10px; color: #9ca3af; text-transform: uppercase; }}
        .value {{ font-size: 13px; color: #1f2937; font-weight: 500; }}
        .code {{ font-size: 18px; font-weight: 800; color: #c4943c; letter-spacing: 2px; }}
        .page-break {{ page-break-after: always; }}
        .footer {{ text-align: center; font-size: 8px; color: #d1d5db; margin-top: 20px; }}
        </style></head><body>
        {cards}
        <div class="footer">Generated {timezone.now().strftime('%d/%m/%Y %H:%M')} — Cut along dashed lines</div>
        </body></html>'''

        try:
            pdf_file = HTML(string=html).write_pdf()
            resp = HttpResponse(pdf_file, content_type='application/pdf')
            resp['Content-Disposition'] = f'attachment; filename="access-codes-{exam.hash}.pdf"'
            return resp
        except ImportError:
            return Response({'error': 'PDF generation not available'}, status=501)

    @action(detail=True, methods=['get'])
    def assignments(self, request, pk=None):
        exam = self.get_object()
        qs = exam.assignments.select_related('student').all()
        return Response(FinalExamAssignmentSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'], url_path='assignments/(?P<assignment_id>[^/.]+)/reset')
    def reset_assignment(self, request, pk=None, assignment_id=None):
        """Reset a single student's attempt back to pending (wipes answers, score, violations, flags)."""
        exam = self.get_object()
        assignment = exam.assignments.filter(pk=assignment_id).first()
        if not assignment:
            return Response({'error': 'Assignment not found for this exam'}, status=404)

        assignment.status = 'pending'
        assignment.answers = {}
        assignment.violations = []
        assignment.is_flagged = False
        assignment.score = None
        assignment.started_at = None
        assignment.submitted_at = None
        assignment.manual_scores = {}
        assignment.essay_graded = False
        assignment.save(update_fields=[
            'status', 'answers', 'violations', 'is_flagged',
            'score', 'started_at', 'submitted_at', 'manual_scores', 'essay_graded',
        ])
        return Response({'status': 'reset', 'assignment_id': str(assignment.id)})

    @action(detail=True, methods=['get', 'post'], url_path='assignments/(?P<assignment_id>[^/.]+)/grade')
    def grade(self, request, pk=None, assignment_id=None):
        """GET: breakdown of a submitted assignment for manual grading. POST: save essay scores and recompute the final score."""
        exam = self.get_object()
        assignment = exam.assignments.select_related('student').filter(pk=assignment_id).first()
        if not assignment:
            return Response({'error': 'Assignment not found for this exam'}, status=404)
        if assignment.status != 'submitted':
            return Response({'error': 'Only submitted exams can be graded'}, status=400)

        max_points, earned_points, auto_correct, auto_total, essays = compute_assignment_points(assignment)
        answers = assignment.answers or {}
        manual = assignment.manual_scores or {}

        if request.method == 'POST':
            scores = request.data.get('scores') or {}
            if not isinstance(scores, dict):
                return Response({'error': 'scores must be an object of question_id -> points'}, status=400)

            qs = FinalExamQuestion.objects.filter(id__in=assignment.questions or [])
            qmap = {str(q.id): q for q in qs}
            for qid, val in scores.items():
                if qid not in qmap:
                    continue
                q = qmap[qid]
                if q.question_type in ('mcq', 'scq', 'true_false'):
                    continue  # only essays are manually graded
                try:
                    pts = float(val)
                except (TypeError, ValueError):
                    continue
                pts = max(0.0, min(float(q.points), pts))
                manual[qid] = pts

            assignment.manual_scores = manual
            max_points, earned_points, _, _, essays = compute_assignment_points(assignment)
            assignment.score = final_score_percent(max_points, earned_points)
            assignment.essay_graded = all(str(qid) in manual for qid in essays)
            assignment.save()

            return Response({
                'status': 'graded',
                'score': assignment.score,
                'earned_points': earned_points,
                'max_points': max_points,
                'essay_graded': assignment.essay_graded,
            })

        essay_questions = []
        qs = FinalExamQuestion.objects.filter(id__in=assignment.questions or [])
        for q in qs:
            if str(q.id) in essays:
                essay_questions.append({
                    'question_id': str(q.id),
                    'question_text': q.question_text,
                    'points': float(q.points),
                    'answer': answers.get(str(q.id), ''),
                    'score': float(manual.get(str(q.id), 0) or 0),
                })

        return Response({
            'assignment_id': str(assignment.id),
            'student_name': assignment.student.full_name,
            'student_number': assignment.student.student_number,
            'exam_title': exam.title,
            'auto_correct': auto_correct,
            'auto_total': auto_total,
            'max_points': max_points,
            'earned_points': earned_points,
            'score': float(assignment.score) if assignment.score is not None else None,
            'essay_graded': assignment.essay_graded,
            'is_flagged': assignment.is_flagged,
            'essay_questions': essay_questions,
        })

    @action(detail=True, methods=['get'], url_path='report')
    def report(self, request, pk=None):
        """Printable HTML exam report: exam details, who took it + results, who was absent, notes."""
        from django.http import HttpResponse
        from django.utils.html import escape
        exam = self.get_object()
        subject = exam.subject
        assignments = list(exam.assignments.select_related('student').order_by(
            'student__last_name', 'student__first_name'
        ))

        submitted = [a for a in assignments if a.status == 'submitted']
        in_progress = [a for a in assignments if a.status == 'in_progress']
        absent = [a for a in assignments if a.status == 'pending']

        scores = [float(a.score) for a in submitted if a.score is not None]
        avg = round(sum(scores) / len(scores), 2) if scores else None

        def student_cell(a):
            s = a.student
            num = f"<div class='num'>{escape(s.student_number or '—')}</div>" if s.student_number else ""
            return f"{escape(s.full_name)}{num}"

        rows = ''
        if assignments:
            rows = '<table class="tbl"><thead><tr><th>#</th><th>Student</th><th>Code</th><th>Status</th><th>Score</th><th>Flagged</th></tr></thead><tbody>'
            for i, a in enumerate(assignments):
                flag = 'FLAGGED' if a.is_flagged else ''
                score = f"{float(a.score):.2f}%" if a.score is not None else '—'
                status_label = {'submitted': 'Submitted', 'in_progress': 'In Progress', 'pending': 'Absent'}.get(a.status, a.status)
                rows += (
                    f'<tr><td>{i + 1}</td><td>{student_cell(a)}</td>'
                    f'<td class="mono">{escape(a.access_code)}</td>'
                    f'<td>{status_label}</td>'
                    f'<td class="mono">{score}</td>'
                    f'<td class="flag">{flag}</td></tr>'
                )
            rows += '</tbody></table>'
        else:
            rows = '<p class="empty">No assignments have been generated for this exam yet.</p>'

        absent_names = '; '.join(escape(a.student.full_name) for a in absent) or '—'

        html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Exam Report — {escape(exam.title)}</title>
<style>
@page {{ size: A4; margin: 1.6cm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "Helvetica Neue", Arial, sans-serif; color: #111827; margin: 0; }}
.header {{ text-align: center; border-bottom: 3px solid #b0872f; padding-bottom: 12px; margin-bottom: 20px; }}
.org {{ font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #b0872f; font-weight: 700; }}
h1 {{ font-size: 20px; margin: 6px 0 2px; }}
.subtitle {{ font-size: 12px; color: #6b7280; }}
.meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 16px 0; font-size: 13px; }}
.meta .k {{ color: #6b7280; }}
.meta .v {{ font-weight: 600; }}
h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #b0872f; margin: 22px 0 8px; }}
.summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }}
.stat {{ border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }}
.stat .n {{ font-size: 22px; font-weight: 700; }}
.stat .l {{ font-size: 10px; text-transform: uppercase; color: #6b7280; }}
.tbl {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
.tbl th {{ background: #f3f4f6; text-align: left; padding: 7px 8px; border: 1px solid #e5e7eb; text-transform: uppercase; font-size: 10px; letter-spacing: .5px; }}
.tbl td {{ padding: 6px 8px; border: 1px solid #e5e7eb; }}
.tbl tr:nth-child(even) td {{ background: #fbfaf6; }}
.num {{ font-size: 10px; color: #6b7280; }}
.mono {{ font-family: "Courier New", monospace; letter-spacing: .5px; }}
.flag {{ color: #b91c1c; font-weight: 700; font-size: 10px; }}
.empty {{ color: #6b7280; font-style: italic; }}
.absent-box {{ border: 1px dashed #d1d5db; padding: 10px; font-size: 12px; }}
.notes {{ border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; min-height: 120px; }}
.notes .line {{ border-bottom: 1px dashed #e5e7eb; height: 18px; }}
.footer {{ text-align: center; font-size: 10px; color: #9ca3af; margin-top: 24px; }}
@media print {{ body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; }} }}
</style></head><body>
<div class="header">
  <div class="org">Masterly Air Academy</div>
  <h1>{escape(exam.title)}</h1>
  <div class="subtitle">Final Examination Report — {escape(subject.title_en)}</div>
</div>
<div class="meta">
  <div><span class="k">Subject:</span> <span class="v">{escape(subject.title_en)}</span></div>
  <div><span class="k">Duration:</span> <span class="v">{exam.duration_minutes} minutes</span></div>
  <div><span class="k">Status:</span> <span class="v">{exam.status}</span></div>
  <div><span class="k">Promotions:</span> <span class="v">{", ".join(escape(p.code or p.name) for p in exam.promotions.all()) or '—'}</span></div>
  <div><span class="k">Exam Portal:</span> <span class="v">/exams/{escape(exam.hash)}</span></div>
  <div><span class="k">Generated:</span> <span class="v">{timezone.now().strftime('%d/%m/%Y %H:%M')}</span></div>
</div>
<h2>Summary</h2>
<div class="summary">
  <div class="stat"><div class="n">{len(assignments)}</div><div class="l">Assigned</div></div>
  <div class="stat"><div class="n">{len(submitted)}</div><div class="l">Submitted</div></div>
  <div class="stat"><div class="n">{len(in_progress)}</div><div class="l">In Progress</div></div>
  <div class="stat"><div class="n">{len(absent)}</div><div class="l">Absent</div></div>
</div>
<div class="stat" style="margin-bottom:8px;"><div class="l">Average score (submitted)</div><div class="n">{avg if avg is not None else '—'}%</div></div>
<h2>Results</h2>
{rows}
<h2>Absent Students</h2>
<div class="absent-box">{absent_names}</div>
<h2>Notes</h2>
<div class="notes">
  <div class="line"></div><div class="line"></div><div class="line"></div><div class="line"></div><div class="line"></div>
</div>
<div class="footer">Masterly Air Academy — Final Exam Report</div>
</body></html>'''

        resp = HttpResponse(html, content_type='text/html; charset=utf-8')
        resp['Content-Disposition'] = f'inline; filename="final-exam-report-{exam.hash}.html"'
        return resp


@api_view(['POST'])
@permission_classes([AllowAny])
def exam_access(request):
    serializer = FinalExamAccessSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code = serializer.validated_data['access_code'].strip().upper()

    try:
        assignment = FinalExamAssignment.objects.select_related('exam', 'student').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=404)

    if assignment.status == 'submitted':
        return Response({'error': 'Exam already submitted', 'score': float(assignment.score) if assignment.score else None}, status=400)

    # Enforce exam duration — a timed-out exam cannot be started or resumed
    if assignment.started_at:
        elapsed = timezone.now() - assignment.started_at
        if elapsed > timedelta(minutes=assignment.exam.duration_minutes):
            return Response({'error': 'Exam time has expired'}, status=400)

    if assignment.status == 'pending':
        assignment.status = 'in_progress'
        assignment.started_at = timezone.now()
        assignment.save()

    questions = FinalExamQuestion.objects.filter(id__in=assignment.questions)
    questions_data = FinalExamQuestionSerializer(questions, many=True).data

    # Never expose correct answers or explanations to the candidate
    for q in questions_data:
        q.pop('correct_answer', None)
        q.pop('explanation', None)

    # Shuffle for display but maintain the assigned questions
    return Response({
        'assignment_id': str(assignment.id),
        'exam_title': assignment.exam.title,
        'student_name': assignment.student.full_name,
        'duration_minutes': assignment.exam.duration_minutes,
        'started_at': assignment.started_at,
        'questions': questions_data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def exam_submit(request):
    access_data = FinalExamAccessSerializer(data={'access_code': request.data.get('access_code', '')})
    if not access_data.is_valid():
        return Response({'error': 'Access code required'}, status=400)
    code = access_data.validated_data['access_code'].strip().upper()

    try:
        assignment = FinalExamAssignment.objects.select_related('exam').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=404)

    if assignment.status == 'submitted':
        return Response({'error': 'Already submitted'}, status=400)

    if assignment.status != 'in_progress' or not assignment.started_at:
        return Response({'error': 'Exam has not been started'}, status=400)

    # Enforce exam duration — reject submissions after the time limit
    elapsed = timezone.now() - assignment.started_at
    if elapsed > timedelta(minutes=assignment.exam.duration_minutes):
        return Response({'error': 'Exam time has expired'}, status=400)

    submit_serializer = FinalExamSubmitSerializer(data=request.data)
    submit_serializer.is_valid(raise_exception=True)
    answers = submit_serializer.validated_data['answers']
    violations = submit_serializer.validated_data.get('violations') or []

    # Auto-grade MCQ/SCQ/TrueFalse by points; essays postponed for manual grading.
    questions = FinalExamQuestion.objects.filter(id__in=assignment.questions)
    qmap = {str(q.id): q for q in questions}
    valid_answers = {k: v for k, v in answers.items() if k in qmap}

    assignment.answers = valid_answers
    total_auto = sum(1 for q in qmap.values() if q.question_type in ('mcq', 'scq', 'true_false'))
    auto_correct = 0
    for qid, answer in valid_answers.items():
        q = qmap[qid]
        if q.question_type in ('mcq', 'scq', 'true_false'):
            if str(answer).strip().lower() == str(q.correct_answer).strip().lower():
                auto_correct += 1

    max_points, earned_points, _, _, _ = compute_assignment_points(assignment)
    score = final_score_percent(max_points, earned_points)

    assignment.score = score
    assignment.status = 'submitted'
    assignment.submitted_at = timezone.now()
    if violations:
        assignment.violations = violations
        serious = [v for v in violations if v.get('type') in (
            'tab_switch', 'window_blur', 'fullscreen_exit', 'copy_paste', 'right_click', 'devtools', 'auto_submit'
        )]
        if len(serious) >= 3:
            assignment.is_flagged = True
    assignment.save()

    return Response({
        'status': 'submitted',
        'score': score,
        'correct': auto_correct,
        'total_auto_graded': total_auto,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def exam_status(request, access_code):
    code = access_code.strip().upper()
    try:
        assignment = FinalExamAssignment.objects.select_related('exam').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=404)

    return Response({
        'status': assignment.status,
        'score': float(assignment.score) if assignment.score else None,
        'exam_title': assignment.exam.title,
    })

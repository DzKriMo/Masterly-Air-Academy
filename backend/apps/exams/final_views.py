import random
from datetime import timedelta
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import escape
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
    return round((earned_points / max_points * 100) if max_points > 0 else 0, 2)


def _finalize_submission(assignment, answers, violations, submitted_at):
    """Grade a submitted final exam assignment and persist it.

    Returns ``(auto_correct, total_auto_graded)``. Shared by the client submit
    endpoint and the server-side anti-cheat auto-submit (heartbeat). An exam is
    flagged once it accumulates 2+ serious violations.
    """
    from .services import sanitize_violations
    violations, serious_count, suspicious = sanitize_violations(
        violations, assignment.started_at, submitted_at
    )

    questions = FinalExamQuestion.objects.filter(id__in=assignment.questions or [])
    qmap = {str(q.id): q for q in questions}
    valid_answers = {k: v for k, v in (answers or {}).items() if k in qmap}

    assignment.answers = valid_answers
    total_auto = sum(1 for q in qmap.values() if q.question_type in ('mcq', 'scq', 'true_false'))
    auto_correct = 0
    for qid, answer in valid_answers.items():
        q = qmap[qid]
        if q.question_type in ('mcq', 'scq', 'true_false'):
            if str(answer).strip().lower() == str(q.correct_answer).strip().lower():
                auto_correct += 1

    max_points, earned_points, _, _, essays = compute_assignment_points(assignment)
    # Essays earn nothing until manually graded — don't present a provisional score as final.
    if essays:
        assignment.score = None
        assignment.essay_graded = False
    else:
        assignment.score = final_score_percent(max_points, earned_points)
        assignment.essay_graded = True
    assignment.status = 'submitted'
    assignment.submitted_at = submitted_at
    if violations:
        assignment.violations = violations
        if serious_count >= 2 or suspicious:
            assignment.is_flagged = True
    elif suspicious:
        assignment.is_flagged = True
    assignment.save()
    return auto_correct, total_auto


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
        serializer.save(created_by=self.request.user)

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

        with transaction.atomic():
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
                        try:
                            count = int(count)
                        except (ValueError, TypeError):
                            count = 0
                        pool = [q for q in by_difficulty.get(diff, []) if str(q.id) not in selected]
                        for q in random.sample(pool, min(count, len(pool))):
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
                <div class="card-title">{escape(exam.title)}</div>
                <div class="card-fields">
                    <div class="field"><span class="label">Student</span><span class="value">{escape(s.full_name)}</span></div>
                    <div class="field"><span class="label">Student #</span><span class="value">{escape(s.student_number or '—')}</span></div>
                    <div class="field"><span class="label">Access Code</span><span class="value code">{escape(a.access_code)}</span></div>
                    <div class="field"><span class="label">Portal</span><span class="value">/exams/{escape(exam.hash)}</span></div>
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

    @action(detail=True, methods=['get'], url_path='assignments/(?P<assignment_id>[^/.]+)/report')
    def student_report(self, request, pk=None, assignment_id=None):
        """Printable per-student final exam report with the student's answers."""
        from django.http import HttpResponse
        from django.utils.html import escape
        exam = self.get_object()
        assignment = exam.assignments.select_related('student').filter(pk=assignment_id).first()
        if not assignment:
            return Response({'error': 'Assignment not found for this exam'}, status=404)

        questions = list(FinalExamQuestion.objects.filter(id__in=assignment.questions or []))
        answers = assignment.answers or {}
        manual = assignment.manual_scores or {}
        max_points, earned_points, auto_correct, auto_total, essays = compute_assignment_points(assignment)

        rows = ''
        for i, q in enumerate(questions, 1):
            ans = answers.get(str(q.id), '')
            is_auto = q.question_type in ('mcq', 'scq', 'true_false')
            if is_auto and ans:
                correct = str(ans).strip().lower() == str(q.correct_answer or '').strip().lower()
                q_earned = float(q.points) if correct else 0.0
            elif not is_auto:
                correct = None
                q_earned = float(manual.get(str(q.id), 0) or 0)
            else:
                correct = None
                q_earned = 0.0
            mark = 'correct' if correct is True else ('wrong' if correct is False else 'pending')
            mark_label = 'Correct' if correct is True else ('Incorrect' if correct is False else ('Essay (manual)' if not is_auto else 'Unanswered'))
            rows += f'''<tr class="{mark}">
<td>{i}</td>
<td class="qtext">{escape(q.question_text)}</td>
<td>{escape(ans) if ans else '—'}</td>
<td>{escape(q.correct_answer or '—')}</td>
<td>{mark_label}</td>
<td>{round(q_earned, 2)}/{float(q.points)}</td>
</tr>'''

        s = assignment.student
        status_label = {'submitted': 'Submitted', 'in_progress': 'In Progress', 'pending': 'Pending'}.get(assignment.status, assignment.status)
        score_html = f'{float(assignment.score):.2f}%' if assignment.score is not None else '—'
        flag_badge = '<span class="flag">FLAGGED</span>' if assignment.is_flagged else ''
        violations_count = len(assignment.violations or [])

        html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Student Exam Report — {escape(exam.title)}</title>
<style>
@page {{ size: A4; margin: 1.6cm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "Helvetica Neue", Arial, sans-serif; color: #111827; margin: 0; font-size: 12px; }}
.header {{ text-align: center; border-bottom: 3px solid #b0872f; padding-bottom: 12px; margin-bottom: 18px; }}
.org {{ font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #b0872f; font-weight: 700; }}
h1 {{ font-size: 19px; margin: 6px 0 2px; }}
.subtitle {{ font-size: 12px; color: #6b7280; }}
.meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 16px 0; font-size: 13px; }}
.meta .k {{ color: #6b7280; }}
.meta .v {{ font-weight: 600; }}
.summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }}
.stat {{ border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }}
.stat .n {{ font-size: 21px; font-weight: 700; }}
.stat .l {{ font-size: 10px; text-transform: uppercase; color: #6b7280; }}
h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #b0872f; margin: 20px 0 8px; }}
.flag {{ display: inline-block; background: #b91c1c; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px; }}
.tbl {{ width: 100%; border-collapse: collapse; font-size: 11px; }}
.tbl th {{ background: #f3f4f6; text-align: left; padding: 7px 8px; border: 1px solid #e5e7eb; text-transform: uppercase; font-size: 10px; letter-spacing: .5px; }}
.tbl td {{ padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }}
.tbl tr:nth-child(even) td {{ background: #fbfaf6; }}
.qtext {{ font-weight: 600; }}
tr.correct td {{ background: #f0fdf4; }}
tr.wrong td {{ background: #fef2f2; }}
tr.pending td {{ background: #fffbeb; }}
.footer {{ text-align: center; font-size: 10px; color: #9ca3af; margin-top: 24px; }}
@media print {{ body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; }} }}
</style></head><body>
<div class="header">
  <div class="org">Masterly Air Academy</div>
  <h1>{escape(exam.title)}</h1>
  <div class="subtitle">Final Examination — Individual Student Report</div>
</div>
<div class="meta">
  <div><span class="k">Student:</span> <span class="v">{escape(s.full_name)}</span></div>
  <div><span class="k">Student #:</span> <span class="v">{escape(s.student_number or '—')}</span></div>
  <div><span class="k">Subject:</span> <span class="v">{escape(exam.subject.title_en)}</span></div>
  <div><span class="k">Access Code:</span> <span class="v">{escape(assignment.access_code)}</span></div>
  <div><span class="k">Status:</span> <span class="v">{status_label} {flag_badge}</span></div>
  <div><span class="k">Violations:</span> <span class="v">{violations_count}</span></div>
  <div><span class="k">Started:</span> <span class="v">{assignment.started_at.strftime('%d/%m/%Y %H:%M') if assignment.started_at else '—'}</span></div>
  <div><span class="k">Submitted:</span> <span class="v">{assignment.submitted_at.strftime('%d/%m/%Y %H:%M') if assignment.submitted_at else '—'}</span></div>
</div>
<h2>Summary</h2>
<div class="summary">
  <div class="stat"><div class="n">{score_html}</div><div class="l">Final Score</div></div>
  <div class="stat"><div class="n">{round(earned_points, 2)}/{round(max_points, 2)}</div><div class="l">Points Earned</div></div>
  <div class="stat"><div class="n">{auto_correct}/{auto_total}</div><div class="l">Auto-graded</div></div>
  <div class="stat"><div class="n">{len(questions)}</div><div class="l">Questions</div></div>
</div>
<h2>Answer Sheet</h2>
{('<table class="tbl"><thead><tr><th>#</th><th>Question</th><th>Student Answer</th><th>Correct Answer</th><th>Result</th><th>Points</th></tr></thead><tbody>' + rows + '</tbody></table>') if rows else '<p class="meta">No questions on this assignment.</p>'}
<div class="footer">Masterly Air Academy — Student Final Exam Report — Generated {timezone.now().strftime('%d/%m/%Y %H:%M')}</div>
</body></html>'''

        resp = HttpResponse(html, content_type='text/html; charset=utf-8')
        resp['Content-Disposition'] = f'inline; filename="final-exam-student-report-{assignment.access_code}.html"'
        return resp


@api_view(['POST'])
@permission_classes([AllowAny])
def exam_access(request):
    serializer = FinalExamAccessSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code = serializer.validated_data['access_code'].strip().upper()

    try:
        with transaction.atomic():
            assignment = FinalExamAssignment.objects.select_for_update().select_related('exam', 'student').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=400)

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

    # Server-authoritative remaining time. The client must not derive it from
    # its own wall clock: a device clock that is off by an hour would stretch
    # (or shrink) the whole countdown by exactly that offset.
    now = timezone.now()
    elapsed = max(timedelta(0), now - assignment.started_at) if assignment.started_at else timedelta(0)
    remaining_seconds = max(0, assignment.exam.duration_minutes * 60 - int(elapsed.total_seconds()))

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
        'remaining_seconds': remaining_seconds,
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
        with transaction.atomic():
            assignment = FinalExamAssignment.objects.select_for_update().select_related('exam').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=400)

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

    submitted_at = timezone.now()
    auto_correct, total_auto = _finalize_submission(assignment, answers, violations, submitted_at)

    return Response({
        'status': 'submitted',
        'score': assignment.score,
        'correct': auto_correct,
        'total_auto_graded': total_auto,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def exam_heartbeat(request):
    """Real-time anti-cheat persistence during an in-progress exam.

    The client reports violations (and a snapshot of answers) every few seconds
    so the trail survives a closed tab or a dropped connection. If the stored
    serious-violation count reaches the force-submit threshold (3), or the
    exam window expires, the exam is auto-submitted server-side using the last
    synced answers.
    """
    access_data = FinalExamAccessSerializer(data={'access_code': request.data.get('access_code', '')})
    if not access_data.is_valid():
        return Response({'error': 'Access code required'}, status=400)
    code = access_data.validated_data['access_code'].strip().upper()

    try:
        with transaction.atomic():
            assignment = FinalExamAssignment.objects.select_for_update().select_related('exam').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=400)

    def state():
        remaining = 0
        if assignment.started_at:
            elapsed = max(timedelta(0), timezone.now() - assignment.started_at)
            remaining = max(0, assignment.exam.duration_minutes * 60 - int(elapsed.total_seconds()))
        return Response({
            'status': assignment.status,
            'score': float(assignment.score) if assignment.score is not None else None,
            'violations': assignment.violations or [],
            'is_flagged': assignment.is_flagged,
            'remaining_seconds': remaining,
            'auto_submitted': False,
        })

    if assignment.status == 'submitted':
        return state()
    if assignment.status != 'in_progress' or not assignment.started_at:
        return state()

    incoming = request.data.get('violations') or []
    if not isinstance(incoming, list):
        return Response({'error': 'violations must be a list'}, status=400)

    from .services import sanitize_violations
    now = timezone.now()

    # Merge incoming violations with what is already stored (dedupe by type+timestamp).
    stored = list(assignment.violations or [])
    existing_keys = {(v.get('type'), v.get('at')) for v in stored if isinstance(v, dict)}
    for v in incoming:
        if isinstance(v, dict) and (v.get('type'), v.get('at')) not in existing_keys:
            existing_keys.add((v.get('type'), v.get('at')))
            stored.append({'type': v.get('type'), 'at': v.get('at')})

    merged, serious_total, suspicious = sanitize_violations(stored, assignment.started_at, now)

    # Keep the latest answers on the server so a force-submit grades current state.
    incoming_answers = request.data.get('answers')
    if isinstance(incoming_answers, dict) and incoming_answers:
        assignment.answers = {
            **(assignment.answers or {}),
            **{k: v for k, v in incoming_answers.items()},
        }
        assignment.save(update_fields=['answers'])

    timed_out = (now - assignment.started_at) > timedelta(minutes=assignment.exam.duration_minutes)

    if serious_total >= 3 or suspicious or timed_out:
        # Force-submit: too many serious violations (or the window expired).
        stored.append({'type': 'auto_submit', 'at': now.isoformat()})
        _finalize_submission(assignment, assignment.answers, stored, now)
        return Response({
            'status': assignment.status,
            'score': float(assignment.score) if assignment.score is not None else None,
            'violations': assignment.violations or [],
            'is_flagged': assignment.is_flagged,
            'remaining_seconds': 0,
            'auto_submitted': True,
        })

    assignment.violations = merged
    if serious_total >= 2:
        assignment.is_flagged = True
    assignment.save(update_fields=['violations', 'is_flagged'])
    return state()


@api_view(['GET'])
@permission_classes([AllowAny])
def exam_status(request, access_code):
    code = access_code.strip().upper()
    try:
        assignment = FinalExamAssignment.objects.select_related('exam').get(access_code=code)
    except FinalExamAssignment.DoesNotExist:
        return Response({'error': 'Invalid access code'}, status=400)

    remaining = 0
    if assignment.started_at:
        elapsed = max(timedelta(0), timezone.now() - assignment.started_at)
        remaining = max(0, assignment.exam.duration_minutes * 60 - int(elapsed.total_seconds()))

    return Response({
        'status': assignment.status,
        'score': float(assignment.score) if assignment.score else None,
        'exam_title': assignment.exam.title,
        'remaining_seconds': remaining,
    })

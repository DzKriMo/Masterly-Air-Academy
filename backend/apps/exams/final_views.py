import random
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

                by_difficulty = {'easy': [], 'medium': [], 'hard': []}
                for q in module_questions:
                    by_difficulty.setdefault(q.difficulty, []).append(q)

                dist = cfg.difficulty_distribution or {}
                for diff, count in dist.items():
                    pool = by_difficulty.get(diff, [])
                    if not pool:
                        pool = module_questions
                    sample = random.sample(pool, min(int(count), len(pool)))
                    question_ids.extend([str(q.id) for q in sample])

                remaining = cfg.question_count - len([q for q in question_ids if any(
                    q == str(mq.id) for mq in module_questions if str(mq.id) == q
                )])
                if remaining > 0:
                    unused = [q for q in module_questions if str(q.id) not in question_ids]
                    extra = random.sample(unused, min(remaining, len(unused)))
                    question_ids.extend([str(q.id) for q in extra])

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

    submit_serializer = FinalExamSubmitSerializer(data=request.data)
    submit_serializer.is_valid(raise_exception=True)
    answers = submit_serializer.validated_data['answers']
    violations = submit_serializer.validated_data.get('violations') or []

    # Auto-grade MCQ/SCQ/TrueFalse
    questions = FinalExamQuestion.objects.filter(id__in=assignment.questions)
    qmap = {str(q.id): q for q in questions}
    correct = 0
    total = 0
    for qid, answer in answers.items():
        if qid in qmap:
            q = qmap[qid]
            if q.question_type in ('mcq', 'scq', 'true_false'):
                total += 1
                if str(answer).strip().lower() == str(q.correct_answer).strip().lower():
                    correct += 1

    score = round((correct / total * 100) if total > 0 else 0, 2)

    assignment.answers = answers
    assignment.score = score
    assignment.status = 'submitted'
    assignment.submitted_at = timezone.now()
    if violations:
        assignment.violations = violations
        serious = [v for v in violations if v.get('type') in (
            'tab_switch', 'window_blur', 'fullscreen_exit', 'copy_paste', 'right_click', 'devtools'
        )]
        if len(serious) >= 3:
            assignment.is_flagged = True
    assignment.save()

    return Response({
        'status': 'submitted',
        'score': score,
        'correct': correct,
        'total_auto_graded': total,
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

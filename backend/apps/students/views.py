from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission
from .models import Student, MedicalCertificate, FlightInstructor, AdminProfile
from .serializers import StudentListSerializer, MedicalCertificateSerializer, FlightInstructorSerializer, AdminProfileSerializer


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentListSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'
    search_fields = ['first_name', 'last_name', 'student_number']
    filterset_fields = ['program', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(user=self.request.user)
        if self.request.user.role == 'flight_instructor':
            return qs.filter(main_instructor__user=self.request.user)
        if self.request.user.role == 'chief_flight_instructor':
            return qs
        return qs

    def _user_has_permission(self, user, permission):
        all_perms = user.get_all_permissions()
        return permission in all_perms or any(p.endswith(f'.{permission}') for p in all_perms)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        if not self._user_has_permission(request.user, 'students.manage'):
            return Response({'error': 'Permission denied'}, status=403)
        student = self.get_object()
        student.status = 'suspended'
        student.save()
        return Response({'status': 'suspended'})

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        if not self._user_has_permission(request.user, 'students.manage'):
            return Response({'error': 'Permission denied'}, status=403)
        student = self.get_object()
        student.status = 'active'
        student.save()
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        if not self._user_has_permission(request.user, 'students.manage'):
            return Response({'error': 'Permission denied'}, status=403)
        student = self.get_object()
        student.status = 'archived'
        student.save()
        return Response({'status': 'archived'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Count
        qs = self.get_queryset()
        total = qs.count()
        total_active = qs.filter(status='active').count()
        by_program = dict(
            qs.values('program').annotate(count=Count('id')).values_list('program', 'count')
        )
        return Response({
            'total': total,
            'total_active': total_active,
            'by_program': by_program,
        })

    @action(detail=True, methods=['get'])
    def dossier(self, request, pk=None):
        from django.http import HttpResponse
        student = self.get_object()

        med_certs = student.medical_certificates.all()
        enrollments = student.enrollments.select_related('course__subject').all()
        attendance = student.attendance_records.all()
        ground_evals = student.ground_evaluations.select_related('course').all()
        flight_lessons = student.flight_lessons.select_related('instructor', 'aircraft').all()
        exam_attempts = student.exam_attempts.select_related('exam').all()
        quiz_attempts = student.quiz_attempts.select_related('quiz').all()
        certs = student.certificates.all()
        progress_checks = student.progress_checks.select_related('examiner').all()
        skill_tests = student.skill_tests.select_related('examiner').all()
        practical_evals = student.practical_evaluations.select_related('instructor').all()
        competencies = student.competencies.all()
        sim_sessions = student.simulatorsession_set.select_related('simulator', 'instructor').all()

        instructor_name = '—'
        if student.main_instructor:
            instructor_name = f'{student.main_instructor.first_name} {student.main_instructor.last_name}'

        html = self._dossier_html(student, med_certs, enrollments, attendance, ground_evals,
                                  flight_lessons, exam_attempts, quiz_attempts, certs,
                                  progress_checks, skill_tests, practical_evals,
                                  competencies, sim_sessions, instructor_name)

        try:
            from weasyprint import HTML
            pdf = HTML(string=html).write_pdf()
            resp = HttpResponse(pdf, content_type='application/pdf')
            resp['Content-Disposition'] = f'attachment; filename="dossier-{student.student_number}.pdf"'
            return resp
        except ImportError:
            return HttpResponse('PDF generation not available', status=501)


    def _dossier_html(self, student, med_certs, enrollments, attendance, ground_evals,
                      flight_lessons, exam_attempts, quiz_attempts, certs,
                      progress_checks, skill_tests, practical_evals,
                      competencies, sim_sessions, instructor_name):
        from datetime import datetime
        now = datetime.now()
        esc = lambda v: str(v).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;') if v else '—'
        fmt_date = lambda d: d.strftime('%d %b %Y') if d else '—'

        total_att = attendance.count()
        present_att = attendance.filter(status='present').count()
        absent_att = attendance.filter(status='absent').count()
        total_flight_hours = sum(float(f.flight_duration or 0) for f in flight_lessons)
        completed_flights = flight_lessons.filter(status='completed').count()

        # ── Build table rows ──

        enroll_rows = ''
        for e in enrollments:
            c = e.course
            enroll_rows += f'''<tr>
<td>{esc(c.title)}</td><td>{esc(c.subject.code if c.subject else '')}</td>
<td>{esc(c.scheduled_date)}</td><td>{esc(e.status)}</td>
</tr>'''

        flight_rows = ''
        for f in flight_lessons:
            sc = {'scheduled': '#3b82f6', 'in_progress': '#f59e0b', 'completed': '#22c55e', 'cancelled': '#ef4444', 'postponed': '#8b5cf6'}
            color = sc.get(f.status, '#6b7280')
            instr = f'{f.instructor.first_name} {f.instructor.last_name}' if f.instructor else '—'
            ac = f.aircraft.registration if f.aircraft else '—'
            flight_rows += f'''<tr>
<td>{esc(f.scheduled_date)}</td><td>{esc(instr)}</td><td>{esc(ac)}</td>
<td>{esc(f.flight_duration)}h</td>
<td style="color:{color};font-weight:bold">{esc(f.status)}</td>
<td>{esc(f.grade)}</td><td>{esc(f.result)}</td>
</tr>'''

        exam_rows = ''
        for ea in exam_attempts:
            ex = ea.exam
            passed = '✓' if ea.is_passed else '✗' if ea.is_passed is False else '—'
            exam_rows += f'''<tr>
<td>{esc(ex.code)}</td><td>{esc(ex.title)}</td><td>{ea.attempt}</td>
<td>{esc(ea.score)}</td><td>{passed}</td>
</tr>'''

        quiz_rows = ''
        for qa in quiz_attempts:
            quiz_rows += f'''<tr>
<td>{esc(qa.quiz.title)}</td><td>{esc(qa.score)}</td><td>{fmt_date(qa.completed_at)}</td>
</tr>'''

        cert_rows = ''
        for c in certs:
            cert_rows += f'''<tr>
<td>{esc(c.certificate_number)}</td><td>{esc(c.type)}</td><td>{esc(c.title)}</td>
<td>{fmt_date(c.issue_date)}</td><td>{fmt_date(c.expiry_date)}</td><td>{esc(c.status)}</td>
</tr>'''

        med_rows = ''
        for m in med_certs:
            med_rows += f'''<tr>
<td>{fmt_date(m.issue_date)}</td><td>{fmt_date(m.expiry_date)}</td><td>{esc(m.issuer)}</td><td>{esc(m.status)}</td>
</tr>'''

        ge_rows = ''
        for g in ground_evals:
            ge_rows += f'''<tr>
<td>{esc(g.course.title)}</td><td>{esc(g.grade)}</td><td>{'✓' if g.module_validated else '✗'}</td>
</tr>'''

        pc_rows = ''
        for p in progress_checks:
            ex_name = f'{p.examiner.first_name} {p.examiner.last_name}' if p.examiner else '—'
            pc_rows += f'''<tr>
<td>{fmt_date(p.scheduled_date)}</td><td>{esc(ex_name)}</td><td>{esc(p.result)}</td><td>{esc(p.status)}</td>
</tr>'''

        st_rows = ''
        for s in skill_tests:
            ex_name = f'{s.examiner.first_name} {s.examiner.last_name}' if s.examiner else '—'
            st_rows += f'''<tr>
<td>{fmt_date(s.scheduled_date)}</td><td>{esc(ex_name)}</td><td>{esc(s.result)}</td><td>{esc(s.status)}</td>
</tr>'''

        pe_rows = ''
        for p in practical_evals:
            instr = f'{p.instructor.first_name} {p.instructor.last_name}' if p.instructor else '—'
            pe_rows += f'''<tr>
<td>{fmt_date(p.date)}</td><td>{esc(instr)}</td><td>{esc(p.result)}</td><td>{esc(p.grade)}</td>
</tr>'''

        comp_rows = ''
        for c in competencies:
            comp_rows += f'''<tr>
<td>{esc(c.competency)}</td><td>{esc(c.program)}</td><td>{esc(c.status)}</td><td>{fmt_date(c.achieved_at)}</td>
</tr>'''

        sim_rows = ''
        for s in sim_sessions:
            instr = f'{s.instructor.first_name} {s.instructor.last_name}' if s.instructor else '—'
            sim_rows += f'''<tr>
<td>{fmt_date(s.scheduled_date)}</td><td>{esc(s.simulator.name)}</td><td>{esc(instr)}</td>
<td>{esc(s.duration)}h</td><td>{esc(s.status)}</td>
</tr>'''

        section = lambda title, rows, cols: f'''
<h2 class="section-title">{title}</h2>
<table><thead><tr>{cols}</tr></thead><tbody>{rows}</tbody></table>''' if rows else f'''
<h2 class="section-title">{title}</h2>
<p class="empty">No records found.</p>'''

        return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 1.8cm 1.5cm; }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 9px; line-height: 1.4; margin: 0; padding: 0; }}
.header {{ border-bottom: 3px solid #c4943c; padding-bottom: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }}
.header .logo {{ font-size: 28px; color: #c4943c; font-weight: 900; letter-spacing: 1px; }}
.header .sub {{ color: #64748b; font-size: 10px; }}
.header .title {{ font-size: 18px; color: #0a1628; font-weight: 700; margin: 0; }}
.header .meta {{ margin-left: auto; text-align: right; font-size: 8px; color: #94a3b8; }}
.info-grid {{ display: flex; flex-wrap: wrap; gap: 6px 24px; margin: 12px 0 18px 0; padding: 12px 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }}
.info-grid .field {{ min-width: 140px; }}
.info-grid .field .label {{ font-size: 7px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }}
.info-grid .field .value {{ font-size: 10px; color: #0a1628; font-weight: 600; }}
h2.section-title {{ font-size: 10px; color: #c4943c; text-transform: uppercase; letter-spacing: 1px; margin: 18px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }}
table {{ width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 8px; }}
th {{ background: #0a1628; color: #c4943c; padding: 5px 6px; text-align: left; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; }}
td {{ padding: 4px 6px; border-bottom: 1px solid #e2e8f0; color: #334155; }}
tr:nth-child(even) td {{ background: #f8fafc; }}
.stats-bar {{ display: flex; gap: 12px; margin: 6px 0 10px 0; }}
.stat {{ background: #f1f5f9; padding: 6px 14px; border-radius: 6px; text-align: center; }}
.stat .num {{ font-size: 14px; font-weight: 800; color: #c4943c; }}
.stat .lbl {{ font-size: 7px; text-transform: uppercase; color: #64748b; letter-spacing: 0.3px; }}
.empty {{ color: #94a3b8; font-style: italic; font-size: 8px; }}
.footer {{ margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 7px; color: #94a3b8; text-align: center; }}
.page-break {{ page-break-before: always; }}
</style></head><body>

<div class="header">
  <div><div class="logo">MAA</div><div class="sub">Masterly Air Academy</div></div>
  <div><h1 class="title">Student Dossier</h1></div>
  <div class="meta">Generated: {fmt_date(now)}</div>
</div>

<div class="info-grid">
  <div class="field"><div class="label">Student #</div><div class="value">{esc(student.student_number)}</div></div>
  <div class="field"><div class="label">Full Name</div><div class="value">{esc(student.full_name)}</div></div>
  <div class="field"><div class="label">Program</div><div class="value">{esc(student.program)}</div></div>
  <div class="field"><div class="label">Status</div><div class="value">{esc(student.status)}</div></div>
  <div class="field"><div class="label">Date of Birth</div><div class="value">{fmt_date(student.date_of_birth)}</div></div>
  <div class="field"><div class="label">Nationality</div><div class="value">{esc(student.nationality)}</div></div>
  <div class="field"><div class="label">Enrollment Date</div><div class="value">{fmt_date(student.enrollment_date)}</div></div>
  <div class="field"><div class="label">Main Instructor</div><div class="value">{esc(instructor_name)}</div></div>
</div>

<div class="stats-bar">
  <div class="stat"><div class="num">{enrollments.count()}</div><div class="lbl">Courses</div></div>
  <div class="stat"><div class="num">{total_flight_hours}</div><div class="lbl">Flight Hours</div></div>
  <div class="stat"><div class="num">{completed_flights}</div><div class="lbl">Flights</div></div>
  <div class="stat"><div class="num">{exam_attempts.count()}</div><div class="lbl">Exam Attempts</div></div>
  <div class="stat"><div class="num">{certs.count()}</div><div class="lbl">Certificates</div></div>
</div>

{section('Medical Certificates', med_rows, '<th>Issue Date</th><th>Expiry Date</th><th>Issuer</th><th>Status</th>')}

{section('Course Enrollments', enroll_rows, '<th>Course</th><th>Subject</th><th>Date</th><th>Status</th>')}

<h2 class="section-title">Attendance</h2>
<p>{f'Total: {total_att} | Present: {present_att} | Absent: {absent_att}' if total_att else 'No records found.'}</p>

{section('Ground Evaluations', ge_rows, '<th>Course</th><th>Grade</th><th>Validated</th>')}

<div class="page-break"></div>

<h2 class="section-title">Flight Training</h2>
<div class="stats-bar">
  <div class="stat"><div class="num">{total_flight_hours}</div><div class="lbl">Total Hours</div></div>
  <div class="stat"><div class="num">{completed_flights}</div><div class="lbl">Completed</div></div>
  <div class="stat"><div class="num">{sum(1 for f in flight_lessons if f.grade and float(f.grade) >= 70)}</div><div class="lbl">Passed</div></div>
</div>
<table><thead><tr><th>Date</th><th>Instructor</th><th>Aircraft</th><th>Duration</th><th>Status</th><th>Grade</th><th>Result</th></tr></thead><tbody>{flight_rows or '<tr><td colspan="7" class="empty">No flight lessons found.</td></tr>'}</tbody></table>

{section('Exam Attempts', exam_rows, '<th>Code</th><th>Exam</th><th>Attempt</th><th>Score</th><th>Passed</th>')}

{section('Quiz Attempts', quiz_rows, '<th>Quiz</th><th>Score</th><th>Completed</th>')}

{section('Certificates', cert_rows, '<th>Number</th><th>Type</th><th>Title</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th>')}

{section('Progress Checks', pc_rows, '<th>Date</th><th>Examiner</th><th>Result</th><th>Status</th>')}

{section('Skill Tests', st_rows, '<th>Date</th><th>Examiner</th><th>Result</th><th>Status</th>')}

{section('Practical Evaluations', pe_rows, '<th>Date</th><th>Instructor</th><th>Result</th><th>Grade</th>')}

{section('Competencies', comp_rows, '<th>Competency</th><th>Program</th><th>Status</th><th>Acquired</th>')}

{section('Simulator Sessions', sim_rows, '<th>Date</th><th>Simulator</th><th>Instructor</th><th>Duration</th><th>Status</th>')}

<div class="footer">
  Masterly Air Academy — Student Dossier — {esc(student.student_number)} — {fmt_date(now)}
</div>

</body></html>'''


class MedicalCertificateViewSet(viewsets.ModelViewSet):
    queryset = MedicalCertificate.objects.all()
    serializer_class = MedicalCertificateSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            return qs.filter(student__main_instructor__user=self.request.user)
        return qs

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        from django.core.files.storage import default_storage
        path = default_storage.save(f'medical/{file.name}', file)
        cert_id = request.data.get('certificate_id')
        if cert_id:
            cert = self.get_queryset().filter(pk=cert_id).first()
            if cert is None:
                return Response({'error': 'Certificate not found'}, status=404)
            cert.file_url = path
            cert.save(update_fields=['file_url'])
            return Response({'file_url': path, 'certificate': MedicalCertificateSerializer(cert).data}, status=201)
        return Response({'file_url': path}, status=201)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        cert = self.get_object()
        if not cert.file_url:
            return Response({'error': 'No file attached'}, status=404)
        if cert.file_url.startswith(('http://', 'https://')):
            return Response({'file_url': cert.file_url})
        from django.core.files.storage import default_storage
        from django.http import StreamingHttpResponse
        try:
            f = default_storage.open(cert.file_url, 'rb')
            filename = cert.file_url.rsplit('/', 1)[-1]
            response = StreamingHttpResponse(f, content_type='application/octet-stream')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except Exception:
            return Response({'error': 'File not found'}, status=404)


class AdminProfileViewSet(viewsets.ModelViewSet):
    queryset = AdminProfile.objects.all()
    serializer_class = AdminProfileSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'accounts.manage'


class FlightInstructorViewSet(viewsets.ModelViewSet):
    queryset = FlightInstructor.objects.all()
    serializer_class = FlightInstructorSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'
    search_fields = ['first_name', 'last_name']

    def destroy(self, request, pk=None):
        instructor = self.get_object()
        if instructor.user_id:
            user = instructor.user
            user.is_active = False
            user.status = 'suspended'
            user.save(update_fields=['is_active', 'status'])
        instructor.status = 'suspended'
        instructor.save(update_fields=['status'])
        return Response(status=204)


class GroundInstructorViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.view'

    def get_queryset(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(
            role__in=['ground_instructor', 'chief_ground_instructor']
        ).order_by('first_name', 'last_name')

    def _serialize(self, user):
        return {
            'id': str(user.id),
            'name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
            'email': user.email,
            'phone': '',
            'license_number': '',
            'qualifications': [],
            'status': user.status,
            'total_flight_hours': 0,
            'instruction_hours': 0,
            'student_count': 0,
        }

    def list(self, request):
        from .serializers import GroundInstructorSerializer
        data = [self._serialize(u) for u in self.get_queryset()]
        return Response(GroundInstructorSerializer(data, many=True).data)

    def _update_fields(self, user, data):
        update_fields = []
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        email = data.get('email')
        status_val = data.get('status')
        if first_name is not None:
            user.first_name = first_name
            update_fields.append('first_name')
        if last_name is not None:
            user.last_name = last_name
            update_fields.append('last_name')
        if email is not None:
            user.email = email
            update_fields.append('email')
        if status_val is not None:
            user.status = status_val
            update_fields.append('status')
        if update_fields:
            user.save(update_fields=update_fields)
        return user

    def update(self, request, pk=None):
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(self.get_queryset(), pk=pk)
        # PUT semantics: apply all provided values (falling back to current)
        for field, value in request.data.items():
            if field in ('first_name', 'last_name', 'email', 'status'):
                setattr(user, field, value)
        user.save()
        return Response(self._serialize(user))

    def partial_update(self, request, pk=None):
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(self.get_queryset(), pk=pk)
        self._update_fields(user, request.data)
        return Response(self._serialize(user))

    def destroy(self, request, pk=None):
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(self.get_queryset(), pk=pk)
        user.is_active = False
        user.status = 'suspended'
        user.save(update_fields=['is_active', 'status'])
        return Response(status=204)

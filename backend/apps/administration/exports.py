"""Excel export views for reports."""
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import HasRolePermission
from apps.students.models import Student
from apps.administration.models import Invoice, Payment
from apps.flight_training.models import FlightLesson
from apps.core.models import AuditLog
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO


def _style_header(ws, headers, row=1):
    header_fill = PatternFill(start_color="0a1628", end_color="0a1628", fill_type="solid")
    header_font = Font(color="c4943c", bold=True, size=11)
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")


class ExportStudentsView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'students.export'

    def get(self, request):
        wb = Workbook()
        ws = wb.active
        ws.title = "Students"
        _style_header(ws, ["Student Number", "First Name", "Last Name", "Program", "Status", "Enrollment Date"])
        for i, s in enumerate(Student.objects.all(), 2):
            ws.cell(row=i, column=1, value=s.student_number)
            ws.cell(row=i, column=2, value=s.first_name)
            ws.cell(row=i, column=3, value=s.last_name)
            ws.cell(row=i, column=4, value=s.program)
            ws.cell(row=i, column=5, value=s.status)
            ws.cell(row=i, column=6, value=str(s.enrollment_date))
        buf = BytesIO()
        wb.save(buf)
        return HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            headers={"Content-Disposition": "attachment; filename=students.xlsx"})


class ExportInvoicesView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'invoices.export'

    def get(self, request):
        wb = Workbook()
        ws = wb.active
        ws.title = "Invoices"
        _style_header(ws, ["Invoice #", "Student", "Type", "Amount", "Currency", "Status", "Issued", "Due"])
        for i, inv in enumerate(Invoice.objects.select_related('student').all(), 2):
            ws.cell(row=i, column=1, value=inv.invoice_number)
            ws.cell(row=i, column=2, value=inv.student.full_name)
            ws.cell(row=i, column=3, value=inv.type or "")
            ws.cell(row=i, column=4, value=float(inv.amount))
            ws.cell(row=i, column=5, value=inv.currency)
            ws.cell(row=i, column=6, value=inv.status)
            ws.cell(row=i, column=7, value=str(inv.issued_at)[:10] if inv.issued_at else "")
            ws.cell(row=i, column=8, value=str(inv.due_at)[:10] if inv.due_at else "")
        buf = BytesIO()
        wb.save(buf)
        return HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            headers={"Content-Disposition": "attachment; filename=invoices.xlsx"})


class ExportFlightsView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flights.export'

    def get(self, request):
        wb = Workbook()
        ws = wb.active
        ws.title = "Flights"
        _style_header(ws, ["Date", "Student", "Instructor", "Aircraft", "Duration", "Status", "Grade", "Result"])
        for i, f in enumerate(FlightLesson.objects.select_related('student', 'instructor', 'aircraft').all(), 2):
            ws.cell(row=i, column=1, value=str(f.scheduled_date))
            ws.cell(row=i, column=2, value=f.student.full_name)
            ws.cell(row=i, column=3, value=f"{f.instructor.first_name} {f.instructor.last_name}")
            ws.cell(row=i, column=4, value=f.aircraft.registration)
            ws.cell(row=i, column=5, value=float(f.flight_duration) if f.flight_duration else 0)
            ws.cell(row=i, column=6, value=f.status)
            ws.cell(row=i, column=7, value=float(f.grade) if f.grade else "")
            ws.cell(row=i, column=8, value=f.result or "")
        buf = BytesIO()
        wb.save(buf)
        return HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            headers={"Content-Disposition": "attachment; filename=flights.xlsx"})


class ExportAuditLogsView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'audit.export'

    def get(self, request):
        wb = Workbook()
        ws = wb.active
        ws.title = "AuditLogs"
        _style_header(ws, ["Date", "User", "Action", "Entity", "Entity ID", "IP Address", "User Agent"])
        for i, log in enumerate(AuditLog.objects.select_related('user').all(), 2):
            ws.cell(row=i, column=1, value=str(log.created_at)[:19] if log.created_at else "")
            ws.cell(row=i, column=2, value=log.user.email if log.user else "")
            ws.cell(row=i, column=3, value=log.action)
            ws.cell(row=i, column=4, value=log.entity)
            ws.cell(row=i, column=5, value=str(log.entity_id) if log.entity_id else "")
            ws.cell(row=i, column=6, value=log.ip_address or "")
            ws.cell(row=i, column=7, value=str(log.user_agent or "")[:200])
        buf = BytesIO()
        wb.save(buf)
        return HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            headers={"Content-Disposition": "attachment; filename=audit_logs.xlsx"})


class ExportCertificatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.exams.models import Certificate
        from apps.students.models import Student

        # Students can only export their own certificates
        try:
            student = Student.objects.get(user=request.user)
            certificates = Certificate.objects.filter(student=student).select_related('student')
        except Student.DoesNotExist:
            # Admins/staff export all certificates
            certificates = Certificate.objects.select_related('student').all()

        wb = Workbook()
        ws = wb.active
        ws.title = "Certificates"
        _style_header(ws, ["Certificate #", "Student", "Type", "Title", "Program", "Issue Date", "Expiry Date", "Status"])
        for i, c in enumerate(certificates, 2):
            ws.cell(row=i, column=1, value=c.certificate_number or "")
            ws.cell(row=i, column=2, value=c.student.full_name)
            ws.cell(row=i, column=3, value=c.type or "")
            ws.cell(row=i, column=4, value=c.title or "")
            ws.cell(row=i, column=5, value=c.program or "")
            ws.cell(row=i, column=6, value=str(c.issue_date) if c.issue_date else "")
            ws.cell(row=i, column=7, value=str(c.expiry_date) if c.expiry_date else "")
            ws.cell(row=i, column=8, value=c.status or "")
        buf = BytesIO()
        wb.save(buf)
        return HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=certificates.xlsx"},
        )

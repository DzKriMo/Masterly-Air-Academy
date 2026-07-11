"""Excel export views for reports."""
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import HasRolePermission
from apps.students.models import Student
from apps.administration.models import Invoice, Payment
from apps.flight_training.models import FlightLesson
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_students(request):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_invoices(request):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_flights(request):
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

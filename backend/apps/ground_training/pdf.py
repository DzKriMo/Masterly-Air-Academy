"""PDF generation for attendance reports."""
from django.http import HttpResponse
from io import BytesIO
from .models import AttendanceRecord, Course


def generate_attendance_pdf(course_id):
    """Generate a PDF attendance report for a specific course."""
    course = Course.objects.get(id=course_id)
    records = AttendanceRecord.objects.filter(course=course).select_related('student')

    rows = ""
    for r in records:
        status_color = {"present": "#22c55e", "absent": "#ef4444", "late": "#f59e0b", "excused_absence": "#3b82f6"}.get(r.status, "#6b7280")
        rows += f"<tr><td>{r.student.full_name}</td><td>{r.student.student_number}</td><td style='color:{status_color};font-weight:bold'>{r.status.replace('_',' ').title()}</td><td>{r.notes or ''}</td></tr>"

    present = records.filter(status='present').count()
    total = records.count()
    rate = round((present / total * 100) if total > 0 else 0, 1)

    html = f"""<html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 1.5cm; }} body {{ font-family: sans-serif; }}
.header {{ border-bottom: 2px solid #c4943c; padding-bottom: 10px; margin-bottom: 20px; }}
.logo {{ font-size: 24px; color: #c4943c; font-weight: bold; }}
table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
th {{ background: #0a1628; color: #c4943c; padding: 8px; text-align: left; font-size: 11px; }}
td {{ padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }}
.stats {{ display: flex; gap: 20px; margin: 15px 0; }}
.stat {{ background: #f8f8f8; padding: 10px 20px; border-radius: 8px; }}
</style></head><body>
<div class="header"><div class="logo">MAA</div><div>Masterly Air Academy</div><h2>Attendance Report</h2></div>
<p><strong>Course:</strong> {course.title} ({course.subject.code})</p>
<p><strong>Date:</strong> {course.scheduled_date} | <strong>Room:</strong> {course.room.name if course.room else 'N/A'}</p>
<div class="stats"><div class="stat">Present: {present}/{total}</div><div class="stat">Rate: {rate}%</div></div>
<table><tr><th>Student</th><th>Number</th><th>Status</th><th>Notes</th></tr>{rows}</table>
</body></html>"""

    try:
        from weasyprint import HTML
        pdf = HTML(string=html).write_pdf()
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="attendance-{course.id[:8]}.pdf"'
        return resp
    except ImportError:
        return HttpResponse("PDF generation not available", status=501)

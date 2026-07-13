"""PDF generation for quality reports."""
from django.http import HttpResponse
from .models import Audit, NonConformity


def generate_audit_report_pdf(request, audit_id):
    audit = Audit.objects.get(id=audit_id)
    ncrs = NonConformity.objects.filter(audit=audit).select_related('responsible')

    ncr_rows = ""
    for n in ncrs:
        ncr_rows += f"<tr><td>{n.title}</td><td>{n.severity}</td><td>{n.status}</td><td>{n.responsible.email if n.responsible else 'N/A'}</td></tr>"

    html = f"""<html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 1.5cm; }} body {{ font-family: sans-serif; }}
.header {{ border-bottom: 2px solid #c4943c; padding-bottom: 10px; margin-bottom: 20px; }}
.logo {{ font-size: 24px; color: #c4943c; font-weight: bold; }}
table {{ width: 100%; border-collapse: collapse; }}
th {{ background: #0a1628; color: #c4943c; padding: 8px; text-align: left; font-size: 11px; }}
td {{ padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }}
</style></head><body>
<div class="header"><div class="logo">MAA</div><div>Masterly Air Academy</div><h2>Audit Report</h2></div>
<p><strong>Audit:</strong> {audit.title}</p><p><strong>Type:</strong> {audit.type} | <strong>Status:</strong> {audit.status}</p>
<p><strong>Scheduled:</strong> {audit.scheduled_date.strftime('%d/%m/%Y') if audit.scheduled_date else 'N/A'}</p>
<p><strong>Lead Auditor:</strong> {audit.lead_auditor.email if audit.lead_auditor else 'N/A'}</p>
<h3>Non-Conformities ({ncrs.count()})</h3>
<table><tr><th>Title</th><th>Severity</th><th>Status</th><th>Responsible</th></tr>{ncr_rows}</table>
</body></html>"""

    try:
        from weasyprint import HTML
        pdf = HTML(string=html).write_pdf()
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="audit-{str(audit_id)[:8]}.pdf"'
        return resp
    except ImportError:
        return HttpResponse("PDF generation not available", status=501)

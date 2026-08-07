"""PDF generation for quality reports."""
from django.http import HttpResponse
from django.utils.html import escape
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import HasRolePermission
from .models import Audit, NonConformity


class AuditReportPdfView(APIView):
    """Generate a PDF audit report."""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'

    def get(self, request, audit_id):
        try:
            audit = Audit.objects.get(id=audit_id)
        except Audit.DoesNotExist:
            return HttpResponse('Audit not found', status=404)
        ncrs = NonConformity.objects.filter(audit=audit).select_related('responsible')

        ncr_rows = ""
        for n in ncrs:
            ncr_rows += (
                f"<tr><td>{escape(n.title)}</td><td>{escape(n.severity)}</td>"
                f"<td>{escape(n.status)}</td>"
                f"<td>{escape(n.responsible.email) if n.responsible else 'N/A'}</td></tr>"
            )

        html = f"""<html><head><meta charset="utf-8"><style>
    @page {{ size: A4; margin: 1.5cm; }} body {{ font-family: sans-serif; }}
    .header {{ border-bottom: 2px solid #c4943c; padding-bottom: 10px; margin-bottom: 20px; }}
    .logo {{ font-size: 24px; color: #c4943c; font-weight: bold; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th {{ background: #0a1628; color: #c4943c; padding: 8px; text-align: left; font-size: 11px; }}
    td {{ padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }}
    </style></head><body>
    <div class="header"><div class="logo">MAA</div><div>Masterly Air Academy</div><h2>Audit Report</h2></div>
    <p><strong>Audit:</strong> {escape(audit.title)}</p><p><strong>Type:</strong> {escape(audit.type)} | <strong>Status:</strong> {escape(audit.status)}</p>
    <p><strong>Scheduled:</strong> {audit.scheduled_date.strftime('%d/%m/%Y') if audit.scheduled_date else 'N/A'}</p>
    <p><strong>Lead Auditor:</strong> {escape(audit.lead_auditor.email) if audit.lead_auditor else 'N/A'}</p>
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

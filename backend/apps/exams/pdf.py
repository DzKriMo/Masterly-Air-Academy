"""PDF generation for certificates using WeasyPrint."""

from django.http import HttpResponse
from io import BytesIO


def generate_certificate_pdf(certificate):
    """Generate a PDF certificate with academy branding."""
    html = f"""
    <html><head><meta charset="utf-8"><style>
      @page {{ size: A4 landscape; margin: 2cm; }}
      body {{ font-family: sans-serif; text-align: center; }}
      .border {{ border: 4px solid #c4943c; padding: 40px; height: 100%; }}
      .logo {{ font-size: 48px; color: #c4943c; font-weight: bold; margin-bottom: 20px; }}
      .title {{ font-size: 28px; color: #0a1628; margin-bottom: 10px; }}
      .name {{ font-size: 36px; font-weight: bold; margin: 30px 0 10px; }}
      .body {{ font-size: 16px; color: #333; margin: 20px 0; }}
      .footer {{ margin-top: 40px; font-size: 12px; color: #666; }}
      .cert-no {{ font-size: 10px; color: #999; }}
    </style></head><body>
      <div class="border">
        <div class="logo">MAA</div>
        <div class="title">Masterly Air Academy</div>
        <p style="font-size:12px;color:#888;">Approved Training Organization</p>
        <p style="font-size:22px;font-weight:bold;margin-top:30px;">Certificate of Completion</p>
        <p class="name">{certificate.student.full_name}</p>
        <p class="body">has successfully completed the <strong>{certificate.title or certificate.get_type_display()}</strong><br>
        in the <strong>{certificate.get_program_display()}</strong> program.</p>
        <p style="font-size:14px;">Issued: {certificate.issue_date.strftime('%d %B %Y')}</p>
        <p class="cert-no">Certificate No: {certificate.certificate_number}</p>
        <div class="footer">Masterly Air Academy | Approved Training Organization | Algeria</div>
      </div>
    </body></html>"""

    try:
        from weasyprint import HTML
        pdf = HTML(string=html).write_pdf()
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="certificate-{certificate.certificate_number}.pdf"'
        return response
    except ImportError:
        return HttpResponse("PDF generation not available", status=501)


def generate_invoice_pdf(invoice):
    """Generate a PDF invoice."""
    paid = sum(float(p.amount) for p in invoice.payments.all())
    balance = float(invoice.amount) - paid
    rows = ""
    for p in invoice.payments.all():
        rows += f"<tr><td>{p.paid_at.strftime('%d/%m/%Y')}</td><td>{p.method}</td><td>{p.reference or ''}</td><td style='text-align:right'>{p.amount:,.2f} {invoice.currency}</td></tr>"

    html = f"""
    <html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 2cm; }}
      body {{ font-family: sans-serif; }}
      .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #c4943c; padding-bottom: 15px; margin-bottom: 20px; }}
      .logo {{ font-size: 28px; color: #c4943c; font-weight: bold; }}
      table {{ width: 100%; border-collapse: collapse; }}
      th {{ background: #f5f5f5; padding: 8px; text-align: left; font-size: 12px; }}
      td {{ padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }}
      .total {{ font-size: 16px; font-weight: bold; margin-top: 20px; text-align: right; }}
    </style></head><body>
      <div class="header"><div><div class="logo">MAA</div><div>Masterly Air Academy</div></div><div style="text-align:right"><h2>INVOICE</h2><p>#{invoice.invoice_number}<br>Date: {invoice.issued_at.strftime('%d/%m/%Y') if invoice.issued_at else 'N/A'}<br>Due: {invoice.due_at.strftime('%d/%m/%Y') if invoice.due_at else 'N/A'}</p></div></div>
      <p><strong>Student:</strong> {invoice.student.full_name} ({invoice.student.student_number})</p>
      <p><strong>Description:</strong> {invoice.description or 'N/A'}</p>
      <h3>Payment History</h3>
      <table><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr>{rows}</table>
      <div class="total">Total: {invoice.amount:,.2f} {invoice.currency} | Paid: {paid:,.2f} {invoice.currency} | Balance: {balance:,.2f} {invoice.currency}</div>
    </body></html>"""

    try:
        from weasyprint import HTML
        pdf = HTML(string=html).write_pdf()
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="invoice-{invoice.invoice_number}.pdf"'
        return response
    except ImportError:
        return HttpResponse("PDF generation not available", status=501)

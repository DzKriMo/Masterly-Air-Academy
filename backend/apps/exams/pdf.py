"""PDF generation for certificates using WeasyPrint with QR code + logo."""

import base64
import io
import os
from django.http import HttpResponse
from django.conf import settings


def _logo_base64():
    """Return the academy logo as a resized base64 data URI for embedding in HTML."""
    logo_paths = [
        os.path.join(settings.BASE_DIR, 'logo.png'),
        '/app/logo.png',
    ]
    for path in logo_paths:
        if os.path.exists(path):
            try:
                from PIL import Image
                img = Image.open(path).convert('RGBA')
                # Create white background for the transparent logo
                bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
                bg.paste(img, (0, 0), img)
                # Resize to a good display size
                bg.thumbnail((300, 300), Image.LANCZOS)
                buf = io.BytesIO()
                bg.save(buf, format='PNG', optimize=True)
                return base64.b64encode(buf.getvalue()).decode()
            except Exception:
                with open(path, 'rb') as f:
                    return base64.b64encode(f.read()).decode()
    return None


def _generate_qr_data_url(url: str) -> str:
    """Generate a QR code PNG as a base64 data URI."""
    try:
        import qrcode
        from qrcode.image.styledpil import StyledPilImage
        from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

        qr = qrcode.QRCode(box_size=3, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            fill_color='#0a1628',
            back_color='white',
        )
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        # Fallback: basic QR without styling
        import qrcode as qr_basic
        qr = qr_basic.QRCode(box_size=3, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='#0a1628', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()


def generate_certificate_pdf(certificate):
    """Generate a beautifully formatted PDF certificate with logo, QR code, and decorated border."""

    logo_b64 = _logo_base64()
    verify_url = f"{settings.SITE_URL}/verify-certificate?number={certificate.certificate_number}"
    qr_b64 = _generate_qr_data_url(verify_url)

    logo_img = f'<img src="data:image/png;base64,{logo_b64}" width="70" height="70" style="display:block;margin:0 auto 4px;" />' if logo_b64 else '<div style="font-size:26px;color:#c4943c;font-weight:bold;">MAA</div>'
    qr_img = f'<img src="data:image/png;base64,{qr_b64}" width="25" height="25" style="display:block;" />' if qr_b64 else ''

    program_names = {'PPL': 'Private Pilot License', 'CPL': 'Commercial Pilot License', 'IR': 'Instrument Rating', 'MEP': 'Multi-Engine Piston', 'MCC': 'Multi-Crew Cooperation'}
    program_name = program_names.get(certificate.program, certificate.program or '')

    html = f"""<html><head><meta charset="utf-8"><style>
  @page {{ size: A4 landscape; margin: 0.8cm; }}
  body {{ font-family: Georgia, 'Times New Roman', serif; text-align: center; color: #1a1a2e; background: #fafaf8; margin: 0; }}
  .outer {{ border: 3px double #c4943c; padding: 4px; }}
  .inner {{ border: 2px solid #c4943c; padding: 10px 24px; }}
  .academy {{ font-size: 20px; color: #c4943c; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }}
  .ato {{ font-size: 8px; color: #888; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }}
  .title {{ font-size: 24px; font-weight: bold; color: #0a1628; margin: 4px 0 2px; }}
  .ornament {{ color: #c4943c; font-size: 10px; letter-spacing: 5px; margin: 1px 0; }}
  .body {{ font-size: 13px; color: #444; line-height: 1.3; margin: 3px 0; }}
  .name {{ font-size: 26px; font-weight: bold; color: #c4943c; margin: 2px 0; font-style: italic; }}
  .program {{ font-size: 14px; color: #0a1628; font-weight: bold; margin: 2px 0; }}
  .row {{ display: flex; justify-content: center; gap: 45px; margin-top: 8px; }}
  .lbl {{ font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 2px; }}
  .val {{ font-size: 12px; color: #0a1628; font-weight: bold; }}
  .sig {{ font-family: 'Brush Script MT', cursive; font-size: 20px; color: #0a1628; }}
  .bot {{ display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; }}
  .cn {{ font-size: 7px; color: #999; }}
  .ft {{ font-size: 6px; color: #bbb; }}
  .qr {{ text-align: right; }}
  .qr img {{ display: inline-block; }}
</style></head><body>
<div class="outer"><div class="inner">

  <div class="logo">{logo_img}</div>
  <div class="academy">Masterly Air Academy</div>
  <div class="ato">Approved Training Organization</div>
  <div class="title">Certificate of Completion</div>
  <div class="ornament">&#9670; &#9670; &#9670;</div>
  <div class="body">This is to certify that</div>
  <div class="name">{certificate.student.full_name}</div>
  <div class="body">has successfully completed the</div>
  <div class="program">{program_name} ({certificate.program})</div>
  <div class="body">in accordance with the approved training programme of Masterly Air Academy.</div>

  <div class="row">
    <div><div class="lbl">Certificate Number</div><div class="val" style="color:#c4943c;">{certificate.certificate_number}</div></div>
    <div><div class="lbl">Date of Issue</div><div class="val">{certificate.issue_date.strftime('%d %B %Y')}</div></div>
  </div>
  <div class="row">
    <div><div class="lbl">Head of Training</div><div class="sig">_________________</div></div>
  </div>

  <div class="bot">
    <div><div class="cn">Certificate No: {certificate.certificate_number}</div><div class="ft">Masterly Air Academy — Approved Training Organization — Algeria</div></div>
    <div class="qr">{qr_img}<div style="font-size:6px;color:#999;">Verify</div></div>
  </div>

</div></div>
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
        rows += f"<tr><td>{p.paid_at.strftime('%d/%m/%Y') if p.paid_at else 'N/A'}</td><td>{p.method or ''}</td><td>{p.reference or ''}</td><td style='text-align:right'>{p.amount:,.2f} {invoice.currency}</td></tr>"

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

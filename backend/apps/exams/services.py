"""Exam auto-grading and certificate services."""


class AutoGradingService:
    """Handles automatic grading of QCM/quiz answers."""

    @staticmethod
    def grade_exam(exam, answers, question_ids=None):
        from .models import QuestionBank
        if question_ids:
            questions = QuestionBank.objects.filter(id__in=question_ids)
        else:
            questions = QuestionBank.objects.filter(subject=exam.subject)[:exam.question_count or 20]
        if not questions.exists():
            return {'score': 0, 'total': 0, 'percentage': 0, 'is_passed': False, 'details': []}

        correct = 0
        details = []
        for q in questions:
            given = answers.get(str(q.id), '')
            is_correct = str(given).strip().lower() == str(q.correct_answer).strip().lower()
            if is_correct:
                correct += 1
            details.append({
                'question_id': str(q.id),
                'question': q.question_text[:100],
                'your_answer': given,
                'correct_answer': q.correct_answer,
                'is_correct': is_correct,
            })

        total = questions.count()
        percentage = round((correct / total) * 100, 1) if total > 0 else 0
        is_passed = percentage >= float(exam.passing_grade) if exam.passing_grade else percentage >= 70

        return {
            'score': correct,
            'total': total,
            'percentage': percentage,
            'is_passed': is_passed,
            'passing_grade': float(exam.passing_grade) if exam.passing_grade else 70,
            'details': details,
        }

    @staticmethod
    def grade_quiz(quiz, answers):
        from .models import QuestionBank
        questions = QuestionBank.objects.filter(subject__modules=quiz.module)[:10]
        if not questions.exists():
            return {'score': 0, 'total': 0, 'percentage': 0, 'is_passed': False}

        correct = 0
        for q in questions:
            given = answers.get(str(q.id), '')
            if str(given).strip().lower() == str(q.correct_answer).strip().lower():
                correct += 1

        total = questions.count()
        percentage = round((correct / total) * 100, 1) if total > 0 else 0
        is_passed = percentage >= float(quiz.passing_grade) if quiz.passing_grade else percentage >= 70

        return {'score': correct, 'total': total, 'percentage': percentage, 'is_passed': is_passed}


class CertificateService:
    """Certificate generation (PDF placeholder for now)."""

    @staticmethod
    def generate_certificate_number(program, student_number):
        import uuid
        suffix = str(uuid.uuid4())[:8].upper()
        return f'MAA-{program}-{student_number}-{suffix}'

    @staticmethod
    def issue_certificate(student, program, cert_type, title='Certificate of Completion'):
        from .models import Certificate
        from django.utils import timezone
        from django.conf import settings
        import os

        cert = Certificate.objects.create(
            student=student,
            certificate_number=CertificateService.generate_certificate_number(program, student.student_number),
            type=cert_type,
            title=title,
            program=program,
            issue_date=timezone.now().date(),
            status='issued',
        )

        # Generate QR code data
        verify_url = f"http://localhost/verify-certificate?number={cert.certificate_number}"
        try:
            from apps.exams.pdf import _generate_qr_data_url
            cert.qr_code = _generate_qr_data_url(verify_url)
        except Exception:
            cert.qr_code = verify_url

        # Generate PDF and save to media/certificates/
        try:
            from weasyprint import HTML
            from apps.exams.pdf import _logo_base64

            logo_b64 = _logo_base64()
            program_names = {'PPL': 'Private Pilot License', 'CPL': 'Commercial Pilot License', 'IR': 'Instrument Rating', 'MEP': 'Multi-Engine Piston', 'MCC': 'Multi-Crew Cooperation'}
            program_name = program_names.get(cert.program, cert.program or '')

            qr_img = f'<img src="data:image/png;base64,{cert.qr_code}" width="25" height="25" style="display:block;" />' if cert.qr_code else ''
            logo_img = f'<img src="data:image/png;base64,{logo_b64}" width="70" height="70" style="display:block;margin:0 auto 4px;" />' if logo_b64 else '<div style="font-size:26px;color:#c4943c;font-weight:bold;">MAA</div>'

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
          <div class="name">{cert.student.full_name}</div>
          <div class="body">has successfully completed the</div>
          <div class="program">{program_name} ({cert.program})</div>
          <div class="body">in accordance with the approved training programme of Masterly Air Academy.</div>
          <div class="row">
            <div><div class="lbl">Certificate Number</div><div class="val" style="color:#c4943c;">{cert.certificate_number}</div></div>
            <div><div class="lbl">Date of Issue</div><div class="val">{cert.issue_date.strftime('%d %B %Y')}</div></div>
          </div>
          <div class="row">
            <div><div class="lbl">Head of Training</div><div class="sig">_________________</div></div>
          </div>
          <div class="bot">
            <div><div class="cn">Certificate No: {cert.certificate_number}</div><div class="ft">Masterly Air Academy — Approved Training Organization — Algeria</div></div>
            <div class="qr">{qr_img}<div style="font-size:6px;color:#999;">Verify</div></div>
          </div>
        </div></div>
        </body></html>"""

            pdf_bytes = HTML(string=html).write_pdf()

            cert_dir = os.path.join(settings.MEDIA_ROOT, 'certificates')
            os.makedirs(cert_dir, exist_ok=True)
            filename = f'{cert.certificate_number}.pdf'
            filepath = os.path.join(cert_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(pdf_bytes)

            cert.file_url = f'{settings.MEDIA_URL}certificates/{filename}'
        except Exception:
            cert.file_url = None

        cert.save(update_fields=['file_url', 'qr_code'])
        return cert

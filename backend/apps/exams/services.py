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
    def grade_quiz(quiz, answers, question_ids=None):
        from .models import QuestionBank
        if question_ids:
            questions = QuestionBank.objects.filter(id__in=question_ids)
        else:
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

        # Generate QR code data using the site URL
        verify_url = f"{settings.SITE_URL}/verify-certificate?number={cert.certificate_number}"
        try:
            from apps.exams.pdf import _generate_qr_data_url
            cert.qr_code = _generate_qr_data_url(verify_url)
        except Exception:
            cert.qr_code = verify_url

        # Generate PDF and save to media/certificates/
        try:
            from apps.exams.pdf import _render_certificate
            pdf_bytes = _render_certificate(cert)

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

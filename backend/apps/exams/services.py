"""Exam auto-grading and certificate services."""

import re
import time as _time
from collections import Counter
from datetime import datetime

SERIOUS_VIOLATION_TYPES = {
    'tab_switch', 'window_blur', 'fullscreen_exit',
    'copy_paste', 'right_click', 'devtools', 'auto_submit',
}

VIOLATION_TYPES = SERIOUS_VIOLATION_TYPES | {'blur', 'visibility'}


def sanitize_violations(violations, started_at, submitted_at):
    """Validate a client-attested anti-cheat violation list server-side.

    Returns ``(safe, serious_count, suspicious)``.

    - Entries that are not dicts, use unknown types, or carry timestamps
      outside the exam window ``[started_at, submitted_at]`` are dropped
      (they cannot be real — they would have to be forged).
    - ``serious_count`` is the count of recognized cheating types computed
      independently of anything the client claimed.
    - ``suspicious`` is set when the payload shows signs of tampering:
      out-of-window timestamps, unknown/malformed entries, duplicate
      (type, timestamp) pairs, or an implausible burst of violations within
      the same second.
    """
    if not isinstance(violations, list):
        return [], 0, False

    start_ts = _parse_dt_ts(started_at)
    end_ts = _parse_dt_ts(submitted_at)

    safe = []
    seen = set()
    timestamps = []
    suspicious = False

    for v in violations:
        if not isinstance(v, dict):
            suspicious = True
            continue
        vtype = v.get('type')
        if vtype not in VIOLATION_TYPES:
            continue
        at_raw = v.get('at')
        ts = _parse_iso_ts(at_raw)
        if ts is None:
            suspicious = True
            continue
        if start_ts is not None and ts < start_ts:
            suspicious = True
            continue
        if end_ts is not None and ts > end_ts:
            suspicious = True
            continue
        key = (vtype, at_raw)
        if key in seen:
            suspicious = True
            continue
        seen.add(key)
        timestamps.append(ts)
        safe.append({'type': vtype, 'at': at_raw})

    if len(timestamps) >= 3:
        burst = max(Counter(int(ts) for ts in timestamps).values())
        if burst >= 3:
            suspicious = True

    serious_count = sum(1 for v in safe if v['type'] in SERIOUS_VIOLATION_TYPES)
    return safe, serious_count, suspicious


def _parse_iso_ts(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
    except (ValueError, TypeError):
        return None


def _parse_dt_ts(value):
    if value is None:
        return None
    try:
        return value.timestamp()
    except (AttributeError, ValueError):
        return _parse_iso_ts(str(value))


class AutoGradingService:
    """Handles automatic grading of QCM/quiz answers."""

    _WHITESPACE_RE = re.compile(r'\s+')
    _TRAILING_PUNCT_RE = re.compile(r'[.\s]+$')

    @staticmethod
    def _normalize(value):
        """Normalize a free-text answer for lenient comparison."""
        if value is None:
            return ''
        text = str(value).strip().lower()
        text = AutoGradingService._WHITESPACE_RE.sub(' ', text)
        text = AutoGradingService._TRAILING_PUNCT_RE.sub('', text)
        return text

    @staticmethod
    def grade_exam(exam, answers, question_ids=None):
        from .models import QuestionBank
        if question_ids:
            questions = QuestionBank.objects.filter(id__in=question_ids).order_by('id')
        else:
            count = exam.question_count
            if count:
                questions = QuestionBank.objects.filter(subject=exam.subject).order_by('id')[:count]
            else:
                questions = QuestionBank.objects.filter(subject=exam.subject).order_by('id')
        if not questions.exists():
            return {'score': 0, 'total': 0, 'percentage': 0, 'is_passed': False, 'details': []}

        correct = 0
        details = []
        for q in questions:
            given = answers.get(str(q.id), '')
            is_correct = AutoGradingService._normalize(given) == AutoGradingService._normalize(q.correct_answer)
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
        passing_grade = float(exam.passing_grade) if exam.passing_grade is not None else 70
        is_passed = percentage >= passing_grade

        return {
            'score': correct,
            'total': total,
            'percentage': percentage,
            'is_passed': is_passed,
            'passing_grade': passing_grade,
            'details': details,
        }

    @staticmethod
    def grade_quiz(quiz, answers, question_ids=None):
        from .models import QuestionBank
        if question_ids:
            questions = QuestionBank.objects.filter(id__in=question_ids).order_by('id')
        else:
            questions = QuestionBank.objects.filter(subject__modules=quiz.module).order_by('id')[:10]
        if not questions.exists():
            return {'score': 0, 'total': 0, 'percentage': 0, 'is_passed': False}

        correct = 0
        for q in questions:
            given = answers.get(str(q.id), '')
            if AutoGradingService._normalize(given) == AutoGradingService._normalize(q.correct_answer):
                correct += 1

        total = questions.count()
        percentage = round((correct / total) * 100, 1) if total > 0 else 0
        passing_grade = float(quiz.passing_grade) if quiz.passing_grade is not None else 70
        is_passed = percentage >= passing_grade

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

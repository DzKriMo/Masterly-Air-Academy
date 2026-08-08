"""
Tests for the final-exam anti-cheat pipeline (submit + real-time heartbeat).

Verifies:
- violations are persisted server-side via /api/exam/heartbeat/
- duplicate (type, at) violations are deduplicated
- an assignment is flagged at 2 serious violations
- an assignment is force-submitted at 3 serious violations
- exam_submit persists violations and flags at 2 serious violations
- the per-student printable report renders answers and scores
"""
import datetime
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.exams.final_models import (
    FinalExam, FinalExamAssignment, FinalExamQuestion,
)
from apps.ground_training.models import Module


@pytest.fixture
def final_module(db, subject):
    return Module.objects.create(
        subject=subject, title='Module 1', duration=10, order=1,
    )


@pytest.fixture
def final_questions(db, subject, final_module):
    q1 = FinalExamQuestion.objects.create(
        subject=subject, module=final_module,
        question_text='Q1', question_type='mcq',
        points=Decimal('1.00'), options=['A', 'B'], correct_answer='A',
    )
    q2 = FinalExamQuestion.objects.create(
        subject=subject, module=final_module,
        question_text='Q2', question_type='true_false',
        points=Decimal('2.00'), options=['True', 'False'], correct_answer='True',
    )
    return [q1, q2]


@pytest.fixture
def final_exam(db, subject, user_admin, student_profile):
    return FinalExam.objects.create(
        subject=subject, title='PPL Final', created_by=user_admin,
        duration_minutes=120,
    )


@pytest.fixture
def assignment(db, final_exam, student_profile, final_questions):
    now = timezone.now()
    a = FinalExamAssignment.objects.create(
        exam=final_exam, student=student_profile,
        questions=[str(q.id) for q in final_questions],
        status='in_progress', started_at=now,
    )
    a.started_at = now
    a.save()
    return a


def _ts():
    return timezone.now().isoformat()


def test_heartbeat_persists_and_dedupes(api_client, assignment):
    v1 = {'type': 'tab_switch', 'at': _ts()}
    resp = api_client.post('/api/exam/heartbeat/', {
        'access_code': assignment.access_code,
        'violations': [v1, v1],
        'answers': {},
    }, format='json')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'in_progress'
    assert data['auto_submitted'] is False
    assert data['is_flagged'] is False
    assert len(data['violations']) == 1

    assignment.refresh_from_db()
    assert len(assignment.violations) == 1


def test_heartbeat_flags_at_two_serious(api_client, assignment):
    api_client.post('/api/exam/heartbeat/', {
        'access_code': assignment.access_code,
        'violations': [{'type': 'tab_switch', 'at': _ts()}],
    }, format='json')

    resp = api_client.post('/api/exam/heartbeat/', {
        'access_code': assignment.access_code,
        'violations': [{'type': 'window_blur', 'at': _ts()}],
    }, format='json')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'in_progress'
    assert data['is_flagged'] is True
    assert len(data['violations']) == 2

    assignment.refresh_from_db()
    assert assignment.is_flagged is True


def test_heartbeat_force_submits_at_three(api_client, assignment, final_questions):
    for i in range(3):
        api_client.post('/api/exam/heartbeat/', {
            'access_code': assignment.access_code,
            'violations': [{'type': 'tab_switch', 'at': _ts(), 'n': i}],
        }, format='json')

    assignment.refresh_from_db()
    assert assignment.status == 'submitted'
    assert assignment.is_flagged is True
    types = [v['type'] for v in assignment.violations]
    assert types.count('tab_switch') == 3
    assert 'auto_submit' in types

    # A heartbeat on an already-submitted exam is a no-op.
    resp = api_client.post('/api/exam/heartbeat/', {
        'access_code': assignment.access_code,
        'violations': [{'type': 'devtools', 'at': _ts()}],
    }, format='json')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'submitted'
    assert resp.json()['auto_submitted'] is False


def test_heartbeat_persists_answers(api_client, assignment, final_questions):
    qid = str(final_questions[0].id)
    resp = api_client.post('/api/exam/heartbeat/', {
        'access_code': assignment.access_code,
        'answers': {qid: 'A'},
    }, format='json')
    assert resp.status_code == 200
    assignment.refresh_from_db()
    assert assignment.answers == {qid: 'A'}


def test_submit_persists_violations_and_grades(api_client, assignment, final_questions):
    q1, q2 = final_questions
    resp = api_client.post('/api/exam/submit/', {
        'access_code': assignment.access_code,
        'answers': {str(q1.id): 'A', str(q2.id): 'True'},
        'violations': [
            {'type': 'tab_switch', 'at': _ts()},
            {'type': 'copy_paste', 'at': _ts()},
        ],
    }, format='json')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'submitted'
    assert data['correct'] == 2
    assert data['total_auto_graded'] == 2
    assert data['score'] == 100.0

    assignment.refresh_from_db()
    assert assignment.status == 'submitted'
    assert assignment.is_flagged is True
    assert len(assignment.violations) == 2


def test_submit_one_serious_violation_not_flagged(api_client, assignment, final_questions):
    q1, q2 = final_questions
    resp = api_client.post('/api/exam/submit/', {
        'access_code': assignment.access_code,
        'answers': {str(q1.id): 'A', str(q2.id): 'True'},
        'violations': [{'type': 'window_blur', 'at': _ts()}],
    }, format='json')
    assert resp.status_code == 200
    assignment.refresh_from_db()
    assert assignment.is_flagged is False
    assert len(assignment.violations) == 1


def test_exam_access_returns_server_remaining_seconds(api_client, assignment):
    """Remaining time is server-authoritative, so a skewed device clock can
    never stretch or shrink the countdown."""
    resp = api_client.post('/api/exam/access/', {
        'access_code': assignment.access_code,
    }, format='json')
    assert resp.status_code == 200
    data = resp.json()
    assert 'remaining_seconds' in data
    assert 120 * 60 - 60 <= data['remaining_seconds'] <= 120 * 60
    assert data['duration_minutes'] == 120

    hb = api_client.post('/api/exam/heartbeat/', {
        'access_code': assignment.access_code,
    }, format='json')
    assert hb.status_code == 200
    assert 'remaining_seconds' in hb.json()
    assert 0 <= hb.json()['remaining_seconds'] <= data['remaining_seconds']


def test_exam_status_returns_remaining_seconds(api_client, assignment):
    resp = api_client.get(f'/api/exam/status/{assignment.access_code}/')
    assert resp.status_code == 200
    data = resp.json()
    assert 'remaining_seconds' in data
    assert 0 <= data['remaining_seconds'] <= 120 * 60


def test_student_report_html(api_client, assignment, final_questions, user_admin):
    q1, q2 = final_questions
    api_client.post('/api/exam/submit/', {
        'access_code': assignment.access_code,
        'answers': {str(q1.id): 'A', str(q2.id): 'False'},
        'violations': [
            {'type': 'tab_switch', 'at': _ts()},
            {'type': 'devtools', 'at': _ts()},
        ],
    }, format='json')

    api_client.force_authenticate(user=user_admin)
    resp = api_client.get(
        f'/api/final-exams/{assignment.exam.id}/assignments/{assignment.id}/report/'
    )
    assert resp.status_code == 200
    body = resp.content.decode('utf-8')
    assert 'Student Exam Report' in body
    assert 'Q1' in body
    assert 'Incorrect' in body
    assert 'FLAGGED' in body
    assert 'John' in body

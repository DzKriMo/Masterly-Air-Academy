"""
Tests for the auto-grading service.

Covers MCQ answer evaluation, scoring, and pass/fail determination
for both exams and quizzes.
"""
import pytest
from apps.exams.services import AutoGradingService


@pytest.mark.django_db
class TestAutoGrading:
    """Automatic grading for MCQ-based exams."""

    # ------------------------------------------------------------------
    # Individual answer correctness
    # ------------------------------------------------------------------

    def test_mcq_correct_answer(self, exam, exam_questions):
        """A correct answer is counted as correct."""
        q1, q2 = exam_questions
        answers = {
            str(q1.id): q1.correct_answer,
            str(q2.id): q2.correct_answer,
        }
        result = AutoGradingService.grade_exam(exam, answers)
        assert result['score'] == 2
        assert result['total'] == 2
        assert result['percentage'] == 100.0

    def test_mcq_incorrect_answer(self, exam, exam_questions):
        """An incorrect answer is counted as wrong."""
        q1, q2 = exam_questions
        answers = {
            str(q1.id): 'Wrong answer',
            str(q2.id): 'Also wrong',
        }
        result = AutoGradingService.grade_exam(exam, answers)
        assert result['score'] == 0
        assert result['total'] == 2
        assert result['percentage'] == 0.0

    def test_mcq_partial_correct(self, exam, exam_questions):
        """Half correct answers yield a 50 % score."""
        q1, q2 = exam_questions
        answers = {
            str(q1.id): q1.correct_answer,   # correct
            str(q2.id): 'Wrong answer',       # incorrect
        }
        result = AutoGradingService.grade_exam(exam, answers)
        assert result['score'] == 1
        assert result['total'] == 2
        assert result['percentage'] == 50.0

    # ------------------------------------------------------------------
    # Pass / fail boundaries
    # ------------------------------------------------------------------

    def test_calculates_pass_fail(self, exam, exam_questions):
        """Pass is determined by the exam's passing_grade threshold."""
        q1, q2 = exam_questions
        # passing_grade = 70, so 1/2 = 50 % => fail
        answers = {
            str(q1.id): q1.correct_answer,
            str(q2.id): 'Wrong answer',
        }
        result = AutoGradingService.grade_exam(exam, answers)
        assert result['is_passed'] is False
        assert result['percentage'] == 50.0
        assert result['passing_grade'] == 70.0

    def test_passing_score_above_threshold(self, exam, exam_questions):
        """Score above the passing_grade marks is_passed = True."""
        q1, q2 = exam_questions
        answers = {
            str(q1.id): q1.correct_answer,
            str(q2.id): q2.correct_answer,
        }
        result = AutoGradingService.grade_exam(exam, answers)
        assert result['is_passed'] is True
        assert result['percentage'] >= result['passing_grade']

    # ------------------------------------------------------------------
    # Edge cases
    # ------------------------------------------------------------------

    def test_empty_answers(self, exam, exam_questions):
        """Empty answer dict results in 0 % score."""
        result = AutoGradingService.grade_exam(exam, {})
        assert result['score'] == 0
        assert result['total'] == 2
        assert result['percentage'] == 0.0
        assert result['is_passed'] is False

    def test_no_questions_in_bank(self, subject):
        """An exam with no associated questions gets 0 across the board."""
        from apps.exams.models import Exam
        empty_exam = Exam.objects.create(
            code='EMPTY-EXAM',
            title='Empty Exam',
            subject=subject,
            duration=30,
            question_count=10,
        )
        result = AutoGradingService.grade_exam(empty_exam, {})
        assert result['score'] == 0
        assert result['total'] == 0
        assert result['percentage'] == 0
        assert result['is_passed'] is False

    def test_case_insensitive_answer_matching(self, exam, exam_questions):
        """Answer comparison is case-insensitive."""
        q1, q2 = exam_questions
        # Provide the correct answer with different casing
        answers = {
            str(q1.id): '1013.25 HPA',        # stored as '1013.25 hPa'
            str(q2.id): 'visual flight rules',  # stored as 'Visual Flight Rules'
        }
        result = AutoGradingService.grade_exam(exam, answers)
        assert result['score'] == 2
        assert result['percentage'] == 100.0

    def test_detail_includes_question_info(self, exam, exam_questions):
        """The details list contains per-question metadata."""
        q1, q2 = exam_questions
        answers = {str(q1.id): q1.correct_answer, str(q2.id): 'Nonsense'}
        result = AutoGradingService.grade_exam(exam, answers)
        assert len(result['details']) == 2
        d1 = result['details'][0]
        assert d1['question_id'] == str(q1.id)
        assert d1['is_correct'] is True
        d2 = result['details'][1]
        assert d2['question_id'] == str(q2.id)
        assert d2['is_correct'] is False


@pytest.mark.django_db
class TestAutoGradingQuiz:
    """Automatic grading for quiz attempts (simpler path)."""

    def test_quiz_correct_answers(self, subject):
        """Quiz grading with all correct answers passes."""
        from apps.ground_training.models import Module
        from apps.exams.models import QuestionBank, Quiz

        module = Module.objects.create(
            subject=subject, title='Test Module',
            duration=10, order=1,
        )
        quiz = Quiz.objects.create(
            module=module, title='Test Quiz',
            passing_grade=70.0,
        )

        q1 = QuestionBank.objects.create(
            subject=subject,
            question_text='Sample Q1',
            question_type='mcq',
            correct_answer='A',
            difficulty='easy',
        )
        q2 = QuestionBank.objects.create(
            subject=subject,
            question_text='Sample Q2',
            question_type='mcq',
            correct_answer='B',
            difficulty='easy',
        )

        answers = {str(q1.id): 'A', str(q2.id): 'B'}
        result = AutoGradingService.grade_quiz(quiz, answers)
        assert result['score'] == 2
        assert result['is_passed'] is True
        assert result['percentage'] == 100.0

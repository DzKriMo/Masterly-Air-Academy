"""
Tests for bulk question import (CSV/XLSX) and template generation.
"""
import csv
import io

import pytest

from apps.exams.models import QuestionBank
from apps.exams.bulk_import import import_questions, generate_template


def _csv_file(rows, name='questions.csv'):
    buf = io.StringIO()
    writer = csv.writer(buf)
    for row in rows:
        writer.writerow(row)
    file = io.BytesIO(buf.getvalue().encode('utf-8-sig'))
    file.name = name
    return file


@pytest.mark.django_db
class TestBulkImport:
    def test_import_creates_valid_questions(self, subject):
        """Valid CSV rows are imported and linked to the subject."""
        file = _csv_file([
            ['question_text', 'question_type', 'difficulty', 'program', 'subject_code', 'options', 'correct_answer'],
            ['What is 2+2?', 'mcq', 'easy', 'PPL', subject.code, '2|4|6', '4'],
            ['True or false: 5 > 3', 'true_false', 'medium', 'PPL', '', 'True|False', 'True'],
        ])
        result = import_questions(file)
        assert result['created'] == 2
        assert result['errors'] == []
        q = QuestionBank.objects.get(question_text='What is 2+2?')
        assert q.subject == subject
        assert q.question_type == 'mcq'
        assert q.difficulty == 'easy'
        assert q.options == ['2', '4', '6']
        assert q.correct_answer == '4'

    def test_import_reports_row_errors(self):
        """Invalid rows are skipped and reported, not imported."""
        file = _csv_file([
            ['question_text', 'question_type', 'difficulty', 'options', 'correct_answer'],
            ['No difficulty?', 'mcq', 'veryhard', 'A|B', 'A'],
            ['Missing answer', 'mcq', 'easy', 'A|B', ''],
            ['Good row', 'mcq', 'hard', 'A|B', 'A'],
        ])
        result = import_questions(file)
        assert result['created'] == 1
        assert result['skipped'] == 2
        assert len(result['errors']) == 2
        messages = ' '.join(e['message'] for e in result['errors'])
        assert 'difficulty' in messages
        assert 'correct_answer' in messages

    def test_import_rejects_missing_header(self):
        """A file without a question_text column is rejected."""
        file = _csv_file([
            ['foo', 'bar'],
            ['x', 'y'],
        ])
        result = import_questions(file)
        assert result['created'] == 0
        assert 'question_text' in result['errors'][0]['message']

    def test_import_empty_file(self):
        """An empty file is handled gracefully."""
        file = _csv_file([])
        result = import_questions(file)
        assert result['created'] == 0
        assert len(result['errors']) == 1

    def test_import_accepts_human_readable_type(self):
        """Common labels like 'Multiple Choice' map to the canonical type."""
        file = _csv_file([
            ['question_text', 'question_type', 'options', 'correct_answer'],
            ['Pick one', 'Multiple Choice', 'A|B', 'B'],
        ])
        result = import_questions(file)
        assert result['created'] == 1
        q = QuestionBank.objects.get(question_text='Pick one')
        assert q.question_type == 'mcq'


class TestTemplate:
    def test_csv_template(self):
        data = generate_template('csv')
        text = data.decode('utf-8-sig')
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        assert rows[0][0] == 'Question Text'
        assert len(rows[1]) == len(rows[0])

    def test_xlsx_template(self):
        data = generate_template('xlsx')
        assert data.startswith(b'PK')

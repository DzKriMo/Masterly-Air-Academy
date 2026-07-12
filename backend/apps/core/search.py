"""Meilisearch indexing and search operations."""
from django.conf import settings
import logging

logger = logging.getLogger("masterly.search")

try:
    import meilisearch
    client = meilisearch.Client(settings.MEILISEARCH_HOST, settings.MEILISEARCH_API_KEY)
    MEILI_AVAILABLE = True
except Exception:
    MEILI_AVAILABLE = False
    logger.warning("Meilisearch not available, using DB fallback")


def index_student(student):
    if not MEILI_AVAILABLE: return
    try:
        client.index('students').add_documents([{
            'id': str(student.id), 'student_number': student.student_number,
            'first_name': student.first_name, 'last_name': student.last_name,
            'full_name': student.full_name, 'program': student.program, 'status': student.status,
        }])
    except Exception as e:
        logger.error(f"Index student error: {e}")


def index_course(course):
    if not MEILI_AVAILABLE: return
    try:
        client.index('courses').add_documents([{
            'id': str(course.id), 'title': course.title,
            'subject_code': course.subject.code if course.subject else '',
            'status': course.status, 'scheduled_date': str(course.scheduled_date),
        }])
    except Exception as e:
        logger.error(f"Index course error: {e}")


def index_aircraft(aircraft):
    if not MEILI_AVAILABLE: return
    try:
        client.index('aircraft').add_documents([{
            'id': str(aircraft.id), 'registration': aircraft.registration,
            'manufacturer': aircraft.manufacturer or '', 'model': aircraft.model or '',
            'status': aircraft.status,
        }])
    except Exception as e:
        logger.error(f"Index aircraft error: {e}")


def search_meilisearch(query, index_name=None):
    """Search Meilisearch. Falls back to empty if unavailable."""
    if not MEILI_AVAILABLE: return []
    try:
        if index_name:
            return client.index(index_name).search(query).get('hits', [])
        results = []
        for idx in ['students', 'courses', 'aircraft']:
            results += client.index(idx).search(query).get('hits', [])
        return results
    except Exception as e:
        logger.error(f"Search error: {e}")
        return []


def index_all():
    """Management command handler to index all data."""
    if not MEILI_AVAILABLE:
        return "Meilisearch not available"
    from apps.students.models import Student
    from apps.ground_training.models import Course
    from apps.flight_training.models import Aircraft
    from apps.administration.models import Invoice

    client.index('students').delete_all_documents()
    client.index('courses').delete_all_documents()
    client.index('aircraft').delete_all_documents()

    students = Student.objects.all()
    client.index('students').add_documents([{
        'id': str(s.id), 'student_number': s.student_number,
        'first_name': s.first_name, 'last_name': s.last_name,
        'full_name': s.full_name, 'program': s.program, 'status': s.status,
    } for s in students])

    courses = Course.objects.select_related('subject').all()
    client.index('courses').add_documents([{
        'id': str(c.id), 'title': c.title,
        'subject_code': c.subject.code if c.subject else '',
        'status': c.status, 'scheduled_date': str(c.scheduled_date),
    } for c in courses])

    aircrafts = Aircraft.objects.all()
    client.index('aircraft').add_documents([{
        'id': str(a.id), 'registration': a.registration,
        'manufacturer': a.manufacturer or '', 'model': a.model or '',
        'status': a.status,
    } for a in aircrafts])

    return f"Indexed {students.count()} students, {courses.count()} courses, {aircrafts.count()} aircraft"

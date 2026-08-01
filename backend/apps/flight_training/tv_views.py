from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.flight_training.models import FlightLesson, SimulatorSession
from apps.ground_training.models import Course


@api_view(['GET'])
@permission_classes([])  # Public endpoint — no auth required
def tv_schedule(request):
    """Public daily/weekly/monthly schedule for the school TV display."""
    from datetime import date as _date, timedelta as _td
    from django.utils.dateparse import parse_date

    today = timezone.localdate()
    day = request.query_params.get('date', '')
    week_start = request.query_params.get('from', '')
    week_end = request.query_params.get('to', '')

    if week_start or week_end:
        try:
            start = parse_date(week_start) or today
            end = parse_date(week_end) or start
            if end < start:
                start, end = end, start
            if (end - start).days > 31:
                end = start + _td(days=31)
        except Exception:
            return Response({'message': 'Invalid date range'}, status=400)
    else:
        try:
            start = parse_date(day) or today
        except Exception:
            return Response({'message': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
        end = start

    flights = list(FlightLesson.objects.filter(
        scheduled_date__range=(start, end)
    ).select_related('student', 'instructor', 'aircraft', 'lesson_template'))
    courses = list(Course.objects.filter(
        scheduled_date__range=(start, end)
    ).select_related('subject', 'instructor', 'room'))
    sims = list(SimulatorSession.objects.filter(
        scheduled_date__date__range=(start, end)
    ).select_related('student', 'instructor', 'simulator'))

    events = []
    for f in flights:
        events.append({
            'id': str(f.id),
            'type': 'flight',
            'title': f.lesson_template.title if f.lesson_template else 'Flight',
            'student': f.student.full_name,
            'instructor': f'{f.instructor.first_name} {f.instructor.last_name}'.strip(),
            'location': f.aircraft.registration if f.aircraft else None,
            'date': f.scheduled_date.isoformat(),
            'start': f.start_time.isoformat() if f.start_time else None,
            'end': f.end_time.isoformat() if f.end_time else None,
            'status': f.status,
        })
    for c in courses:
        events.append({
            'id': str(c.id),
            'type': 'course',
            'title': c.title,
            'student': None,
            'instructor': f'{c.instructor.first_name} {c.instructor.last_name}'.strip(),
            'location': c.room.name if c.room else None,
            'date': c.scheduled_date.isoformat(),
            'start': f'{c.scheduled_date.isoformat()}T{c.start_time.strftime("%H:%M")}' if c.start_time else None,
            'end': f'{c.scheduled_date.isoformat()}T{c.end_time.strftime("%H:%M")}' if c.end_time else None,
            'status': c.status,
        })
    for s in sims:
        sim_end = None
        if s.duration:
            try:
                sim_end = (s.scheduled_date + timedelta(hours=float(s.duration))).isoformat()
            except Exception:
                sim_end = None
        events.append({
            'id': str(s.id),
            'type': 'simulator',
            'title': f'Simulator {s.simulator.name}' if s.simulator else 'Simulator',
            'student': s.student.full_name,
            'instructor': f'{s.instructor.first_name} {s.instructor.last_name}'.strip(),
            'location': s.simulator.name if s.simulator else None,
            'date': timezone.localtime(s.scheduled_date).date().isoformat(),
            'start': s.scheduled_date.isoformat(),
            'end': sim_end,
            'status': s.status,
        })

    events.sort(key=lambda e: (e['date'] or '', e['start'] or ''))

    return Response({
        'date': today.isoformat(),
        'range_start': start.isoformat(),
        'range_end': end.isoformat(),
        'events': events,
        'count': len(events),
    })

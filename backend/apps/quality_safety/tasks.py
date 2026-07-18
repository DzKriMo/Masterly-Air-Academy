"""Periodic tasks for quality & safety — deadline monitoring and notifications."""
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


@shared_task
def check_upcoming_deadlines():
    """Check all upcoming quality/safety deadlines and notify responsible users
    when items are within the configured window of expiry."""
    from .services import DeadlineMonitorService
    from apps.notifications.services import NotificationService

    deadlines = DeadlineMonitorService.get_upcoming_deadlines(days_ahead=settings.QUALITY_SAFETY_DEADLINE_DAYS_AHEAD)
    notification_count = 0

    for d in deadlines:
        if d['days_remaining'] <= settings.QUALITY_SAFETY_DAYS_REMAINING and d.get('responsible'):
            user = User.objects.filter(email=d['responsible']).first()
            if user:
                type_label = d['type'].replace('_', ' ').title()
                NotificationService.notify(
                    user,
                    'deadline_approaching',
                    f'{type_label} Approaching',
                    f"{d['item_name']} — {d['days_remaining']} day(s) remaining",
                    {'deadline': d},
                )
                notification_count += 1

    return (
        f'Checked {len(deadlines)} upcoming deadlines, '
        f'{notification_count} notifications sent'
    )

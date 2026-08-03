from rest_framework import status
from rest_framework.test import APITestCase
from django.test import override_settings

from apps.notifications.views import NotificationViewSet, MessageViewSet


class SSEStreamAcceptTest(APITestCase):
    def test_stream_renderer_classes_advertise_event_stream(self):
        for viewset in (NotificationViewSet, MessageViewSet):
            medias = [r.media_type for r in viewset.renderer_classes]
            self.assertIn("text/event-stream", medias)

    @override_settings(ROOT_URLCONF="config.urls")
    def test_notifications_stream_accepts_event_stream(self):
        from django.core.cache import cache
        cache.clear()
        resp = self.client.get(
            "/api/notifications/stream/",
            HTTP_ACCEPT="text/event-stream",
        )
        self.assertNotEqual(resp.status_code, status.HTTP_406_NOT_ACCEPTABLE)
        self.assertEqual(resp["Content-Type"].split(";")[0], "text/event-stream")

    @override_settings(ROOT_URLCONF="config.urls")
    def test_messages_stream_accepts_event_stream(self):
        resp = self.client.get(
            "/api/messages/stream/",
            HTTP_ACCEPT="text/event-stream",
        )
        self.assertNotEqual(resp.status_code, status.HTTP_406_NOT_ACCEPTABLE)
        self.assertEqual(resp["Content-Type"].split(";")[0], "text/event-stream")
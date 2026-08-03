from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.renderers import BrowsableAPIRenderer
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from apps.accounts.permissions import HasRolePermission
from apps.core.renderers import ApiResponseRenderer, SSEEventRenderer
from .models import Notification, Message, NotificationPreference
from .serializers import NotificationSerializer, MessageSerializer, NotificationPreferenceSerializer
from .services import NotificationService, get_redis_client, publish_message_event, serialize_message


class NotificationBroadcastViewSet(viewsets.ViewSet):
    """POST /api/notifications/broadcast/ — send notification to users by role or individual user_id"""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'notifications.broadcast'

    def create(self, request):
        title = request.data.get('title', '')
        message = request.data.get('message', '')
        user_id = request.data.get('user_id', None)
        role = request.data.get('role', '')

        if not title:
            return Response({'error': 'Title is required'}, status=400)

        from apps.accounts.models import User

        # If user_id is provided, send to that specific user
        if user_id:
            try:
                user = User.objects.get(id=user_id, is_active=True)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=404)
            NotificationService.notify(user, 'broadcast', title, message)
            return Response({'sent': 1})

        # Otherwise send by role
        if not role:
            return Response({'error': 'Role or user_id is required'}, status=400)

        notifications = NotificationService.notify_role(role, 'broadcast', title, message)
        return Response({'sent': len(notifications)})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [
        ApiResponseRenderer,
        BrowsableAPIRenderer,
        SSEEventRenderer,
    ]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='preferences')
    def preferences(self, request):
        """GET /api/notifications/preferences/ and PUT /api/notifications/preferences/."""
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        if request.method in ('PUT', 'PATCH'):
            serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(NotificationPreferenceSerializer(pref).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['get'], url_path='stream')
    def stream(self, request):
        """Server-Sent Events endpoint: GET /api/notifications/stream/.

        Yields an SSE stream of the user's notifications. Uses Redis pub/sub
        for near-real-time push (falling back to periodic polling if Redis is
        unavailable). The stream self-closes after ~55s; clients reconnect.
        """
        from django.http import StreamingHttpResponse
        import json
        import time

        user = request.user
        channel = f'notifications:user:{user.id}'
        # Optionally only emit notifications created after this ISO timestamp
        since = request.query_params.get('since')

        def generate():
            nonlocal since
            client = get_redis_client()
            pubsub = None
            if client is not None:
                try:
                    pubsub = client.pubsub()
                    pubsub.subscribe(channel)
                except Exception:
                    pubsub = None

            # Backfill missed notifications (published while disconnected)
            try:
                qs = Notification.objects.filter(user=user).order_by('-created_at')[:5]
                if since:
                    from django.utils.dateparse import parse_datetime
                    since_dt = parse_datetime(since)
                    if since_dt:
                        qs = Notification.objects.filter(user=user, created_at__gt=since_dt).order_by('created_at')
                for n in qs:
                    payload = {
                        'id': str(n.id),
                        'type': n.type,
                        'title': n.title,
                        'message': n.message,
                        'data': n.data,
                        'created_at': n.created_at.isoformat(),
                    }
                    yield f'data: {json.dumps(payload)}\n\n'
            except Exception:
                pass

            start = time.time()
            try:
                while time.time() - start < 55:
                    if pubsub is not None:
                        try:
                            msg = pubsub.get_message(ignore_subscribe_messages=True)
                            if msg and msg.get('type') == 'message':
                                yield f'data: {msg["data"]}\n\n'
                        except Exception:
                            pass
                    else:
                        # Poll fallback when Redis is unavailable
                        from django.utils.dateparse import parse_datetime
                        newest = Notification.objects.filter(user=user).order_by('-created_at').first()
                        if newest and (not since or not parse_datetime(since) or newest.created_at > parse_datetime(since)):
                            since = newest.created_at.isoformat()
                            yield f'data: {json.dumps({"id": str(newest.id), "type": newest.type, "title": newest.title, "message": newest.message, "data": newest.data, "created_at": newest.created_at.isoformat()})}\n\n'
                    yield ': keepalive\n\n'
                    time.sleep(4)
            finally:
                if pubsub is not None:
                    try:
                        pubsub.unsubscribe(channel)
                        pubsub.close()
                    except Exception:
                        pass

        response = StreamingHttpResponse(
            generate(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        return response


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    renderer_classes = [
        ApiResponseRenderer,
        BrowsableAPIRenderer,
        SSEEventRenderer,
    ]

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.filter(receiver=user).order_by('-created_at')
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(subject__icontains=search)
                | Q(body__icontains=search)
                | Q(sender__email__icontains=search)
                | Q(sender__first_name__icontains=search)
                | Q(sender__last_name__icontains=search)
            )
        unread = self.request.query_params.get('unread')
        if unread == '1' or unread == 'true':
            qs = qs.filter(is_read=False)
        return qs

    def get_object(self):
        """Allow both the sender and receiver to retrieve/open a message (and its thread)."""
        qs = Message.objects.filter(Q(sender=self.request.user) | Q(receiver=self.request.user))
        return get_object_or_404(qs, pk=self.kwargs['pk'])

    def perform_create(self, serializer):
        msg = serializer.save(sender=self.request.user)
        publish_message_event(
            str(msg.receiver_id),
            serialize_message(msg),
        )

    @action(detail=False, methods=['get'])
    def sent(self, request):
        sent = Message.objects.filter(sender=request.user).order_by('-created_at')
        page = self.paginate_queryset(sent)
        serializer = MessageSerializer(page if page is not None else sent, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Message.objects.filter(receiver=request.user, is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        if not msg.is_read:
            msg.is_read = True
            msg.read_at = timezone.now()
            msg.save(update_fields=['is_read', 'read_at'])
        return Response(MessageSerializer(msg).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'status': 'ok'})

    @action(detail=True, methods=['get'], url_path='thread')
    def thread(self, request, pk=None):
        """Return the full conversation thread this message belongs to (oldest→newest)."""
        msg = self.get_object()
        user = request.user
        root = msg.root
        result = [root]
        seen = {root.id}
        frontier = [root.id]
        while frontier:
            children = Message.objects.filter(reply_to_id__in=frontier).order_by('created_at')
            children = [c for c in children if c.sender_id == user.id or c.receiver_id == user.id]
            next_frontier = []
            for c in children:
                if c.id not in seen:
                    seen.add(c.id)
                    result.append(c)
                    next_frontier.append(c.id)
            frontier = next_frontier
        result.sort(key=lambda m: m.created_at)
        return Response(MessageSerializer(result, many=True).data)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        from django.core.files.storage import default_storage
        safe_name = file.name.replace('\\', '_').replace('/', '_')
        path = default_storage.save(f'messages/{safe_name}', file)
        return Response({
            'name': file.name,
            'size': file.size,
            'content_type': getattr(file, 'content_type', 'application/octet-stream'),
            'url': path,
        }, status=201)

    @action(detail=False, methods=['get'], url_path='download')
    def download(self, request):
        """GET /api/messages/download/?url=<storage key> — stream an attachment."""
        from django.http import StreamingHttpResponse
        from django.core.files.storage import default_storage
        url = request.query_params.get('url')
        if not url:
            return Response({'error': 'url is required'}, status=400)
        if url.startswith(('http://', 'https://')):
            return Response({'url': url})
        try:
            f = default_storage.open(url, 'rb')
            filename = url.rsplit('/', 1)[-1]
            response = StreamingHttpResponse(f, content_type='application/octet-stream')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except Exception:
            return Response({'error': 'File not found'}, status=404)

    @action(detail=False, methods=['get'], url_path='stream')
    def stream(self, request):
        """SSE stream of a user's received messages via Redis pub/sub."""
        from django.http import StreamingHttpResponse
        import json
        import time
        from .serializers import MessageSerializer

        user = request.user
        channel = f'messages:user:{user.id}'
        since = request.query_params.get('since')

        def generate():
            nonlocal since
            client = get_redis_client()
            pubsub = None
            if client is not None:
                try:
                    pubsub = client.pubsub()
                    pubsub.subscribe(channel)
                except Exception:
                    pubsub = None

            try:
                qs = Message.objects.filter(receiver=user).order_by('-created_at')[:10]
                if since:
                    from django.utils.dateparse import parse_datetime
                    sd = parse_datetime(since)
                    if sd:
                        qs = Message.objects.filter(receiver=user, created_at__gt=sd).order_by('created_at')
                for m in qs:
                    yield f'data: {json.dumps(serialize_message(m))}\n\n'
            except Exception:
                pass

            start = time.time()
            try:
                while time.time() - start < 55:
                    if pubsub is not None:
                        try:
                            msg = pubsub.get_message(ignore_subscribe_messages=True)
                            if msg and msg.get('type') == 'message':
                                yield f'data: {msg["data"]}\n\n'
                        except Exception:
                            pass
                    else:
                        from django.utils.dateparse import parse_datetime
                        newest = Message.objects.filter(receiver=user).order_by('-created_at').first()
                        if newest and (not since or not parse_datetime(since) or newest.created_at > parse_datetime(since)):
                            since = newest.created_at.isoformat()
                            yield f'data: {json.dumps(serialize_message(newest))}\n\n'
                    yield ': keepalive\n\n'
                    time.sleep(4)
            finally:
                if pubsub is not None:
                    try:
                        pubsub.unsubscribe(channel)
                        pubsub.close()
                    except Exception:
                        pass

        response = StreamingHttpResponse(
            generate(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        return response

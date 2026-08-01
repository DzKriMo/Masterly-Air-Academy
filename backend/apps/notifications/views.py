from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from apps.accounts.permissions import HasRolePermission
from .models import Notification, Message
from .serializers import NotificationSerializer, MessageSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRolePermission])
def notification_broadcast(request):
    """POST /api/notifications/broadcast/ — send notification to users by role or individual user_id"""
    title = request.data.get('title', '')
    message = request.data.get('message', '')
    user_id = request.data.get('user_id', None)
    role = request.data.get('role', '')

    if not title:
        return Response({'error': 'Title is required'}, status=400)

    from apps.notifications.models import Notification
    from apps.accounts.models import User

    # If user_id is provided, send to that specific user
    if user_id:
        try:
            user = User.objects.get(id=user_id, is_active=True)
            Notification.objects.create(user=user, type='broadcast', title=title, message=message)
            return Response({'sent': 1})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

    # Otherwise send by role
    if not role:
        return Response({'error': 'Role or user_id is required'}, status=400)

    users = User.objects.filter(role=role, is_active=True)
    count = 0
    for user in users:
        Notification.objects.create(user=user, type='broadcast', title=title, message=message)
        count += 1
    return Response({'sent': count})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['put'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['put', 'post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response(NotificationSerializer(notif).data)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(receiver=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        sent = Message.objects.filter(sender=request.user).order_by('-created_at')
        return Response(MessageSerializer(sent, many=True).data)

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

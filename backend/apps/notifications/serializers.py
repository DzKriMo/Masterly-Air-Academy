from rest_framework import serializers
from .models import Notification, Message, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'type', 'title', 'message', 'data', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['id', 'email_enabled', 'in_app_enabled', 'muted_types', 'updated_at']
        read_only_fields = ['id', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    receiver = serializers.PrimaryKeyRelatedField(queryset=Message._meta.get_field('receiver').remote_field.model.objects.all(), required=True)
    reply_to = serializers.PrimaryKeyRelatedField(queryset=Message.objects.all(), required=False, allow_null=True)
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'subject', 'body', 'reply_to', 'attachments', 'attachment_count', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at', 'is_read', 'read_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.email

    def get_receiver_name(self, obj):
        return obj.receiver.get_full_name() or obj.receiver.email

    def get_attachment_count(self, obj):
        return len(obj.attachments or [])

from django.contrib import admin
from .models import Notification, Message


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'title', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']
    readonly_fields = ['id', 'created_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'subject', 'is_read', 'created_at']
    list_filter = ['is_read']

from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Notification, Message


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ['user', 'type', 'title', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']
    readonly_fields = ['id', 'created_at']


@admin.register(Message)
class MessageAdmin(ModelAdmin):
    list_display = ['sender', 'receiver', 'subject', 'is_read', 'created_at']
    list_filter = ['is_read']

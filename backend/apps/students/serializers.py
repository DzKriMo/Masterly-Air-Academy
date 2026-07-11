from rest_framework import serializers
from .models import Student


class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'student_number', 'first_name', 'last_name', 'full_name', 'program', 'status', 'enrollment_date']

    def get_full_name(self, obj):
        return obj.full_name

from rest_framework import serializers
from .final_models import (
    FinalExamQuestion, FinalExam, FinalExamModuleConfig, FinalExamAssignment,
)
from apps.ground_training.models import Subject, Module
from apps.students.models import Student, Promotion


class FinalExamQuestionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.title_en', read_only=True)
    module_name = serializers.CharField(source='module.title', read_only=True)

    class Meta:
        model = FinalExamQuestion
        fields = [
            'id', 'subject', 'subject_name', 'module', 'module_name',
            'question_text', 'question_type', 'difficulty',
            'options', 'correct_answer', 'explanation',
            'is_active', 'created_at', 'updated_at',
        ]


class FinalExamQuestionBulkSerializer(serializers.Serializer):
    questions = serializers.ListField(child=serializers.DictField())


class FinalExamModuleConfigSerializer(serializers.ModelSerializer):
    module_name = serializers.CharField(source='module.title', read_only=True)

    class Meta:
        model = FinalExamModuleConfig
        fields = ['id', 'module', 'module_name', 'question_count', 'difficulty_distribution', 'type_distribution']


class FinalExamSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.title_en', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    module_configs = FinalExamModuleConfigSerializer(many=True, read_only=True)
    assignments_count = serializers.SerializerMethodField()

    class Meta:
        model = FinalExam
        fields = [
            'id', 'hash', 'subject', 'subject_name', 'title', 'title_ar', 'title_fr',
            'created_by', 'created_by_name', 'promotions',
            'status', 'duration_minutes', 'module_configs', 'assignments_count',
            'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_assignments_count(self, obj):
        return obj.assignments.count()


class FinalExamCreateSerializer(serializers.ModelSerializer):
    module_configs = FinalExamModuleConfigSerializer(many=True)

    class Meta:
        model = FinalExam
        fields = [
            'subject', 'title', 'title_ar', 'title_fr',
            'promotions', 'duration_minutes', 'module_configs',
        ]

    def create(self, validated_data):
        configs_data = validated_data.pop('module_configs')
        promotions = validated_data.pop('promotions', [])
        exam = FinalExam.objects.create(**validated_data)
        exam.promotions.set(promotions)
        for cfg_data in configs_data:
            FinalExamModuleConfig.objects.create(exam=exam, **cfg_data)
        return exam

    def update(self, instance, validated_data):
        configs_data = validated_data.pop('module_configs', None)
        promotions = validated_data.pop('promotions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if promotions is not None:
            instance.promotions.set(promotions)
        if configs_data is not None:
            instance.module_configs.all().delete()
            for cfg_data in configs_data:
                FinalExamModuleConfig.objects.create(exam=instance, **cfg_data)
        return instance


class FinalExamAssignmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)

    class Meta:
        model = FinalExamAssignment
        fields = [
            'id', 'exam', 'student', 'student_name', 'student_number',
            'access_code', 'questions', 'answers', 'violations', 'is_flagged',
            'score', 'status', 'started_at', 'submitted_at',
        ]


class FinalExamAccessSerializer(serializers.Serializer):
    access_code = serializers.CharField(max_length=16)


class FinalExamSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True))
    violations = serializers.ListField(child=serializers.DictField(), required=False, default=list)

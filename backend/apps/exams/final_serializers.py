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
            'question_text', 'question_type', 'difficulty', 'points',
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
    max_points = serializers.SerializerMethodField()
    earned_points = serializers.SerializerMethodField()

    class Meta:
        model = FinalExamAssignment
        fields = [
            'id', 'exam', 'student', 'student_name', 'student_number',
            'access_code', 'questions', 'answers', 'violations', 'is_flagged',
            'manual_scores', 'essay_graded', 'max_points', 'earned_points',
            'score', 'status', 'started_at', 'submitted_at',
        ]

    def get_max_points(self, obj):
        from .final_models import FinalExamQuestion
        ids = obj.questions or []
        if not ids:
            return 0
        qs = FinalExamQuestion.objects.filter(id__in=ids)
        return float(sum(float(q.points) for q in qs))

    def get_earned_points(self, obj):
        from .final_models import FinalExamQuestion
        ids = obj.questions or []
        if not ids:
            return 0
        qs = FinalExamQuestion.objects.filter(id__in=ids)
        qmap = {str(q.id): q for q in qs}
        earned = 0.0
        answers = obj.answers or {}
        manual = obj.manual_scores or {}
        for qid, q in qmap.items():
            if q.question_type in ('mcq', 'scq', 'true_false'):
                ans = answers.get(qid)
                if ans is not None and str(ans).strip().lower() == str(q.correct_answer).strip().lower():
                    earned += float(q.points)
            else:
                earned += float(manual.get(qid, 0) or 0)
        return round(earned, 2)


class FinalExamAccessSerializer(serializers.Serializer):
    access_code = serializers.CharField(max_length=16)


class FinalExamSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True))
    violations = serializers.ListField(child=serializers.DictField(), required=False, default=list)

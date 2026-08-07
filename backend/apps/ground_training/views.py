from django.db.models import Count
from django.db.models.functions import Coalesce
import os
import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.accounts.authentication import SignedMediaAuthentication
from apps.accounts.permissions import HasRolePermission, user_has_domain_permission
from apps.core.uploads import validate_upload
from .models import (
    Subject, Module, ModuleLesson, ModuleDocument, ModuleExercise, Room,
    Course, CourseEnrollment, AttendanceRecord, GroundEvaluation, TimeEntry,
    LessonVideoView,
)
from .serializers import (
    SubjectSerializer, SubjectListSerializer,
    ModuleSerializer, ModuleLessonSerializer, ModuleDocumentSerializer,
    ModuleExerciseSerializer,
    RoomSerializer,
    CourseSerializer, CourseCreateSerializer,
    CourseEnrollmentSerializer,
    AttendanceRecordSerializer, BulkAttendanceSerializer,
    StudentProgressSerializer, GroundEvaluationSerializer,
    BulkEvaluationSerializer,
    TimeEntrySerializer,
)


def _stream_from_storage(key, content_type='application/octet-stream', filename='file', inline=True, request=None):
    """Stream a stored file with proper HTTP Range / byte-range support for video seeking."""
    from django.core.files.storage import default_storage
    from django.http import HttpResponse
    import re

    if not key:
        return None
    if key.startswith(('http://', 'https://')):
        return None
    if key.startswith('/media/'):
        key = key[len('/media/'):]
    if not default_storage.exists(key):
        return None

    try:
        file_size = default_storage.size(key)
        range_header = request.META.get('HTTP_RANGE', '') if request else ''
        range_match = re.match(r'bytes=(\d+)-(\d*)', range_header) if range_header else None

        if range_match:
            start = int(range_match.group(1))
            end_str = range_match.group(2)
            end = int(end_str) - 1 if end_str else file_size - 1
            if start >= file_size:
                return HttpResponse(status=416)

            length = end - start + 1
            f = default_storage.open(key, 'rb')
            f.seek(start)
            data = f.read(length)
            f.close()

            resp = HttpResponse(data, content_type=content_type, status=206)
            resp['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            resp['Content-Length'] = length
            resp['Accept-Ranges'] = 'bytes'
            disposition = 'inline' if inline else 'attachment'
            resp['Content-Disposition'] = f'{disposition}; filename="{filename}"'
            return resp

        f = default_storage.open(key, 'rb')
        from django.http import StreamingHttpResponse
        response = StreamingHttpResponse(f, content_type=content_type)
        response['Accept-Ranges'] = 'bytes'
        response['Content-Length'] = file_size
        disposition = 'inline' if inline else 'attachment'
        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        return response
    except Exception:
        return None


def _store_upload(folder, file, module_id=None):
    """Persist an uploaded file to the default (MinIO) storage and return its key."""
    from django.core.files.storage import default_storage

    ext = os.path.splitext(file.name)[1].lower() or '.bin'
    local_name = f'{uuid.uuid4().hex}{ext}'
    rel = f'{folder}/{local_name}'
    if module_id:
        rel = f'{folder}/{module_id}/{local_name}'
    key = default_storage.save(rel, file)
    return key


class ModuleLessonViewSet(viewsets.ModelViewSet):
    queryset = ModuleLesson.objects.select_related('module__subject').all()
    serializer_class = ModuleLessonSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    authentication_classes = [
        SignedMediaAuthentication,
        JWTAuthentication,
        SessionAuthentication,
    ]
    filterset_fields = ['module']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['_cache_lesson_views'] = True
        return context

    def get_queryset(self):
        qs = super().get_queryset()
        student = getattr(self.request.user, 'student_profile', None)
        if student is not None:
            qs = qs.prefetch_related('video_views')
        return qs

    @action(detail=False, methods=['post'])
    def upload_video(self, request):
        if not user_has_domain_permission(request.user, 'ground_training', 'manage'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        ok, err = validate_upload(file, allowed={
            'video/mp4': {'.mp4'},
            'video/webm': {'.webm'},
            'video/quicktime': {'.mov'},
        })
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        module_id = request.data.get('module')
        video_key = _store_upload('module_videos', file, module_id)
        return Response({'video_url': video_key}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='video')
    def video(self, request, pk=None):
        lesson = self.get_object()
        response = _stream_from_storage(
            lesson.video_url,
            content_type='video/mp4',
            filename=f'lesson_{lesson.lesson_no}.mp4',
            request=request,
        )
        if response is None:
            if lesson.video_url and (lesson.video_url.startswith('http') or lesson.video_url.startswith('/media/')):
                return Response({'video_url': lesson.video_url})
            return Response({'error': 'No video attached'}, status=status.HTTP_404_NOT_FOUND)
        return response

    @action(detail=True, methods=['post'], url_path='track_view')
    def track_view(self, request, pk=None):
        """Record video view progress for the authenticated student.

        Body: {position: int (seconds), duration: int, tab_switches: int (optional)}
        Increments the student's watched time only while the tab was active; the
        frontend pauses playback on tab switch, so `tab_switches` flags cheating.
        """
        lesson = self.get_object()
        student = getattr(request.user, 'student_profile', None)
        if student is None:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        MIN_VIDEO_DURATION = 30  # seconds; shorter values cannot complete a tracked lesson
        MAX_VIDEO_DURATION = 4 * 60 * 60  # sanity cap (4h)

        position = request.data.get('position')
        duration = request.data.get('duration')
        tab_switches = request.data.get('tab_switches')

        def _to_int(v):
            try:
                return max(0, int(float(v)))
            except (TypeError, ValueError):
                return None

        position = _to_int(position)
        duration = _to_int(duration)
        tab_switches = _to_int(tab_switches)

        # Server-side hardening: bound the reported duration to a sane range so
        # a crafted payload cannot complete a lesson instantly.
        if duration is not None:
            duration = min(duration, MAX_VIDEO_DURATION)

        view, created = LessonVideoView.objects.get_or_create(
            lesson=lesson,
            student=student,
            defaults={
                'watched_seconds': 0,
                'duration': duration or 0,
                'status': LessonVideoView.Status.IN_PROGRESS,
                'tab_switches': tab_switches or 0,
            },
        )

        if position is not None:
            # Do not let a single heartbeat claim more progress than the whole
            # video length, and never regress a previous checkpoint.
            if view.duration:
                position = min(position, view.duration)
            if position > view.watched_seconds:
                view.watched_seconds = position
            if duration is not None and view.duration:
                view.duration = min(max(view.duration, duration), MAX_VIDEO_DURATION)
            elif duration is not None and not view.duration:
                view.duration = duration
        elif duration is not None and view.duration:
            view.duration = min(max(view.duration, duration), MAX_VIDEO_DURATION)
        # On a subsequent heartbeat, tab switches are cumulative (the defaults
        # above already seeded the count when the row was first created).
        if tab_switches is not None and not created:
            view.tab_switches += tab_switches

        # Completion: only possible for videos of a plausible length, when the
        # student actually watched at least 90% of it.
        if view.duration >= MIN_VIDEO_DURATION:
            if (view.watched_seconds >= int(view.duration * 0.9)) or (
                position is not None and position >= view.duration and view.watched_seconds >= int(view.duration * 0.9)
            ):
                view.status = LessonVideoView.Status.COMPLETED

        view.save()

        return Response({
            'lesson': str(lesson.id),
            'is_mandatory': lesson.is_mandatory,
            'watched_seconds': view.watched_seconds,
            'duration': view.duration,
            'status': view.status,
            'tab_switches': view.tab_switches,
            'tracking': lesson.is_mandatory,
        })


class ModuleDocumentViewSet(viewsets.ModelViewSet):
    queryset = ModuleDocument.objects.all()
    serializer_class = ModuleDocumentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['module', 'type']

    @action(detail=False, methods=['post'])
    def upload_file(self, request):
        if not user_has_domain_permission(request.user, 'ground_training', 'manage'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        ok, err = validate_upload(file)
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        module_id = request.data.get('module')
        file_key = _store_upload('module_docs', file, module_id)
        return Response({'file_url': file_key}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        doc = self.get_object()
        response = _stream_from_storage(
            doc.file_url,
            content_type='application/octet-stream',
            filename=doc.name or 'document',
            request=request,
        )
        if response is None:
            if doc.file_url and (doc.file_url.startswith('http') or doc.file_url.startswith('/media/')):
                return Response({'file_url': doc.file_url})
            return Response({'error': 'No file attached'}, status=status.HTTP_404_NOT_FOUND)
        return response

    @action(detail=False, methods=['post'])
    def upload(self, request):
        if not user_has_domain_permission(request.user, 'ground_training', 'manage'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get('file')
        module_id = request.data.get('module')
        name = request.data.get('name', file.name if file else 'Document')
        doc_type = request.data.get('type', 'pdf')

        if not file or not module_id:
            return Response(
                {'error': 'file and module are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ok, err = validate_upload(file)
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        file_url = _store_upload('module_docs', file, module_id)

        doc = ModuleDocument.objects.create(
            module_id=module_id,
            name=name,
            file_url=file_url,
            type=doc_type,
        )
        return Response(ModuleDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class ModuleExerciseViewSet(viewsets.ModelViewSet):
    queryset = ModuleExercise.objects.all()
    serializer_class = ModuleExerciseSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['module']


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.prefetch_related('modules__lessons').annotate(
        module_count=Count('modules', distinct=True)
    ).all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['program', 'status']
    search_fields = ['code', 'title_en', 'title_fr']
    ordering_fields = ['code', 'total_hours', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SubjectListSerializer
        return SubjectSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(status='active')
        return qs


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related('subject').prefetch_related('lessons', 'documents').all()
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['subject', 'status']

    @action(detail=True, methods=['get'])
    def lessons(self, request, pk=None):
        module = self.get_object()
        lessons = module.lessons.all()
        return Response(ModuleLessonSerializer(lessons, many=True).data)

    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        module = self.get_object()
        file = request.FILES.get('file')
        name = request.data.get('name', file.name if file else 'Document')
        doc_type = request.data.get('type', 'pdf')

        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.core.files.storage import default_storage
            path = default_storage.save(f'module_docs/{module.id}/{file.name}', file)
            file_url = f'/media/{path}'
        except Exception:
            import os, uuid
            from django.conf import settings
            local_dir = os.path.join(settings.MEDIA_ROOT, 'module_docs', str(module.id))
            os.makedirs(local_dir, exist_ok=True)
            ext = os.path.splitext(file.name)[1]
            local_name = f'{uuid.uuid4().hex}{ext}'
            local_path = os.path.join(local_dir, local_name)
            with open(local_path, 'wb+') as dest:
                for chunk in file.chunks():
                    dest.write(chunk)
            file_url = f'/media/module_docs/{module.id}/{local_name}'

        doc = ModuleDocument.objects.create(
            module=module,
            name=name,
            file_url=file_url,
            type=doc_type,
        )
        return Response(ModuleDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['status']
    search_fields = ['name', 'location']


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['status', 'subject', 'promotion', 'instructor']
    search_fields = ['title', 'subject__title_en']
    ordering_fields = ['scheduled_date', 'start_time']

    def get_queryset(self):
        qs = Course.objects.select_related('subject', 'instructor', 'room').annotate(
            enrollment_count=Count('enrollments', distinct=True)
        ).all()
        if self.request.user.role == 'student':
            return qs.filter(enrollments__student__user=self.request.user)
        if self.request.user.role in ('ground_instructor', 'flight_instructor'):
            return qs.filter(instructor__user=self.request.user)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CourseCreateSerializer
        return CourseSerializer

    def perform_create(self, serializer):
        course = serializer.save()
        try:
            from apps.notifications.services import NotificationService
            NotificationService.course_scheduled(course)
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def attendance(self, request, pk=None):
        course = self.get_object()
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.utils import timezone
        att_date = serializer.validated_data.get('date') or timezone.now().date()

        created = []
        for record in serializer.validated_data['records']:
            att, _ = AttendanceRecord.objects.update_or_create(
                student_id=record['student_id'],
                course=course,
                date=att_date,
                defaults={
                    'status': record['status'],
                    'notes': record.get('notes', ''),
                },
            )
            created.append(att)

        return Response(
            AttendanceRecordSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        course = self.get_object()
        enrollments = course.enrollments.select_related('student').all()
        return Response(CourseEnrollmentSerializer(enrollments, many=True).data)

    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        course = self.get_object()
        modules = course.subject.modules.prefetch_related('lessons', 'documents', 'exercises').all()
        materials = []
        for m in modules:
            materials.append({
                'module_id': str(m.id),
                'module_title': m.title,
                'lessons': [
                    {'id': str(l.id), 'lesson_no': l.lesson_no, 'title': l.title, 'content': l.content}
                    for l in m.lessons.all()
                ],
                'documents': [
                    {'name': d.name, 'file_url': d.file_url, 'type': d.type}
                    for d in m.documents.all()
                ],
                'exercises': [
                    {'id': str(e.id), 'title': e.title, 'instructions': e.instructions, 'due_date': e.due_date}
                    for e in m.exercises.all()
                ],
            })
        return Response({'course_id': str(course.id), 'modules': materials})

    @action(detail=False, methods=['get'])
    def curriculum(self, request):
        """Group the student's enrolled subjects with their modules (lessons/
        documents/exercises) and the course sessions associated with each subject."""
        user = request.user
        if user.role == 'student':
            courses = Course.objects.filter(
                enrollments__student__user=user
            ).select_related('subject', 'instructor', 'room').distinct()
        elif user.role in ('ground_instructor', 'flight_instructor'):
            courses = Course.objects.filter(
                instructor__user=user
            ).select_related('subject', 'instructor', 'room').distinct()
        else:
            courses = Course.objects.select_related('subject', 'instructor', 'room').distinct()

        subject_ids = set(courses.values_list('subject_id', flat=True))
        subjects = Subject.objects.filter(id__in=subject_ids).prefetch_related(
            'modules__lessons', 'modules__documents', 'modules__exercises',
            'courses__enrollments', 'courses__instructor', 'courses__room',
        ).order_by('code')

        from datetime import date as _date
        from django.utils import timezone
        today = timezone.localdate()

        # Per-student lesson video progress, so the module list can flag
        # completed / partially-watched mandatory videos.
        student = getattr(user, 'student_profile', None)
        student_views = {}
        if student is not None:
            student_views = {
                v.lesson_id: v
                for v in LessonVideoView.objects.filter(student=student)
            }

        groups = []
        for subj in subjects:
            modules = []
            for m in subj.modules.all().order_by('order'):
                modules.append({
                    'id': str(m.id),
                    'title': m.title,
                    'description': m.description,
                    'status': m.status,
                    'lessons': [
                        {
                            'id': str(l.id),
                            'lesson_no': l.lesson_no,
                            'title': l.title,
                            'content': l.content,
                            'video_url': l.video_url,
                            'is_mandatory': l.is_mandatory,
                            'has_video': bool(l.video_url),
                            'video_status': student_views[l.id].status if l.id in student_views else None,
                            'video_watched_seconds': student_views[l.id].watched_seconds if l.id in student_views else 0,
                            'video_duration': student_views[l.id].duration if l.id in student_views else 0,
                        }
                        for l in m.lessons.all()
                    ],
                    'documents': [
                        {'id': str(d.id), 'name': d.name, 'file_url': d.file_url, 'type': d.type}
                        for d in m.documents.all()
                    ],
                    'exercises': [
                        {'id': str(e.id), 'title': e.title, 'instructions': e.instructions, 'due_date': str(e.due_date) if e.due_date else None}
                        for e in m.exercises.all()
                    ],
                })
            sessions = []
            for c in subj.courses.all():
                past = c.scheduled_date < today
                sessions.append({
                    'id': str(c.id),
                    'title': c.title,
                    'scheduled_date': str(c.scheduled_date),
                    'start_time': str(c.start_time)[:5] if c.start_time else None,
                    'end_time': str(c.end_time)[:5] if c.end_time else None,
                    'room_name': c.room.name if c.room else None,
                    'instructor_name': f'{c.instructor.first_name} {c.instructor.last_name}' if c.instructor else None,
                    'status': c.status,
                    'is_past': past,
                })
            groups.append({
                'subject': {
                    'id': str(subj.id),
                    'code': subj.code,
                    'title_en': subj.title_en,
                    'has_modules': bool(modules),
                    'has_sessions': bool(sessions),
                },
                'modules': modules,
                'sessions': sessions,
            })
        return Response(groups)

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        course = self.get_object()
        serializer = BulkEvaluationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        created = []
        for record in serializer.validated_data['records']:
            score_str = record.get('score')
            score = int(score_str) if score_str else None
            ev, _ = GroundEvaluation.objects.update_or_create(
                course=course,
                student_id=record['student'],
                defaults={
                    'grade': score,
                    'appreciation': record.get('feedback', ''),
                    'created_by': request.user,
                },
            )
            created.append(ev)

        return Response(
            GroundEvaluationSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class CourseEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = CourseEnrollment.objects.select_related('student', 'course').all()
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['course', 'student', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        if self.request.user.role in ('ground_instructor', 'flight_instructor'):
            return qs.filter(course__instructor__user=self.request.user)
        return qs

    def perform_create(self, serializer):
        enrollment = serializer.save()
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify(
                enrollment.student.user,
                'enrollment',
                'Enrolled in Course',
                f'You have been enrolled in "{enrollment.course.title}".',
                {'course_id': str(enrollment.course_id), 'enrollment_id': str(enrollment.id)}
            )
        except Exception:
            pass

    @action(detail=False, methods=['post'])
    def bulk_enroll(self, request):
        course_id = request.data.get('course_id')
        student_ids = request.data.get('student_ids', [])

        if not course_id or not student_ids:
            return Response(
                {'error': 'course_id and student_ids are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.notifications.services import NotificationService
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

        enrolled = []
        for sid in student_ids:
            enrollment, _ = CourseEnrollment.objects.get_or_create(
                student_id=sid,
                course_id=course_id,
            )
            try:
                NotificationService.notify(
                    enrollment.student.user,
                    'enrollment',
                    'Enrolled in Course',
                    f'You have been enrolled in "{course.title}".',
                    {'course_id': str(course_id), 'enrollment_id': str(enrollment.id)}
                )
            except Exception:
                pass
            enrolled.append(enrollment)

        return Response(
            CourseEnrollmentSerializer(enrolled, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related('student', 'course').all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'attendance.view'
    filterset_fields = ['course', 'student', 'status', 'date']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        if self.request.user.role == 'ground_instructor':
            return qs.filter(course__instructor__user=self.request.user)
        return qs


class StudentProgressViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Return progress for the authenticated student."""
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        enrollments = CourseEnrollment.objects.filter(student=student)
        total = enrollments.count()
        completed = enrollments.filter(course__status='completed').count()

        attendance_records = AttendanceRecord.objects.filter(student=student)
        total_att = attendance_records.count()
        present_att = attendance_records.filter(status='present').count()

        subjects_data = []
        for enrollment in enrollments.select_related('course__subject'):
            subj = enrollment.course.subject
            subjects_data.append({
                'subject_code': subj.code,
                'subject_title': subj.title_en,
                'course_title': enrollment.course.title,
                'status': enrollment.course.status,
                'scheduled_date': enrollment.course.scheduled_date,
            })

        return Response({
            'student_id': str(student.id),
            'student_name': student.full_name,
            'total_courses': total,
            'completed_courses': completed,
            'attendance_rate': round((present_att / total_att * 100) if total_att > 0 else 0, 1),
            'subjects': subjects_data,
        })


class GroundEvaluationViewSet(viewsets.ModelViewSet):
    queryset = GroundEvaluation.objects.select_related('student', 'course').all()
    serializer_class = GroundEvaluationSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.evaluate'
    filterset_fields = ['course', 'student', 'flagged']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        if self.request.user.role == 'ground_instructor':
            return qs.filter(course__instructor__user=self.request.user)
        return qs


class TimeEntryViewSet(viewsets.ModelViewSet):
    queryset = TimeEntry.objects.select_related('instructor').all()
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'ground_training.view'
    filterset_fields = ['date', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            return qs.none()
        if user.role in ('ground_instructor', 'flight_instructor', 'chief_ground_instructor', 'chief_flight_instructor'):
            return qs.filter(instructor=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

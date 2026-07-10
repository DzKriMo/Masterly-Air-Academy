from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import CustomTokenObtainPairSerializer
from apps.accounts.views import CurrentUserView, UpdateProfileView, LogoutView
from apps.ground_training.views import (
    SubjectViewSet, ModuleViewSet, RoomViewSet,
    CourseViewSet, CourseEnrollmentViewSet, AttendanceRecordViewSet,
    StudentProgressViewSet,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'modules', ModuleViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'course-enrollments', CourseEnrollmentViewSet)
router.register(r'attendance', AttendanceRecordViewSet, basename='attendance')

urlpatterns = [
    # Student progress (ViewSet without queryset — needs explicit path)
    path('students/progress/', StudentProgressViewSet.as_view({'get': 'list'}), name='student-progress'),

    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='me'),
    path('profile/', UpdateProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('', include(router.urls)),
]

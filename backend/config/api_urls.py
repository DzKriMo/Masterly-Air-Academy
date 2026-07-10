from django.urls import path
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import CustomTokenObtainPairSerializer
from apps.accounts.views import CurrentUserView, UpdateProfileView, LogoutView


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='me'),
    path('profile/', UpdateProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
]

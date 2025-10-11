"""
URL configuration for accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import UserViewSet, LoginView, MeView, ChangeMyPasswordView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Current user endpoints
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangeMyPasswordView.as_view(), name='change-password'),
    
    # User management endpoints (admin only)
    path('', include(router.urls)),
]

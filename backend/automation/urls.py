"""
URLs for Automation app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from automation.views import (
    EmailProcessingLogViewSet,
    EmailAutoProcessingConfigViewSet,
)

app_name = 'automation'

router = DefaultRouter()
router.register(r'logs', EmailProcessingLogViewSet, basename='emailprocessinglog')
router.register(r'config', EmailAutoProcessingConfigViewSet, basename='config')

urlpatterns = [
    path('', include(router.urls)),
]

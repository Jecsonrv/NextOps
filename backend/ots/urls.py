"""
URLs para gestión de Órdenes de Trabajo (OTs).
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OTViewSet

router = DefaultRouter()
router.register(r'', OTViewSet, basename='ot')

urlpatterns = router.urls



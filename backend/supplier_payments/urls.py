"""
URLs para el módulo de Pagos a Proveedores.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierPaymentViewSet

router = DefaultRouter()
router.register(r'', SupplierPaymentViewSet, basename='supplier-payment')

urlpatterns = [
    path('', include(router.urls)),
]

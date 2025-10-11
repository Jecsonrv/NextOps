"""
URLs para el módulo de Invoices (Facturas).
Fase 7-8: Sistema completo de gestión de facturas.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, UploadedFileViewSet

router = DefaultRouter()
# No usar 'invoices' aquí porque ya está en proyecto/urls.py como 'api/invoices/'
router.register(r'', InvoiceViewSet, basename='invoice')
router.register(r'files', UploadedFileViewSet, basename='uploadedfile')

urlpatterns = router.urls

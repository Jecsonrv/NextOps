"""
URLs para el módulo de Invoices (Facturas).
Fase 7-8: Sistema completo de gestión de facturas + Disputas y Notas de Crédito.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceViewSet,
    UploadedFileViewSet,
    DisputeViewSet,
    CreditNoteViewSet,
)

router = DefaultRouter()

# IMPORTANTE: Registrar rutas más específicas PRIMERO para evitar conflictos
# El orden importa - rutas específicas deben ir antes que las genéricas
router.register(r'disputes', DisputeViewSet, basename='dispute')
router.register(r'credit-notes', CreditNoteViewSet, basename='creditnote')
router.register(r'files', UploadedFileViewSet, basename='uploadedfile')
router.register(r'', InvoiceViewSet, basename='invoice')

urlpatterns = router.urls


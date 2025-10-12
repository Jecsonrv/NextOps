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
    create_dispute,
)

router = DefaultRouter()

# IMPORTANTE: Registrar rutas más específicas PRIMERO para evitar conflictos
# El orden importa - rutas específicas deben ir antes que las genéricas
router.register(r'disputes', DisputeViewSet, basename='dispute')
router.register(r'credit-notes', CreditNoteViewSet, basename='creditnote')
router.register(r'files', UploadedFileViewSet, basename='uploadedfile')
# Facturas al final porque usa ruta vacía y capturaría todo lo demás
router.register(r'', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('disputes/create/', create_dispute, name='dispute-create'),
] + router.urls

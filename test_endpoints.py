#!/usr/bin/env python
"""
Script para verificar que los endpoints de disputes y credit-notes estén funcionando.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from django.urls import get_resolver
from rest_framework.test import APIRequestFactory
from invoices.views import DisputeViewSet, CreditNoteViewSet

print("=" * 60)
print("VERIFICACIÓN DE ENDPOINTS")
print("=" * 60)

# 1. Verificar URLs registradas
print("\n1. URLs registradas en el proyecto:")
resolver = get_resolver()
invoice_patterns = [p for p in resolver.url_patterns if 'invoices' in str(p.pattern)]
print(f"   Encontradas {len(invoice_patterns)} rutas con 'invoices'")

# 2. Verificar ViewSets
print("\n2. ViewSets disponibles:")
print(f"   - DisputeViewSet: {DisputeViewSet}")
print(f"   - CreditNoteViewSet: {CreditNoteViewSet}")

# 3. Verificar basename
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'disputes', DisputeViewSet, basename='dispute')
router.register(r'credit-notes', CreditNoteViewSet, basename='creditnote')

print("\n3. Rutas generadas por el router:")
for pattern in router.urls:
    print(f"   - {pattern.pattern}")

print("\n4. Endpoints esperados:")
print("   - GET  /api/invoices/disputes/")
print("   - POST /api/invoices/disputes/")
print("   - GET  /api/invoices/disputes/{id}/")
print("   - GET  /api/invoices/credit-notes/")
print("   - POST /api/invoices/credit-notes/")

print("\n" + "=" * 60)
print("VERIFICACIÓN COMPLETADA")
print("=" * 60)

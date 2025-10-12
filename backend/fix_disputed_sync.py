#!/usr/bin/env python
"""Script para sincronizar facturas de flete disputadas con sus OTs"""
import django
import os

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from invoices.models import Invoice
from django.db import transaction

print("=" * 80)
print("SINCRONIZACIÓN DE FACTURAS DISPUTADAS")
print("=" * 80)

# Obtener facturas problemáticas
facturas_problematicas = Invoice.objects.filter(
    tipo_costo__in=['FLETE', 'CARGOS_NAVIERA'],
    estado_provision='disputada',
    is_deleted=False,
    ot__isnull=False
).exclude(ot__estado_provision='disputada')

print(f"\nFacturas a sincronizar: {facturas_problematicas.count()}")

if not facturas_problematicas.exists():
    print("✅ No hay facturas que sincronizar")
    exit(0)

print("\nIniciando sincronización...")

sincronizadas = 0
errores = 0

with transaction.atomic():
    for invoice in facturas_problematicas:
        try:
            print(f"\nSincronizando: {invoice.numero_factura}")
            print(f"  OT: {invoice.ot.numero_ot}")
            print(f"  Estado factura: {invoice.estado_provision}")
            print(f"  Estado OT (antes): {invoice.ot.estado_provision}")

            # Forzar sincronización
            if invoice.ot:
                invoice.ot.estado_provision = invoice.estado_provision
                invoice.ot.save(update_fields=['estado_provision', 'updated_at'])

                print(f"  Estado OT (después): {invoice.ot.estado_provision}")
                print(f"  ✅ Sincronizada correctamente")
                sincronizadas += 1

        except Exception as e:
            print(f"  ❌ Error: {e}")
            errores += 1

print("\n" + "=" * 80)
print(f"RESULTADO:")
print(f"  Sincronizadas: {sincronizadas}")
print(f"  Errores: {errores}")
print("=" * 80)

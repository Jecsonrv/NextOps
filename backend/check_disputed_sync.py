#!/usr/bin/env python
"""Script para verificar facturas de flete disputadas y su sincronización con OTs"""
import django
import os

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from invoices.models import Invoice
from ots.models import OT

print("=" * 80)
print("ANÁLISIS DE FACTURAS DE FLETE DISPUTADAS")
print("=" * 80)

# 1. Facturas FLETE disputadas
print("\n1. Facturas de FLETE en estado DISPUTADA:")
flete_disputadas = Invoice.objects.filter(
    tipo_costo='FLETE',
    estado_provision='disputada',
    is_deleted=False
)
print(f"   Total: {flete_disputadas.count()}")

for invoice in flete_disputadas[:5]:
    print(f"\n   Factura: {invoice.numero_factura}")
    print(f"   - Monto: ${invoice.monto}")
    print(f"   - Estado: {invoice.estado_provision}")
    print(f"   - OT asignada: {invoice.ot.numero_ot if invoice.ot else 'SIN OT'}")
    print(f"   - Es costo vinculado: {invoice.es_costo_vinculado_ot()}")
    print(f"   - Debe sincronizar: {invoice.debe_sincronizar_con_ot()}")

    if invoice.ot:
        print(f"   - Estado OT: {invoice.ot.estado_provision}")
        print(f"   - OT actualizada: {'SÍ' if invoice.ot.estado_provision == 'disputada' else 'NO ⚠️'}")

# 2. Facturas CARGOS_NAVIERA disputadas
print("\n\n2. Facturas de CARGOS_NAVIERA en estado DISPUTADA:")
cargos_disputadas = Invoice.objects.filter(
    tipo_costo='CARGOS_NAVIERA',
    estado_provision='disputada',
    is_deleted=False
)
print(f"   Total: {cargos_disputadas.count()}")

for invoice in cargos_disputadas[:3]:
    print(f"\n   Factura: {invoice.numero_factura}")
    print(f"   - Monto: ${invoice.monto}")
    print(f"   - OT asignada: {invoice.ot.numero_ot if invoice.ot else 'SIN OT'}")
    if invoice.ot:
        print(f"   - Estado OT: {invoice.ot.estado_provision}")

# 3. OTs con estado disputada
print("\n\n3. OTs en estado DISPUTADA:")
ots_disputadas = OT.objects.filter(estado_provision='disputada', is_deleted=False)
print(f"   Total: {ots_disputadas.count()}")

for ot in ots_disputadas[:5]:
    print(f"\n   OT: {ot.numero_ot}")
    print(f"   - Estado: {ot.estado_provision}")
    facturas = ot.facturas.filter(is_deleted=False, tipo_costo__in=['FLETE', 'CARGOS_NAVIERA'])
    print(f"   - Facturas vinculadas (FLETE/CARGOS): {facturas.count()}")
    for f in facturas:
        print(f"     * {f.numero_factura}: {f.estado_provision}")

# 4. Facturas que deberían estar sincronizadas pero no lo están
print("\n\n4. PROBLEMAS DETECTADOS:")
print("   Facturas FLETE/CARGOS disputadas con OT que NO está disputada:")
problemas = Invoice.objects.filter(
    tipo_costo__in=['FLETE', 'CARGOS_NAVIERA'],
    estado_provision='disputada',
    is_deleted=False,
    ot__isnull=False
).exclude(ot__estado_provision='disputada')

if problemas.exists():
    for invoice in problemas:
        print(f"   ⚠️ {invoice.numero_factura}")
        print(f"      - Factura: {invoice.estado_provision}")
        print(f"      - OT {invoice.ot.numero_ot}: {invoice.ot.estado_provision}")
        print(f"      - Debe sincronizar: {invoice.debe_sincronizar_con_ot()}")
else:
    print("   ✅ No se detectaron problemas de sincronización")

print("\n" + "=" * 80)
print("ANÁLISIS COMPLETO")
print("=" * 80)

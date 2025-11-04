"""
Test rápido para verificar si podemos cargar facturas de venta
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from backend.sales.models import SalesInvoice
from decimal import Decimal

print("=" * 60)
print("TEST: Cargando facturas de venta")
print("=" * 60)

try:
    # Contar facturas
    count = SalesInvoice.objects.filter(deleted_at__isnull=True).count()
    print(f"\n✅ Total de facturas activas: {count}")
    
    # Intentar cargar una factura
    if count > 0:
        invoice = SalesInvoice.objects.filter(deleted_at__isnull=True).first()
        print(f"\n✅ Primera factura cargada:")
        print(f"   - ID: {invoice.pk}")
        print(f"   - Número: {invoice.numero_factura}")
        print(f"   - Cliente: {invoice.cliente}")
        print(f"   - Monto: ${invoice.monto_total}")
        
        # Probar propiedades
        print(f"\n✅ Probando propiedades:")
        print(f"   - margen_bruto: ${invoice.margen_bruto}")
        print(f"   - porcentaje_margen: {invoice.porcentaje_margen}%")
        print(f"   - porcentaje_pagado: {invoice.porcentaje_pagado}%")
        print(f"   - esta_vencida: {invoice.esta_vencida}")
        
        print(f"\n✅ Todas las propiedades funcionan correctamente")
    else:
        print("\n⚠️  No hay facturas en la base de datos")
        
except Exception as e:
    print(f"\n❌ ERROR al cargar facturas:")
    print(f"   {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)

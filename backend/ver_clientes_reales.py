#!/usr/bin/env python
"""
Script para mostrar los clientes REALES de las OTs
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from ots.models import OT
from client_aliases.models import ClientAlias

# Ver clientes reales de OTs
print("=" * 60)
print("CLIENTES REALES EN TUS OTs")
print("=" * 60)

clientes_reales = OT.objects.filter(
    deleted_at__isnull=True,
    cliente__isnull=False
).values(
    'cliente__id',
    'cliente__original_name',
    'cliente__country'
).annotate(
    num_ots=django.db.models.Count('id')
).order_by('-num_ots')[:20]

total_clientes = OT.objects.filter(
    deleted_at__isnull=True,
    cliente__isnull=False
).values('cliente').distinct().count()

print(f"\nTotal clientes únicos: {total_clientes}")
print(f"\nTop 20 clientes por número de OTs:\n")

for i, cliente in enumerate(clientes_reales, 1):
    pais = f" ({cliente['cliente__country']})" if cliente['cliente__country'] else ""
    print(f"{i:2}. {cliente['cliente__original_name']}{pais} - {cliente['num_ots']} OTs")

# Ver aliases de prueba que no están en OTs
print("\n" + "=" * 60)
print("ALIASES QUE NO ESTÁN EN NINGUNA OT (Para eliminar)")
print("=" * 60)

aliases_huerfanos = ClientAlias.objects.filter(
    deleted_at__isnull=True,
    ot_set__isnull=True
).values_list('id', 'original_name', 'usage_count')[:10]

print(f"\nTotal aliases sin OTs: {ClientAlias.objects.filter(deleted_at__isnull=True, ot_set__isnull=True).count()}")
if aliases_huerfanos:
    print("\nPrimeros 10:")
    for alias_id, nombre, usos in aliases_huerfanos:
        print(f"  ID {alias_id}: {nombre} (usos reportados: {usos})")
else:
    print("\n✓ No hay aliases huérfanos")

print("\n" + "=" * 60)

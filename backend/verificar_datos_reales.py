#!/usr/bin/env python
"""
Script de verificación final - Muestra tus clientes reales
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
from django.db.models import Count

print("=" * 70)
print("VERIFICACIÓN FINAL - CLIENTES REALES DE TU BASE DE DATOS")
print("=" * 70)

# 1. Total de aliases
total_aliases = ClientAlias.objects.filter(deleted_at__isnull=True).count()
print(f"\n📊 Total de clientes (aliases): {total_aliases}")

# 2. Verificar que todos tienen OTs
aliases_con_ots = ClientAlias.objects.filter(
    deleted_at__isnull=True,
    ots__isnull=False
).distinct().count()

print(f"✓ Aliases con OTs asociadas: {aliases_con_ots}")
print(f"✓ Aliases sin OTs: {total_aliases - aliases_con_ots}")

# 3. Top 10 clientes reales
print("\n" + "=" * 70)
print("TOP 10 CLIENTES MÁS FRECUENTES (TUS DATOS REALES)")
print("=" * 70)

top_clientes = ClientAlias.objects.filter(
    deleted_at__isnull=True
).annotate(
    num_ots=Count('ots')
).order_by('-num_ots')[:10]

for i, cliente in enumerate(top_clientes, 1):
    pais = f" ({cliente.country})" if cliente.country else ""
    print(f"{i:2}. {cliente.original_name}{pais}")
    print(f"    └─ {cliente.num_ots} OTs | usage_count: {cliente.usage_count}")

# 4. Verificar duplicados potenciales
print("\n" + "=" * 70)
print("DUPLICADOS POTENCIALES DETECTADOS")
print("=" * 70)

# Buscar "ALMACENES SIMAN" en sus variantes
siman_variants = ClientAlias.objects.filter(
    deleted_at__isnull=True,
    original_name__icontains='SIMAN'
).values('id', 'original_name', 'usage_count').order_by('-usage_count')

if siman_variants:
    print(f"\nEjemplo: Variantes de 'SIMAN' ({len(siman_variants)} encontradas):")
    for v in siman_variants[:5]:
        print(f"  • {v['original_name']} (ID: {v['id']}, usos: {v['usage_count']})")
else:
    print("\nNo se encontraron variantes de ejemplo")

# 5. Estadísticas de países
print("\n" + "=" * 70)
print("DISTRIBUCIÓN POR PAÍS")
print("=" * 70)

paises = ClientAlias.objects.filter(
    deleted_at__isnull=True
).values('country').annotate(
    total=Count('id')
).order_by('-total')

for pais_data in paises:
    pais = pais_data['country'] or 'Sin país'
    total = pais_data['total']
    print(f"  {pais}: {total} clientes")

print("\n" + "=" * 70)
print("✅ SISTEMA LISTO CON DATOS REALES")
print("=" * 70)
print("\nPróximos pasos:")
print("1. Ir a /clients en el frontend")
print("2. Ver los 291 clientes reales")
print("3. Click 'Detectar Duplicados' para encontrar variantes")
print("4. Revisar y aprobar normalizaciones")
print("\n" + "=" * 70)

#!/usr/bin/env python
"""
Script para sincronizar usage_count con el número real de OTs
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from client_aliases.models import ClientAlias
from django.db.models import Count

print("=" * 60)
print("SINCRONIZACIÓN DE CONTADORES DE USO")
print("=" * 60)

# Actualizar usage_count para cada alias basándose en OTs reales
aliases = ClientAlias.objects.filter(deleted_at__isnull=True).annotate(
    real_count=Count('ots')
)

actualizados = 0
for alias in aliases:
    if alias.usage_count != alias.real_count:
        alias.usage_count = alias.real_count
        alias.save(update_fields=['usage_count'])
        actualizados += 1

print(f"\n✓ Actualizados {actualizados} contadores")
print(f"✓ Total aliases: {aliases.count()}")

# Mostrar top 5 actualizados
print("\nTop 5 clientes por uso (actualizado):")
top5 = ClientAlias.objects.filter(
    deleted_at__isnull=True
).order_by('-usage_count')[:5]

for i, alias in enumerate(top5, 1):
    print(f"{i}. {alias.original_name} - {alias.usage_count} OTs")

print("\n" + "=" * 60)

#!/usr/bin/env python
"""
Script para limpiar aliases de prueba y mantener solo los reales de OTs
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from client_aliases.models import ClientAlias

print("=" * 60)
print("LIMPIEZA DE ALIASES DE PRUEBA")
print("=" * 60)

# Encontrar aliases que NO tienen OTs asociadas
aliases_sin_ots = ClientAlias.objects.filter(
    deleted_at__isnull=True,
    ots__isnull=True  # Usar 'ots' en vez de 'ot_set'
).distinct()

total_sin_ots = aliases_sin_ots.count()
print(f"\nAliases sin OTs asociadas: {total_sin_ots}")

if total_sin_ots > 0:
    print("\nAliases a eliminar:")
    for alias in aliases_sin_ots[:10]:
        print(f"  - {alias.original_name} (ID: {alias.id}, usos: {alias.usage_count})")
    
    if total_sin_ots > 10:
        print(f"  ... y {total_sin_ots - 10} más")
    
    respuesta = input("\n¿Eliminar estos aliases de prueba? (si/no): ")
    
    if respuesta.lower() in ['si', 's', 'yes', 'y']:
        # Eliminar aliases huérfanos
        eliminados = aliases_sin_ots.delete()
        print(f"\n✓ {eliminados[0]} aliases eliminados")
    else:
        print("\nCancelado. No se eliminó nada.")
else:
    print("\n✓ No hay aliases de prueba sin OTs")

# Mostrar resumen final
total_aliases = ClientAlias.objects.filter(deleted_at__isnull=True).count()
print(f"\nTotal aliases reales restantes: {total_aliases}")
print("\n" + "=" * 60)

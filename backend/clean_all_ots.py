"""
Script para limpiar TODAS las OTs de la base de datos
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from ots.models import OT

# Contar antes
count_before = OT.objects.count()
print(f"\n=== Limpieza de Base de Datos ===")
print(f"OTs antes de borrar: {count_before}")

# Borrar todas
OT.objects.all().delete()

# Contar después
count_after = OT.objects.count()
print(f"OTs después de borrar: {count_after}")
print(f"✅ Se eliminaron {count_before} OTs")
print(f"\n¡Base de datos limpia! Ahora puedes importar desde cero.\n")

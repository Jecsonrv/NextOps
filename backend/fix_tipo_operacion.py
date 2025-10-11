"""
Script para corregir el tipo_operacion de las OTs existentes.

Establece todas las OTs a 'importacion' por defecto, ya que fueron
importadas antes de implementar esta funcionalidad.

Uso:
    docker-compose exec backend python manage.py shell < fix_tipo_operacion.py
"""

from ots.models import OT

print("=== Corrección de tipo_operacion ===\n")

# Contar OTs actuales
total = OT.objects.count()
exportacion_count = OT.objects.filter(tipo_operacion='exportacion').count()
importacion_count = OT.objects.filter(tipo_operacion='importacion').count()

print(f"Estado actual:")
print(f"  Total OTs: {total}")
print(f"  Exportación: {exportacion_count}")
print(f"  Importación: {importacion_count}")
print()

# Actualizar todas a importacion (ya que son datos legacy)
print("Actualizando todas las OTs a 'importacion'...")
updated = OT.objects.all().update(tipo_operacion='importacion')

print(f"✓ Actualizadas {updated} OTs")
print()

# Verificar resultado
exportacion_count_after = OT.objects.filter(tipo_operacion='exportacion').count()
importacion_count_after = OT.objects.filter(tipo_operacion='importacion').count()

print(f"Estado final:")
print(f"  Total OTs: {total}")
print(f"  Exportación: {exportacion_count_after}")
print(f"  Importación: {importacion_count_after}")
print()
print("✓ Corrección completada")
print()
print("NOTA: Las próximas OTs que importes tendrán el tipo detectado automáticamente.")

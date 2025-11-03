"""
Script para verificar y reparar patrones de proveedores.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from catalogs.models import Provider
from patterns.models import ProviderPattern, TargetField
from django.db import connection


def verificar_patrones():
    """Verifica el estado de los patrones en la base de datos"""
    
    print("=" * 80)
    print("VERIFICACIÓN DE PATRONES DE PROVEEDORES")
    print("=" * 80)
    
    # 1. Verificar proveedor CMA CGM
    print("\n1. BUSCANDO PROVEEDOR CMA CGM...")
    
    cma_variants = ['CMA CGM', 'CMA-CGM', 'CMACGM', 'CMA', 'CGM']
    cma_provider = None
    
    for variant in cma_variants:
        providers = Provider.objects.filter(
            nombre__icontains=variant,
            is_active=True,
            is_deleted=False
        )
        
        if providers.exists():
            for p in providers:
                print(f"   Encontrado: ID={p.id}, Nombre='{p.nombre}'")
                if 'CMA' in p.nombre.upper() and 'CGM' in p.nombre.upper():
                    cma_provider = p
                    print(f"   ✓ Seleccionado como CMA CGM principal")
                    break
    
    if not cma_provider:
        print("   ✗ NO SE ENCONTRÓ PROVEEDOR CMA CGM")
        print("   Creando proveedor CMA CGM...")
        
        # Crear proveedor si no existe
        cma_provider = Provider.objects.create(
            nombre='CMA CGM',
            tipo='naviera',
            categoria='internacional',
            is_active=True
        )
        print(f"   ✓ Proveedor CMA CGM creado con ID={cma_provider.id}")
    
    # 2. Verificar patrones de CMA CGM
    print(f"\n2. VERIFICANDO PATRONES DE {cma_provider.nombre} (ID={cma_provider.id})...")
    
    patrones = ProviderPattern.objects.filter(
        provider=cma_provider,
        is_deleted=False
    )
    
    print(f"   Total patrones (activos + inactivos): {patrones.count()}")
    
    patrones_activos = patrones.filter(is_active=True)
    print(f"   Patrones activos: {patrones_activos.count()}")
    
    if patrones_activos.exists():
        for p in patrones_activos:
            print(f"     • {p.name} (ID={p.id})")
            print(f"       Campo: {p.target_field.name if p.target_field else 'N/A'}")
            print(f"       Prioridad: {p.priority}")
            print(f"       Pattern: {p.pattern[:60]}...")
    else:
        print("   ✗ NO HAY PATRONES ACTIVOS")
        
        # Verificar si hay patrones inactivos
        patrones_inactivos = patrones.filter(is_active=False)
        if patrones_inactivos.exists():
            print(f"\n   ⚠ ENCONTRADOS {patrones_inactivos.count()} PATRONES INACTIVOS:")
            for p in patrones_inactivos:
                print(f"     • {p.name} (ID={p.id}) - INACTIVO")
            
            # Preguntar si activarlos
            respuesta = input("\n   ¿Deseas activar todos los patrones inactivos? (s/n): ")
            if respuesta.lower() == 's':
                patrones_inactivos.update(is_active=True)
                print(f"   ✓ {patrones_inactivos.count()} patrones activados")
    
    # 3. Verificar campos objetivo (TargetFields)
    print("\n3. VERIFICANDO CAMPOS OBJETIVO...")
    
    fields_requeridos = [
        ('numero_factura', 'Número de Factura', 'text'),
        ('monto_total', 'Monto Total', 'decimal'),
        ('fecha_emision', 'Fecha de Emisión', 'date'),
        ('numero_contenedor', 'Número de Contenedor', 'text'),
        ('mbl', 'Master Bill of Lading', 'text'),
    ]
    
    for code, name, data_type in fields_requeridos:
        field, created = TargetField.objects.get_or_create(
            code=code,
            defaults={
                'name': name,
                'data_type': data_type,
                'is_active': True
            }
        )
        
        if created:
            print(f"   ✓ Campo creado: {name} ({code})")
        else:
            status = "ACTIVO" if field.is_active else "INACTIVO"
            print(f"   • {name} ({code}) - {status}")
    
    # 4. Probar el servicio de patrones
    print("\n4. PROBANDO SERVICIO DE PATRONES...")
    
    from invoices.parsers.pattern_service import PatternApplicationService
    
    service = PatternApplicationService(provider_id=cma_provider.id)
    
    print(f"   Patrones cargados: {len(service.patterns)}")
    
    if service.patterns:
        print("   Patrones disponibles:")
        for p in service.patterns:
            print(f"     • {p.name} (Prioridad: {p.priority})")
    else:
        print("   ✗ NO SE CARGARON PATRONES")
        print("   DIAGNÓSTICO:")
        
        # Verificar en crudo con SQL
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    pp.id,
                    pp.name,
                    pp.is_active,
                    pp.is_deleted,
                    p.nombre as provider_name,
                    tf.name as field_name
                FROM patterns_provider_pattern pp
                LEFT JOIN catalogs_provider p ON pp.provider_id = p.id
                LEFT JOIN patterns_target_field tf ON pp.target_field_id = tf.id
                WHERE pp.provider_id = %s
            """, [cma_provider.id])
            
            rows = cursor.fetchall()
            
            if rows:
                print(f"\n   Patrones encontrados en BD (query directo): {len(rows)}")
                for row in rows:
                    pid, pname, pactive, pdeleted, prov_name, field_name = row
                    status = "ACTIVO" if pactive and not pdeleted else "INACTIVO/ELIMINADO"
                    print(f"     • ID={pid} | {pname} | {status}")
            else:
                print("   ✗ No hay patrones en la base de datos para este proveedor")
    
    # 5. Estadísticas finales
    print("\n5. ESTADÍSTICAS FINALES:")
    print(f"   Total proveedores: {Provider.objects.filter(is_active=True, is_deleted=False).count()}")
    print(f"   Total patrones: {ProviderPattern.objects.filter(is_active=True, is_deleted=False).count()}")
    print(f"   Patrones CMA CGM: {patrones_activos.count()}")
    
    print("\n" + "=" * 80)
    print("VERIFICACIÓN COMPLETADA")
    print("=" * 80)
    
    return cma_provider, patrones_activos


if __name__ == '__main__':
    verificar_patrones()

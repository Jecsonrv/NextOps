"""
Comando para diagnosticar problemas con los patrones de proveedores.
Uso: python manage.py diagnosticar_patrones [--proveedor NOMBRE]
"""

from django.core.management.base import BaseCommand
from catalogs.models import Provider
from patterns.models import ProviderPattern, TargetField
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Diagnostica problemas con los patrones de proveedores'

    def add_arguments(self, parser):
        parser.add_argument(
            '--proveedor',
            type=str,
            help='Nombre del proveedor a diagnosticar (ej: CMA CGM)',
        )

    def handle(self, *args, **options):
        proveedor_nombre = options.get('proveedor')

        self.stdout.write(self.style.SUCCESS('=== DIAGNÓSTICO DE PATRONES ===\n'))

        # 1. Listar todos los proveedores
        self.stdout.write(self.style.WARNING('1. PROVEEDORES EN LA BASE DE DATOS:'))
        proveedores = Provider.objects.filter(is_active=True, is_deleted=False)
        
        for prov in proveedores:
            count_patterns = ProviderPattern.objects.filter(
                provider=prov,
                is_active=True,
                is_deleted=False
            ).count()
            
            marker = '✓' if count_patterns > 0 else '✗'
            self.stdout.write(
                f"  {marker} ID={prov.id} | {prov.nombre} | Patrones: {count_patterns}"
            )

        # 2. Si se especificó un proveedor, mostrar detalles
        if proveedor_nombre:
            self.stdout.write(self.style.WARNING(f'\n2. DETALLES DE PROVEEDOR: {proveedor_nombre}'))
            
            try:
                proveedor = Provider.objects.get(
                    nombre__icontains=proveedor_nombre,
                    is_active=True,
                    is_deleted=False
                )
                
                self.stdout.write(f"  Encontrado: ID={proveedor.id}, Nombre={proveedor.nombre}")
                
                # Listar patrones
                patrones = ProviderPattern.objects.filter(
                    provider=proveedor,
                    is_active=True,
                    is_deleted=False
                ).select_related('target_field')
                
                if patrones.exists():
                    self.stdout.write(self.style.SUCCESS(f'\n  PATRONES ACTIVOS ({patrones.count()}):'))
                    for p in patrones:
                        self.stdout.write(
                            f"    • {p.name} (ID={p.id})\n"
                            f"      Campo: {p.target_field.name} ({p.target_field.code})\n"
                            f"      Prioridad: {p.priority}\n"
                            f"      Pattern: {p.pattern[:80]}..."
                        )
                else:
                    self.stdout.write(self.style.ERROR('  ✗ NO HAY PATRONES ACTIVOS'))
                    
                    # Verificar si hay patrones inactivos o eliminados
                    patrones_inactivos = ProviderPattern.objects.filter(
                        provider=proveedor,
                        is_active=False
                    ).count()
                    
                    patrones_eliminados = ProviderPattern.objects.filter(
                        provider=proveedor,
                        is_deleted=True
                    ).count()
                    
                    if patrones_inactivos > 0:
                        self.stdout.write(f"  ⚠ Hay {patrones_inactivos} patrones INACTIVOS")
                    
                    if patrones_eliminados > 0:
                        self.stdout.write(f"  ⚠ Hay {patrones_eliminados} patrones ELIMINADOS")
            
            except Provider.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'  ✗ PROVEEDOR NO ENCONTRADO: {proveedor_nombre}'))
                
                # Sugerir proveedores similares
                similares = Provider.objects.filter(
                    nombre__icontains=proveedor_nombre.split()[0],
                    is_active=True,
                    is_deleted=False
                )
                
                if similares.exists():
                    self.stdout.write('  Proveedores similares:')
                    for s in similares:
                        self.stdout.write(f"    - {s.nombre}")
        
        # 3. Verificar campos objetivo (TargetFields)
        self.stdout.write(self.style.WARNING('\n3. CAMPOS OBJETIVO (TARGET FIELDS):'))
        fields = TargetField.objects.filter(is_active=True, is_deleted=False)
        
        for field in fields:
            count_patterns = ProviderPattern.objects.filter(
                target_field=field,
                is_active=True,
                is_deleted=False
            ).count()
            
            self.stdout.write(f"  • {field.name} ({field.code}) - {count_patterns} patrones")
        
        # 4. Estadísticas generales
        self.stdout.write(self.style.WARNING('\n4. ESTADÍSTICAS GENERALES:'))
        total_providers = Provider.objects.filter(is_active=True, is_deleted=False).count()
        total_patterns = ProviderPattern.objects.filter(is_active=True, is_deleted=False).count()
        total_fields = TargetField.objects.filter(is_active=True, is_deleted=False).count()
        
        providers_with_patterns = ProviderPattern.objects.filter(
            is_active=True,
            is_deleted=False
        ).values('provider').distinct().count()
        
        self.stdout.write(f"  Total proveedores activos: {total_providers}")
        self.stdout.write(f"  Proveedores con patrones: {providers_with_patterns}")
        self.stdout.write(f"  Total patrones activos: {total_patterns}")
        self.stdout.write(f"  Total campos objetivo: {total_fields}")
        
        # 5. Recomendaciones
        self.stdout.write(self.style.WARNING('\n5. RECOMENDACIONES:'))
        
        if total_patterns == 0:
            self.stdout.write(self.style.ERROR('  ✗ NO HAY PATRONES EN EL SISTEMA'))
            self.stdout.write('    - Ejecuta las migraciones de patrones')
            self.stdout.write('    - O crea patrones manualmente en el admin')
        
        if proveedor_nombre:
            try:
                proveedor = Provider.objects.get(
                    nombre__icontains=proveedor_nombre,
                    is_active=True,
                    is_deleted=False
                )
                
                if not ProviderPattern.objects.filter(provider=proveedor, is_active=True).exists():
                    self.stdout.write(
                        f'  ⚠ El proveedor "{proveedor.nombre}" no tiene patrones activos.'
                    )
                    self.stdout.write(
                        f'    - Crea patrones en: /admin/patterns/providerpattern/add/'
                    )
                    self.stdout.write(
                        f'    - O importa patrones desde fixtures'
                    )
            except Provider.DoesNotExist:
                pass
        
        self.stdout.write(self.style.SUCCESS('\n=== DIAGNÓSTICO COMPLETADO ==='))

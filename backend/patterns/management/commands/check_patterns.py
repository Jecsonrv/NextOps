"""
Comando para verificar patrones de proveedores.
Uso: python manage.py check_patterns [--provider "NOMBRE"]
"""

from django.core.management.base import BaseCommand
from catalogs.models import Provider
from patterns.models import ProviderPattern, TargetField


class Command(BaseCommand):
    help = 'Verifica y lista los patrones de proveedores'

    def add_arguments(self, parser):
        parser.add_argument(
            '--provider',
            type=str,
            help='Nombre del proveedor (ej: "CMA CGM")',
        )

    def handle(self, *args, **options):
        provider_name = options.get('provider')

        self.stdout.write(self.style.SUCCESS('\n=== VERIFICACIÓN DE PATRONES ===\n'))

        # Listar todos los proveedores activos
        providers = Provider.objects.filter(is_active=True, is_deleted=False)
        
        self.stdout.write(f'Total proveedores activos: {providers.count()}\n')

        for provider in providers:
            patterns = ProviderPattern.objects.filter(
                provider=provider,
                is_active=True,
                is_deleted=False
            )
            count = patterns.count()
            
            marker = '✓' if count > 0 else '✗'
            self.stdout.write(
                f'{marker} {provider.nombre} (ID={provider.id}): {count} patrones'
            )

            # Si se especificó este proveedor, mostrar detalles
            if provider_name and provider_name.lower() in provider.nombre.lower():
                if patterns.exists():
                    self.stdout.write(self.style.SUCCESS('\n  Patrones activos:'))
                    for p in patterns:
                        self.stdout.write(
                            f'    • {p.name} (Prioridad: {p.priority})\n'
                            f'      Campo: {p.target_field.name if p.target_field else "N/A"}\n'
                            f'      Pattern: {p.pattern[:60]}...'
                        )
                else:
                    self.stdout.write(self.style.ERROR('  ✗ NO HAY PATRONES ACTIVOS'))
                    
                    # Verificar si hay patrones inactivos
                    inactive = ProviderPattern.objects.filter(
                        provider=provider,
                        is_deleted=False
                    ).exclude(is_active=True).count()
                    
                    if inactive > 0:
                        self.stdout.write(f'  ⚠ Hay {inactive} patrones INACTIVOS')

        # Estadísticas generales
        total_patterns = ProviderPattern.objects.filter(
            is_active=True, 
            is_deleted=False
        ).count()
        
        total_fields = TargetField.objects.filter(
            is_active=True,
            is_deleted=False
        ).count()

        self.stdout.write(self.style.WARNING(f'\nEstadísticas:'))
        self.stdout.write(f'  Total patrones activos: {total_patterns}')
        self.stdout.write(f'  Total campos objetivo: {total_fields}')
        
        self.stdout.write(self.style.SUCCESS('\n=== VERIFICACIÓN COMPLETADA ===\n'))

"""
Comando para migrar patrones del sistema viejo (patterns.ProviderPattern) 
al nuevo sistema (catalogs.InvoicePatternCatalog).
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from catalogs.models import InvoicePatternCatalog
from patterns.models import ProviderPattern


class Command(BaseCommand):
    help = 'Migra patrones del sistema viejo al catálogo nuevo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la migración sin aplicar cambios',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 Modo DRY RUN - No se aplicarán cambios'))
        
        # Obtener todos los patrones viejos activos
        old_patterns = ProviderPattern.objects.filter(is_active=True).select_related('provider_type', 'target_field')
        
        total = old_patterns.count()
        migrated = 0
        skipped = 0
        errors = 0
        
        self.stdout.write(f'\n📊 Encontrados {total} patrones activos en el sistema viejo\n')
        
        for old_pattern in old_patterns:
            try:
                # Mapear nombre de proveedor
                proveedor_nombre = old_pattern.provider_type.name if old_pattern.provider_type else 'GENERICO'
                
                # Mapear tipo de patrón (campo objetivo)
                tipo_patron_map = {
                    'numero_factura': 'numero_factura',
                    'invoice_number': 'numero_factura',
                    'fecha_emision': 'fecha_emision',
                    'emission_date': 'fecha_emision',
                    'fecha_vencimiento': 'fecha_vencimiento',
                    'due_date': 'fecha_vencimiento',
                    'monto_total': 'monto_total',
                    'total_amount': 'monto_total',
                    'subtotal': 'subtotal',
                    'mbl': 'mbl',
                    'hbl': 'hbl',
                    'numero_contenedor': 'numero_contenedor',
                    'container_number': 'numero_contenedor',
                }
                
                target_field_name = old_pattern.target_field.field_name if old_pattern.target_field else 'numero_factura'
                tipo_patron = tipo_patron_map.get(target_field_name, 'numero_factura')
                
                # Verificar si ya existe un patrón similar
                existing = InvoicePatternCatalog.objects.filter(
                    proveedor=proveedor_nombre,
                    tipo_patron=tipo_patron,
                    patron=old_pattern.pattern,
                ).first()
                
                if existing:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️  Patrón duplicado: {proveedor_nombre} - {tipo_patron} (ID: {old_pattern.id})'
                        )
                    )
                    skipped += 1
                    continue
                
                # Crear el nuevo patrón
                if not dry_run:
                    new_pattern = InvoicePatternCatalog.objects.create(
                        proveedor=proveedor_nombre,
                        categoria='PROVEEDOR',
                        tipo_patron=tipo_patron,
                        patron=old_pattern.pattern,
                        es_regex=True,  # Los patrones viejos siempre eran regex
                        prioridad=old_pattern.priority,
                        descripcion=old_pattern.description or f'Migrado desde patrón ID {old_pattern.id}',
                        ejemplo_texto=old_pattern.example_text or '',
                        activo=old_pattern.is_active,
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Migrado: {proveedor_nombre} - {tipo_patron} → ID {new_pattern.id}'
                        )
                    )
                else:
                    self.stdout.write(
                        f'[DRY RUN] Crearía: {proveedor_nombre} - {tipo_patron}'
                    )
                
                migrated += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Error migrando patrón ID {old_pattern.id}: {str(e)}'
                    )
                )
                errors += 1
        
        # Resumen
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'✓ Patrones migrados: {migrated}'))
        self.stdout.write(self.style.WARNING(f'⚠️  Patrones omitidos (duplicados): {skipped}'))
        if errors > 0:
            self.stdout.write(self.style.ERROR(f'❌ Errores: {errors}'))
        self.stdout.write('='*60 + '\n')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\n⚠️  Esta fue una simulación. Ejecuta sin --dry-run para aplicar los cambios.'
                )
            )

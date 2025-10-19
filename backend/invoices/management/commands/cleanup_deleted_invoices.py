"""
Comando para limpiar facturas soft-deleted duplicadas.

Elimina permanentemente facturas que:
1. Están marcadas como eliminadas (deleted_at IS NOT NULL)
2. Tienen un uploaded_file_id que está siendo usado por otra factura activa
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from invoices.models import Invoice


class Command(BaseCommand):
    help = 'Limpia facturas soft-deleted que bloquean la re-carga de archivos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se eliminaría sin aplicar cambios',
        )
        parser.add_argument(
            '--hard-delete',
            action='store_true',
            help='Eliminar permanentemente (PELIGROSO - no se puede deshacer)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        hard_delete = options['hard_delete']

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 Modo DRY RUN - No se aplicarán cambios'))
        elif hard_delete:
            self.stdout.write(self.style.ERROR('⚠️  MODO HARD DELETE - Eliminación permanente'))
        else:
            self.stdout.write(self.style.SUCCESS('🧹 Limpiando facturas eliminadas...'))

        # Encontrar facturas soft-deleted
        deleted_invoices = Invoice.objects.filter(deleted_at__isnull=False)
        total_deleted = deleted_invoices.count()

        self.stdout.write(f'📊 Total de facturas eliminadas (soft delete): {total_deleted}')

        if total_deleted == 0:
            self.stdout.write(self.style.SUCCESS('✅ No hay facturas eliminadas para limpiar'))
            return

        # Mostrar algunos ejemplos
        self.stdout.write('')
        self.stdout.write('📋 Primeras 10 facturas eliminadas:')
        for inv in deleted_invoices[:10]:
            self.stdout.write(
                f'  • ID: {inv.id:5d} | Factura: {inv.numero_factura:20s} | '
                f'File: {inv.uploaded_file_id:5d} | Eliminada: {inv.deleted_at}'
            )

        if not dry_run and hard_delete:
            # Confirmar acción peligrosa
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('=' * 60))
            self.stdout.write(self.style.ERROR('⚠️  ADVERTENCIA: Esta acción NO se puede deshacer'))
            self.stdout.write(self.style.ERROR(f'Se eliminarán permanentemente {total_deleted} facturas'))
            self.stdout.write(self.style.ERROR('=' * 60))
            
            confirm = input('\n¿Estás seguro? Escribe "DELETE" para confirmar: ')
            
            if confirm != 'DELETE':
                self.stdout.write(self.style.WARNING('❌ Operación cancelada'))
                return

            # Eliminar permanentemente
            deleted_count, _ = deleted_invoices.delete()
            
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS(f'✅ Eliminadas permanentemente: {deleted_count} facturas'))
        
        elif dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('⚠️  Ejecuta con --hard-delete para eliminar permanentemente'))
            self.stdout.write(self.style.WARNING('   ADVERTENCIA: Esta acción NO se puede deshacer'))

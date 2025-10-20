"""
Comando de mantenimiento para limpiar facturas eliminadas (soft delete).

Uso:
    python manage.py cleanup_deleted_invoices --dry-run      # Ver qué se eliminaría
    python manage.py cleanup_deleted_invoices --hard-delete  # Eliminar permanentemente

⚠️ ADVERTENCIA: --hard-delete elimina permanentemente los registros de la BD.
   Solo usar cuando estés seguro de que no necesitas recuperar esas facturas.

Útil para:
- Liberar espacio en la base de datos
- Limpiar uploaded_file_id para permitir re-carga de archivos
- Mantenimiento periódico de la BD
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django.db.models import Count, Q
from invoices.models import Invoice, CreditNote, Dispute, UploadedFile
from ots.models import OT
from django.utils import timezone


class Command(BaseCommand):
    help = (
        'Elimina facturas, notas de crédito y disputas según modo seleccionado. '
        'Por defecto limpia registros soft-deleted; con --purge borra toda la data.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Cantidad de días después de los cuales las facturas soft-deleted serán eliminadas permanentemente. '
        )
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
        parser.add_argument(
            '--purge',
            action='store_true',
            help='Elimina TODAS las facturas, notas de crédito y disputas (solo usar en entornos de desarrollo).'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        hard_delete = options['hard_delete']
        purge = options['purge']

        if purge:
            if not settings.DEBUG:
                self.stdout.write(self.style.ERROR('❌ Cancelado: --purge solo está permitido en entornos de desarrollo (DEBUG=True).'))
                return

            self.stdout.write(self.style.WARNING('⚠ Eliminando TODAS las facturas, notas de crédito, disputas, OTs huérfanas y archivos subidos...'))
            deleted_invoices, _ = Invoice.objects.all().delete()
            deleted_credit_notes, _ = CreditNote.objects.all().delete()
            deleted_disputes, _ = Dispute.objects.all().delete()

            # Eliminar OTs sin facturas asociadas
            orphan_ots = OT.objects.filter(facturas__isnull=True)
            deleted_ots = orphan_ots.count()
            orphan_ots.delete()

            # Eliminar archivos subidos sin factura
            orphan_files = UploadedFile.objects.filter(invoice__isnull=True)
            deleted_files = orphan_files.count()
            orphan_files.delete()

            self.stdout.write(self.style.SUCCESS(
                f'✅ Purga completa: {deleted_invoices} facturas, '
                f'{deleted_credit_notes} notas de crédito, {deleted_disputes} disputas, '
                f'{deleted_ots} OTs y {deleted_files} archivos eliminados.'
            ))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 Modo DRY RUN - No se aplicarán cambios'))
        elif hard_delete:
            self.stdout.write(self.style.ERROR('⚠️  MODO HARD DELETE - Eliminación permanente'))
        else:
            self.stdout.write(self.style.SUCCESS('🧹 Limpiando facturas eliminadas...'))

        cutoff_date = timezone.now() - timezone.timedelta(days=days)

        invoices_deleted = Invoice.objects.filter(deleted_at__isnull=False)
        total_deleted = invoices_deleted.count()
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

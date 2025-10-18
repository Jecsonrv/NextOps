"""
Comando de Django para recalcular el usage_count de todos los ClientAlias
basándose en el número real de OTs que usan cada cliente.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count
from client_aliases.models import ClientAlias
from ots.models import OT


class Command(BaseCommand):
    help = 'Recalcula el usage_count de todos los clientes basándose en las OTs existentes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se haría sin aplicar cambios',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 Modo DRY RUN - No se aplicarán cambios'))
        else:
            self.stdout.write(self.style.SUCCESS('🔄 Recalculando usage_count...'))

        # Obtener todos los ClientAlias activos
        aliases = ClientAlias.objects.filter(deleted_at__isnull=True)
        total_aliases = aliases.count()

        self.stdout.write(f'📊 Total de clientes a procesar: {total_aliases}')

        updated = 0
        unchanged = 0

        for alias in aliases:
            # Contar OTs activas que usan este cliente
            real_count = OT.objects.filter(
                cliente=alias,
                deleted_at__isnull=True
            ).count()

            old_count = alias.usage_count or 0

            if real_count != old_count:
                if not dry_run:
                    alias.usage_count = real_count
                    alias.save(update_fields=['usage_count', 'updated_at'])
                
                self.stdout.write(
                    f'  ✏️  {alias.original_name[:50]:50} | {old_count:4d} → {real_count:4d}'
                )
                updated += 1
            else:
                unchanged += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✅ Procesamiento completado:'))
        self.stdout.write(f'   • Actualizados: {updated}')
        self.stdout.write(f'   • Sin cambios: {unchanged}')
        self.stdout.write(f'   • Total: {total_aliases}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  Ejecuta sin --dry-run para aplicar los cambios'))

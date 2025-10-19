"""
Comando combinado para arreglar todos los problemas de producción.
Ejecuta:
1. Recalcular usage_count de clientes
2. Limpiar sugerencias obsoletas
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Arregla todos los problemas de producción (usage_count + limpieza de duplicados)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se haría sin aplicar cambios',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('🔧 ARREGLANDO PRODUCCIÓN'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')

        # PASO 1: Recalcular usage_count
        self.stdout.write(self.style.SUCCESS('📊 PASO 1: Recalculando contadores de OTs...'))
        self.stdout.write('')
        call_command('recalculate_client_usage', dry_run=dry_run)
        
        self.stdout.write('')
        self.stdout.write('-' * 60)
        self.stdout.write('')

        # PASO 2: Limpiar duplicados obsoletos
        self.stdout.write(self.style.SUCCESS('🧹 PASO 2: Limpiando duplicados obsoletos...'))
        self.stdout.write('')
        call_command('clean_obsolete_matches', dry_run=dry_run)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('✅ PROCESO COMPLETADO'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        if dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('⚠️  Esto fue un DRY RUN - ejecuta sin --dry-run para aplicar'))

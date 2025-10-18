"""
Comando de Django para limpiar sugerencias de similitud obsoletas.

Rechaza automáticamente sugerencias donde:
1. Uno o ambos clientes ya están fusionados
2. Uno o ambos clientes fueron eliminados
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone
from client_aliases.models import SimilarityMatch
from accounts.models import User


class Command(BaseCommand):
    help = 'Limpia sugerencias de similitud obsoletas (con clientes fusionados o eliminados)'

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
            self.stdout.write(self.style.SUCCESS('🧹 Limpiando sugerencias obsoletas...'))

        # Obtener un usuario admin para asignar como reviewer (o usar el primero disponible)
        system_user = User.objects.filter(is_staff=True).first()
        if not system_user:
            self.stdout.write(self.style.ERROR('❌ No se encontró ningún usuario admin para asignar como reviewer'))
            return

        # Buscar sugerencias pendientes donde algún alias está fusionado
        obsolete_merged = SimilarityMatch.objects.filter(
            status='pending'
        ).filter(
            Q(alias_1__merged_into__isnull=False) | Q(alias_2__merged_into__isnull=False)
        )

        count_merged = obsolete_merged.count()

        # Buscar sugerencias pendientes donde algún alias fue eliminado
        obsolete_deleted = SimilarityMatch.objects.filter(
            status='pending'
        ).filter(
            Q(alias_1__deleted_at__isnull=False) | Q(alias_2__deleted_at__isnull=False)
        )

        count_deleted = obsolete_deleted.count()

        self.stdout.write(f'📊 Sugerencias a limpiar:')
        self.stdout.write(f'   • Con clientes fusionados: {count_merged}')
        self.stdout.write(f'   • Con clientes eliminados: {count_deleted}')
        self.stdout.write('')

        if not dry_run:
            # Rechazar las sugerencias con clientes fusionados
            for match in obsolete_merged:
                match.status = 'rejected'
                match.review_notes = 'Auto-rechazado: uno o ambos clientes ya fueron fusionados/normalizados'
                match.reviewed_by = system_user
                match.reviewed_at = timezone.now()
                match.save(update_fields=['status', 'review_notes', 'reviewed_by', 'reviewed_at'])

            # Rechazar las sugerencias con clientes eliminados
            for match in obsolete_deleted:
                match.status = 'rejected'
                match.review_notes = 'Auto-rechazado: uno o ambos clientes fueron eliminados'
                match.reviewed_by = system_user
                match.reviewed_at = timezone.now()
                match.save(update_fields=['status', 'review_notes', 'reviewed_by', 'reviewed_at'])

            self.stdout.write(self.style.SUCCESS(f'✅ Limpieza completada:'))
            self.stdout.write(f'   • Rechazadas (fusionados): {count_merged}')
            self.stdout.write(f'   • Rechazadas (eliminados): {count_deleted}')
            self.stdout.write(f'   • Total: {count_merged + count_deleted}')
        else:
            self.stdout.write(self.style.WARNING('\n⚠️  Ejecuta sin --dry-run para aplicar los cambios'))

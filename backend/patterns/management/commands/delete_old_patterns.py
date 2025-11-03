"""
Comando para eliminar todos los patrones del sistema viejo (ProviderPattern)
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Elimina todos los patrones del sistema viejo (ProviderPattern)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmar la eliminación de todos los patrones',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  Este comando eliminará TODOS los patrones del sistema viejo.\n'
                    '   Para confirmar, ejecuta: python manage.py delete_old_patterns --confirm'
                )
            )
            return

        # Importar aquí para evitar errores si el modelo no existe
        try:
            from patterns.models import ProviderPattern
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error importando ProviderPattern: {str(e)}')
            )
            return

        # Contar patrones antes de eliminar
        total_patterns = ProviderPattern.objects.count()
        active_patterns = ProviderPattern.objects.filter(is_active=True).count()
        
        self.stdout.write(f'\n📊 Patrones encontrados:')
        self.stdout.write(f'   Total: {total_patterns}')
        self.stdout.write(f'   Activos: {active_patterns}')
        
        if total_patterns == 0:
            self.stdout.write(self.style.SUCCESS('\n✅ No hay patrones para eliminar'))
            return
        
        # Eliminar todos los patrones
        deleted_count, _ = ProviderPattern.objects.all().delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Se eliminaron {deleted_count} patrones exitosamente'
            )
        )

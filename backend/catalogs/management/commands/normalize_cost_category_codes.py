"""
Management command para normalizar códigos de categorías de costo a MAYÚSCULAS.
Actualiza todos los códigos existentes en la base de datos.

Uso:
    python manage.py normalize_cost_category_codes
"""

from django.core.management.base import BaseCommand
from catalogs.models import CostCategory


class Command(BaseCommand):
    help = 'Normaliza todos los códigos de categorías de costo a MAYÚSCULAS'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar cambios sin aplicarlos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        self.stdout.write(self.style.WARNING(
            '\n=== Normalización de Códigos de Categorías de Costo ===\n'
        ))

        if dry_run:
            self.stdout.write(self.style.NOTICE('MODO DRY-RUN: No se aplicarán cambios\n'))

        # Obtener todas las categorías activas
        categories = CostCategory.objects.all()
        total = categories.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS('No hay categorías para normalizar.'))
            return

        self.stdout.write(f'Se encontraron {total} categorías de costo.\n')

        updated_count = 0
        unchanged_count = 0

        for category in categories:
            old_code = category.code
            new_code = old_code.strip().upper().replace(' ', '_') if old_code else ''

            if old_code != new_code:
                self.stdout.write(
                    f'  • [{category.id}] "{old_code}" → "{new_code}" '
                    f'({category.name})'
                )

                if not dry_run:
                    # Actualizar sin triggear el save() que ya normaliza
                    CostCategory.objects.filter(id=category.id).update(code=new_code)

                updated_count += 1
            else:
                unchanged_count += 1

        # Resumen
        self.stdout.write('\n' + '='*60)
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'\n[DRY-RUN] Se normalizarían {updated_count} códigos'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\n✓ {updated_count} códigos normalizados exitosamente'
            ))

        self.stdout.write(f'  • {unchanged_count} códigos ya estaban correctos')
        self.stdout.write(f'  • Total procesado: {total}\n')

        if dry_run and updated_count > 0:
            self.stdout.write(self.style.NOTICE(
                '\nEjecuta sin --dry-run para aplicar los cambios.\n'
            ))

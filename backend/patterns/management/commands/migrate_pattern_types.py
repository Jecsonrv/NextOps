"""
Script para migrar datos de pattern_type a target_field
"""
from django.core.management.base import BaseCommand
from patterns.models import ProviderPattern, TargetField


class Command(BaseCommand):
    help = 'Migra datos de pattern_type a target_field basándose en el nombre'

    def handle(self, *args, **options):
        self.stdout.write('Migrando pattern_type a target_field...')
        
        # Mapeo de pattern_type antiguo a nuevos códigos de target_field
        # Como no tenemos acceso a pattern_type porque ya se eliminó,
        # asignamos un valor por defecto a todos los patrones sin target_field
        
        default_field = TargetField.objects.filter(code='provider_name').first()
        
        if not default_field:
            self.stdout.write(
                self.style.ERROR('No se encontró el campo provider_name')
            )
            return
        
        patterns_without_target = ProviderPattern.objects.filter(target_field__isnull=True)
        count = patterns_without_target.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No hay patrones por migrar')
            )
            return
        
        patterns_without_target.update(target_field=default_field)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ {count} patrones actualizados con target_field=provider_name'
            )
        )

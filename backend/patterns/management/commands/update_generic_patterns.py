from django.core.management.base import BaseCommand
from patterns.models import ProviderPattern, TargetField

class Command(BaseCommand):
    help = 'Updates generic patterns for invoice recognition'

    def handle(self, *args, **options):
        target_fields = {
            'fecha_emision': TargetField.objects.get(code='fecha_emision'),
            'monto_total': TargetField.objects.get(code='monto_total'),
        }

        # Deactivate old patterns
        ProviderPattern.objects.filter(target_field=target_fields['fecha_emision']).update(is_active=False)
        ProviderPattern.objects.filter(target_field=target_fields['monto_total']).update(is_active=False)

        patterns = [
            {
                'name': 'Fecha de Emisión Genérico',
                'pattern': r'(?:(?:Fecha de Emisión|Fecha y Hora de Generación|Fecha/Hora Gen)\s*:?\s*)?(\d{2}[-/]\d{2}[-/]\d{4})',
                'target_field': target_fields['fecha_emision'],
                'provider_id': 1,
            },
            {
                'name': 'Monto Total Genérico',
                'pattern': r'(?:Monto Total de la Operación|TOTAL A PAGAR|Total operaciones):?\s*(?:USD|\$)?\s*([\d,]+\.\d{2})',
                'target_field': target_fields['monto_total'],
                'provider_id': 1,
            },
        ]

        for pattern_data in patterns:
            ProviderPattern.objects.update_or_create(
                name=pattern_data['name'],
                defaults=pattern_data
            )

        self.stdout.write(self.style.SUCCESS('Successfully updated generic patterns.'))

from django.core.management.base import BaseCommand
from patterns.models import ProviderPattern, TargetField
from catalogs.models import Provider

class Command(BaseCommand):
    help = 'Creates generic patterns for invoice recognition'

    def handle(self, *args, **options):
        try:
            generic_provider = Provider.objects.get(id=1)
        except Provider.DoesNotExist:
            self.stdout.write(self.style.ERROR('Generic provider with id=1 does not exist.'))
            return

        target_fields = {
            'numero_control': TargetField.objects.get(code='numero_control'),
            'fecha_emision': TargetField.objects.get(code='fecha_emision'),
            'monto_total': TargetField.objects.get(code='monto_total'),
        }

        patterns = [
            {
                'name': 'DTE - Número de Control',
                'pattern': r'DTE-[0-9]{2}-[A-Z0-9]{8}-[0-9]{15}',
                'target_field': target_fields['numero_control'],
                'provider': generic_provider,
            },
            {
                'name': 'UUID - Número de Control',
                'pattern': r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
                'target_field': target_fields['numero_control'],
                'provider': generic_provider,
            },
            {
                'name': 'Fecha de Emisión Genérico',
                'pattern': r'(?:Fecha de Emisión|Fecha y Hora de Generación|Fecha/Hora Gen):?\s*(\d{4}[-/]\d{2}[-/]\d{2})',
                'target_field': target_fields['fecha_emision'],
                'provider': generic_provider,
            },
            {
                'name': 'Monto Total Genérico',
                'pattern': r'(?:Monto Total de la Operación|TOTAL A PAGAR|Total operaciones):?\s*(?:USD|\$)?\s*([\d,]+\.\d{2})',
                'target_field': target_fields['monto_total'],
                'provider': generic_provider,
            },
        ]

        for pattern_data in patterns:
            ProviderPattern.objects.get_or_create(
                provider=pattern_data['provider'],
                name=pattern_data['name'],
                defaults=pattern_data
            )

        self.stdout.write(self.style.SUCCESS('Successfully created generic patterns.'))
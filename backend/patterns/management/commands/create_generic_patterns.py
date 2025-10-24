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
            'numero_factura': TargetField.objects.get(code='numero_factura'),
            'fecha_emision': TargetField.objects.get(code='fecha_emision'),
            'monto_total': TargetField.objects.get(code='monto_total'),
        }

        patterns = [
            {
                'name': 'DTE - Número de Factura (Genérico)',
                'pattern': r'(DTE-[0-9]{2}-[A-Z0-9]{9}-[0-9]{15})',
                'target_field': target_fields['numero_factura'],
                'provider': generic_provider,
                'priority': 10,
            },
            {
                'name': 'UUID - Número de Factura (Genérico)',
                'pattern': r'([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})',
                'target_field': target_fields['numero_factura'],
                'provider': generic_provider,
                'priority': 5,
            },
            {
                'name': 'Fecha de Emisión (Genérico)',
                'pattern': r'(?:Fecha\s+de\s+Emisión|Fecha/Hora\s+Gen|F\.\s+Vence):?\s*(\d{2}/\d{2}/\d{4})',
                'target_field': target_fields['fecha_emision'],
                'provider': generic_provider,
                'priority': 10,
            },
            {
                'name': 'Monto Total (Genérico)',
                'pattern': r'(?:TOTAL\s+A\s+PAGAR|Monto\s+Total\s+de\s+la\s+Operación|Total\s+operaciones):?\s*(?:USD|\$)?\s*([\d,]+\.\d{2})',
                'target_field': target_fields['monto_total'],
                'provider': generic_provider,
                'priority': 10,
            },
        ]

        for pattern_data in patterns:
            ProviderPattern.objects.get_or_create(
                provider=pattern_data['provider'],
                name=pattern_data['name'],
                defaults=pattern_data
            )

        self.stdout.write(self.style.SUCCESS('Successfully created generic patterns.'))
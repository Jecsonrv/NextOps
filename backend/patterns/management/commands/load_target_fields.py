"""
Script para crear campos objetivo iniciales
"""
from django.core.management.base import BaseCommand
from patterns.models import TargetField


class Command(BaseCommand):
    help = 'Crea campos objetivo iniciales para el sistema'

    def handle(self, *args, **options):
        self.stdout.write('Creando campos objetivo iniciales...')
        
        fields = [
            {
                'code': 'invoice_number',
                'name': 'Número de Factura',
                'description': 'Número de la factura o invoice del proveedor',
                'data_type': 'text',
                'priority': 100,
                'example_value': 'INV-2024-00123',
            },
            {
                'code': 'mbl',
                'name': 'MBL (Master Bill of Lading)',
                'description': 'Número de conocimiento de embarque maestro',
                'data_type': 'text',
                'priority': 90,
                'example_value': 'MAEU123456789',
            },
            {
                'code': 'hbl',
                'name': 'HBL (House Bill of Lading)',
                'description': 'Número de conocimiento de embarque house',
                'data_type': 'text',
                'priority': 85,
                'example_value': 'ABC1234567',
            },
            {
                'code': 'container_number',
                'name': 'Número de Contenedor',
                'description': 'Número del contenedor',
                'data_type': 'text',
                'priority': 80,
                'example_value': 'MSCU1234567',
            },
            {
                'code': 'total_amount',
                'name': 'Monto Total',
                'description': 'Monto total de la factura',
                'data_type': 'decimal',
                'priority': 95,
                'example_value': '1250.50',
            },
            {
                'code': 'issue_date',
                'name': 'Fecha de Emisión',
                'description': 'Fecha de emisión de la factura',
                'data_type': 'date',
                'priority': 70,
                'example_value': '2024-10-07',
            },
            {
                'code': 'due_date',
                'name': 'Fecha de Vencimiento',
                'description': 'Fecha de vencimiento del pago',
                'data_type': 'date',
                'priority': 65,
                'example_value': '2024-11-07',
            },
            {
                'code': 'provider_nit',
                'name': 'NIT del Proveedor',
                'description': 'Número de identificación tributaria del proveedor',
                'data_type': 'text',
                'priority': 75,
                'example_value': '900123456-7',
            },
            {
                'code': 'provider_name',
                'name': 'Nombre del Proveedor',
                'description': 'Nombre completo o razón social del proveedor',
                'data_type': 'text',
                'priority': 78,
                'example_value': 'MAERSK LINE',
            },
            {
                'code': 'booking_number',
                'name': 'Número de Booking',
                'description': 'Número de reserva o booking',
                'data_type': 'text',
                'priority': 60,
                'example_value': 'BK123456789',
            },
            {
                'code': 'port_origin',
                'name': 'Puerto de Origen',
                'description': 'Puerto de origen del embarque',
                'data_type': 'text',
                'priority': 50,
                'example_value': 'SHANGHAI',
            },
            {
                'code': 'port_destination',
                'name': 'Puerto de Destino',
                'description': 'Puerto de destino del embarque',
                'data_type': 'text',
                'priority': 50,
                'example_value': 'BUENAVENTURA',
            },
            {
                'code': 'ot_number',
                'name': 'Número de OT',
                'description': 'Número de orden de trabajo',
                'data_type': 'text',
                'priority': 55,
                'example_value': 'OT-2024-001',
            },
        ]
        
        created = 0
        updated = 0
        
        for field_data in fields:
            field, created_flag = TargetField.objects.get_or_create(
                code=field_data['code'],
                defaults=field_data
            )
            
            if created_flag:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Creado: {field.name} ({field.code})')
                )
            else:
                # Actualizar campos si ya existe
                for key, value in field_data.items():
                    if key != 'code':
                        setattr(field, key, value)
                field.save()
                updated += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Actualizado: {field.name} ({field.code})')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Proceso completado: {created} creados, {updated} actualizados'
            )
        )

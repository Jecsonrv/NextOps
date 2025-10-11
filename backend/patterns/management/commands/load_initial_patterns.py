from django.core.management.base import BaseCommand
from patterns.models import RegexPattern


class Command(BaseCommand):
    help = 'Carga patrones de regex iniciales para normalización y validación'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Cargando patrones de regex iniciales...'))
        
        patterns = [
            # Patrones para números de contenedor
            {
                'name': 'Contenedor ISO estándar',
                'description': 'Número de contenedor estándar ISO (4 letras + 7 dígitos)',
                'pattern': r'\b[A-Z]{4}\d{7}\b',
                'category': 'container',
                'priority': 100,
                'test_cases': [
                    {'input': 'MSCU1234567', 'expected': True, 'description': 'Contenedor válido MSC'},
                    {'input': 'MAEU9876543', 'expected': True, 'description': 'Contenedor válido Maersk'},
                    {'input': 'ABC123456', 'expected': False, 'description': 'Solo 3 letras (inválido)'},
                    {'input': 'ABCD12345', 'expected': False, 'description': 'Solo 5 dígitos (inválido)'},
                ]
            },
            {
                'name': 'Contenedor con guión',
                'description': 'Número de contenedor con guión opcional (ABCD-1234567)',
                'pattern': r'\b[A-Z]{4}-?\d{7}\b',
                'category': 'container',
                'priority': 90,
                'test_cases': [
                    {'input': 'MSCU-1234567', 'expected': True, 'description': 'Con guión'},
                    {'input': 'MSCU1234567', 'expected': True, 'description': 'Sin guión'},
                ]
            },
            
            # Patrones para Bill of Lading
            {
                'name': 'BL genérico',
                'description': 'Bill of Lading genérico (números y letras)',
                'pattern': r'\b[A-Z0-9]{8,20}\b',
                'category': 'bl',
                'priority': 50,
                'test_cases': [
                    {'input': 'MEDUAB123456', 'expected': True, 'description': 'BL de Maersk'},
                    {'input': 'MSCU12345678', 'expected': True, 'description': 'BL de MSC'},
                    {'input': 'AB12', 'expected': False, 'description': 'Muy corto'},
                ]
            },
            {
                'name': 'MBL/HBL con prefijo',
                'description': 'Master/House BL con prefijo MBL o HBL',
                'pattern': r'\b(MBL|HBL)[:\-\s]?[A-Z0-9]{8,15}\b',
                'category': 'bl',
                'priority': 80,
                'test_cases': [
                    {'input': 'MBL:MEDU12345678', 'expected': True, 'description': 'MBL con dos puntos'},
                    {'input': 'HBL-ABC123456789', 'expected': True, 'description': 'HBL con guión'},
                    {'input': 'MBL MSCU12345678', 'expected': True, 'description': 'MBL con espacio'},
                ]
            },
            
            # Patrones para Orden de Trabajo (OT)
            {
                'name': 'OT formato estándar',
                'description': 'Orden de Trabajo: 2 dígitos + OT + 3-4 dígitos (ej: 25OT001)',
                'pattern': r'\b\d{2}OT\d{3,4}\b',
                'category': 'ot',
                'priority': 100,
                'test_cases': [
                    {'input': '25OT001', 'expected': True, 'description': 'OT 2025 con 3 dígitos'},
                    {'input': '25OT1234', 'expected': True, 'description': 'OT 2025 con 4 dígitos'},
                    {'input': '5OT001', 'expected': False, 'description': 'Solo 1 dígito de año'},
                    {'input': '25OT12', 'expected': False, 'description': 'Solo 2 dígitos de número'},
                ]
            },
            {
                'name': 'OT con guiones',
                'description': 'OT con guiones opcionales (25-OT-001)',
                'pattern': r'\b\d{2}-?OT-?\d{3,4}\b',
                'category': 'ot',
                'priority': 90,
                'test_cases': [
                    {'input': '25-OT-001', 'expected': True, 'description': 'Con guiones'},
                    {'input': '25OT001', 'expected': True, 'description': 'Sin guiones'},
                    {'input': '25-OT001', 'expected': True, 'description': 'Un guión'},
                ]
            },
            
            # Patrones para Fechas
            {
                'name': 'Fecha DD/MM/YYYY',
                'description': 'Fecha formato día/mes/año con barras',
                'pattern': r'\b\d{1,2}/\d{1,2}/\d{4}\b',
                'category': 'date',
                'priority': 100,
                'test_cases': [
                    {'input': '04/10/2025', 'expected': True, 'description': 'Fecha válida'},
                    {'input': '4/10/2025', 'expected': True, 'description': 'Día sin cero'},
                    {'input': '32/13/2025', 'expected': True, 'description': 'Detecta formato (valida semántica aparte)'},
                ]
            },
            {
                'name': 'Fecha YYYY-MM-DD',
                'description': 'Fecha formato ISO 8601',
                'pattern': r'\b\d{4}-\d{2}-\d{2}\b',
                'category': 'date',
                'priority': 95,
                'test_cases': [
                    {'input': '2025-10-04', 'expected': True, 'description': 'Fecha ISO válida'},
                    {'input': '2025-1-4', 'expected': False, 'description': 'Sin ceros (no ISO)'},
                ]
            },
            {
                'name': 'Fecha DD-MM-YYYY',
                'description': 'Fecha formato día-mes-año con guiones',
                'pattern': r'\b\d{1,2}-\d{1,2}-\d{4}\b',
                'category': 'date',
                'priority': 90,
                'test_cases': [
                    {'input': '04-10-2025', 'expected': True, 'description': 'Fecha válida'},
                    {'input': '4-10-2025', 'expected': True, 'description': 'Día sin cero'},
                ]
            },
            
            # Patrones para NIT
            {
                'name': 'NIT con guión',
                'description': 'NIT guatemalteco (números con guión final)',
                'pattern': r'\b\d{6,9}-\d\b',
                'category': 'nit',
                'priority': 100,
                'test_cases': [
                    {'input': '1234567-8', 'expected': True, 'description': 'NIT válido 7 dígitos'},
                    {'input': '123456789-0', 'expected': True, 'description': 'NIT válido 9 dígitos'},
                    {'input': '12345-6', 'expected': False, 'description': 'Muy corto'},
                ]
            },
            {
                'name': 'NIT sin guión',
                'description': 'NIT sin guión (7-10 dígitos)',
                'pattern': r'\b\d{7,10}\b',
                'category': 'nit',
                'priority': 50,
                'test_cases': [
                    {'input': '12345678', 'expected': True, 'description': 'NIT sin guión'},
                    {'input': '1234567890', 'expected': True, 'description': 'NIT largo'},
                ]
            },
            
            # Patrones para Email
            {
                'name': 'Email estándar',
                'description': 'Dirección de email válida',
                'pattern': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                'category': 'email',
                'priority': 100,
                'test_cases': [
                    {'input': 'user@example.com', 'expected': True, 'description': 'Email simple'},
                    {'input': 'user.name+tag@example.co.uk', 'expected': True, 'description': 'Email complejo'},
                    {'input': 'invalid@', 'expected': False, 'description': 'Inválido sin dominio'},
                ]
            },
            
            # Patrones para Teléfono
            {
                'name': 'Teléfono guatemalteco',
                'description': 'Número de teléfono de Guatemala (8 dígitos)',
                'pattern': r'\b\d{4}-?\d{4}\b',
                'category': 'phone',
                'priority': 100,
                'test_cases': [
                    {'input': '1234-5678', 'expected': True, 'description': 'Con guión'},
                    {'input': '12345678', 'expected': True, 'description': 'Sin guión'},
                ]
            },
            {
                'name': 'Teléfono internacional',
                'description': 'Número de teléfono con código de país',
                'pattern': r'\+\d{1,3}\s?\d{1,4}\s?\d{4,10}',
                'category': 'phone',
                'priority': 90,
                'test_cases': [
                    {'input': '+502 1234-5678', 'expected': True, 'description': 'Guatemala'},
                    {'input': '+1 555 123 4567', 'expected': True, 'description': 'USA'},
                ]
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for data in patterns:
            pattern, created = RegexPattern.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Creado: {pattern.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'⚠ Ya existe: {pattern.name}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Proceso completado:'))
        self.stdout.write(self.style.SUCCESS(f'   - Patrones creados: {created_count}'))
        self.stdout.write(self.style.WARNING(f'   - Patrones existentes: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'   - Total: {created_count + updated_count}'))

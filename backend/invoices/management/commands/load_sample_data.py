"""
Management command para cargar datos iniciales de prueba.

Carga:
- Proveedores de ejemplo
- Clientes de ejemplo  
- OTs de prueba
- Facturas de ejemplo

Uso:
    python manage.py load_sample_data
    python manage.py load_sample_data --clear  # Limpia datos existentes primero
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from catalogs.models import Provider
from client_aliases.models import ClientAlias
from ots.models import OT
from accounts.models import User


class Command(BaseCommand):
    help = 'Carga datos de ejemplo para testing del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Limpia datos existentes antes de cargar'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Limpiando datos existentes...')
            # No eliminamos usuarios, solo datos de negocio
            OT.objects.all().delete()
            ClientAlias.objects.all().delete()
            Provider.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Datos limpiados'))

        self.stdout.write('\nCargando datos de prueba...\n')

        # Obtener o crear usuario admin para asignaciones
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@nextops.com',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write('✓ Usuario admin creado (password: admin123)')

        # 1. PROVEEDORES
        self.stdout.write('\n1. Creando Proveedores...')
        
        proveedores_data = [
            {
                'nombre': 'MAERSK LINE',
                'nit': '0614-120589-001-4',
                'tipo': 'naviera',
                'categoria': 'internacional',
                'email': 'ops@maersk.com',
                'telefono': '+503-2222-3333',
            },
            {
                'nombre': 'MSC MEDITERRANEAN SHIPPING',
                'nit': '0614-130590-002-5',
                'tipo': 'naviera',
                'categoria': 'internacional',
                'email': 'sv@msc.com',
                'telefono': '+503-2222-4444',
            },
            {
                'nombre': 'HAPAG-LLOYD',
                'nit': '0614-140591-003-6',
                'tipo': 'naviera',
                'categoria': 'internacional',
                'email': 'info@hapag-lloyd.com',
                'telefono': '+503-2222-5555',
            },
            {
                'nombre': 'AGENTE ADUANAL EXPRESS SA',
                'nit': '0614-150592-004-7',
                'tipo': 'agente_local',
                'categoria': 'nacional',
                'email': 'ops@aduanalexpress.com',
                'telefono': '+503-2233-1111',
            },
            {
                'nombre': 'TRANSPORTES TERRESTRES SA',
                'nit': '0614-160593-005-8',
                'tipo': 'transportista',
                'categoria': 'nacional',
                'email': 'despacho@terrestres.com',
                'telefono': '+503-2233-2222',
            },
            {
                'nombre': 'ALMACENES Y BODEGAS SA',
                'nit': '0614-170594-006-9',
                'tipo': 'otro',
                'categoria': 'nacional',
                'email': 'operaciones@almacenes.com',
                'telefono': '+503-2233-3333',
            },
        ]

        for data in proveedores_data:
            provider, created = Provider.objects.get_or_create(
                nombre=data['nombre'],
                defaults=data
            )
            if created:
                self.stdout.write(f'  ✓ {data["nombre"]}')

        self.stdout.write(self.style.SUCCESS(f'\n✓ {len(proveedores_data)} proveedores creados'))

        # 2. CLIENTES
        self.stdout.write('\n2. Creando Clientes...')
        
        clientes_data = [
            {
                'original_name': 'DISTRIBUIDORA NACIONAL SA',
                'country': 'SV',
            },
            {
                'original_name': 'IMPORTADORA DEL PACIFICO',
                'country': 'SV',
            },
            {
                'original_name': 'COMERCIAL CENTROAMERICANA',
                'country': 'SV',
            },
            {
                'original_name': 'TEXTILES Y MAS SA',
                'country': 'SV',
            },
        ]

        for data in clientes_data:
            client, created = ClientAlias.objects.get_or_create(
                original_name=data['original_name'],
                defaults=data
            )
            if created:
                self.stdout.write(f'  ✓ {data["original_name"]}')

        self.stdout.write(self.style.SUCCESS(f'\n✓ {len(clientes_data)} clientes creados'))

        # 3. ÓRDENES DE TRANSPORTE
        self.stdout.write('\n3. Creando Órdenes de Transporte...')

        # Obtener proveedores y clientes creados
        maersk = Provider.objects.get(nombre='MAERSK LINE')
        msc = Provider.objects.get(nombre='MSC MEDITERRANEAN SHIPPING')
        distribuidora = ClientAlias.objects.get(original_name='DISTRIBUIDORA NACIONAL SA')
        importadora = ClientAlias.objects.get(original_name='IMPORTADORA DEL PACIFICO')

        hoy = timezone.now().date()

        ots_data = [
            {
                'numero_ot': 'OT-2025-001',
                'cliente': distribuidora,
                'proveedor': maersk,
                'master_bl': 'MAEU1234567890',
                'contenedores': [
                    {
                        'numero': 'MAEU1234567',
                        'tipo': '40HC',
                        'peso': 24000,
                        'sello': 'SEAL123456'
                    }
                ],
                'estado': 'en_transito',
                'puerto_origen': 'Shanghai, China',
                'puerto_destino': 'Puerto Acajutla, El Salvador',
                'fecha_eta': hoy + timedelta(days=10),
                'etd': hoy - timedelta(days=5),
                'tipo_embarque': 'FCL',
                'barco': 'MAERSK SEALAND',
                'operativo': 'Jennifer',
            },
            {
                'numero_ot': 'OT-2025-002',
                'cliente': importadora,
                'proveedor': msc,
                'master_bl': 'MSCU9876543210',
                'contenedores': [
                    {
                        'numero': 'MSCU9876543',
                        'tipo': '40HC',
                        'peso': 26000,
                        'sello': 'SEAL987654'
                    }
                ],
                'estado': 'pendiente',
                'puerto_origen': 'Rotterdam, Netherlands',
                'puerto_destino': 'Puerto Acajutla, El Salvador',
                'fecha_eta': hoy + timedelta(days=15),
                'etd': hoy - timedelta(days=2),
                'tipo_embarque': 'FCL',
                'barco': 'MSC OSCAR',
                'operativo': 'Jonathan',
            },
            {
                'numero_ot': 'OT-2025-003',
                'cliente': distribuidora,
                'proveedor': maersk,
                'master_bl': 'HLCU5555666677',
                'contenedores': [
                    {
                        'numero': 'HLCU5555666',
                        'tipo': '20GP',
                        'peso': 15000,
                        'sello': 'SEAL555666'
                    }
                ],
                'estado': 'entregado',
                'puerto_origen': 'Puerto Acajutla, El Salvador',
                'puerto_destino': 'Los Angeles, USA',
                'fecha_eta': hoy - timedelta(days=5),
                'etd': hoy - timedelta(days=20),
                'tipo_embarque': 'LCL',
                'barco': 'HAPAG EXPRESS',
                'operativo': 'Krisia',
            },
            {
                'numero_ot': 'OT-2025-004',
                'cliente': importadora,
                'proveedor': msc,
                'master_bl': 'MAEU7777888899',
                'contenedores': [
                    {
                        'numero': 'MAEU7777888',
                        'tipo': '40HC',
                        'peso': 23500,
                        'sello': 'SEAL777888'
                    }
                ],
                'estado': 'en_transito',
                'puerto_origen': 'Busan, South Korea',
                'puerto_destino': 'Puerto Acajutla, El Salvador',
                'fecha_eta': hoy + timedelta(days=12),
                'etd': hoy - timedelta(days=3),
                'tipo_embarque': 'FCL',
                'barco': 'MAERSK ATLANTA',
                'operativo': 'Jennifer',
            },
        ]

        for data in ots_data:
            ot, created = OT.objects.get_or_create(
                numero_ot=data['numero_ot'],
                defaults=data
            )
            if created:
                self.stdout.write(f'  ✓ {data["numero_ot"]} - {data["cliente"]}')

        self.stdout.write(self.style.SUCCESS(f'\n✓ {len(ots_data)} OTs creadas'))

        # Resumen
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n✅ DATOS DE PRUEBA CARGADOS EXITOSAMENTE\n'))
        self.stdout.write('='*60)
        self.stdout.write(f'\nProveedores: {Provider.objects.count()}')
        self.stdout.write(f'Clientes: {ClientAlias.objects.count()}')
        self.stdout.write(f'OTs: {OT.objects.count()}')
        self.stdout.write('\nPuedes usar estos datos para testing del sistema de facturas.')
        self.stdout.write('\nEjemplos de MBL para testing de matching:')
        self.stdout.write('  - MAEU1234567890 (OT-2025-001)')
        self.stdout.write('  - MSCU9876543210 (OT-2025-002)')
        self.stdout.write('  - HLCU5555666677 (OT-2025-003)')
        self.stdout.write('\n')

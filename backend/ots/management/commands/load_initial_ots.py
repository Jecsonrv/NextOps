"""
Comando para cargar datos iniciales de OTs de prueba.

Uso:
    python manage.py load_initial_ots
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from ots.models import OT
from catalogs.models import Provider
from client_aliases.models import ClientAlias


class Command(BaseCommand):
    help = 'Carga datos iniciales de OTs para pruebas'
    
    def handle(self, *args, **options):
        self.stdout.write('Cargando OTs de prueba...\n')
        
        # Obtener proveedores y clientes existentes
        try:
            proveedor1 = Provider.objects.filter(nombre__icontains='MAERSK').first()
            proveedor2 = Provider.objects.filter(nombre__icontains='MSC').first()
            proveedor3 = Provider.objects.filter(nombre__icontains='HAPAG').first()
            
            if not proveedor1:
                proveedor1 = Provider.objects.first()
            if not proveedor2:
                proveedor2 = Provider.objects.all()[1] if Provider.objects.count() > 1 else proveedor1
            if not proveedor3:
                proveedor3 = Provider.objects.all()[2] if Provider.objects.count() > 2 else proveedor1
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error obteniendo proveedores: {e}')
            )
            return
        
        try:
            # Obtener clientes (aliases)
            cliente1 = ClientAlias.objects.filter(original_name__icontains='SIMAN').first()
            cliente2 = ClientAlias.objects.filter(original_name__icontains='WALMART').first()
            cliente3 = ClientAlias.objects.filter(original_name__icontains='CORPORACION').first()
            
            if not cliente1:
                cliente1 = ClientAlias.objects.first()
            if not cliente2:
                cliente2 = ClientAlias.objects.all()[1] if ClientAlias.objects.count() > 1 else cliente1
            if not cliente3:
                cliente3 = ClientAlias.objects.all()[2] if ClientAlias.objects.count() > 2 else cliente1
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error obteniendo clientes: {e}')
            )
            return
        
        # Definir OTs de prueba
        ots_data = [
            {
                'numero_ot': 'OT-2024-001',
                'proveedor': proveedor1,
                'cliente': cliente1,
                'master_bl': 'MAEU123456789',
                'house_bls': ['HBL-001-A', 'HBL-001-B', 'HBL-001-C'],
                'contenedores': [
                    {
                        'numero': 'MSCU1234567',
                        'tipo': '40HC',
                        'peso': 25000,
                        'sello': 'SL123456'
                    },
                    {
                        'numero': 'MSCU2345678',
                        'tipo': '40HC',
                        'peso': 26500,
                        'sello': 'SL123457'
                    }
                ],
                'provision_hierarchy': {
                    'total': 3500.00,
                    'items': [
                        {
                            'concepto': 'Flete Marítimo',
                            'monto': 2000.00,
                            'categoria': 'transporte'
                        },
                        {
                            'concepto': 'Almacenaje Puerto',
                            'monto': 800.00,
                            'categoria': 'puerto'
                        },
                        {
                            'concepto': 'Gestión Aduanal',
                            'monto': 500.00,
                            'categoria': 'operacion'
                        },
                        {
                            'concepto': 'Manejo de Carga',
                            'monto': 200.00,
                            'categoria': 'puerto'
                        }
                    ]
                },
                'estado': 'en_transito',
                'fecha_eta': timezone.now().date() + timedelta(days=5),
                'puerto_origen': 'Shanghai',
                'puerto_destino': 'Puerto Quetzal',
                'notas': 'Carga consolidada para cliente principal. Requiere inspección física.'
            },
            {
                'numero_ot': 'OT-2024-002',
                'proveedor': proveedor2,
                'cliente': cliente2,
                'master_bl': 'MSC987654321',
                'house_bls': ['HBL-002-A'],
                'contenedores': [
                    {
                        'numero': 'MSCU3456789',
                        'tipo': '20GP',
                        'peso': 18000,
                        'sello': 'SL223456'
                    }
                ],
                'provision_hierarchy': {
                    'total': 1850.00,
                    'items': [
                        {
                            'concepto': 'Flete Marítimo',
                            'monto': 1200.00,
                            'categoria': 'transporte'
                        },
                        {
                            'concepto': 'Almacenaje',
                            'monto': 400.00,
                            'categoria': 'puerto'
                        },
                        {
                            'concepto': 'Documentación',
                            'monto': 250.00,
                            'categoria': 'operacion'
                        }
                    ]
                },
                'estado': 'puerto',
                'fecha_eta': timezone.now().date() - timedelta(days=2),
                'fecha_llegada': timezone.now().date(),
                'puerto_origen': 'Los Angeles',
                'puerto_destino': 'Puerto Cortés',
                'notas': 'Arribo confirmado. Esperando desaduanaje.'
            },
            {
                'numero_ot': 'OT-2024-003',
                'proveedor': proveedor3,
                'cliente': cliente3,
                'master_bl': 'HLCU555666777',
                'house_bls': ['HBL-003-A', 'HBL-003-B'],
                'contenedores': [
                    {
                        'numero': 'HLCU4567890',
                        'tipo': '40HC',
                        'peso': 27000,
                        'sello': 'SL323456'
                    },
                    {
                        'numero': 'HLCU5678901',
                        'tipo': '40HC',
                        'peso': 26800,
                        'sello': 'SL323457'
                    },
                    {
                        'numero': 'HLCU6789012',
                        'tipo': '20GP',
                        'peso': 19000,
                        'sello': 'SL323458'
                    }
                ],
                'provision_hierarchy': {
                    'total': 5200.00,
                    'items': [
                        {
                            'concepto': 'Flete Marítimo',
                            'monto': 3500.00,
                            'categoria': 'transporte'
                        },
                        {
                            'concepto': 'Almacenaje',
                            'monto': 900.00,
                            'categoria': 'puerto'
                        },
                        {
                            'concepto': 'Transporte Terrestre',
                            'monto': 600.00,
                            'categoria': 'transporte'
                        },
                        {
                            'concepto': 'Seguros',
                            'monto': 200.00,
                            'categoria': 'otros'
                        }
                    ]
                },
                'estado': 'entregado',
                'fecha_eta': timezone.now().date() - timedelta(days=10),
                'fecha_llegada': timezone.now().date() - timedelta(days=8),
                'puerto_origen': 'Hamburg',
                'puerto_destino': 'Santo Tomás de Castilla',
                'notas': 'Entrega completada. Pendiente facturación.'
            },
            {
                'numero_ot': 'OT-2024-004',
                'proveedor': proveedor1,
                'cliente': cliente1,
                'master_bl': 'MAEU777888999',
                'house_bls': ['HBL-004-A', 'HBL-004-B', 'HBL-004-C', 'HBL-004-D'],
                'contenedores': [
                    {
                        'numero': 'MSCU7890123',
                        'tipo': '40HQ',
                        'peso': 28000,
                        'sello': 'SL423456'
                    },
                    {
                        'numero': 'MSCU8901234',
                        'tipo': '40HQ',
                        'peso': 27500,
                        'sello': 'SL423457'
                    },
                    {
                        'numero': 'MSCU9012345',
                        'tipo': '40HQ',
                        'peso': 28200,
                        'sello': 'SL423458'
                    },
                    {
                        'numero': 'MSCU0123456',
                        'tipo': '20GP',
                        'peso': 19500,
                        'sello': 'SL423459'
                    }
                ],
                'provision_hierarchy': {
                    'total': 6800.00,
                    'items': [
                        {
                            'concepto': 'Flete Marítimo',
                            'monto': 4500.00,
                            'categoria': 'transporte'
                        },
                        {
                            'concepto': 'Almacenaje Puerto',
                            'monto': 1200.00,
                            'categoria': 'puerto'
                        },
                        {
                            'concepto': 'Gestión Documental',
                            'monto': 700.00,
                            'categoria': 'operacion'
                        },
                        {
                            'concepto': 'Inspección Física',
                            'monto': 300.00,
                            'categoria': 'puerto'
                        },
                        {
                            'concepto': 'Otros Gastos',
                            'monto': 100.00,
                            'categoria': 'otros'
                        }
                    ]
                },
                'estado': 'facturado',
                'fecha_eta': timezone.now().date() - timedelta(days=15),
                'fecha_llegada': timezone.now().date() - timedelta(days=12),
                'puerto_origen': 'Shenzhen',
                'puerto_destino': 'Puerto Quetzal',
                'notas': 'Operación completada y facturada. Cliente notificado.'
            },
            {
                'numero_ot': 'OT-2024-005',
                'proveedor': proveedor2,
                'cliente': cliente2,
                'master_bl': 'MSC111222333',
                'house_bls': [],
                'contenedores': [
                    {
                        'numero': 'MSCU1122334',
                        'tipo': '40GP',
                        'peso': 24000,
                        'sello': 'SL523456'
                    }
                ],
                'provision_hierarchy': {
                    'total': 2100.00,
                    'items': [
                        {
                            'concepto': 'Flete',
                            'monto': 1500.00,
                            'categoria': 'transporte'
                        },
                        {
                            'concepto': 'Almacenaje',
                            'monto': 400.00,
                            'categoria': 'puerto'
                        },
                        {
                            'concepto': 'Operación',
                            'monto': 200.00,
                            'categoria': 'operacion'
                        }
                    ]
                },
                'estado': 'pendiente',
                'fecha_eta': timezone.now().date() + timedelta(days=12),
                'puerto_origen': 'Busan',
                'puerto_destino': 'Acajutla',
                'notas': 'Nueva orden. Booking confirmado.'
            }
        ]
        
        # Crear OTs
        created_count = 0
        updated_count = 0
        
        for ot_data in ots_data:
            numero_ot = ot_data['numero_ot']
            
            # Verificar si ya existe
            existing = OT.objects.filter(numero_ot=numero_ot).first()
            
            if existing:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  OT {numero_ot} ya existe, actualizando...')
                )
                
                for key, value in ot_data.items():
                    if key != 'numero_ot':
                        setattr(existing, key, value)
                
                existing.save()
                updated_count += 1
                
            else:
                OT.objects.create(**ot_data)
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ OT {numero_ot} creada')
                )
                created_count += 1
        
        # Resumen
        self.stdout.write('\n' + '='*50)
        self.stdout.write(
            self.style.SUCCESS(f'✓ {created_count} OTs creadas')
        )
        self.stdout.write(
            self.style.WARNING(f'⚠️  {updated_count} OTs actualizadas')
        )
        self.stdout.write('='*50 + '\n')
        
        # Estadísticas
        total_ots = OT.objects.count()
        total_contenedores = sum(
            ot.get_total_contenedores() for ot in OT.objects.all()
        )
        total_provision = sum(
            ot.get_provision_total() for ot in OT.objects.all()
        )
        
        self.stdout.write('\n📊 Estadísticas:')
        self.stdout.write(f'  • Total OTs: {total_ots}')
        self.stdout.write(f'  • Total Contenedores: {total_contenedores}')
        self.stdout.write(f'  • Provisión Total: ${total_provision:,.2f}')
        
        # Por estado
        self.stdout.write('\n📈 Por Estado:')
        for estado_code, estado_label in OT.STATUS_CHOICES:
            count = OT.objects.filter(estado=estado_code).count()
            if count > 0:
                self.stdout.write(f'  • {estado_label}: {count}')
        
        self.stdout.write(
            self.style.SUCCESS('\n✅ Carga completada exitosamente!\n')
        )

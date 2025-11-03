"""
Management command para probar el sistema de líneas de factura con IVA mixto.

Este comando crea una factura de prueba con múltiples líneas:
- Algunas con IVA 13%
- Algunas exentas de IVA
- Verifica que los cálculos sean correctos

Uso:
    python manage.py test_invoice_items [--cleanup]
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from sales.models import SalesInvoice
from sales.models_items import SalesInvoiceItem
from client_aliases.models import ClientAlias
from ots.models import OT
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Prueba el sistema de líneas de factura con IVA mixto'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Limpia las facturas de prueba creadas',
        )

    def handle(self, *args, **options):
        cleanup = options['cleanup']

        if cleanup:
            self._cleanup()
            return

        self.stdout.write('='*70)
        self.stdout.write(self.style.SUCCESS('PRUEBA DE SISTEMA DE LÍNEAS DE FACTURA'))
        self.stdout.write('='*70)

        try:
            self._run_test()
            self.stdout.write('\n' + self.style.SUCCESS('✓ TODAS LAS PRUEBAS PASARON'))
        except Exception as e:
            self.stdout.write('\n' + self.style.ERROR(f'✗ ERROR EN PRUEBAS: {e}'))
            logger.error(f"Error en pruebas: {e}", exc_info=True)

    @transaction.atomic
    def _run_test(self):
        """Ejecuta la prueba completa"""

        # 1. Obtener o crear cliente de prueba
        self.stdout.write('\n1. Obteniendo cliente de prueba...')
        try:
            cliente = ClientAlias.objects.filter(deleted_at__isnull=True).first()
            if not cliente:
                self.stdout.write(self.style.ERROR('   No hay clientes en el sistema'))
                return
            self.stdout.write(f'   Cliente: {cliente.short_name}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   Error obteniendo cliente: {e}'))
            return

        # 2. Crear factura de prueba
        self.stdout.write('\n2. Creando factura de prueba...')
        factura = SalesInvoice(
            numero_factura=f'TEST-{timezone.now().strftime("%Y%m%d-%H%M%S")}',
            cliente=cliente,
            fecha_emision=timezone.now().date(),
            fecha_vencimiento=timezone.now().date() + timezone.timedelta(days=30),
            monto_total=Decimal('0.00'),  # Se calculará automáticamente
            estado_facturacion='facturada',
            descripcion='Factura de prueba para sistema de líneas con IVA mixto',
        )
        factura.save()
        self.stdout.write(f'   Factura creada: {factura.numero_factura}')

        # 3. Crear líneas con IVA mixto
        self.stdout.write('\n3. Agregando líneas a la factura...')

        lineas = [
            {
                'descripcion': 'Flete Local - APLICA IVA',
                'concepto': 'flete_local',
                'cantidad': Decimal('1.000'),
                'precio_unitario': Decimal('500.00'),
                'aplica_iva': True,
                'porcentaje_iva': Decimal('13.00'),
                'razon_exencion': '',
            },
            {
                'descripcion': 'Flete Marítimo Internacional - EXENTO',
                'concepto': 'flete_maritimo',
                'cantidad': Decimal('1.000'),
                'precio_unitario': Decimal('2000.00'),
                'aplica_iva': False,
                'porcentaje_iva': Decimal('0.00'),
                'razon_exencion': 'Servicio de flete marítimo internacional exento de IVA',
            },
            {
                'descripcion': 'Almacenaje - APLICA IVA',
                'concepto': 'almacenaje',
                'cantidad': Decimal('10.000'),
                'precio_unitario': Decimal('30.00'),
                'aplica_iva': True,
                'porcentaje_iva': Decimal('13.00'),
                'razon_exencion': '',
            },
            {
                'descripcion': 'Trámites Aduaneros - EXENTO',
                'concepto': 'tramites_aduaneros',
                'cantidad': Decimal('1.000'),
                'precio_unitario': Decimal('150.00'),
                'aplica_iva': False,
                'porcentaje_iva': Decimal('0.00'),
                'razon_exencion': 'Trámites aduaneros exentos de IVA',
            },
            {
                'descripcion': 'Handling - APLICA IVA con DESCUENTO 10%',
                'concepto': 'handling',
                'cantidad': Decimal('1.000'),
                'precio_unitario': Decimal('200.00'),
                'aplica_iva': True,
                'porcentaje_iva': Decimal('13.00'),
                'descuento_porcentaje': Decimal('10.00'),
                'razon_exencion': '',
            },
        ]

        lineas_creadas = []
        for idx, linea_data in enumerate(lineas, start=1):
            linea = SalesInvoiceItem(
                factura=factura,
                numero_linea=idx,
                unidad_medida='servicio',
                descuento_porcentaje=linea_data.get('descuento_porcentaje', Decimal('0.00')),
                modificado_por='Sistema de prueba',
                **{k: v for k, v in linea_data.items() if k != 'descuento_porcentaje'}
            )
            linea.save()  # El save() calculará automáticamente subtotal, IVA, total
            lineas_creadas.append(linea)

            self.stdout.write(
                f'   Línea {idx}: {linea.descripcion[:40]} - '
                f'Subtotal: ${linea.subtotal}, IVA: ${linea.iva}, Total: ${linea.total}'
            )

        # 4. Verificar cálculos
        self.stdout.write('\n4. Verificando cálculos...')

        # Refrescar factura desde DB para obtener totales actualizados
        factura.refresh_from_db()

        # Cálculos esperados:
        # Línea 1: Subtotal=$500, IVA=$65 (500*0.13), Total=$565
        # Línea 2: Subtotal=$2000, IVA=$0, Total=$2000
        # Línea 3: Subtotal=$300 (10*30), IVA=$39 (300*0.13), Total=$339
        # Línea 4: Subtotal=$150, IVA=$0, Total=$150
        # Línea 5: Subtotal=$200, Desc=$20, Subtotal_neto=$180, IVA=$23.40 (180*0.13), Total=$203.40

        subtotal_gravado_esperado = Decimal('500.00') + Decimal('300.00') + Decimal('180.00')  # 980
        subtotal_exento_esperado = Decimal('2000.00') + Decimal('150.00')  # 2150
        iva_esperado = Decimal('65.00') + Decimal('39.00') + Decimal('23.40')  # 127.40
        total_esperado = subtotal_gravado_esperado + subtotal_exento_esperado + iva_esperado  # 3257.40

        self.stdout.write(f'\n   TOTALES ESPERADOS:')
        self.stdout.write(f'   - Subtotal Gravado: ${subtotal_gravado_esperado}')
        self.stdout.write(f'   - Subtotal Exento: ${subtotal_exento_esperado}')
        self.stdout.write(f'   - IVA Total: ${iva_esperado}')
        self.stdout.write(f'   - TOTAL: ${total_esperado}')

        self.stdout.write(f'\n   TOTALES CALCULADOS:')
        self.stdout.write(f'   - Subtotal Gravado: ${factura.subtotal_gravado}')
        self.stdout.write(f'   - Subtotal Exento: ${factura.subtotal_exento}')
        self.stdout.write(f'   - IVA Total: ${factura.iva_total}')
        self.stdout.write(f'   - TOTAL: ${factura.monto_total}')

        # Verificar con tolerancia de $0.01 para redondeos
        tolerancia = Decimal('0.01')

        if abs(factura.subtotal_gravado - subtotal_gravado_esperado) > tolerancia:
            raise Exception(
                f'Subtotal gravado incorrecto: esperado ${subtotal_gravado_esperado}, '
                f'calculado ${factura.subtotal_gravado}'
            )

        if abs(factura.subtotal_exento - subtotal_exento_esperado) > tolerancia:
            raise Exception(
                f'Subtotal exento incorrecto: esperado ${subtotal_exento_esperado}, '
                f'calculado ${factura.subtotal_exento}'
            )

        if abs(factura.iva_total - iva_esperado) > tolerancia:
            raise Exception(
                f'IVA total incorrecto: esperado ${iva_esperado}, '
                f'calculado ${factura.iva_total}'
            )

        if abs(factura.monto_total - total_esperado) > tolerancia:
            raise Exception(
                f'Total incorrecto: esperado ${total_esperado}, '
                f'calculado ${factura.monto_total}'
            )

        self.stdout.write(self.style.SUCCESS('\n   ✓ Todos los totales son correctos'))

        # 5. Probar modificación de línea
        self.stdout.write('\n5. Probando modificación de línea...')
        linea1 = lineas_creadas[0]
        linea1.cantidad = Decimal('2.000')  # Duplicar cantidad
        linea1.save()

        factura.refresh_from_db()
        self.stdout.write(f'   Nuevo total después de modificar línea 1: ${factura.monto_total}')

        # 6. Probar eliminación de línea
        self.stdout.write('\n6. Probando eliminación de línea...')
        linea_a_eliminar = lineas_creadas[1]
        total_antes = factura.monto_total
        linea_a_eliminar.delete()  # Soft delete

        factura.refresh_from_db()
        self.stdout.write(f'   Total antes de eliminar: ${total_antes}')
        self.stdout.write(f'   Total después de eliminar línea 2: ${factura.monto_total}')

        # 7. Mostrar resumen final
        self.stdout.write('\n7. Resumen final:')
        self.stdout.write(f'   Factura: {factura.numero_factura}')
        self.stdout.write(f'   Total de líneas: {factura.lineas.filter(deleted_at__isnull=True).count()}')
        self.stdout.write(f'   Monto total: ${factura.monto_total}')
        self.stdout.write(f'   IVA total: ${factura.iva_total}')

        self.stdout.write(
            self.style.WARNING(
                f'\n   Para limpiar esta factura de prueba, ejecuta:\n'
                f'   python manage.py test_invoice_items --cleanup'
            )
        )

    def _cleanup(self):
        """Limpia facturas de prueba"""
        self.stdout.write('Limpiando facturas de prueba...')

        facturas_test = SalesInvoice.objects.filter(
            numero_factura__startswith='TEST-',
            deleted_at__isnull=True
        )

        count = facturas_test.count()
        if count == 0:
            self.stdout.write('No hay facturas de prueba para limpiar.')
            return

        confirm = input(f'¿Eliminar {count} factura(s) de prueba? (s/n): ')
        if confirm.lower() != 's':
            self.stdout.write('Operación cancelada.')
            return

        # Soft delete
        from django.utils import timezone
        now = timezone.now()
        for factura in facturas_test:
            factura.deleted_at = now
            factura.save()

        self.stdout.write(self.style.SUCCESS(f'Se eliminaron {count} factura(s) de prueba.'))

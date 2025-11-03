"""
Management command para migrar facturas existentes al sistema de líneas.

Este comando convierte facturas antiguas (con monto_total directo)
a facturas con líneas/items, creando una línea genérica por factura.

Uso:
    python manage.py migrate_invoices_to_items [--dry-run] [--force]
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from sales.models import SalesInvoice
from sales.models_items import SalesInvoiceItem
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migra facturas existentes al sistema de líneas/items'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la migración sin guardar cambios',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Fuerza la migración incluso si ya tiene líneas',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        self.stdout.write('='*70)
        self.stdout.write(self.style.SUCCESS('MIGRACIÓN DE FACTURAS A SISTEMA DE LÍNEAS'))
        self.stdout.write('='*70)

        if dry_run:
            self.stdout.write(self.style.WARNING('MODO DRY-RUN: No se guardarán cambios'))

        # Obtener facturas candidatas a migración
        facturas = SalesInvoice.objects.filter(deleted_at__isnull=True)

        if not force:
            # Solo migrar facturas sin líneas
            facturas = [f for f in facturas if f.lineas.count() == 0]
            self.stdout.write(f"\nFacturas sin líneas: {len(facturas)}")
        else:
            self.stdout.write(f"\nTotal de facturas: {len(facturas)}")

        if not facturas:
            self.stdout.write(self.style.SUCCESS('\nNo hay facturas para migrar.'))
            return

        # Confirmar
        if not dry_run:
            confirm = input(f'\n¿Deseas migrar {len(facturas)} facturas? (s/n): ')
            if confirm.lower() != 's':
                self.stdout.write(self.style.ERROR('Migración cancelada.'))
                return

        # Migrar facturas
        self.stdout.write('\n' + '-'*70)
        self.stdout.write('INICIANDO MIGRACIÓN...')
        self.stdout.write('-'*70 + '\n')

        migradas = 0
        errores = 0

        for factura in facturas:
            try:
                self._migrar_factura(factura, dry_run)
                migradas += 1

                self.stdout.write(
                    f"✓ {factura.numero_factura}: ${factura.monto_total}"
                )

            except Exception as e:
                errores += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ {factura.numero_factura}: Error - {str(e)}"
                    )
                )
                logger.error(f"Error migrando factura {factura.id}: {e}", exc_info=True)

        # Resumen
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('RESUMEN DE MIGRACIÓN'))
        self.stdout.write('='*70)
        self.stdout.write(f"Total facturas procesadas: {len(facturas)}")
        self.stdout.write(self.style.SUCCESS(f"Migradas exitosamente: {migradas}"))
        if errores > 0:
            self.stdout.write(self.style.ERROR(f"Con errores: {errores}"))

        if dry_run:
            self.stdout.write(self.style.WARNING('\nMODO DRY-RUN: Ningún cambio fue guardado.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nMigración completada.'))

    @transaction.atomic
    def _migrar_factura(self, factura, dry_run=False):
        """
        Convierte una factura antigua a sistema de líneas.

        Estrategia:
        1. Si tiene subtotal e IVA legacy, crear línea con IVA
        2. Si solo tiene monto_total, crear línea exenta o con IVA según descripción
        3. Calcular precio_unitario basado en totales
        """

        # Verificar si ya tiene líneas
        if factura.lineas.exists() and not dry_run:
            raise Exception("La factura ya tiene líneas")

        # Determinar si la factura original tenía IVA
        tiene_iva_legacy = factura.iva and factura.iva > 0
        subtotal_legacy = factura.subtotal or Decimal('0.00')
        iva_legacy = factura.iva or Decimal('0.00')
        monto_total = factura.monto_total

        # Construir descripción de la línea
        descripcion_base = factura.descripcion or f"Servicios según factura {factura.numero_factura}"

        # Decidir si aplica IVA basado en datos legacy
        aplica_iva = tiene_iva_legacy

        # Calcular subtotal y precio unitario
        if tiene_iva_legacy and subtotal_legacy > 0:
            # Caso 1: Tiene subtotal e IVA legacy
            subtotal = subtotal_legacy
            precio_unitario = subtotal
            razon_exencion = ""
        elif monto_total > 0:
            # Caso 2: Solo tiene monto_total
            if aplica_iva:
                # Deducir subtotal desde monto_total (monto_total = subtotal + iva)
                # subtotal = monto_total / 1.13
                subtotal = (monto_total / Decimal('1.13')).quantize(Decimal('0.01'))
                precio_unitario = subtotal
                razon_exencion = ""
            else:
                # Sin IVA: monto_total = subtotal
                subtotal = monto_total
                precio_unitario = monto_total
                razon_exencion = "Servicio exento (migrado de factura legacy)"
        else:
            raise Exception("Factura sin monto válido")

        # Crear la línea
        linea_data = {
            'factura': factura,
            'numero_linea': 1,
            'descripcion': descripcion_base[:500],  # Máximo 500 caracteres
            'concepto': 'otro',
            'cantidad': Decimal('1.000'),
            'unidad_medida': 'servicio',
            'precio_unitario': precio_unitario,
            'aplica_iva': aplica_iva,
            'porcentaje_iva': Decimal('13.00') if aplica_iva else Decimal('0.00'),
            'descuento_porcentaje': Decimal('0.00'),
            'razon_exencion': razon_exencion,
            'notas': f"Línea generada automáticamente durante migración desde factura legacy",
            'modificado_por': 'Sistema (migración)',
        }

        if not dry_run:
            # Crear la línea (el save() calculará automáticamente subtotal, iva, total)
            linea = SalesInvoiceItem(**linea_data)
            linea.save()

            # Verificar que los totales coincidan aproximadamente
            diferencia = abs(factura.monto_total - linea.total)
            if diferencia > Decimal('1.00'):
                logger.warning(
                    f"Factura {factura.numero_factura}: Diferencia en totales de ${diferencia}. "
                    f"Original: ${factura.monto_total}, Nueva línea: ${linea.total}"
                )

            # Los signals de SalesInvoiceItem recalcularán automáticamente
            # los totales de la factura (subtotal_gravado, subtotal_exento, iva_total)

        return True

"""
Comando de mantenimiento para sincronizar facturas de flete/cargos naviera con sus OTs.

Uso:
    python manage.py sync_invoices_to_ots --dry-run      # Ver qué se sincronizaría
    python manage.py sync_invoices_to_ots --sync         # Sincronizar todas las facturas

Útil para:
- Corregir facturas que no se sincronizaron automáticamente con sus OTs
- Actualizar fechas de provisión/facturación en facturas vinculadas
- Mantenimiento periódico del sistema
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from invoices.models import Invoice
from catalogs.models import CostType


class Command(BaseCommand):
    help = 'Sincroniza facturas de flete/cargos naviera con sus OTs correspondientes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se sincronizaría sin aplicar cambios',
        )
        parser.add_argument(
            '--sync',
            action='store_true',
            help='Ejecutar sincronización (aplicar cambios)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        do_sync = options['sync']

        if not dry_run and not do_sync:
            self.stdout.write(self.style.ERROR('❌ Debes especificar --dry-run o --sync'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 Modo DRY RUN - No se aplicarán cambios'))
        else:
            self.stdout.write(self.style.SUCCESS('🔄 Sincronizando facturas con OTs...'))

        # Obtener tipos de costo vinculados a OT
        tipos_vinculados_hardcoded = ['FLETE', 'CARGOS_NAVIERA']
        tipos_vinculados_dinamicos = list(
            CostType.objects.filter(
                is_linked_to_ot=True,
                is_active=True,
                is_deleted=False
            ).values_list('code', flat=True)
        )

        todos_tipos_vinculados = set(tipos_vinculados_hardcoded + tipos_vinculados_dinamicos)

        # Filtrar facturas vinculadas a OT que no estén anuladas
        facturas_vinculadas = Invoice.objects.filter(
            ot__isnull=False,
            is_deleted=False,
            tipo_costo__in=list(todos_tipos_vinculados)
        ).exclude(
            estado_provision__in=['anulada', 'anulada_parcialmente', 'rechazada']
        ).select_related('ot').order_by('ot__numero_ot', 'created_at')

        total_facturas = facturas_vinculadas.count()
        self.stdout.write(f'\n📊 Total de facturas vinculadas a OT: {total_facturas}')

        if total_facturas == 0:
            self.stdout.write(self.style.SUCCESS('✅ No hay facturas para sincronizar'))
            return

        # Agrupar por OT para procesar
        ots_procesadas = {}
        facturas_actualizadas = 0
        facturas_sin_cambios = 0

        for factura in facturas_vinculadas:
            ot = factura.ot
            ot_key = ot.numero_ot

            if ot_key not in ots_procesadas:
                ots_procesadas[ot_key] = {
                    'ot': ot,
                    'facturas': [],
                    'cambios': 0
                }

            ots_procesadas[ot_key]['facturas'].append(factura)

        self.stdout.write(f'📦 OTs afectadas: {len(ots_procesadas)}')
        self.stdout.write('')

        # Procesar cada OT
        for ot_key, data in ots_procesadas.items():
            ot = data['ot']
            facturas = data['facturas']

            self.stdout.write(f'\n🔹 OT: {ot.numero_ot}')
            self.stdout.write(f'   Estado OT: {ot.estado_provision} | Fecha provisión: {ot.fecha_provision} | Fecha facturación: {ot.fecha_recepcion_factura}')
            self.stdout.write(f'   Facturas vinculadas: {len(facturas)}')

            for factura in facturas:
                cambios_detectados = []

                # Verificar diferencias en fecha de provisión
                if ot.estado_provision == 'provisionada' and factura.fecha_provision != ot.fecha_provision:
                    cambios_detectados.append(
                        f'fecha_provision: {factura.fecha_provision} → {ot.fecha_provision}'
                    )

                # Verificar diferencias en estado de provisión
                if ot.estado_provision != factura.estado_provision:
                    # Solo sincronizar si la OT está en un estado que debe propagarse
                    if ot.estado_provision in ['provisionada', 'pendiente', 'disputada', 'revision']:
                        cambios_detectados.append(
                            f'estado_provision: {factura.estado_provision} → {ot.estado_provision}'
                        )

                # Verificar diferencias en fecha de facturación
                if factura.fecha_facturacion != ot.fecha_recepcion_factura:
                    cambios_detectados.append(
                        f'fecha_facturacion: {factura.fecha_facturacion} → {ot.fecha_recepcion_factura}'
                    )

                if cambios_detectados:
                    self.stdout.write(f'      📄 Factura {factura.numero_factura}:')
                    for cambio in cambios_detectados:
                        self.stdout.write(f'         - {cambio}')

                    if not dry_run:
                        # Aplicar cambios
                        if ot.estado_provision == 'provisionada':
                            factura.fecha_provision = ot.fecha_provision
                            factura.estado_provision = 'provisionada'
                        elif ot.estado_provision in ['disputada', 'revision']:
                            factura.estado_provision = ot.estado_provision
                            factura.fecha_provision = None
                        elif ot.estado_provision == 'pendiente':
                            factura.estado_provision = 'pendiente'
                            factura.fecha_provision = None

                        # Sincronizar fecha de facturación
                        if ot.fecha_recepcion_factura:
                            factura.fecha_facturacion = ot.fecha_recepcion_factura
                            factura.estado_facturacion = 'facturada'
                        else:
                            factura.fecha_facturacion = None
                            factura.estado_facturacion = 'pendiente'

                        factura.save()
                        facturas_actualizadas += 1
                    else:
                        facturas_actualizadas += 1
                else:
                    facturas_sin_cambios += 1

        # Resumen final
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('📊 RESUMEN DE SINCRONIZACIÓN'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'   Total de facturas analizadas: {total_facturas}')
        self.stdout.write(f'   Facturas con cambios: {facturas_actualizadas}')
        self.stdout.write(f'   Facturas sin cambios: {facturas_sin_cambios}')
        self.stdout.write('')

        if dry_run:
            self.stdout.write(self.style.WARNING('⚠️  Ejecuta con --sync para aplicar los cambios'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Sincronización completada: {facturas_actualizadas} facturas actualizadas'))

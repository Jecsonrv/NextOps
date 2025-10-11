"""
Management command para marcar facturas próximas a vencer.
Se ejecuta diariamente vía Celery Beat.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from invoices.models import Invoice


class Command(BaseCommand):
    help = 'Marca facturas próximas a vencer (7 días o menos)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dias',
            type=int,
            default=7,
            help='Días de anticipación para marcar alerta (default: 7)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Modo simulación - no guarda cambios'
        )
    
    def handle(self, *args, **options):
        dias_alerta = options['dias']
        dry_run = options['dry_run']
        
        hoy = date.today()
        fecha_limite = hoy + timedelta(days=dias_alerta)
        
        self.stdout.write(f"\n{'=' * 60}")
        self.stdout.write(f"🔔 VERIFICACIÓN DE ALERTAS DE VENCIMIENTO")
        self.stdout.write(f"{'=' * 60}")
        self.stdout.write(f"Fecha actual: {hoy}")
        self.stdout.write(f"Fecha límite: {fecha_limite} ({dias_alerta} días)")
        self.stdout.write(f"Modo: {'DRY-RUN (simulación)' if dry_run else 'PRODUCCIÓN'}\n")
        
        # Buscar facturas de crédito con fecha de vencimiento
        facturas_credito = Invoice.objects.filter(
            tipo_pago='credito',
            fecha_vencimiento__isnull=False,
            is_deleted=False
        )
        
        self.stdout.write(f"📊 Total facturas a crédito: {facturas_credito.count()}")
        
        # Marcar como alerta las que están próximas a vencer
        facturas_alerta = facturas_credito.filter(
            fecha_vencimiento__lte=fecha_limite,
            fecha_vencimiento__gt=hoy,
            alerta_vencimiento=False
        )
        
        # Quitar alerta a las que ya pasaron el periodo
        facturas_quitar_alerta = facturas_credito.filter(
            alerta_vencimiento=True
        ).exclude(
            fecha_vencimiento__lte=fecha_limite,
            fecha_vencimiento__gt=hoy
        )
        
        # Facturas vencidas
        facturas_vencidas = facturas_credito.filter(
            fecha_vencimiento__lt=hoy
        )
        
        self.stdout.write(f"\n📋 RESUMEN:")
        self.stdout.write(f"  • Facturas a marcar con alerta: {facturas_alerta.count()}")
        self.stdout.write(f"  • Facturas a quitar alerta: {facturas_quitar_alerta.count()}")
        self.stdout.write(f"  • Facturas vencidas: {facturas_vencidas.count()}")
        
        if not dry_run:
            # Marcar alertas
            if facturas_alerta.exists():
                self.stdout.write(f"\n⚠️  MARCANDO ALERTAS:")
                for factura in facturas_alerta:
                    dias_faltantes = (factura.fecha_vencimiento - hoy).days
                    factura.alerta_vencimiento = True
                    factura.save(update_fields=['alerta_vencimiento'])
                    self.stdout.write(
                        f"  ✓ {factura.numero_factura} - {factura.proveedor_nombre} "
                        f"(Vence en {dias_faltantes} días: {factura.fecha_vencimiento})"
                    )
            
            # Quitar alertas
            if facturas_quitar_alerta.exists():
                self.stdout.write(f"\n✅ QUITANDO ALERTAS:")
                for factura in facturas_quitar_alerta:
                    factura.alerta_vencimiento = False
                    factura.save(update_fields=['alerta_vencimiento'])
                    self.stdout.write(
                        f"  ✓ {factura.numero_factura} - {factura.proveedor_nombre} "
                        f"(Vencimiento: {factura.fecha_vencimiento})"
                    )
            
            # Listar vencidas
            if facturas_vencidas.exists():
                self.stdout.write(f"\n❌ FACTURAS VENCIDAS:")
                for factura in facturas_vencidas:
                    dias_vencido = (hoy - factura.fecha_vencimiento).days
                    self.stdout.write(
                        f"  • {factura.numero_factura} - {factura.proveedor_nombre} "
                        f"(Vencida hace {dias_vencido} días: {factura.fecha_vencimiento})"
                    )
            
            self.stdout.write(f"\n✅ Proceso completado exitosamente")
        else:
            self.stdout.write(f"\n⚠️  DRY-RUN: No se guardaron cambios")
            
            if facturas_alerta.exists():
                self.stdout.write(f"\n📋 Facturas que se marcarían con alerta:")
                for factura in facturas_alerta:
                    dias_faltantes = (factura.fecha_vencimiento - hoy).days
                    self.stdout.write(
                        f"  • {factura.numero_factura} - Vence en {dias_faltantes} días"
                    )
        
        self.stdout.write(f"\n{'=' * 60}\n")

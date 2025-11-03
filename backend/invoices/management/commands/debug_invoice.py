"""
Comando para debuggear una factura específica y ver por qué tiene monto_aplicable = 0
Uso: docker-compose exec backend python manage.py debug_invoice TEMP-115CBC5321ED
"""

from django.core.management.base import BaseCommand
from invoices.models import Invoice, CreditNote
from decimal import Decimal


class Command(BaseCommand):
    help = 'Debug de una factura para ver por qué tiene monto_aplicable incorrecto'

    def add_arguments(self, parser):
        parser.add_argument('numero_factura', type=str, help='Número de factura a debuggear')

    def handle(self, *args, **options):
        numero_factura = options['numero_factura']
        
        try:
            invoice = Invoice.objects.get(numero_factura=numero_factura)
        except Invoice.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ No existe factura con número: {numero_factura}'))
            return
        
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS(f'DEBUG FACTURA: {numero_factura}'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        # Datos básicos
        self.stdout.write(f'\n📄 DATOS BÁSICOS:')
        self.stdout.write(f'   ID: {invoice.id}')
        self.stdout.write(f'   Número: {invoice.numero_factura}')
        self.stdout.write(f'   Proveedor: {invoice.proveedor_nombre}')
        self.stdout.write(f'   Tipo Costo: {invoice.tipo_costo}')
        
        # Montos
        self.stdout.write(f'\n💰 MONTOS:')
        self.stdout.write(f'   Monto Original: ${invoice.monto}')
        self.stdout.write(f'   Monto Original (backup): ${invoice.monto_original}')
        self.stdout.write(f'   Monto Aplicable: ${invoice.monto_aplicable}')
        self.stdout.write(f'   Monto Pagado: ${invoice.monto_pagado}')
        self.stdout.write(f'   Monto Pendiente: ${invoice.monto_pendiente}')
        
        # OT
        self.stdout.write(f'\n🔗 OT ASIGNADA:')
        if invoice.ot:
            self.stdout.write(f'   OT: {invoice.ot.numero_ot}')
            self.stdout.write(f'   Método Asignación: {invoice.assignment_method}')
            self.stdout.write(f'   Confianza: {invoice.confianza_match}')
        else:
            self.stdout.write(f'   ❌ Sin OT asignada')
        
        # Estados
        self.stdout.write(f'\n📊 ESTADOS:')
        self.stdout.write(f'   Provisión: {invoice.estado_provision}')
        self.stdout.write(f'   Facturación: {invoice.estado_facturacion}')
        self.stdout.write(f'   Pago: {invoice.estado_pago}')
        self.stdout.write(f'   Requiere Revisión: {invoice.requiere_revision}')
        self.stdout.write(f'   Eliminada: {invoice.is_deleted}')
        
        # Notas de Crédito
        self.stdout.write(f'\n📝 NOTAS DE CRÉDITO:')
        todas_nc = invoice.notas_credito.all()
        nc_activas = invoice.notas_credito.filter(is_deleted=False)
        nc_aplicadas = invoice.notas_credito.filter(is_deleted=False, estado='aplicada')
        
        self.stdout.write(f'   Total NC (incluyendo eliminadas): {todas_nc.count()}')
        self.stdout.write(f'   NC Activas: {nc_activas.count()}')
        self.stdout.write(f'   NC Aplicadas (activas): {nc_aplicadas.count()}')
        
        if todas_nc.exists():
            self.stdout.write(f'\n   Detalle de TODAS las notas de crédito:')
            for nc in todas_nc:
                eliminada = '🗑️ ELIMINADA' if nc.is_deleted else '✅ ACTIVA'
                self.stdout.write(f'      - {nc.numero_nota}: ${nc.monto} | Estado: {nc.estado} | {eliminada}')
        
        # Calcular total de NC
        total_nc_todas = sum(nc.monto for nc in todas_nc)
        total_nc_activas = sum(nc.monto for nc in nc_activas)
        total_nc_aplicadas = sum(nc.monto for nc in nc_aplicadas)
        
        self.stdout.write(f'\n   💵 Total NC (todas): ${total_nc_todas}')
        self.stdout.write(f'   💵 Total NC (activas): ${total_nc_activas}')
        self.stdout.write(f'   💵 Total NC (aplicadas activas): ${total_nc_aplicadas}')
        
        # Disputas
        self.stdout.write(f'\n⚠️ DISPUTAS:')
        todas_disputas = invoice.disputas.all()
        disputas_activas = invoice.disputas.filter(is_deleted=False)
        
        self.stdout.write(f'   Total Disputas: {todas_disputas.count()}')
        self.stdout.write(f'   Disputas Activas: {disputas_activas.count()}')
        
        if disputas_activas.exists():
            self.stdout.write(f'\n   Detalle de disputas activas:')
            for disputa in disputas_activas:
                self.stdout.write(f'      - ID {disputa.id}: ${disputa.monto_disputa} | Estado: {disputa.estado} | Resultado: {disputa.resultado}')
        
        # Cálculo correcto
        self.stdout.write(f'\n🔍 ANÁLISIS:')
        monto_base = invoice.monto_original if invoice.monto_original is not None else invoice.monto
        monto_aplicable_esperado = monto_base + total_nc_aplicadas
        
        self.stdout.write(f'   Monto Base: ${monto_base}')
        self.stdout.write(f'   + NC Aplicadas: ${total_nc_aplicadas}')
        self.stdout.write(f'   = Monto Aplicable Esperado: ${monto_aplicable_esperado}')
        self.stdout.write(f'   Monto Aplicable Actual: ${invoice.monto_aplicable}')
        
        if invoice.monto_aplicable != monto_aplicable_esperado:
            self.stdout.write(self.style.ERROR(f'\n   ❌ DISCREPANCIA DETECTADA!'))
            self.stdout.write(self.style.ERROR(f'      Diferencia: ${invoice.monto_aplicable - monto_aplicable_esperado}'))
            
            # Posibles causas
            self.stdout.write(f'\n   🔎 Posibles causas:')
            if todas_nc.count() > nc_activas.count():
                self.stdout.write(f'      ⚠️ Hay {todas_nc.count() - nc_activas.count()} notas de crédito ELIMINADAS')
            if invoice.monto_aplicable == Decimal('0.00') and not nc_aplicadas.exists():
                self.stdout.write(f'      ⚠️ monto_aplicable es 0 pero NO hay NC aplicadas')
                self.stdout.write(f'      ⚠️ Esto sugiere que se estableció en 0 por error en el código')
        else:
            self.stdout.write(self.style.SUCCESS(f'\n   ✅ Monto aplicable es CORRECTO'))
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 80))

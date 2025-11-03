"""
Comando para corregir facturas con monto_aplicable = 0 incorrectamente
Uso: docker-compose exec backend python manage.py fix_zero_monto_aplicable
"""

from django.core.management.base import BaseCommand
from invoices.models import Invoice
from decimal import Decimal


class Command(BaseCommand):
    help = 'Corrige facturas con monto_aplicable=0 que no tienen NC ni disputas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('CORRECCIÓN DE MONTO_APLICABLE = 0'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        # Encontrar facturas con monto_aplicable = 0 pero monto > 0
        facturas_problema = Invoice.objects.filter(
            monto_aplicable=Decimal('0.00'),
            monto__gt=Decimal('0.00'),
            is_deleted=False
        )
        
        self.stdout.write(f'\n📊 Facturas encontradas con monto_aplicable=0: {facturas_problema.count()}')
        
        corregidas = 0
        sin_cambio = 0
        
        for invoice in facturas_problema:
            # Verificar si tiene razones válidas para tener monto_aplicable = 0
            nc_aplicadas = invoice.notas_credito.filter(
                is_deleted=False,
                estado='aplicada'
            )
            
            disputas_aprobadas = invoice.disputas.filter(
                is_deleted=False,
                estado__in=['resuelta', 'cerrada'],
                resultado__in=['aprobada_total', 'aprobada_parcial']
            )
            
            total_nc = sum(nc.monto for nc in nc_aplicadas)
            
            # Si tiene NC que justifican el 0, verificar que sea correcto
            if nc_aplicadas.exists():
                monto_base = invoice.monto_original if invoice.monto_original else invoice.monto
                monto_esperado = monto_base + total_nc
                
                if abs(monto_esperado) < Decimal('0.01'):  # Realmente anulada
                    self.stdout.write(f'   ✓ {invoice.numero_factura}: monto_aplicable=0 es CORRECTO (tiene NC que anulan)')
                    sin_cambio += 1
                    continue
            
            # Si tiene disputas aprobadas, saltear (lógica compleja)
            if disputas_aprobadas.exists():
                self.stdout.write(f'   ⚠️ {invoice.numero_factura}: Tiene disputas aprobadas, revisar manualmente')
                sin_cambio += 1
                continue
            
            # Si NO tiene NC ni disputas, el monto_aplicable debería ser = monto
            if not nc_aplicadas.exists() and not disputas_aprobadas.exists():
                self.stdout.write(f'\n🔧 Corrigiendo: {invoice.numero_factura}')
                self.stdout.write(f'      Monto: ${invoice.monto}')
                self.stdout.write(f'      Monto Aplicable ANTES: ${invoice.monto_aplicable}')
                
                invoice.monto_aplicable = invoice.monto
                invoice.save()
                
                # Recargar para ver el valor actualizado
                invoice.refresh_from_db()
                self.stdout.write(f'      Monto Aplicable DESPUÉS: ${invoice.monto_aplicable}')
                
                if invoice.monto_aplicable == invoice.monto:
                    self.stdout.write(self.style.SUCCESS(f'      ✅ CORREGIDA'))
                    corregidas += 1
                else:
                    self.stdout.write(self.style.ERROR(f'      ❌ ERROR: No se pudo corregir'))
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('CORRECCIÓN COMPLETADA'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'📊 Total revisadas: {facturas_problema.count()}')
        self.stdout.write(f'✅ Corregidas: {corregidas}')
        self.stdout.write(f'➖ Sin cambio (correctas o con disputas): {sin_cambio}')
        self.stdout.write('=' * 80)

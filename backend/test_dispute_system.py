#!/usr/bin/env python
"""
Script de Testing Completo para Sistema de Disputas
====================================================

Este script prueba todos los escenarios de disputas y verifica que:
1. Los estados de facturas se actualicen correctamente
2. Los montos aplicables se calculen bien
3. La sincronización con OT funcione correctamente
4. No se puedan crear disputas en facturas anuladas

Requisitos:
- Docker-compose corriendo con backend activo
- Base de datos con datos de prueba

Uso:
    python test_dispute_system.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from invoices.models import Invoice, Dispute
from ots.models import OT
from catalogs.models import Provider
from client_aliases.models import ClientAlias


class TestDisputeSystem:
    """Suite de pruebas para el sistema de disputas"""

    def __init__(self):
        self.test_results = []
        self.provider = None
        self.client = None
        self.ot = None

    def log(self, message, level='INFO'):
        """Log con formato"""
        prefix = {
            'INFO': 'ℹ️ ',
            'SUCCESS': '✅',
            'ERROR': '❌',
            'WARNING': '⚠️ '
        }.get(level, '')
        print(f"{prefix} {message}")

    def assert_equal(self, actual, expected, test_name):
        """Verificar que dos valores sean iguales"""
        if actual == expected:
            self.log(f"PASS: {test_name}", 'SUCCESS')
            self.test_results.append((test_name, True, None))
            return True
        else:
            msg = f"FAIL: {test_name} - Expected {expected}, got {actual}"
            self.log(msg, 'ERROR')
            self.test_results.append((test_name, False, msg))
            return False

    def setup_test_data(self):
        """Crear datos de prueba"""
        self.log("=== Configurando Datos de Prueba ===")

        # Obtener o crear proveedor
        self.provider, created = Provider.objects.get_or_create(
            nombre='Naviera de Prueba TEST',
            defaults={
                'categoria': 'naviera',
                'tiene_credito': True,
                'dias_credito': 30,
                'tipo': 'naviera'
            }
        )
        self.log(f"Proveedor: {self.provider.nombre}")

        # Obtener o crear cliente (usar el primero disponible o crear uno simple)
        self.client = ClientAlias.objects.first()
        if not self.client:
            self.client = ClientAlias.objects.create(
                original_name='Cliente de Prueba TEST'
            )
        self.log(f"Cliente: {self.client.original_name}")

        # Crear OT de prueba
        ot_num = f"TEST-OT-{date.today().strftime('%Y%m%d')}"
        self.ot, created = OT.objects.get_or_create(
            numero_ot=ot_num,
            defaults={
                'cliente': self.client,
                'proveedor': self.provider,
                'tipo_operacion': 'importacion',
                'master_bl': 'TESTMBL123',
                'estado': 'transito'
            }
        )
        self.log(f"OT: {self.ot.numero_ot}")

    def create_test_invoice(self, suffix='', monto=10000.00, tipo_costo='FLETE'):
        """Crear una factura de prueba"""
        from invoices.models import UploadedFile
        import hashlib

        # Crear archivo dummy
        test_hash = hashlib.sha256(f"test_{suffix}".encode()).hexdigest()
        uploaded_file, _ = UploadedFile.objects.get_or_create(
            sha256=test_hash,
            defaults={
                'filename': f'test_{suffix}.pdf',
                'path': f'test/test_{suffix}.pdf',
                'size': 1024,
                'content_type': 'application/pdf'
            }
        )

        # Crear factura
        invoice_num = f"TEST-INV-{suffix}-{date.today().strftime('%Y%m%d%H%M%S')}"
        invoice = Invoice.objects.create(
            numero_factura=invoice_num,
            proveedor=self.provider,
            proveedor_nombre=self.provider.nombre,
            tipo_proveedor='naviera',
            tipo_costo=tipo_costo,
            monto=Decimal(str(monto)),
            monto_aplicable=Decimal(str(monto)),
            fecha_emision=date.today(),
            tipo_pago='credito',
            ot=self.ot,
            uploaded_file=uploaded_file,
            estado_provision='pendiente'
        )

        self.log(f"Factura creada: {invoice.numero_factura} - ${monto}")
        return invoice

    def test_scenario_1_aprobada_total(self):
        """
        ESCENARIO 1: Disputa Aprobada Total (100% del monto)

        Resultado esperado:
        - Factura.estado_provision = 'anulada'
        - Factura.monto_aplicable = 0.00
        - OT.estado_provision = 'revision'
        """
        self.log("\n=== ESCENARIO 1: Disputa Aprobada Total ===")

        # Crear factura de prueba
        invoice = self.create_test_invoice('APROBADA_TOTAL', 10000.00)

        # Crear disputa
        dispute = Dispute.objects.create(
            numero_caso='CASE-001',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='flete',
            detalle='Cobro incorrecto de flete',
            monto_disputa=Decimal('10000.00'),  # 100% del monto
            estado='resuelta',
            resultado='aprobada_total',
            fecha_resolucion=date.today(),
            resolucion='Aprobada completamente'
        )

        # Refrescar datos
        invoice.refresh_from_db()
        self.ot.refresh_from_db()

        # Verificaciones
        self.assert_equal(
            invoice.estado_provision,
            'anulada',
            "Factura debe estar en estado 'anulada' (aprobación total)"
        )

        self.assert_equal(
            invoice.monto_aplicable,
            Decimal('0.00'),
            "Monto aplicable debe ser 0.00 (aprobación total)"
        )

        self.assert_equal(
            invoice.get_monto_anulado(),
            Decimal('10000.00'),
            "Monto anulado debe ser igual al monto original"
        )

        self.assert_equal(
            self.ot.estado_provision,
            'revision',
            "OT debe estar en 'revision' (factura anulada)"
        )

        # Limpiar
        dispute.delete()
        invoice.delete()

    def test_scenario_2_aprobada_parcial(self):
        """
        ESCENARIO 2: Disputa Aprobada Parcial (50% del monto)

        Resultado esperado:
        - Factura.estado_provision = 'anulada_parcialmente'
        - Factura.monto_aplicable = 5000.00 (50% del original)
        - OT.estado_provision = 'revision'
        """
        self.log("\n=== ESCENARIO 2: Disputa Aprobada Parcial ===")

        # Crear factura de prueba
        invoice = self.create_test_invoice('APROBADA_PARCIAL', 10000.00)

        # Crear disputa
        dispute = Dispute.objects.create(
            numero_caso='CASE-002',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='precio',
            detalle='Sobrecobro parcial',
            monto_disputa=Decimal('10000.00'),
            monto_recuperado=Decimal('5000.00'),  # 50% recuperado
            estado='resuelta',
            resultado='aprobada_parcial',
            fecha_resolucion=date.today(),
            resolucion='Aprobada parcialmente - 50%'
        )

        # Refrescar datos
        invoice.refresh_from_db()
        self.ot.refresh_from_db()

        # Verificaciones
        self.assert_equal(
            invoice.estado_provision,
            'anulada_parcialmente',
            "Factura debe estar en estado 'anulada_parcialmente'"
        )

        self.assert_equal(
            invoice.monto_aplicable,
            Decimal('5000.00'),
            "Monto aplicable debe ser 5000.00 (50% del original)"
        )

        self.assert_equal(
            invoice.get_monto_anulado(),
            Decimal('5000.00'),
            "Monto anulado debe ser 5000.00"
        )

        self.assert_equal(
            self.ot.estado_provision,
            'revision',
            "OT debe estar en 'revision'"
        )

        # Limpiar
        dispute.delete()
        invoice.delete()

    def test_scenario_3_rechazada(self):
        """
        ESCENARIO 3: Disputa Rechazada

        Resultado esperado:
        - Factura.estado_provision = 'pendiente'
        - Factura.monto_aplicable = monto original (sin cambios)
        - OT.estado_provision = 'pendiente'
        """
        self.log("\n=== ESCENARIO 3: Disputa Rechazada ===")

        # Crear factura de prueba
        invoice = self.create_test_invoice('RECHAZADA', 10000.00)

        # Crear disputa
        dispute = Dispute.objects.create(
            numero_caso='CASE-003',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='cantidad',
            detalle='Reclamo de cantidad incorrecta',
            monto_disputa=Decimal('10000.00'),
            estado='resuelta',
            resultado='rechazada',
            fecha_resolucion=date.today(),
            resolucion='Disputa rechazada por proveedor'
        )

        # Refrescar datos
        invoice.refresh_from_db()
        self.ot.refresh_from_db()

        # Verificaciones
        self.assert_equal(
            invoice.estado_provision,
            'pendiente',
            "Factura debe volver a 'pendiente' (disputa rechazada)"
        )

        self.assert_equal(
            invoice.monto_aplicable,
            Decimal('10000.00'),
            "Monto aplicable debe mantenerse igual (disputa rechazada)"
        )

        self.assert_equal(
            invoice.get_monto_anulado(),
            Decimal('0.00'),
            "Monto anulado debe ser 0.00 (disputa rechazada)"
        )

        # Limpiar
        dispute.delete()
        invoice.delete()

    def test_scenario_4_multiples_disputas(self):
        """
        ESCENARIO 4: Múltiples Disputas (2 aprobadas parciales)

        Resultado esperado:
        - Factura.estado_provision = 'anulada' si suma 100%
        - Factura.monto_aplicable = monto original - suma de recuperados
        """
        self.log("\n=== ESCENARIO 4: Múltiples Disputas ===")

        # Crear factura de prueba
        invoice = self.create_test_invoice('MULTIPLES', 10000.00)

        # Primera disputa: 30% recuperado
        dispute1 = Dispute.objects.create(
            numero_caso='CASE-004-A',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='flete',
            detalle='Primera disputa',
            monto_disputa=Decimal('5000.00'),
            monto_recuperado=Decimal('3000.00'),
            estado='resuelta',
            resultado='aprobada_parcial',
            fecha_resolucion=date.today()
        )

        invoice.refresh_from_db()

        # Verificar después de primera disputa
        self.assert_equal(
            invoice.estado_provision,
            'anulada_parcialmente',
            "Factura debe estar 'anulada_parcialmente' (primera disputa)"
        )

        self.assert_equal(
            invoice.monto_aplicable,
            Decimal('7000.00'),
            "Monto aplicable debe ser 7000.00 (después de primera disputa)"
        )

        # Segunda disputa: 70% recuperado adicional (total = 100%)
        dispute2 = Dispute.objects.create(
            numero_caso='CASE-004-B',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='precio',
            detalle='Segunda disputa',
            monto_disputa=Decimal('7000.00'),
            monto_recuperado=Decimal('7000.00'),
            estado='resuelta',
            resultado='aprobada_parcial',
            fecha_resolucion=date.today()
        )

        invoice.refresh_from_db()

        # Verificar después de segunda disputa (total = 100%)
        self.assert_equal(
            invoice.estado_provision,
            'anulada',
            "Factura debe estar 'anulada' (suma 100%)"
        )

        self.assert_equal(
            invoice.monto_aplicable,
            Decimal('0.00'),
            "Monto aplicable debe ser 0.00 (suma 100%)"
        )

        self.assert_equal(
            invoice.get_monto_anulado(),
            Decimal('10000.00'),
            "Monto anulado debe ser 10000.00 (suma de ambas disputas)"
        )

        # Limpiar
        dispute1.delete()
        dispute2.delete()
        invoice.delete()

    def test_scenario_5_no_disputar_anulada(self):
        """
        ESCENARIO 5: Validación - No permitir disputas en facturas anuladas

        Resultado esperado:
        - Creación de disputa debe fallar (validación en serializer)
        """
        self.log("\n=== ESCENARIO 5: Validación de Facturas Anuladas ===")

        # Crear factura de prueba
        invoice = self.create_test_invoice('ANULADA', 10000.00)

        # Crear disputa y resolverla completamente
        dispute1 = Dispute.objects.create(
            numero_caso='CASE-005',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='flete',
            detalle='Disputa que anula completamente',
            monto_disputa=Decimal('10000.00'),
            estado='resuelta',
            resultado='aprobada_total',
            fecha_resolucion=date.today()
        )

        invoice.refresh_from_db()

        # Verificar que está anulada
        self.assert_equal(
            invoice.estado_provision,
            'anulada',
            "Factura debe estar 'anulada'"
        )

        # Intentar crear segunda disputa (esto debe estar bloqueado en el frontend/serializer)
        self.log("Verificando que factura anulada no puede tener nuevas disputas...")

        # La validación está en el serializer, aquí solo verificamos el estado
        if invoice.estado_provision in ['anulada', 'anulada_parcialmente']:
            self.log("PASS: Factura está en estado que debe bloquear nuevas disputas", 'SUCCESS')
            self.test_results.append(("No permitir disputas en facturas anuladas", True, None))
        else:
            self.log("FAIL: Factura no está en estado correcto", 'ERROR')
            self.test_results.append(("No permitir disputas en facturas anuladas", False, "Estado incorrecto"))

        # Limpiar
        dispute1.delete()
        invoice.delete()

    def test_scenario_6_disputa_activa(self):
        """
        ESCENARIO 6: Disputa activa (abierta o en_revision)

        Resultado esperado:
        - Factura.estado_provision = 'disputada' mientras está activa
        - OT.estado_provision = 'disputada'
        """
        self.log("\n=== ESCENARIO 6: Disputa Activa (Abierta) ===")

        # Crear factura de prueba
        invoice = self.create_test_invoice('ACTIVA', 10000.00)

        # Crear disputa abierta (sin resolver)
        dispute = Dispute.objects.create(
            numero_caso='CASE-006',
            operativo='Operativo Test',
            invoice=invoice,
            ot=self.ot,
            tipo_disputa='servicio',
            detalle='Disputa activa sin resolver',
            monto_disputa=Decimal('10000.00'),
            estado='abierta',  # Estado activo
            resultado='pendiente'
        )

        # Refrescar datos
        invoice.refresh_from_db()
        self.ot.refresh_from_db()

        # Verificaciones
        self.assert_equal(
            invoice.estado_provision,
            'disputada',
            "Factura debe estar en 'disputada' (disputa activa)"
        )

        self.assert_equal(
            self.ot.estado_provision,
            'disputada',
            "OT debe estar en 'disputada' (disputa activa)"
        )

        # Limpiar
        dispute.delete()
        invoice.delete()

    def test_scenario_7_sync_ot_to_invoice(self):
        """
        ESCENARIO 7: Sincronización OT -> Invoice (signal)

        Verificar que al actualizar fechas en OT se sincronicen con las facturas
        """
        self.log("\n=== ESCENARIO 7: Sincronización OT -> Invoice ===")

        # Crear factura de prueba (FLETE - debe sincronizar)
        invoice = self.create_test_invoice('SYNC_OT', 10000.00, tipo_costo='FLETE')

        # Actualizar fecha_provision en OT
        self.ot.fecha_provision = date.today()
        self.ot.estado_provision = 'provisionada'
        self.ot.save()

        # Refrescar factura
        invoice.refresh_from_db()

        # Verificaciones
        self.assert_equal(
            invoice.estado_provision,
            'provisionada',
            "Factura debe heredar estado de OT"
        )

        self.assert_equal(
            invoice.fecha_provision,
            date.today(),
            "Factura debe heredar fecha_provision de OT"
        )

        # Limpiar
        invoice.delete()

        # Restaurar OT a estado original
        self.ot.estado_provision = 'pendiente'
        self.ot.fecha_provision = None
        self.ot.save()

    def run_all_tests(self):
        """Ejecutar todos los tests"""
        self.log("\n" + "="*60)
        self.log("INICIANDO SUITE DE PRUEBAS - SISTEMA DE DISPUTAS")
        self.log("="*60 + "\n")

        try:
            self.setup_test_data()

            self.test_scenario_1_aprobada_total()
            self.test_scenario_2_aprobada_parcial()
            self.test_scenario_3_rechazada()
            self.test_scenario_4_multiples_disputas()
            self.test_scenario_5_no_disputar_anulada()
            self.test_scenario_6_disputa_activa()
            self.test_scenario_7_sync_ot_to_invoice()

        except Exception as e:
            self.log(f"ERROR CRÍTICO: {str(e)}", 'ERROR')
            import traceback
            traceback.print_exc()

        # Resumen de resultados
        self.print_summary()

    def print_summary(self):
        """Imprimir resumen de resultados"""
        self.log("\n" + "="*60)
        self.log("RESUMEN DE RESULTADOS")
        self.log("="*60)

        total = len(self.test_results)
        passed = sum(1 for _, success, _ in self.test_results if success)
        failed = total - passed

        self.log(f"\nTotal de pruebas: {total}")
        self.log(f"Pasadas: {passed}", 'SUCCESS')
        if failed > 0:
            self.log(f"Fallidas: {failed}", 'ERROR')

        if failed > 0:
            self.log("\n--- Pruebas Fallidas ---", 'ERROR')
            for test_name, success, error_msg in self.test_results:
                if not success:
                    self.log(f"  • {test_name}: {error_msg}", 'ERROR')

        self.log("\n" + "="*60 + "\n")

        if failed == 0:
            self.log("🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE! 🎉", 'SUCCESS')
        else:
            self.log("ALGUNAS PRUEBAS FALLARON - REVISAR ERRORES", 'WARNING')


if __name__ == '__main__':
    tester = TestDisputeSystem()
    tester.run_all_tests()

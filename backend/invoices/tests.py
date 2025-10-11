"""
Tests para el módulo de Invoices.
Cubre modelos, serializers, parsers y endpoints.
"""

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta
import json
import os
import tempfile

from .models import Invoice, UploadedFile
from ots.models import OT
from catalogs.models import Provider
from client_aliases.models import ClientAlias
from .serializers import InvoiceCreateSerializer, InvoiceUpdateSerializer

User = get_user_model()


class InvoiceModelTestCase(TestCase):
    """Tests para el modelo Invoice"""
    
    def setUp(self):
        """Setup inicial para cada test"""
        # Crear cliente alias
        self.cliente = ClientAlias.objects.create(
            original_name="Test Client S.A.",
            normalized_name="TEST CLIENT SA"
        )
        
        # Crear proveedor
        self.proveedor = Provider.objects.create(
            nombre="MSC Mediterranean Shipping Company",
            tipo="naviera",
            categoria="internacional",
            email="msc@test.com"
        )
        
        # Crear OT con contenedores en JSON
        self.ot = OT.objects.create(
            numero_ot="OT-2025-001",
            cliente=self.cliente,
            master_bl="MSCU1234567890",
            contenedores=[
                {
                    "numero": "MSCU1234567",
                    "tipo": "20ST",
                    "peso": 20000,
                    "sello": "SEAL123"
                }
            ],
            estado="en_transito"
        )
        
        # Crear UploadedFile para asociar a las facturas
        content = b"Test PDF content for invoice"
        self.uploaded_file = UploadedFile.objects.create(
            filename="test_invoice.pdf",
            path="invoices/test/test_invoice.pdf",
            sha256=UploadedFile.calculate_hash(content),
            size=len(content),
            content_type="application/pdf"
        )

        # Asegurar archivo físico para pruebas de descarga
        default_storage.delete(self.uploaded_file.path)
        default_storage.save(self.uploaded_file.path, ContentFile(content))
        self.addCleanup(
            lambda: default_storage.delete(self.uploaded_file.path)
        )
    
    def _create_invoice(self, **kwargs):
        """Helper para crear facturas con uploaded_file por defecto"""
        if 'uploaded_file' not in kwargs:
            # Crear un uploaded_file único para cada factura
            content = f"Test content {kwargs.get('numero_factura', 'default')}".encode()
            uploaded_file = UploadedFile.objects.create(
                filename=f"{kwargs.get('numero_factura', 'test')}.pdf",
                path=f"invoices/test/{kwargs.get('numero_factura', 'test')}.pdf",
                sha256=UploadedFile.calculate_hash(content),
                size=len(content),
                content_type="application/pdf"
            )
            kwargs['uploaded_file'] = uploaded_file
        return Invoice.objects.create(**kwargs)
    
    def test_create_invoice_basic(self):
        """Test crear factura con datos básicos"""
        invoice = self._create_invoice(
            numero_factura="FAC-001-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("1500.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE"
        )
        
        self.assertEqual(invoice.numero_factura, "FAC-001-2025")
        self.assertEqual(invoice.monto, Decimal("1500.00"))
        self.assertEqual(invoice.estado_provision, "pendiente")
        self.assertEqual(invoice.estado_facturacion, "pendiente")
        self.assertTrue(invoice.requiere_revision)  # Default True
        self.assertIsNone(invoice.ot)
    
    def test_invoice_with_ot_assignment(self):
        """Test factura asignada a OT"""
        invoice = self._create_invoice(
            numero_factura="FAC-002-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("2000.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            ot=self.ot,
            ot_number="OT-2025-001",
            confianza_match=Decimal("0.950"),
            assignment_method="ot_directa",
            requiere_revision=False
        )
        
        self.assertEqual(invoice.ot, self.ot)
        self.assertEqual(invoice.ot_number, "OT-2025-001")
        self.assertEqual(invoice.confianza_match, Decimal("0.950"))
        self.assertFalse(invoice.requiere_revision)
    
    def test_invoice_low_confidence_requires_review(self):
        """Test factura con baja confianza requiere revisión"""
        invoice = self._create_invoice(
            numero_factura="FAC-003-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("1800.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="TRANSPORTE",
            ot=self.ot,
            ot_number="OT-2025-001",
            confianza_match=Decimal("0.650"),
            assignment_method="solo_contenedor",
            requiere_revision=True
        )
        
        self.assertTrue(invoice.requiere_revision)
        self.assertEqual(invoice.confianza_match, Decimal("0.650"))
    
    def test_invoice_soft_delete(self):
        """Test soft delete de factura"""
        invoice = self._create_invoice(
            numero_factura="FAC-004-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("1000.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="ALMACENAJE"
        )
        
        invoice_id = invoice.id
        
        # Soft delete usando el método del modelo
        invoice.soft_delete()
        
        # Verificar que está marcado como deleted
        self.assertTrue(invoice.is_deleted)
        self.assertIsNotNone(invoice.deleted_at)
        
        # Verificar que no aparece en el queryset por defecto (si está implementado el filtro)
        # Por ahora solo verificamos que el objeto existe y tiene is_deleted=True
        invoice_reloaded = Invoice.objects.get(id=invoice_id)
        self.assertTrue(invoice_reloaded.is_deleted)
    
    def test_invoice_estados_provision(self):
        """Test estados de provisión"""
        invoice = self._create_invoice(
            numero_factura="FAC-005-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("3000.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            estado_provision="pendiente"
        )
        
        self.assertEqual(invoice.estado_provision, "pendiente")
        
        # Cambiar a provisionada
        invoice.estado_provision = "provisionada"
        invoice.save()
        self.assertEqual(invoice.estado_provision, "provisionada")
        
        # Cambiar a rechazada
        invoice.estado_provision = "rechazada"
        invoice.save()
        self.assertEqual(invoice.estado_provision, "rechazada")
    
    def test_invoice_referencias_extraction(self):
        """Test extracción de referencias"""
        invoice = self._create_invoice(
            numero_factura="FAC-006-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("1500.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            referencias_detectadas={
                "ot": ["OT-2025-001"],
                "mbl": ["MSCU1234567890"],
                "contenedor": ["MSCU1234567"]
            }
        )
        
        self.assertIn("ot", invoice.referencias_detectadas)
        self.assertEqual(invoice.referencias_detectadas["ot"], ["OT-2025-001"])
        self.assertEqual(invoice.referencias_detectadas["mbl"], ["MSCU1234567890"])
    
    def test_invoice_str_representation(self):
        """Test representación string de factura"""
        invoice = self._create_invoice(
            numero_factura="FAC-007-2025",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("2500.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE"
        )
        
        # Verificar formato de str (debe coincidir con el __str__ del modelo)
        str_repr = str(invoice)
        self.assertIn("FAC-007-2025", str_repr)
        self.assertIn("MSC Mediterranean Shipping Company", str_repr)


class UploadedFileModelTestCase(TestCase):
    """Tests para el modelo UploadedFile"""
    
    def test_create_uploaded_file(self):
        """Test crear registro de archivo subido"""
        content = b"Test file content"
        sha256 = UploadedFile.calculate_hash(content)
        
        uploaded_file = UploadedFile.objects.create(
            filename="test.pdf",
            path="invoices/2025/01/test.pdf",
            sha256=sha256,
            size=len(content),
            content_type="application/pdf"
        )
        
        self.assertEqual(uploaded_file.filename, "test.pdf")
        self.assertEqual(uploaded_file.size, len(content))
        self.assertEqual(uploaded_file.sha256, sha256)
    
    def test_hash_calculation(self):
        """Test cálculo de hash SHA256"""
        content1 = b"Test content"
        content2 = b"Test content"
        content3 = b"Different content"
        
        hash1 = UploadedFile.calculate_hash(content1)
        hash2 = UploadedFile.calculate_hash(content2)
        hash3 = UploadedFile.calculate_hash(content3)
        
        # Mismo contenido = mismo hash
        self.assertEqual(hash1, hash2)
        
        # Diferente contenido = diferente hash
        self.assertNotEqual(hash1, hash3)
        
        # Hash es hexadecimal de 64 caracteres
        self.assertEqual(len(hash1), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in hash1))
    
    def test_uploaded_file_deduplication(self):
        """Test deduplicación por hash"""
        content = b"Duplicate test content"
        sha256 = UploadedFile.calculate_hash(content)
        
        # Primer archivo
        file1 = UploadedFile.objects.create(
            filename="file1.pdf",
            path="invoices/2025/01/file1.pdf",
            sha256=sha256,
            size=len(content),
            content_type="application/pdf"
        )
        
        # Intentar crear segundo archivo con mismo hash debe fallar
        with self.assertRaises(Exception):  # IntegrityError
            UploadedFile.objects.create(
                filename="file2.pdf",
                path="invoices/2025/01/file2.pdf",
                sha256=sha256,  # Mismo hash
                size=len(content),
                content_type="application/pdf"
            )
    
    def test_uploaded_file_str_representation(self):
        """Test representación string de archivo"""
        content = b"Test content"
        sha256 = UploadedFile.calculate_hash(content)
        
        uploaded_file = UploadedFile.objects.create(
            filename="document.json",
            path="invoices/2025/01/document.json",
            sha256=sha256,
            size=len(content),
            content_type="application/json"
        )
        
        expected = f"document.json ({sha256[:8]}...)"
        self.assertEqual(str(uploaded_file), expected)


class InvoiceSerializerTestCase(TestCase):
    """Tests para serializers de Invoice"""
    
    def setUp(self):
        """Setup inicial"""
        self.cliente = ClientAlias.objects.create(
            original_name="Test Client S.A.",
            normalized_name="TEST CLIENT SA"
        )
        
        self.proveedor = Provider.objects.create(
            nombre="MSC Mediterranean Shipping Company",
            tipo="naviera",
            categoria="internacional",
            email="msc@test.com"
        )
        
        self.ot = OT.objects.create(
            numero_ot="OT-2025-001",
            cliente=self.cliente,
            master_bl="MSCU1234567890",
            estado="en_transito"
        )
    
    def _create_invoice(self, **kwargs):
        """Helper para crear facturas con uploaded_file por defecto"""
        if 'uploaded_file' not in kwargs:
            content = f"Test content {kwargs.get('numero_factura', 'default')}".encode()
            uploaded_file = UploadedFile.objects.create(
                filename=f"{kwargs.get('numero_factura', 'test')}.pdf",
                path=f"invoices/test/{kwargs.get('numero_factura', 'test')}.pdf",
                sha256=UploadedFile.calculate_hash(content),
                size=len(content),
                content_type="application/pdf"
            )
            kwargs['uploaded_file'] = uploaded_file
        return Invoice.objects.create(**kwargs)
    
    def test_create_invoice_manual(self):
        """Test crear factura manualmente - SKIP por ahora (requiere archivo)"""
        # TODO: Implementar cuando se tenga el manejo completo de archivos en serializer
        pass
    
    def test_create_invoice_with_ot_reference(self):
        """Test crear factura con referencia a OT - SKIP por ahora (requiere archivo)"""
        # TODO: Implementar cuando se tenga el manejo completo de archivos en serializer
        pass
    
    def test_update_invoice_provision_status(self):
        """Test actualizar estado de provisión de factura"""
        invoice = self._create_invoice(
            numero_factura="FAC-UPDATE-001",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("3000.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            estado_provision="pendiente"
        )
        
        data = {
            "estado_provision": "provisionada"
        }
        
        serializer = InvoiceUpdateSerializer(invoice, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        updated_invoice = serializer.save()
        self.assertEqual(updated_invoice.estado_provision, "provisionada")
    
    def test_update_invoice_syncs_dates_to_ot(self):
        """Actualizar fechas en factura debe sincronizar OT (FLETE + naviera)."""
        invoice = self._create_invoice(
            numero_factura="FAC-SYNC-001",
            fecha_emision=date(2025, 1, 10),
            monto=Decimal("1500.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            tipo_proveedor="naviera",
            ot=self.ot,
            ot_number=self.ot.numero_ot,
        )

        data = {
            "fecha_provision": date(2025, 1, 22),
            "fecha_facturacion": date(2025, 1, 25),
        }

        serializer = InvoiceUpdateSerializer(invoice, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer.save()
        self.ot.refresh_from_db()
        invoice.refresh_from_db()

        self.assertEqual(self.ot.fecha_provision, date(2025, 1, 22))
        self.assertEqual(self.ot.estado_provision, "provisionada")
        self.assertEqual(self.ot.fecha_recepcion_factura, date(2025, 1, 25))
        self.assertEqual(self.ot.estado_facturado, "facturado")

    def test_update_invoice_does_not_sync_other_costs(self):
        """Facturas que no son FLETE/CARGOS_NAVIERA no afectan la OT."""
        invoice = self._create_invoice(
            numero_factura="FAC-SYNC-002",
            fecha_emision=date(2025, 1, 10),
            monto=Decimal("900.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="ALMACENAJE",
            tipo_proveedor="naviera",
            ot=self.ot,
            ot_number=self.ot.numero_ot,
        )

        data = {
            "fecha_provision": date(2025, 2, 1),
            "fecha_facturacion": date(2025, 2, 3),
        }

        serializer = InvoiceUpdateSerializer(invoice, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer.save()
        self.ot.refresh_from_db()

        self.assertIsNone(self.ot.fecha_provision)
        self.assertEqual(self.ot.estado_provision, "pendiente")
        self.assertIsNone(self.ot.fecha_recepcion_factura)
        self.assertEqual(self.ot.estado_facturado, "pendiente")

    def test_update_invoice_syncs_after_assigning_ot(self):
        """Asignar una OT y actualizar fechas en la misma operación debe sincronizarla."""
        otra_ot = OT.objects.create(
            numero_ot="OT-2025-002",
            cliente=self.cliente,
            master_bl="MSCU9876543210",
            estado="en_transito"
        )

        invoice = self._create_invoice(
            numero_factura="FAC-SYNC-003",
            fecha_emision=date(2025, 1, 10),
            monto=Decimal("1750.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            tipo_proveedor="naviera",
        )

        data = {
            "ot_id": otra_ot.id,
            "fecha_provision": date(2025, 2, 10),
            "fecha_facturacion": date(2025, 2, 12),
        }

        serializer = InvoiceUpdateSerializer(invoice, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer.save()
        otra_ot.refresh_from_db()
        invoice.refresh_from_db()

        self.assertEqual(invoice.ot, otra_ot)
        self.assertEqual(invoice.ot_number, otra_ot.numero_ot)
        self.assertEqual(otra_ot.fecha_provision, date(2025, 2, 10))
        self.assertEqual(otra_ot.fecha_recepcion_factura, date(2025, 2, 12))
        self.assertEqual(otra_ot.estado_provision, "provisionada")
        self.assertEqual(otra_ot.estado_facturado, "facturado")

    def test_required_fields_validation(self):
        """Test validación de campos requeridos - SKIP por ahora (requiere archivo)"""
        # TODO: Implementar cuando se tenga el manejo completo de archivos en serializer
        pass


# Ejecutar tests:
# docker-compose exec backend python manage.py test invoices.tests.InvoiceModelTestCase
# docker-compose exec backend python manage.py test invoices.tests.UploadedFileModelTestCase
# docker-compose exec backend python manage.py test invoices.tests.InvoiceSerializerTestCase
# docker-compose exec backend python manage.py test invoices.tests.InvoiceViewSetTestCase


class InvoiceViewSetTestCase(APITestCase):
    """Tests para endpoints de InvoiceViewSet"""
    
    def setUp(self):
        """Setup inicial"""
        # Crear usuario
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        
        # Crear cliente
        self.cliente = ClientAlias.objects.create(
            original_name="Test Client S.A.",
            normalized_name="TEST CLIENT SA"
        )
        
        # Crear proveedor
        self.proveedor = Provider.objects.create(
            nombre="MSC Mediterranean Shipping Company",
            tipo="naviera",
            categoria="internacional",
            email="msc@test.com"
        )
        
        # Crear OT
        self.ot = OT.objects.create(
            numero_ot="OT-2025-001",
            cliente=self.cliente,
            master_bl="MSCU1234567890",
            estado="en_transito"
        )
        
        # Crear uploaded file e invoice de prueba
        content = b"Test invoice file"
        self.uploaded_file = UploadedFile.objects.create(
            filename="test_invoice.pdf",
            path="invoices/test/test_invoice.pdf",
            sha256=UploadedFile.calculate_hash(content),
            size=len(content),
            content_type="application/pdf"
        )
        
        self.invoice = Invoice.objects.create(
            numero_factura="FAC-TEST-001",
            fecha_emision=date(2025, 1, 15),
            monto=Decimal("1500.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="FLETE",
            uploaded_file=self.uploaded_file
        )
    
    def test_list_invoices(self):
        """Test listar facturas"""
        url = '/api/invoices/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['numero_factura'], 'FAC-TEST-001')
    
    def test_get_invoice_detail(self):
        """Test obtener detalle de factura"""
        url = f'/api/invoices/{self.invoice.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['numero_factura'], 'FAC-TEST-001')
        self.assertEqual(Decimal(response.data['monto']), Decimal('1500.00'))
    
    def test_update_invoice(self):
        """Test actualizar factura (partial update)"""
        url = f'/api/invoices/{self.invoice.id}/'
        data = {
            'estado_provision': 'provisionada'
        }
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado_provision'], 'provisionada')
        
        # Verificar en DB
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.estado_provision, 'provisionada')
    
    def test_filter_invoices_by_estado(self):
        """Test filtrar facturas por estado"""
        # Crear otra factura con diferente estado
        content2 = b"Test invoice 2"
        uploaded_file2 = UploadedFile.objects.create(
            filename="test_invoice2.pdf",
            path="invoices/test/test_invoice2.pdf",
            sha256=UploadedFile.calculate_hash(content2),
            size=len(content2),
            content_type="application/pdf"
        )
        
        Invoice.objects.create(
            numero_factura="FAC-TEST-002",
            fecha_emision=date(2025, 1, 16),
            monto=Decimal("2000.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="TRANSPORTE",
            estado_provision="provisionada",
            uploaded_file=uploaded_file2
        )
        
        # Filtrar por estado pendiente
        url = '/api/invoices/?estado_provision=pendiente'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['numero_factura'], 'FAC-TEST-001')

    def test_filter_invoices_by_ot(self):
        """Test filtrar facturas por OT asignada"""
        # Asignar la factura principal a la OT de prueba
        self.invoice.ot = self.ot
        self.invoice.ot_number = self.ot.numero_ot
        self.invoice.save()

        # Crear factura adicional sin OT
        content2 = b"Test invoice without ot"
        uploaded_file2 = UploadedFile.objects.create(
            filename="test_invoice_no_ot.pdf",
            path="invoices/test/test_invoice_no_ot.pdf",
            sha256=UploadedFile.calculate_hash(content2),
            size=len(content2),
            content_type="application/pdf"
        )

        Invoice.objects.create(
            numero_factura="FAC-TEST-002",
            fecha_emision=date(2025, 1, 16),
            monto=Decimal("2000.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="TRANSPORTE",
            uploaded_file=uploaded_file2
        )

        # Filtrar por OT usando el parámetro principal
        url = f'/api/invoices/?ot={self.ot.id}'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['numero_factura'], 'FAC-TEST-001')

        # Validar alias ot_id por compatibilidad
        url_alias = f'/api/invoices/?ot_id={self.ot.id}'
        response_alias = self.client.get(url_alias)

        self.assertEqual(response_alias.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_alias.data['results']), 1)
        self.assertEqual(response_alias.data['results'][0]['numero_factura'], 'FAC-TEST-001')

    def test_retrieve_invoice_file_inline(self):
        """El endpoint de archivo devuelve respuesta inline por defecto."""
        url = f'/api/invoices/{self.invoice.id}/file/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Disposition'],
            f'inline; filename="{self.uploaded_file.filename}"'
        )
        self.assertEqual(
            response['Content-Type'],
            self.uploaded_file.content_type
        )

        file_bytes = b''.join(response.streaming_content)
        self.assertGreater(len(file_bytes), 0)

    def test_retrieve_invoice_file_download(self):
        """Permite forzar descarga con el parámetro download."""
        url = f'/api/invoices/{self.invoice.id}/file/?download=1'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Disposition'],
            f'attachment; filename="{self.uploaded_file.filename}"'
        )

        file_bytes = b''.join(response.streaming_content)
        self.assertGreater(len(file_bytes), 0)
    
    def test_get_pending_invoices(self):
        """Test endpoint de facturas pendientes de revisión"""
        # Crear factura que requiere revisión
        content2 = b"Test invoice pending"
        uploaded_file2 = UploadedFile.objects.create(
            filename="test_invoice_pending.pdf",
            path="invoices/test/test_invoice_pending.pdf",
            sha256=UploadedFile.calculate_hash(content2),
            size=len(content2),
            content_type="application/pdf"
        )
        
        Invoice.objects.create(
            numero_factura="FAC-PENDING-001",
            fecha_emision=date(2025, 1, 17),
            monto=Decimal("800.00"),
            proveedor=self.proveedor,
            proveedor_nombre="MSC Mediterranean Shipping Company",
            tipo_costo="DEMORA",
            requiere_revision=True,
            uploaded_file=uploaded_file2
        )
        
        url = '/api/invoices/pending/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Al menos 1 factura requiere revisión
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_authentication_required(self):
        """Test que los endpoints requieren autenticación"""
        self.client.force_authenticate(user=None)
        
        url = '/api/invoices/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

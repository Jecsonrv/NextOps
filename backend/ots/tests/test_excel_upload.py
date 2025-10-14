import io
import pandas as pd
from datetime import date, timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import User
from ots.models import OT, ProcessedFile
from client_aliases.models import ClientAlias

def create_mock_excel(data, filename="test.xlsx"):
    """
    Crea un archivo Excel en memoria a partir de una lista de diccionarios.
    """
    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    
    buffer.seek(0)
    return SimpleUploadedFile(
        name=filename,
        content=buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

class ExcelUploadAPITestCase(APITestCase):
    """
    Pruebas completas para el endpoint de carga de Excel de OTs.
    """

    def setUp(self):
        """
        Configura el entorno de prueba:
        - Crea un usuario con rol 'jefe_operaciones'.
        - Autentica al usuario para las pruebas.
        """
        self.user = User.objects.create_user(
            username='jefeops',
            email='jefeops@example.com',
            password='password123',
            role='jefe_operaciones'
        )
        self.client.force_authenticate(user=self.user)
        self.upload_url = reverse('ot-import-excel')
        self.resolve_url = reverse('ot-resolve-conflicts')

    def test_successful_upload_creates_ots_and_processed_file(self):
        """
        Verifica que una carga exitosa cree las OTs y el registro ProcessedFile.
        """
        excel_data = [
            {'OT': '25OT-001', 'Cliente': 'CLIENTE DE PRUEBA 1', 'MBL': 'MBL001'},
            {'OT': '25OT-002', 'Cliente': 'CLIENTE DE PRUEBA 2', 'MBL': 'MBL002'},
        ]
        mock_file = create_mock_excel(excel_data)

        response = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(response.data['processed'], 2)
        self.assertEqual(OT.objects.count(), 2)
        self.assertEqual(ProcessedFile.objects.count(), 1)
        self.assertTrue(OT.objects.filter(numero_ot='25OT-001').exists())

    def test_duplicate_file_is_skipped(self):
        """
        Verifica que subir el mismo archivo dos veces no cree OTs duplicadas.
        """
        excel_data = [{'OT': '25OT-003', 'Cliente': 'CLIENTE DUPLICADO'}]
        mock_file = create_mock_excel(excel_data, filename="duplicate.xlsx")

        # Primera carga (exitosa)
        response1 = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data['created'], 1)
        self.assertEqual(OT.objects.count(), 1)
        self.assertEqual(ProcessedFile.objects.count(), 1)

        # Segunda carga (debería ser omitida)
        mock_file.seek(0) # Resetear el puntero del archivo
        response2 = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['processed'], 0)
        self.assertEqual(response2.data['skipped'], 1)
        self.assertIn("ya fue procesado", response2.data['warnings'][0]['message'])
        self.assertEqual(OT.objects.count(), 1) # No se deben crear más OTs
        self.assertEqual(ProcessedFile.objects.count(), 1) # No se deben crear más registros de archivo

    def test_upload_returns_409_on_conflict(self):
        """
        Verifica que la API devuelva un 409 CONFLICT si hay un conflicto de datos.
        """
        # Pre-condición: Crear una OT y un cliente en la BD
        cliente_existente = ClientAlias.objects.create(original_name="CLIENTE ANTIGUO")
        OT.objects.create(numero_ot="25OT-CONFLICTO", cliente=cliente_existente)

        # El archivo Excel intenta cambiar el cliente para la misma OT
        excel_data = [{'OT': '25OT-CONFLICTO', 'Cliente': 'CLIENTE NUEVO'}]
        mock_file = create_mock_excel(excel_data)

        response = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(response.data['has_conflicts'])
        self.assertEqual(len(response.data['conflicts']), 2)
        
        # Verificar que la OT no fue modificada
        ot_db = OT.objects.get(numero_ot="25OT-CONFLICTO")
        self.assertEqual(ot_db.cliente.original_name, "CLIENTE ANTIGUO")

    def test_upload_skips_invalid_rows(self):
        """
        Verifica que las filas con datos inválidos (sin cliente, año incorrecto) se omitan.
        """
        excel_data = [
            {'OT': '25OT-VALIDA', 'Cliente': 'CLIENTE VALIDO'},
            {'OT': '25OT-SIN-CLIENTE'}, # Fila inválida
            {'OT': '24OT-ANO-INVALIDO', 'Cliente': 'CLIENTE INVALIDO'}, # Año 2024
        ]
        mock_file = create_mock_excel(excel_data)

        response = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['processed'], 1)
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['skipped'], 2)
        self.assertEqual(OT.objects.count(), 1)
        self.assertTrue(OT.objects.filter(numero_ot='25OT-VALIDA').exists())

        # Verificar warnings
        warnings = response.data['warnings']
        self.assertTrue(any("datos incompletos" in w['type'] for w in warnings))
        self.assertTrue(any("año invalido" in w['type'] for w in warnings))

    def test_resolve_conflicts_use_new_value(self):
        """
        Prueba el endpoint de resolución de conflictos, eligiendo el valor nuevo.
        """
        cliente_antiguo = ClientAlias.objects.create(original_name="JUGUESAL S.A. DE C.V.")
        OT.objects.create(numero_ot="25OT-RESOLVER", cliente=cliente_antiguo)

        excel_data = [{'OT': '25OT-RESOLVER', 'Cliente': 'JUGUESAL'}]
        mock_file = create_mock_excel(excel_data)

        conflicts_resolution = [{
            'ot': '25OT-RESOLVER',
            'campo': 'cliente',
            'resolucion': 'usar_nuevo',
            'valor_nuevo': 'JUGUESAL'
        }]
        import json
        conflicts_json = json.dumps(conflicts_resolution)

        response = self.client.post(
            self.resolve_url,
            {'files': [mock_file], 'conflicts': conflicts_json},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['processed'], 1)
        self.assertEqual(response.data['updated'], 1)

        ot_actualizada = OT.objects.get(numero_ot="25OT-RESOLVER")
        self.assertEqual(ot_actualizada.cliente.original_name, "JUGUESAL")

    def test_resolve_conflicts_keep_current_value(self):
        """
        Prueba el endpoint de resolución de conflictos, eligiendo mantener el valor actual.
        """
        cliente_antiguo = ClientAlias.objects.create(original_name="CLIENTE ANTIGUO SA DE CV")
        OT.objects.create(numero_ot="25OT-MANTENER", cliente=cliente_antiguo)

        excel_data = [{'OT': '25OT-MANTENER', 'Cliente': 'CLIENTE NUEVO'}]
        mock_file = create_mock_excel(excel_data)

        conflicts_resolution = [{
            'ot': '25OT-MANTENER',
            'campo': 'cliente',
            'resolucion': 'mantener_actual'
        }]
        import json
        conflicts_json = json.dumps(conflicts_resolution)

        response = self.client.post(
            self.resolve_url,
            {'files': [mock_file], 'conflicts': conflicts_json},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['processed'], 1)
        self.assertEqual(response.data['updated'], 1)

        ot_mantenida = OT.objects.get(numero_ot="25OT-MANTENER")
        self.assertEqual(ot_mantenida.cliente.original_name, "CLIENTE ANTIGUO SA DE CV")

    def test_unauthenticated_user_is_denied(self):
        """
        Verifica que un usuario no autenticado no pueda usar el endpoint.
        """
        self.client.force_authenticate(user=None) # Desautenticar
        excel_data = [{'OT': '25OT-001', 'Cliente': 'CLIENTE'}]
        mock_file = create_mock_excel(excel_data)

        response = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_without_role_is_denied(self):
        """
        Verifica que un usuario autenticado pero sin el rol correcto sea denegado.
        """
        operativo_user = User.objects.create_user(username='operativo', email='operativo@example.com', password='password', role='operativo')
        self.client.force_authenticate(user=operativo_user)
        
        excel_data = [{'OT': '25OT-001', 'Cliente': 'CLIENTE'}]
        mock_file = create_mock_excel(excel_data)

        response = self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Pruebas de Jerarquía de Datos ---

    def test_excel_import_does_not_overwrite_manual_field(self):
        """
        Verifica que la importación de Excel NO sobrescriba un campo editado manualmente.
        """
        cliente = ClientAlias.objects.create(original_name="CLIENTE JERARQUIA")
        ot = OT.objects.create(
            numero_ot="25OT-HIERARCHY-1",
            cliente=cliente,
            barco="Barco Manual",
            barco_source="manual"
        )

        excel_data = [{'OT': '25OT-HIERARCHY-1', 'Cliente': 'CLIENTE JERARQUIA', 'Barco': 'Barco Excel'}]
        mock_file = create_mock_excel(excel_data)

        self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')

        ot.refresh_from_db()
        self.assertEqual(ot.barco, "Barco Manual")
        self.assertEqual(ot.barco_source, "manual")

    def test_excel_import_does_not_overwrite_csv_field(self):
        """
        Verifica que la importación de Excel NO sobrescriba un campo importado por CSV.
        """
        cliente = ClientAlias.objects.create(original_name="CLIENTE JERARQUIA")
        ot = OT.objects.create(
            numero_ot="25OT-HIERARCHY-2",
            cliente=cliente,
            fecha_eta=date(2025, 10, 10),
            fecha_eta_source="csv"
        )

        excel_data = [{'OT': '25OT-HIERARCHY-2', 'Cliente': 'CLIENTE JERARQUIA', 'Fecha ETA': '2025-11-11'}]
        mock_file = create_mock_excel(excel_data)

        self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')

        ot.refresh_from_db()
        self.assertEqual(ot.fecha_eta, date(2025, 10, 10))
        self.assertEqual(ot.fecha_eta_source, "csv")

    def test_excel_import_overwrites_excel_field(self):
        """
        Verifica que la importación de Excel SÍ sobrescriba un campo previamente cargado por Excel.
        """
        cliente = ClientAlias.objects.create(original_name="CLIENTE JERARQUIA")
        ot = OT.objects.create(
            numero_ot="25OT-HIERARCHY-3",
            cliente=cliente,
            estado="puerto",
            estado_source="excel"
        )

        excel_data = [{'OT': '25OT-HIERARCHY-3', 'Cliente': 'CLIENTE JERARQUIA', 'Estatus': 'bodega'}]
        mock_file = create_mock_excel(excel_data)

        self.client.post(self.upload_url, {'files': [mock_file]}, format='multipart')

        ot.refresh_from_db()
        self.assertEqual(ot.estado, "bodega")
        self.assertEqual(ot.estado_source, "excel")

    def test_manual_edit_sets_source_to_manual(self):
        """
        Verifica que una edición manual vía API actualice la fuente a 'manual'.
        """
        cliente = ClientAlias.objects.create(original_name="CLIENTE MANUAL")
        ot = OT.objects.create(
            numero_ot="25OT-MANUAL-EDIT",
            cliente=cliente,
            estado="transito",
            estado_source="excel"
        )

        update_url = reverse('ot-detail', kwargs={'pk': ot.pk})
        response = self.client.patch(update_url, {'estado': 'en_rada'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ot.refresh_from_db()
        self.assertEqual(ot.estado, "en_rada")
        self.assertEqual(ot.estado_source, "manual")
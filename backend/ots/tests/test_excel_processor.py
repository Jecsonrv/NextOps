
import hashlib
import pandas as pd
from unittest.mock import MagicMock, patch
from django.test import TestCase
from datetime import date

from ots.services.excel_processor import ExcelProcessor
from ots.models import OT, ProcessedFile
from client_aliases.models import ClientAlias, ClientResolution

class ExcelProcessorTestCase(TestCase):
    def setUp(self):
        """Set up basic data for tests."""
        self.client1 = ClientAlias.objects.create(original_name="CLIENTE ANTIGUO")
        self.client2 = ClientAlias.objects.create(original_name="UNION DE PERSONAS OPLOGIST, S.A. DE C.V., FARMAVIDA.")

        # OT 1: For simple update/skip tests
        self.ot1_initial_data = {
            'cliente_name': 'CLIENTE ANTIGUO',
            'proveedor_name': None,
            'operativo': 'TESTER',
            'tipo_operacion': 'importacion',
            'master_bl': 'MBL001',
            'house_bls': [],
            'contenedores': [],
            'fecha_eta': None,
            'fecha_llegada': None,
            'etd': None,
            'puerto_origen': '-',
            'puerto_destino': '-',
            'tipo_embarque': '-',
            'barco': '-',
            'express_release_fecha': None,
            'contra_entrega_fecha': None,
            'fecha_solicitud_facturacion': None,
            'fecha_recepcion_factura': None,
            'envio_cierre_ot': None,
            'fecha_provision': None,
            'estado': 'transito',
        }
        self.ot1 = OT.objects.create(
            numero_ot="25OT-001",
            cliente=self.client1,
            master_bl="MBL001",
            operativo="TESTER",
            estado="transito",
            row_hash=ExcelProcessor._calculate_row_hash(self.ot1_initial_data)
        )

        # OT 2: For conflict resolution tests
        self.ot2 = OT.objects.create(
            numero_ot="25OT-002",
            cliente=self.client2,
            master_bl="MBL002",
            estado="transito",
            operativo="TESTER"
        )
        
        # OT 3: Another OT with the same client as OT2
        self.ot3 = OT.objects.create(
            numero_ot="25OT-003",
            cliente=self.client2,
            master_bl="MBL003",
            estado="puerto"
        )


    def test_simple_creation(self):
        """Test that new OTs are created correctly."""
        processor = ExcelProcessor(filename="test.xlsx")
        ot_data = {
            'cliente_name': 'NUEVO CLIENTE', 'proveedor_name': 'NUEVA NAVIERA',
            'operativo': 'JENNIFER', 'tipo_operacion': 'importacion',
            'master_bl': 'MBL-NEW', 'house_bls': [], 'contenedores': [],
            'fecha_eta': None, 'fecha_llegada': None, 'etd': None,
            'puerto_origen': '-', 'puerto_destino': '-', 'tipo_embarque': '-',
            'barco': '-', 'express_release_fecha': None, 'contra_entrega_fecha': None,
            'fecha_solicitud_facturacion': None, 'fecha_recepcion_factura': None,
            'envio_cierre_ot': None, 'fecha_provision': None, 'estado': 'puerto',
        }
        processor._create_or_update_ot("25OT-NEW-001", ot_data)
        
        self.assertEqual(processor.stats['created'], 1)
        self.assertTrue(OT.objects.filter(numero_ot="25OT-NEW-001").exists())
        new_ot = OT.objects.get(numero_ot="25OT-NEW-001")
        self.assertEqual(new_ot.cliente.original_name, "NUEVO CLIENTE")
        self.assertIsNotNone(new_ot.row_hash)

    def test_update_with_changes(self):
        """Test that an existing OT is updated when data changes."""
        processor = ExcelProcessor(filename="test.xlsx")
        ot_data = self.ot1_initial_data.copy()
        ot_data['operativo'] = 'MARIA' # Changed field
        ot_data['estado'] = 'en_rada' # Changed field

        # Calculate hash before the dictionary is mutated by the method call
        new_hash = ExcelProcessor._calculate_row_hash(ot_data)
        
        processor._create_or_update_ot("25OT-001", ot_data)
        
        self.assertEqual(processor.stats['updated'], 1)
        self.ot1.refresh_from_db()
        self.assertEqual(self.ot1.operativo, "MARIA")
        self.assertEqual(self.ot1.estado, "en_rada")
        self.assertEqual(self.ot1.row_hash, new_hash)

    def test_skip_without_changes(self):
        """Test that an existing OT is skipped when data does not change."""
        processor = ExcelProcessor(filename="test.xlsx")
        # This data matches the initial state of self.ot1
        ot_data = self.ot1_initial_data.copy()
        
        original_hash = self.ot1.row_hash
        processor._create_or_update_ot("25OT-001", ot_data)
        
        self.assertEqual(processor.stats['updated'], 0)
        self.assertEqual(processor.stats['skipped'], 1)
        self.ot1.refresh_from_db()
        self.assertEqual(self.ot1.row_hash, original_hash)

    def test_conflict_detection_cliente(self):
        """Test that a conflict is detected if the client name changes."""
        processor = ExcelProcessor(filename="test.xlsx")
        # The row passed to _load_row_data has mapped column names as index
        row_data = pd.Series(
            ['25OT-002', 'JUGUESAL, S.A. DE C.V.', 'TESTER'],
            index=['numero_ot', 'cliente', 'operativo']
        )
        processor._load_row_data(row_data, 2, "test.xlsx", "importacion")

        self.assertEqual(len(processor.detected_conflicts), 1)
        conflict = processor.detected_conflicts[0]
        self.assertEqual(conflict['ot'], '25OT-002')
        self.assertEqual(conflict['campo'], 'cliente')
        self.assertEqual(conflict['valor_actual'], 'UNION DE PERSONAS OPLOGIST, S.A. DE C.V., FARMAVIDA.')
        self.assertEqual(conflict['valor_nuevo'], 'JUGUESAL, S.A. DE C.V.')

    def test_conflict_resolve_use_new(self):
        """Test resolving a conflict by choosing the new value."""
        processor = ExcelProcessor(filename="test.xlsx")
        # Simulate the state after loading the file with the conflict
        ot_data_from_file = self.ot1_initial_data.copy()
        ot_data_from_file['cliente_name'] = 'CLIENTE NUEVO'
        processor.pending_data = {"25OT-001": {"data": ot_data_from_file, "row": 2, "filename": "test.xlsx"}}
        
        resolutions = [{'ot': '25OT-001', 'campo': 'cliente', 'resolucion': 'usar_nuevo'}]
        
        stats = processor.resolve_conflicts_and_process(resolutions)
        
        self.assertEqual(stats['processed'], 1)
        self.assertEqual(stats['updated'], 1)
        self.assertEqual(stats['skipped'], 0)
        
        self.ot1.refresh_from_db()
        self.assertEqual(self.ot1.cliente.original_name, 'CLIENTE NUEVO')
        new_hash = ExcelProcessor._calculate_row_hash(ot_data_from_file)
        self.assertEqual(self.ot1.row_hash, new_hash)

    def test_conflict_resolve_keep_current(self):
        """Test resolving a conflict by choosing to keep the current value."""
        processor = ExcelProcessor(filename="test.xlsx")
        # Simulate the state after loading the file with the conflict
        ot_data_from_file = self.ot1_initial_data.copy()
        ot_data_from_file['cliente_name'] = 'CLIENTE NUEVO DESDE EXCEL'
        processor.pending_data = {"25OT-001": {"data": ot_data_from_file, "row": 2, "filename": "test.xlsx"}}
        
        resolutions = [{'ot': '25OT-001', 'campo': 'cliente', 'resolucion': 'mantener_actual'}]
        
        stats = processor.resolve_conflicts_and_process(resolutions)
        
        self.assertEqual(stats['processed'], 1)
        self.assertEqual(stats['updated'], 0)
        self.assertEqual(stats['skipped'], 1)
        
        self.ot1.refresh_from_db()
        self.assertEqual(self.ot1.cliente.original_name, 'CLIENTE ANTIGUO')
        # Hash should not have changed
        self.assertEqual(self.ot1.row_hash, ExcelProcessor._calculate_row_hash(self.ot1_initial_data))

    def test_no_global_alias_created_on_conflict_resolution(self):
        """
        Test that resolving a conflict for one OT does not create a global alias
        that incorrectly affects other OTs.
        """
        # 1. Setup: OT-002 and OT-003 both have client "UNION DE PERSONAS..."
        
        # 2. Simulate resolving a conflict for OT-002, changing its client to "JUGUESAL"
        processor1 = ExcelProcessor(filename="file1.xlsx")
        ot2_data_from_file = {'cliente_name': 'JUGUESAL', 'master_bl': 'MBL002', 'estado': 'transito'}
        processor1.pending_data = {"25OT-002": {"data": ot2_data_from_file, "row": 2, "filename": "file1.xlsx"}}
        resolutions = [{'ot': '25OT-002', 'campo': 'cliente', 'resolucion': 'usar_nuevo'}]
        processor1.resolve_conflicts_and_process(resolutions)

        # Verify OT-002 was updated
        self.ot2.refresh_from_db()
        self.assertEqual(self.ot2.cliente.original_name, 'JUGUESAL')

        # 3. Now, process a file containing OT-003 with its original client name.
        # No conflict should be detected.
        processor2 = ExcelProcessor(filename="file2.xlsx")
        row_data_ot3 = pd.Series({'OT': '25OT-003', 'Cliente': 'UNION DE PERSONAS OPLOGIST, S.A. DE C.V., FARMAVIDA.'})
        
        # We call _load_row_data directly to check the conflict detection logic
        processor2._load_row_data(row_data_ot3, 2, "file2.xlsx", "importacion")

        # Assert that NO conflict was detected for OT-003
        self.assertEqual(len(processor2.detected_conflicts), 0)

    def test_normalization_avoids_conflict(self):
        """
        Test that if a ClientResolution exists, it's used to normalize the
        client name and avoid a conflict.
        """
        # Setup:
        # ot1 has client "CLIENTE ANTIGUO"
        # We create a resolution that maps "CLIENTE ALIAS" -> "CLIENTE ANTIGUO"
        normalized_name = ClientAlias.normalize_name("CLIENTE ALIAS")
        ClientResolution.objects.create(
            original_name="CLIENTE ALIAS",
            normalized_name=normalized_name,
            resolved_to=self.client1,
            resolution_type='manual'
        )

        processor = ExcelProcessor(filename="test.xlsx")
        # This row uses the alias name for an existing OT
        row_data = pd.Series(
            ['25OT-001', 'CLIENTE ALIAS', 'TESTER'],
            index=['numero_ot', 'cliente', 'operativo']
        )

        # Action: Load the row data
        processor._load_row_data(row_data, 2, "test.xlsx", "importacion")

        # Assert: No conflict was detected
        self.assertEqual(len(processor.detected_conflicts), 0)

        # Assert: The pending data has the CORRECTLY normalized client name
        self.assertIn("25OT-001", processor.pending_data)
        pending_ot_data = processor.pending_data["25OT-001"]['data']
        self.assertEqual(pending_ot_data['cliente_name'], "CLIENTE ANTIGUO")

    def test_extract_contenedores_with_commas(self):
        """Test extraction of containers separated by commas."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567, EFGH8901234, IJKL5678901'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 3)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)
        self.assertIn('IJKL5678901', containers)

    def test_extract_contenedores_with_newlines(self):
        """Test extraction of containers separated by newlines."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567\nEFGH8901234\nIJKL5678901'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 3)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)
        self.assertIn('IJKL5678901', containers)

    def test_extract_contenedores_with_spaces(self):
        """Test extraction of containers separated by multiple spaces."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567  EFGH8901234   IJKL5678901'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 3)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)
        self.assertIn('IJKL5678901', containers)

    def test_extract_contenedores_with_mixed_separators(self):
        """Test extraction of containers with mixed separators (commas, newlines, spaces)."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567, EFGH8901234\nIJKL5678901  MNOP2345678;QRST6789012'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 5)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)
        self.assertIn('IJKL5678901', containers)
        self.assertIn('MNOP2345678', containers)
        self.assertIn('QRST6789012', containers)

    def test_extract_contenedores_with_carriage_return(self):
        """Test extraction of containers separated by carriage return \\r\\n."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567\r\nEFGH8901234\r\nIJKL5678901'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 3)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)
        self.assertIn('IJKL5678901', containers)

    def test_extract_contenedores_with_lowercase(self):
        """Test that lowercase containers are properly converted to uppercase."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'abcd1234567, efgh8901234'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 2)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)

    def test_extract_contenedores_removes_duplicates(self):
        """Test that duplicate containers are removed."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567, ABCD1234567, EFGH8901234, ABCD1234567'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 2)
        self.assertEqual(containers.count('ABCD1234567'), 1)

    def test_extract_contenedores_ignores_invalid_format(self):
        """Test that invalid container formats are ignored."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'ABCD1234567, ABC123, TOOLONGCONTAINER123456789, EFGH8901234'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 2)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)
        self.assertNotIn('ABC123', containers)

    def test_extract_contenedores_with_extra_text(self):
        """Test extraction when there's extra text around containers."""
        processor = ExcelProcessor()
        row = pd.Series({
            'contenedor': 'Contenedor: ABCD1234567 (confirmado), EFGH8901234 - en tránsito'
        })
        containers = processor._extract_contenedores(row)
        self.assertEqual(len(containers), 2)
        self.assertIn('ABCD1234567', containers)
        self.assertIn('EFGH8901234', containers)

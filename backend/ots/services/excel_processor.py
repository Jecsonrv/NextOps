"""
ExcelProcessor - Servicio para procesar archivos Excel de OTs.

Funcionalidades:
- Detección inteligente de headers (hasta 5 filas)
- Mapeo flexible de columnas con nombres equivalentes
- Normalización de datos (contenedores, fechas, etc.)
- Validación de datos mínimos requeridos
- Upsert inteligente (actualizar solo si no hay cambios manuales)
"""

import pandas as pd
import re
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q

from ots.models import CONTAINER_NUMBER_PATTERN


class ExcelProcessor:
    """Procesador de archivos Excel para importar OTs"""
    
    # Mapeo de nombres de columnas equivalentes (fuzzy column matching)
    COLUMN_MAPPINGS = {
        'numero_ot': [
            'ot', 'o.t.', 'o.t', 'numero ot', 'número ot', 'numero_ot', 
            'nº ot', 'no. ot', 'orden trabajo', 'orden de trabajo', 'work order',
            'no.', 'no', 'num', '#', 'recepcion ot', 'recepción ot'
        ],
        'cliente': [
            'shipper en origen', 'shipper origen', 'cliente origen', 'exportador',
            'nombre del consignatario', 'nombre consignatario', 'consignatario',
            'cliente', 'client', 'consignee', 'shipper',
            'consignador', 'destinatario', 'receptor', 'cnee', 'customer'
        ],
        'proveedor': [
            'proveedor', 'provider', 'naviera', 'shipping line', 'carrier',
            'linea naviera', 'línea naviera', 'transportista', 'naviera (destino)',
            'naviera destino', 'shipping company', 'supplier', 'naviera destino',
            'naviera / forwarder / aerolinea (origen)', 'naviera forwarder aerolinea',
            'naviera/forwarder/aerolinea', 'forwarder', 'aerolinea'
        ],
        'master_bl': [
            'master bl', 'mbl', 'bl master', 'm/bl', 'm.b.l', 'master bill',
            'bill of lading', 'conocimiento embarque maestro', 'no. doc master',
            'no doc master', 'numero doc master', 'master', 'master b/l',
            'bl', 'b/l', 'bill', 'mbl/mawb/cp', 'mawb', 'master airway bill'
        ],
        'house_bl': [
            'house bl', 'hbl', 'bl house', 'h/bl', 'h.b.l', 'house bill',
            'conocimiento embarque hijo', 'sub bl', 'no. doc house', 'no doc house',
            'numero doc house', 'hbl/hawb/cp', 'hawb', 'house airway bill', 'cp'
        ],
        'contenedor': [
            'contenedor', 'container', 'contenedores', 'containers', 'cntr',
            'equipo', 'equipment', 'caja', 'numero cntr', 'numero contenedor',
            'no. cntr', 'total de cntr', 'numero cntr.', 'total de cntr.'
        ],
        'fecha_eta': [
            'eta', 'e.t.a', 'fecha eta', 'estimated arrival', 'arribo estimado',
            'llegada estimada', 'fecha llegada estimada'
        ],
        'fecha_llegada': [
            'atraque', 'fecha atraque', 'llegada', 'fecha llegada', 'arrival',
            'fecha arribo', 'arribo real', 'actual arrival', 'fecha de arribo'
        ],
        'puerto_origen': [
            'origen', 'puerto origen', 'port of loading', 'pol', 'embarque',
            'puerto embarque', 'loading port', 'puerto carga', 'puerto de salida',
            'puerto salida', 'puerto de salida (origen)'
        ],
        'puerto_destino': [
            'destino', 'puerto destino', 'port of discharge', 'pod', 'descarga',
            'puerto descarga', 'discharge port', 'puerto destino', 'puerto de arribo',
            'puerto arribo', 'puerto de arribo/pais', 'destino final', 'destino final de embarque'
        ],
        'provision': [
            'provision', 'provisión', 'costo', 'cost', 'monto', 'amount',
            'valor', 'gasto', 'expense', 'provision de proveedor', 'provisión de proveedor',
            'fecha provision'
        ],
        'operativo': [
            'operativo', 'operative', 'responsable', 'asignado', 'assigned'
        ],
        'tipo_embarque': [
            'tipo embarque', 'tipo de embarque', 'shipment type', 'fcl', 'lcl',
            'movimiento (sd / cy)', 'movimiento', 'sd / cy', 'cy', 'sd'
        ],
        'barco': [
            'barco', 'buque', 'vessel', 'nave', 'barco y viaje',
            'barco y viaje de arribo', 'embarcacion', 'embarcación'
        ],
        'etd': [
            'etd', 'e.t.d', 'fecha etd', 'fecha salida', 'departure date',
            'estimated departure', 'salida estimada', 'fecha de zarpe', 'zarpe'
        ],
        'express_release': [
            'express release', 'express release (hbl)', 'release expres'
        ],
        'contra_entrega': [
            'contra entrega', 'contra entrega de original', 
            'contra entrega de original (hbl)', 'entrega original'
        ],
        'fecha_solicitud_facturacion': [
            'solicitud facturacion', 'fecha solicitud facturacion',
            'fecha solicitud de facturacion', 'solicitud fact'
        ],
        'fecha_recepcion_factura': [
            'recepcion factura', 'fecha recepcion factura',
            'fecha recepcion de factura', 'fecha factura', 'recepcion de factura'
        ],
        'envio_cierre': [
            'envio cierre', 'envio cierre de ot', 'envio de cierre',
            'cierre ot', 'fecha cierre', 'fecha finalizacion', 'finalizacion'
        ],
        'estatus': [
            'estatus', 'status', 'estado', 'state'
        ],
    }
    
    # Años mínimos válidos para filtrado
    MIN_YEAR = 2025
    
    def __init__(self, filename: str = ''):
        """
        Inicializar procesador

        Args:
            filename: Nombre del archivo para inferir operativo
        """
        self.filename = filename
        self.stats = {
            'total_rows': 0,
            'processed': 0,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': [],
            'conflicts': [],
            'warnings': [],  # Mensajes informativos sobre filas omitidas
            'warnings_summary': {}  # Resumen agrupado de warnings por tipo
        }
        # Cache temporal para detectar conflictos entre archivos
        self.pending_data = {}  # {numero_ot: {'data': {...}, 'filename': str}}
        self.detected_conflicts = []  # Lista de conflictos detectados
    
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """
        Calcula el hash SHA256 del contenido de un archivo.

        Args:
            file_path: Ruta al archivo

        Returns:
            Hash SHA256 en formato hexadecimal
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            # Leer en chunks para archivos grandes
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def process_multiple_files(self, file_paths: List[Tuple[str, str]], tipos_operacion: List[str] = None) -> Dict[str, Any]:
        """
        Procesar múltiples archivos Excel y detectar conflictos.

        Fase 0: Verificar si los archivos ya fueron procesados (hash)
        Fase 1: Cargar todos los datos y detectar conflictos de cliente/operativo
        Fase 2: Si hay conflictos, retornarlos para resolución
        Fase 3: Si no hay conflictos, procesar normally

        Args:
            file_paths: Lista de tuplas (file_path, filename) para procesar
            tipos_operacion: Lista de tipos de operación, uno por archivo ('importacion' o 'exportacion')

        Returns:
            Diccionario con estadísticas y conflictos detectados
        """
        from ots.models import ProcessedFile

        # Si no se proporcionan tipos, usar 'importacion' como default
        if tipos_operacion is None:
            tipos_operacion = ['importacion'] * len(file_paths)

        # Fase 0: Verificar archivos ya procesados
        files_to_process = []
        for i, (file_path, filename) in enumerate(file_paths):
            file_hash = self.calculate_file_hash(file_path)

            # Verificar si ya fue procesado
            if ProcessedFile.is_already_processed(file_hash):
                processed_info = ProcessedFile.get_processed_file_info(file_hash)
                self.stats['warnings'].append({
                    'row': 'N/A',
                    'ot': 'N/A',
                    'type': 'archivo duplicado',
                    'message': f"Archivo '{filename}' ya fue procesado el {processed_info.created_at.strftime('%Y-%m-%d %H:%M')}. Se omite para evitar duplicados.",
                    'file': filename
                })
                # Agregar las estadísticas del archivo previo
                self.stats['total_rows'] += processed_info.total_rows
                self.stats['skipped'] += processed_info.total_rows
                continue

            files_to_process.append((file_path, filename, file_hash, tipos_operacion[i] if i < len(tipos_operacion) else 'importacion'))

        # Si no hay archivos nuevos para procesar, retornar
        if not files_to_process:
            self._generate_warnings_summary()
            return self.stats

        # Fase 1: Cargar todos los archivos y detectar conflictos
        for file_path, filename, file_hash, tipo_op in files_to_process:
            self.filename = filename
            self._load_file_data(file_path, filename, tipo_op)
        
        # Fase 2: Verificar si hay conflictos
        if self.detected_conflicts:
            # Retornar inmediatamente con los conflictos
            self.stats['conflicts'] = self.detected_conflicts
            self.stats['message'] = f'Se detectaron {len(self.detected_conflicts)} conflictos que requieren resolución'
            return self.stats
        
        # Fase 3: No hay conflictos, procesar normally
        from ots.models import OT
        for numero_ot, pending_item in self.pending_data.items():
            try:
                ot_data = pending_item['data']
                self._create_or_update_ot(numero_ot, ot_data)
                self.stats['processed'] += 1
            except Exception as e:
                self.stats['errors'].append({
                    'row': pending_item.get('row', 'N/A'),
                    'ot': numero_ot,
                    'error': f"Error al procesar OT {numero_ot}: {str(e)}"
                })
        
        # Generar resumen agrupado de warnings
        self._generate_warnings_summary()

        # Marcar archivos como procesados
        from ots.models import ProcessedFile
        for file_path, filename, file_hash, tipo_op in files_to_process:
            ProcessedFile.mark_as_processed(
                file_hash=file_hash,
                filename=filename,
                stats=self.stats,
                operation_type=tipo_op
            )

        return self.stats
    
    def _load_file_data(self, file_path: str, filename: str, tipo_operacion: str = 'importacion'):
        """
        Cargar datos de un archivo y detectar conflictos con datos ya cargados o BD.
        
        Args:
            file_path: Ruta al archivo Excel
            filename: Nombre del archivo (para referencia en conflictos)
            tipo_operacion: Tipo de operación manual ('importacion' o 'exportacion')
        """
        try:
            sheet_name = self._find_best_sheet(file_path)
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
            
            # Detectar headers
            header_row, column_map = self._detect_headers(df)
            
            if header_row is None:
                self.stats['errors'].append({
                    'row': 'N/A',
                    'error': f'Archivo {filename}: No se pudieron detectar headers'
                })
                return
            
            # Releer con headers detectados
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
            df_mapped = self._map_columns(df, column_map)
            
            # Usar tipo de operación proporcionado por el usuario (NO auto-detectar)
            # El parámetro tipo_operacion ya viene desde el frontend
            
            # Procesar cada fila y contar solo las que tienen contenido
            for idx, row in df_mapped.iterrows():
                try:
                    # Verificar si la fila está vacía antes de contarla
                    if not self._is_empty_row(row):
                        self.stats['total_rows'] += 1
                        self._load_row_data(row, idx + header_row + 2, filename, tipo_operacion)
                except Exception as e:
                    ot_num = 'N/A'
                    try:
                        ot_num = self._extract_numero_ot(row) or 'N/A'
                    except:
                        pass
                    
                    self.stats['errors'].append({
                        'row': idx + header_row + 2,
                        'ot': ot_num,
                        'error': f"Archivo {filename}, fila {idx + header_row + 2}: {str(e)}"
                    })
        
        except Exception as e:
            self.stats['errors'].append({
                'row': 'N/A',
                'error': f'Error al cargar archivo {filename}: {str(e)}'
            })
    
    def _load_row_data(self, row: pd.Series, row_number: int, filename: str, tipo_operacion: str = 'importacion'):
        """
        Cargar datos de una fila y detectar conflictos.
        
        Args:
            row: Serie de pandas con datos
            row_number: Número de fila en Excel
            filename: Nombre del archivo origen
            tipo_operacion: Tipo de operación (importacion/exportacion)
        """
        # Validar si la fila está completamente vacía (solo NaN o espacios en blanco)
        if self._is_empty_row(row):
            # No contar como skipped, simplemente ignorar
            return
        
        # Extraer datos básicos
        numero_ot = self._extract_numero_ot(row)
        cliente_name_raw = self._extract_value(row, 'cliente')
        if cliente_name_raw:
            cliente_name_raw = cliente_name_raw.upper()

        # Validar campos obligatorios
        if not numero_ot or not cliente_name_raw:
            self.stats['skipped'] += 1
            reason = []
            if not numero_ot:
                reason.append("falta número de OT")
            if not cliente_name_raw:
                reason.append("falta nombre de cliente")

            self.stats['warnings'].append({
                'row': row_number,
                'ot': numero_ot or 'N/A',
                'type': 'datos incompletos',
                'message': f"Fila omitida: {', '.join(reason)}",
                'file': filename
            })
            return

        # Aplicar resolución cacheada si existe
        from client_aliases.models import ClientResolution
        resolved_cliente = ClientResolution.find_resolution(cliente_name_raw)
        if resolved_cliente:
            # Usar el cliente resuelto automáticamente
            cliente_name = resolved_cliente.original_name
        else:
            # Usar el nombre tal como viene
            cliente_name = cliente_name_raw
        
        # Validar año
        if not self._is_valid_ot_year(numero_ot):
            self.stats['skipped'] += 1
            self.stats['warnings'].append({
                'row': row_number,
                'ot': numero_ot,
                'type': 'año invalido',
                'message': f"OT omitida: año no válido (debe ser >= {self.MIN_YEAR})",
                'file': filename
            })
            return
        
        # Extraer operativo
        operativo = self._extract_value(row, 'operativo')
        if not operativo:
            operativo = self._infer_operativo_from_filename()
        if operativo:
            operativo = operativo.upper()
        
        # Detectar conflictos
        from ots.models import OT
        existing_ot = OT.objects.filter(numero_ot=numero_ot).first()
        
        # Conflicto con BD: Cliente
        if existing_ot and existing_ot.cliente:
            cliente_actual = existing_ot.cliente.original_name.upper()
            if cliente_actual != cliente_name:
                self.detected_conflicts.append({
                    'ot': numero_ot,
                    'campo': 'cliente',
                    'valor_actual': cliente_actual,
                    'valor_nuevo': cliente_name,
                    'archivo_origen': filename,
                    'row': row_number
                })
        
        # Conflicto con BD: Operativo
        if existing_ot and existing_ot.operativo:
            operativo_actual = existing_ot.operativo.upper()
            if operativo and operativo_actual != operativo:
                self.detected_conflicts.append({
                    'ot': numero_ot,
                    'campo': 'operativo',
                    'valor_actual': operativo_actual,
                    'valor_nuevo': operativo,
                    'archivo_origen': filename,
                    'row': row_number
                })
        
        # Conflicto entre archivos
        if numero_ot in self.pending_data:
            prev_data = self.pending_data[numero_ot]['data']
            prev_filename = self.pending_data[numero_ot]['filename']
            
            # Comparar cliente
            prev_cliente = prev_data.get('cliente_name')
            if prev_cliente and prev_cliente != cliente_name:
                self.detected_conflicts.append({
                    'ot': numero_ot,
                    'campo': 'cliente',
                    'valor_actual': prev_cliente,
                    'valor_nuevo': cliente_name,
                    'archivo_origen': filename,
                    'archivo_anterior': prev_filename,
                    'row': row_number
                })
            
            # Comparar operativo
            prev_operativo = prev_data.get('operativo')
            if prev_operativo and operativo and prev_operativo != operativo:
                self.detected_conflicts.append({
                    'ot': numero_ot,
                    'campo': 'operativo',
                    'valor_actual': prev_operativo,
                    'valor_nuevo': operativo,
                    'archivo_origen': filename,
                    'archivo_anterior': prev_filename,
                    'row': row_number
                })
        
        # Guardar en cache (extracción completa de datos)
        ot_data = self._extract_complete_row_data(row, cliente_name, operativo, tipo_operacion)
        self.pending_data[numero_ot] = {
            'data': ot_data,
            'filename': filename,
            'row': row_number
        }
    
    def _generate_warnings_summary(self):
        """
        Genera un resumen agrupado de warnings por tipo.

        En lugar de mostrar 500 mensajes individuales, agrupa por categoría:
        - "año inválido": X OTs
        - "datos incompletos": Y OTs
        - etc.
        """
        # Agrupar warnings por tipo
        warnings_by_type = {}
        for warning in self.stats.get('warnings', []):
            warning_type = warning.get('type', 'otro')

            # Normalizar el tipo para mostrar con espacios
            display_type = warning_type.replace('_', ' ')

            if display_type not in warnings_by_type:
                warnings_by_type[display_type] = 0
            warnings_by_type[display_type] += 1

        # Guardar el resumen
        self.stats['warnings_summary'] = warnings_by_type

        # Limpiar la lista de warnings individuales para ahorrar memoria
        # Solo mantener los primeros 10 de cada tipo como ejemplos
        if len(self.stats['warnings']) > 100:
            # Mantener solo una muestra
            warnings_sample = {}
            for warning in self.stats['warnings']:
                warning_type = warning.get('type', 'otro')
                if warning_type not in warnings_sample:
                    warnings_sample[warning_type] = []
                if len(warnings_sample[warning_type]) < 10:
                    warnings_sample[warning_type].append(warning)

            # Aplanar de vuelta a lista
            self.stats['warnings'] = [w for samples in warnings_sample.values() for w in samples]

    def _extract_complete_row_data(self, row: pd.Series, cliente_name: str, operativo: str, tipo_operacion: str = 'importacion') -> Dict[str, Any]:
        """Extraer todos los datos de una fila para procesamiento posterior."""
        master_bl = self._extract_value(row, 'master_bl')
        if master_bl:
            master_bl = master_bl.upper()
        
        house_bls = self._extract_list_value(row, 'house_bl')
        if house_bls:
            house_bls = [hbl.upper() if hbl else hbl for hbl in house_bls]
        
        contenedores = self._extract_contenedores(row)
        
        # Fechas
        fecha_eta = self._extract_date(row, 'fecha_eta')
        fecha_llegada = self._extract_date(row, 'fecha_llegada')
        etd = self._extract_date(row, 'etd')
        fecha_solicitud_facturacion = self._extract_date(row, 'fecha_solicitud_facturacion')
        fecha_recepcion_factura = self._extract_date(row, 'fecha_recepcion_factura')
        envio_cierre_ot = self._extract_date(row, 'envio_cierre')
        fecha_provision = self._extract_date(row, 'provision')
        
        if not fecha_eta and fecha_llegada:
            fecha_eta = fecha_llegada
        
        # Otros campos
        proveedor_name = self._extract_value(row, 'proveedor')
        if proveedor_name:
            proveedor_name = proveedor_name.upper()
        
        puerto_origen = (self._extract_value(row, 'puerto_origen') or '-').upper()
        puerto_destino = (self._extract_value(row, 'puerto_destino') or '-').upper()
        tipo_embarque = (self._extract_value(row, 'tipo_embarque') or '-').upper()
        barco = (self._extract_value(row, 'barco') or '-').upper()
        
        express_release_fecha = self._extract_date(row, 'express_release')
        contra_entrega_fecha = self._extract_date(row, 'contra_entrega')
        
        # Estado
        estatus_original = self._extract_value(row, 'estatus')
        estatus = self._normalize_estado(estatus_original)
        
        return {
            'cliente_name': cliente_name,
            'proveedor_name': proveedor_name,
            'operativo': operativo,
            'tipo_operacion': tipo_operacion,
            'master_bl': master_bl or '',
            'house_bls': house_bls,
            'contenedores': contenedores,
            'fecha_eta': fecha_eta,
            'fecha_llegada': fecha_llegada,
            'etd': etd,
            'puerto_origen': puerto_origen,
            'puerto_destino': puerto_destino,
            'tipo_embarque': tipo_embarque,
            'barco': barco,
            'express_release_fecha': express_release_fecha,
            'contra_entrega_fecha': contra_entrega_fecha,
            'fecha_solicitud_facturacion': fecha_solicitud_facturacion,
            'fecha_recepcion_factura': fecha_recepcion_factura,
            'envio_cierre_ot': envio_cierre_ot,
            'fecha_provision': fecha_provision,
            'estado': estatus,
        }
    
    def _normalize_estado(self, estatus_original: Optional[str]) -> str:
        """Normalizar estado a valores válidos."""
        estatus = 'transito'  # Default
        
        if estatus_original:
            estatus_lower = estatus_original.lower().strip()
            
            if 'almacenadora' in estatus_lower or 'almacen' in estatus_lower:
                estatus = 'almacenadora'
            elif 'bodega' in estatus_lower:
                estatus = 'bodega'
            elif 'cerrada' in estatus_lower or 'cerrado' in estatus_lower or 'close' in estatus_lower:
                estatus = 'cerrada'
            elif 'desprendimiento' in estatus_lower:
                estatus = 'desprendimiento'
            elif 'disputa' in estatus_lower or 'disputed' in estatus_lower:
                estatus = 'disputa'
            elif 'rada' in estatus_lower:
                estatus = 'en_rada'
            elif 'fact adicional' in estatus_lower or 'facturacion adicional' in estatus_lower:
                estatus = 'fact_adicionales'
            elif 'finalizada' in estatus_lower or 'finalizado' in estatus_lower or 'finished' in estatus_lower:
                estatus = 'finalizada'
            elif 'puerto' in estatus_lower and 'ada' not in estatus_lower:
                estatus = 'puerto'
            elif 'transito' in estatus_lower or 'tránsit' in estatus_lower or 'transit' in estatus_lower:
                estatus = 'transito'
            elif 'pendiente' in estatus_lower or 'pending' in estatus_lower:
                estatus = 'pendiente'
            elif 'entregad' in estatus_lower or 'deliver' in estatus_lower:
                estatus = 'entregado'
            elif 'facturad' in estatus_lower or 'invoice' in estatus_lower or 'billed' in estatus_lower:
                estatus = 'facturado'
            elif 'cancel' in estatus_lower:
                estatus = 'cancelado'
        
        return estatus
    
    def _create_or_update_ot(self, numero_ot: str, ot_data: Dict[str, Any]):
        """Crear o actualizar una OT con los datos proporcionados."""
        from ots.models import OT
        from client_aliases.models import ClientAlias
        from catalogs.models import Provider
        
        # Validar que cliente_name esté presente
        if 'cliente_name' not in ot_data:
            # Log de debugging para ver qué keys están disponibles
            available_keys = ', '.join(ot_data.keys())
            raise ValueError(f"cliente_name no está presente en ot_data para OT {numero_ot}. Keys disponibles: {available_keys}")
        
        # Buscar o crear cliente
        cliente_name = ot_data.pop('cliente_name')
        
        if not cliente_name or not str(cliente_name).strip():
            # Si no hay cliente, usar un valor por defecto
            cliente_name = "CLIENTE NO ESPECIFICADO"
        
        # Limpiar el nombre del cliente
        cliente_name = str(cliente_name).strip().upper()
        
        cliente, _ = ClientAlias.objects.get_or_create(
            original_name=cliente_name,
            defaults={
                'normalized_name': ClientAlias.normalize_name(cliente_name)
            }
        )

        # Obtener el alias efectivo (si está fusionado, usa el principal)
        cliente = cliente.get_effective_alias()

        # Buscar proveedor
        proveedor_name = ot_data.pop('proveedor_name', None)
        proveedor = None
        if proveedor_name:
            proveedor = Provider.objects.filter(nombre__icontains=proveedor_name).first()
        
        # Preparar datos finales
        ot_data_final = {
            'numero_ot': numero_ot,
            'cliente': cliente,
            'proveedor': proveedor,
            'tipo_operacion': ot_data.get('tipo_operacion', 'importacion'),
            **ot_data
        }
        
        # Provisión con jerarquía
        if ot_data_final.get('fecha_provision'):
            ot_data_final['provision_source'] = 'excel'
            ot_data_final['provision_locked'] = False
            ot_data_final['provision_updated_by'] = 'Excel Import'
        
        # Barco - marcar origen como excel
        # NOTA: Descomentar cuando se ejecuten las migraciones para barco_source
        # if ot_data_final.get('barco') and ot_data_final['barco'] != '-':
        #     ot_data_final['barco_source'] = 'excel'
        
        # Crear o actualizar
        existing_ot = OT.objects.filter(numero_ot=numero_ot).first()
        
        if existing_ot:
            PROTECTED_FIELDS = [
                'estado', 'fecha_eta', 'fecha_llegada', 'barco', 'proveedor', 
                'puerto_origen', 'puerto_destino', 'fecha_provision'
            ]

            for key, value in ot_data_final.items():
                if key in PROTECTED_FIELDS:
                    if not existing_ot.can_update_field(key, 'excel'):
                        continue

                # Campos de provisión especiales se saltan aquí porque se manejan con fecha_provision
                if key in ['provision_source', 'provision_locked', 'provision_updated_by']:
                    continue

                if key == 'comentarios':
                    continue
                
                if value is not None and (not isinstance(value, str) or value.strip()):
                    setattr(existing_ot, key, value)
                    # Si es un campo protegido, también actualizar su fuente
                    if key in PROTECTED_FIELDS:
                        setattr(existing_ot, f"{key}_source", 'excel')
            
            existing_ot.save()
            self.stats['updated'] += 1
        else:
            # Quitar express_release_tipo y contra_entrega_tipo si no están en modelo
            ot_data_final.pop('express_release_tipo', None)
            ot_data_final.pop('contra_entrega_tipo', None)
            OT.objects.create(**ot_data_final)
            self.stats['created'] += 1
    
    def resolve_conflicts_and_process(self, conflicts_resolutions: List[Dict[str, Any]], processed_by: str = 'system') -> Dict[str, Any]:
        """
        Resolver conflictos y procesar las OTs con las decisiones tomadas.

        Args:
            conflicts_resolutions: Lista de resoluciones de conflictos
                [{'ot': '25OT221', 'campo': 'cliente', 'resolucion': 'usar_nuevo', 'valor_nuevo': 'JUGUESAL', 'valor_original': 'JUGUESAL S.A. DE C.V.'}, ...]
            processed_by: Usuario que está procesando (para audit trail)

        Returns:
            Estadísticas de procesamiento
        """
        from ots.models import OT
        from client_aliases.models import ClientResolution, ClientAlias

        # Crear un mapa de resoluciones por OT y campo
        resolutions_map = {}
        for resolution in conflicts_resolutions:
            ot = resolution['ot']
            campo = resolution['campo']
            decision = resolution['resolucion']

            if ot not in resolutions_map:
                resolutions_map[ot] = {}
            resolutions_map[ot][campo] = {
                'decision': decision,
                'valor_nuevo': resolution.get('valor_nuevo'),
                'valor_original': resolution.get('valor_original')
            }

        # Procesar las OTs aplicando las resoluciones
        for numero_ot, pending_item in self.pending_data.items():
            try:
                ot_data = pending_item['data'].copy()

                # Aplicar resoluciones si existen
                if numero_ot in resolutions_map:
                    existing_ot = OT.objects.filter(numero_ot=numero_ot).first()

                    # Cliente
                    if 'cliente' in resolutions_map[numero_ot]:
                        resolution_info = resolutions_map[numero_ot]['cliente']
                        decision = resolution_info['decision']

                        if decision == 'mantener_actual' and existing_ot:
                            # Mantener el cliente actual de la BD
                            ot_data['cliente_name'] = existing_ot.cliente.original_name
                        elif decision == 'usar_nuevo':
                            # Usar el nuevo cliente del Excel
                            # Cachear esta decisión para futuros archivos
                            valor_original = resolution_info.get('valor_original')
                            valor_nuevo = resolution_info.get('valor_nuevo')

                            if valor_original and valor_nuevo:
                                # Buscar o crear el ClientAlias del cliente resuelto
                                cliente_resuelto, _ = ClientAlias.objects.get_or_create(
                                    original_name=valor_nuevo,
                                    defaults={
                                        'normalized_name': ClientAlias.normalize_name(valor_nuevo)
                                    }
                                )

                                # Cachear la resolución
                                ClientResolution.cache_resolution(
                                    original_name=valor_original,
                                    resolved_to=cliente_resuelto,
                                    resolution_type='conflict',
                                    created_by=processed_by
                                )

                    # Operativo
                    if 'operativo' in resolutions_map[numero_ot]:
                        resolution_info = resolutions_map[numero_ot]['operativo']
                        decision = resolution_info['decision']

                        if decision == 'mantener_actual' and existing_ot:
                            ot_data['operativo'] = existing_ot.operativo

                self._create_or_update_ot(numero_ot, ot_data)
                self.stats['processed'] += 1

            except Exception as e:
                self.stats['errors'].append({
                    'row': pending_item.get('row', 'N/A'),
                    'ot': numero_ot,
                    'error': f"Error al procesar OT {numero_ot}: {str(e)}"
                })

        # Generar resumen agrupado de warnings
        self._generate_warnings_summary()

        # Marcar archivos como procesados (si tenemos info del hash)
        # Nota: Los hashes se deben pasar desde el viewset que llama a este método

        return self.stats
    
    def _find_best_sheet(self, file_path: str) -> str:
        """
        Encuentra la mejor hoja para procesar buscando la que tenga más datos.
        Prioriza hojas con nombres comunes como 'IMPORT', 'BASE', 'DATOS'.
        
        Args:
            file_path: Ruta al archivo Excel
            
        Returns:
            Nombre de la mejor hoja
        """
        xl = pd.ExcelFile(file_path)
        sheet_names = xl.sheet_names
        
        # Nombres prioritarios
        priority_names = ['import', 'base', 'datos', 'ots', 'ordenes']
        
        # Buscar hojas prioritarias primero
        for priority in priority_names:
            for sheet in sheet_names:
                if priority in sheet.lower():
                    return sheet
        
        # Si no hay hoja prioritaria, buscar la que tenga más filas
        best_sheet = sheet_names[0]
        max_rows = 0
        
        for sheet in sheet_names:
            try:
                df = pd.read_excel(xl, sheet_name=sheet, header=None)
                if len(df) > max_rows:
                    max_rows = len(df)
                    best_sheet = sheet
            except:
                continue
        
        return best_sheet
    
    def process_file(self, file_path: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Procesar archivo Excel completo.
        
        Args:
            file_path: Ruta al archivo Excel
            sheet_name: Nombre de la hoja a procesar (opcional, busca automáticamente)
            
        Returns:
            Diccionario con estadísticas de procesamiento
        """
        try:
            # Si no se especifica hoja, buscar la mejor opción
            if not sheet_name:
                sheet_name = self._find_best_sheet(file_path)
                print(f"DEBUG: Usando hoja: {sheet_name}")
            
            # Leer Excel (sin headers específicos aún)
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
            
            # Detectar fila de headers
            header_row, column_map = self._detect_headers(df)
            
            if header_row is None:
                self.stats['errors'].append({
                    'row': 'N/A',
                    'error': 'No se pudieron detectar los headers en las primeras 5 filas. Verifique que el archivo tenga columnas con nombres como: OT, Cliente, MBL'
                })
                return self.stats
            
            print(f"DEBUG: Headers detectados en fila {header_row}")
            print(f"DEBUG: Mapeo de columnas: {column_map}")
            
            # Releer con headers detectados
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
            
            # Mapear columnas a nombres estándar
            df_mapped = self._map_columns(df, column_map)
            
            # Procesar cada fila
            self.stats['total_rows'] = len(df_mapped)
            
            for idx, row in df_mapped.iterrows():
                try:
                    self._process_row(row, idx + header_row + 2)  # +2 porque idx empieza en 0 y header_row es 0-indexed
                    self.stats['processed'] += 1
                except Exception as e:
                    # Capturar el número de OT si existe para mejor tracking
                    ot_num = 'N/A'
                    try:
                        ot_num = self._extract_numero_ot(row) or 'N/A'
                    except:
                        pass
                    
                    error_type = type(e).__name__
                    error_msg = str(e)
                    
                    # Formatear mensaje más descriptivo con OT number
                    if ot_num != 'N/A':
                        display_msg = f"OT {ot_num}: {error_msg}"
                    else:
                        display_msg = f"Fila {idx + header_row + 2}: {error_msg}"
                    
                    self.stats['errors'].append({
                        'row': idx + header_row + 2,
                        'ot': ot_num,
                        'error': display_msg
                    })
            
            return self.stats
            
        except Exception as e:
            self.stats['errors'].append({
                'row': 'N/A',
                'error': f'Error general al procesar archivo: {str(e)}'
            })
            return self.stats
    
    def _detect_headers(self, df: pd.DataFrame) -> Tuple[Optional[int], Optional[Dict[int, str]]]:
        """
        Detectar fila de headers con un sistema de dos pasadas (exacto y luego fuzzy).
        """
        max_rows_to_check = min(5, len(df))
        best_total_score = 0
        best_row_idx = None
        best_map = None

        for row_idx in range(max_rows_to_check):
            row = df.iloc[row_idx]
            column_map = {}
            total_score = 0
            
            # --- PASADA 1: Coincidencias Exactas ---
            found_cols = set()
            available_mappings = self.COLUMN_MAPPINGS.copy()

            for col_idx, cell_value in enumerate(row):
                if pd.isna(cell_value) or col_idx in found_cols:
                    continue
                
                cell_str = str(cell_value).lower().strip()
                
                for standard_name, alternatives in list(available_mappings.items()):
                    if cell_str in [alt.lower().strip() for alt in alternatives]:
                        # Coincidencia exacta encontrada
                        column_map[col_idx] = standard_name
                        total_score += 100  # Puntuación alta para coincidencia exacta
                        found_cols.add(col_idx)
                        del available_mappings[standard_name] # No volver a usar este mapeo
                        break
            
            # --- PASADA 2: Coincidencias Parciales (Fuzzy) para columnas restantes ---
            candidates = {}
            for col_idx, cell_value in enumerate(row):
                if pd.isna(cell_value) or col_idx in found_cols:
                    continue
                
                cell_str = str(cell_value).lower().strip()
                if len(cell_str) < 2:
                    continue

                for standard_name, alternatives in available_mappings.items():
                    best_alt_score = 0
                    for alt in alternatives:
                        alt_lower = alt.lower().strip()
                        if alt_lower in cell_str:
                            score = 15
                        elif cell_str in alt_lower:
                            score = 10
                        else:
                            score = 0
                        if score > best_alt_score:
                            best_alt_score = score

                    if best_alt_score > 0:
                        if standard_name not in candidates:
                            candidates[standard_name] = []
                        candidates[standard_name].append((col_idx, best_alt_score))

            # Asignar las mejores coincidencias fuzzy
            inverted_candidates = {}
            for standard_name, options in candidates.items():
                for col_idx, score in options:
                    if col_idx not in inverted_candidates:
                        inverted_candidates[col_idx] = []
                    inverted_candidates[col_idx].append((standard_name, score))

            for col_idx, options in inverted_candidates.items():
                if col_idx in column_map: continue # Ya asignado en pasada exacta
                options.sort(key=lambda x: -x[1])
                best_standard_name, best_score = options[0]
                column_map[col_idx] = best_standard_name
                total_score += best_score

            # Evaluar si esta fila es la mejor candidata a header
            if 'numero_ot' in column_map.values() or 'cliente' in column_map.values():
                if total_score > best_total_score:
                    best_total_score = total_score
                    best_row_idx = row_idx
                    best_map = column_map

        return (best_row_idx, best_map) if best_row_idx is not None else (None, None)
    
    def _map_columns(self, df: pd.DataFrame, column_map: Dict[int, str]) -> pd.DataFrame:
        """
        Renombrar columnas del DataFrame según el mapeo detectado.
        
        Args:
            df: DataFrame con headers originales
            column_map: Mapeo de índice_columna -> nombre_estándar
            
        Returns:
            DataFrame con columnas renombradas
        """
        new_columns = {}
        for col_idx, standard_name in column_map.items():
            if col_idx < len(df.columns):
                original_col = df.columns[col_idx]
                new_columns[original_col] = standard_name
        
        df_renamed = df.rename(columns=new_columns)
        return df_renamed
    
    def _process_row(self, row: pd.Series, row_number: int):
        """
        Procesar una fila individual del Excel.
        
        Validación mínima: OT + CLIENTE + MBL obligatorios
        Naviera opcional (null si no existe)
        
        Args:
            row: Serie de pandas con datos de la fila
            row_number: Número de fila en el Excel (para reporting)
        """
        # Extraer y validar datos OBLIGATORIOS (solo OT y CLIENTE)
        numero_ot = self._extract_numero_ot(row)
        cliente_name = self._extract_value(row, 'cliente')
        if cliente_name:
            cliente_name = cliente_name.upper()
        master_bl = self._extract_value(row, 'master_bl')  # Opcional
        if master_bl:
            master_bl = master_bl.upper()
        
        # Validar campos obligatorios
        missing_fields = []
        if not numero_ot:
            missing_fields.append('OT')
        if not cliente_name:
            missing_fields.append('CLIENTE')
        
        if missing_fields:
            self.stats['skipped'] += 1
            ot_display = f"OT {numero_ot}" if numero_ot else f"Fila {row_number}"
            razon = f"Campos obligatorios faltantes: {', '.join(missing_fields)}"
            self.stats['errors'].append({
                'row': row_number,
                'ot': numero_ot or 'N/A',
                'error': f'{ot_display} - OMITIDA: {razon}'
            })
            return
        
        # Filtrar por año mínimo
        if not self._is_valid_ot_year(numero_ot):
            self.stats['skipped'] += 1
            self.stats['warnings'].append({
                'row': row_number,
                'ot': numero_ot,
                'type': 'año invalido',
                'message': f"OT omitida: año no válido (debe ser >= {self.MIN_YEAR})",
                'file': self.filename
            })
            return
        
        # Buscar o crear alias de cliente
        from client_aliases.models import ClientAlias
        from catalogs.models import Provider
            
        cliente, _ = ClientAlias.objects.get_or_create(
            original_name=cliente_name,
            defaults={
                'normalized_name': ClientAlias.normalize_name(cliente_name)
            }
        )

        # Obtener el alias efectivo (si está fusionado, usa el principal)
        cliente = cliente.get_effective_alias()

        # Extraer proveedor (naviera) - OPCIONAL, permitir null
        proveedor_name = self._extract_value(row, 'proveedor')
        if proveedor_name:
            proveedor_name = proveedor_name.upper()
        proveedor = None
        
        if proveedor_name:
            proveedor = Provider.objects.filter(
                nombre__icontains=proveedor_name
            ).first()
            # No generar error si no se encuentra, simplemente dejar null
        
        # Extraer operativo (columna o inferir del filename) - Convertir a mayúsculas
        operativo = self._extract_value(row, 'operativo')
        if not operativo:
            operativo = self._infer_operativo_from_filename()
        if operativo:
            operativo = operativo.upper()
        
        # Extraer campos adicionales
        house_bls = self._extract_list_value(row, 'house_bl')
        if house_bls:
            house_bls = [hbl.upper() if hbl else hbl for hbl in house_bls]
        contenedores = self._extract_contenedores(row)
        
        # Fechas
        fecha_eta = self._extract_date(row, 'fecha_eta')
        fecha_llegada = self._extract_date(row, 'fecha_llegada')
        etd = self._extract_date(row, 'etd')
        fecha_solicitud_facturacion = self._extract_date(row, 'fecha_solicitud_facturacion')
        fecha_recepcion_factura = self._extract_date(row, 'fecha_recepcion_factura')
        envio_cierre_ot = self._extract_date(row, 'envio_cierre')
        
        # Fecha de provisión
        fecha_provision = self._extract_date(row, 'provision')
        
        # Si no hay ETA pero hay fecha_llegada, usar fecha_llegada como ETA
        if not fecha_eta and fecha_llegada:
            fecha_eta = fecha_llegada
        
        # Puertos y embarque - Convertir a mayúsculas
        puerto_origen = (self._extract_value(row, 'puerto_origen') or '-').upper()
        puerto_destino = (self._extract_value(row, 'puerto_destino') or '-').upper()
        tipo_embarque = (self._extract_value(row, 'tipo_embarque') or '-').upper()
        barco = (self._extract_value(row, 'barco') or '-').upper()
        
        # Express Release y Contra Entrega - AHORA SON FECHAS
        express_release_fecha = self._extract_date(row, 'express_release')
        contra_entrega_fecha = self._extract_date(row, 'contra_entrega')
        
        # Los campos tipo quedan vacíos ya que las columnas del Excel son fechas
        express_release_tipo = '-'
        contra_entrega_tipo = '-'
        
        # Estatus - Normalización flexible con todos los estados
        estatus_original = self._extract_value(row, 'estatus')
        estatus = 'transito'  # Default cuando no se reconoce
        estatus_reconocido = True
        
        if estatus_original:
            estatus_lower = estatus_original.lower().strip()
            
            # Mapeo exacto y variaciones
            if 'almacenadora' in estatus_lower or 'almacen' in estatus_lower:
                estatus = 'almacenadora'
            elif 'bodega' in estatus_lower:
                estatus = 'bodega'
            elif 'cerrada' in estatus_lower or 'cerrado' in estatus_lower or 'close' in estatus_lower:
                estatus = 'cerrada'
            elif 'desprendimiento' in estatus_lower:
                estatus = 'desprendimiento'
            elif 'disputa' in estatus_lower or 'disputed' in estatus_lower:
                estatus = 'disputa'
            elif 'rada' in estatus_lower:
                estatus = 'en_rada'
            elif 'fact adicional' in estatus_lower or 'facturacion adicional' in estatus_lower:
                estatus = 'fact_adicionales'
            elif 'finalizada' in estatus_lower or 'finalizado' in estatus_lower or 'finished' in estatus_lower:
                estatus = 'finalizada'
            elif 'puerto' in estatus_lower and 'ada' not in estatus_lower:  # puerto pero no "en rada"
                estatus = 'puerto'
            elif 'transito' in estatus_lower or 'tránsit' in estatus_lower or 'transit' in estatus_lower:
                estatus = 'transito'
            # Estados legacy
            elif 'pendiente' in estatus_lower or 'pending' in estatus_lower:
                estatus = 'pendiente'
            elif 'entregad' in estatus_lower or 'deliver' in estatus_lower:
                estatus = 'entregado'
            elif 'facturad' in estatus_lower or 'invoice' in estatus_lower or 'billed' in estatus_lower:
                estatus = 'facturado'
            elif 'cancel' in estatus_lower:
                estatus = 'cancelado'
            else:
                # Valor no reconocido, usar transito como default
                estatus = 'transito'
                estatus_reconocido = False
        else:
            # Sin valor, usar transito por defecto
            estatus = 'transito'
        
        # Registrar advertencia si el estatus no fue reconocido
        if estatus_original and not estatus_reconocido:
            self.stats['warnings'] = self.stats.get('warnings', [])
            self.stats['warnings'].append({
                'row': row_number,
                'ot': numero_ot,
                'message': f"OT {numero_ot}: Estatus '{estatus_original}' no reconocido, usando 'TRANSITO' por defecto"
            })
        
        # Preparar datos para OT
        ot_data = {
            'numero_ot': numero_ot,
            'cliente': cliente,
            'proveedor': proveedor,  # Puede ser None
            'operativo': operativo,
            'master_bl': (master_bl or '').upper(),  # Vacío si no hay, en mayúsculas
            'house_bls': house_bls,
            'contenedores': contenedores,
            'fecha_eta': fecha_eta,
            'fecha_llegada': fecha_llegada,
            'etd': etd,
            'puerto_origen': puerto_origen,
            'puerto_destino': puerto_destino,
            'tipo_embarque': tipo_embarque,
            'barco': barco,
            'express_release_tipo': express_release_tipo,
            'express_release_fecha': express_release_fecha,
            'contra_entrega_tipo': contra_entrega_tipo,
            'contra_entrega_fecha': contra_entrega_fecha,
            'fecha_solicitud_facturacion': fecha_solicitud_facturacion,
            'fecha_recepcion_factura': fecha_recepcion_factura,
            'envio_cierre_ot': envio_cierre_ot,
            'estado': estatus,
        }
        
        # Provisión con jerarquía
        if fecha_provision:
            ot_data['fecha_provision'] = fecha_provision
            ot_data['provision_source'] = 'excel'
            ot_data['provision_locked'] = False  # Excel no bloquea
            ot_data['provision_updated_by'] = 'Excel Import'
        
        # Upsert: intentar actualizar o crear
        from ots.models import OT
        
        existing_ot = OT.objects.filter(numero_ot=numero_ot).first()
        
        if existing_ot:
            # Actualizar campos, respetando jerarquía de provisiones
            for key, value in ot_data.items():
                # Saltar campos de provisión si hay conflicto
                if key in ['fecha_provision', 'provision_source', 'provision_locked', 'provision_updated_by']:
                    # Verificar si se puede actualizar según jerarquía
                    can_update, reason = existing_ot.can_update_provision('excel')
                    if not can_update:
                        self.stats['conflicts'].append({
                            'row': row_number,
                            'ot': numero_ot,
                            'field': 'provision',
                            'reason': reason
                        })
                        continue  # Saltar actualización de este campo
                
                # No sobrescribir comentarios (solo edición manual)
                if key == 'comentarios':
                    continue
                
                # Solo actualizar campos no vacíos y no null
                if value is not None and (not isinstance(value, str) or value.strip()):
                    setattr(existing_ot, key, value)
            
            existing_ot.save()
            self.stats['updated'] += 1
        else:
            OT.objects.create(**ot_data)
            self.stats['created'] += 1
    
    def _infer_operativo_from_filename(self) -> str:
        """
        Inferir nombre del operativo desde el nombre del archivo.
        
        Busca patrones comunes como nombres propios en el filename.
        
        Returns:
            Nombre del operativo o '-' si no se puede inferir
        """
        if not self.filename:
            return '-'
        
        # Limpiar filename
        filename_upper = self.filename.upper()
        
        # Lista de nombres comunes de operativos a buscar
        operativos_comunes = [
            'JENNIFER', 'MARIA', 'JUAN', 'CARLOS', 'ANA', 'LUIS',
            'PEDRO', 'JOSE', 'FERNANDO', 'RICARDO', 'DANIEL'
        ]
        
        for operativo in operativos_comunes:
            if operativo in filename_upper:
                return operativo.title()
        
        # Si no se encuentra un nombre conocido, intentar extraer cualquier palabra capitalizada
        # que no sea "REPORTE", "IMPORT", "EXPORT", etc.
        palabras_excluir = ['REPORTE', 'REPORT', 'IMPORT', 'EXPORT', 'EXCEL', 'XLS', 'XLSX', '2025', '2024']
        
        palabras = re.findall(r'[A-Z]{2,}', filename_upper)
        for palabra in palabras:
            if palabra not in palabras_excluir and len(palabra) > 2:
                return palabra.title()
        
        return '-'
    
    def _detect_operation_type(self, filename: str, df: pd.DataFrame) -> str:
        """
        Detectar automáticamente el tipo de operación (importación o exportación).
        
        Criterios de detección:
        1. Si el nombre del archivo contiene "export", es exportación
        2. Si hay columnas características de exportación (SHIPPER EN ORIGEN), es exportación
        3. Por defecto, es importación
        
        Args:
            filename: Nombre del archivo
            df: DataFrame con los datos (con headers originales)
            
        Returns:
            'exportacion' o 'importacion'
        """
        # 1. Verificar nombre del archivo
        if 'export' in filename.lower():
            return 'exportacion'
        
        # 2. Verificar columnas características de exportación
        export_indicators = [
            'shipper en origen',
            'naviera / forwarder / aerolinea (origen)',
            'puerto de salida (origen)',
            'fecha de zarpe'
        ]
        
        # Obtener nombres de columnas en minúsculas para comparación
        column_names = [str(col).lower().strip() for col in df.columns if pd.notna(col)]
        
        # Si encuentra alguna columna característica de exportación
        for indicator in export_indicators:
            for col_name in column_names:
                if indicator in col_name:
                    return 'exportacion'
        
        # 3. Por defecto, es importación
        return 'importacion'
    
    def _extract_numero_ot(self, row: pd.Series) -> Optional[str]:
        """Extraer y normalizar número de OT"""
        value = self._extract_value(row, 'numero_ot')
        if not value:
            return None
        
        # Normalizar: mayúsculas, quitar espacios extra
        value = str(value).upper().strip()
        
        # Validar formato básico (al menos 3 caracteres)
        if len(value) < 3:
            return None
        
        return value
    
    def _is_empty_row(self, row: pd.Series) -> bool:
        """
        Verificar si una fila está completamente vacía basándose en el campo OT.
        
        Una fila se considera vacía si no tiene número de OT, ya que este es el campo
        más importante y obligatorio. Esto evita procesar filas que solo tienen fórmulas
        arrastradas pero sin datos reales.
        
        Args:
            row: Serie de pandas con datos de la fila
            
        Returns:
            True si la fila está vacía (sin OT), False si tiene OT
        """
        # Extraer el número de OT
        numero_ot = self._extract_numero_ot(row)
        
        # Si no hay número de OT, consideramos la fila vacía
        # (puede tener fórmulas arrastradas pero sin contenido real)
        if not numero_ot:
            return True
        
        # Si hay número de OT pero es solo espacios o caracteres especiales sin sentido
        if numero_ot.strip() == '' or len(numero_ot.strip()) < 2:
            return True
            
        return False
    
    def _is_valid_ot_year(self, numero_ot: str) -> bool:
        """Validar que el número de OT corresponda a un año válido"""
        # Buscar año de 2 dígitos en el número (ej: "25OT-001" o "OT-2024-001")
        year_match = re.search(r'(\d{2,4})', numero_ot)
        
        if not year_match:
            return True  # Si no hay año, aceptar
        
        year_str = year_match.group(1)
        
        # Convertir a año completo si es de 2 dígitos
        if len(year_str) == 2:
            year = 2000 + int(year_str)
        else:
            year = int(year_str)
        
        # Validar que sea >= MIN_YEAR
        return year >= self.MIN_YEAR
    
    def _extract_value(self, row: pd.Series, field: str) -> Optional[str]:
        """Extraer valor de texto de una columna"""
        if field not in row.index:
            return None
        
        value = row[field]
        
        # Si es un Series (columnas duplicadas), tomar el primero
        if isinstance(value, pd.Series):
            value = value.iloc[0] if not value.empty else None
        
        if pd.isna(value):
            return None
        
        # Convertir a string y limpiar
        str_value = str(value).strip() if value else None
        
        # Si el valor es 'nan' o está vacío, retornar None
        if not str_value or str_value.lower() == 'nan':
            return None
            
        return str_value
    
    def _extract_list_value(self, row: pd.Series, field: str) -> List[str]:
        """Extraer lista de valores (separados por comas, saltos de línea, etc.)"""
        value = self._extract_value(row, field)
        
        if not value:
            return []
        
        # Separar por comas, saltos de línea, puntos y comas
        items = re.split(r'[,;\n]+', value)
        
        # Limpiar y filtrar vacíos
        return [item.strip().upper() for item in items if item.strip()]
    
    def _extract_contenedores(self, row: pd.Series) -> List[str]:
        """Extraer y normalizar números de contenedor."""
        value = self._extract_value(row, 'contenedor')
        
        if not value:
            return []
        
        # Separar múltiples contenedores
        container_numbers = re.split(r'[,;\n]+', value)
        
        contenedores = []
        for container_str in container_numbers:
            container_str = container_str.strip().upper()
            container_str = re.sub(r"[^A-Z0-9]", "", container_str)
            
            if not container_str:
                continue
            
            if CONTAINER_NUMBER_PATTERN.match(container_str) and container_str not in contenedores:
                contenedores.append(container_str)
        
        return contenedores
    
    def _extract_date(self, row: pd.Series, field: str) -> Optional[datetime]:
        """Extraer y parsear fecha"""
        if field not in row.index:
            return None
        
        value = row[field]
        
        # Verificar si es NaN/None
        if pd.isna(value) or value is None:
            return None
        
        # Si ya es datetime (pandas.Timestamp o datetime.datetime)
        if isinstance(value, (pd.Timestamp, datetime)):
            # Convertir a date si es datetime
            if isinstance(value, datetime):
                return value.date()
            return value.date()
        
        # Intentar parsear como string
        try:
            if isinstance(value, str):
                # Limpiar el valor
                value_clean = value.strip().upper()
                
                # Ignorar valores no-fecha comunes
                non_date_values = ['N/A', 'NA', '-', '', 'NONE', 'NULL', 'OK', 'PDT', 'PENDIENTE', 
                                   'NO LIBERAR', 'CONTRA ENTREGA', 'EXPRESS RELEASE']
                if value_clean in non_date_values:
                    return None
                
                # Si contiene texto adicional (ej: "19/09/2025 RECIBIDO"), extraer solo la fecha
                # Buscar patrón de fecha dd/mm/yyyy o dd-mm-yyyy
                date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})'
                match = re.search(date_pattern, value)
                if match:
                    date_str = match.group(1)
                    # Normalizar separadores
                    date_str = date_str.replace('-', '/')
                else:
                    date_str = value
                
                # Probar varios formatos
                for fmt in ['%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
        except Exception as e:
            # Log para debug pero no fallar
            print(f"Warning: No se pudo parsear fecha '{value}': {e}")
        
        return None
    
    def _extract_decimal(self, row: pd.Series, field: str) -> Optional[Decimal]:
        """Extraer valor decimal (para montos)"""
        if field not in row.index:
            return None
        
        value = row[field]
        
        if pd.isna(value):
            return None
        
        try:
            # Limpiar string si es necesario (quitar símbolos de moneda, comas)
            if isinstance(value, str):
                value = re.sub(r'[^\d.-]', '', value)
            
            return Decimal(str(value))
        except:
            return None
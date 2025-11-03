"""
Servicio de extracción de datos de PDFs de facturas de venta usando patrones regex.
Este servicio utiliza los patrones configurables en InvoicePatternCatalog.

Similar a invoices/parsers/pdf_extractor.py pero para facturas de VENTA.
"""
import re
import io
import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime
from typing import Optional, Dict, Any

import pdfplumber

from catalogs.models import InvoicePatternCatalog

logger = logging.getLogger(__name__)


class SalesInvoicePDFExtractor:
    """
    Extractor de datos de facturas de venta desde PDFs usando regex patterns.
    Utiliza InvoicePatternCatalog para patrones configurables.
    """

    def __init__(self):
        self.patterns = None
        self.text = ""
        self.errors = []

    def extract_invoice_data(self, file_content: bytes, tipo_factura: str = 'nacional') -> Dict[str, Any]:
        """
        Extrae datos de una factura de venta desde un PDF.
        
        Args:
            file_content: Contenido del archivo PDF en bytes
            tipo_factura: 'nacional' o 'internacional'
            
        Returns:
            Diccionario con los datos extraídos
        """
        try:
            # Extraer texto del PDF
            self.text = self._extract_text_from_pdf(file_content)
            
            if not self.text:
                logger.warning("No se pudo extraer texto del PDF")
                return self._empty_result()
            
            # Obtener patrones activos agrupados por campo
            patterns_by_field = self._get_active_patterns(tipo_factura)
            
            if not patterns_by_field:
                logger.warning(f"No hay patrones activos para tipo: {tipo_factura}")
                return self._empty_result()
            
            # Extraer cada campo usando sus patrones
            result = self._extract_all_fields(patterns_by_field)
            
            # Detectar tipo de documento usado (para saber qué patrón funcionó)
            result['patron_utilizado'] = self._detect_document_type()
            result['confidence'] = self._calculate_confidence(result)
            
            logger.info(f"Extracción completada. Campos extraídos: {sum(1 for v in result.values() if v not in [None, '', 0, Decimal('0.00')])}")
            return result
            
        except Exception as e:
            logger.error(f"Error en extracción de PDF: {str(e)}", exc_info=True)
            return self._empty_result()

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extrae todo el texto de un PDF desde bytes."""
        try:
            text_parts = []
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(f"Error extrayendo texto de PDF: {str(e)}")
            return ""

    def _get_active_patterns(self, tipo_factura: str):
        """Obtiene patrones activos agrupados por campo objetivo."""
        # Obtener todos los patrones de VENTA activos para este tipo de factura
        patterns_queryset = InvoicePatternCatalog.objects.filter(
            activo=True,
            tipo_patron='venta',
            tipo_factura=tipo_factura
        )
        
        # Agrupar por campo objetivo
        patterns_by_field = {}
        for pattern in patterns_queryset:
            field_name = pattern.campo_objetivo
            if field_name not in patterns_by_field:
                patterns_by_field[field_name] = []
            patterns_by_field[field_name].append(pattern)
        
        return patterns_by_field

    def _extract_all_fields(self, patterns_by_field: Dict) -> Dict[str, Any]:
        """Extrae todos los campos usando patrones agrupados."""
        result = {
            'numero_factura': None,
            'numero_ot': None,
            'fecha_emision': None,
            'fecha_vencimiento': None,
            'nit_emisor': None,
            'nombre_cliente': None,
            'nit_cliente': None,
            'subtotal_gravado': None,
            'subtotal_exento': None,
            'otros_montos': None,
            'iva_total': None,
            'monto_total': None,
            'monto_retencion_iva': None,
            'monto_retencion_renta': None,
            'porcentaje_iva': Decimal('13.00'),
            'aplica_retencion_iva': False,
            'aplica_retencion_renta': False,
        }
        
        # Mapeo de nombres de campo del modelo a nombres en el resultado
        field_mapping = {
            'retencion_iva': 'monto_retencion_iva',
            'retencion_renta': 'monto_retencion_renta',
        }
        
        # Extraer cada campo usando sus patrones
        for field_name, patterns in patterns_by_field.items():
            # Mapear nombre del campo si es necesario
            result_field_name = field_mapping.get(field_name, field_name)
            
            # Intentar cada patrón hasta encontrar un match
            for pattern in patterns:
                try:
                    if field_name in ['subtotal_gravado', 'subtotal_exento', 'iva_total', 
                                     'monto_total', 'retencion_iva', 'retencion_renta']:
                        value = self._extract_decimal(pattern.patron_regex)
                    elif field_name in ['fecha_emision', 'fecha_vencimiento']:
                        value = self._extract_date(pattern.patron_regex)
                    else:
                        value = self._extract_field(pattern.patron_regex)
                    
                    if value is not None:  # Permitir 0.00, 0, '', pero no None
                        result[result_field_name] = value
                        logger.debug(f"Campo '{field_name}' extraído: {value}")
                        break  # Ya encontramos el valor, no probar más patrones
                        
                except Exception as e:
                    logger.debug(f"Error extrayendo campo '{field_name}' con patrón {pattern.nombre}: {str(e)}")
                    continue
        
        # Post-procesamiento: Detectar retenciones
        if result['monto_retencion_iva'] and result['monto_retencion_iva'] > 0:
            result['aplica_retencion_iva'] = True
        
        if result['monto_retencion_renta'] and result['monto_retencion_renta'] > 0:
            result['aplica_retencion_renta'] = True
        
        # Si no se extrajo subtotal exento, asumir 0
        if result['subtotal_exento'] is None:
            result['subtotal_exento'] = Decimal('0.00')
        
        # IMPORTANTE: Para Gran Contribuyente, el monto_total YA incluye la retención descontada
        # NO debemos restar nada más. El PDF muestra:
        # - Monto Total Operación: $7,689.39 (antes de retención)
        # - Total a Pagar: $7,685.49 (después de retención 1%)
        # Debemos usar "Total a Pagar" que es el que tiene la retención YA aplicada
        
        return result
    
    def _detect_document_type(self) -> str:
        """Detecta el tipo de documento basándose en palabras clave en el texto."""
        text_lower = self.text.lower()
        
        if 'dte' in text_lower or 'documento tributario' in text_lower:
            return 'DTE - El Salvador'
        elif 'invoice' in text_lower:
            return 'Invoice Internacional'
        elif 'ccf' in text_lower or 'comprobante de crédito fiscal' in text_lower:
            return 'CCF - El Salvador'
        else:
            return 'Desconocido'

    def _extract_field(self, pattern: str) -> Optional[str]:
        """Extrae un campo de texto usando regex."""
        if not pattern or not pattern.strip():
            return None
        
        try:
            match = re.search(pattern, self.text, re.IGNORECASE | re.MULTILINE)
            if match:
                # Si hay grupo de captura, usarlo
                if match.groups():
                    return match.group(1).strip()
                return match.group(0).strip()
        except Exception as e:
            logger.debug(f"Error en regex '{pattern}': {str(e)}")
        
        return None

    def _extract_decimal(self, pattern: str) -> Optional[Decimal]:
        """Extrae un valor decimal usando regex."""
        value = self._extract_field(pattern)
        if not value:
            return None
        
        try:
            # Limpiar formato: Mantener dígitos, punto decimal y comas
            # Ejemplos: $1,234.56 → 1234.56 | 1.234,56 → 1234.56 | 7,248.69 → 7248.69
            clean_value = value.replace('$', '').replace(' ', '').strip()
            
            # Detectar formato: si hay coma después del último punto, es formato europeo
            if ',' in clean_value and '.' in clean_value:
                # Formato mixto: determinar cuál es el separador decimal
                last_comma = clean_value.rfind(',')
                last_dot = clean_value.rfind('.')
                
                if last_comma > last_dot:
                    # Formato europeo: 1.234,56 → coma es decimal
                    clean_value = clean_value.replace('.', '').replace(',', '.')
                else:
                    # Formato US: 1,234.56 → punto es decimal
                    clean_value = clean_value.replace(',', '')
            elif ',' in clean_value:
                # Solo comas: podría ser separador de miles (1,234) o decimal europeo (1,56)
                # Si hay más de una coma O la coma está en posición de miles, es separador
                comma_count = clean_value.count(',')
                last_comma_pos = clean_value.rfind(',')
                
                if comma_count > 1 or (len(clean_value) - last_comma_pos - 1) > 2:
                    # Es separador de miles
                    clean_value = clean_value.replace(',', '')
                else:
                    # Es separador decimal europeo
                    clean_value = clean_value.replace(',', '.')
            
            return Decimal(clean_value)
        except (InvalidOperation, ValueError) as e:
            logger.debug(f"No se pudo convertir '{value}' a decimal: {str(e)}")
            return None

    def _extract_date(self, pattern: str) -> Optional[str]:
        """Extrae una fecha usando regex y la normaliza a formato ISO."""
        value = self._extract_field(pattern)
        if not value:
            return None
        
        # Intentar parsear fecha en varios formatos comunes
        date_formats = [
            '%d/%m/%Y',
            '%d-%m-%Y',
            '%Y-%m-%d',
            '%d/%m/%y',
            '%d-%m-%y',
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(value, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        logger.debug(f"No se pudo parsear fecha: {value}")
        return None

    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """
        Calcula un score de confianza (0.0 a 1.0) basado en campos extraídos.
        """
        fields_found = 0
        critical_fields = ['numero_factura', 'fecha_emision', 'monto_total']
        
        for field in critical_fields:
            if result.get(field):
                fields_found += 1
        
        # Campos adicionales
        optional_fields = ['nombre_cliente', 'subtotal_gravado', 'iva_total']
        for field in optional_fields:
            if result.get(field):
                fields_found += 0.5
        
        max_score = len(critical_fields) + (len(optional_fields) * 0.5)
        return min(fields_found / max_score, 1.0)

    def _empty_result(self) -> Dict[str, Any]:
        """Retorna un resultado vacío."""
        return {
            'numero_factura': None,
            'fecha_emision': None,
            'fecha_vencimiento': None,
            'nit_emisor': None,
            'nombre_cliente': None,
            'nit_cliente': None,
            'subtotal_gravado': None,
            'subtotal_exento': Decimal('0.00'),
            'iva_total': None,
            'monto_total': None,
            'monto_retencion_iva': None,
            'monto_retencion_renta': None,
            'porcentaje_iva': Decimal('13.00'),
            'aplica_retencion_iva': False,
            'aplica_retencion_renta': False,
            'patron_utilizado': None,
            'confidence': 0.0,
        }

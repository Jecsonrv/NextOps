"""
Extractor de información de facturas en formato PDF.

Utiliza pdfplumber para extraer texto de PDFs y expresiones regulares
para identificar campos clave como número de factura, fecha, monto, etc.
"""

import re
import unicodedata
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional, List
import io


class PDFExtractor:
    """
    Extractor de información de facturas en PDF.
    
    Utiliza patrones de expresiones regulares para identificar campos
    clave en el texto extraído del PDF.
    """
    
    def __init__(self):
        self.text = ""
        self.normalized_text = ""
        self.errors = []
        self.patterns = self._init_patterns()
    
    def extract(self, file_content: bytes) -> Dict[str, Any]:
        """
        Extrae información de un archivo PDF.
        
        Args:
            file_content: Contenido del archivo PDF en bytes
            
        Returns:
            Diccionario con la información extraída:
            {
                'numero_factura': str,
                'fecha_emision': datetime,
                'fecha_vencimiento': datetime (opcional),
                'monto': Decimal,
                'proveedor_nit': str,
                'proveedor_nombre': str,
                'referencias': list,  # Referencias encontradas (MBL, contenedor, OT)
                'confidence': float,  # Confianza en la extracción (0.0-1.0)
            }
        """
        try:
            # Intentar extraer texto con pdfplumber
            self.text = self._extract_text_pdfplumber(file_content)
            self.normalized_text = self._normalize_text(self.text)
            
            # Si no se pudo extraer texto, podría ser un PDF escaneado
            if not self.text or len(self.text.strip()) < 50:
                self.errors.append("PDF sin texto o muy corto, podría ser escaneado")
                # TODO: Aquí se podría implementar OCR con pytesseract
                return self._empty_result()
            
            # Extraer información usando patrones
            result = {
                'numero_factura': self._extract_numero_factura(),
                'fecha_emision': self._extract_fecha_emision(),
                'fecha_vencimiento': self._extract_fecha_vencimiento(),
                'monto': self._extract_monto(),
                'proveedor_nit': self._extract_proveedor_nit(),
                'proveedor_nombre': self._extract_proveedor_nombre(),
                'referencias': self._extract_referencias(),
                'confidence': 0.0,  # Se calculará después
            }
            
            # Calcular confianza
            result['confidence'] = self._calculate_confidence(result)
            
            return result
            
        except Exception as e:
            self.errors.append(f"Error inesperado: {str(e)}")
            return self._empty_result()
    
    def _extract_text_pdfplumber(self, file_content: bytes) -> str:
        """
        Extrae texto del PDF usando pdfplumber.
        
        Args:
            file_content: Contenido del PDF en bytes
            
        Returns:
            Texto extraído
        """
        try:
            import pdfplumber
            
            text_parts = []
            
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            
            return "\n".join(text_parts)
            
        except ImportError:
            self.errors.append("pdfplumber no está instalado")
            return ""
        except Exception as e:
            self.errors.append(f"Error extrayendo texto con pdfplumber: {str(e)}")
            return ""
    
    def _init_patterns(self) -> Dict[str, List[re.Pattern]]:
        """
        Inicializa patrones de expresiones regulares para extracción.
        
        Returns:
            Diccionario con patrones compilados por tipo de campo
        """
        return {
            'numero_factura': [
                # Formatos comunes de número de factura
                re.compile(r'(?:FACTURA|INVOICE|FACT\.?)\s*(?:N[OÚ]\.??|#|NO\.?)\s*[:\s]*([A-Z0-9\-]+)', re.IGNORECASE),
                re.compile(r'(?:N[OÚ]MERO|NUMBER|NO\.?)\s*(?:DE\s*)?(?:FACTURA|INVOICE)[:\s]*([A-Z0-9\-]+)', re.IGNORECASE),
                re.compile(r'DOCUMENT\s*(?:NUMBER|NO\.?)[:\s]*([A-Z0-9\-]+)', re.IGNORECASE),
                # Fallback DTE (El Salvador) - Número de control
                re.compile(r'(?:N[úu]mero\s+de\s+Control\s*:?)\s*(DTE-\d{2}-[A-Z0-9]+-[\d\s]{8,})', re.IGNORECASE),
                # DTE genérico aun sin etiqueta previa
                re.compile(r'(DTE-\d{2}-[A-Z0-9]+-[\d\s]{8,})', re.IGNORECASE),
            ],
            'fecha': [
                # Fechas en formato dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
                re.compile(r'(?:FECHA|DATE|EMISI[ÓO]N)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', re.IGNORECASE),
                re.compile(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'),
                re.compile(r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})'),
                # Fallback DTE (El Salvador) - Fecha de emisión/documento
                re.compile(r'(?:Fecha\sde\sEmisi[oó]n|Fecha\sde\sDocumento|Fecha\sy\shora\sde\semision):?\s*.*?(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})', re.IGNORECASE | re.DOTALL),
            ],
            'monto': [
                # Montos con símbolos de moneda, separadores de miles y decimales
                re.compile(r'(?:TOTAL|AMOUNT|MONTO)[:\s]*(?:USD?|US\$|\$)?\s*([\d,]+\.?\d{0,2})', re.IGNORECASE),
                re.compile(r'(?:USD?|US\$|\$)\s*([\d,]+\.?\d{0,2})', re.IGNORECASE),
                re.compile(r'TOTAL[:\s]*([\d,]+\.?\d{0,2})', re.IGNORECASE),
                # Fallback DTE (El Salvador) - Monto total
                re.compile(r'(?:Monto\s+Total\s+de\s+la\s+Operaci[oó]n|TOTAL\s+A\s+PAGAR|Total\s+operaciones):?\s*(?:USD|\$)?\s*([\d,]+\.\d{2})', re.IGNORECASE),
            ],
            'nit': [
                # Formatos de NIT (El Salvador y otros países)
                re.compile(r'NIT[:\s]*(\d{4}-?\d{6}-?\d{3}-?\d{1})', re.IGNORECASE),
                re.compile(r'NIT[:\s]*(\d{14})', re.IGNORECASE),
                re.compile(r'TAX\s*ID[:\s]*([\d\-]+)', re.IGNORECASE),
            ],
            'mbl': [
                # Master Bill of Lading
                re.compile(r'MBL[:\s#]*([A-Z]{4}\d{7,11})', re.IGNORECASE),
                re.compile(r'M\.?\s*B\.?\s*L\.?[:\s#]*([A-Z]{4}\d{7,11})', re.IGNORECASE),
                re.compile(r'MASTER\s*B/?L[:\s#]*([A-Z]{4}\d{7,11})', re.IGNORECASE),
                # Fallback DTE (El Salvador) - Referencia BLs
                re.compile(r'(?:BL|MBL|HBL)\s+([A-Z0-9]+)', re.IGNORECASE),
            ],
            'contenedor': [
                # Número de contenedor (formato estándar ISO 6346)
                re.compile(r'\b([A-Z]{4}\d{7})\b'),
                re.compile(r'CONT(?:AINER|ENEDOR)?[:\s#]*([A-Z]{4}\d{7})', re.IGNORECASE),
            ],
            'ot': [
                # Número de OT
                re.compile(r'OT[:\s#]*(\d+)', re.IGNORECASE),
                re.compile(r'O\.?\s*T\.?[:\s#]*(\d+)', re.IGNORECASE),
                re.compile(r'(?:ORDEN|ORDER)\s*(?:DE\s*)?(?:TRABAJO|TRANSPORT)[:\s#]*(\d+)', re.IGNORECASE),
            ],
        }
    
    def _normalize_text(self, value: str) -> str:
        """Remueve acentos y normaliza espacios para facilitar los patrones genéricos."""
        if not value:
            return ""
        normalized = unicodedata.normalize('NFKD', value)
        stripped = ''.join(ch for ch in normalized if not unicodedata.combining(ch))
        return stripped
    
    def _extract_numero_factura(self) -> str:
        """Extrae el número de factura"""
        try:
            for pattern in self.patterns['numero_factura']:
                match = pattern.search(self.text) or pattern.search(self.normalized_text)
                if match:
                    value = match.group(1).strip()
                    # Algunos DTE incluyen espacios internos por saltos de línea
                    if value.upper().startswith('DTE-'):
                        value = re.sub(r'\s+', '', value)
                    return value

            return ""
            
        except Exception as e:
            self.errors.append(f"Error extrayendo número de factura: {str(e)}")
            return ""
    
    def _extract_fecha_emision(self) -> Optional[datetime]:
        """Extrae la fecha de emisión"""
        try:
            for pattern in self.patterns['fecha']:
                match = pattern.search(self.text) or pattern.search(self.normalized_text)
                if match:
                    date_str = match.group(1)
                    parsed_date = self._parse_date(date_str)
                    if parsed_date:
                        return parsed_date
            
            return None
            
        except Exception as e:
            self.errors.append(f"Error extrayendo fecha: {str(e)}")
            return None
    
    def _extract_fecha_vencimiento(self) -> Optional[datetime]:
        """Extrae la fecha de vencimiento"""
        try:
            # Buscar específicamente "fecha de vencimiento" o "due date"
            pattern = re.compile(
                r'(?:VENCIMIENTO|DUE\s*DATE)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                re.IGNORECASE
            )
            match = pattern.search(self.text)
            if match:
                date_str = match.group(1)
                return self._parse_date(date_str)
            
            return None
            
        except Exception:
            return None
    
    def _extract_monto(self) -> Decimal:
        """Extrae el monto total"""
        try:
            for pattern in self.patterns['monto']:
                match = pattern.search(self.text) or pattern.search(self.normalized_text)
                if match:
                    amount_str = match.group(1).replace(',', '')
                    return Decimal(amount_str)
            
            return Decimal('0.00')
            
        except Exception as e:
            self.errors.append(f"Error extrayendo monto: {str(e)}")
            return Decimal('0.00')
    
    def _extract_proveedor_nit(self) -> str:
        """Extrae el NIT del proveedor"""
        try:
            for pattern in self.patterns['nit']:
                match = pattern.search(self.text) or pattern.search(self.normalized_text)
                if match:
                    return match.group(1).strip()
            
            return ""
            
        except Exception:
            return ""
    
    def _extract_proveedor_nombre(self) -> str:
        """
        Extrae el nombre del proveedor.
        
        Intenta identificar el nombre del emisor buscando patrones comunes
        en las primeras líneas del documento.
        """
        try:
            # Buscar en las primeras líneas (donde suele estar el emisor)
            lines = self.text.split('\n')[:10]
            
            # Buscar líneas que parezcan nombres de empresa
            for line in lines:
                line = line.strip()
                # Si la línea tiene entre 10 y 100 caracteres y no contiene números de documento
                if 10 < len(line) < 100 and not re.search(r'\d{4,}', line):
                    # Si contiene palabras típicas de empresas
                    if re.search(r'(?:S\.A\.|LTDA|INC|CORP|LLC|CIA|COMPANY)', line, re.IGNORECASE):
                        return line
            
            return ""
            
        except Exception:
            return ""
    
    def _extract_referencias(self) -> list:
        """
        Extrae referencias útiles para matching (MBL, contenedor, OT).
        
        Returns:
            Lista de diccionarios con tipo y valor de cada referencia encontrada
        """
        referencias = []
        
        try:
            # Buscar MBLs
            for pattern in self.patterns['mbl']:
                matches = list(pattern.finditer(self.text)) or list(pattern.finditer(self.normalized_text))
                for match in matches:
                    referencias.append({
                        'tipo': 'mbl',
                        'valor': match.group(1).upper()
                    })
            
            # Buscar contenedores
            for pattern in self.patterns['contenedor']:
                matches = list(pattern.finditer(self.text)) or list(pattern.finditer(self.normalized_text))
                for match in matches:
                    container = match.group(1).upper()
                    # Validar que sea un formato válido de contenedor
                    if self._is_valid_container(container):
                        referencias.append({
                            'tipo': 'contenedor',
                            'valor': container
                        })
            
            # Buscar OTs
            for pattern in self.patterns['ot']:
                matches = pattern.finditer(self.text)
                for match in matches:
                    referencias.append({
                        'tipo': 'ot',
                        'valor': match.group(1)
                    })
            
            return referencias
            
        except Exception:
            return []
    
    def _is_valid_container(self, container: str) -> bool:
        """
        Valida que un número de contenedor cumpla con el formato ISO 6346.
        
        Args:
            container: Número de contenedor a validar
            
        Returns:
            True si es válido, False si no
        """
        # Formato: 4 letras + 7 dígitos
        if len(container) != 11:
            return False
        
        if not container[:4].isalpha() or not container[4:].isdigit():
            return False
        
        return True
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Intenta parsear una fecha en diferentes formatos.
        
        Args:
            date_str: String con la fecha
            
        Returns:
            datetime object o None si no se puede parsear
        """
        formats = [
            '%d/%m/%Y',
            '%d-%m-%Y',
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%d/%m/%y',
            '%d-%m-%y',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """
        Calcula la confianza en la extracción basado en campos encontrados.
        
        Args:
            result: Diccionario con los campos extraídos
            
        Returns:
            Float entre 0.0 y 1.0
        """
        # Campos requeridos y su peso
        fields_weight = {
            'numero_factura': 0.3,
            'fecha_emision': 0.2,
            'monto': 0.3,
            'proveedor_nit': 0.1,
            'proveedor_nombre': 0.1,
        }
        
        confidence = 0.0
        
        for field, weight in fields_weight.items():
            value = result.get(field)
            if value:
                # Si el campo tiene un valor válido
                if isinstance(value, str) and value.strip():
                    confidence += weight
                elif isinstance(value, Decimal) and value > 0:
                    confidence += weight
                elif isinstance(value, datetime):
                    confidence += weight
        
        return min(confidence, 1.0)
    
    def _empty_result(self) -> Dict[str, Any]:
        """Retorna un resultado vacío cuando falla la extracción"""
        return {
            'numero_factura': '',
            'fecha_emision': None,
            'fecha_vencimiento': None,
            'monto': Decimal('0.00'),
            'proveedor_nit': '',
            'proveedor_nombre': '',
            'referencias': [],
            'confidence': 0.0,
        }

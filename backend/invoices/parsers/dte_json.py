"""
Parser para archivos DTE (Documento Tributario Electrónico) de El Salvador en formato JSON.
"""

import json
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional


class DTEJsonParser:
    """
    Parser para extraer información de archivos DTE en formato JSON.
    
    El DTE es el estándar de facturación electrónica de El Salvador.
    """
    
    def __init__(self):
        self.data = None
        self.errors = []
    
    def parse(self, file_content: bytes) -> Dict[str, Any]:
        """
        Parsea el contenido del archivo JSON DTE.
        
        Args:
            file_content: Contenido del archivo JSON en bytes
            
        Returns:
            Diccionario con la información extraída:
            {
                'numero_factura': str,
                'fecha_emision': datetime,
                'fecha_vencimiento': datetime (opcional),
                'monto': Decimal,
                'proveedor_nit': str,
                'proveedor_nombre': str,
                'referencias': list,  # Referencias encontradas (MBL, contenedor, etc.)
                'raw_data': dict,  # Datos originales
                'confidence': float,  # Confianza en la extracción (0.0-1.0)
            }
        """
        try:
            # Decodificar JSON
            json_str = file_content.decode('utf-8')
            self.data = json.loads(json_str)
            
            # Extraer información básica
            result = {
                'numero_factura': self._extract_numero_factura(),
                'fecha_emision': self._extract_fecha_emision(),
                'fecha_vencimiento': self._extract_fecha_vencimiento(),
                'monto': self._extract_monto(),
                'proveedor_nit': self._extract_proveedor_nit(),
                'proveedor_nombre': self._extract_proveedor_nombre(),
                'referencias': self._extract_referencias(),
                'raw_data': self.data,
                'confidence': self._calculate_confidence(),
            }
            
            return result
            
        except json.JSONDecodeError as e:
            self.errors.append(f"Error al decodificar JSON: {str(e)}")
            return self._empty_result()
        except Exception as e:
            self.errors.append(f"Error inesperado: {str(e)}")
            return self._empty_result()
    
    def _extract_numero_factura(self) -> str:
        """Extrae el número de factura del DTE"""
        try:
            # Intentar diferentes rutas en el JSON
            paths = [
                ['identificacion', 'numeroControl'],
                ['identificacion', 'codigoGeneracion'],
                ['documento', 'numero'],
                ['factura', 'numero'],
            ]
            
            for path in paths:
                value = self._get_nested_value(path)
                if value:
                    return str(value)
            
            self.errors.append("No se encontró número de factura")
            return ""
            
        except Exception as e:
            self.errors.append(f"Error extrayendo número de factura: {str(e)}")
            return ""
    
    def _extract_fecha_emision(self) -> Optional[datetime]:
        """Extrae la fecha de emisión"""
        try:
            paths = [
                ['identificacion', 'fecEmi'],
                ['identificacion', 'fechaEmision'],
                ['documento', 'fecha'],
                ['factura', 'fecha'],
            ]
            
            for path in paths:
                value = self._get_nested_value(path)
                if value:
                    # Intentar parsear diferentes formatos de fecha
                    return self._parse_date(value)
            
            self.errors.append("No se encontró fecha de emisión")
            return None
            
        except Exception as e:
            self.errors.append(f"Error extrayendo fecha de emisión: {str(e)}")
            return None
    
    def _extract_fecha_vencimiento(self) -> Optional[datetime]:
        """Extrae la fecha de vencimiento"""
        try:
            paths = [
                ['condicionOperacion', 'fechaVencimiento'],
                ['documento', 'fechaVencimiento'],
                ['factura', 'fechaVencimiento'],
            ]
            
            for path in paths:
                value = self._get_nested_value(path)
                if value:
                    return self._parse_date(value)
            
            return None
            
        except Exception:
            return None
    
    def _extract_monto(self) -> Decimal:
        """Extrae el monto total de la factura"""
        try:
            paths = [
                ['resumen', 'totalPagar'],
                ['resumen', 'montoTotal'],
                ['documento', 'total'],
                ['factura', 'total'],
            ]
            
            for path in paths:
                value = self._get_nested_value(path)
                if value is not None:
                    return Decimal(str(value))
            
            self.errors.append("No se encontró monto total")
            return Decimal('0.00')
            
        except Exception as e:
            self.errors.append(f"Error extrayendo monto: {str(e)}")
            return Decimal('0.00')
    
    def _extract_proveedor_nit(self) -> str:
        """Extrae el NIT del proveedor (emisor)"""
        try:
            paths = [
                ['emisor', 'nit'],
                ['emisor', 'identificacion'],
                ['proveedor', 'nit'],
            ]
            
            for path in paths:
                value = self._get_nested_value(path)
                if value:
                    return str(value)
            
            return ""
            
        except Exception:
            return ""
    
    def _extract_proveedor_nombre(self) -> str:
        """Extrae el nombre del proveedor (emisor)"""
        try:
            paths = [
                ['emisor', 'nombre'],
                ['emisor', 'nombreComercial'],
                ['proveedor', 'nombre'],
            ]
            
            for path in paths:
                value = self._get_nested_value(path)
                if value:
                    return str(value)
            
            return ""
            
        except Exception:
            return ""
    
    def _extract_referencias(self) -> list:
        """
        Extrae referencias útiles para matching (MBL, contenedor, OT).
        
        Busca en campos de descripción, observaciones, etc.
        Devuelve lista de diccionarios con formato: [{'tipo': 'mbl', 'valor': 'MAEU123'}, ...]
        """
        import re
        
        referencias_texto = []
        referencias_estructuradas = []
        
        try:
            # Campos donde buscar referencias
            search_fields = [
                ['extension', 'observaciones'],
                ['observaciones'],
                ['descripcion'],
                ['notas'],
                ['cuerpoDocumento'],
                ['detalle'],
            ]
            
            for path in search_fields:
                value = self._get_nested_value(path)
                if value:
                    # Si es una lista (como cuerpoDocumento con múltiples items)
                    if isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict):
                                # Buscar en descripción de cada item
                                desc = item.get('descripcion', '')
                                if desc:
                                    referencias_texto.append(desc)
                    # Si es un string directo
                    elif isinstance(value, str):
                        referencias_texto.append(value)
            
            # Extraer estructuras de las referencias
            for texto in referencias_texto:
                # Buscar números de OT (formato: OT-YYYY-NNN)
                ot_matches = re.findall(r'OT[-\s]?\d{4}[-\s]?\d+', texto, re.IGNORECASE)
                for match in ot_matches:
                    # Normalizar formato (eliminar espacios, usar guiones)
                    ot_norm = re.sub(r'[-\s]+', '-', match.upper())
                    referencias_estructuradas.append({'tipo': 'ot', 'valor': ot_norm})
                
                # Buscar MBL/BL (formato: XXXX1234567890)
                mbl_matches = re.findall(r'\b[A-Z]{4}\d{10,}\b', texto)
                for match in mbl_matches:
                    referencias_estructuradas.append({'tipo': 'mbl', 'valor': match.upper()})
                
                # Buscar números de contenedor (formato: XXXX1234567)
                cont_matches = re.findall(r'\b[A-Z]{4}\d{7}\b', texto)
                for match in cont_matches:
                    referencias_estructuradas.append({'tipo': 'contenedor', 'valor': match.upper()})
            
            return referencias_estructuradas
            
        except Exception:
            return []
    
    def _calculate_confidence(self) -> float:
        """
        Calcula la confianza en la extracción basado en campos encontrados.
        
        Returns:
            Float entre 0.0 y 1.0
        """
        required_fields = [
            'numero_factura',
            'fecha_emision',
            'monto',
            'proveedor_nit',
            'proveedor_nombre',
        ]
        
        found = 0
        for field in required_fields:
            value = self._extract_field_by_name(field)
            if value:
                found += 1
        
        return found / len(required_fields)
    
    def _extract_field_by_name(self, field_name: str) -> Any:
        """Extrae un campo según su nombre de método"""
        extractors = {
            'numero_factura': self._extract_numero_factura,
            'fecha_emision': self._extract_fecha_emision,
            'monto': self._extract_monto,
            'proveedor_nit': self._extract_proveedor_nit,
            'proveedor_nombre': self._extract_proveedor_nombre,
        }
        
        extractor = extractors.get(field_name)
        if extractor:
            return extractor()
        return None
    
    def _get_nested_value(self, path: list) -> Any:
        """
        Obtiene un valor anidado en el JSON usando una lista de claves.
        
        Args:
            path: Lista de claves para navegar el JSON
            
        Returns:
            El valor encontrado o None
        """
        current = self.data
        
        for key in path:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Intenta parsear una fecha en diferentes formatos comunes.
        
        Args:
            date_str: String con la fecha
            
        Returns:
            datetime object o None si no se puede parsear
        """
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%Y/%m/%d',
            '%d-%m-%Y',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d %H:%M:%S',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None
    
    def _empty_result(self) -> Dict[str, Any]:
        """Retorna un resultado vacío cuando falla el parsing"""
        return {
            'numero_factura': '',
            'fecha_emision': None,
            'fecha_vencimiento': None,
            'monto': Decimal('0.00'),
            'proveedor_nit': '',
            'proveedor_nombre': '',
            'referencias': [],
            'raw_data': {},
            'confidence': 0.0,
        }

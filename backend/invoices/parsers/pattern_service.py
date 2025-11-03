"""
Servicio para aplicar patrones de reconocimiento a textos de facturas.

Este servicio:
1. Carga patrones específicos del proveedor
2. Carga patrones genéricos del sistema
3. Los aplica en orden de prioridad
4. Extrae los campos y retorna los valores encontrados
"""

from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal
from datetime import datetime
import re
import logging

from patterns.models import ProviderPattern, TargetField
from catalogs.models import Provider, InvoicePatternCatalog

logger = logging.getLogger(__name__)


class PatternApplicationService:
    """
    Servicio para aplicar patrones de reconocimiento a texto extraído.
    """
    
    def __init__(self, provider_id: Optional[int] = None):
        """
        Inicializa el servicio.
        
        Args:
            provider_id: ID del proveedor (opcional). Si se proporciona, carga sus patrones.
        """
        self.provider_id = provider_id
        self.patterns = []
        self.results = {}
        self.load_patterns()
    
    def load_patterns(self):
        """
        Carga patrones desde InvoicePatternCatalog para el proveedor.
        Convierte los campos individuales de regex en objetos similares a ProviderPattern.
        """
        self.patterns = []
        
        # Buscar patrones del catálogo
        query = InvoicePatternCatalog.objects.filter(activo=True, tipo_patron='costo')
        
        # Si hay proveedor específico, buscar por proveedor
        if self.provider_id:
            try:
                provider = Provider.objects.get(id=self.provider_id)
                # Buscar patrón que coincida con el nombre del proveedor
                catalog_patterns = query.filter(proveedor=provider).order_by('prioridad')
                
                if not catalog_patterns.exists():
                    logger.warning(f"No se encontraron patrones para proveedor {provider.nombre} (ID: {self.provider_id})")
                else:
                    logger.info(f"Encontrados {catalog_patterns.count()} patrones para {provider.nombre}")
                
            except Provider.DoesNotExist:
                logger.error(f"Proveedor con ID {self.provider_id} no existe")
                catalog_patterns = []
        else:
            # Sin proveedor específico, cargar todos los activos
            catalog_patterns = query.order_by('prioridad')
        
        # Convertir cada patrón del catálogo a objetos tipo ProviderPattern
        for catalog_pattern in catalog_patterns:
            self._extract_patterns_from_catalog(catalog_pattern)
        
        logger.info(f"Total de patrones individuales cargados: {len(self.patterns)}")
    
    def _extract_patterns_from_catalog(self, catalog_pattern: InvoicePatternCatalog):
        """
        Extrae patrones individuales de un InvoicePatternCatalog y los convierte
        a objetos similares a ProviderPattern para mantener compatibilidad.
        
        Soporta DOS formatos:
        1. Nuevo: campo_objetivo + patron_regex (un patrón por registro)
        2. Legacy: patron_numero_factura, patron_fecha_emision, etc. (múltiples patrones en un registro)
        """
        
        # CASO 1: Formato nuevo - patrón individual con campo_objetivo
        if catalog_pattern.campo_objetivo and catalog_pattern.patron_regex:
            # Mapeo de campo_objetivo a nombre legible y tipo de dato
            field_info_mapping = {
                'numero_factura': ('invoice_number', 'Número de Factura', 'text'),
                'fecha_emision': ('issue_date', 'Fecha de Emisión', 'date'),
                'mbl': ('mbl', 'MBL', 'text'),
                'hbl': ('hbl', 'HBL', 'text'),
                'contenedor': ('container', 'Contenedor', 'text'),
                'total': ('total_amount', 'Total', 'decimal'),
                'subtotal': ('subtotal', 'Subtotal', 'decimal'),
                'iva': ('tax_amount', 'IVA', 'decimal'),
                'nit_emisor': ('issuer_nit', 'NIT Emisor', 'text'),
                'nombre_emisor': ('issuer_name', 'Nombre Emisor', 'text'),
            }
            
            # Obtener info del campo o usar el campo_objetivo como está
            field_code, field_name, data_type = field_info_mapping.get(
                catalog_pattern.campo_objetivo, 
                (catalog_pattern.campo_objetivo, catalog_pattern.campo_objetivo.replace('_', ' ').title(), 'text')
            )
            
            mock_pattern = type('MockPattern', (), {
                'id': catalog_pattern.id,
                'name': catalog_pattern.nombre,
                'pattern': catalog_pattern.patron_regex,
                'priority': catalog_pattern.prioridad,
                'case_sensitive': catalog_pattern.case_sensitive,
                'provider': type('MockProvider', (), {
                    'nombre': catalog_pattern.proveedor.nombre if catalog_pattern.proveedor else 'GENÉRICO',
                    'id': catalog_pattern.proveedor.id if catalog_pattern.proveedor else None
                })(),
                'target_field': type('MockField', (), {
                    'code': field_code,
                    'name': field_name,
                    'data_type': data_type
                })(),
                'test': lambda text, p=catalog_pattern.patron_regex, cs=catalog_pattern.case_sensitive: self._test_pattern(p, text, cs)
            })()
            
            self.patterns.append(mock_pattern)
            logger.info(f"✓ Cargado patrón: {catalog_pattern.nombre} ({field_name})")
        
        # CASO 2: Formato legacy - múltiples campos patron_*
        else:
            field_mapping = {
                'patron_numero_factura': ('invoice_number', 'Número de Factura'),
                'patron_numero_control': ('control_number', 'Número de Control'),
                'patron_fecha_emision': ('issue_date', 'Fecha de Emisión'),
                'patron_nit_emisor': ('issuer_nit', 'NIT Emisor'),
                'patron_nombre_emisor': ('issuer_name', 'Nombre Emisor'),
                'patron_nit_cliente': ('client_nit', 'NIT Cliente'),
                'patron_nombre_cliente': ('client_name', 'Nombre Cliente'),
                'patron_subtotal': ('subtotal', 'Subtotal'),
                'patron_subtotal_gravado': ('taxable_subtotal', 'Subtotal Gravado'),
                'patron_subtotal_exento': ('exempt_subtotal', 'Subtotal Exento'),
                'patron_iva': ('tax_amount', 'IVA'),
                'patron_total': ('total_amount', 'Total'),
                'patron_retencion': ('retention', 'Retención'),
                'patron_retencion_iva': ('retention_vat', 'Retención IVA'),
                'patron_retencion_renta': ('retention_income', 'Retención Renta'),
                'patron_otros_montos': ('other_amounts', 'Otros Montos'),
            }
            
            for field_attr, (field_code, field_name) in field_mapping.items():
                pattern_text = getattr(catalog_pattern, field_attr, None)
                
                if pattern_text and pattern_text.strip():
                    # Crear un objeto mock que simula ProviderPattern
                    mock_pattern = type('MockPattern', (), {
                        'id': f"{catalog_pattern.id}_{field_code}",
                        'name': f"{catalog_pattern.nombre} - {field_name}",
                        'pattern': pattern_text,
                        'priority': catalog_pattern.prioridad,
                        'case_sensitive': catalog_pattern.case_sensitive,
                        'provider': type('MockProvider', (), {
                            'nombre': catalog_pattern.proveedor.nombre if catalog_pattern.proveedor else 'GENÉRICO',
                            'id': catalog_pattern.proveedor.id if catalog_pattern.proveedor else None
                        })(),
                        'target_field': type('MockField', (), {
                            'code': field_code,
                            'name': field_name,
                            'data_type': self._get_data_type_for_field(field_code)
                        })(),
                        'test': lambda text, p=pattern_text, cs=catalog_pattern.case_sensitive: self._test_pattern(p, text, cs)
                    })()
                    
                    self.patterns.append(mock_pattern)
                    logger.info(f"✓ Cargado patrón legacy: {catalog_pattern.nombre} - {field_name}")
    
    def _get_data_type_for_field(self, field_code: str) -> str:
        """Determina el tipo de dato según el código del campo"""
        if 'date' in field_code or 'fecha' in field_code:
            return 'date'
        elif any(x in field_code for x in ['amount', 'total', 'subtotal', 'iva', 'tax', 'retencion', 'retention']):
            return 'decimal'
        elif 'nit' in field_code or 'number' in field_code or 'numero' in field_code:
            return 'text'
        else:
            return 'text'
    
    def _test_pattern(self, pattern_text: str, text: str, case_sensitive: bool) -> Dict:
        """
        Prueba un patrón regex contra un texto.
        Simula el método test() de ProviderPattern.
        """
        try:
            flags = 0 if case_sensitive else re.IGNORECASE
            compiled = re.compile(pattern_text, flags)
            
            all_matches = []
            for idx, match in enumerate(compiled.finditer(text)):
                captured_text = match.group(1) if match.groups() else match.group(0)
                
                match_info = {
                    'text': captured_text,
                    'full_match': match.group(0),
                    'position': match.start(),
                    'end': match.end(),
                    'groups': {}
                }
                
                if match.groupdict():
                    match_info['groups'] = match.groupdict()
                elif len(match.groups()) > 0:
                    match_info['groups'] = {
                        f'group_{i+1}': g 
                        for i, g in enumerate(match.groups()) 
                        if g is not None
                    }
                
                all_matches.append(match_info)
            
            return {
                'success': True,
                'matches': all_matches,
                'match_count': len(all_matches),
                'error': None
            }
        except re.error as e:
            return {
                'success': False,
                'matches': [],
                'match_count': 0,
                'error': f'Error de sintaxis en regex: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'matches': [],
                'match_count': 0,
                'error': f'Error al probar patrón: {str(e)}'
            }
    
    def apply_patterns(self, text: str) -> Dict[str, Any]:
        """
        Aplica todos los patrones al texto y extrae información.
        
        Args:
            text: Texto extraído de la factura
            
        Returns:
            Diccionario con campos extraídos:
            {
                'numero_factura': {'value': str, 'confidence': float, 'pattern_used': str},
                'monto_total': {'value': Decimal, 'confidence': float, 'pattern_used': str},
                'numero_contenedor': {'value': str, 'confidence': float, 'pattern_used': str},
                ...
            }
        """
        if not text:
            return {}
        
        results = {}
        fields_found = set()  # Para evitar duplicados
        
        for pattern_obj in self.patterns:
            field_code = pattern_obj.target_field.code
            
            # Si ya encontramos este campo con un patrón de mayor prioridad, skip
            if field_code in fields_found:
                continue
            
            # Aplicar patrón
            matches = self._apply_single_pattern(pattern_obj, text)
            
            if matches and matches['match_count'] > 0:
                # Extraer primer match
                first_match = matches['matches'][0]
                value = first_match['text']
                
                # Convertir valor según tipo de campo
                converted_value = self._convert_value(value, pattern_obj.target_field.data_type)
                
                # Calcular confianza
                confidence = self._calculate_confidence(
                    pattern_obj, 
                    matches['match_count'],
                    len(value)
                )
                
                results[field_code] = {
                    'value': converted_value,
                    'raw_value': value,
                    'confidence': confidence,
                    'pattern_used': pattern_obj.name,
                    'pattern_id': pattern_obj.id,
                    'field_name': pattern_obj.target_field.name,
                    'provider': pattern_obj.provider.nombre,
                    'is_generic': pattern_obj.provider.nombre == "SISTEMA",
                    'match_position': first_match.get('position'),
                    'all_matches': [m['text'] for m in matches['matches']],  # Por si hay múltiples
                }
                
                fields_found.add(field_code)
                
                logger.info(
                    f"✓ {field_code}: '{value}' "
                    f"(patrón: {pattern_obj.name}, confianza: {confidence:.2f})"
                )
        
        return results
    
    def _apply_single_pattern(self, pattern_obj: ProviderPattern, text: str) -> Dict:
        """
        Aplica un solo patrón al texto.
        
        Args:
            pattern_obj: Objeto ProviderPattern
            text: Texto donde buscar
            
        Returns:
            Diccionario con resultados del test (mismo formato que ProviderPattern.test())
        """
        try:
            return pattern_obj.test(text)
        except Exception as e:
            logger.error(f"Error aplicando patrón {pattern_obj.id}: {e}")
            return {'success': False, 'matches': [], 'match_count': 0, 'error': str(e)}
    
    def _convert_value(self, value: str, data_type: str) -> Any:
        """
        Convierte el valor extraído al tipo de dato correcto.
        
        Args:
            value: Valor como string
            data_type: Tipo de dato esperado (string, decimal, date, etc.)
            
        Returns:
            Valor convertido
        """
        if not value:
            return None
        
        try:
            if data_type == 'decimal':
                # Extraer solo el número (soporta comas de miles y punto decimal)
                import re
                # Buscar patrón numérico: opcionalmente negativo, dígitos con comas opcionales, punto decimal opcional
                match = re.search(r'-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?', value)
                if match:
                    cleaned = match.group().replace(',', '')
                    return Decimal(cleaned)
                else:
                    # Si no encuentra patrón, intentar limpiar manualmente
                    cleaned = re.sub(r'[^\d.-]', '', value.replace(',', ''))
                    if cleaned:
                        return Decimal(cleaned)
                    return Decimal('0.00')
            
            elif data_type == 'integer':
                import re
                # Extraer solo dígitos
                match = re.search(r'-?\d{1,3}(?:,\d{3})*|\d+', value)
                if match:
                    cleaned = match.group().replace(',', '')
                    return int(cleaned)
                else:
                    cleaned = re.sub(r'[^\d-]', '', value)
                    if cleaned:
                        return int(cleaned)
                    return 0
            
            elif data_type == 'date':
                # Intentar parsear fecha en varios formatos
                return self._parse_date(value)
            
            elif data_type == 'boolean':
                return value.lower() in ['true', 'yes', 'si', '1', 'verdadero']
            
            else:  # string
                return value.strip()
        
        except Exception as e:
            logger.warning(f"Error convirtiendo '{value}' a {data_type}: {e}")
            return value  # Retornar como string si falla
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Intenta parsear una fecha en múltiples formatos.
        
        Args:
            date_str: String con la fecha
            
        Returns:
            Objeto datetime o None si no se pudo parsear
        """
        formats = [
            '%d-%b-%Y',      # 28-AUG-2025, 25-Sep-2024 (formato CMA CGM)
            '%d-%B-%Y',      # 28-August-2025
            '%d/%b/%Y',      # 28/AUG/2025
            '%d/%B/%Y',      # 28/August/2025
            '%d/%m/%Y',      # 28/08/2025 (formato DD/MM/YYYY)
            '%d-%m-%Y',      # 28-08-2025
            '%Y-%m-%d',      # 2025-08-28
            '%m/%d/%Y',      # 08/28/2025
            '%d/%m/%y',      # 28/08/25
            '%Y%m%d',        # 20250828
            '%B %d, %Y',     # August 28, 2025
            '%b %d, %Y',     # Aug 28, 2025
        ]
        
        # Limpiar y normalizar el string de fecha
        date_str_clean = date_str.strip().upper()
        
        for fmt in formats:
            try:
                # Intentar con el formato en mayúsculas (para meses en inglés)
                parsed = datetime.strptime(date_str_clean, fmt.upper())
                logger.info(f"✓ Fecha parseada: '{date_str}' → {parsed.strftime('%d/%m/%Y')}")
                return parsed
            except ValueError:
                # Si falla con mayúsculas, intentar con el formato original
                try:
                    parsed = datetime.strptime(date_str.strip(), fmt)
                    logger.info(f"✓ Fecha parseada: '{date_str}' → {parsed.strftime('%d/%m/%Y')}")
                    return parsed
                except ValueError:
                    continue
        
        logger.warning(f"No se pudo parsear fecha: '{date_str}'")
        return None
    
    def _calculate_confidence(
        self, 
        pattern_obj: ProviderPattern, 
        match_count: int,
        value_length: int
    ) -> float:
        """
        Calcula nivel de confianza para un match.
        
        Factores:
        - Si es patrón específico del proveedor vs genérico
        - Prioridad del patrón
        - Número de matches (1 es ideal, muchos baja confianza)
        - Longitud del valor encontrado
        
        Returns:
            Float entre 0.0 y 1.0
        """
        confidence = 0.5  # Base
        
        # Factor 1: Prioridad del patrón (0.0 - 0.3)
        # Prioridad 10 = +0.3, Prioridad 1 = +0.03
        confidence += (pattern_obj.priority / 10.0) * 0.3
        
        # Factor 2: Específico vs genérico (0.0 - 0.2)
        if pattern_obj.provider.nombre != "SISTEMA":
            confidence += 0.2  # Patrón específico del proveedor
        
        # Factor 3: Un solo match es mejor (0.0 - 0.1)
        if match_count == 1:
            confidence += 0.1
        elif match_count > 3:
            confidence -= 0.1  # Penalizar si hay muchos matches
        
        # Factor 4: Longitud razonable del valor (0.0 - 0.1)
        if 3 <= value_length <= 50:
            confidence += 0.1
        elif value_length < 3 or value_length > 100:
            confidence -= 0.1
        
        # Limitar entre 0.0 y 1.0
        return max(0.0, min(1.0, confidence))
    
    def get_patterns_summary(self) -> List[Dict[str, Any]]:
        """
        Retorna un resumen de los patrones cargados.
        Útil para mostrar en el frontend qué patrones se están usando.
        
        Returns:
            Lista de diccionarios con info de cada patrón
        """
        summary = []
        
        for pattern_obj in self.patterns:
            summary.append({
                'id': pattern_obj.id,
                'name': pattern_obj.name,
                'field_name': pattern_obj.target_field.name,
                'field_code': pattern_obj.target_field.code,
                'priority': pattern_obj.priority,
                'is_generic': pattern_obj.provider.nombre == "SISTEMA",
                'provider': pattern_obj.provider.nombre,
            })
        
        return summary

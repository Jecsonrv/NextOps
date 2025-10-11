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
from catalogs.models import Provider

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
        Carga patrones del proveedor y patrones genéricos.
        Los ordena por prioridad (mayor a menor).
        """
        # Obtener proveedor SISTEMA para patrones genéricos
        try:
            sistema_provider = Provider.objects.get(nombre="SISTEMA")
            sistema_id = sistema_provider.id
        except Provider.DoesNotExist:
            sistema_id = None
            logger.warning("Proveedor SISTEMA no encontrado, no se cargarán patrones genéricos")
        
        # Query para obtener patrones
        query = ProviderPattern.objects.filter(is_active=True).select_related('target_field', 'provider')
        
        # Si hay proveedor específico, incluir sus patrones + genéricos
        if self.provider_id:
            if sistema_id:
                query = query.filter(provider_id__in=[self.provider_id, sistema_id])
            else:
                query = query.filter(provider_id=self.provider_id)
        elif sistema_id:
            # Solo patrones genéricos
            query = query.filter(provider_id=sistema_id)
        
        # Ordenar por prioridad (mayor primero) y provider (específico primero)
        self.patterns = list(query.order_by('-priority', 'provider_id'))
        
        logger.info(f"Cargados {len(self.patterns)} patrones activos (proveedor={self.provider_id})")
    
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

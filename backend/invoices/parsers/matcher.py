"""
Motor de matching automático de facturas con OTs.

Implementa un algoritmo de 5 niveles de matching con diferentes
niveles de confianza según el tipo de coincidencia encontrada.
"""

from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List
from django.db.models import Q


class InvoiceMatcher:
    """
    Motor de matching automático de facturas con Órdenes de Transporte.
    
    Implementa 5 niveles de matching:
    - Nivel 1: OT directa encontrada en el texto (confianza: 0.95)
    - Nivel 2: MBL + Contenedor exactos (confianza: 0.90)
    - Nivel 3: Solo MBL exacto (confianza: 0.75)
    - Nivel 4: Solo Contenedor exacto (confianza: 0.60)
    - Nivel 5: Proveedor + Rango de fecha ±7 días (confianza: 0.40)
    """
    
    def __init__(self):
        self.match_attempts = []
        self.debug_info = []
    
    def match(
        self,
        referencias: List[Dict[str, str]],
        proveedor_nombre: str = "",
        fecha_emision: Optional[datetime] = None,
    ) -> Tuple[Optional[Any], Decimal, str, Dict]:
        """
        Intenta hacer matching de una factura con una OT.
        
        Args:
            referencias: Lista de referencias extraídas del documento
                        Formato: [{'tipo': 'mbl', 'valor': 'MAEU12345'}, ...]
            proveedor_nombre: Nombre del proveedor de la factura
            fecha_emision: Fecha de emisión de la factura
            
        Returns:
            Tupla con:
            - OT encontrada (o None si no hay match)
            - Confianza del match (Decimal 0.0-1.0)
            - Método de asignación ('nivel_1', 'nivel_2', etc.)
            - Diccionario con referencias detectadas y usadas para el match
        """
        from ots.models import OT
        
        # Extraer referencias por tipo
        refs_dict = self._organize_referencias(referencias)
        
        # Intentar matching por niveles (del más confiable al menos)
        
        # Nivel 1: OT directa
        if 'ot' in refs_dict:
            for ot_number in refs_dict['ot']:
                ot = self._match_nivel_1(ot_number)
                if ot:
                    return ot, Decimal('0.95'), 'nivel_1_ot_directa', {
                        'ot_number': ot_number,
                        'tipo_match': 'OT directa en documento'
                    }
        
        # Nivel 2: MBL + Contenedor
        if 'mbl' in refs_dict and 'contenedor' in refs_dict:
            for mbl in refs_dict['mbl']:
                for contenedor in refs_dict['contenedor']:
                    ot = self._match_nivel_2(mbl, contenedor)
                    if ot:
                        return ot, Decimal('0.90'), 'nivel_2_mbl_contenedor', {
                            'mbl': mbl,
                            'contenedor': contenedor,
                            'tipo_match': 'MBL + Contenedor exactos'
                        }
        
        # Nivel 3: Solo MBL
        if 'mbl' in refs_dict:
            for mbl in refs_dict['mbl']:
                ot = self._match_nivel_3(mbl)
                if ot:
                    return ot, Decimal('0.75'), 'nivel_3_mbl', {
                        'mbl': mbl,
                        'tipo_match': 'MBL exacto'
                    }
        
        # Nivel 4: Solo Contenedor
        if 'contenedor' in refs_dict:
            for contenedor in refs_dict['contenedor']:
                ot = self._match_nivel_4(contenedor)
                if ot:
                    return ot, Decimal('0.60'), 'nivel_4_contenedor', {
                        'contenedor': contenedor,
                        'tipo_match': 'Contenedor exacto'
                    }
        
        # Nivel 5: Proveedor + Fecha
        if proveedor_nombre and fecha_emision:
            ot = self._match_nivel_5(proveedor_nombre, fecha_emision)
            if ot:
                return ot, Decimal('0.40'), 'nivel_5_proveedor_fecha', {
                    'proveedor': proveedor_nombre,
                    'fecha_emision': fecha_emision.strftime('%Y-%m-%d'),
                    'tipo_match': 'Proveedor + Rango de fecha (±7 días)'
                }
        
        # No se encontró match
        return None, Decimal('0.00'), 'no_match', {
            'referencias_buscadas': refs_dict,
            'tipo_match': 'Sin coincidencias'
        }
    
    def _organize_referencias(self, referencias: List[Dict[str, str]]) -> Dict[str, List[str]]:
        """
        Organiza las referencias por tipo.
        
        Args:
            referencias: Lista de diccionarios con tipo y valor
            
        Returns:
            Diccionario agrupado por tipo
            Ejemplo: {'mbl': ['MAEU123', 'MAEU456'], 'contenedor': ['TEMU1234567']}
        """
        organized = {}
        
        for ref in referencias:
            tipo = ref.get('tipo', '').lower()
            valor = ref.get('valor', '').strip().upper()
            
            if not tipo or not valor:
                continue
            
            if tipo not in organized:
                organized[tipo] = []
            
            if valor not in organized[tipo]:
                organized[tipo].append(valor)
        
        return organized
    
    def _match_nivel_1(self, ot_number: str) -> Optional[Any]:
        """
        Nivel 1: Búsqueda por número de OT directo.
        
        Args:
            ot_number: Número de OT a buscar
            
        Returns:
            OT encontrada o None
        """
        from ots.models import OT
        
        try:
            # Buscar OT por número exacto (case insensitive)
            ot = OT.objects.filter(
                numero_ot__iexact=ot_number,
                is_deleted=False
            ).first()
            
            self.debug_info.append(f"Nivel 1: Buscando OT '{ot_number}' - {'Encontrada' if ot else 'No encontrada'}")
            
            return ot
            
        except Exception as e:
            self.debug_info.append(f"Error en Nivel 1: {str(e)}")
            return None
    
    def _match_nivel_2(self, mbl: str, contenedor: str) -> Optional[Any]:
        """
        Nivel 2: Búsqueda por MBL + Contenedor.
        
        Args:
            mbl: Master Bill of Lading
            contenedor: Número de contenedor
            
        Returns:
            OT encontrada o None
        """
        from ots.models import OT
        
        try:
            # Buscar OT que tenga tanto el MBL como el contenedor
            ot = OT.objects.filter(
                Q(mbl__iexact=mbl) | Q(mbl__icontains=mbl),
                Q(contenedor__iexact=contenedor) | Q(contenedor__icontains=contenedor),
                is_deleted=False
            ).first()
            
            self.debug_info.append(f"Nivel 2: Buscando MBL '{mbl}' + Contenedor '{contenedor}' - {'Encontrada' if ot else 'No encontrada'}")
            
            return ot
            
        except Exception as e:
            self.debug_info.append(f"Error en Nivel 2: {str(e)}")
            return None
    
    def _match_nivel_3(self, mbl: str) -> Optional[Any]:
        """
        Nivel 3: Búsqueda solo por MBL.
        
        Args:
            mbl: Master Bill of Lading
            
        Returns:
            OT encontrada o None
        """
        from ots.models import OT
        
        try:
            # Buscar OT por MBL
            ot = OT.objects.filter(
                Q(mbl__iexact=mbl) | Q(mbl__icontains=mbl),
                is_deleted=False
            ).first()
            
            self.debug_info.append(f"Nivel 3: Buscando MBL '{mbl}' - {'Encontrada' if ot else 'No encontrada'}")
            
            return ot
            
        except Exception as e:
            self.debug_info.append(f"Error en Nivel 3: {str(e)}")
            return None
    
    def _match_nivel_4(self, contenedor: str) -> Optional[Any]:
        """
        Nivel 4: Búsqueda solo por Contenedor.
        
        Args:
            contenedor: Número de contenedor
            
        Returns:
            OT encontrada o None
        """
        from ots.models import OT
        
        try:
            # Buscar OT por contenedor
            ot = OT.objects.filter(
                Q(contenedor__iexact=contenedor) | Q(contenedor__icontains=contenedor),
                is_deleted=False
            ).first()
            
            self.debug_info.append(f"Nivel 4: Buscando Contenedor '{contenedor}' - {'Encontrada' if ot else 'No encontrada'}")
            
            return ot
            
        except Exception as e:
            self.debug_info.append(f"Error en Nivel 4: {str(e)}")
            return None
    
    def _match_nivel_5(self, proveedor_nombre: str, fecha_emision: datetime) -> Optional[Any]:
        """
        Nivel 5: Búsqueda por Proveedor + Rango de fecha (±7 días).
        
        Este nivel es el menos confiable y solo se usa cuando no hay
        referencias más específicas.
        
        Args:
            proveedor_nombre: Nombre del proveedor
            fecha_emision: Fecha de emisión de la factura
            
        Returns:
            OT encontrada o None
        """
        from ots.models import OT
        
        try:
            # Calcular rango de fechas (±7 días)
            fecha_desde = fecha_emision - timedelta(days=7)
            fecha_hasta = fecha_emision + timedelta(days=7)
            
            # Buscar OTs con proveedor similar y en rango de fechas
            # Buscar por diferentes campos de fecha
            ot = OT.objects.filter(
                Q(proveedor_transporte__icontains=proveedor_nombre) |
                Q(carrier__icontains=proveedor_nombre),
                Q(
                    Q(fecha_emision__range=[fecha_desde, fecha_hasta]) |
                    Q(fecha_creacion__range=[fecha_desde, fecha_hasta]) |
                    Q(etd__range=[fecha_desde, fecha_hasta])
                ),
                is_deleted=False
            ).first()
            
            self.debug_info.append(
                f"Nivel 5: Buscando Proveedor '{proveedor_nombre}' "
                f"en rango {fecha_desde.date()} a {fecha_hasta.date()} - "
                f"{'Encontrada' if ot else 'No encontrada'}"
            )
            
            return ot
            
        except Exception as e:
            self.debug_info.append(f"Error en Nivel 5: {str(e)}")
            return None
    
    def get_debug_info(self) -> List[str]:
        """
        Retorna información de debug sobre los intentos de matching.
        
        Returns:
            Lista de strings con información de cada intento
        """
        return self.debug_info
    
    def match_from_parsed_data(self, parsed_data: Dict[str, Any]) -> Tuple[Optional[Any], Decimal, str, Dict]:
        """
        Helper para hacer matching directamente desde datos parseados.
        
        Args:
            parsed_data: Diccionario con datos extraídos por DTEJsonParser o PDFExtractor
            
        Returns:
            Tupla con resultado del matching (igual que método match())
        """
        # Extraer información del diccionario parseado
        referencias = parsed_data.get('referencias', [])
        
        # Si las referencias vienen como strings, convertir a formato esperado
        if referencias and isinstance(referencias[0], str):
            referencias = self._convert_string_referencias(referencias)
        
        proveedor_nombre = parsed_data.get('proveedor_nombre', '')
        fecha_emision = parsed_data.get('fecha_emision')
        
        return self.match(referencias, proveedor_nombre, fecha_emision)
    
    def _convert_string_referencias(self, referencias_str: List[str]) -> List[Dict[str, str]]:
        """
        Convierte referencias en formato string a formato de diccionario.
        
        Analiza el texto para identificar el tipo de referencia.
        
        Args:
            referencias_str: Lista de strings con referencias
            
        Returns:
            Lista de diccionarios con tipo y valor
        """
        import re
        
        referencias = []
        
        for ref_str in referencias_str:
            ref_str = ref_str.upper().strip()
            
            # Detectar tipo de referencia
            if re.search(r'\bOT\b', ref_str):
                # Extraer número de OT
                match = re.search(r'OT[:\s#]*(\d+)', ref_str, re.IGNORECASE)
                if match:
                    referencias.append({'tipo': 'ot', 'valor': match.group(1)})
            
            if re.search(r'\bMBL\b', ref_str):
                # Extraer MBL
                match = re.search(r'MBL[:\s#]*([A-Z]{4}\d{7,11})', ref_str, re.IGNORECASE)
                if match:
                    referencias.append({'tipo': 'mbl', 'valor': match.group(1)})
            
            # Buscar patrones de contenedor
            container_match = re.search(r'\b([A-Z]{4}\d{7})\b', ref_str)
            if container_match:
                referencias.append({'tipo': 'contenedor', 'valor': container_match.group(1)})
        
        return referencias

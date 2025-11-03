"""
Sistema de extracción de datos desde XML de facturas electrónicas.
Patrones configurables para diferentes tipos de facturas.
"""

import xml.etree.ElementTree as ET
import re
from decimal import Decimal
from datetime import datetime
from typing import Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)


class XMLExtractor:
    """
    Extrae información de facturas electrónicas en formato XML.
    Soporta facturas estándar ecuatorianas y patrones personalizados.
    """

    # Namespaces comunes en facturas electrónicas Ecuador
    NAMESPACES = {
        'sri': 'http://www.sri.gob.ec/schemas',
        'ds': 'http://www.w3.org/2000/09/xmldsig#',
    }

    # Patrones de la empresa (PLG DIVISION ADUANAS)
    EMPRESA_PATTERNS = {
        'ruc': ['1793220616001'],  # RUC de PLG División Aduanas
        'razon_social': [
            'PLG DIVISION ADUANAS',
            'PLG',
            'PENINSULAR LOGISTICS GROUP'
        ],
    }

    def __init__(self, xml_content: str):
        """
        Inicializa el extractor con contenido XML.

        Args:
            xml_content: String con el contenido del XML
        """
        self.xml_content = xml_content
        self.root = None
        self.data = {}

    def parse(self) -> bool:
        """
        Parsea el XML y lo valida.

        Returns:
            True si el parsing fue exitoso, False otherwise
        """
        try:
            self.root = ET.fromstring(self.xml_content)
            return True
        except ET.ParseError as e:
            logger.error(f"Error parseando XML: {e}")
            return False

    def extract_all(self) -> Dict[str, Any]:
        """
        Extrae toda la información disponible del XML.

        Returns:
            Diccionario con los datos extraídos
        """
        if not self.root:
            if not self.parse():
                return {}

        # Intentar diferentes estrategias de extracción
        self.data = {}

        # 1. Intentar extracción estándar SRI Ecuador
        self._extract_sri_standard()

        # 2. Intentar extracción por tags comunes
        if not self.data.get('numero_factura'):
            self._extract_common_tags()

        # 3. Intentar extracción de texto plano (fallback)
        if not self.data.get('numero_factura'):
            self._extract_from_text()

        # Validar y limpiar datos
        self._validate_and_clean()

        return self.data

    def _extract_sri_standard(self):
        """
        Extrae datos usando el formato estándar del SRI Ecuador.
        """
        try:
            # Información del comprobante
            info_tributaria = self.root.find('.//infoTributaria')
            if info_tributaria is not None:
                # Número de factura (formato: 001-001-000001234)
                establecimiento = self._get_text(info_tributaria, 'estab')
                punto_emision = self._get_text(info_tributaria, 'ptoEmi')
                secuencial = self._get_text(info_tributaria, 'secuencial')

                if establecimiento and punto_emision and secuencial:
                    self.data['numero_factura'] = f"{establecimiento}-{punto_emision}-{secuencial}"

                # RUC emisor
                self.data['ruc_emisor'] = self._get_text(info_tributaria, 'ruc')
                self.data['razon_social_emisor'] = self._get_text(info_tributaria, 'razonSocial')
                self.data['nombre_comercial'] = self._get_text(info_tributaria, 'nombreComercial')

            # Información de la factura
            info_factura = self.root.find('.//infoFactura')
            if info_factura is not None:
                # Fecha de emisión
                fecha_str = self._get_text(info_factura, 'fechaEmision')
                if fecha_str:
                    self.data['fecha_emision'] = self._parse_date(fecha_str)

                # Cliente
                self.data['razon_social_comprador'] = self._get_text(info_factura, 'razonSocialComprador')
                self.data['identificacion_comprador'] = self._get_text(info_factura, 'identificacionComprador')

                # Montos
                self.data['total_sin_impuestos'] = self._parse_decimal(
                    self._get_text(info_factura, 'totalSinImpuestos')
                )
                self.data['importe_total'] = self._parse_decimal(
                    self._get_text(info_factura, 'importeTotal')
                )

                # Impuestos
                self._extract_impuestos(info_factura)

        except Exception as e:
            logger.error(f"Error en extracción SRI estándar: {e}")

    def _extract_impuestos(self, info_factura):
        """Extrae información de impuestos."""
        try:
            total_impuestos = Decimal('0.00')

            # Buscar totalConImpuestos
            impuestos_node = info_factura.find('.//totalConImpuestos')
            if impuestos_node is not None:
                for impuesto in impuestos_node.findall('.//totalImpuesto'):
                    codigo_porcentaje = self._get_text(impuesto, 'codigoPorcentaje')
                    base_imponible = self._parse_decimal(self._get_text(impuesto, 'baseImponible'))
                    valor = self._parse_decimal(self._get_text(impuesto, 'valor'))

                    if valor:
                        total_impuestos += valor

            self.data['monto_impuestos'] = total_impuestos

        except Exception as e:
            logger.error(f"Error extrayendo impuestos: {e}")

    def _extract_common_tags(self):
        """
        Extrae datos buscando tags comunes sin namespace.
        """
        try:
            # Buscar número de factura
            for tag in ['numeroFactura', 'numero', 'secuencial', 'numeroDocumento']:
                value = self._find_tag_value(tag)
                if value:
                    self.data['numero_factura'] = value
                    break

            # Buscar fecha
            for tag in ['fecha', 'fechaEmision', 'fechaDocumento']:
                value = self._find_tag_value(tag)
                if value:
                    fecha = self._parse_date(value)
                    if fecha:
                        self.data['fecha_emision'] = fecha
                        break

            # Buscar montos
            for tag in ['total', 'importeTotal', 'montoTotal']:
                value = self._find_tag_value(tag)
                if value:
                    monto = self._parse_decimal(value)
                    if monto:
                        self.data['importe_total'] = monto
                        break

            # Buscar cliente
            for tag in ['cliente', 'comprador', 'razonSocialComprador']:
                value = self._find_tag_value(tag)
                if value:
                    self.data['razon_social_comprador'] = value
                    break

        except Exception as e:
            logger.error(f"Error en extracción por tags comunes: {e}")

    def _extract_from_text(self):
        """
        Extrae datos usando regex del texto completo del XML.
        Último recurso cuando no se puede parsear estructuradamente.
        """
        try:
            text = ET.tostring(self.root, encoding='unicode', method='text')

            # Buscar número de factura (formato: XXX-XXX-XXXXXXXXX)
            factura_match = re.search(r'\b(\d{3}-\d{3}-\d{9})\b', text)
            if factura_match:
                self.data['numero_factura'] = factura_match.group(1)

            # Buscar fecha (formato: DD/MM/YYYY)
            fecha_match = re.search(r'\b(\d{2}/\d{2}/\d{4})\b', text)
            if fecha_match:
                fecha = self._parse_date(fecha_match.group(1))
                if fecha:
                    self.data['fecha_emision'] = fecha

            # Buscar montos (formato: 1234.56)
            montos = re.findall(r'\b(\d+\.\d{2})\b', text)
            if montos:
                # El monto mayor suele ser el total
                montos_decimales = [self._parse_decimal(m) for m in montos]
                self.data['importe_total'] = max(montos_decimales)

        except Exception as e:
            logger.error(f"Error en extracción de texto: {e}")

    def _validate_and_clean(self):
        """
        Valida y limpia los datos extraídos.
        """
        # Calcular subtotal si tenemos total e impuestos
        if self.data.get('importe_total') and self.data.get('monto_impuestos'):
            self.data['subtotal'] = self.data['importe_total'] - self.data['monto_impuestos']
        elif self.data.get('total_sin_impuestos'):
            self.data['subtotal'] = self.data['total_sin_impuestos']

        # Si no tenemos monto_impuestos pero sí subtotal y total, calcularlo
        if not self.data.get('monto_impuestos'):
            if self.data.get('importe_total') and self.data.get('subtotal'):
                self.data['monto_impuestos'] = self.data['importe_total'] - self.data['subtotal']

        # Determinar si es factura de PLG (nuestra empresa)
        self.data['es_factura_plg'] = self._is_plg_invoice()

    def _is_plg_invoice(self) -> bool:
        """
        Determina si la factura pertenece a PLG División Aduanas.
        """
        # Verificar por RUC
        ruc_emisor = self.data.get('ruc_emisor', '')
        if ruc_emisor in self.EMPRESA_PATTERNS['ruc']:
            return True

        # Verificar por razón social
        razon_social = self.data.get('razon_social_emisor', '').upper()
        for pattern in self.EMPRESA_PATTERNS['razon_social']:
            if pattern in razon_social:
                return True

        return False

    # Métodos auxiliares

    def _get_text(self, element, tag: str) -> Optional[str]:
        """Obtiene el texto de un tag hijo."""
        child = element.find(tag)
        if child is not None and child.text:
            return child.text.strip()
        return None

    def _find_tag_value(self, tag: str) -> Optional[str]:
        """Busca un tag en todo el árbol XML."""
        element = self.root.find(f".//{tag}")
        if element is not None and element.text:
            return element.text.strip()
        return None

    def _parse_decimal(self, value: Optional[str]) -> Optional[Decimal]:
        """Convierte string a Decimal."""
        if not value:
            return None
        try:
            # Limpiar string: remover espacios, comas de miles
            cleaned = value.strip().replace(',', '').replace(' ', '')
            return Decimal(cleaned)
        except Exception:
            return None

    def _parse_date(self, date_str: Optional[str]) -> Optional[str]:
        """
        Parsea una fecha y la devuelve en formato ISO (YYYY-MM-DD).
        Soporta formatos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
        """
        if not date_str:
            return None

        date_str = date_str.strip()

        # Intentar diferentes formatos
        formats = [
            '%d/%m/%Y',  # 25/12/2024
            '%Y-%m-%d',  # 2024-12-25
            '%d-%m-%Y',  # 25-12-2024
            '%Y/%m/%d',  # 2024/12/25
        ]

        for fmt in formats:
            try:
                date_obj = datetime.strptime(date_str, fmt)
                return date_obj.strftime('%Y-%m-%d')
            except ValueError:
                continue

        return None

    def get_summary(self) -> Dict[str, Any]:
        """
        Retorna un resumen de los datos más importantes extraídos.
        """
        return {
            'numero_factura': self.data.get('numero_factura'),
            'fecha_emision': self.data.get('fecha_emision'),
            'cliente': self.data.get('razon_social_comprador'),
            'subtotal': self.data.get('subtotal'),
            'impuestos': self.data.get('monto_impuestos'),
            'total': self.data.get('importe_total'),
            'es_factura_plg': self.data.get('es_factura_plg', False),
        }


def extract_from_xml_file(xml_content: str) -> Dict[str, Any]:
    """
    Función helper para extraer datos de un archivo XML.

    Args:
        xml_content: Contenido del archivo XML como string

    Returns:
        Diccionario con los datos extraídos
    """
    extractor = XMLExtractor(xml_content)
    return extractor.extract_all()

from rest_framework import serializers
from decimal import Decimal
import logging

import requests
from django.conf import settings

from .models import SalesInvoice, InvoiceSalesMapping, Payment
from .models_items import SalesInvoiceItem
from invoices.models import Invoice
from invoices.utils import get_absolute_media_url

logger = logging.getLogger(__name__)


class SafeFileField(serializers.FileField):
    """
    FileField personalizado que maneja errores al obtener la URL.
    Retorna None en lugar de fallar si el archivo no existe.

    IMPORTANTE: NO verifica existencia en Cloudinary para archivos RAW
    porque requieren autenticación. En su lugar, usar los endpoints proxy (/file/).
    """
    def to_representation(self, value):
        if not value:
            return None
        try:
            url = value.url
        except Exception as e:
            logger.warning(f"Error obteniendo URL de archivo: {e}")
            return None

        # NOTA: Removida validación HEAD para archivos en Cloudinary
        # Los archivos RAW (PDFs) requieren autenticación y el HEAD falla con 404/401
        # El frontend debe usar los endpoints proxy (/file/) en lugar de URLs directas
        return url


from django.db.models import Sum
class CostInvoiceBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para facturas de costo."""
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    monto_aplicable = serializers.DecimalField(source='get_monto_aplicable', max_digits=15, decimal_places=2, read_only=True)
    tipo_costo_display = serializers.CharField(source='get_tipo_costo_display', read_only=True)
    monto_disponible = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['id', 'numero_factura', 'proveedor', 'proveedor_nombre',
                  'monto_aplicable', 'estado_provision', 'fecha_provision', 'tipo_costo_display', 'monto_disponible']
        read_only_fields = fields

    def get_monto_disponible(self, obj):
        total_asignado = obj.sales_mappings.aggregate(
            total=Sum('monto_asignado')
        )['total'] or Decimal('0.00')
        monto_aplicable = obj.get_monto_aplicable()
        return monto_aplicable - total_asignado



class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    """
    Serializer para líneas/items de factura de venta.
    Maneja cálculos automáticos de subtotal, IVA y total.
    """
    # Campos calculados (read-only)
    detalle_calculo = serializers.SerializerMethodField()

    # Campos con display
    tipo_servicio_display = serializers.CharField(source='get_tipo_servicio_display', read_only=True)

    class Meta:
        model = SalesInvoiceItem
        fields = [
            'id', 'factura', 'numero_linea', 'descripcion', 'concepto',
            'tipo_servicio', 'tipo_servicio_display',
            'cantidad', 'unidad_medida', 'precio_unitario',
            'subtotal', 'aplica_iva', 'porcentaje_iva', 'iva',
            'descuento_porcentaje', 'descuento_monto', 'total',
            'razon_exencion', 'codigo_exencion_sri', 'notas',
            'modificado_por', 'detalle_calculo',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subtotal', 'iva', 'descuento_monto', 'total',
            'detalle_calculo', 'tipo_servicio_display', 'created_at', 'updated_at'
        ]

    def get_detalle_calculo(self, obj):
        """Retorna el desglose del cálculo de la línea"""
        return obj.get_detalle_calculo()

    def validate(self, attrs):
        """Validaciones personalizadas"""
        # Si no aplica IVA, debe haber razón de exención
        if not attrs.get('aplica_iva', True) and not attrs.get('razon_exencion'):
            raise serializers.ValidationError({
                'razon_exencion': 'Debe especificar la razón de exención de IVA'
            })

        # Validar porcentajes
        porcentaje_iva = attrs.get('porcentaje_iva', Decimal('13.00'))
        if porcentaje_iva < 0 or porcentaje_iva > 100:
            raise serializers.ValidationError({
                'porcentaje_iva': 'El porcentaje de IVA debe estar entre 0 y 100'
            })

        descuento_porcentaje = attrs.get('descuento_porcentaje', Decimal('0.00'))
        if descuento_porcentaje < 0 or descuento_porcentaje > 100:
            raise serializers.ValidationError({
                'descuento_porcentaje': 'El descuento debe estar entre 0 y 100%'
            })

        return attrs


class InvoiceSalesMappingSerializer(serializers.ModelSerializer):
    cost_invoice_numero = serializers.CharField(source='cost_invoice.numero_factura', read_only=True)
    proveedor_nombre = serializers.CharField(source='cost_invoice.proveedor.nombre', read_only=True)
    cost_invoice_file_url = serializers.SerializerMethodField()
    tipo_costo_display = serializers.CharField(source='cost_invoice.get_tipo_costo_display', read_only=True)
    # Campo completo de la factura de costo para el modal
    cost_invoice_data = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceSalesMapping
        fields = [
            'id', 'cost_invoice', 'cost_invoice_numero', 'proveedor_nombre', 
            'monto_asignado', 'porcentaje_markup', 'notas', 'created_at', 
            'cost_invoice_file_url', 'tipo_costo_display', 'cost_invoice_data'
        ]
        read_only_fields = [
            'id', 'created_at', 'cost_invoice_numero', 'proveedor_nombre', 
            'cost_invoice_file_url', 'tipo_costo_display', 'cost_invoice_data',
            'porcentaje_markup'
        ]

    def get_cost_invoice_file_url(self, obj):
        if obj.cost_invoice and obj.cost_invoice.uploaded_file:
            return get_absolute_media_url(obj.cost_invoice.uploaded_file.path)
        return None
    
    def get_cost_invoice_data(self, obj):
        """Retorna datos completos de la factura de costo para el modal"""
        if not obj.cost_invoice:
            return None
        return {
            'id': obj.cost_invoice.id,
            'numero_factura': obj.cost_invoice.numero_factura,
            'proveedor_nombre': obj.cost_invoice.proveedor.nombre if obj.cost_invoice.proveedor else None,
            'monto_aplicable': str(obj.cost_invoice.get_monto_aplicable()),
            'monto_total': str(obj.cost_invoice.get_monto_aplicable()),  # Usar monto_aplicable como total
            'tipo_costo_display': obj.cost_invoice.get_tipo_costo_display(),
        }


class PaymentListSerializer(serializers.ModelSerializer):
    factura_venta_numero = serializers.CharField(source='sales_invoice.numero_factura', read_only=True)
    cliente_nombre = serializers.CharField(source='sales_invoice.cliente.short_name', read_only=True)
    archivo_comprobante = serializers.FileField(required=False, allow_null=True, write_only=True)
    archivo_comprobante_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'factura_venta_numero', 'cliente_nombre', 'archivo_comprobante_url']

    def get_archivo_comprobante_url(self, obj):
        """
        Obtener URL del comprobante de pago.
        Retorna la URL del endpoint proxy (/file/) para archivos en Cloudinary.
        """
        if obj.archivo_comprobante:
            try:
                request = self.context.get('request')
                if request:
                    from django.urls import reverse
                    return request.build_absolute_uri(
                        reverse('payment-retrieve-file', kwargs={'pk': obj.pk})
                    )
                else:
                    return f"/api/payments/{obj.pk}/file/"
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error generando URL para comprobante de pago {obj.id}: {e}")
                return None
        return None


class SalesInvoiceListSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.short_name', read_only=True)  # Alias corto para tablas
    cliente_nombre_completo = serializers.CharField(source='cliente.original_name', read_only=True)  # Nombre completo para detalle
    cliente_alias = serializers.CharField(source='cliente.alias', read_only=True)
    ot_numero = serializers.CharField(source='ot.numero_ot', read_only=True, allow_null=True)
    ot_tipo_operacion = serializers.CharField(source='ot.tipo_operacion', read_only=True, allow_null=True)

    # Información tributaria del cliente
    cliente_tipo_contribuyente = serializers.CharField(source='cliente.tipo_contribuyente', read_only=True)
    cliente_nit = serializers.CharField(source='cliente.nit', read_only=True)
    cliente_aplica_retencion_iva = serializers.BooleanField(source='cliente.aplica_retencion_iva', read_only=True)
    cliente_aplica_retencion_renta = serializers.BooleanField(source='cliente.aplica_retencion_renta', read_only=True)

    # Totales
    subtotal_gravado = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    subtotal_exento = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    iva_total = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    monto_total = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    
    # Porcentaje IVA - solo para validación, no se guarda en BD
    porcentaje_iva = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, write_only=True)

    # Retenciones
    monto_retencion_iva = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    monto_retencion_renta = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_retenciones = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    monto_neto_cobrar = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    # Display fields
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    tipo_operacion_display = serializers.CharField(source='get_tipo_operacion_display', read_only=True)

    # Métricas
    margen_bruto = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    porcentaje_margen = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    
    # Archivo PDF - NO devolver URL directa de Cloudinary, solo usar archivo_pdf_url
    archivo_pdf = serializers.FileField(required=False, allow_null=True, write_only=True)
    archivo_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = SalesInvoice
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'monto_pagado', 'monto_pendiente',
            'monto_retencion_iva', 'monto_retencion_renta', 'total_retenciones', 'monto_neto_cobrar',
            'margen_bruto', 'porcentaje_margen',
            'cliente_nombre', 'cliente_alias', 'ot_numero', 'ot_tipo_operacion',
            'cliente_tipo_contribuyente', 'cliente_nit', 'cliente_aplica_retencion_iva',
            'cliente_aplica_retencion_renta', 'tipo_documento_display', 'archivo_pdf_url'
        ]
    
    def get_archivo_pdf_url(self, obj):
        """
        Obtener URL del archivo PDF.
        IMPORTANTE: Retorna la URL del endpoint proxy (/file/) que maneja
        la descarga desde Cloudinary con autenticación.
        """
        if obj.archivo_pdf:
            try:
                # Usar el endpoint proxy en lugar de URL directa de Cloudinary
                # Esto evita problemas con archivos RAW que requieren autenticación
                request = self.context.get('request')
                if request:
                    from django.urls import reverse
                    return request.build_absolute_uri(
                        reverse('salesinvoice-retrieve-file', kwargs={'pk': obj.pk})
                    )
                else:
                    # Fallback si no hay request en el contexto
                    return f"/api/sales-invoices/{obj.pk}/file/"
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error generando URL para archivo PDF de factura {obj.numero_factura}: {e}")
                return None
        return None
    
    def validate(self, attrs):
        """
        Validación personalizada de cálculos de IVA y totales.
        
        NOTA: Para facturas internacionales, NO se valida el cálculo ya que
        no tienen subtotales ni IVA - el monto_total viene directo del PDF.
        """
        tipo_operacion = attrs.get('tipo_operacion', 'nacional')
        
        # ✅ SKIP validación para facturas internacionales
        # (no tienen impuestos, monto_total viene directo del PDF)
        if tipo_operacion == 'internacional':
            return attrs
        
        subtotal_gravado = attrs.get('subtotal_gravado', Decimal('0.00'))
        subtotal_exento = attrs.get('subtotal_exento', Decimal('0.00'))
        
        # Si hay subtotal gravado, debe haber % IVA
        if subtotal_gravado > 0:
            porcentaje_iva = attrs.get('porcentaje_iva')
            if porcentaje_iva is None:
                # Usar default de 13% si no se especificó
                attrs['porcentaje_iva'] = Decimal('13.00')
                porcentaje_iva = Decimal('13.00')
            
            # Calcular IVA esperado
            iva_calculado = subtotal_gravado * (porcentaje_iva / 100)
            
            # Verificar IVA (con tolerancia de $0.50 por redondeos)
            iva_reportado = attrs.get('iva_total', Decimal('0.00'))
            diferencia_iva = abs(iva_calculado - iva_reportado)
            
            if diferencia_iva > Decimal('0.50'):
                raise serializers.ValidationError({
                    'iva_total': f'El IVA calculado ({iva_calculado:.2f}) difiere significativamente del reportado ({iva_reportado:.2f}). Diferencia: ${diferencia_iva:.2f}'
                })
        
        # Validar total (con tolerancia)
        iva_total = attrs.get('iva_total', Decimal('0.00'))
        monto_total = attrs.get('monto_total', Decimal('0.00'))
        
        total_calculado = subtotal_gravado + subtotal_exento + iva_total
        diferencia_total = abs(total_calculado - monto_total)
        
        if diferencia_total > Decimal('0.50'):
            raise serializers.ValidationError({
                'monto_total': f'El total calculado ({total_calculado:.2f}) difiere del reportado ({monto_total:.2f}). Diferencia: ${diferencia_total:.2f}'
            })
        
        return attrs
    
    def create(self, validated_data):
        """
        Override create para:
        1. Remover porcentaje_iva (campo solo de validación)
        2. Asegurar valores correctos para facturas internacionales
        """
        # Remover porcentaje_iva si existe (es write_only, solo para validación)
        validated_data.pop('porcentaje_iva', None)
        
        # Para facturas internacionales, forzar subtotales e IVA a 0.00
        if validated_data.get('tipo_operacion') == 'internacional':
            validated_data['subtotal_gravado'] = Decimal('0.00')
            validated_data['subtotal_exento'] = Decimal('0.00')
            validated_data['iva_total'] = Decimal('0.00')
            # monto_total viene del PDF o ingresado manualmente
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Override update para:
        1. Remover porcentaje_iva (campo solo de validación)
        2. Asegurar valores correctos para facturas internacionales
        """
        # Remover porcentaje_iva si existe
        validated_data.pop('porcentaje_iva', None)
        
        # Para facturas internacionales, forzar subtotales e IVA a 0.00
        if validated_data.get('tipo_operacion', instance.tipo_operacion) == 'internacional':
            validated_data['subtotal_gravado'] = Decimal('0.00')
            validated_data['subtotal_exento'] = Decimal('0.00')
            validated_data['iva_total'] = Decimal('0.00')
        
        return super().update(instance, validated_data)


class CreditNoteSerializer(serializers.ModelSerializer):
    """Serializer para Notas de Crédito"""
    archivo_pdf = serializers.FileField(required=False, allow_null=True, write_only=True)
    archivo_pdf_url = serializers.SerializerMethodField()
    sales_invoice_numero = serializers.CharField(source='sales_invoice.numero_factura', read_only=True)
    
    class Meta:
        from .models import CreditNote
        model = CreditNote
        fields = [
            'id', 'sales_invoice', 'sales_invoice_numero',
            'numero_nota_credito', 'fecha_emision', 'monto', 'motivo',
            'archivo_pdf', 'archivo_pdf_url', 'notas',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'sales_invoice_numero', 'archivo_pdf_url']
    
    def get_archivo_pdf_url(self, obj):
        """
        Obtener URL del archivo PDF.
        IMPORTANTE: Retorna la URL del endpoint proxy (/file/) que maneja
        la descarga desde Cloudinary con autenticación.
        """
        if obj.archivo_pdf:
            try:
                # Usar el endpoint proxy en lugar de URL directa de Cloudinary
                request = self.context.get('request')
                if request:
                    from django.urls import reverse
                    return request.build_absolute_uri(
                        reverse('creditnote-retrieve-file', kwargs={'pk': obj.pk})
                    )
                else:
                    # Fallback si no hay request en el contexto
                    return f"/api/credit-notes/{obj.pk}/file/"
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error generando URL para archivo PDF de nota de crédito {obj.numero_nota_credito}: {e}")
                return None
        return None


class SalesInvoiceDetailSerializer(SalesInvoiceListSerializer):
    # Relaciones anidadas
    lineas = SalesInvoiceItemSerializer(many=True, read_only=True)
    cost_mappings = InvoiceSalesMappingSerializer(many=True, read_only=True)
    payments = PaymentListSerializer(many=True, read_only=True)
    credit_notes = CreditNoteSerializer(many=True, read_only=True)

    # OT completa con información útil
    ot_cliente_nombre = serializers.CharField(source='ot.cliente_nombre', read_only=True, allow_null=True)
    ot_estado = serializers.CharField(source='ot.estado', read_only=True, allow_null=True)
    ot_contenedor = serializers.CharField(source='ot.contenedor', read_only=True, allow_null=True)
    ot_mbl = serializers.CharField(source='ot.mbl', read_only=True, allow_null=True)


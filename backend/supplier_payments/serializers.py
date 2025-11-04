"""
Serializers para el módulo de Pagos a Proveedores.
"""

from rest_framework import serializers
from decimal import Decimal
from .models import SupplierPayment, SupplierPaymentLink
from invoices.models import Invoice
from catalogs.models import Provider


class SupplierPaymentLinkSerializer(serializers.ModelSerializer):
    """Serializer para el link pago -> factura"""

    invoice_numero = serializers.CharField(source='cost_invoice.numero_factura', read_only=True)
    invoice_proveedor = serializers.CharField(source='cost_invoice.proveedor_nombre', read_only=True)
    invoice_monto = serializers.DecimalField(
        source='cost_invoice.monto_aplicable',
        max_digits=15,
        decimal_places=2,
        read_only=True
    )
    invoice_ot = serializers.CharField(source='cost_invoice.ot_number', read_only=True)
    invoice_cliente = serializers.SerializerMethodField()
    invoice_tipo_costo = serializers.CharField(source='cost_invoice.tipo_costo', read_only=True)
    invoice_tipo_costo_display = serializers.CharField(source='cost_invoice.get_tipo_costo_display', read_only=True)

    class Meta:
        model = SupplierPaymentLink
        fields = [
            'id',
            'cost_invoice',
            'invoice_numero',
            'invoice_proveedor',
            'invoice_monto',
            'invoice_ot',
            'invoice_cliente',
            'invoice_tipo_costo',
            'invoice_tipo_costo_display',
            'monto_pagado_factura',
            'created_at'
        ]

    def get_invoice_cliente(self, obj):
        """Obtener nombre del cliente desde la OT de la factura"""
        if obj.cost_invoice and obj.cost_invoice.ot and obj.cost_invoice.ot.cliente:
            return obj.cost_invoice.ot.cliente.original_name
        return None


class SupplierPaymentSerializer(serializers.ModelSerializer):
    """Serializer para Pago a Proveedor"""

    # Campos de proveedor (read_only)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    proveedor_nit = serializers.CharField(source='proveedor.nit', read_only=True)

    # Usuario que registró (read_only)
    registrado_por_nombre = serializers.SerializerMethodField()

    # Archivo comprobante - NO devolver URL directa, solo usar archivo_comprobante_url
    archivo_comprobante = serializers.FileField(required=False, allow_null=True, write_only=True)
    tiene_archivo_comprobante = serializers.SerializerMethodField()

    # URL del comprobante (proxy endpoint)
    archivo_comprobante_url = serializers.SerializerMethodField()

    # Links de facturas (nested)
    invoice_links = SupplierPaymentLinkSerializer(many=True, read_only=True)

    # Campos write-only para crear links al mismo tiempo
    invoices_to_pay = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de {id: int, monto_a_pagar: decimal}"
    )

    class Meta:
        model = SupplierPayment
        fields = [
            'id',
            'proveedor',
            'proveedor_nombre',
            'proveedor_nit',
            'fecha_pago',
            'monto_total',
            'referencia',
            'archivo_comprobante',
            'tiene_archivo_comprobante',
            'archivo_comprobante_url',
            'notas',
            'registrado_por',
            'registrado_por_nombre',
            'invoice_links',
            'invoices_to_pay',
            'created_at',
            'updated_at',
            'is_deleted'
        ]
        read_only_fields = ['registrado_por', 'created_at', 'updated_at', 'tiene_archivo_comprobante', 'archivo_comprobante_url']

    def get_registrado_por_nombre(self, obj):
        if obj.registrado_por:
            # El modelo User personalizado solo tiene username, no first_name/last_name
            return obj.registrado_por.username
        return None

    def get_tiene_archivo_comprobante(self, obj):
        """Indica si el pago tiene un comprobante asociado"""
        return bool(obj.archivo_comprobante)

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
                        reverse('supplierpayment-retrieve-file', kwargs={'pk': obj.pk})
                    )
                else:
                    return f"/api/supplier-payments/{obj.pk}/file/"
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error generando URL para comprobante de pago a proveedor {obj.id}: {e}")
                return None
        return None

    def validate_invoices_to_pay(self, value):
        """
        Valida que las facturas a pagar sean correctas:
        1. Todas las facturas existen
        2. Todas pertenecen al mismo proveedor
        3. Los montos no exceden el pendiente de cada factura
        """
        if not value:
            raise serializers.ValidationError("Debe seleccionar al menos una factura para pagar.")

        invoice_ids = [item['id'] for item in value]
        invoices = Invoice.objects.filter(id__in=invoice_ids, is_deleted=False)

        if len(invoices) != len(invoice_ids):
            raise serializers.ValidationError("Algunas facturas no existen o están eliminadas.")

        # Validar que todas sean del mismo proveedor
        proveedores = set(inv.proveedor_id for inv in invoices if inv.proveedor_id)
        if len(proveedores) > 1:
            raise serializers.ValidationError("Todas las facturas deben pertenecer al mismo proveedor.")

        # Validar montos
        for item in value:
            invoice = invoices.get(id=item['id'])
            monto_a_pagar = Decimal(str(item['monto_a_pagar']))

            if monto_a_pagar <= 0:
                raise serializers.ValidationError(
                    f"El monto a pagar para la factura {invoice.numero_factura} debe ser mayor a 0."
                )

            if monto_a_pagar > invoice.monto_pendiente:
                raise serializers.ValidationError(
                    f"El monto a pagar para la factura {invoice.numero_factura} "
                    f"(${monto_a_pagar}) excede el monto pendiente (${invoice.monto_pendiente})."
                )

        return value

    def validate(self, attrs):
        """Validación global"""
        invoices_to_pay = attrs.get('invoices_to_pay', [])
        proveedor = attrs.get('proveedor')

        if invoices_to_pay and proveedor:
            # Validar que el proveedor del pago coincida con el de las facturas
            invoice_ids = [item['id'] for item in invoices_to_pay]
            invoices = Invoice.objects.filter(id__in=invoice_ids)

            for inv in invoices:
                if inv.proveedor_id != proveedor.id:
                    raise serializers.ValidationError(
                        f"La factura {inv.numero_factura} no pertenece al proveedor seleccionado."
                    )

        return attrs

    def create(self, validated_data):
        """
        Crea el pago y los links de forma transaccional.
        """
        from django.db import transaction

        invoices_to_pay = validated_data.pop('invoices_to_pay', [])

        with transaction.atomic():
            # 1. Crear el pago
            supplier_payment = SupplierPayment.objects.create(**validated_data)

            # 2. Crear los links
            total_pagado = Decimal('0.00')
            for item in invoices_to_pay:
                invoice = Invoice.objects.get(id=item['id'])
                monto = Decimal(str(item['monto_a_pagar']))

                SupplierPaymentLink.objects.create(
                    supplier_payment=supplier_payment,
                    cost_invoice=invoice,
                    monto_pagado_factura=monto
                )

                total_pagado += monto

            # 3. Actualizar monto_total si no se especificó
            if not supplier_payment.monto_total or supplier_payment.monto_total == 0:
                supplier_payment.monto_total = total_pagado
                supplier_payment.save(update_fields=['monto_total'])

        return supplier_payment

    def update(self, instance, validated_data):
        """
        Actualiza el pago. El monto_total NO se puede modificar porque está
        vinculado a las facturas pagadas. Solo se pueden editar: fecha, referencia y notas.
        """
        from django.db import transaction

        # No se permiten cambios en invoices_to_pay durante actualización
        validated_data.pop('invoices_to_pay', None)

        # No se permite cambiar el monto_total - es un campo calculado basado en los links
        if 'monto_total' in validated_data and validated_data['monto_total'] != instance.monto_total:
            raise serializers.ValidationError({
                'monto_total': 'El monto total del pago no se puede modificar. '
                              'Para cambiar el monto, debe eliminar el pago y crear uno nuevo.'
            })

        # Eliminar monto_total de los datos a actualizar para evitar conflictos
        validated_data.pop('monto_total', None)

        with transaction.atomic():
            # Actualizar solo campos editables: fecha_pago, referencia, notas
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

        return instance


class FacturaPendientePagoSerializer(serializers.ModelSerializer):
    """
    Serializer para facturas pendientes de pago (provisionadas).
    Usado en la vista de finanzas para seleccionar facturas a pagar.
    """

    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    proveedor_id = serializers.IntegerField(source='proveedor.id', read_only=True)
    tipo_costo_display = serializers.SerializerMethodField()
    dias_hasta_vencimiento = serializers.SerializerMethodField()
    esta_vencida = serializers.SerializerMethodField()
    ot_data = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'numero_factura',
            'proveedor_id',
            'proveedor_nombre',
            'ot_number',
            'ot_data',
            'fecha_emision',
            'fecha_vencimiento',
            'monto',
            'monto_aplicable',
            'monto_pagado',
            'monto_pendiente',
            'tipo_costo',
            'tipo_costo_display',
            'estado_provision',
            'estado_pago',
            'dias_hasta_vencimiento',
            'esta_vencida'
        ]

    def get_tipo_costo_display(self, obj):
        return obj.get_tipo_costo_display()

    def get_dias_hasta_vencimiento(self, obj):
        return obj.calcular_dias_hasta_vencimiento()

    def get_esta_vencida(self, obj):
        return obj.esta_vencida()

    def get_ot_data(self, obj):
        """Datos básicos de la OT para mostrar en el formulario de pago"""
        if obj.ot:
            return {
                'id': obj.ot.id,
                'numero_ot': obj.ot.numero_ot,
                'cliente': obj.ot.cliente.original_name if obj.ot.cliente else None,
            }
        return None

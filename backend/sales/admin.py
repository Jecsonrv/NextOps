from django.contrib import admin
from .models import SalesInvoice, InvoiceSalesMapping, Payment, CreditNote
from .models_items import SalesInvoiceItem


class SalesInvoiceItemInline(admin.TabularInline):
    """Inline para mostrar líneas de factura en el admin de SalesInvoice"""
    model = SalesInvoiceItem
    extra = 0
    fields = ['numero_linea', 'descripcion', 'concepto', 'tipo_servicio', 'cantidad', 'precio_unitario',
              'aplica_iva', 'subtotal', 'iva', 'total']
    readonly_fields = ['subtotal', 'iva', 'total']


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    list_display = ['numero_factura', 'tipo_documento', 'cliente', 'ot', 'fecha_emision',
                    'monto_total', 'total_retenciones', 'monto_neto_cobrar',
                    'estado_facturacion', 'estado_pago']
    list_filter = ['tipo_documento', 'estado_facturacion', 'estado_pago', 'aplica_retencion_iva',
                   'aplica_retencion_renta', 'fecha_emision']
    search_fields = ['numero_factura', 'cliente__short_name', 'cliente__nit', 'ot__numero_ot', 'autorizacion_sri']
    readonly_fields = ['monto_pagado', 'monto_pendiente', 'subtotal_gravado',
                       'subtotal_exento', 'iva_total', 'monto_retencion_iva',
                       'monto_retencion_renta', 'total_retenciones', 'monto_neto_cobrar',
                       'created_at', 'updated_at']
    date_hierarchy = 'fecha_emision'
    inlines = [SalesInvoiceItemInline]

    fieldsets = (
        ('Información General', {
            'fields': ('numero_factura', 'tipo_documento', 'cliente', 'ot', 'fecha_emision', 'fecha_vencimiento')
        }),
        ('Totales', {
            'fields': (
                'subtotal_gravado', 'subtotal_exento', 'iva_total', 'descuento', 'monto_total',
            ),
            'classes': ('wide',)
        }),
        ('Retenciones - El Salvador', {
            'fields': (
                'aplica_retencion_iva', 'monto_retencion_iva',
                'aplica_retencion_renta', 'porcentaje_retencion_renta', 'monto_retencion_renta',
                'total_retenciones', 'monto_neto_cobrar'
            ),
            'classes': ('collapse',)
        }),
        ('Estado y Pagos', {
            'fields': ('estado_facturacion', 'estado_pago', 'monto_pagado', 'monto_pendiente')
        }),
        ('Información Fiscal', {
            'fields': ('autorizacion_sri', 'clave_acceso'),
            'classes': ('collapse',)
        }),
        ('Archivos', {
            'fields': ('archivo_pdf',)
        }),
        ('Notas', {
            'fields': ('descripcion', 'notas'),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(InvoiceSalesMapping)
class InvoiceSalesMappingAdmin(admin.ModelAdmin):
    list_display = ['sales_invoice', 'cost_invoice', 'monto_asignado', 'porcentaje_markup', 'created_at']
    search_fields = ['sales_invoice__numero_factura', 'cost_invoice__numero_factura']

@admin.register(SalesInvoiceItem)
class SalesInvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['factura', 'numero_linea', 'descripcion', 'concepto', 'tipo_servicio',
                    'cantidad', 'precio_unitario', 'aplica_iva', 'iva', 'total']
    list_filter = ['concepto', 'tipo_servicio', 'aplica_iva', 'created_at']
    search_fields = ['factura__numero_factura', 'descripcion']
    readonly_fields = ['subtotal', 'iva', 'descuento_monto', 'total', 'created_at', 'updated_at']
    ordering = ['factura', 'numero_linea']

    fieldsets = (
        ('Factura', {
            'fields': ('factura', 'numero_linea')
        }),
        ('Descripción', {
            'fields': ('descripcion', 'concepto', 'tipo_servicio', 'notas')
        }),
        ('Cantidades y Precios', {
            'fields': ('cantidad', 'unidad_medida', 'precio_unitario', 'subtotal')
        }),
        ('IVA - El Salvador 13%', {
            'fields': ('aplica_iva', 'porcentaje_iva', 'iva', 'razon_exencion', 'codigo_exencion_sri')
        }),
        ('Descuentos', {
            'fields': ('descuento_porcentaje', 'descuento_monto')
        }),
        ('Total', {
            'fields': ('total',)
        }),
        ('Auditoría', {
            'fields': ('modificado_por', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['sales_invoice', 'fecha_pago', 'monto', 'metodo_pago', 'referencia', 'estado', 'registrado_por']
    list_filter = ['estado', 'metodo_pago', 'fecha_pago']
    search_fields = ['sales_invoice__numero_factura', 'referencia']
    readonly_fields = ['created_at', 'updated_at', 'fecha_validacion']


@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display = ['numero_nota_credito', 'sales_invoice', 'fecha_emision', 'monto', 'created_at']
    list_filter = ['fecha_emision', 'created_at']
    search_fields = ['numero_nota_credito', 'sales_invoice__numero_factura', 'motivo']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'fecha_emision'
    
    fieldsets = (
        ('Información General', {
            'fields': ('sales_invoice', 'numero_nota_credito', 'fecha_emision', 'monto')
        }),
        ('Motivo', {
            'fields': ('motivo', 'notas')
        }),
        ('Archivo', {
            'fields': ('archivo_pdf',)
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

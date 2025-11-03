"""
Admin para el módulo de Pagos a Proveedores.
"""

from django.contrib import admin
from .models import SupplierPayment, SupplierPaymentLink


@admin.register(SupplierPayment)
class SupplierPaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'proveedor', 'fecha_pago', 'monto_total', 'referencia', 'registrado_por']
    list_filter = ['fecha_pago', 'proveedor']
    search_fields = ['referencia', 'notas', 'proveedor__nombre']
    date_hierarchy = 'fecha_pago'
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Información del Pago', {
            'fields': ('proveedor', 'fecha_pago', 'monto_total', 'referencia')
        }),
        ('Detalles', {
            'fields': ('archivo_comprobante', 'notas')
        }),
        ('Auditoría', {
            'fields': ('registrado_por', 'created_at', 'updated_at')
        }),
    )


@admin.register(SupplierPaymentLink)
class SupplierPaymentLinkAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier_payment', 'cost_invoice', 'monto_pagado_factura', 'created_at']
    list_filter = ['created_at']
    search_fields = ['supplier_payment__referencia', 'cost_invoice__numero_factura']
    readonly_fields = ['created_at', 'updated_at']

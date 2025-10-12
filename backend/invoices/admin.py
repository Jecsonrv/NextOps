"""
Configuración del Admin de Django para el módulo de Invoices.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Invoice, UploadedFile, Dispute, CreditNote, DisputeEvent


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    """Admin para archivos subidos"""
    
    list_display = [
        'id',
        'filename_display',
        'size_mb',
        'content_type',
        'hash_short',
        'created_at',
    ]
    
    list_filter = ['content_type', 'created_at']
    
    search_fields = ['filename', 'sha256']
    
    readonly_fields = ['sha256', 'size', 'created_at', 'path']
    
    def filename_display(self, obj):
        """Nombre del archivo con link"""
        return format_html(
            '<a href="/media/{}" target="_blank">{}</a>',
            obj.path,
            obj.filename
        )
    filename_display.short_description = 'Archivo'
    
    def size_mb(self, obj):
        """Tamaño en MB"""
        return f"{obj.size / (1024 * 1024):.2f} MB"
    size_mb.short_description = 'Tamaño'
    
    def hash_short(self, obj):
        """Hash resumido"""
        return f"{obj.sha256[:16]}..."
    hash_short.short_description = 'Hash (SHA256)'


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin para facturas"""
    
    list_display = [
        'id',
        'numero_factura',
        'fecha_emision',
        'monto_display',
        'proveedor_nombre_short',
        'ot_link',
        'estado_provision_badge',
        'estado_facturacion_badge',
        'revision_badge',
        'confidence_badge',
        'created_at',
    ]
    
    list_filter = [
        'estado_provision',
        'estado_facturacion',
        'requiere_revision',
        'tipo_costo',
        'tipo_proveedor',
        'assignment_method',
        'processing_source',
        'fecha_emision',
        'created_at',
    ]
    
    search_fields = [
        'numero_factura',
        'proveedor_nombre',
        'proveedor_nit',
        'ot_number',
        'notas',
    ]
    
    readonly_fields = [
        'id',
        'uploaded_file_link',
        'file_preview',
        'ot_link',
        'confianza_match',
        'assignment_method',
        'referencias_detectadas',
        'processed_at',
        'processed_by',
        'processing_source',
        'created_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': (
                'numero_factura',
                'fecha_emision',
                'fecha_vencimiento',
                'monto',
                'tipo_costo',
            )
        }),
        ('Proveedor', {
            'fields': (
                'proveedor',
                'proveedor_nombre',
                'proveedor_nit',
                'tipo_proveedor',
                'proveedor_categoria',
            )
        }),
        ('Vinculación con OT', {
            'fields': (
                'ot',
                'ot_link',
                'ot_number',
                'assignment_method',
                'confianza_match',
                'requiere_revision',
            )
        }),
        ('Estados', {
            'fields': (
                'estado_provision',
                'fecha_provision',
                'estado_facturacion',
                'fecha_facturacion',
            )
        }),
        ('Archivo', {
            'fields': (
                'uploaded_file',
                'uploaded_file_link',
                'file_preview',
            )
        }),
        ('Detección Automática', {
            'classes': ('collapse',),
            'fields': (
                'referencias_detectadas',
            )
        }),
        ('Procesamiento', {
            'classes': ('collapse',),
            'fields': (
                'processed_at',
                'processed_by',
                'processing_source',
            )
        }),
        ('Metadata', {
            'classes': ('collapse',),
            'fields': (
                'notas',
                'created_at',
                'updated_at',
            )
        }),
    )
    
    def monto_display(self, obj):
        """Monto formateado"""
        return f"${obj.monto:,.2f}"
    monto_display.short_description = 'Monto (USD)'
    monto_display.admin_order_field = 'monto'
    
    def proveedor_nombre_short(self, obj):
        """Nombre del proveedor resumido"""
        if len(obj.proveedor_nombre) > 30:
            return f"{obj.proveedor_nombre[:27]}..."
        return obj.proveedor_nombre
    proveedor_nombre_short.short_description = 'Proveedor'
    proveedor_nombre_short.admin_order_field = 'proveedor_nombre'
    
    def ot_link(self, obj):
        """Link a la OT"""
        if obj.ot:
            url = reverse('admin:ots_ot_change', args=[obj.ot.id])
            return format_html('<a href="{}">{}</a>', url, obj.ot.numero_ot)
        elif obj.ot_number:
            return format_html('<span style="color: orange;">{} (no encontrada)</span>', obj.ot_number)
        return format_html('<span style="color: gray;">Sin OT</span>')
    ot_link.short_description = 'OT'
    
    def estado_provision_badge(self, obj):
        """Badge para estado de provisión"""
        colors = {
            'pendiente': '#6c757d',
            'provisionada': '#198754',
            'revision': '#ffc107',
            'disputada': '#dc3545',
            'rechazada': '#dc3545',
        }
        color = colors.get(obj.estado_provision, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_estado_provision_display()
        )
    estado_provision_badge.short_description = 'Provisión'
    
    def estado_facturacion_badge(self, obj):
        """Badge para estado de facturación"""
        colors = {
            'pendiente': 'gray',
            'facturada': 'green',
        }
        color = colors.get(obj.estado_facturacion, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_estado_facturacion_display()
        )
    estado_facturacion_badge.short_description = 'Facturación'
    
    def revision_badge(self, obj):
        """Badge para indicar si requiere revisión"""
        if obj.requiere_revision:
            return format_html(
                '<span style="background-color: orange; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">⚠ Revisar</span>'
            )
        return format_html(
            '<span style="background-color: green; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">✓ OK</span>'
        )
    revision_badge.short_description = 'Revisión'
    
    def confidence_badge(self, obj):
        """Badge para nivel de confianza"""
        confidence = float(obj.confianza_match)
        if confidence >= 0.9:
            color = 'green'
            label = 'Alta'
        elif confidence >= 0.7:
            color = 'orange'
            label = 'Media'
        elif confidence >= 0.5:
            color = 'red'
            label = 'Baja'
        else:
            color = 'gray'
            label = 'N/A'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            label
        )
    confidence_badge.short_description = 'Confianza'
    
    def uploaded_file_link(self, obj):
        """Link al archivo"""
        if obj.uploaded_file:
            url = f"/media/{obj.uploaded_file.path}"
            return format_html(
                '<a href="{}" target="_blank">Ver archivo ({})</a>',
                url,
                obj.uploaded_file.content_type
            )
        return '-'
    uploaded_file_link.short_description = 'Archivo'
    
    def file_preview(self, obj):
        """Preview del archivo (solo para imágenes)"""
        if obj.uploaded_file and obj.uploaded_file.content_type.startswith('image/'):
            url = f"/media/{obj.uploaded_file.path}"
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 400px;" />',
                url
            )
        return '-'
    file_preview.short_description = 'Vista previa'
    
    def get_queryset(self, request):
        """Optimizar queries"""
        qs = super().get_queryset(request)
        return qs.select_related('ot', 'proveedor', 'uploaded_file')


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    """Admin para disputas"""

    list_display = [
        'numero_caso',
        'invoice',
        'ot',
        'tipo_disputa',
        'estado',
        'operativo',
        'monto_disputa',
        'created_at',
    ]

    list_filter = ['estado', 'tipo_disputa', 'created_at']

    search_fields = ['numero_caso', 'detalle', 'operativo', 'invoice__numero_factura', 'ot__numero_ot']

    readonly_fields = ['created_at', 'updated_at']


@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    """Admin para notas de crédito"""
    
    list_display = [
        'numero_nota',
        'proveedor_nombre',
        'invoice_relacionada',
        'fecha_emision',
        'monto',
        'estado',
        'created_at',
    ]
    
    list_filter = ['estado', 'fecha_emision', 'created_at']
    
    search_fields = ['numero_nota', 'proveedor_nombre', 'motivo']
    
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DisputeEvent)
class DisputeEventAdmin(admin.ModelAdmin):
    """Admin para eventos de disputas"""

    list_display = [
        'dispute',
        'tipo',
        'descripcion_short',
        'usuario',
        'created_at',
    ]

    list_filter = ['tipo', 'created_at']

    search_fields = ['dispute__numero_caso', 'descripcion', 'usuario']

    readonly_fields = ['created_at', 'updated_at']

    def descripcion_short(self, obj):
        if len(obj.descripcion) > 50:
            return f"{obj.descripcion[:47]}..."
        return obj.descripcion
    descripcion_short.short_description = 'Descripción'

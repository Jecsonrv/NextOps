"""
Configuración del admin para Órdenes de Trabajo (OTs).
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import OT


@admin.register(OT)
class OTAdmin(admin.ModelAdmin):
    """Admin para gestión de OTs"""
    
    list_display = [
        'numero_ot_display',
        'operativo',
        'cliente_display',
        'proveedor',
        'tipo_embarque',
        'master_bl',
        'contenedores_count',
        'estado_badge',
        'estado_facturado_badge',
        'estado_provision_badge',
        'fecha_eta',
        'provision_total_display',
        'created_at',
    ]
    
    list_filter = [
        'estado',
        'estado_facturado',
        'estado_provision',
        'operativo',
        'tipo_embarque',
        'proveedor',
        'puerto_destino',
        'provision_source',
        'provision_locked',
        'fecha_eta',
        'created_at',
    ]
    
    search_fields = [
        'numero_ot',
        'master_bl',
        'house_bls',
        'operativo',
        'barco',
        'notas',
        'comentarios',
        'cliente__original_name',
        'proveedor__nombre',
    ]
    
    readonly_fields = [
        'contenedores_display',
        'house_bls_display',
        'provision_display',
        'tiempo_transito_display',
        'estado_facturado',
        'estado_provision',
        'modificado_por',
        'created_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': (
                'numero_ot',
                'estado',
                'proveedor',
                'cliente',
            )
        }),
        ('Operativo y Embarque', {
            'fields': (
                'operativo',
                'tipo_embarque',
                'barco',
            ),
            'description': 'Información sobre el responsable y tipo de embarque'
        }),
        ('Detalles de Envío', {
            'fields': (
                'master_bl',
                'house_bls',
                'house_bls_display',
                'fecha_eta',
                'etd',
                'fecha_llegada',
                'tiempo_transito_display',
                'puerto_origen',
                'puerto_destino',
            )
        }),
        ('Contenedores', {
            'fields': (
                'contenedores',
                'contenedores_display',
            ),
            'description': 'Lista de contenedores en formato JSON: [{"numero": "MSCU123", "tipo": "40HC", "peso": 25000, "sello": "ABC123"}]'
        }),
        ('Express Release y Contra Entrega', {
            'fields': (
                'express_release_tipo',
                'express_release_fecha',
                'contra_entrega_tipo',
                'contra_entrega_fecha',
            ),
            'classes': ('collapse',),
        }),
        ('Facturación', {
            'fields': (
                'fecha_solicitud_facturacion',
                'fecha_recepcion_factura',
                'estado_facturado',
            ),
            'description': 'Estado de facturación (se calcula automáticamente)'
        }),
        ('Provisiones', {
            'fields': (
                'fecha_provision',
                'provision_source',
                'provision_locked',
                'provision_updated_by',
                'estado_provision',
                'provision_hierarchy',
                'provision_display',
            ),
            'description': 'Jerarquía de provisiones (MANUAL > CSV > EXCEL). Provisiones bloqueadas no pueden ser sobrescritas por imports.'
        }),
        ('Otros Datos', {
            'fields': (
                'envio_cierre_ot',
                'notas',
                'comentarios',
                'modificado_por',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )
    
    def numero_ot_display(self, obj):
        """Mostrar número de OT con enlace"""
        url = reverse('admin:ots_ot_change', args=[obj.pk])
        return format_html(
            '<a href="{}" style="font-weight: bold; font-family: monospace;">{}</a>',
            url,
            obj.numero_ot
        )
    numero_ot_display.short_description = 'Número OT'
    
    def cliente_display(self, obj):
        """Mostrar cliente con bandera de país"""
        if not obj.cliente:
            return '-'
        
        flags = {
            'GT': '🇬🇹',
            'SV': '🇸🇻',
            'NI': '🇳🇮',
            'HN': '🇭🇳',
            'CR': '🇨🇷',
            'PA': '🇵🇦',
        }
        
        flag = flags.get(obj.cliente.country, '')
        return format_html(
            '{} {}',
            flag,
            obj.cliente.original_name[:40]
        )
    cliente_display.short_description = 'Cliente'
    
    def contenedores_count(self, obj):
        """Contador de contenedores con badge"""
        count = obj.get_total_contenedores()
        
        if count == 0:
            color = '#ccc'
        elif count <= 2:
            color = '#28a745'
        elif count <= 5:
            color = '#ffc107'
        else:
            color = '#dc3545'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 10px; font-weight: bold;">{}</span>',
            color,
            count
        )
    contenedores_count.short_description = '📦 Contenedores'
    
    def estado_badge(self, obj):
        """Badge colorido para el estado"""
        estado_config = {
            'pendiente': ('⏳', '#6c757d', 'Pendiente'),
            'en_transito': ('🚢', '#007bff', 'En Tránsito'),
            'puerto': ('⚓', '#17a2b8', 'En Puerto'),
            'entregado': ('✅', '#28a745', 'Entregado'),
            'facturado': ('💰', '#ffc107', 'Facturado'),
            'cerrado': ('🔒', '#6c757d', 'Cerrado'),
            'cancelado': ('❌', '#dc3545', 'Cancelado'),
        }
        
        emoji, color, label = estado_config.get(
            obj.estado,
            ('?', '#ccc', obj.get_estado_display())
        )
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 12px; border-radius: 5px; font-weight: bold;">{} {}</span>',
            color,
            emoji,
            label
        )
    estado_badge.short_description = 'Estado'
    
    def provision_total_display(self, obj):
        """Mostrar total de provisiones formateado"""
        total = obj.get_provision_total()
        
        if total == 0:
            return format_html(
                '<span style="color: #ccc;">$0.00</span>'
            )
        
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">${:,.2f}</span>',
            total
        )
    provision_total_display.short_description = '💵 Provisión Total'
    
    def contenedores_display(self, obj):
        """Mostrar lista de contenedores formateada"""
        if not obj.contenedores:
            return format_html('<em style="color: #ccc;">Sin contenedores</em>')
        
        html_parts = ['<ul style="margin: 0; padding-left: 20px;">']
        
        for numero in obj.get_contenedores_numeros():
            html_parts.append(f'<li><strong>{numero}</strong></li>')
        
        html_parts.append('</ul>')
        
        return format_html(''.join(html_parts))
    contenedores_display.short_description = 'Contenedores (detalle)'
    
    def house_bls_display(self, obj):
        """Mostrar lista de House BLs"""
        if not obj.house_bls:
            return format_html('<em style="color: #ccc;">Sin House BLs</em>')
        
        html_parts = ['<ul style="margin: 0; padding-left: 20px;">']
        for bl in obj.house_bls:
            html_parts.append(f'<li><code>{bl}</code></li>')
        html_parts.append('</ul>')
        
        return format_html(''.join(html_parts))
    house_bls_display.short_description = 'House BLs (lista)'
    
    def provision_display(self, obj):
        """Mostrar provisiones formateadas"""
        hierarchy = obj.provision_hierarchy
        
        if not hierarchy or not hierarchy.get('items'):
            return format_html('<em style="color: #ccc;">Sin provisiones</em>')
        
        total = hierarchy.get('total', 0)
        items = hierarchy.get('items', [])
        
        html_parts = [
            f'<div style="padding: 10px; background-color: #f8f9fa; border-radius: 5px;">',
            f'<div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Total: <span style="color: #28a745;">${total:,.2f}</span></div>',
            '<table style="width: 100%; border-collapse: collapse;">',
            '<thead><tr style="background-color: #e9ecef;">',
            '<th style="padding: 5px; text-align: left;">Concepto</th>',
            '<th style="padding: 5px; text-align: right;">Monto</th>',
            '<th style="padding: 5px; text-align: center;">Categoría</th>',
            '</tr></thead>',
            '<tbody>'
        ]
        
        for item in items:
            concepto = item.get('concepto', '?')
            monto = item.get('monto', 0)
            categoria = item.get('categoria', 'otros')
            
            html_parts.append(
                f'<tr style="border-bottom: 1px solid #dee2e6;">'
                f'<td style="padding: 5px;">{concepto}</td>'
                f'<td style="padding: 5px; text-align: right; font-family: monospace;">${monto:,.2f}</td>'
                f'<td style="padding: 5px; text-align: center;"><span style="background-color: #007bff; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">{categoria}</span></td>'
                f'</tr>'
            )
        
        html_parts.append('</tbody></table></div>')
        
        return format_html(''.join(html_parts))
    provision_display.short_description = 'Provisiones (detalle)'
    
    def estado_facturado_badge(self, obj):
        """Badge para estado de facturación"""
        estado_config = {
            'pendiente': ('⏳', '#6c757d', 'Pendiente'),
            'facturado': ('✅', '#28a745', 'Facturado'),
        }
        
        emoji, color, label = estado_config.get(
            obj.estado_facturado,
            ('?', '#ccc', obj.get_estado_facturado_display())
        )
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 5px; font-size: 11px;">{} {}</span>',
            color,
            emoji,
            label
        )
    estado_facturado_badge.short_description = '💰 Facturación'
    
    def estado_provision_badge(self, obj):
        """Badge para estado de provisión"""
        estado_config = {
            'pendiente': ('⏳', '#6c757d', 'Pendiente'),
            'provisionada': ('✅', '#28a745', 'Provisionada'),
            'revision': ('⚠️', '#ffc107', 'Revisión'),
            'disputada': ('❌', '#dc3545', 'Disputada'),
        }
        
        emoji, color, label = estado_config.get(
            obj.estado_provision,
            ('?', '#ccc', obj.get_estado_provision_display())
        )
        
        # Agregar indicador de locked
        locked_indicator = ''
        if obj.provision_locked:
            locked_indicator = ' 🔒'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 5px; font-size: 11px;">{} {}{}</span>',
            color,
            emoji,
            label,
            locked_indicator
        )
    estado_provision_badge.short_description = '📊 Provisión'
    
    def tiempo_transito_display(self, obj):
        """Mostrar tiempo de tránsito calculado"""
        return obj.get_tiempo_transito_display()
    tiempo_transito_display.short_description = 'Tiempo Tránsito'
    
    def get_queryset(self, request):
        """Optimizar queryset con select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('proveedor', 'cliente', 'modificado_por')
    
    def save_model(self, request, obj, form, change):
        """Registrar usuario que modifica"""
        if request.user:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)

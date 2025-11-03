"""
Admin para gestión de aliases de clientes y sugerencias de similitud.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import ClientAlias, SimilarityMatch


@admin.register(ClientAlias)
class ClientAliasAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'original_name',
        'nit',
        'tipo_contribuyente',
        'provider_link',
        'usage_badge',
        'verified_badge',
        'merged_badge',
        'created_at'
    ]

    list_filter = [
        'tipo_contribuyente',
        'aplica_retencion_iva',
        'aplica_retencion_renta',
        'acepta_credito_fiscal',
        'is_verified',
        'provider',
        ('merged_into', admin.EmptyFieldListFilter),
        'created_at'
    ]

    search_fields = [
        'original_name',
        'normalized_name',
        'nit',
        'nrc',
        'notes'
    ]
    
    readonly_fields = [
        'id',
        'normalized_name',
        'usage_count',
        'verified_by',
        'verified_at',
        'created_at',
        'updated_at',
        'merged_aliases_display',
        'similar_suggestions_display'
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': (
                'id',
                'original_name',
                'normalized_name',
                'short_name'
            )
        }),
        ('Información Tributaria - El Salvador', {
            'fields': (
                'tipo_contribuyente',
                'nit',
                'nrc',
                'actividad_economica',
                'acepta_credito_fiscal'
            ),
            'classes': ('wide',)
        }),
        ('Retenciones', {
            'fields': (
                'aplica_retencion_iva',
                'aplica_retencion_renta',
                'porcentaje_retencion_renta'
            ),
            'classes': ('wide',)
        }),
        ('Información de Contacto', {
            'fields': (
                'direccion_fiscal',
                'telefono',
                'email_facturacion'
            ),
            'classes': ('collapse',)
        }),
        ('Asociaciones', {
            'fields': (
                'provider',
                'merged_into',
                'merged_aliases_display'
            )
        }),
        ('Verificación', {
            'fields': (
                'is_verified',
                'verified_by',
                'verified_at',
                'notes'
            )
        }),
        ('Estadísticas', {
            'fields': (
                'usage_count',
                'similar_suggestions_display'
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': (
                'created_at',
                'updated_at',
                'deleted_at'
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """Incluir soft deleted para que el admin pueda verlos"""
        return ClientAlias.all_objects.all()

    def provider_link(self, obj):
        """Link al proveedor"""
        if obj.provider:
            url = reverse('admin:catalogs_provider_change', args=[obj.provider.id])
            return format_html('<a href="{}">{}</a>', url, obj.provider.name)
        return '-'
    provider_link.short_description = 'Proveedor'
    
    def usage_badge(self, obj):
        """Badge con contador de uso"""
        color = 'green' if obj.usage_count > 10 else 'orange' if obj.usage_count > 0 else 'gray'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 10px; font-weight: bold;">{}</span>',
            color,
            obj.usage_count
        )
    usage_badge.short_description = 'Usos'
    
    def verified_badge(self, obj):
        """Badge de verificación"""
        if obj.is_verified:
            return format_html(
                '<span style="color: green;" title="Verificado por: {}">✓ Verificado</span>',
                obj.verified_by.get_full_name() if obj.verified_by else 'Sistema'
            )
        return format_html('<span style="color: gray;">⊘ No verificado</span>')
    verified_badge.short_description = 'Verificación'
    
    def merged_badge(self, obj):
        """Badge de fusión"""
        if obj.merged_into:
            url = reverse('admin:client_aliases_clientalias_change', args=[obj.merged_into.id])
            return format_html(
                '<span style="color: orange;">🔗 → <a href="{}">{}</a></span>',
                url,
                obj.merged_into.original_name[:30]
            )
        
        merged_count = obj.merged_aliases.filter(deleted_at__isnull=True).count()
        if merged_count > 0:
            return format_html(
                '<span style="color: blue;" title="{} aliases fusionados">📦 Principal ({})</span>',
                merged_count,
                merged_count
            )
        
        return '-'
    merged_badge.short_description = 'Estado de Fusión'
    
    def merged_aliases_display(self, obj):
        """Muestra aliases fusionados hacia este"""
        if obj.merged_into:
            return format_html(
                '<em>Este alias está fusionado hacia otro. '
                'No puede tener aliases fusionados hacia él.</em>'
            )
        
        merged = obj.merged_aliases.filter(deleted_at__isnull=True)
        if not merged:
            return format_html('<em>Ninguno</em>')
        
        html = '<ul style="margin: 0; padding-left: 20px;">'
        for alias in merged[:10]:
            url = reverse('admin:client_aliases_clientalias_change', args=[alias.id])
            html += f'<li><a href="{url}">{alias.original_name}</a> (usos: {alias.usage_count})</li>'
        html += '</ul>'
        
        if merged.count() > 10:
            html += f'<em>... y {merged.count() - 10} más</em>'
        
        return mark_safe(html)
    merged_aliases_display.short_description = 'Aliases fusionados hacia este'
    
    def similar_suggestions_display(self, obj):
        """Muestra sugerencias de similitud pendientes"""
        from django.db.models import Q
        
        suggestions = SimilarityMatch.objects.filter(
            Q(alias_1=obj) | Q(alias_2=obj),
            status='pending'
        ).order_by('-similarity_score')[:5]
        
        if not suggestions:
            return format_html('<em>No hay sugerencias pendientes</em>')
        
        html = '<ul style="margin: 0; padding-left: 20px;">'
        for sugg in suggestions:
            other = sugg.alias_2 if sugg.alias_1 == obj else sugg.alias_1
            url = reverse('admin:client_aliases_similaritymatch_change', args=[sugg.id])
            html += (
                f'<li><a href="{url}">{other.original_name}</a> '
                f'<span style="color: orange;">({sugg.similarity_score:.1f}%)</span></li>'
            )
        html += '</ul>'
        
        return mark_safe(html)
    similar_suggestions_display.short_description = 'Sugerencias de similitud'


@admin.register(SimilarityMatch)
class SimilarityMatchAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'alias_1_link',
        'similarity_arrow',
        'alias_2_link',
        'score_badge',
        'status_badge',
        'reviewed_by_display',
        'created_at'
    ]
    
    list_filter = [
        'status',
        'detection_method',
        'reviewed_by',
        'created_at'
    ]
    
    search_fields = [
        'alias_1__original_name',
        'alias_2__original_name',
        'review_notes'
    ]
    
    readonly_fields = [
        'id',
        'similarity_score',
        'detection_method',
        'reviewed_by',
        'reviewed_at',
        'created_at'
    ]
    
    fieldsets = (
        ('Aliases Comparados', {
            'fields': (
                'id',
                'alias_1',
                'alias_2'
            )
        }),
        ('Similitud', {
            'fields': (
                'similarity_score',
                'detection_method'
            )
        }),
        ('Decisión', {
            'fields': (
                'status',
                'reviewed_by',
                'reviewed_at',
                'review_notes'
            )
        }),
        ('Metadata', {
            'fields': (
                'created_at',
            ),
            'classes': ('collapse',)
        })
    )
    
    def alias_1_link(self, obj):
        """Link al primer alias"""
        url = reverse('admin:client_aliases_clientalias_change', args=[obj.alias_1.id])
        return format_html('<a href="{}">{}</a>', url, obj.alias_1.original_name[:40])
    alias_1_link.short_description = 'Alias 1'
    
    def similarity_arrow(self, obj):
        """Flecha de similitud"""
        return '≈'
    similarity_arrow.short_description = ''
    
    def alias_2_link(self, obj):
        """Link al segundo alias"""
        url = reverse('admin:client_aliases_clientalias_change', args=[obj.alias_2.id])
        return format_html('<a href="{}">{}</a>', url, obj.alias_2.original_name[:40])
    alias_2_link.short_description = 'Alias 2'
    
    def score_badge(self, obj):
        """Badge con score de similitud"""
        if obj.similarity_score >= 95:
            color = '#d32f2f'  # Rojo - muy similar
        elif obj.similarity_score >= 85:
            color = '#f57c00'  # Naranja - bastante similar
        elif obj.similarity_score >= 75:
            color = '#fbc02d'  # Amarillo - algo similar
        else:
            color = '#757575'  # Gris - poco similar
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; '
            'border-radius: 12px; font-weight: bold; font-size: 0.9em;">{:.1f}%</span>',
            color,
            obj.similarity_score
        )
    score_badge.short_description = 'Similitud'
    
    def status_badge(self, obj):
        """Badge con estado"""
        status_config = {
            'pending': ('⏳ Pendiente', '#ff9800'),
            'approved': ('✓ Aprobado', '#4caf50'),
            'rejected': ('✗ Rechazado', '#f44336'),
            'ignored': ('⊘ Ignorado', '#9e9e9e'),
        }
        
        text, color = status_config.get(obj.status, ('?', 'gray'))
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 10px; font-size: 0.85em;">{}</span>',
            color,
            text
        )
    status_badge.short_description = 'Estado'
    
    def reviewed_by_display(self, obj):
        """Muestra quién revisó"""
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name()
        return '-'
    reviewed_by_display.short_description = 'Revisado por'

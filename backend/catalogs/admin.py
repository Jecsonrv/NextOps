from django.contrib import admin
from .models import Provider, CostType, CostCategory, InvoicePatternCatalog


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    """
    Configuración del admin para Proveedores
    """
    list_display = [
        'nombre',
        'nit',
        'tipo',
        'categoria',
        'email',
        'telefono',
        'is_active',
        'created_at',
    ]
    
    list_filter = [
        'tipo',
        'categoria',
        'is_active',
        'created_at',
    ]
    
    search_fields = [
        'nombre',
        'nit',
        'email',
        'contacto',
    ]
    
    ordering = ['nombre']
    
    readonly_fields = ['created_at', 'updated_at', 'deleted_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'nit', 'tipo', 'categoria')
        }),
        ('Información de Contacto', {
            'fields': ('email', 'telefono', 'direccion', 'contacto')
        }),
        ('Información Adicional', {
            'fields': ('notas', 'is_active')
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """
        Mostrar también los proveedores eliminados (soft delete)
        """
        return Provider.objects.all()


class InvoicePatternChildInline(admin.TabularInline):
    """
    Inline para mostrar patrones hijos de un grupo
    """
    model = InvoicePatternCatalog
    fk_name = 'grupo_padre'
    extra = 0
    fields = ['nombre', 'campo_objetivo', 'patron_regex', 'prioridad', 'activo', 'uso_count', 'tasa_exito']
    readonly_fields = ['uso_count', 'tasa_exito']
    verbose_name = 'Patrón Individual'
    verbose_name_plural = 'Patrones Individuales del Grupo'


@admin.register(InvoicePatternCatalog)
class InvoicePatternCatalogAdmin(admin.ModelAdmin):
    """
    Configuración del admin para Patrones de Facturas - Sistema Unificado
    
    Soporta:
    - Grupos (es_grupo_principal=True): Agrupan patrones por proveedor/documento
    - Patrones individuales (es_grupo_principal=False): Regex por campo específico
    """
    list_display = [
        'get_tipo_icon',
        'nombre',
        'tipo_patron',
        'tipo_factura',
        'proveedor',
        'campo_objetivo',
        'activo',
        'prioridad',
        'uso_count',
        'get_tasa_exito_display',
        'created_at',
    ]
    
    list_filter = [
        'tipo_patron',
        'tipo_factura',
        'es_grupo_principal',
        'proveedor',
        'activo',
        'permite_iva_mixto',
        'created_at',
    ]
    
    search_fields = [
        'nombre',
        'notas',
        'campo_objetivo',
        'tipo_documento',
        'proveedor__nombre',
    ]
    
    ordering = ['tipo_patron', '-es_grupo_principal', 'prioridad', 'nombre']
    
    readonly_fields = ['created_at', 'updated_at', 'deleted_at', 'uso_count', 'exito_count', 'ultima_uso', 'tasa_exito']
    
    inlines = []  # Se agregará condicionalmente en get_inline_instances
    
    fieldsets = (
        ('🎯 Tipo de Patrón', {
            'fields': ('es_grupo_principal', 'tipo_patron', 'tipo_factura', 'activo', 'prioridad'),
            'description': 'Grupo = Contenedor de patrones | Patrón Individual = Regex específico'
        }),
        ('📦 Agrupación (Para Grupos)', {
            'fields': ('proveedor', 'tipo_documento', 'grupo_padre'),
            'classes': ('collapse',),
            'description': 'Solo para grupos: proveedor (COSTO) o tipo_documento (VENTA)'
        }),
        ('🎯 Patrón Individual', {
            'fields': ('campo_objetivo', 'patron_regex', 'case_sensitive'),
            'classes': ('collapse',),
            'description': 'Solo para patrones individuales: campo específico y su regex'
        }),
        ('📋 Información Básica', {
            'fields': ('nombre', 'notas')
        }),
        ('📊 Estadísticas de Uso', {
            'fields': ('uso_count', 'exito_count', 'tasa_exito', 'ultima_uso'),
            'classes': ('collapse',),
            'description': 'Estadísticas automáticas de uso del patrón'
        }),
        ('🧪 Pruebas', {
            'fields': ('casos_prueba', 'ejemplo_texto'),
            'classes': ('collapse',),
            'description': 'Casos de prueba JSON y ejemplos de texto'
        }),
        ('🔧 Patrones Legacy (Regex)', {
            'fields': (
                'patron_numero_factura',
                'patron_numero_control',
                'patron_fecha_emision',
                'patron_nit_emisor',
                'patron_nombre_emisor',
                'patron_nit_cliente',
                'patron_nombre_cliente',
                'patron_subtotal_gravado',
                'patron_subtotal_exento',
                'patron_otros_montos',
                'patron_subtotal',
                'patron_iva',
                'patron_total',
                'patron_retencion_iva',
                'patron_retencion_renta',
                'patron_retencion',
            ),
            'classes': ('collapse',),
            'description': '⚠️ Campos legacy - Usar patron_regex + campo_objetivo en nuevos patrones'
        }),
        ('💰 Configuración de IVA', {
            'fields': ('porcentaje_iva_default', 'permite_iva_mixto'),
            'classes': ('collapse',)
        }),
        ('📅 Metadatos', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_inline_instances(self, request, obj=None):
        """
        Mostrar inline de patrones hijos solo si es un grupo
        """
        if obj and obj.es_grupo_principal:
            self.inlines = [InvoicePatternChildInline]
        else:
            self.inlines = []
        return super().get_inline_instances(request, obj)
    
    def get_tipo_icon(self, obj):
        """Mostrar emoji según tipo"""
        if obj.es_grupo_principal:
            return '📦 GRUPO'
        return '🎯 Patrón'
    get_tipo_icon.short_description = 'Tipo'
    
    def get_tasa_exito_display(self, obj):
        """Mostrar tasa de éxito con color"""
        tasa = obj.tasa_exito
        if tasa >= 80:
            return f'✅ {tasa}%'
        elif tasa >= 50:
            return f'⚠️ {tasa}%'
        else:
            return f'❌ {tasa}%'
    get_tasa_exito_display.short_description = 'Tasa Éxito'
    
    def get_queryset(self, request):
        """
        Mostrar también los patrones eliminados (soft delete)
        """
        return InvoicePatternCatalog.objects.select_related('proveedor', 'grupo_padre').all()

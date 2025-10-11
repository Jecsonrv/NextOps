from django.contrib import admin
from .models import RegexPattern


@admin.register(RegexPattern)
class RegexPatternAdmin(admin.ModelAdmin):
    """
    Configuración del admin para Patrones de Regex
    """
    list_display = [
        'name',
        'category',
        'priority',
        'is_active',
        'total_uses_display',
        'success_rate_display',
        'created_at',
    ]
    
    list_filter = [
        'category',
        'is_active',
        'priority',
        'created_at',
    ]
    
    search_fields = [
        'name',
        'description',
        'pattern',
    ]
    
    ordering = ['-priority', 'category', 'name']
    
    readonly_fields = ['usage_stats', 'created_at', 'updated_at', 'deleted_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'category', 'priority')
        }),
        ('Patrón', {
            'fields': ('pattern', 'is_active')
        }),
        ('Casos de Prueba', {
            'fields': ('test_cases',),
            'classes': ('collapse',)
        }),
        ('Estadísticas', {
            'fields': ('usage_stats',),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """
        Mostrar también los patrones eliminados (soft delete)
        """
        return RegexPattern.all_objects.all()
    
    def total_uses_display(self, obj):
        """
        Mostrar total de usos en el listado
        """
        return obj.usage_stats.get('total_uses', 0)
    total_uses_display.short_description = 'Usos'
    
    def success_rate_display(self, obj):
        """
        Mostrar tasa de éxito en el listado
        """
        stats = obj.usage_stats
        total = stats.get('total_uses', 0)
        successful = stats.get('successful_matches', 0)
        
        if total == 0:
            return '-'
        
        rate = (successful / total) * 100
        return f'{rate:.1f}%'
    success_rate_display.short_description = 'Éxito'

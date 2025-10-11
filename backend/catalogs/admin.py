from django.contrib import admin
from .models import Provider


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

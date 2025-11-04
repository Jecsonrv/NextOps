from django.urls import path
from .views_diagnostics import diagnosticar_patrones, activar_patrones_proveedor

# NOTA: Los ViewSets de ProviderPattern, RegexPattern y TargetField fueron eliminados
# porque NO SE USABAN. El sistema ahora usa exclusivamente InvoicePatternCatalog
# desde catalogs.urls

urlpatterns = [
    # Endpoints de diagnóstico de patrones
    path('diagnostics/', diagnosticar_patrones, name='diagnostics'),
    path('diagnostics/activate/<int:provider_id>/', activar_patrones_proveedor, name='activate-patterns'),
]

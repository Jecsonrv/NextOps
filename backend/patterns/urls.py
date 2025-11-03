from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegexPatternViewSet, ProviderPatternViewSet, TargetFieldViewSet
from .views_diagnostics import diagnosticar_patrones, activar_patrones_proveedor

# Router para ViewSets
router = DefaultRouter()
router.register(r'regex-patterns', RegexPatternViewSet, basename='regexpattern')
router.register(r'provider-patterns', ProviderPatternViewSet, basename='providerpattern')
router.register(r'target-fields', TargetFieldViewSet, basename='targetfield')

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoints de diagnóstico (sin necesidad de terminal)
    path('diagnostics/', diagnosticar_patrones, name='diagnostics'),
    path('diagnostics/activate/<int:provider_id>/', activar_patrones_proveedor, name='activate-patterns'),
]

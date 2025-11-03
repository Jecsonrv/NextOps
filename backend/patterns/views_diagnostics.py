"""
Vista de diagnóstico de patrones (accesible vía API).
Permite verificar patrones sin acceso a terminal.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from catalogs.models import Provider
from patterns.models import ProviderPattern, TargetField


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def diagnosticar_patrones(request):
    """
    GET /api/patterns/diagnostics/
    
    Query params:
    - provider: nombre del proveedor (opcional)
    
    Retorna información de todos los patrones del sistema.
    """
    provider_name = request.query_params.get('provider', '').strip()
    
    # Obtener todos los proveedores activos
    providers = Provider.objects.filter(is_active=True, is_deleted=False)
    
    providers_data = []
    
    for provider in providers:
        patterns = ProviderPattern.objects.filter(
            provider=provider,
            is_active=True,
            is_deleted=False
        ).select_related('target_field')
        
        patterns_list = []
        for p in patterns:
            patterns_list.append({
                'id': p.id,
                'name': p.name,
                'priority': p.priority,
                'field_code': p.target_field.code if p.target_field else None,
                'field_name': p.target_field.name if p.target_field else None,
                'pattern_preview': p.pattern[:100],
                'is_active': p.is_active,
            })
        
        # Si se especificó un proveedor, filtrar solo ese
        if provider_name and provider_name.lower() not in provider.nombre.lower():
            continue
        
        providers_data.append({
            'id': provider.id,
            'nombre': provider.nombre,
            'tipo': provider.tipo,
            'patrones_count': patterns.count(),
            'patrones': patterns_list,
        })
    
    # Estadísticas generales
    total_patterns = ProviderPattern.objects.filter(
        is_active=True,
        is_deleted=False
    ).count()
    
    total_fields = TargetField.objects.filter(
        is_active=True,
        is_deleted=False
    ).count()
    
    return Response({
        'total_providers': providers.count(),
        'total_patterns': total_patterns,
        'total_fields': total_fields,
        'providers': providers_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activar_patrones_proveedor(request, provider_id):
    """
    POST /api/patterns/diagnostics/activate/<provider_id>/
    
    Activa todos los patrones inactivos de un proveedor.
    """
    try:
        provider = Provider.objects.get(id=provider_id, is_active=True, is_deleted=False)
    except Provider.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=404)
    
    # Activar patrones inactivos
    inactive_patterns = ProviderPattern.objects.filter(
        provider=provider,
        is_active=False,
        is_deleted=False
    )
    
    count = inactive_patterns.count()
    inactive_patterns.update(is_active=True)
    
    return Response({
        'provider': provider.nombre,
        'patterns_activated': count,
        'message': f'Se activaron {count} patrones de {provider.nombre}'
    })

"""
Vista de diagnóstico de patrones (accesible vía API).
Permite verificar patrones sin acceso a terminal.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from catalogs.models import Provider, InvoicePatternCatalog
from patterns.models import ProviderPattern, TargetField


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def diagnosticar_patrones(request):
    """
    GET /api/patterns/diagnostics/
    
    Query params:
    - provider: nombre del proveedor (opcional)
    
    Retorna información de todos los patrones del sistema usando InvoicePatternCatalog.
    """
    provider_name = request.query_params.get('provider', '').strip()
    
    # Obtener todos los proveedores activos
    providers = Provider.objects.filter(is_active=True, is_deleted=False)
    
    providers_data = []
    
    for provider in providers:
        # Buscar patrones en InvoicePatternCatalog
        catalog_patterns = InvoicePatternCatalog.objects.filter(
            proveedor=provider,
            activo=True,
            is_deleted=False,
            tipo_patron='costo'
        )
        
        patterns_list = []
        pattern_count = 0
        
        # Contar campos de patrón definidos en cada catálogo
        for cp in catalog_patterns:
            pattern_fields = [
                ('patron_numero_factura', 'Número de Factura'),
                ('patron_numero_control', 'Número de Control'),
                ('patron_fecha_emision', 'Fecha de Emisión'),
                ('patron_nit_emisor', 'NIT Emisor'),
                ('patron_nombre_emisor', 'Nombre Emisor'),
                ('patron_nit_cliente', 'NIT Cliente'),
                ('patron_nombre_cliente', 'Nombre Cliente'),
                ('patron_subtotal', 'Subtotal'),
                ('patron_subtotal_gravado', 'Subtotal Gravado'),
                ('patron_subtotal_exento', 'Subtotal Exento'),
                ('patron_iva', 'IVA'),
                ('patron_total', 'Total'),
                ('patron_retencion', 'Retención'),
                ('patron_retencion_iva', 'Retención IVA'),
                ('patron_retencion_renta', 'Retención Renta'),
                ('patron_otros_montos', 'Otros Montos'),
            ]
            
            for field_attr, field_name in pattern_fields:
                pattern_text = getattr(cp, field_attr, None)
                if pattern_text and pattern_text.strip():
                    pattern_count += 1
                    patterns_list.append({
                        'id': f"{cp.id}_{field_attr}",
                        'name': f"{cp.nombre} - {field_name}",
                        'priority': cp.prioridad,
                        'field_code': field_attr.replace('patron_', ''),
                        'field_name': field_name,
                        'pattern_preview': pattern_text[:100],
                        'is_active': cp.activo,
                    })
        
        # Si se especificó un proveedor, filtrar solo ese
        if provider_name and provider_name.lower() not in provider.nombre.lower():
            continue
        
        providers_data.append({
            'id': provider.id,
            'nombre': provider.nombre,
            'tipo': provider.tipo,
            'patrones_count': pattern_count,
            'patrones': patterns_list,
        })
    
    # Estadísticas generales
    total_patterns = sum(p['patrones_count'] for p in providers_data)
    
    total_fields = 16  # Número de campos disponibles
    
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

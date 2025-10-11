from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
import time

from .models import RegexPattern, ProviderPattern, TargetField
from catalogs.models import Provider
from .serializers import (
    RegexPatternSerializer,
    RegexPatternListSerializer,
    PatternTestSerializer,
    ProviderPatternSerializer,
    ProviderPatternListSerializer,
    ProviderPatternTestSerializer,
    ProviderIdentificationSerializer,
    TargetFieldSerializer
)
from common.permissions import IsAdmin, IsJefeOperaciones, ReadOnly
from common.pagination import StandardResultsSetPagination


class TargetFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de campos objetivo
    
    Permisos:
    - Admin y Jefe de Operaciones: CRUD completo
    - Otros roles: Solo lectura
    
    Filtros:
    - data_type: Filtrar por tipo de dato
    - is_active: Filtrar por estado activo/inactivo
    - search: Búsqueda por nombre, código, descripción
    """
    queryset = TargetField.objects.all()
    serializer_class = TargetFieldSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['data_type', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'priority', 'created_at']
    ordering = ['-priority', 'name']
    
    def get_permissions(self):
        """
        Admin y Jefe de Operaciones pueden hacer todo
        Otros roles solo pueden leer
        """
        if self.action in ['list', 'retrieve', 'data_types']:
            permission_classes = [ReadOnly]
        else:
            permission_classes = [IsAdmin | IsJefeOperaciones]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Permitir filtrar campos eliminados (soft delete) solo para admin
        """
        queryset = TargetField.objects.all()
        
        if self.request.user.is_admin:
            include_deleted = self.request.query_params.get('include_deleted', 'false')
            if include_deleted.lower() == 'true':
                queryset = TargetField.all_objects.all()
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def data_types(self, request):
        """
        Obtener tipos de datos disponibles
        GET /api/patterns/target-fields/data_types/
        """
        data_types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in TargetField.DATA_TYPE_CHOICES
        ]
        return Response(data_types)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Activar/desactivar campo objetivo
        POST /api/patterns/target-fields/{id}/toggle_active/
        """
        target_field = self.get_object()
        target_field.is_active = not target_field.is_active
        target_field.save(update_fields=['is_active'])
        
        serializer = self.get_serializer(target_field)
        return Response(serializer.data)


class RegexPatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de patrones de regex
    
    Permisos:
    - Admin y Jefe de Operaciones: CRUD completo
    - Otros roles: Solo lectura
    
    Filtros:
    - category: Filtrar por categoría
    - is_active: Filtrar por estado activo/inactivo
    - search: Búsqueda por nombre, descripción
    """
    queryset = RegexPattern.objects.all()
    serializer_class = RegexPatternSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'category', 'priority', 'created_at']
    ordering = ['-priority', 'name']
    
    def get_permissions(self):
        """
        Admin y Jefe de Operaciones pueden hacer todo
        Test de patrones accesible para todos los autenticados
        Otros roles solo pueden leer
        """
        if self.action in ['list', 'retrieve', 'categories', 'by_category']:
            permission_classes = [ReadOnly]
        elif self.action in ['test_pattern', 'test_pattern_by_id', 'run_tests', 'usage_stats']:
            # Endpoints de prueba/consulta accesibles para todos los autenticados
            from rest_framework.permissions import IsAuthenticated
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdmin | IsJefeOperaciones]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """
        Usar serializer simplificado para list
        """
        if self.action == 'list':
            return RegexPatternListSerializer
        return RegexPatternSerializer
    
    def get_queryset(self):
        """
        Permitir filtrar patrones eliminados (soft delete) solo para admin
        """
        queryset = RegexPattern.objects.all()
        
        if self.request.user.is_admin:
            include_deleted = self.request.query_params.get('include_deleted', 'false')
            if include_deleted.lower() == 'true':
                queryset = RegexPattern.all_objects.all()
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """
        Obtener categorías de patrones disponibles
        GET /api/patterns/regex-patterns/categories/
        """
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in RegexPattern.CATEGORY_CHOICES
        ]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """
        Obtener patrones agrupados por categoría
        GET /api/patterns/regex-patterns/by_category/
        """
        result = {}
        
        for category_code, category_name in RegexPattern.CATEGORY_CHOICES:
            patterns = self.get_queryset().filter(
                category=category_code,
                is_active=True
            ).order_by('-priority', 'name')
            
            serializer = RegexPatternListSerializer(patterns, many=True)
            result[category_code] = {
                'name': category_name,
                'patterns': serializer.data
            }
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def test_pattern(self, request):
        """
        Probar un patrón contra texto sin guardar
        POST /api/patterns/regex-patterns/test_pattern/
        Body: {"pattern": "regex", "text": "texto a probar"}
        """
        serializer = PatternTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pattern = serializer.validated_data['pattern']
        text = serializer.validated_data['text']
        
        import re
        start_time = time.time()
        
        try:
            compiled = re.compile(pattern)
            match = compiled.search(text)
            
            match_time_ms = (time.time() - start_time) * 1000
            
            if match:
                result = {
                    'matches': True,
                    'matched_groups': list(match.groups()),
                    'full_match': match.group(0),
                    'match_time_ms': round(match_time_ms, 3)
                }
            else:
                result = {
                    'matches': False,
                    'matched_groups': [],
                    'full_match': None,
                    'match_time_ms': round(match_time_ms, 3)
                }
            
            return Response(result)
        
        except Exception as e:
            return Response({
                'error': str(e),
                'matches': False
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def test_pattern_by_id(self, request, pk=None):
        """
        Probar un patrón guardado contra texto
        POST /api/patterns/regex-patterns/{id}/test_pattern_by_id/
        Body: {"text": "texto a probar"}
        """
        pattern_obj = self.get_object()
        text = request.data.get('text', '')
        
        if not text:
            return Response(
                {'error': 'El campo "text" es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_time = time.time()
        result = pattern_obj.test(text)
        match_time_ms = (time.time() - start_time) * 1000
        
        result['match_time_ms'] = round(match_time_ms, 3)
        
        # Incrementar contador de uso
        pattern_obj.increment_usage(
            matched=result['matches'],
            match_time_ms=match_time_ms
        )
        
        return Response(result)
    
    @action(detail=True, methods=['post'])
    def run_tests(self, request, pk=None):
        """
        Ejecutar todos los casos de prueba de un patrón
        POST /api/patterns/regex-patterns/{id}/run_tests/
        """
        pattern_obj = self.get_object()
        
        if not pattern_obj.test_cases:
            return Response(
                {'message': 'Este patrón no tiene casos de prueba definidos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = pattern_obj.run_test_cases()
        return Response(results)
    
    @action(detail=True, methods=['get'])
    def usage_stats(self, request, pk=None):
        """
        Obtener estadísticas de uso de un patrón
        GET /api/patterns/regex-patterns/{id}/usage_stats/
        """
        pattern_obj = self.get_object()
        
        stats = pattern_obj.usage_stats
        total = stats.get('total_uses', 0)
        successful = stats.get('successful_matches', 0)
        failed = stats.get('failed_matches', 0)
        
        return Response({
            'pattern_name': pattern_obj.name,
            'pattern_id': pattern_obj.id,
            'category': pattern_obj.get_category_display(),
            'statistics': {
                'total_uses': total,
                'successful_matches': successful,
                'failed_matches': failed,
                'success_rate': round((successful / total * 100), 2) if total > 0 else 0,
                'last_used': stats.get('last_used'),
                'average_match_time_ms': round(stats.get('average_match_time_ms', 0), 3)
            }
        })
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Activar/desactivar un patrón
        POST /api/patterns/regex-patterns/{id}/toggle_active/
        """
        pattern_obj = self.get_object()
        pattern_obj.is_active = not pattern_obj.is_active
        pattern_obj.save()
        
        serializer = self.get_serializer(pattern_obj)
        return Response({
            'message': f"Patrón {'activado' if pattern_obj.is_active else 'desactivado'} exitosamente",
            'pattern': serializer.data
        })
    
    def perform_destroy(self, instance):
        """
        Soft delete en lugar de eliminar físicamente
        """
        instance.delete()


class ProviderPatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar patrones de proveedor
    
    Endpoints:
    - GET /api/patterns/provider-patterns/ - Listar patrones
    - POST /api/patterns/provider-patterns/ - Crear patrón
    - GET /api/patterns/provider-patterns/{id}/ - Obtener detalle
    - PUT /api/patterns/provider-patterns/{id}/ - Actualizar patrón
    - PATCH /api/patterns/provider-patterns/{id}/ - Actualizar parcial
    - DELETE /api/patterns/provider-patterns/{id}/ - Eliminar (soft delete)
    - GET /api/patterns/provider-patterns/by_provider/{provider_id}/ - Patrones por proveedor
    - POST /api/patterns/provider-patterns/test_pattern/ - Probar patrón
    - POST /api/patterns/provider-patterns/{id}/run_tests/ - Ejecutar casos de prueba
    - POST /api/patterns/provider-patterns/identify_provider/ - Identificar proveedor
    - POST /api/patterns/provider-patterns/{id}/toggle_active/ - Activar/desactivar
    - GET /api/patterns/provider-patterns/{id}/usage_stats/ - Estadísticas de uso
    """
    queryset = ProviderPattern.objects.select_related('provider', 'target_field').all()
    permission_classes = [IsAdmin | IsJefeOperaciones | ReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['provider', 'target_field', 'is_active']
    search_fields = ['name', 'description', 'pattern']
    ordering_fields = ['created_at', 'usage_count', 'success_count', 'priority', 'name']
    ordering = ['-priority', '-usage_count']
    
    def get_serializer_class(self):
        """
        Usar serializer simplificado para listados
        """
        if self.action == 'list':
            return ProviderPatternListSerializer
        return ProviderPatternSerializer
    
    def get_queryset(self):
        """
        Filtrar patrones activos por defecto para listados
        Para operaciones de detalle (retrieve, update, delete) no filtrar
        """
        queryset = super().get_queryset()
        
        # No filtrar en operaciones de detalle o modificación
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'toggle_active']:
            return queryset
        
        # Para listados, filtrar por is_active a menos que se especifique lo contrario
        if self.request.query_params.get('include_inactive') != 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Crear patrón con logs para debug"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"📥 CREATE - Datos recibidos: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        logger.info(f"✅ CREATE - Datos validados: {serializer.validated_data}")
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        logger.info(f"💾 CREATE - Datos guardados: {serializer.data}")
        
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Actualizar patrón con logs para debug"""
        import logging
        logger = logging.getLogger(__name__)
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        logger.info(f"📥 UPDATE - ID: {instance.id}, Datos recibidos: {request.data}")
        logger.info(f"📋 UPDATE - Datos antes: pattern={instance.pattern}, name={instance.name}")
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        logger.info(f"✅ UPDATE - Datos validados: {serializer.validated_data}")
        
        self.perform_update(serializer)
        
        logger.info(f"💾 UPDATE - Datos guardados: {serializer.data}")
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='by_provider/(?P<provider_id>[^/.]+)')
    def by_provider(self, request, provider_id=None):
        """
        Obtener patrones que se aplicarán: específicos del proveedor + genéricos solo para campos sin patrón específico.
        Los patrones se ordenan por prioridad (mayor primero).
        
        GET /api/patterns/provider-patterns/by_provider/{provider_id}/
        
        Query params opcionales:
        - include_generic=true/false (default: true) - Incluir patrones genéricos del SISTEMA
        """
        include_generic = request.query_params.get('include_generic', 'true').lower() == 'true'
        
        # Obtener proveedor SISTEMA para patrones genéricos
        try:
            sistema_provider = Provider.objects.get(nombre="SISTEMA")
            sistema_id = sistema_provider.id
        except Provider.DoesNotExist:
            sistema_id = None
        
        # Query base: patrones activos del proveedor
        specific_patterns = list(
            ProviderPattern.objects.filter(
                provider_id=provider_id,
                is_active=True
            ).select_related('target_field', 'provider')
        )
        
        # Identificar campos que YA tienen patrones específicos
        fields_with_specific = {p.target_field_id for p in specific_patterns}
        
        patterns = specific_patterns
        generic_patterns_used = []
        
        # Si se solicitan genéricos, agregar SOLO para campos sin patrón específico
        if include_generic and sistema_id:
            generic_patterns = ProviderPattern.objects.filter(
                provider_id=sistema_id,
                is_active=True
            ).select_related('target_field', 'provider')
            
            # Filtrar: solo genéricos para campos SIN patrón específico
            for generic in generic_patterns:
                if generic.target_field_id not in fields_with_specific:
                    patterns.append(generic)
                    generic_patterns_used.append(generic)
        
        # Ordenar por prioridad DESC
        patterns.sort(key=lambda p: -p.priority)
        
        # Serializar
        serializer = ProviderPatternListSerializer(patterns, many=True)
        
        # Agrupar por campo objetivo para mejor visualización
        by_field = {}
        for pattern_data in serializer.data:
            field_code = pattern_data.get('target_field_code', 'unknown')
            if field_code not in by_field:
                by_field[field_code] = []
            by_field[field_code].append(pattern_data)
        
        return Response({
            'provider_id': int(provider_id),
            'total': len(patterns),
            'specific_patterns': len(specific_patterns),
            'generic_patterns': len(generic_patterns_used),
            'patterns': serializer.data,
            'by_field': by_field,  # Agrupado por campo para facilitar visualización
        })
    
    @action(detail=False, methods=['post'])
    def test_pattern(self, request):
        """
        Probar un patrón contra texto sin guardarlo
        POST /api/patterns/provider-patterns/test_pattern/
        Body: {
            "pattern": "regex pattern",
            "text": "text to test",
            "case_sensitive": false
        }
        """
        serializer = ProviderPatternTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pattern = serializer.validated_data['pattern']
        text = serializer.validated_data['text']
        case_sensitive = serializer.validated_data.get('case_sensitive', False)
        
        start_time = time.time()
        
        # Crear objeto temporal para usar el método test()
        temp_pattern = ProviderPattern(
            pattern=pattern,
            case_sensitive=case_sensitive
        )
        
        try:
            result = temp_pattern.test(text)
            match_time_ms = (time.time() - start_time) * 1000
            
            return Response({
                'success': result['success'],
                'matches': result['matches'],
                'match_count': result['match_count'],
                'error': result.get('error'),
                'match_time_ms': round(match_time_ms, 3),
                'pattern': pattern
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'pattern': pattern
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def run_tests(self, request, pk=None):
        """
        Ejecutar todos los casos de prueba de un patrón
        POST /api/patterns/provider-patterns/{id}/run_tests/
        """
        pattern_obj = self.get_object()
        
        if not pattern_obj.test_cases:
            return Response({
                'message': 'Este patrón no tiene casos de prueba definidos',
                'pattern_id': pattern_obj.id,
                'pattern_name': pattern_obj.name
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Ejecutar casos de prueba
        results = pattern_obj.run_test_cases()
        
        return Response({
            'pattern_id': pattern_obj.id,
            'pattern_name': pattern_obj.name,
            'total_tests': results['total'],
            'passed': results['passed'],
            'failed': results['failed'],
            'success_rate': results['success_rate'],
            'results': results['results']
        })
    
    @action(detail=False, methods=['post'])
    def identify_provider(self, request):
        """
        Identificar proveedor basándose en texto de factura
        POST /api/patterns/provider-patterns/identify_provider/
        Body: {
            "text": "invoice text here",
            "target_fields": [1, 2, 3]  // opcional, IDs de campos objetivo
        }
        """
        serializer = ProviderIdentificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        text = serializer.validated_data['text']
        target_field_ids = serializer.validated_data.get('target_fields', None)
        
        # Obtener patrones activos ordenados por prioridad
        patterns_query = self.get_queryset().filter(is_active=True).order_by('-priority', '-usage_count')
        
        if target_field_ids:
            patterns_query = patterns_query.filter(target_field__id__in=target_field_ids)
        
        results = []
        matches_by_provider = {}
        
        # Probar cada patrón
        for pattern in patterns_query:
            test_result = pattern.test(text)
            
            if test_result['success'] and test_result['match_count'] > 0:
                provider_id = pattern.provider_id
                
                if provider_id not in matches_by_provider:
                    matches_by_provider[provider_id] = {
                        'provider_id': provider_id,
                        'provider_name': pattern.provider.nombre,
                        'provider_nit': pattern.provider.nit,
                        'total_matches': 0,
                        'patterns_matched': []
                    }
                
                matches_by_provider[provider_id]['total_matches'] += test_result['match_count']
                matches_by_provider[provider_id]['patterns_matched'].append({
                    'pattern_id': pattern.id,
                    'pattern_name': pattern.name,
                    'target_field': pattern.target_field.name if pattern.target_field else None,
                    'match_count': test_result['match_count'],
                    'matches': test_result['matches'][:5]  # Limitar a 5 coincidencias por patrón
                })
                
                # Incrementar uso del patrón
                pattern.increment_usage(success=True)
        
        # Ordenar proveedores por número de coincidencias
        results = sorted(
            matches_by_provider.values(),
            key=lambda x: x['total_matches'],
            reverse=True
        )
        
        return Response({
            'providers_found': len(results),
            'best_match': results[0] if results else None,
            'all_matches': results
        })
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Activar/desactivar un patrón
        POST /api/patterns/provider-patterns/{id}/toggle_active/
        """
        # Obtener el patrón sin filtrar por is_active
        try:
            pattern_obj = ProviderPattern.objects.get(pk=pk)
        except ProviderPattern.DoesNotExist:
            return Response(
                {'error': 'Patrón no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        pattern_obj.is_active = not pattern_obj.is_active
        pattern_obj.save()
        
        serializer = self.get_serializer(pattern_obj)
        return Response({
            'message': f"Patrón {'activado' if pattern_obj.is_active else 'desactivado'} exitosamente",
            'pattern': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def usage_stats(self, request, pk=None):
        """
        Obtener estadísticas de uso de un patrón
        GET /api/patterns/provider-patterns/{id}/usage_stats/
        """
        pattern_obj = self.get_object()
        
        success_rate = 0
        if pattern_obj.usage_count > 0:
            success_rate = round((pattern_obj.success_count / pattern_obj.usage_count) * 100, 2)
        
        return Response({
            'pattern_id': pattern_obj.id,
            'pattern_name': pattern_obj.name,
            'provider_name': pattern_obj.provider.nombre,
            'statistics': {
                'usage_count': pattern_obj.usage_count,
                'success_count': pattern_obj.success_count,
                'success_rate': success_rate,
                'last_used': pattern_obj.last_used,
                'is_active': pattern_obj.is_active,
                'priority': pattern_obj.priority
            }
        })
    
    def perform_destroy(self, instance):
        """
        Soft delete en lugar de eliminar físicamente
        """
        instance.delete()

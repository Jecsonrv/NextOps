from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from .models import Provider, CostType, CostCategory
from .serializers import (
    ProviderSerializer, 
    ProviderListSerializer,
    CostTypeSerializer,
    CostTypeListSerializer,
    CostCategorySerializer,
    CostCategoryListSerializer
)
from common.permissions import IsAdmin, IsJefeOperaciones, ReadOnly
from common.pagination import StandardResultsSetPagination


class CostCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de categorías de tipos de costo (CRUD completo)
    
    Permisos:
    - Admin y Jefe de Operaciones: CRUD completo
    - Otros roles: Solo lectura
    
    Filtros:
    - is_active: Filtrar por estado activo/inactivo
    - search: Búsqueda por código, nombre, descripción
    """
    queryset = CostCategory.objects.all()
    serializer_class = CostCategorySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'name', 'display_order', 'created_at']
    ordering = ['display_order', 'name']
    
    def get_permissions(self):
        """
        Admin y Jefe de Operaciones pueden hacer todo
        Otros roles solo pueden leer
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [ReadOnly]
        else:
            permission_classes = [IsAdmin | IsJefeOperaciones]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """
        Usar serializer simplificado para list
        """
        if self.action == 'list':
            return CostCategoryListSerializer
        return CostCategorySerializer
    
    def get_queryset(self):
        """
        Permitir filtrar categorías eliminadas (soft delete)
        """
        queryset = CostCategory.objects.all()
        
        # Si el usuario es admin, puede ver categorías eliminadas
        if self.request.user.is_authenticated and hasattr(self.request.user, 'is_admin') and self.request.user.is_admin:
            include_deleted = self.request.query_params.get('include_deleted', 'false')
            if include_deleted.lower() == 'true':
                queryset = CostCategory.all_objects.all()
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def activas(self, request):
        """
        Endpoint para obtener solo categorías activas
        GET /api/catalogs/cost-categories/activas/
        """
        activas = self.get_queryset().filter(is_active=True)
        serializer = CostCategoryListSerializer(activas, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Endpoint para activar/desactivar una categoría
        POST /api/catalogs/cost-categories/{id}/toggle_active/
        """
        categoria = self.get_object()
        categoria.is_active = not categoria.is_active
        categoria.save()
        
        serializer = self.get_serializer(categoria)
        return Response({
            'message': f'Categoría {"activada" if categoria.is_active else "desactivada"} exitosamente',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete de una categoría
        """
        categoria = self.get_object()
        
        # Verificar si hay tipos de costo usando esta categoría
        tipos_asociados = CostType.objects.filter(category=categoria).count()
        if tipos_asociados > 0:
            return Response(
                {'error': f'No se puede eliminar la categoría porque tiene {tipos_asociados} tipo(s) de costo asociado(s)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        categoria.delete()  # Soft delete
        return Response(
            {'message': 'Categoría eliminada exitosamente'},
            status=status.HTTP_204_NO_CONTENT
        )


class CostTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de tipos de costo (CRUD completo)
    
    Permisos:
    - Admin y Jefe de Operaciones: CRUD completo
    - Otros roles: Solo lectura
    
    Filtros:
    - category: Filtrar por categoría de costo
    - is_active: Filtrar por estado activo/inactivo
    - search: Búsqueda por código, nombre, descripción
    """
    queryset = CostType.objects.all()
    serializer_class = CostTypeSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'name', 'category', 'display_order', 'created_at']
    ordering = ['display_order', 'name']
    
    def get_permissions(self):
        """
        Admin y Jefe de Operaciones pueden hacer todo
        Otros roles solo pueden leer
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [ReadOnly]
        else:
            permission_classes = [IsAdmin | IsJefeOperaciones]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """
        Usar serializer simplificado para list
        """
        if self.action == 'list':
            return CostTypeListSerializer
        return CostTypeSerializer
    
    def get_queryset(self):
        """
        Permitir filtrar tipos de costo eliminados (soft delete)
        """
        queryset = CostType.objects.all()
        
        # Si el usuario es admin, puede ver tipos de costo eliminados
        if self.request.user.is_authenticated and hasattr(self.request.user, 'is_admin') and self.request.user.is_admin:
            include_deleted = self.request.query_params.get('include_deleted', 'false')
            if include_deleted.lower() == 'true':
                queryset = CostType.all_objects.all()
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def categorias(self, request):
        """
        Endpoint para obtener las categorías activas de tipos de costo
        GET /api/catalogs/cost-types/categorias/
        """
        categorias = CostCategory.objects.filter(is_active=True).order_by('display_order', 'name')
        serializer = CostCategoryListSerializer(categorias, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """
        Endpoint para obtener solo tipos de costo activos
        GET /api/catalogs/cost-types/activos/
        """
        activos = self.get_queryset().filter(is_active=True)
        serializer = CostTypeListSerializer(activos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Endpoint para activar/desactivar un tipo de costo
        POST /api/catalogs/cost-types/{id}/toggle_active/
        """
        cost_type = self.get_object()
        cost_type.is_active = not cost_type.is_active
        cost_type.save()
        
        serializer = self.get_serializer(cost_type)
        return Response({
            'message': f"Tipo de costo {'activado' if cost_type.is_active else 'desactivado'} exitosamente",
            'cost_type': serializer.data
        })
    
    def perform_destroy(self, instance):
        """
        Soft delete en lugar de eliminar físicamente
        """
        instance.delete()  # Usa el soft delete del modelo


class ProviderViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de proveedores (CRUD completo)
    
    Permisos:
    - Admin y Jefe de Operaciones: CRUD completo
    - Otros roles: Solo lectura
    
    Filtros:
    - tipo: Filtrar por tipo de proveedor
    - categoria: Filtrar por categoría
    - is_active: Filtrar por estado activo/inactivo
    - search: Búsqueda por nombre, NIT, email
    """
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'categoria', 'is_active']
    search_fields = ['nombre', 'nit', 'email', 'contacto']
    ordering_fields = ['nombre', 'tipo', 'categoria', 'created_at']
    ordering = ['nombre']
    
    def get_permissions(self):
        """
        Admin y Jefe de Operaciones pueden hacer todo
        Otros roles solo pueden leer
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [ReadOnly]
        else:
            permission_classes = [IsAdmin | IsJefeOperaciones]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """
        Usar serializer simplificado para list
        """
        if self.action == 'list':
            return ProviderListSerializer
        return ProviderSerializer
    
    def get_queryset(self):
        """
        Permitir filtrar proveedores eliminados (soft delete)
        """
        queryset = Provider.objects.all()
        
        # Si el usuario es admin, puede ver proveedores eliminados
        if self.request.user.is_admin:
            include_deleted = self.request.query_params.get('include_deleted', 'false')
            if include_deleted.lower() == 'true':
                queryset = Provider.all_objects.all()
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def tipos(self, request):
        """
        Endpoint para obtener los tipos de proveedor disponibles
        GET /api/catalogs/providers/tipos/
        """
        tipos = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Provider.TYPE_CHOICES
        ]
        return Response(tipos)
    
    @action(detail=False, methods=['get'])
    def categorias(self, request):
        """
        Endpoint para obtener las categorías disponibles
        GET /api/catalogs/providers/categorias/
        """
        categorias = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Provider.CATEGORY_CHOICES
        ]
        return Response(categorias)
    
    @action(detail=False, methods=['get'])
    def navieras(self, request):
        """
        Endpoint para obtener solo navieras activas
        GET /api/catalogs/providers/navieras/
        """
        navieras = self.get_queryset().filter(tipo='naviera', is_active=True)
        serializer = ProviderListSerializer(navieras, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def agentes(self, request):
        """
        Endpoint para obtener solo agentes locales activos
        GET /api/catalogs/providers/agentes/
        """
        agentes = self.get_queryset().filter(tipo='agente_local', is_active=True)
        serializer = ProviderListSerializer(agentes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Endpoint para activar/desactivar un proveedor
        POST /api/catalogs/providers/{id}/toggle_active/
        """
        provider = self.get_object()
        provider.is_active = not provider.is_active
        provider.save()
        
        serializer = self.get_serializer(provider)
        return Response({
            'message': f"Proveedor {'activado' if provider.is_active else 'desactivado'} exitosamente",
            'provider': serializer.data
        })
    
    def perform_destroy(self, instance):
        """
        Soft delete en lugar de eliminar físicamente
        """
        instance.delete()  # Usa el soft delete del modelo

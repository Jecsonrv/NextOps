"""
Views para el módulo de Pagos a Proveedores (Cuentas por Pagar).
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from decimal import Decimal

from .models import SupplierPayment, SupplierPaymentLink
from .serializers import (
    SupplierPaymentSerializer,
    FacturaPendientePagoSerializer
)
from invoices.models import Invoice
from catalogs.models import Provider


class SupplierPaymentViewSet(viewsets.ModelViewSet):
    """
    API para gestionar pagos a proveedores.
    Permite crear pagos en lote, ver historial, etc.
    """

    queryset = SupplierPayment.objects.filter(is_deleted=False)
    serializer_class = SupplierPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtros opcionales"""
        queryset = super().get_queryset()

        # Filtro por proveedor
        proveedor_id = self.request.query_params.get('proveedor_id')
        if proveedor_id:
            queryset = queryset.filter(proveedor_id=proveedor_id)

        # Filtro por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')

        if fecha_desde:
            queryset = queryset.filter(fecha_pago__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_pago__lte=fecha_hasta)

        # Buscar por referencia
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(referencia__icontains=search) |
                Q(notas__icontains=search)
            )

        return queryset.select_related('proveedor', 'registrado_por').prefetch_related('invoice_links')

    def create(self, request, *args, **kwargs):
        """
        Crea un pago a proveedor y lo asocia con múltiples facturas de costo.
        Este método maneja la lógica de 'pago en lote'.

        Payload esperado:
        {
            "proveedor": 22, // ID del proveedor
            "fecha_pago": "2025-10-26",
            "referencia": "TRF-00123",
            "monto_total": "8200.00", // Monto total de la transferencia
            "notas": "Pago de fletes",
            "invoices_to_pay": [
                {"id": 101, "monto_a_pagar": "5000.00"},
                {"id": 105, "monto_a_pagar": "3200.00"}
            ]
        }
        """
        import json

        # IMPORTANTE: No usar .copy() porque no funciona con archivos
        # En su lugar, crear un nuevo dict con los datos necesarios
        data = {}

        # Copiar campos simples
        for key in ['proveedor', 'fecha_pago', 'referencia', 'monto_total', 'notas']:
            if key in request.data:
                data[key] = request.data[key]

        # Copiar archivo si existe (sin hacer deepcopy)
        if 'archivo_comprobante' in request.FILES:
            data['archivo_comprobante'] = request.FILES['archivo_comprobante']

        # Parsear invoices_to_pay si viene como string
        invoices_to_pay = request.data.get('invoices_to_pay')
        if isinstance(invoices_to_pay, str):
            try:
                data['invoices_to_pay'] = json.loads(invoices_to_pay)
            except (json.JSONDecodeError, TypeError):
                return Response(
                    {"error": "El formato de invoices_to_pay es inválido."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif invoices_to_pay is not None:
            data['invoices_to_pay'] = invoices_to_pay

        # Usar el serializer para validar y crear todo
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # El serializer maneja toda la lógica de creación y validación
        supplier_payment = serializer.save(registrado_por=self.request.user)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


    @action(detail=False, methods=['get'])
    def facturas_pendientes(self, request):
        """
        Retorna facturas PROVISIONADAS pendientes de pago,
        agrupadas por proveedor.

        Opciones:
        - ?proveedor_id=X - Filtrar por proveedor específico
        - ?incluir_parciales=true - Incluir facturas con pago parcial
        """
        proveedor_id = request.query_params.get('proveedor_id')
        incluir_parciales = request.query_params.get('incluir_parciales', 'false').lower() == 'true'

        # Filtrar facturas provisionadas y pendientes de pago
        # Excluir facturas anuladas o con monto pendiente = 0 (ej: cubiertas por notas de crédito)
        queryset = Invoice.objects.filter(
            is_deleted=False,
            estado_provision='provisionada',
            monto_pendiente__gt=0,  # Solo facturas con monto pendiente mayor a 0
        )

        # Estado de pago
        if incluir_parciales:
            queryset = queryset.filter(estado_pago__in=['pendiente', 'pagado_parcial'])
        else:
            queryset = queryset.filter(estado_pago='pendiente')

        # Filtro por proveedor
        if proveedor_id:
            queryset = queryset.filter(proveedor_id=proveedor_id)

        queryset = queryset.select_related('proveedor', 'ot', 'ot__cliente').order_by('fecha_vencimiento', 'proveedor__nombre')

        serializer = FacturaPendientePagoSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats_por_proveedor(self, request):
        """
        Retorna estadísticas de facturas pendientes agrupadas por proveedor.
        Útil para mostrar la lista de proveedores con deuda.
        """
        # Facturas provisionadas pendientes de pago
        # Excluir facturas con monto pendiente = 0 (ej: cubiertas por notas de crédito)
        facturas = Invoice.objects.filter(
            is_deleted=False,
            estado_provision='provisionada',
            estado_pago__in=['pendiente', 'pagado_parcial'],
            monto_pendiente__gt=0  # Solo facturas con monto pendiente mayor a 0
        ).values('proveedor_id', 'proveedor__nombre').annotate(
            total_facturas=Count('id'),
            total_pendiente=Sum('monto_pendiente'),
            total_monto=Sum('monto_aplicable')
        ).order_by('proveedor__nombre')

        # Convertir Decimal a float para JSON
        stats = []
        for item in facturas:
            if item['proveedor_id']:  # Asegurar que tenga proveedor
                stats.append({
                    'proveedor_id': item['proveedor_id'],
                    'proveedor_nombre': item['proveedor__nombre'],
                    'total_facturas': item['total_facturas'],
                    'total_pendiente': float(item['total_pendiente'] or 0),
                    'total_monto': float(item['total_monto'] or 0)
                })

        return Response(stats)

    @action(detail=False, methods=['get'])
    def historial(self, request):
        """
        Retorna historial de pagos realizados.
        Opcionalmente filtrar por proveedor o rango de fechas.
        """
        queryset = self.get_queryset().order_by('-fecha_pago')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

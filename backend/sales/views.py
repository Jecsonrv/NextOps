from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Sum, Q, Count, Avg
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
import logging
import os
import tempfile

from .models import SalesInvoice, Payment, InvoiceSalesMapping
from .models_items import SalesInvoiceItem
from .serializers import (
    SalesInvoiceListSerializer,
    SalesInvoiceDetailSerializer,
    SalesInvoiceItemSerializer,
    PaymentListSerializer,
    InvoiceSalesMappingSerializer,
    CreditNoteSerializer,
    CostInvoiceBasicSerializer,
)

from .permissions import CanValidatePayments, CanManageSalesInvoices, IsFinanzasOrAdmin, IsAdminOnly
from .utils.pdf_extractor import SalesInvoicePDFExtractor
from .filters import SalesInvoiceFilter, PaymentFilter

from invoices.models import Invoice, UploadedFile
from ots.models import OT
from common.mixins import CloudinaryFileMixin

logger = logging.getLogger(__name__)

class SalesInvoiceViewSet(CloudinaryFileMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanManageSalesInvoices]
    queryset = SalesInvoice.objects.filter(deleted_at__isnull=True)
    filterset_class = SalesInvoiceFilter
    cloudinary_file_field = 'archivo_pdf'

    def get_download_filename(self, obj):
        return f"factura_venta_{obj.numero_factura}.pdf"
    
    def get_queryset(self):
        """Optimizar queries con select_related"""
        return super().get_queryset().select_related('cliente', 'ot')
    
    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return SalesInvoiceDetailSerializer
        return SalesInvoiceListSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Override de create para incluir extracción automática de PDF.
        Solo se ejecuta en creación inicial, NO en edición.
        """
        # 🔍 DEBUG: Ver qué llega en request.data
        print("🔍 DEBUG request.data recibido:", dict(request.data))
        print("🔍 DEBUG campos importantes:", {
            'iva_total': request.data.get('iva_total'),
            'monto_total': request.data.get('monto_total'),
            'subtotal_gravado': request.data.get('subtotal_gravado'),
        })
        
        # Verificar si se subió un archivo PDF
        uploaded_file = request.FILES.get('archivo_pdf')
        extracted_data = {}
        
        if uploaded_file:
            logger.info(f"Extrayendo datos de PDF: {uploaded_file.name}")
            
            # Determinar tipo de factura del request o usar default
            tipo_factura = request.data.get('tipo_operacion', 'nacional')
            
            # Extraer datos del PDF
            try:
                extractor = SalesInvoicePDFExtractor()
                file_content = uploaded_file.read()
                extracted_data = extractor.extract_invoice_data(file_content, tipo_factura)
                
                # Resetear el puntero del archivo para que pueda ser guardado después
                uploaded_file.seek(0)
                
                logger.info(f"Datos extraídos - Confianza: {extracted_data.get('confidence', 0):.2f}")
                logger.info(f"Patrón utilizado: {extracted_data.get('patron_utilizado', 'Ninguno')}")
                
            except Exception as e:
                logger.error(f"Error en extracción de PDF: {str(e)}", exc_info=True)
                extracted_data = {}
        
        # Si se extrajeron datos, agregarlos al request
        # PERO: Los datos del usuario tienen prioridad (pueden sobre-escribir)
        if extracted_data:
            # Crear copia mutable de request.data
            data = request.data.copy()
            
            # Solo agregar campos que NO fueron enviados por el usuario
            for field, value in extracted_data.items():
                if field in ['patron_utilizado', 'confidence']:
                    continue  # Metadatos, no campos del modelo
                
                # Si el usuario no envió este campo y fue extraído, usarlo
                if field not in data or not data.get(field):
                    if value is not None:
                        data[field] = str(value)
            
            # NO agregar metadatos a las notas - el usuario decide qué poner en notas
            
            # Usar serializer con datos enriquecidos
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Agregar datos de extracción a la respuesta
            response_data = serializer.data
            response_data['extraction_info'] = {
                'success': True,
                'patron_utilizado': extracted_data.get('patron_utilizado'),
                'confidence': extracted_data.get('confidence'),
                'extracted_fields': {
                    k: v for k, v in extracted_data.items() 
                    if k not in ['patron_utilizado', 'confidence'] and v is not None
                }
            }
            
            headers = self.get_success_headers(response_data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
        
        # Si no hay extracción, continuar con el create normal
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        """
        Soft delete de factura de venta.
        Valida que no tenga notas de crédito activas antes de eliminar.
        """
        from django.utils import timezone
        from rest_framework.exceptions import ValidationError
        
        # Verificar si tiene notas de crédito activas
        notas_credito_activas = instance.credit_notes.filter(deleted_at__isnull=True)
        if notas_credito_activas.exists():
            # Pasar el mensaje directamente como string, no como diccionario
            mensaje = f'No se puede eliminar esta factura porque tiene {notas_credito_activas.count()} nota(s) de crédito asociada(s). Elimina primero las notas de crédito.'
            raise ValidationError(mensaje)
        
        # Si no tiene notas de crédito, proceder con soft delete
        instance.deleted_at = timezone.now()
        instance.save()
        
        logger.info(
            f"Factura de venta {instance.numero_factura} eliminada (soft delete) por usuario"
        )

    @action(detail=False, methods=['post'], url_path='extract-pdf')
    def extract_pdf_preview(self, request):
        """
        Endpoint para previsualizar extracción de PDF sin guardar.
        Útil para mostrar datos extraídos al usuario antes de crear la factura.
        """
        archivo_pdf = request.FILES.get('archivo_pdf')
        
        if not archivo_pdf:
            return Response(
                {'error': 'No se proporcionó archivo PDF'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tipo_factura = request.data.get('tipo_operacion', 'nacional')
        
        try:
            extractor = SalesInvoicePDFExtractor()
            file_content = archivo_pdf.read()
            extracted_data = extractor.extract_invoice_data(file_content, tipo_factura)
            
            return Response({
                'success': True,
                'patron_utilizado': extracted_data.get('patron_utilizado'),
                'confidence': extracted_data.get('confidence'),
                'extracted_data': {
                    k: str(v) if v is not None else None 
                    for k, v in extracted_data.items() 
                    if k not in ['patron_utilizado', 'confidence']
                },
                'message': f"Extracción completada con {extracted_data.get('confidence', 0):.0%} de confianza"
            })
            
        except Exception as e:
            logger.error(f"Error en preview de extracción: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al extraer datos del PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def associate_costs(self, request, pk=None):
        """
        Asocia facturas de costo a una factura de venta.

        Permite asociar costos independientemente de si son mayores o menores
        que el monto de la venta (escenario de ganancia o pérdida).

        Además, actualiza las fechas de facturación de las facturas de costo asociadas.
        """
        from .serializers import actualizar_fechas_facturas_costo_asociadas

        sales_invoice = self.get_object()
        cost_invoice_ids = request.data.get('invoice_ids', [])

        # Obtener todas las facturas de costo
        cost_invoices = Invoice.objects.filter(id__in=cost_invoice_ids)

        # Asociar cada factura de costo con su monto completo disponible
        for cost_invoice in cost_invoices:
            # Usar el monto aplicable completo de la factura de costo
            monto_a_asignar = cost_invoice.get_monto_aplicable()

            # Verificar si ya existe la asociación
            mapping, created = InvoiceSalesMapping.objects.get_or_create(
                sales_invoice=sales_invoice,
                cost_invoice=cost_invoice,
                defaults={'monto_asignado': monto_a_asignar}
            )

            # Si ya existía, actualizar el monto
            if not created:
                mapping.monto_asignado = monto_a_asignar
                mapping.save()

        # Actualizar fechas de las facturas de costo asociadas
        actualizar_fechas_facturas_costo_asociadas(sales_invoice, cost_invoice_ids)

        serializer = self.get_serializer(sales_invoice)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Estadísticas de facturas de venta para pestañas y dashboard.

        Retorna contadores por estado para implementar sistema de tabs.
        """
        queryset = self.get_queryset()

        # Contadores totales
        total = queryset.count()
        total_monto = queryset.aggregate(Sum('monto_total'))['monto_total__sum'] or Decimal('0.00')
        total_cobrado = queryset.aggregate(Sum('monto_pagado'))['monto_pagado__sum'] or Decimal('0.00')
        total_pendiente = queryset.aggregate(Sum('monto_pendiente'))['monto_pendiente__sum'] or Decimal('0.00')

        # Contadores por nuevo estado de facturación
        facturadas = queryset.filter(estado_facturacion='facturada').count()
        pendientes_cobro = queryset.filter(estado_facturacion='pendiente_cobro').count()
        pagadas = queryset.filter(estado_facturacion='pagada').count()
        anuladas = queryset.filter(estado_facturacion__in=['anulada', 'anulada_parcial']).count()

        stats = {
            # Totales generales
            'total': total,
            'total_monto': float(total_monto),
            'total_cobrado': float(total_cobrado),
            'total_pendiente': float(total_pendiente),

            # Por estado de facturación (nuevos estados)
            'facturadas': facturadas,
            'pendientes_cobro': pendientes_cobro,
            'pagadas': pagadas,
            'anuladas': anuladas,
        }

        return Response(stats)



    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ot_info(self, request):
        """
        Obtiene información de una OT para auto-completar formulario.
        Params: ot_id
        """
        ot_id = request.query_params.get('ot_id')

        if not ot_id:
            return Response({'error': 'ot_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ot = OT.objects.get(id=ot_id, deleted_at__isnull=True)

            # Obtener cliente alias asociado
            cliente_alias = None
            if hasattr(ot, 'cliente_alias') and ot.cliente_alias:
                cliente_alias = {
                    'id': ot.cliente_alias.id,
                    'alias': ot.cliente_alias.alias,
                    'short_name': ot.cliente_alias.short_name,
                }

            data = {
                'ot_numero': ot.numero_ot,
                'cliente_nombre': ot.cliente.short_name if ot.cliente else '',
                'cliente_alias': cliente_alias,
                'tipo_operacion': ot.tipo_operacion,
                'contenedor': ot.contenedor,
                'mbl': ot.mbl,
                'estado': ot.estado,
            }

            return Response(data, status=status.HTTP_200_OK)

        except OT.DoesNotExist:
            return Response({'error': 'OT no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def provisionadas(self, request):
        """
        Lista facturas de costo provisionadas (para finanzas).
        Estas son las facturas listas para asociar a facturas de venta.
        """
        provisionadas = Invoice.objects.filter(
            deleted_at__isnull=True
        ).select_related('proveedor', 'ot').order_by('-fecha_provision')

        # Filtros opcionales
        ot_id = request.query_params.get('ot_id')
        if ot_id:
            provisionadas = provisionadas.filter(ot_id=ot_id)

        serializer = CostInvoiceBasicSerializer(provisionadas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def cost_mappings(self, request, pk=None):
        """Lista todas las asociaciones de costos para esta factura de venta."""
        sales_invoice = self.get_object()
        mappings = sales_invoice.cost_mappings.select_related('cost_invoice__proveedor').all()
        serializer = InvoiceSalesMappingSerializer(mappings, many=True)
        total_costos = mappings.aggregate(Sum('monto_asignado'))['monto_asignado__sum'] or Decimal('0.00')
        return Response({
            'cost_mappings': serializer.data,
            'total_costos_asignados': str(total_costos),
            'margen_actual': str(sales_invoice.margen_bruto),
            'porcentaje_margen': str(sales_invoice.porcentaje_margen),
        })

    @action(detail=True, methods=['post'])
    def add_cost(self, request, pk=None):
        """Agrega una nueva factura de costo a la factura de venta."""
        sales_invoice = self.get_object()
        cost_invoice_id = request.data.get('cost_invoice_id')
        monto_asignado = request.data.get('monto_asignado')
        notas = request.data.get('notas', '')

        if not cost_invoice_id or not monto_asignado:
            return Response(
                {'error': 'cost_invoice_id y monto_asignado son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            monto_asignado_decimal = Decimal(str(monto_asignado))
        except Exception:
            return Response({'error': 'Monto asignado inválido'}, status=status.HTTP_400_BAD_REQUEST)

        if monto_asignado_decimal <= 0:
            return Response({'error': 'El monto debe ser mayor a 0'}, status=status.HTTP_400_BAD_REQUEST)

        logging.info(f"Attempting to add cost with monto_asignado: {monto_asignado}")

        try:
            cost_invoice = Invoice.objects.get(id=cost_invoice_id, deleted_at__isnull=True)
        except Invoice.DoesNotExist:
            return Response({'error': 'Factura de costo no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        if InvoiceSalesMapping.objects.filter(sales_invoice=sales_invoice, cost_invoice=cost_invoice).exists():
            return Response({'error': 'Esta factura de costo ya está asociada'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.core.exceptions import ValidationError
            mapping = InvoiceSalesMapping.objects.create(
                sales_invoice=sales_invoice,
                cost_invoice=cost_invoice,
                monto_asignado=monto_asignado_decimal,
                notas=notas
            )
            sales_invoice.refresh_from_db()
            return Response({
                'message': 'Factura de costo asociada exitosamente',
                'mapping': InvoiceSalesMappingSerializer(mapping).data,
                'updated_margins': {
                    'margen_bruto': str(sales_invoice.margen_bruto),
                    'porcentaje_margen': str(sales_invoice.porcentaje_margen),
                }
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logging.error(f"Error creating InvoiceSalesMapping: {e}")
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'], url_path='remove_cost/(?P<mapping_id>[^/.]+)')
    def remove_cost(self, request, pk=None, mapping_id=None):
        """Elimina una asociación de costo existente."""
        sales_invoice = self.get_object()
        try:
            mapping = InvoiceSalesMapping.objects.get(id=mapping_id, sales_invoice=sales_invoice)
            mapping.delete()
            sales_invoice.refresh_from_db()
            return Response({
                'message': 'Asociación eliminada exitosamente',
                'updated_margins': {
                    'margen_bruto': str(sales_invoice.margen_bruto),
                    'porcentaje_margen': str(sales_invoice.porcentaje_margen),
                }
            })
        except InvoiceSalesMapping.DoesNotExist:
            return Response({'error': 'Asociación no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'], url_path='update_cost/(?P<mapping_id>[^/.]+)')
    def update_cost(self, request, pk=None, mapping_id=None):
        """Actualiza el monto asignado de una asociación existente."""
        from django.core.exceptions import ValidationError
        sales_invoice = self.get_object()
        try:
            mapping = InvoiceSalesMapping.objects.get(id=mapping_id, sales_invoice=sales_invoice)
            nuevo_monto = request.data.get('monto_asignado')
            if nuevo_monto:
                mapping.monto_asignado = Decimal(str(nuevo_monto))
            if 'notas' in request.data:
                mapping.notas = request.data['notas']
            mapping.save()
            sales_invoice.refresh_from_db()
            return Response({
                'message': 'Asociación actualizada exitosamente',
                'mapping': InvoiceSalesMappingSerializer(mapping).data,
                'updated_margins': {
                    'margen_bruto': str(sales_invoice.margen_bruto),
                    'porcentaje_margen': str(sales_invoice.porcentaje_margen),
                }
            })
        except InvoiceSalesMapping.DoesNotExist:
            return Response({'error': 'Asociación no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def available_costs(self, request, pk=None):
        """Lista facturas de costo disponibles para asociar."""
        sales_invoice = self.get_object()
        associated_ids = sales_invoice.cost_mappings.values_list('cost_invoice_id', flat=True)
        available = Invoice.objects.filter(
            deleted_at__isnull=True
        ).exclude(id__in=associated_ids)
        if sales_invoice.ot:
            available = available.filter(ot=sales_invoice.ot)
        serializer = CostInvoiceBasicSerializer(available, many=True)
        return Response({'available_invoices': serializer.data})


class PaymentViewSet(CloudinaryFileMixin, viewsets.ModelViewSet):
    """
    ViewSet para Pagos Recibidos (Sales Payments).

    MÓDULO OCULTO - Solo Admin puede acceder.

    Este módulo está restringido exclusivamente al rol Admin.
    Otros roles (incluido Finanzas) NO tienen acceso.
    """
    permission_classes = [IsAdminOnly]
    queryset = Payment.objects.filter(deleted_at__isnull=True)
    serializer_class = PaymentListSerializer
    filterset_class = PaymentFilter
    cloudinary_file_field = 'archivo_comprobante'

    def get_download_filename(self, obj):
        return f"comprobante_pago_{obj.referencia}.pdf"

    def get_queryset(self):
        """Optimizar queries con select_related"""
        return super().get_queryset().select_related('sales_invoice', 'sales_invoice__cliente')

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        payment = self.get_object()
        payment.validar(request.user)
        return Response({'status': 'validated'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        payment = self.get_object()
        motivo = request.data.get('motivo', '')
        payment.rechazar(request.user, motivo)
        return Response({'status': 'rejected'})


class FinanceDashboardView(APIView):
    """Dashboard principal para finanzas con métricas clave."""
    permission_classes = [IsAuthenticated, IsFinanzasOrAdmin]

    def get(self, request):
        hoy = timezone.now().date()
        # Filtros de fecha (opcional)
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        # Query base
        sales_invoices = SalesInvoice.objects.filter(deleted_at__isnull=True)
        cost_invoices = Invoice.objects.filter(deleted_at__isnull=True)

        # Aplicar filtros de fecha si existen
        if fecha_inicio:
            sales_invoices = sales_invoices.filter(fecha_emision__gte=fecha_inicio)
            cost_invoices = cost_invoices.filter(fecha_emision__gte=fecha_inicio)

        if fecha_fin:
            sales_invoices = sales_invoices.filter(fecha_emision__lte=fecha_fin)
            cost_invoices = cost_invoices.filter(fecha_emision__lte=fecha_fin)

        # === MÉTRICAS DE VENTAS ===
        total_vendido = sales_invoices.aggregate(Sum('monto_total'))['monto_total__sum'] or Decimal('0.00')
        total_cobrado = sales_invoices.aggregate(Sum('monto_pagado'))['monto_pagado__sum'] or Decimal('0.00')
        por_cobrar = sales_invoices.aggregate(Sum('monto_pendiente'))['monto_pendiente__sum'] or Decimal('0.00')

        # Facturas de venta por estado
        total_facturas = sales_invoices.count()
        facturas_cobradas = sales_invoices.filter(estado_pago='pagado_total').count()
        facturas_pendientes = sales_invoices.filter(estado_pago__in=['pendiente', 'pagado_parcial']).count()
        facturas_vencidas = sales_invoices.filter(estado_pago__in=['pendiente', 'pagado_parcial'], fecha_vencimiento__lt=hoy).count()

        # === MÉTRICAS DE COSTOS PROVISIONADOS ===
        facturas_provisionadas = cost_invoices.filter(estado_provision='provisionada')
        total_provisionadas = facturas_provisionadas.count()
        monto_provisionadas = facturas_provisionadas.aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')

        # Facturas provisionadas sin asociar a venta
        provisionadas_sin_asociar = facturas_provisionadas.exclude(
            id__in=InvoiceSalesMapping.objects.values_list('cost_invoice_id', flat=True)
        ).count()

        # === MÉTRICAS DE PAGOS ===
        payments = Payment.objects.filter(deleted_at__isnull=True)

        if fecha_inicio:
            payments = payments.filter(fecha_pago__gte=fecha_inicio)
        if fecha_fin:
            payments = payments.filter(fecha_pago__lte=fecha_fin)

        total_pagos = payments.count()
        pagos_validados = payments.filter(estado='validado').count()
        pagos_pendientes = payments.filter(estado='pendiente').count()
        monto_pendiente_validacion = payments.filter(estado='pendiente').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')

        # === CÁLCULO DE MÁRGENES ===
        # Calcular margen bruto total
        margen_bruto_total = total_vendido - monto_provisionadas

        # === TOP OTs POR MARGEN ===
        from ots.models import OT
        top_ots = OT.objects.filter(
            deleted_at__isnull=True,
            estado_facturacion_venta__in=['facturada', 'pendiente_cobro', 'pagada']
        ).order_by('-margen_bruto')[:10]

        top_ots_data = []
        for ot in top_ots:
            top_ots_data.append({
                'id': ot.id,
                'numero_ot': ot.numero_ot,
                'cliente_nombre': ot.cliente_nombre,
                'monto_total_vendido': str(ot.monto_total_vendido or Decimal('0.00')),
                'monto_total_costos': str(ot.monto_total_costos or Decimal('0.00')),
                'margen_bruto': str(ot.margen_bruto or Decimal('0.00')),
                'porcentaje_margen': str(ot.porcentaje_margen or Decimal('0.00')),
            })

        # === FACTURAS PRÓXIMAS A VENCER ===
        from datetime import timedelta
        hoy = timezone.now().date()
        proximos_7_dias = hoy + timedelta(days=7)

        facturas_proximas_vencer = sales_invoices.filter(
            fecha_vencimiento__isnull=False,
            fecha_vencimiento__gte=hoy,
            fecha_vencimiento__lte=proximos_7_dias,
            estado_pago__in=['pendiente', 'pagado_parcial']
        ).order_by('fecha_vencimiento')[:10]

        facturas_vencer_data = []
        for factura in facturas_proximas_vencer:
            facturas_vencer_data.append({
                'id': factura.id,
                'numero_factura': factura.numero_factura,
                'cliente_nombre': factura.cliente.short_name if factura.cliente else 'N/A',
                'fecha_vencimiento': factura.fecha_vencimiento.strftime('%Y-%m-%d'),
                'monto_pendiente': str(factura.monto_pendiente),
            })

        return Response({
            'total_vendido': str(total_vendido),
            'total_cobrado': str(total_cobrado),
            'por_cobrar': str(por_cobrar),
            'margen_bruto_total': str(margen_bruto_total),

            'total_facturas': total_facturas,
            'facturas_cobradas': facturas_cobradas,
            'facturas_pendientes': facturas_pendientes,
            'facturas_vencidas': facturas_vencidas,

            'total_provisionadas': total_provisionadas,
            'monto_provisionadas': str(monto_provisionadas),
            'provisionadas_sin_asociar': provisionadas_sin_asociar,

            'total_pagos': total_pagos,
            'pagos_validados': pagos_validados,
            'pagos_pendientes': pagos_pendientes,
            'monto_pendiente_validacion': str(monto_pendiente_validacion),

            'top_ots_margen': top_ots_data,
            'facturas_proximas_vencer': facturas_vencer_data,
        })


class SalesInvoiceItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar líneas/items de facturas de venta.
    Permite CRUD completo sobre las líneas con cálculos automáticos.
    """
    permission_classes = [IsAuthenticated, CanManageSalesInvoices]
    serializer_class = SalesInvoiceItemSerializer

    def get_queryset(self):
        """
        Filtrar por factura si se proporciona factura_id como query param.
        """
        queryset = SalesInvoiceItem.objects.filter(deleted_at__isnull=True)

        factura_id = self.request.query_params.get('factura_id')
        if factura_id:
            queryset = queryset.filter(factura_id=factura_id)

        return queryset.select_related('factura').order_by('numero_linea')

    def perform_create(self, serializer):
        """
        Al crear una línea, se guardará automáticamente y los signals
        recalcularán los totales de la factura.
        """
        item = serializer.save(modificado_por=self.request.user.username)

        # Log de creación
        logger = logging.getLogger(__name__)
        logger.info(
            f"Línea creada en factura {item.factura.numero_factura}: "
            f"{item.descripcion} - ${item.total}"
        )

    def perform_update(self, serializer):
        """
        Al actualizar una línea, los totales se recalcularán automáticamente.
        """
        item = serializer.save(modificado_por=self.request.user.username)

        logger = logging.getLogger(__name__)
        logger.info(
            f"Línea actualizada en factura {item.factura.numero_factura}: "
            f"{item.descripcion} - ${item.total}"
        )

    def perform_destroy(self, instance):
        """
        Soft delete de la línea. Los signals recalcularán los totales.
        """
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save()

        logger = logging.getLogger(__name__)
        logger.info(
            f"Línea eliminada de factura {instance.factura.numero_factura}: "
            f"{instance.descripcion}"
        )

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Crea múltiples líneas de una vez para una factura.

        Body:
        {
            "factura_id": 123,
            "lineas": [
                {
                    "descripcion": "Flete Local",
                    "cantidad": 1,
                    "precio_unitario": 500.00,
                    "aplica_iva": true,
                    ...
                },
                ...
            ]
        }
        """
        factura_id = request.data.get('factura_id')
        lineas_data = request.data.get('lineas', [])

        if not factura_id:
            return Response(
                {'error': 'factura_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            factura = SalesInvoice.objects.get(id=factura_id, deleted_at__isnull=True)
        except SalesInvoice.DoesNotExist:
            return Response(
                {'error': 'Factura no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Crear líneas
        lineas_creadas = []
        for idx, linea_data in enumerate(lineas_data, start=1):
            linea_data['factura'] = factura.id
            linea_data['numero_linea'] = idx
            linea_data['modificado_por'] = request.user.username

            serializer = self.get_serializer(data=linea_data)
            serializer.is_valid(raise_exception=True)
            linea = serializer.save()
            lineas_creadas.append(linea)

        # Serializar respuesta
        response_serializer = self.get_serializer(lineas_creadas, many=True)

        return Response({
            'lineas_creadas': len(lineas_creadas),
            'lineas': response_serializer.data,
            'totales': factura.recalcular_totales_desde_lineas()
        }, status=status.HTTP_201_CREATED)


class CreditNoteViewSet(CloudinaryFileMixin, viewsets.ModelViewSet):
    """ViewSet para Notas de Crédito"""
    permission_classes = [IsAuthenticated, CanManageSalesInvoices]
    serializer_class = CreditNoteSerializer
    filterset_fields = ['sales_invoice']
    cloudinary_file_field = 'archivo_pdf'

    def get_download_filename(self, obj):
        return f"nota_credito_{obj.numero_nota_credito}.pdf"

    def get_queryset(self):
        from .models import CreditNote
        return CreditNote.objects.filter(deleted_at__isnull=True)

    def create(self, request, *args, **kwargs):
        """Crear nota de crédito con archivo PDF opcional"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

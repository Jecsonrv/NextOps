"""
Views para el módulo de Invoices.
Maneja CRUD de facturas, upload de archivos, matching y estadísticas.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.core.files.storage import default_storage
from django.http import FileResponse
from decimal import Decimal
from datetime import datetime, date
import uuid
import os

from .models import Invoice, UploadedFile
from ots.models import OT
from catalogs.models import Provider
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    InvoiceUpdateSerializer,
    InvoiceStatsSerializer,
    UploadedFileSerializer,
)
from common.permissions import IsJefeOperaciones


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de facturas.
    
    Endpoints:
    - GET /invoices/ - Listar facturas
    - POST /invoices/ - Crear factura manual
    - GET /invoices/{id}/ - Detalle de factura
    - PUT/PATCH /invoices/{id}/ - Actualizar factura
    - DELETE /invoices/{id}/ - Eliminar (soft delete) factura
    - POST /invoices/upload/ - Upload masivo de facturas
    - GET /invoices/pending/ - Facturas pendientes de revisión
    - GET /invoices/stats/ - Estadísticas
    - POST /invoices/{id}/assign_ot/ - Asignar OT manualmente
    """
    
    permission_classes = [IsAuthenticated]
    queryset = Invoice.objects.filter(is_deleted=False).select_related(
        'ot', 'proveedor', 'uploaded_file'
    )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        elif self.action in ['create', 'upload']:
            return InvoiceCreateSerializer
        elif self.action in ['update', 'partial_update', 'assign_ot']:
            return InvoiceUpdateSerializer
        elif self.action == 'stats':
            return InvoiceStatsSerializer
        return InvoiceDetailSerializer
    
    def get_queryset(self):
        """
        Filtrado avanzado de facturas.
        Query params:
        - estado_provision: pendiente, provisionada, rechazada
        - estado_facturacion: pendiente, facturada
        - requiere_revision: true, false
        - ot_number: número de OT
        - proveedor_nombre: búsqueda parcial
        - fecha_desde: YYYY-MM-DD
        - fecha_hasta: YYYY-MM-DD
        - search: búsqueda general
        """
        queryset = super().get_queryset()
        
        # Filtros
        estado_provision = self.request.query_params.get('estado_provision')
        if estado_provision:
            queryset = queryset.filter(estado_provision=estado_provision)
        
        estado_facturacion = self.request.query_params.get('estado_facturacion')
        if estado_facturacion:
            queryset = queryset.filter(estado_facturacion=estado_facturacion)
        
        requiere_revision = self.request.query_params.get('requiere_revision')
        if requiere_revision:
            value = requiere_revision.lower() == 'true'
            queryset = queryset.filter(requiere_revision=value)
        
        ot_number = self.request.query_params.get('ot_number')
        if ot_number:
            queryset = queryset.filter(ot_number__icontains=ot_number)
        
        proveedor = self.request.query_params.get('proveedor_nombre')
        if proveedor:
            queryset = queryset.filter(proveedor_nombre__icontains=proveedor)
        
        ot_id = self.request.query_params.get('ot') or self.request.query_params.get('ot_id')
        if ot_id:
            queryset = queryset.filter(ot_id=ot_id)

        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(fecha_emision__gte=fecha_desde)
        
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(fecha_emision__lte=fecha_hasta)
        
        # Búsqueda general
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(numero_factura__icontains=search) |
                Q(proveedor_nombre__icontains=search) |
                Q(ot_number__icontains=search) |
                Q(notas__icontains=search)
            )
        
        return queryset.distinct()
    
    @action(detail=True, methods=['get'], url_path='file')
    def retrieve_file(self, request, pk=None):
        """Permite descargar o previsualizar el archivo original de la factura."""
        invoice = self.get_object()

        if not invoice.uploaded_file:
            return Response(
                {'detail': 'La factura no tiene archivo asociado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        storage_path = invoice.uploaded_file.path

        if not default_storage.exists(storage_path):
            return Response(
                {'detail': 'Archivo no encontrado en el almacenamiento.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            file_handle = default_storage.open(storage_path, 'rb')
        except Exception as exc:  # pragma: no cover
            return Response(
                {'detail': f'No se pudo abrir el archivo: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Generar nombre de archivo amigable usando short_name del cliente si existe
        filename = self._generate_friendly_filename(invoice)
        if not filename:
            # Fallback al nombre original
            filename = invoice.uploaded_file.filename or storage_path.split('/')[-1]
        
        content_type = invoice.uploaded_file.content_type or 'application/octet-stream'

        response = FileResponse(file_handle, content_type=content_type)

        download_flag = str(request.query_params.get('download', '')).lower()
        disposition = 'attachment' if download_flag in ('1', 'true', 'yes') else 'inline'
        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        response['Content-Length'] = invoice.uploaded_file.size
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'

        return response
    
    def _generate_friendly_filename(self, invoice):
        """
        Genera un nombre de archivo amigable para la factura.
        Formato: {CLIENTE_SHORT}_{PROVEEDOR}_{NUM_FACTURA}.pdf
        
        Ejemplo: SIMAN_MAERSK_INV-2024-001.pdf
        """
        import re
        from datetime import datetime
        
        try:
            parts = []
            
            # 1. Cliente (short_name si existe)
            if invoice.ot and invoice.ot.cliente:
                cliente = invoice.ot.cliente
                if cliente.short_name:
                    parts.append(cliente.short_name)
                else:
                    # Fallback: usar primeras palabras del nombre normalizado
                    name_parts = cliente.normalized_name.split()[:2]
                    parts.append('_'.join(name_parts))
            
            # 2. Proveedor (primeras palabras)
            if invoice.proveedor:
                proveedor_name = invoice.proveedor.nombre.upper()
            else:
                proveedor_name = invoice.proveedor_nombre.upper()
            
            # Tomar primera palabra significativa del proveedor
            proveedor_words = re.sub(r'[^\w\s]', '', proveedor_name).split()
            proveedor_short = next(
                (w for w in proveedor_words if len(w) > 3 and w not in ['S.A', 'LTDA', 'INC', 'CORP']),
                proveedor_words[0] if proveedor_words else 'PROVEEDOR'
            )[:15]
            parts.append(proveedor_short)
            
            # 3. Número de factura (limpio)
            numero_factura = re.sub(r'[^\w\-]', '', invoice.numero_factura)[:30]
            parts.append(numero_factura)
            
            # 4. Extensión original
            original_filename = invoice.uploaded_file.filename or 'invoice.pdf'
            ext = os.path.splitext(original_filename)[1] or '.pdf'
            
            # Construir filename
            filename = '_'.join(parts) + ext
            
            # Validar que no sea muy largo
            if len(filename) > 200:
                # Truncar manteniendo extensión
                filename = filename[:196] + ext
            
            return filename
            
        except Exception as e:
            # En caso de error, retornar None para usar el fallback
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error generando nombre amigable para factura {invoice.id}: {e}")
            return None

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def upload(self, request):
        """
        Upload múltiple de facturas con reconocimiento automático usando patrones.
        
        Proceso:
        1. Guardar archivo y calcular hash
        2. Extraer texto del PDF
        3. Aplicar patrones del proveedor + genéricos
        4. Crear factura con campos auto-detectados
        5. Si se detecta contenedor, intentar match con OT
        """
        import logging
        from .parsers.pdf_extractor import PDFExtractor
        from .parsers.pattern_service import PatternApplicationService
        
        logger = logging.getLogger(__name__)
        
        files = request.FILES.getlist('files[]')
        proveedor_id = request.data.get('proveedor_id')
        tipo_costo = request.data.get('tipo_costo', 'OTRO')
        auto_parse = request.data.get('auto_parse', 'true').lower() == 'true'
        
        if not files:
            return Response(
                {'error': 'No se enviaron archivos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not proveedor_id:
            return Response(
                {'error': 'Debe seleccionar un proveedor'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el proveedor existe
        try:
            proveedor = Provider.objects.get(id=proveedor_id)
        except Provider.DoesNotExist:
            return Response(
                {'error': 'Proveedor no encontrado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Inicializar servicios
        pdf_extractor = PDFExtractor()
        pattern_service = PatternApplicationService(provider_id=int(proveedor_id))
        
        results = {
            'success': [],
            'errors': [],
            'duplicates': [],
            'patterns_used': pattern_service.get_patterns_summary(),  # Para mostrar en frontend
        }
        
        for file in files:
            try:
                # Calcular hash
                file.seek(0)
                file_content = file.read()
                file_hash = UploadedFile.calculate_hash(file_content)
                
                # Verificar duplicado: buscar archivo por hash
                existing_file = UploadedFile.objects.filter(sha256=file_hash).first()
                
                if existing_file:
                    # Verificar si hay facturas ACTIVAS asociadas a este archivo
                    # Si todas las facturas fueron eliminadas (is_deleted=True), permitir re-subir
                    active_invoices = Invoice.objects.filter(
                        uploaded_file=existing_file,
                        is_deleted=False
                    ).exists()
                    
                    if active_invoices:
                        results['duplicates'].append({
                            'filename': file.name,
                            'reason': f'Archivo duplicado con factura activa (SHA256: {file_hash[:8]}...)'
                        })
                        continue
                    # Si no hay facturas activas, permitir re-subir (reutilizar el mismo archivo)
                
                # Guardar archivo (solo si no existe) o reutilizar el existente
                if not existing_file:
                    file.seek(0)
                    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                    safe_filename = f"{timestamp}_{file.name}"
                    
                    path = default_storage.save(f'invoices/{safe_filename}', file)
                    
                    uploaded_file = UploadedFile.objects.create(
                        filename=file.name,
                        path=path,
                        sha256=file_hash,
                        size=file.size,
                        content_type=file.content_type
                    )
                else:
                    # Reutilizar archivo existente (fue eliminado anteriormente)
                    uploaded_file = existing_file
                
                # Datos extraídos (con valores por defecto)
                extracted_data = {
                    'numero_factura': None,
                    'fecha_emision': timezone.now().date(),
                    'monto': Decimal('0.00'),
                    'numero_contenedor': None,
                    'mbl': None,
                    'ot_matched': None,
                    'confidence': 0.0,
                    'extraction_details': {},
                }
                
                # Auto-parsing con patrones
                if auto_parse and file.content_type == 'application/pdf':
                    try:
                        # 1. Extraer texto del PDF
                        file.seek(0)
                        pdf_result = pdf_extractor.extract(file.read())
                        text = pdf_extractor.text
                        
                        # 2. Aplicar patrones
                        if text:
                            pattern_results = pattern_service.apply_patterns(text)
                            
                            # 3. Mapear resultados a campos de factura
                            if 'numero_factura' in pattern_results:
                                extracted_data['numero_factura'] = pattern_results['numero_factura']['value']
                                extracted_data['confidence'] = pattern_results['numero_factura']['confidence']
                            
                            if 'monto_total' in pattern_results:
                                extracted_data['monto'] = pattern_results['monto_total']['value']
                            
                            if 'fecha_emision' in pattern_results:
                                fecha = pattern_results['fecha_emision']['value']
                                if fecha:
                                    if isinstance(fecha, datetime):
                                        extracted_data['fecha_emision'] = fecha.date()
                                    elif isinstance(fecha, date):
                                        extracted_data['fecha_emision'] = fecha
                                    else:
                                        # Intentar convertir string a fecha
                                        try:
                                            from dateutil import parser
                                            parsed_date = parser.parse(str(fecha))
                                            extracted_data['fecha_emision'] = parsed_date.date()
                                        except:
                                            logger.warning(f"No se pudo parsear fecha: {fecha}")
                                            # Mantener fecha por defecto
                            
                            if 'numero_contenedor' in pattern_results:
                                extracted_data['numero_contenedor'] = pattern_results['numero_contenedor']['value']
                            
                            if 'mbl' in pattern_results:
                                extracted_data['mbl'] = pattern_results['mbl']['value']
                            
                            # 4. Intentar matching automático con OT
                            # Prioridad 1: MBL (más específico)
                            # Prioridad 2: Contenedor (menos específico)
                            matched_ot = None
                            match_method = None
                            
                            if extracted_data['mbl']:
                                mbl = extracted_data['mbl'].strip()
                                matched_ot = OT.objects.filter(
                                    master_bl__icontains=mbl,
                                    is_deleted=False
                                ).first()
                                
                                if matched_ot:
                                    match_method = 'MBL'
                                    logger.info(f"✓ OT matched por MBL '{mbl}': {matched_ot.numero_ot}")
                            
                            # Si no encontró por MBL, intentar con contenedor
                            if not matched_ot and extracted_data['numero_contenedor']:
                                contenedor = extracted_data['numero_contenedor'].strip()
                                # Buscar en el array de contenedores (campo JSONField)
                                matched_ot = OT.objects.filter(
                                    contenedores__contains=[contenedor],
                                    is_deleted=False
                                ).first()
                                
                                # Si no encuentra exacto, buscar parcial en el array
                                if not matched_ot:
                                    all_ots = OT.objects.filter(is_deleted=False)
                                    for ot in all_ots:
                                        if ot.contenedores and isinstance(ot.contenedores, list):
                                            for cont in ot.contenedores:
                                                if contenedor.upper() in cont.upper():
                                                    matched_ot = ot
                                                    break
                                        if matched_ot:
                                            break
                                
                                if matched_ot:
                                    match_method = 'Contenedor'
                                    logger.info(f"✓ OT matched por Contenedor '{contenedor}': {matched_ot.numero_ot}")
                            
                            # Guardar resultado del matching
                            if matched_ot:
                                extracted_data['ot_matched'] = matched_ot.numero_ot
                                extracted_data['match_method'] = match_method
                            else:
                                if extracted_data['mbl'] or extracted_data['numero_contenedor']:
                                    logger.warning(
                                        f"⚠ No se encontró OT para MBL='{extracted_data['mbl']}' "
                                        f"o Contenedor='{extracted_data['numero_contenedor']}'"
                                    )
                            
                            # Guardar todos los detalles
                            extracted_data['extraction_details'] = pattern_results
                    
                    except Exception as e:
                        logger.error(f"Error en auto-parsing para {file.name}: {e}")
                        # Continuar con valores por defecto
                
                # Crear Invoice
                # Si no se extrajo número de factura, usar temporal
                numero_factura = extracted_data['numero_factura']
                if not numero_factura:
                    numero_factura = f"TEMP-{uuid.uuid4().hex[:12].upper()}"
                
                # Determinar si requiere revisión
                requiere_revision = (
                    extracted_data['confidence'] < 0.7 or
                    not extracted_data['numero_factura'] or
                    extracted_data['monto'] == Decimal('0.00')
                )
                
                invoice = Invoice.objects.create(
                    uploaded_file=uploaded_file,
                    proveedor=proveedor,
                    proveedor_nombre=proveedor.nombre,
                    proveedor_nit=proveedor.nit or '',
                    tipo_proveedor=proveedor.tipo,
                    proveedor_categoria=proveedor.categoria,
                    numero_factura=numero_factura,
                    fecha_emision=extracted_data['fecha_emision'],
                    monto=extracted_data['monto'],
                    tipo_costo=tipo_costo,
                    estado_provision='pendiente',
                    estado_facturacion='pendiente',
                    processing_source='upload_auto' if auto_parse else 'upload_manual',
                    processed_by=str(request.user.id),
                    processed_at=timezone.now(),
                    requiere_revision=requiere_revision,
                    confianza_match=Decimal(str(extracted_data['confidence'])),
                )
                
                # Si hay OT matcheada, asignarla
                if extracted_data['ot_matched']:
                    try:
                        ot = OT.objects.get(numero_ot=extracted_data['ot_matched'])
                        invoice.ot = ot
                        invoice.ot_number = ot.numero_ot
                        invoice.save()
                    except OT.DoesNotExist:
                        pass
                
                # Preparar respuesta
                result_item = {
                    'filename': file.name,
                    'file_id': uploaded_file.id,
                    'invoice_id': invoice.id,
                    'numero_factura': invoice.numero_factura,
                    'monto': float(invoice.monto),
                    'fecha_emision': invoice.fecha_emision.isoformat(),
                    'confidence': float(extracted_data['confidence']),
                    'requiere_revision': requiere_revision,
                    'ot_matched': extracted_data['ot_matched'],
                    'match_method': extracted_data.get('match_method'),  # MBL o Contenedor
                    'numero_contenedor': extracted_data['numero_contenedor'],
                    'mbl': extracted_data['mbl'],
                    'size': uploaded_file.size,
                }
                
                # Mensaje descriptivo
                messages = []
                if auto_parse:
                    if extracted_data['numero_factura']:
                        messages.append(f"✓ Factura detectada: {extracted_data['numero_factura']}")
                    if extracted_data['monto'] and extracted_data['monto'] > 0:
                        messages.append(f"✓ Monto: ${extracted_data['monto']}")
                    if extracted_data['mbl']:
                        messages.append(f"✓ MBL: {extracted_data['mbl']}")
                    if extracted_data['numero_contenedor']:
                        messages.append(f"✓ Contenedor: {extracted_data['numero_contenedor']}")
                    if extracted_data['ot_matched']:
                        match_info = f"✓ OT asignada: {extracted_data['ot_matched']}"
                        if extracted_data.get('match_method'):
                            match_info += f" (por {extracted_data['match_method']})"
                        messages.append(match_info)
                    elif extracted_data['mbl'] or extracted_data['numero_contenedor']:
                        # Tiene MBL/Contenedor pero no encontró OT
                        messages.append("⚠ No se encontró OT para MBL/Contenedor")
                    if requiere_revision:
                        messages.append("⚠ Requiere revisión manual")
                else:
                    messages.append("Factura creada. Debe editarla manualmente.")
                
                result_item['message'] = " | ".join(messages) if messages else "Procesada"
                
                results['success'].append(result_item)
                
            except Exception as e:
                logger.error(f"Error procesando {file.name}: {e}", exc_info=True)
                results['errors'].append({
                    'filename': file.name,
                    'error': str(e)
                })
        
        return Response({
            'total': len(files),
            'processed': len(results['success']),
            'duplicates': len(results['duplicates']),
            'errors': len(results['errors']),
            'results': results,
            'patterns_available': len(results['patterns_used']),
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Listar facturas pendientes de revisión.
        Ordenadas por fecha de emisión descendente.
        """
        queryset = self.get_queryset().filter(requiere_revision=True)
        
        # Ordenar
        queryset = queryset.order_by('-fecha_emision', '-created_at')
        
        # Paginar
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = InvoiceListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = InvoiceListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Estadísticas de facturas.
        
        Query params opcionales:
        - fecha_desde: YYYY-MM-DD
        - fecha_hasta: YYYY-MM-DD
        """
        queryset = self.get_queryset()
        
        # Filtrar por rango de fechas si se proporciona
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            queryset = queryset.filter(fecha_emision__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_emision__lte=fecha_hasta)
        
        # Calcular estadísticas
        total = queryset.count()
        pendientes_revision = queryset.filter(requiere_revision=True).count()
        provisionadas = queryset.filter(estado_provision='provisionada').count()
        facturadas = queryset.filter(estado_facturacion='facturada').count()
        sin_ot = queryset.filter(ot__isnull=True).count()
        
        # Monto total
        total_monto = queryset.aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        # Por tipo de costo
        por_tipo_costo = {}
        for tipo, label in Invoice.TIPO_COSTO_CHOICES:
            count = queryset.filter(tipo_costo=tipo).count()
            monto = queryset.filter(tipo_costo=tipo).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
            if count > 0:
                por_tipo_costo[label] = {
                    'count': count,
                    'monto': float(monto)
                }
        
        # Top 10 proveedores
        por_proveedor = list(
            queryset.values('proveedor_nombre')
            .annotate(
                count=Count('id'),
                total_monto=Sum('monto')
            )
            .order_by('-total_monto')[:10]
        )
        
        data = {
            'total': total,
            'pendientes_revision': pendientes_revision,
            'provisionadas': provisionadas,
            'facturadas': facturadas,
            'sin_ot': sin_ot,
            'total_monto': total_monto,
            'por_tipo_costo': por_tipo_costo,
            'por_proveedor': por_proveedor,
        }
        
        serializer = InvoiceStatsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_ot(self, request, pk=None):
        """
        Asignar OT manualmente a una factura.
        
        Body:
        {
            "ot_id": 123,
            "notas": "Asignación manual por..."
        }
        """
        invoice = self.get_object()
        
        ot_id = request.data.get('ot_id')
        if not ot_id:
            return Response(
                {'error': 'Se requiere ot_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from ots.models import OT
        try:
            ot = OT.objects.get(id=ot_id)
        except OT.DoesNotExist:
            return Response(
                {'error': f'No existe OT con id {ot_id}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Asignar
        invoice.ot = ot
        invoice.ot_number = ot.numero_ot
        invoice.assignment_method = 'manual'
        invoice.requiere_revision = False
        invoice.confianza_match = Decimal('1.000')
        
        # Agregar nota si se proporciona
        notas = request.data.get('notas')
        if notas:
            timestamp = timezone.now().strftime('%Y-%m-%d %H:%M')
            user = request.user.username
            nueva_nota = f"[{timestamp}] {user}: {notas}"
            if invoice.notas:
                invoice.notas += f"\n{nueva_nota}"
            else:
                invoice.notas = nueva_nota
        
        invoice.save()
        
        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def unassign_ot(self, request, pk=None):
        """Desasignar OT de una factura"""
        invoice = self.get_object()
        
        invoice.ot = None
        invoice.ot_number = ''
        invoice.assignment_method = ''
        invoice.requiere_revision = True
        invoice.confianza_match = Decimal('0.000')
        
        # Agregar nota
        notas = request.data.get('notas', 'OT desasignada')
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M')
        user = request.user.username
        nueva_nota = f"[{timestamp}] {user}: {notas}"
        if invoice.notas:
            invoice.notas += f"\n{nueva_nota}"
        else:
            invoice.notas = nueva_nota
        
        invoice.save()
        
        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data)


class UploadedFileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para archivos subidos.
    Útil para verificar duplicados y gestionar archivos.
    """
    
    permission_classes = [IsAuthenticated]
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    
    def get_queryset(self):
        """Filtrar por hash si se proporciona"""
        queryset = super().get_queryset()
        
        sha256 = self.request.query_params.get('sha256')
        if sha256:
            queryset = queryset.filter(sha256=sha256)
        
        return queryset.order_by('-created_at')

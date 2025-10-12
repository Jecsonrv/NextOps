"""
Serializers para el módulo de Invoices.
Maneja la serialización de facturas y archivos subidos.
"""

from rest_framework import serializers
from decimal import Decimal
from .models import Invoice, UploadedFile, Dispute, CreditNote, DisputeEvent
from ots.models import OT
from catalogs.models import Provider


class UploadedFileSerializer(serializers.ModelSerializer):
    """Serializer para archivos subidos"""
    
    file_url = serializers.SerializerMethodField()
    size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedFile
        fields = [
            'id', 'filename', 'path', 'sha256', 'size', 'size_mb',
            'content_type', 'file_url', 'created_at'
        ]
        read_only_fields = ['id', 'sha256', 'created_at']
    
    def get_file_url(self, obj):
        """Genera URL del archivo"""
        return f"/media/{obj.path}"
    
    def get_size_mb(self, obj):
        """Tamaño en MB"""
        return round(obj.size / (1024 * 1024), 2)


class InvoiceListSerializer(serializers.ModelSerializer):
    """
    Serializer optimizado para listas de facturas.
    Incluye solo campos esenciales + datos de OT.
    """
    
    proveedor_data = serializers.SerializerMethodField()
    ot_data = serializers.SerializerMethodField()
    
    confidence_level = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    tipo_costo_display = serializers.SerializerMethodField()
    
    # Forzar que las fechas NO se conviertan a timezone en lectura
    fecha_emision = serializers.DateField(format='%Y-%m-%d')
    fecha_provision = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    fecha_facturacion = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    fecha_vencimiento = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    
    # Campos computados para términos de pago
    dias_hasta_vencimiento = serializers.SerializerMethodField()
    esta_vencida = serializers.SerializerMethodField()
    esta_proxima_a_vencer = serializers.SerializerMethodField()
    
    has_disputes = serializers.SerializerMethodField()
    dispute_id = serializers.SerializerMethodField()
    has_credit_notes = serializers.SerializerMethodField()
    es_costo_vinculado_ot = serializers.SerializerMethodField()
    debe_excluirse_estadisticas = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'numero_factura',
            'fecha_emision',
            'fecha_provision',
            'fecha_facturacion',
            'fecha_vencimiento',
            'tipo_pago',
            'dias_credito_aplicado',
            'alerta_vencimiento',
            'dias_hasta_vencimiento',
            'esta_vencida',
            'esta_proxima_a_vencer',
            'monto',
            'monto_aplicable',
            'tipo_costo',
            'tipo_costo_display',
            'proveedor_nombre',
            'proveedor_data',
            'tipo_proveedor',
            'ot_number',
            'ot_data',
            'estado_provision',
            'estado_facturacion',
            'requiere_revision',
            'confianza_match',
            'confidence_level',
            'assignment_method',
            'file_url',
            'created_at',
            'has_disputes',
            'dispute_id',
            'has_credit_notes',
            'es_costo_vinculado_ot',
            'debe_excluirse_estadisticas',
        ]
    
    def get_proveedor_data(self, obj):
        """Datos del proveedor desde el catálogo"""
        if obj.proveedor:
            return {
                'id': obj.proveedor.id,
                'nombre': obj.proveedor.nombre,
                'tipo': obj.proveedor.tipo,
                'tipo_display': obj.proveedor.get_tipo_display(),
            }
        return None
    
    def get_ot_data(self, obj):
        """Datos completos de la OT para display en lista"""
        if obj.ot:
            return {
                'id': obj.ot.id,
                'numero_ot': obj.ot.numero_ot,
                'operativo': obj.ot.operativo,
                'cliente': obj.ot.cliente.original_name if obj.ot.cliente else None,
                'mbl': obj.ot.master_bl,
                'naviera': obj.ot.proveedor.nombre if obj.ot.proveedor else None,
                'barco': obj.ot.barco,
                'estado': obj.ot.estado,
                'fecha_provision': obj.ot.fecha_provision.isoformat() if obj.ot.fecha_provision else None,
                'fecha_recepcion_factura': obj.ot.fecha_recepcion_factura.isoformat() if obj.ot.fecha_recepcion_factura else None,
            }
        return None
    
    def get_tipo_costo_display(self, obj):
        """Display del tipo de costo"""
        return obj.get_tipo_costo_display() if obj.tipo_costo else None
    
    def get_confidence_level(self, obj):
        """Nivel de confianza legible"""
        return obj.get_confidence_level()
    
    def get_file_url(self, obj):
        """URL del archivo"""
        return obj.get_file_url()
    
    def get_dias_hasta_vencimiento(self, obj):
        """Días hasta el vencimiento"""
        return obj.calcular_dias_hasta_vencimiento()
    
    def get_esta_vencida(self, obj):
        """Si la factura está vencida"""
        return obj.esta_vencida()
    
    def get_esta_proxima_a_vencer(self, obj):
        """Si está próxima a vencer"""
        return obj.esta_proxima_a_vencer()

    def get_has_disputes(self, obj):
        return obj.disputas.exists()
    
    def get_dispute_id(self, obj):
        """Retorna el ID de la disputa activa (abierta o en revisión)"""
        disputa_activa = obj.disputas.filter(
            estado__in=['abierta', 'en_revision']
        ).first()
        return disputa_activa.id if disputa_activa else None

    def get_has_credit_notes(self, obj):
        return obj.notas_credito.exists()
    
    def get_es_costo_vinculado_ot(self, obj):
        """Indica si es un costo vinculado a OT (Flete/Cargos Naviera)"""
        return obj.es_costo_vinculado_ot()
    
    def get_debe_excluirse_estadisticas(self, obj):
        """Indica si debe excluirse de estadísticas (anulada, rechazada, disputada)"""
        return obj.debe_excluirse_de_estadisticas()


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalle de factura.
    Incluye todos los campos y relaciones.
    """
    
    uploaded_file_data = UploadedFileSerializer(source='uploaded_file', read_only=True)
    # Use SerializerMethodField for related serializers to avoid import-time NameError
    # (DisputeListSerializer and CreditNoteListSerializer are defined later in this module)
    disputas = serializers.SerializerMethodField()
    notas_credito = serializers.SerializerMethodField()
    
    proveedor_data = serializers.SerializerMethodField()
    ot_data = serializers.SerializerMethodField()
    
    confidence_level = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    # Campos computados para términos de pago
    dias_hasta_vencimiento = serializers.SerializerMethodField()
    esta_vencida = serializers.SerializerMethodField()
    esta_proxima_a_vencer = serializers.SerializerMethodField()
    
    # Forzar que las fechas NO se conviertan a timezone (ni en lectura ni escritura)
    fecha_emision = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_vencimiento = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_provision = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_facturacion = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    
    # Campos para escritura
    ot_id = serializers.PrimaryKeyRelatedField(
        queryset=OT.objects.all(),
        source='ot',
        required=False,
        allow_null=True
    )
    
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Provider.objects.all(),
        source='proveedor',
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'deleted_at',
            'is_deleted',
        ]
    
    def get_proveedor_data(self, obj):
        """Datos del proveedor desde el catálogo"""
        if obj.proveedor:
            return {
                'id': obj.proveedor.id,
                'nombre': obj.proveedor.nombre,
                'nit': obj.proveedor.nit,
                'tipo': obj.proveedor.tipo,
            }
        return None

    def get_disputas(self, obj):
        """Serializar disputas relacionadas usando DisputeListSerializer definida más abajo"""
        try:
            return DisputeListSerializer(obj.disputas.all(), many=True).data
        except NameError:
            # If serializer is not yet defined for some reason, return empty list
            return []

    def get_notas_credito(self, obj):
        """Serializar notas de crédito relacionadas usando CreditNoteListSerializer"""
        try:
            return CreditNoteListSerializer(obj.notas_credito.all(), many=True).data
        except NameError:
            return []
    
    def get_ot_data(self, obj):
        """Datos completos de la OT para display"""
        if obj.ot:
            return {
                'id': obj.ot.id,
                'numero_ot': obj.ot.numero_ot,
                'operativo': obj.ot.operativo,
                'cliente': obj.ot.cliente.original_name if obj.ot.cliente else None,
                'mbl': obj.ot.master_bl,
                'naviera': obj.ot.proveedor.nombre if obj.ot.proveedor else None,  # Proveedor es la naviera
                'barco': obj.ot.barco,
                'estado': obj.ot.estado,
                'tipo_operacion': obj.ot.tipo_operacion,
                'puerto_origen': obj.ot.puerto_origen,
                'puerto_destino': obj.ot.puerto_destino,
                'fecha_provision': obj.ot.fecha_provision.isoformat() if obj.ot.fecha_provision else None,
                'fecha_recepcion_factura': obj.ot.fecha_recepcion_factura.isoformat() if obj.ot.fecha_recepcion_factura else None,
            }
        return None
    
    def get_confidence_level(self, obj):
        """Nivel de confianza legible"""
        return obj.get_confidence_level()
    
    def get_file_url(self, obj):
        """URL del archivo"""
        return obj.get_file_url()
    
    def get_dias_hasta_vencimiento(self, obj):
        """Días hasta el vencimiento"""
        return obj.calcular_dias_hasta_vencimiento()
    
    def get_esta_vencida(self, obj):
        """Si la factura está vencida"""
        return obj.esta_vencida()
    
    def get_esta_proxima_a_vencer(self, obj):
        """Si está próxima a vencer"""
        return obj.esta_proxima_a_vencer()


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear facturas manualmente.
    Requiere solo campos esenciales.
    
    Si auto_parse=True, intentará extraer automáticamente los datos del archivo
    usando DTEJsonParser o PDFExtractor según el tipo de archivo.
    """
    
    file = serializers.FileField(write_only=True)
    auto_parse = serializers.BooleanField(default=False, write_only=True, required=False)
    
    class Meta:
        model = Invoice
        fields = [
            'file',
            'auto_parse',
            'numero_factura',
            'fecha_emision',
            'fecha_vencimiento',
            'monto',
            'tipo_costo',
            'proveedor_nombre',
            'proveedor_nit',
            'tipo_proveedor',
            'proveedor_categoria',
            'ot_number',
            'notas',
        ]
        # Hacer campos opcionales cuando auto_parse=True
        extra_kwargs = {
            'numero_factura': {'required': False},
            'fecha_emision': {'required': False},
            'monto': {'required': False},
            'tipo_costo': {'required': False},
            'proveedor_nombre': {'required': False},
        }
    
    def validate_numero_factura(self, value):
        """Validar que el número de factura no exista"""
        if Invoice.objects.filter(numero_factura=value, is_deleted=False).exists():
            raise serializers.ValidationError(
                f"Ya existe una factura con el número {value}"
            )
        return value
    
    def validate_monto(self, value):
        """Validar monto positivo"""
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor a 0")
        return value
    
    def validate_file(self, value):
        """Validar archivo"""
        # Verificar tamaño (max 10MB)
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"El archivo no debe superar 10MB (tamaño: {value.size / (1024*1024):.2f}MB)"
            )
        
        # Verificar tipo de archivo
        allowed_types = ['application/pdf', 'application/json', 'image/jpeg', 'image/png']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Tipo de archivo no permitido: {value.content_type}. "
                f"Permitidos: PDF, JSON, JPG, PNG"
            )
        
        return value
    
    def create(self, validated_data):
        """
        Crear factura con archivo.
        
        Si auto_parse=True, intentará extraer automáticamente los datos del archivo
        y hacer matching con OTs.
        """
        from django.core.files.storage import default_storage
        from django.utils import timezone
        from invoices.parsers import DTEJsonParser, PDFExtractor, InvoiceMatcher
        import os
        
        file = validated_data.pop('file')
        auto_parse = validated_data.pop('auto_parse', False)
        
        # Calcular hash del archivo
        file.seek(0)
        file_content = file.read()
        file_hash = UploadedFile.calculate_hash(file_content)
        
        # Verificar si ya existe este archivo
        existing_file = UploadedFile.objects.filter(sha256=file_hash).first()
        
        if existing_file:
            # El archivo ya existe, verificar si hay una factura asociada
            if hasattr(existing_file, 'invoice'):
                raise serializers.ValidationError({
                    'file': f"Este archivo ya fue procesado en la factura {existing_file.invoice.numero_factura}"
                })
            uploaded_file = existing_file
        else:
            # Guardar archivo nuevo
            file.seek(0)
            filename = file.name
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = f"{timestamp}_{filename}"
            
            path = default_storage.save(f'invoices/{safe_filename}', file)
            
            # Crear registro de archivo
            uploaded_file = UploadedFile.objects.create(
                filename=filename,
                path=path,
                sha256=file_hash,
                size=file.size,
                content_type=file.content_type
            )
        
        # Auto-parsing si está habilitado
        parsed_data = {}
        if auto_parse:
            try:
                file.seek(0)
                file_content = file.read()
                
                # Seleccionar parser según tipo de archivo
                if uploaded_file.content_type == 'application/json':
                    parser = DTEJsonParser()
                    parsed_data = parser.parse(file_content)
                elif uploaded_file.content_type == 'application/pdf':
                    parser = PDFExtractor()
                    parsed_data = parser.extract(file_content)
                
                # Si el parsing fue exitoso, usar datos extraídos
                if parsed_data.get('confidence', 0) > 0:
                    # Actualizar validated_data con datos parseados si no se proporcionaron
                    if not validated_data.get('numero_factura') and parsed_data.get('numero_factura'):
                        validated_data['numero_factura'] = parsed_data['numero_factura']
                    
                    if not validated_data.get('fecha_emision') and parsed_data.get('fecha_emision'):
                        validated_data['fecha_emision'] = parsed_data['fecha_emision']
                    
                    if not validated_data.get('fecha_vencimiento') and parsed_data.get('fecha_vencimiento'):
                        validated_data['fecha_vencimiento'] = parsed_data['fecha_vencimiento']
                    
                    if not validated_data.get('monto') and parsed_data.get('monto'):
                        validated_data['monto'] = parsed_data['monto']
                    
                    if not validated_data.get('proveedor_nombre') and parsed_data.get('proveedor_nombre'):
                        validated_data['proveedor_nombre'] = parsed_data['proveedor_nombre']
                    
                    if not validated_data.get('proveedor_nit') and parsed_data.get('proveedor_nit'):
                        validated_data['proveedor_nit'] = parsed_data['proveedor_nit']
                    
            except Exception as e:
                # Si falla el parsing, continuar sin datos extraídos
                pass
        
        # Validar que tenemos los campos requeridos
        required_fields = ['numero_factura', 'fecha_emision', 'monto']
        missing_fields = [f for f in required_fields if not validated_data.get(f)]
        if missing_fields:
            raise serializers.ValidationError({
                field: f"Este campo es requerido (no se pudo extraer automáticamente)"
                for field in missing_fields
            })
        
        # Buscar OT - primero intentar con el ot_number provisto
        ot = None
        ot_number = validated_data.pop('ot_number', None)
        assignment_method = 'no_match'
        confianza_match = Decimal('0.000')
        referencias_detectadas = {}
        
        if ot_number:
            # OT proporcionada manualmente
            ot = OT.objects.filter(numero_ot=ot_number).first()
            if ot:
                assignment_method = 'manual'
                confianza_match = Decimal('1.000')
        elif auto_parse and parsed_data:
            # Intentar matching automático
            try:
                matcher = InvoiceMatcher()
                ot, confianza_match, assignment_method, referencias_detectadas = matcher.match(
                    referencias=parsed_data.get('referencias', []),
                    proveedor_nombre=validated_data.get('proveedor_nombre', ''),
                    fecha_emision=validated_data.get('fecha_emision')
                )
            except Exception as e:
                # Si falla el matching, continuar sin OT
                pass
        
        # Buscar proveedor en catálogo
        proveedor = None
        proveedor_nombre = validated_data.get('proveedor_nombre')
        if proveedor_nombre:
            proveedor = Provider.objects.filter(
                nombre__icontains=proveedor_nombre
            ).first()
        
        # Crear factura
        invoice = Invoice.objects.create(
            uploaded_file=uploaded_file,
            ot=ot,
            ot_number=ot.numero_ot if ot else '',
            proveedor=proveedor,
            processing_source='upload_manual',
            processed_by=self.context['request'].user if self.context.get('request') else None,
            processed_at=timezone.now(),
            assignment_method=assignment_method,
            confianza_match=confianza_match,
            requiere_revision=(confianza_match < Decimal('0.700')),  # Revisar si confianza < 70%
            referencias_detectadas=referencias_detectadas or parsed_data.get('raw_data', {}),
            **validated_data
        )
        
        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar facturas"""
    
    ot_id = serializers.PrimaryKeyRelatedField(
        queryset=OT.objects.all(),
        source='ot',
        required=False,
        allow_null=True
    )
    
    # Forzar que las fechas NO se conviertan a timezone (ni en lectura ni escritura)
    fecha_provision = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_facturacion = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    
    class Meta:
        model = Invoice
        fields = [
            'ot_id',
            'estado_provision',
            'fecha_provision',
            'estado_facturacion',
            'fecha_facturacion',
            'requiere_revision',
            'notas',
        ]
    
    def update(self, instance, validated_data):
        """
        Actualizar factura con sincronización bidireccional de fechas.
        
        REGLAS INAMOVIBLES:
        1. Si tipo_costo in ['FLETE', 'CARGOS_NAVIERA'] y tipo_proveedor='naviera':
           - Los cambios en fecha_provision o fecha_facturacion se sincronizan con OT
           - Invoice.fecha_provision <-> OT.fecha_provision (bidireccional)
        
        2. Para otros tipos de costo (ALMACENAJE, DEMORA, TRANSPORTE, etc.):
           - NO se sincroniza con OT
           - Las fechas son independientes
        
          3. Auto-marcado de estados:
           - Si se ingresa fecha_provision -> estado_provision = 'provisionada'
           - Si se ingresa fecha_facturacion -> estado_facturacion = 'facturada'
              - Si estado_provision se marca como 'disputada' o 'revision' -> limpiar fecha_provision
              - Si estado_facturacion = 'disputada' o 'en_revision' -> limpiar fecha_facturacion
        """
        from ots.models import OT
        
        # Si se asigna OT, actualizar campos relacionados
        if 'ot' in validated_data and validated_data['ot']:
            instance.assignment_method = 'manual'
            instance.requiere_revision = False
            if instance.confianza_match == 0:
                instance.confianza_match = Decimal('1.000')
        
        manual_provision_states = {'disputada', 'revision'}
        legacy_manual_states = manual_provision_states | {'rechazada'}

        # REGLA 3: Auto-marcado de estados según fechas
        # Si se ingresa fecha_provision, marcar como provisionada
        if 'fecha_provision' in validated_data:
            nueva_fecha_provision = validated_data['fecha_provision']
            if nueva_fecha_provision:
                validated_data['estado_provision'] = 'provisionada'
            else:
                estado_forzado = validated_data.get('estado_provision')
                if estado_forzado in legacy_manual_states:
                    pass
                elif (
                    instance.estado_provision in legacy_manual_states
                    and 'estado_provision' not in validated_data
                ):
                    validated_data['estado_provision'] = instance.estado_provision
                else:
                    # Si se limpia la fecha, volver a pendiente
                    validated_data['estado_provision'] = 'pendiente'
        
        # Si se ingresa fecha_facturacion, marcar como facturada
        if 'fecha_facturacion' in validated_data:
            if validated_data['fecha_facturacion']:
                validated_data['estado_facturacion'] = 'facturada'
            else:
                # Si se limpia la fecha, volver a pendiente
                validated_data['estado_facturacion'] = 'pendiente'
        
        # Si se marca como rechazada, limpiar fecha_provision
        if 'estado_provision' in validated_data:
            estado_objetivo = validated_data['estado_provision']
            if estado_objetivo in legacy_manual_states or estado_objetivo == 'pendiente':
                validated_data['fecha_provision'] = None
        
        # Si se marca en estados negativos, limpiar fecha_facturacion
        # Nota: El modelo actual solo tiene 'pendiente' y 'facturada', pero preparamos para futuros estados
        if 'estado_facturacion' in validated_data:
            if validated_data['estado_facturacion'] in ['disputada', 'en_revision']:
                validated_data['fecha_facturacion'] = None
        
        # SINCRONIZACIÓN BIDIRECCIONAL: Invoice -> OT
        # Solo para FLETE (cualquier tipo) o CARGOS_NAVIERA de NAVIERA
        target_ot = validated_data.get('ot', instance.ot)
        should_sync = (
            (instance.tipo_costo.startswith('FLETE') or instance.tipo_costo == 'CARGOS_NAVIERA') and 
            instance.tipo_proveedor == 'naviera' and
            target_ot is not None
        )
        
        if should_sync:
            ot_updated = False
            ot_to_update = target_ot
            fields_to_update = set()
            
            # SINCRONIZAR fecha_provision -> fecha_provision
            if 'fecha_provision' in validated_data:
                new_fecha = validated_data['fecha_provision']
                # Comparar solo la fecha (no datetime) para evitar problemas de timezone
                if ot_to_update.fecha_provision != new_fecha:
                    print(f"[INVOICE->OT SYNC] Actualizando OT {ot_to_update.numero_ot}")
                    print(f"  - fecha_provision: {ot_to_update.fecha_provision} -> {new_fecha}")
                    
                    ot_to_update.fecha_provision = new_fecha
                    fields_to_update.update({'fecha_provision', 'estado_provision'})
                    ot_updated = True
            
            # SINCRONIZAR fecha_facturacion -> fecha_recepcion_factura
            if 'fecha_facturacion' in validated_data:
                new_fecha_fact = validated_data['fecha_facturacion']
                # Comparar solo la fecha (no datetime) para evitar problemas de timezone
                if ot_to_update.fecha_recepcion_factura != new_fecha_fact:
                    print(f"  - fecha_recepcion_factura: {ot_to_update.fecha_recepcion_factura} -> {new_fecha_fact}")
                    
                    ot_to_update.fecha_recepcion_factura = new_fecha_fact
                    fields_to_update.update({'fecha_recepcion_factura', 'estado_facturado'})
                    ot_updated = True

            # SINCRONIZAR estado_provision cuando se actualiza manualmente
            if 'estado_provision' in validated_data:
                estado_direccionado = validated_data['estado_provision']
                if estado_direccionado in {'pendiente', 'provisionada', 'revision', 'disputada'}:
                    if ot_to_update.estado_provision != estado_direccionado:
                        print(
                            f"  - estado_provision OT: {ot_to_update.estado_provision} -> {estado_direccionado}"
                        )
                        ot_to_update.estado_provision = estado_direccionado
                        fields_to_update.add('estado_provision')
                        ot_updated = True
            
            if ot_updated:
                fields_to_update.add('updated_at')
                # El estado_provision y estado_facturado se actualizarán automáticamente en el save() del modelo OT
                ot_to_update.save(update_fields=list(fields_to_update))
                print(f"  ✅ OT guardada. estado_provision: {ot_to_update.estado_provision}, estado_facturado: {ot_to_update.estado_facturado}")
        
        return super().update(instance, validated_data)


class InvoiceStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de facturas"""

    total = serializers.IntegerField()
    pendientes_revision = serializers.IntegerField()
    provisionadas = serializers.IntegerField()
    facturadas = serializers.IntegerField()
    sin_ot = serializers.IntegerField()
    total_monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    por_tipo_costo = serializers.DictField()
    por_proveedor = serializers.ListField()
    # Estadísticas de facturas excluidas
    total_disputadas = serializers.IntegerField()
    total_anuladas = serializers.IntegerField()
    total_anuladas_parcial = serializers.IntegerField()


# ==================== DISPUTE SERIALIZERS ====================

class DisputeListSerializer(serializers.ModelSerializer):
    """Serializer para listas de disputas"""

    invoice_data = serializers.SerializerMethodField()
    ot_data = serializers.SerializerMethodField()
    tipo_disputa_display = serializers.CharField(source='get_tipo_disputa_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    resultado_display = serializers.CharField(source='get_resultado_display', read_only=True)

    class Meta:
        model = Dispute
        fields = [
            'id', 'numero_caso', 'operativo', 'invoice', 'invoice_data', 'ot', 'ot_data',
            'tipo_disputa', 'tipo_disputa_display', 'detalle',
            'estado', 'estado_display', 'resultado', 'resultado_display',
            'monto_disputa', 'monto_recuperado',
            'fecha_resolucion', 'created_at', 'updated_at'
        ]

    def get_invoice_data(self, obj):
        """Datos básicos de la factura"""
        if obj.invoice:
            return {
                'id': obj.invoice.id,
                'numero_factura': obj.invoice.numero_factura,
                'proveedor_nombre': obj.invoice.proveedor_nombre,
                'monto': float(obj.invoice.monto),
            }
        return None

    def get_ot_data(self, obj):
        """Datos básicos de la OT"""
        if obj.ot:
            return {
                'id': obj.ot.id,
                'numero_ot': obj.ot.numero_ot,
                'cliente_nombre': obj.ot.cliente.original_name if obj.ot.cliente else None,
                'operativo': obj.ot.operativo,
            }
        return None


class DisputeDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de disputa"""

    invoice_data = serializers.SerializerMethodField()
    ot_data = serializers.SerializerMethodField()
    tipo_disputa_display = serializers.CharField(source='get_tipo_disputa_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    resultado_display = serializers.CharField(source='get_resultado_display', read_only=True)

    class Meta:
        model = Dispute
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted']

    def get_invoice_data(self, obj):
        """Datos completos de la factura"""
        if obj.invoice:
            return {
                'id': obj.invoice.id,
                'numero_factura': obj.invoice.numero_factura,
                'proveedor_nombre': obj.invoice.proveedor_nombre,
                'monto': float(obj.invoice.monto),
                'fecha_emision': obj.invoice.fecha_emision.isoformat() if obj.invoice.fecha_emision else None,
                'estado_provision': obj.invoice.estado_provision,
            }
        return None

    def get_ot_data(self, obj):
        """Datos completos de la OT"""
        if obj.ot:
            return {
                'id': obj.ot.id,
                'numero_ot': obj.ot.numero_ot,
                'cliente_nombre': obj.ot.cliente.original_name if obj.ot.cliente else None,
                'operativo': obj.ot.operativo,
                'master_bl': obj.ot.master_bl,
            }
        return None


class DisputeCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear disputas"""

    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.filter(is_deleted=False),
        source='invoice',
        required=True
    )

    ot_id = serializers.PrimaryKeyRelatedField(
        queryset=OT.objects.filter(is_deleted=False),
        source='ot',
        required=False,
        allow_null=True
    )

    class Meta:
        model = Dispute
        fields = [
            'invoice_id', 'ot_id', 'tipo_disputa', 'detalle',
            'monto_disputa', 'monto_recuperado', 'numero_caso', 'operativo'
        ]

    def validate_monto_disputa(self, value):
        """Validar monto de disputa"""
        if value < 0:
            raise serializers.ValidationError("El monto de disputa debe ser positivo")
        return value
    
    def validate_numero_caso(self, value):
        """Validar que numero_caso no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El número de caso es obligatorio")
        return value.strip()
    
    def validate(self, data):
        """Validar que no exista una disputa activa para la misma factura"""
        invoice = data.get('invoice')
        if invoice:
            # Verificar si ya existe una disputa activa (no resuelta ni cerrada)
            disputas_activas = Dispute.objects.filter(
                invoice=invoice,
                estado__in=['abierta', 'en_revision'],
                is_deleted=False
            ).exists()
            
            if disputas_activas:
                raise serializers.ValidationError({
                    'invoice_id': 'Ya existe una disputa activa para esta factura. Debe resolverse o cerrarse antes de crear una nueva.'
                })
        
        return data


class DisputeUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar disputas"""

    class Meta:
        model = Dispute
        fields = [
            'estado', 'resultado', 'resolucion', 'notas', 
            'fecha_resolucion', 'numero_caso', 'operativo', 
            'monto_recuperado'
        ]
    
    def update(self, instance, validated_data):
        old_estado = instance.estado
        old_resultado = instance.resultado
        new_estado = validated_data.get('estado', old_estado)
        new_resultado = validated_data.get('resultado', old_resultado)
        
        # Actualizar la disputa
        dispute = super().update(instance, validated_data)
        
        # Si cambió el estado, crear evento
        if old_estado != new_estado:
            DisputeEvent.objects.create(
                dispute=dispute,
                tipo='cambio_estado',
                descripcion=f'Estado cambiado de {dict(Dispute.ESTADO_CHOICES)[old_estado]} a {dict(Dispute.ESTADO_CHOICES)[new_estado]}',
                usuario=self.context.get('request').user.username if self.context.get('request') else ''
            )
        
        # Si cambió el resultado, crear evento (ya se maneja en el modelo pero agregamos uno adicional)
        if old_resultado != new_resultado and new_resultado != 'pendiente':
            DisputeEvent.objects.create(
                dispute=dispute,
                tipo='resolucion',
                descripcion=f'Resultado: {dict(Dispute.RESULTADO_CHOICES)[new_resultado]}. {validated_data.get("resolucion", "")}',
                usuario=self.context.get('request').user.username if self.context.get('request') else '',
                monto_recuperado=validated_data.get('monto_recuperado')
            )
        
        return dispute


class DisputeEventSerializer(serializers.ModelSerializer):
    """Serializer para eventos de disputas"""

    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = DisputeEvent
        fields = [
            'id', 'tipo', 'tipo_display', 'descripcion',
            'usuario', 'monto_recuperado', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ==================== CREDIT NOTE SERIALIZERS ====================

class CreditNoteListSerializer(serializers.ModelSerializer):
    """Serializer para listas de notas de crédito"""

    proveedor_data = serializers.SerializerMethodField()
    invoice_data = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = CreditNote
        fields = [
            'id', 'numero_nota', 'proveedor', 'proveedor_nombre', 'proveedor_data',
            'invoice_relacionada', 'invoice_data', 'fecha_emision', 'monto',
            'motivo', 'estado', 'estado_display', 'fecha_aplicacion',
            'created_at', 'updated_at'
        ]

    def get_proveedor_data(self, obj):
        """Datos del proveedor"""
        if obj.proveedor:
            return {
                'id': obj.proveedor.id,
                'nombre': obj.proveedor.nombre,
                'tipo': obj.proveedor.tipo,
            }
        return None

    def get_invoice_data(self, obj):
        """Datos de la factura relacionada"""
        if obj.invoice_relacionada:
            return {
                'id': obj.invoice_relacionada.id,
                'numero_factura': obj.invoice_relacionada.numero_factura,
                'monto': float(obj.invoice_relacionada.monto),
            }
        return None


class CreditNoteDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de nota de crédito"""

    proveedor_data = serializers.SerializerMethodField()
    invoice_data = serializers.SerializerMethodField()
    uploaded_file_data = UploadedFileSerializer(source='uploaded_file', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CreditNote
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted']

    def get_proveedor_data(self, obj):
        """Datos completos del proveedor"""
        if obj.proveedor:
            return {
                'id': obj.proveedor.id,
                'nombre': obj.proveedor.nombre,
                'tipo': obj.proveedor.tipo,
                'tipo_display': obj.proveedor.get_tipo_display(),
                'payment_terms': obj.proveedor.payment_terms,
            }
        return None

    def get_invoice_data(self, obj):
        """Datos completos de la factura relacionada"""
        if obj.invoice_relacionada:
            return {
                'id': obj.invoice_relacionada.id,
                'numero_factura': obj.invoice_relacionada.numero_factura,
                'monto': float(obj.invoice_relacionada.monto),
                'fecha_emision': obj.invoice_relacionada.fecha_emision.isoformat() if obj.invoice_relacionada.fecha_emision else None,
                'proveedor_nombre': obj.invoice_relacionada.proveedor_nombre,
            }
        return None

    def get_file_url(self, obj):
        """URL del archivo"""
        if obj.uploaded_file:
            return f"/media/{obj.uploaded_file.path}"
        return None


class CreditNoteCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear notas de crédito"""

    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Provider.objects.all(),
        source='proveedor',
        required=True
    )

    invoice_relacionada_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.filter(is_deleted=False),
        source='invoice_relacionada',
        required=False,
        allow_null=True
    )

    file = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = CreditNote
        fields = [
            'numero_nota', 'proveedor_id', 'invoice_relacionada_id',
            'fecha_emision', 'monto', 'motivo', 'notas', 'file'
        ]

    def validate_numero_nota(self, value):
        """Validar que el número de nota no exista"""
        if CreditNote.objects.filter(numero_nota=value, is_deleted=False).exists():
            raise serializers.ValidationError(
                f"Ya existe una nota de crédito con el número {value}"
            )
        return value

    def validate_monto(self, value):
        """El monto debe ser negativo"""
        if value > 0:
            # Auto-convertir a negativo
            return -abs(value)
        return value

    def create(self, validated_data):
        """Crear nota de crédito con archivo opcional"""
        from django.core.files.storage import default_storage
        from django.utils import timezone

        file = validated_data.pop('file', None)
        uploaded_file = None

        # Procesar archivo si se proporcionó
        if file:
            # Calcular hash
            file.seek(0)
            file_content = file.read()
            file_hash = UploadedFile.calculate_hash(file_content)

            # Verificar si ya existe
            existing_file = UploadedFile.objects.filter(sha256=file_hash).first()

            if existing_file:
                uploaded_file = existing_file
            else:
                # Guardar archivo nuevo
                file.seek(0)
                timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                safe_filename = f"{timestamp}_{file.name}"
                path = default_storage.save(f'credit_notes/{safe_filename}', file)

                uploaded_file = UploadedFile.objects.create(
                    filename=file.name,
                    path=path,
                    sha256=file_hash,
                    size=file.size,
                    content_type=file.content_type
                )

        # Crear nota de crédito
        credit_note = CreditNote.objects.create(
            uploaded_file=uploaded_file,
            processing_source='upload_manual',
            processed_by=self.context['request'].user.username if self.context.get('request') else 'system',
            processed_at=timezone.now(),
            **validated_data
        )

        return credit_note


class CreditNoteUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar notas de crédito"""

    invoice_relacionada_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.filter(is_deleted=False),
        source='invoice_relacionada',
        required=False,
        allow_null=True
    )

    class Meta:
        model = CreditNote
        fields = ['estado', 'invoice_relacionada_id', 'fecha_aplicacion', 'notas']

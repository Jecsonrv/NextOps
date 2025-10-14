"""
Serializers para gestión de Órdenes de Trabajo (OTs).
"""

import re

from rest_framework import serializers
from .models import OT, CONTAINER_NUMBER_PATTERN
from catalogs.models import Provider
from catalogs.serializers import ProviderSerializer
from client_aliases.models import ClientAlias
from client_aliases.serializers import ClientAliasListSerializer


def _normalize_container_value(raw) -> str:
    """Normaliza y valida un valor de contenedor provisto por API o base de datos."""
    if isinstance(raw, dict):
        raw = raw.get('numero', '')

    if raw is None:
        raw = ''

    if not isinstance(raw, str):
        raw = str(raw)

    cleaned = raw.upper().strip()
    cleaned = re.sub(r"[^A-Z0-9]", "", cleaned)

    if not cleaned:
        raise ValueError("El número de contenedor no puede estar vacío")

    if not CONTAINER_NUMBER_PATTERN.match(cleaned):
        raise ValueError("El número de contenedor debe tener formato AAAA0000000")

    return cleaned


class ContenedorSerializer(serializers.Serializer):
    """Serializer para validar un único número de contenedor."""

    numero = serializers.CharField(
        max_length=20,
        required=True,
        help_text="Número del contenedor (ej: MSCU1234567)"
    )

    def to_representation(self, instance):
        try:
            return _normalize_container_value(instance)
        except ValueError:
            return ''

    def to_internal_value(self, data):
        if isinstance(data, str):
            data = {'numero': data}
        return super().to_internal_value(data)

    def validate_numero(self, value):
        try:
            return _normalize_container_value(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))


class ContenedoresField(serializers.ListField):
    """Field personalizado para listas de números de contenedor normalizados."""

    def __init__(self, **kwargs):
        super().__init__(child=serializers.CharField(max_length=20), **kwargs)

    def to_internal_value(self, data):
        if data in (None, ''):
            return []

        if isinstance(data, (str, dict)):
            data = [data]

        if not isinstance(data, (list, tuple)):
            raise serializers.ValidationError('Los contenedores deben enviarse como lista de strings.')

        cleaned_values = []
        errors = {}

        for index, item in enumerate(data):
            try:
                cleaned = _normalize_container_value(item)
                cleaned_values.append(cleaned)
            except ValueError as exc:
                errors[index] = [str(exc)]

        if errors:
            raise serializers.ValidationError(errors)

        unique_values = []
        seen = set()
        for numero in cleaned_values:
            if numero not in seen:
                seen.add(numero)
                unique_values.append(numero)

        return unique_values

    def to_representation(self, value):
        if not value:
            return []

        cleaned_values = []
        seen = set()

        for item in value:
            try:
                cleaned = _normalize_container_value(item)
            except ValueError:
                # Si por alguna razón hay datos legacy inválidos, se omiten en la respuesta
                continue

            if cleaned not in seen:
                seen.add(cleaned)
                cleaned_values.append(cleaned)

        return cleaned_values


class ProvisionItemSerializer(serializers.Serializer):
    """Serializer para items de provisión dentro del JSONField"""
    
    concepto = serializers.CharField(
        max_length=100,
        required=True,
        help_text="Concepto de la provisión (ej: Flete, Almacenaje)"
    )
    
    monto = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        help_text="Monto de la provisión"
    )
    
    categoria = serializers.ChoiceField(
        choices=['operacion', 'puerto', 'transporte', 'otros'],
        default='operacion',
        help_text="Categoría de la provisión"
    )


class ProvisionHierarchySerializer(serializers.Serializer):
    """Serializer para la jerarquía completa de provisiones"""
    
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        help_text="Total de provisiones (calculado automáticamente)"
    )
    
    items = ProvisionItemSerializer(
        many=True,
        required=False,
        help_text="Lista de items de provisión"
    )


class OTListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar OTs"""

    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True, allow_null=True)
    cliente_nombre = serializers.CharField(source='cliente.original_name', read_only=True)
    total_contenedores = serializers.SerializerMethodField()
    numero_contenedores = serializers.SerializerMethodField()
    contenedores_list = serializers.SerializerMethodField()
    provision_total = serializers.SerializerMethodField()
    tiempo_transito = serializers.SerializerMethodField()
    estado_display = serializers.SerializerMethodField()
    mbl = serializers.CharField(source='master_bl', read_only=True)

    # Campos relacionados con disputas de facturas
    has_disputed_invoices = serializers.SerializerMethodField()
    disputed_invoices_count = serializers.SerializerMethodField()
    disputed_invoices_amount = serializers.SerializerMethodField()

    # Incluir contenedores como array para el frontend
    contenedores = ContenedoresField(read_only=True)

    # Forzar que las fechas NO se conviertan a timezone en lectura
    fecha_eta = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    fecha_provision = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    fecha_recepcion_factura = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    
    class Meta:
        model = OT
        fields = [
            'id',
            'numero_ot',
            'proveedor_nombre',
            'cliente_nombre',
            'operativo',
            'tipo_operacion',
            'tipo_embarque',
            'master_bl',
            'mbl',
            'contenedores',  # Campo agregado para búsqueda en el frontend
            'total_contenedores',
            'numero_contenedores',
            'contenedores_list',
            'estado',
            'estado_display',
            'fecha_eta',
            'etd',
            'puerto_origen',
            'puerto_destino',
            'barco',
            'tiempo_transito',
            'estado_facturado',
            'estado_provision',
            'provision_total',
            'fecha_provision',
            'fecha_recepcion_factura',
            # Campos de disputas
            'has_disputed_invoices',
            'disputed_invoices_count',
            'disputed_invoices_amount',
            'created_at',
        ]
    
    def get_total_contenedores(self, obj):
        return obj.get_total_contenedores()
    
    def get_numero_contenedores(self, obj):
        return obj.get_numero_contenedores()
    
    def get_contenedores_list(self, obj):
        """Retorna lista de números de contenedores separados por coma"""
        numeros = obj.get_contenedores_numeros()
        if numeros:
            return ', '.join(numeros)
        return None
    
    def get_estado_display(self, obj):
        """Retorna el estado en MAYÚSCULAS"""
        return obj.get_estado_display().upper()
    
    def get_provision_total(self, obj):
        return obj.get_provision_total()

    def get_tiempo_transito(self, obj):
        return obj.get_tiempo_transito_display()

    def get_has_disputed_invoices(self, obj):
        """Indica si hay facturas de FLETE/CARGOS_NAVIERA disputadas"""
        return obj.facturas.filter(
            tipo_costo__in=['FLETE', 'CARGOS_NAVIERA'],
            estado_provision='disputada',
            is_deleted=False
        ).exists()

    def get_disputed_invoices_count(self, obj):
        """Cuenta de facturas vinculadas disputadas"""
        return obj.facturas.filter(
            tipo_costo__in=['FLETE', 'CARGOS_NAVIERA'],
            estado_provision='disputada',
            is_deleted=False
        ).count()

    def get_disputed_invoices_amount(self, obj):
        """Monto total de facturas vinculadas disputadas"""
        from decimal import Decimal
        from django.db.models import Sum
        amount = obj.facturas.filter(
            tipo_costo__in=['FLETE', 'CARGOS_NAVIERA'],
            estado_provision='disputada',
            is_deleted=False
        ).aggregate(total=Sum('monto'))['total']
        return float(amount) if amount else 0.0


class OTDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalles de OT"""
    
    proveedor = ProviderSerializer(read_only=True)
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Provider.objects.filter(is_active=True),
        source='proveedor',
        write_only=True
    )
    
    cliente = ClientAliasListSerializer(read_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=ClientAlias.objects.filter(deleted_at__isnull=True),
        source='cliente',
        write_only=True
    )
    
    contenedores = ContenedoresField(required=False)
    house_bls = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        help_text="Lista de House BLs"
    )
    
    provision_hierarchy = ProvisionHierarchySerializer(required=False)
    
    modificado_por_nombre = serializers.CharField(
        source='modificado_por.get_full_name',
        read_only=True
    )
    
    # Forzar que las fechas NO se conviertan a timezone (ni en lectura ni escritura)
    fecha_eta = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_llegada = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_solicitud_facturacion = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_recepcion_factura = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    fecha_provision = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    express_release_fecha = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    contra_entrega_fecha = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d'], format='%Y-%m-%d')
    
    # Campos calculados
    total_contenedores = serializers.SerializerMethodField()
    numero_contenedores = serializers.SerializerMethodField()
    contenedores_numeros = serializers.SerializerMethodField()
    tiempo_transito = serializers.SerializerMethodField()
    tiempo_transito_display = serializers.SerializerMethodField()
    puede_actualizar_provision = serializers.SerializerMethodField()
    
    class Meta:
        model = OT
        fields = [
            'id',
            'numero_ot',
            'proveedor',
            'proveedor_id',
            'cliente',
            'cliente_id',
            'operativo',
            'tipo_operacion',
            'master_bl',
            'house_bls',
            'contenedores',
            'total_contenedores',
            'numero_contenedores',
            'contenedores_numeros',
            'fecha_eta',
            'etd',
            'fecha_llegada',
            'tiempo_transito',
            'tiempo_transito_display',
            'puerto_origen',
            'puerto_destino',
            # Nuevos campos de embarque
            'tipo_embarque',
            'barco',
            # 'barco_source',  # Comentado hasta ejecutar migraciones
            # Express Release y Contra Entrega
            'express_release_tipo',
            'express_release_fecha',
            'contra_entrega_tipo',
            'contra_entrega_fecha',
            # Facturación
            'fecha_solicitud_facturacion',
            'fecha_recepcion_factura',
            'estado_facturado',
            # Provisión
            'fecha_provision',
            'provision_source',
            'provision_locked',
            'provision_updated_by',
            'estado_provision',
            'provision_hierarchy',
            'puede_actualizar_provision',
            # Otros
            'envio_cierre_ot',
            'comentarios',
            'estado',
            'notas',
            'modificado_por',
            'modificado_por_nombre',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'modificado_por',
            'created_at',
            'updated_at',
        ]
    
    def get_total_contenedores(self, obj):
        return obj.get_total_contenedores()
    
    def get_numero_contenedores(self, obj):
        return obj.get_numero_contenedores()
    
    def get_contenedores_numeros(self, obj):
        return obj.get_contenedores_numeros()
    
    def get_tiempo_transito(self, obj):
        return obj.get_tiempo_transito()
    
    def get_tiempo_transito_display(self, obj):
        return obj.get_tiempo_transito_display()
    
    def get_puede_actualizar_provision(self, obj):
        """Indica si la provisión puede ser actualizada por Excel"""
        can_update, reason = obj.can_update_provision('excel')
        return {
            'can_update': can_update,
            'reason': reason
        }
    
    def validate_numero_ot(self, value):
        """Valida formato del número de OT"""
        if not value or len(value) < 3:
            raise serializers.ValidationError(
                "El número de OT debe tener al menos 3 caracteres"
            )
        
        value = value.upper().strip()
        
        # Verificar unicidad si es creación o cambio de número
        if self.instance:
            # Es actualización, verificar si cambió el número
            if self.instance.numero_ot != value:
                if OT.objects.filter(numero_ot=value).exists():
                    raise serializers.ValidationError(
                        f"Ya existe una OT con el número {value}"
                    )
        else:
            # Es creación, verificar unicidad
            if OT.objects.filter(numero_ot=value).exists():
                raise serializers.ValidationError(
                    f"Ya existe una OT con el número {value}"
                )
        
        return value
    
    def validate_contenedores(self, value):
        """Valida lista de contenedores"""
        if not value:
            return value
        
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "No puede haber números de contenedores duplicados"
            )
        
        return value
    
    def validate(self, data):
        """Validaciones cruzadas"""
        # Si tiene House BLs, debería tener Master BL
        house_bls = data.get('house_bls', self.instance.house_bls if self.instance else [])
        master_bl = data.get('master_bl', self.instance.master_bl if self.instance else None)
        
        if house_bls and not master_bl:
            raise serializers.ValidationError({
                'master_bl': 'Si tiene House BLs, debe especificar un Master BL'
            })
        
        return data
    
    def create(self, validated_data):
        """Crear OT registrando usuario"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['modificado_por'] = request.user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Actualizar OT registrando usuario y marcando campos editados manualmente"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            instance.modificado_por = request.user

        # Lista de campos cuya fuente debe ser marcada como 'manual' al editar
        PROTECTED_FIELDS = [
            'estado', 'fecha_eta', 'fecha_llegada', 'barco', 'proveedor', 
            'puerto_origen', 'puerto_destino', 'fecha_provision'
        ]

        for field_name in PROTECTED_FIELDS:
            if field_name in validated_data:
                # Si el campo se está actualizando, marcar su fuente como manual
                source_field = f"{field_name}_source"
                setattr(instance, source_field, 'manual')

        # Lógica especial para provision: si se edita manualmente, se bloquea
        if 'fecha_provision' in validated_data:
            instance.provision_locked = True

        # Llamar al update del padre para guardar los cambios
        return super().update(instance, validated_data)


class OTSearchSerializer(serializers.Serializer):
    """Serializer para búsquedas avanzadas"""
    
    query = serializers.CharField(
        required=True,
        help_text="Término de búsqueda (puede ser contenedor, BL, número OT, etc.)"
    )
    
    search_type = serializers.ChoiceField(
        choices=['all', 'contenedor', 'master_bl', 'house_bl', 'numero_ot'],
        default='all',
        help_text="Tipo de búsqueda a realizar"
    )
    
    proveedor_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Filtrar por proveedor (opcional)"
    )
    
    cliente_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Filtrar por cliente (opcional)"
    )
    
    estado = serializers.ChoiceField(
        choices=['pendiente', 'en_transito', 'puerto', 'entregado', 'facturado', 'cerrado', 'cancelado'],
        required=False,
        allow_null=True,
        help_text="Filtrar por estado (opcional)"
    )


class ExcelUploadSerializer(serializers.Serializer):
    """Serializer para subida de múltiples archivos Excel"""
    
    files = serializers.ListField(
        child=serializers.FileField(),
        required=True,
        allow_empty=False,
        help_text="Uno o más archivos Excel (.xlsx, .xls) con OTs"
    )
    
    tipos_operacion = serializers.ListField(
        child=serializers.ChoiceField(choices=[('importacion', 'Importación'), ('exportacion', 'Exportación')]),
        required=False,
        help_text="Array de tipos de operación, uno por cada archivo (en el mismo orden)"
    )
    
    def validate_files(self, value):
        """Validar formato y tamaño de los archivos"""
        if not value:
            raise serializers.ValidationError("Debe proporcionar al menos un archivo")
        
        valid_extensions = ['.xlsx', '.xls']
        max_size = 10 * 1024 * 1024  # 10MB
        
        for file in value:
            file_name = file.name.lower()
            
            # Validar extensión
            if not any(file_name.endswith(ext) for ext in valid_extensions):
                raise serializers.ValidationError(
                    f"Formato de archivo no válido para '{file.name}'. Use: {', '.join(valid_extensions)}"
                )
            
            # Validar tamaño
            if file.size > max_size:
                raise serializers.ValidationError(
                    f"El archivo '{file.name}' es demasiado grande. Tamaño máximo: 10MB"
                )
        
        return value


class ExcelImportResultSerializer(serializers.Serializer):
    """Serializer para resultado de importación de Excel"""
    
    success = serializers.BooleanField(
        help_text="Indica si la importación fue exitosa"
    )
    
    has_conflicts = serializers.BooleanField(
        default=False,
        help_text="Indica si hay conflictos pendientes de resolver"
    )
    
    total_rows = serializers.IntegerField(
        help_text="Total de filas procesadas"
    )
    
    processed = serializers.IntegerField(
        help_text="Filas procesadas exitosamente"
    )
    
    created = serializers.IntegerField(
        help_text="OTs creadas"
    )
    
    updated = serializers.IntegerField(
        help_text="OTs actualizadas"
    )
    
    skipped = serializers.IntegerField(
        help_text="Filas omitidas"
    )
    
    conflicts = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Lista de conflictos de provisiones protegidas"
    )
    
    errors = serializers.ListField(
        child=serializers.DictField(),
        help_text="Lista de errores encontrados"
    )
    
    warnings = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Lista de advertencias sobre filas omitidas"
    )
    
    message = serializers.CharField(
        required=False,
        help_text="Mensaje descriptivo del resultado"
    )


class ConflictSerializer(serializers.Serializer):
    """Serializer para conflictos detectados durante la importación"""
    
    ot = serializers.CharField(
        help_text="Número de OT con conflicto"
    )
    
    campo = serializers.CharField(
        help_text="Campo con conflicto (cliente u operativo)"
    )
    
    valor_actual = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False,
        help_text="Valor actual en la base de datos"
    )
    
    valor_nuevo = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False,
        help_text="Valor nuevo en el archivo"
    )
    
    archivo_origen = serializers.CharField(
        required=False,
        help_text="Nombre del archivo origen"
    )
    
    row = serializers.IntegerField(
        required=False,
        help_text="Número de fila en el archivo"
    )


class ConflictResolutionItemSerializer(serializers.Serializer):
    """Serializer para una decisión de resolución de conflicto individual"""
    
    ot = serializers.CharField(
        help_text="Número de OT"
    )
    
    campo = serializers.CharField(
        help_text="Campo a resolver (cliente u operativo)"
    )
    
    resolucion = serializers.ChoiceField(
        choices=['mantener_actual', 'usar_nuevo'],
        help_text="Decisión: mantener_actual o usar_nuevo"
    )


class ConflictResolutionSerializer(serializers.Serializer):
    """Serializer para resolver conflictos de importación"""
    
    conflicts = ConflictResolutionItemSerializer(
        many=True,
        help_text="Lista de resoluciones de conflictos"
    )
    
    def validate_conflicts(self, value):
        """Validar que hay al menos una resolución"""
        if not value:
            raise serializers.ValidationError(
                "Debe proporcionar al menos una resolución de conflicto"
            )
        return value



"""
Serializers para la gestión de aliases de clientes.

Los serializers incluyen validaciones y métodos para:
- Buscar similares sin fusionar automáticamente
- Aprobar/rechazar sugerencias de fusión
- Verificar aliases manualmente
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models as django_models
from .models import ClientAlias, SimilarityMatch
from catalogs.models import Provider
from catalogs.serializers import ProviderSerializer

User = get_user_model()


class ClientAliasListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar aliases"""

    provider_name = serializers.CharField(source='provider.name', read_only=True)
    is_merged = serializers.SerializerMethodField()
    merged_count = serializers.SerializerMethodField()
    tipo_contribuyente_display = serializers.CharField(source='get_tipo_contribuyente_display', read_only=True)

    class Meta:
        model = ClientAlias
        fields = [
            'id',
            'original_name',
            'normalized_name',
            'short_name',
            'provider_name',
            'is_verified',
            'is_merged',
            'merged_count',
            'usage_count',
            # Campos tributarios El Salvador
            'tipo_contribuyente',
            'tipo_contribuyente_display',
            'nit',
            'nrc',
            'aplica_retencion_iva',
            'aplica_retencion_renta',
            'porcentaje_retencion_renta',
            'created_at',
        ]
    
    def get_is_merged(self, obj):
        """Indica si este alias está fusionado hacia otro"""
        return obj.merged_into is not None
    
    def get_merged_count(self, obj):
        """Cuenta cuántos aliases están fusionados hacia este"""
        return obj.merged_aliases.filter(deleted_at__isnull=True).count()


class ClientAliasSerializer(serializers.ModelSerializer):
    """Serializer completo para detalles de alias"""
    
    provider = ProviderSerializer(read_only=True)
    provider_id = serializers.PrimaryKeyRelatedField(
        queryset=Provider.objects.filter(is_active=True),
        source='provider',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name',
        read_only=True
    )
    
    merged_into_name = serializers.CharField(
        source='merged_into.original_name',
        read_only=True
    )
    
    merged_aliases_list = serializers.SerializerMethodField()
    similar_suggestions = serializers.SerializerMethodField()
    
    tipo_contribuyente_display = serializers.CharField(source='get_tipo_contribuyente_display', read_only=True)

    class Meta:
        model = ClientAlias
        fields = [
            'id',
            'original_name',
            'normalized_name',
            'short_name',
            'provider',
            'provider_id',
            'notes',
            'merged_into',
            'merged_into_name',
            'merged_aliases_list',
            'is_verified',
            'verified_by',
            'verified_by_name',
            'verified_at',
            'usage_count',
            'similar_suggestions',
            # Campos tributarios - El Salvador
            'tipo_contribuyente',
            'tipo_contribuyente_display',
            'nit',
            'nrc',
            'aplica_retencion_iva',
            'aplica_retencion_renta',
            'porcentaje_retencion_renta',
            'acepta_credito_fiscal',
            'direccion_fiscal',
            'telefono',
            'email_facturacion',
            'actividad_economica',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'normalized_name',
            'verified_by',
            'verified_at',
            'usage_count',
            'tipo_contribuyente_display',
            'created_at',
            'updated_at',
        ]
    
    def get_merged_aliases_list(self, obj):
        """Lista los aliases fusionados hacia este"""
        if obj.merged_into:
            return None  # Si está fusionado, no tiene aliases fusionados hacia él
        
        merged = obj.merged_aliases.filter(deleted_at__isnull=True)
        return ClientAliasListSerializer(merged, many=True).data
    
    def get_similar_suggestions(self, obj):
        """Obtiene sugerencias pendientes de similitud"""
        # Buscar sugerencias donde este alias aparece
        suggestions = SimilarityMatch.objects.filter(
            status='pending'
        ).filter(
            django_models.Q(alias_1=obj) | django_models.Q(alias_2=obj)
        ).order_by('-similarity_score')[:5]
        
        return SimilarityMatchSerializer(suggestions, many=True).data
    
    def validate_original_name(self, value):
        """Valida que el nombre no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío")
        return value.strip()
    
    def validate_short_name(self, value):
        """Valida que el short_name sea único y válido"""
        if not value:
            return value  # Se autogenerará
        
        # Limpiar el valor
        value = value.strip().upper()
        
        # Validar longitud
        if len(value) > 50:
            raise serializers.ValidationError("El alias corto no puede tener más de 50 caracteres")
        
        # Validar caracteres permitidos (letras, números, espacios y guión bajo)
        import re
        if not re.match(r'^[A-Z0-9_ ]+$', value):
            raise serializers.ValidationError(
                "El alias corto solo puede contener letras mayúsculas, números, espacios y guión bajo"
            )
        
        # Validar unicidad
        instance_id = self.instance.id if self.instance else None
        if ClientAlias.objects.filter(short_name=value).exclude(id=instance_id).exists():
            raise serializers.ValidationError(f"El alias corto '{value}' ya existe")
        
        return value


class SimilarityMatchSerializer(serializers.ModelSerializer):
    """Serializer para sugerencias de similitud"""

    alias_1 = ClientAliasListSerializer(read_only=True)
    alias_1_id = serializers.IntegerField(source="alias_1.id", read_only=True)
    alias_2 = ClientAliasListSerializer(read_only=True)
    alias_2_id = serializers.IntegerField(source="alias_2.id", read_only=True)

    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = SimilarityMatch
        fields = [
            'id',
            'alias_1',
            'alias_1_id',
            'alias_2',
            'alias_2_id',
            'similarity_score',
            'detection_method',
            'status',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
            'created_at',
        ]
        read_only_fields = [
            'similarity_score',
            'detection_method',
            'reviewed_by',
            'reviewed_at',
            'created_at',
        ]


class FindSimilarSerializer(serializers.Serializer):
    """Serializer para buscar aliases similares a un nombre"""
    
    name = serializers.CharField(
        required=True,
        help_text="Nombre del cliente a buscar"
    )
    
    threshold = serializers.FloatField(
        default=80.0,
        min_value=0.0,
        max_value=100.0,
        help_text="Umbral mínimo de similitud (0-100)"
    )

    limit = serializers.IntegerField(
        default=10,
        min_value=1,
        max_value=50,
        help_text="Máximo de resultados a retornar"
    )


class MergeApprovalSerializer(serializers.Serializer):
    """Serializer para aprobar una fusión de aliases"""
    
    source_alias_id = serializers.IntegerField(
        required=True,
        help_text="ID del alias que se fusionará (desaparecerá)"
    )
    
    target_alias_id = serializers.IntegerField(
        required=True,
        help_text="ID del alias principal (al que se fusionará)"
    )
    
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notas sobre por qué se aprobó la fusión"
    )

    custom_target_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
        help_text="Nombre final personalizado para el alias fusionado"
    )
    
    def validate(self, data):
        """Valida que los aliases existan y puedan fusionarse"""
        source_id = data['source_alias_id']
        target_id = data['target_alias_id']
        
        if source_id == target_id:
            raise serializers.ValidationError(
                "No se puede fusionar un alias consigo mismo"
            )
        
        try:
            source = ClientAlias.objects.get(id=source_id, deleted_at__isnull=True)
            target = ClientAlias.objects.get(id=target_id, deleted_at__isnull=True)
        except ClientAlias.DoesNotExist:
            raise serializers.ValidationError("Uno o ambos aliases no existen")
        
        if source.merged_into:
            raise serializers.ValidationError(
                f"El alias '{source.original_name}' ya está fusionado"
            )
        
        if target.merged_into:
            raise serializers.ValidationError(
                f"No se puede fusionar hacia '{target.original_name}' "
                "porque ese alias ya está fusionado. Fusione hacia el alias principal."
            )
        
        custom_name = data.get('custom_target_name')
        if custom_name is not None:
            custom_name = custom_name.strip()
            if not custom_name:
                custom_name = None

        data['source_alias'] = source
        data['target_alias'] = target
        data['custom_target_name'] = custom_name
        
        return data


class MergeRejectionSerializer(serializers.Serializer):
    """Serializer para rechazar una sugerencia de fusión"""
    
    alias_1_id = serializers.IntegerField(required=True)
    alias_2_id = serializers.IntegerField(required=True)
    
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notas sobre por qué se rechazó (ej: 'Son de diferentes países')"
    )
    
    def validate(self, data):
        """Valida que los aliases existan"""
        try:
            alias_1 = ClientAlias.objects.get(
                id=data['alias_1_id'],
                deleted_at__isnull=True
            )
            alias_2 = ClientAlias.objects.get(
                id=data['alias_2_id'],
                deleted_at__isnull=True
            )
        except ClientAlias.DoesNotExist:
            raise serializers.ValidationError("Uno o ambos aliases no existen")
        
        data['alias_1'] = alias_1
        data['alias_2'] = alias_2
        
        return data

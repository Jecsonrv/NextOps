from rest_framework import serializers
from .models import RegexPattern, ProviderPattern, TargetField
from catalogs.models import Provider
import re


class TargetFieldSerializer(serializers.ModelSerializer):
    """
    Serializer completo para CRUD de campos objetivo
    """
    data_type_display = serializers.CharField(source='get_data_type_display', read_only=True)
    
    class Meta:
        model = TargetField
        fields = [
            'id',
            'code',
            'name',
            'description',
            'data_type',
            'data_type_display',
            'is_active',
            'priority',
            'example_value',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        """
        Validar que el código sea único y tenga formato snake_case
        """
        import re
        if not re.match(r'^[a-z][a-z0-9_]*$', value):
            raise serializers.ValidationError(
                "El código debe estar en formato snake_case (solo minúsculas, números y guiones bajos)"
            )
        return value


class RegexPatternListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar patrones
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    success_rate = serializers.SerializerMethodField()
    total_uses = serializers.SerializerMethodField()
    
    class Meta:
        model = RegexPattern
        fields = [
            'id',
            'name',
            'description',
            'category',
            'category_display',
            'is_active',
            'priority',
            'success_rate',
            'total_uses',
        ]
        read_only_fields = ['id']
    
    def get_success_rate(self, obj):
        """
        Calcular tasa de éxito basada en usage_stats
        """
        stats = obj.usage_stats
        total = stats.get('total_uses', 0)
        successful = stats.get('successful_matches', 0)
        
        if total == 0:
            return None
        
        return round((successful / total) * 100, 2)
    
    def get_total_uses(self, obj):
        """
        Obtener total de usos
        """
        return obj.usage_stats.get('total_uses', 0)


class RegexPatternSerializer(serializers.ModelSerializer):
    """
    Serializer completo para CRUD de patrones
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    test_results = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = RegexPattern
        fields = [
            'id',
            'name',
            'description',
            'pattern',
            'category',
            'category_display',
            'test_cases',
            'usage_stats',
            'is_active',
            'priority',
            'test_results',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'usage_stats', 'created_at', 'updated_at']
    
    def get_test_results(self, obj):
        """
        Obtener resultados de casos de prueba (solo si se solicita)
        """
        # Solo ejecutar si hay test_cases y el patrón ya está guardado
        if obj.pk and obj.test_cases:
            return obj.run_test_cases()
        return None
    
    def validate_name(self, value):
        """
        Validar que el nombre no esté vacío y sea único
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        
        # Verificar unicidad
        instance_id = self.instance.id if self.instance else None
        nombre_normalizado = value.strip()
        
        existing = RegexPattern.objects.filter(name__iexact=nombre_normalizado)
        if instance_id:
            existing = existing.exclude(id=instance_id)
        
        if existing.exists():
            raise serializers.ValidationError(f"Ya existe un patrón con el nombre '{nombre_normalizado}'.")
        
        return nombre_normalizado
    
    def validate_pattern(self, value):
        """
        Validar que el patrón sea una regex válida
        """
        if not value:
            raise serializers.ValidationError("El patrón no puede estar vacío.")
        
        try:
            re.compile(value)
        except re.error as e:
            raise serializers.ValidationError(f"Regex inválida: {str(e)}")
        
        return value
    
    def validate_test_cases(self, value):
        """
        Validar estructura de test_cases
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("test_cases debe ser una lista.")
        
        for i, test_case in enumerate(value):
            if not isinstance(test_case, dict):
                raise serializers.ValidationError(f"Caso de prueba {i+1} debe ser un objeto.")
            
            if 'input' not in test_case:
                raise serializers.ValidationError(f"Caso de prueba {i+1} debe tener 'input'.")
            
            if 'expected' not in test_case:
                raise serializers.ValidationError(f"Caso de prueba {i+1} debe tener 'expected'.")
            
            if not isinstance(test_case['expected'], bool):
                raise serializers.ValidationError(f"Caso de prueba {i+1}: 'expected' debe ser true o false.")
        
        return value
    
    def validate_category(self, value):
        """
        Validar que la categoría sea válida
        """
        categorias_validas = [choice[0] for choice in RegexPattern.CATEGORY_CHOICES]
        if value not in categorias_validas:
            raise serializers.ValidationError(
                f"Categoría inválida. Opciones válidas: {', '.join(categorias_validas)}"
            )
        return value


class PatternTestSerializer(serializers.Serializer):
    """
    Serializer para probar un patrón contra texto
    """
    pattern = serializers.CharField(required=True, help_text="Patrón regex a probar")
    text = serializers.CharField(required=True, help_text="Texto contra el cual probar")
    
    def validate_pattern(self, value):
        """
        Validar que sea una regex válida
        """
        try:
            re.compile(value)
        except re.error as e:
            raise serializers.ValidationError(f"Regex inválida: {str(e)}")
        return value


# ==================== PROVIDER PATTERNS ====================

class ProviderPatternSerializer(serializers.ModelSerializer):
    """Serializer completo para ProviderPattern"""
    
    provider_info = serializers.SerializerMethodField()
    target_field_info = serializers.SerializerMethodField()
    test_results = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = ProviderPattern
        fields = [
            'id', 'provider', 'provider_info', 'target_field', 'target_field_info',
            'name', 'description', 'pattern', 'test_cases', 'usage_count',
            'success_count', 'last_used', 'is_active', 'priority', 'case_sensitive',
            'created_at', 'updated_at', 'test_results', 'success_rate'
        ]
        read_only_fields = ['usage_count', 'success_count', 'last_used', 'created_at', 'updated_at']
    
    def get_provider_info(self, obj):
        """Información básica del proveedor"""
        return {
            'id': obj.provider.id,
            'nombre': obj.provider.nombre,
            'nit': obj.provider.nit if hasattr(obj.provider, 'nit') else None,
            'categoria': obj.provider.categoria if hasattr(obj.provider, 'categoria') else None
        }
    
    def get_target_field_info(self, obj):
        """Información del campo objetivo"""
        if obj.target_field:
            return {
                'id': obj.target_field.id,
                'code': obj.target_field.code,
                'name': obj.target_field.name,
                'data_type': obj.target_field.data_type,
            }
        return None
    
    def get_test_results(self, obj):
        """Obtener resultados de pruebas si se solicitan"""
        if self.context.get('run_tests'):
            return obj.run_test_cases()
        return None
    
    def get_success_rate(self, obj):
        """Calcular tasa de éxito"""
        if obj.usage_count > 0:
            return round((obj.success_count / obj.usage_count) * 100, 2)
        return 0


class ProviderPatternListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado"""
    
    provider_nombre = serializers.CharField(source='provider.nombre', read_only=True)
    target_field_name = serializers.CharField(source='target_field.name', read_only=True)
    target_field_code = serializers.CharField(source='target_field.code', read_only=True)
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = ProviderPattern
        fields = [
            'id', 'provider', 'provider_nombre', 'target_field', 'target_field_name',
            'target_field_code', 'name', 'description', 'pattern', 'is_active', 
            'priority', 'case_sensitive', 'test_cases', 'usage_count',
            'success_count', 'success_rate', 'last_used', 'created_at'
        ]
    
    def get_success_rate(self, obj):
        """Calcular tasa de éxito"""
        if obj.usage_count > 0:
            return round((obj.success_count / obj.usage_count) * 100, 2)
        return 0


class ProviderPatternTestSerializer(serializers.Serializer):
    """Serializer para probar patrones de proveedores"""
    pattern = serializers.CharField(required=True, help_text="Patrón regex a probar")
    text = serializers.CharField(required=True, help_text="Texto a analizar")
    case_sensitive = serializers.BooleanField(default=False, required=False, help_text="Búsqueda sensible a mayúsculas")


class ProviderIdentificationSerializer(serializers.Serializer):
    """Serializer para identificar proveedor desde texto"""
    text = serializers.CharField(required=True, help_text="Texto de la factura")
    target_fields = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="IDs de campos objetivo a filtrar (opcional)"
    )
    active_only = serializers.BooleanField(default=True, help_text="Solo usar patrones activos")

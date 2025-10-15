from rest_framework import serializers
from .models import Provider, CostType, CostCategory
import re


class CostCategoryListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar categorías de costo
    """
    class Meta:
        model = CostCategory
        fields = [
            'id',
            'code',
            'name',
            'color',
            'is_active',
            'display_order',
        ]
        read_only_fields = ['id']


class CostCategorySerializer(serializers.ModelSerializer):
    """
    Serializer completo para CRUD de categorías de costo
    """
    class Meta:
        model = CostCategory
        fields = [
            'id',
            'code',
            'name',
            'description',
            'color',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        """
        Validar que el código no esté vacío, sea único y uppercase (solo entre no eliminados)
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El código no puede estar vacío.")

        # Normalizar código (uppercase, sin espacios)
        code_normalizado = value.strip().upper().replace(' ', '_')

        # Validar formato (solo letras mayúsculas, números y guiones bajos)
        if not re.match(r'^[A-Z0-9_]+$', code_normalizado):
            raise serializers.ValidationError(
                "El código solo puede contener letras mayúsculas, números y guiones bajos."
            )

        # Verificar unicidad SOLO entre categorías NO eliminadas
        instance_id = self.instance.id if self.instance else None

        existing = CostCategory.objects.filter(code=code_normalizado, is_deleted=False)
        if instance_id:
            existing = existing.exclude(id=instance_id)

        if existing.exists():
            raise serializers.ValidationError(
                f"Ya existe una categoría activa con el código '{code_normalizado}'. "
                f"Por favor, elige un código diferente."
            )

        return code_normalizado
    
    def validate_name(self, value):
        """
        Validar que el nombre no esté vacío
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        
        return value.strip()
    
    def validate_color(self, value):
        """
        Validar formato hexadecimal del color (#RRGGBB)
        """
        if not value:
            raise serializers.ValidationError("El color es requerido.")
        
        # Normalizar (uppercase)
        color_normalizado = value.strip().upper()
        
        # Validar formato hex
        if not re.match(r'^#[0-9A-F]{6}$', color_normalizado):
            raise serializers.ValidationError(
                "El color debe estar en formato hexadecimal (#RRGGBB). Ejemplo: #3B82F6"
            )
        
        return color_normalizado
    
    def validate_display_order(self, value):
        """
        Validar que el orden de visualización sea un número no negativo
        """
        if value < 0:
            raise serializers.ValidationError("El orden de visualización debe ser un número no negativo.")
        return value


class CostTypeListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar tipos de costo
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    category_details = CostCategoryListSerializer(source='category', read_only=True)

    class Meta:
        model = CostType
        fields = [
            'id',
            'code',
            'name',
            'description',
            'category',
            'category_name',
            'category_color',
            'category_details',
            'is_active',
            'display_order',
        ]
        read_only_fields = ['id']


class CostTypeSerializer(serializers.ModelSerializer):
    """
    Serializer completo para CRUD de tipos de costo
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    category_details = CostCategoryListSerializer(source='category', read_only=True)
    
    class Meta:
        model = CostType
        fields = [
            'id',
            'code',
            'name',
            'description',
            'category',
            'category_name',
            'category_color',
            'category_details',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        """
        Validar que el código no esté vacío y sea único (solo entre los no eliminados)
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El código no puede estar vacío.")
        
        # Normalizar código (uppercase, sin espacios)
        code_normalizado = value.strip().upper().replace(' ', '_')
        
        # Verificar unicidad SOLO entre tipos de costo NO eliminados
        instance_id = self.instance.id if self.instance else None
        
        existing = CostType.objects.filter(code=code_normalizado, is_deleted=False)
        if instance_id:
            existing = existing.exclude(id=instance_id)
        
        if existing.exists():
            raise serializers.ValidationError(
                f"Ya existe un tipo de costo activo con el código '{code_normalizado}'. "
                f"Por favor, elige un código diferente."
            )
        
        return code_normalizado
    
    def validate_name(self, value):
        """
        Validar que el nombre no esté vacío
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        
        return value.strip()
    
    def validate_category(self, value):
        """
        Validar que la categoría exista y esté activa
        """
        if not value:
            raise serializers.ValidationError("La categoría es requerida.")
        
        # Verificar que la categoría existe
        if not CostCategory.objects.filter(id=value.id).exists():
            raise serializers.ValidationError("La categoría seleccionada no existe.")
        
        # Verificar que la categoría está activa
        if not value.is_active:
            raise serializers.ValidationError("La categoría seleccionada no está activa.")
        
        return value
    
    def validate_display_order(self, value):
        """
        Validar que el orden de visualización sea un número positivo
        """
        if value < 0:
            raise serializers.ValidationError("El orden de visualización debe ser un número positivo.")
        return value



class ProviderListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar proveedores
    """
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    
    class Meta:
        model = Provider
        fields = [
            'id',
            'nombre',
            'nit',
            'tipo',
            'tipo_display',
            'categoria',
            'categoria_display',
            'email',
            'telefono',
            'is_active',
            'tiene_credito',
            'dias_credito',
        ]
        read_only_fields = ['id']


class ProviderSerializer(serializers.ModelSerializer):
    """
    Serializer completo para CRUD de proveedores
    """
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    
    class Meta:
        model = Provider
        fields = [
            'id',
            'nombre',
            'nit',
            'tipo',
            'tipo_display',
            'categoria',
            'categoria_display',
            'email',
            'telefono',
            'direccion',
            'contacto',
            'notas',
            'is_active',
            'tiene_credito',
            'dias_credito',
            'payment_terms',
            'notas_credito',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nombre(self, value):
        """
        Validar que el nombre no esté vacío y sea único
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        
        # Verificar unicidad (considerando el caso de actualización)
        instance_id = self.instance.id if self.instance else None
        nombre_normalizado = value.strip()
        
        existing = Provider.objects.filter(nombre__iexact=nombre_normalizado)
        if instance_id:
            existing = existing.exclude(id=instance_id)
        
        if existing.exists():
            raise serializers.ValidationError(f"Ya existe un proveedor con el nombre '{nombre_normalizado}'.")
        
        return nombre_normalizado
    
    def validate_nit(self, value):
        """
        Validar formato de NIT (si se proporciona)
        """
        if value is None:
            return None

        nit_limpio = str(value).strip().upper()
        if not nit_limpio:
            return None

        if not all(c.isdigit() or c == '-' for c in nit_limpio):
            raise serializers.ValidationError("El NIT solo puede contener números y guiones.")

        instance_id = self.instance.id if self.instance else None
        existing = Provider.objects.filter(nit=nit_limpio)
        if instance_id:
            existing = existing.exclude(id=instance_id)

        if existing.exists():
            raise serializers.ValidationError(f"Ya existe un proveedor con el NIT '{nit_limpio}'.")

        return nit_limpio
    
    def validate_email(self, value):
        """
        Validar formato de email
        """
        if value:
            value = value.strip().lower()
        return value
    
    def validate_tipo(self, value):
        """
        Validar que el tipo sea uno de los permitidos
        """
        tipos_validos = [choice[0] for choice in Provider.TYPE_CHOICES]
        if value not in tipos_validos:
            raise serializers.ValidationError(f"Tipo inválido. Opciones válidas: {', '.join(tipos_validos)}")
        return value
    
    def validate_categoria(self, value):
        """
        Validar que la categoría sea una de las permitidas
        """
        categorias_validas = [choice[0] for choice in Provider.CATEGORY_CHOICES]
        if value not in categorias_validas:
            raise serializers.ValidationError(f"Categoría inválida. Opciones válidas: {', '.join(categorias_validas)}")
        return value

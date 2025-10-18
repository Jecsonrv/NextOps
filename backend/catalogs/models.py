from django.db import models
from common.models import TimeStampedModel, SoftDeleteModel


class CostCategory(TimeStampedModel, SoftDeleteModel):
    """
    Modelo para gestionar categorías de tipos de costo.
    Permite crear categorías dinámicas en lugar de tenerlas hardcodeadas.
    """
    
    # Código único (ej: 'maritimo', 'terrestre')
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código único de la categoría (ej: maritimo, terrestre)"
    )
    
    # Nombre descriptivo (ej: 'Marítimo', 'Terrestre')
    name = models.CharField(
        max_length=100,
        help_text="Nombre descriptivo de la categoría"
    )
    
    # Descripción detallada
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Descripción detallada de la categoría"
    )
    
    # Color para UI (hex color)
    color = models.CharField(
        max_length=7,
        default='#6B7280',
        help_text="Color en formato hexadecimal para visualización (ej: #3B82F6)"
    )
    
    # Estado
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si la categoría está activa"
    )
    
    # Orden de visualización
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Orden de visualización (menor número aparece primero)"
    )
    
    class Meta:
        db_table = 'catalogs_cost_category'
        verbose_name = 'Categoría de Costo'
        verbose_name_plural = 'Categorías de Costo'
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['display_order']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        # Normalizar código antes de guardar (uppercase, sin espacios)
        if self.code:
            self.code = self.code.strip().upper().replace(' ', '_')

        # Normalizar nombre antes de guardar
        if self.name:
            self.name = self.name.strip()

        # Validar formato de color
        if self.color and not self.color.startswith('#'):
            self.color = f"#{self.color}"

        super().save(*args, **kwargs)


class CostType(TimeStampedModel, SoftDeleteModel):
    """
    Modelo para gestionar tipos de costo para facturas y órdenes de trabajo.
    Migrado desde Invoice.TIPO_COSTO_CHOICES para permitir gestión dinámica.
    """
    
    # Código único (ej: 'FLETE', 'TRANSPORTE')
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código único del tipo de costo (ej: FLETE, TRANSPORTE)"
    )
    
    # Nombre descriptivo (ej: 'Flete', 'Transporte')
    name = models.CharField(
        max_length=100,
        help_text="Nombre descriptivo del tipo de costo"
    )
    
    # Descripción detallada
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Descripción detallada del tipo de costo"
    )
    
    # Categoría del tipo de costo (ahora es ForeignKey)
    category = models.ForeignKey(
        CostCategory,
        on_delete=models.PROTECT,
        related_name='cost_types',
        null=True,
        blank=True,
        help_text="Categoría del tipo de costo"
    )
    
    # Comportamiento del tipo de costo
    is_linked_to_ot = models.BooleanField(
        default=False,
        help_text="Indica si este tipo de costo debe enlazarse/sincronizarse con la OT (ej: Flete, Cargos de Naviera)"
    )

    # Estado
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el tipo de costo está activo"
    )

    # Orden de visualización
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Orden de visualización (menor número aparece primero)"
    )
    
    class Meta:
        db_table = 'catalogs_cost_type'
        verbose_name = 'Tipo de Costo'
        verbose_name_plural = 'Tipos de Costo'
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['display_order']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        # Normalizar código antes de guardar (uppercase, sin espacios)
        if self.code:
            self.code = self.code.strip().upper().replace(' ', '_')
        
        # Normalizar nombre antes de guardar
        if self.name:
            self.name = self.name.strip()
        
        super().save(*args, **kwargs)


class Provider(TimeStampedModel, SoftDeleteModel):
    """
    Modelo para gestionar proveedores (navieras, agentes locales, etc.)
    """
    
    # Tipos de proveedor
    TYPE_CHOICES = [
        ('naviera', 'Naviera'),
        ('agente_local', 'Agente Local'),
        ('agencia_aduanal', 'Agencia Aduanal'),
        ('agente_origen', 'Agente de Origen'),
        ('aseguradora', 'Aseguradora'),
        ('aerolinea', 'Aerolínea'),
        ('consolidadora', 'Consolidadora'),
        ('almacenadora', 'Almacenadora'),
        ('transportista', 'Transportista'),
        ('otro', 'Otro'),
    ]
    
    # Categorías de proveedor
    CATEGORY_CHOICES = [
        ('internacional', 'Internacional'),
        ('nacional', 'Nacional'),
        ('regional', 'Regional'),
    ]
    
    # Campos básicos
    nombre = models.CharField(
        max_length=255,
        unique=True,
        help_text="Nombre del proveedor"
    )
    nit = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="NIT del proveedor"
    )
    
    # Clasificación
    tipo = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='otro',
        help_text="Tipo de proveedor"
    )
    categoria = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='nacional',
        help_text="Categoría del proveedor"
    )
    
    # Información de contacto
    email = models.EmailField(
        null=True,
        blank=True,
        help_text="Email principal del proveedor"
    )
    telefono = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text="Teléfono de contacto"
    )
    direccion = models.TextField(
        null=True,
        blank=True,
        help_text="Dirección física"
    )
    contacto = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Nombre de la persona de contacto"
    )
    
    # Información adicional
    notas = models.TextField(
        null=True,
        blank=True,
        help_text="Notas adicionales sobre el proveedor"
    )
    
    # Términos de crédito
    tiene_credito = models.BooleanField(
        default=False,
        help_text="Indica si el proveedor ofrece términos de crédito"
    )
    dias_credito = models.PositiveIntegerField(
        default=0,
        help_text="Días de crédito otorgados por el proveedor"
    )
    payment_terms = models.TextField(
        null=True,
        blank=True,
        help_text="Términos y condiciones de pago (ej: '30 días desde fecha de factura')"
    )
    notas_credito = models.TextField(
        null=True,
        blank=True,
        help_text="Notas adicionales sobre términos de crédito y pago"
    )
    
    # Estado
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el proveedor está activo"
    )
    
    class Meta:
        db_table = 'catalogs_provider'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['tipo', 'is_active']),
            models.Index(fields=['categoria', 'is_active']),
            models.Index(fields=['nombre']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"
    
    def save(self, *args, **kwargs):
        # Normalizar nombre antes de guardar
        if self.nombre:
            self.nombre = self.nombre.strip()
        
        # Normalizar NIT antes de guardar
        if self.nit:
            self.nit = self.nit.strip().upper()
        
        super().save(*args, **kwargs)

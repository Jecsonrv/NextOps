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


class InvoicePatternCatalog(TimeStampedModel, SoftDeleteModel):
    """
    Catálogo de patrones regex para extracción automática de datos de facturas
    al momento de carga inicial (solo primera vez, no en ediciones).
    """
    
    TIPO_PATRON_CHOICES = [
        ('costo', 'Factura de Costo (Proveedores)'),
        ('venta', 'Factura de Venta (Clientes)'),
    ]
    
    TIPO_FACTURA_CHOICES = [
        ('nacional', 'Factura Nacional'),
        ('internacional', 'Factura Internacional'),
    ]
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        help_text="Nombre descriptivo del patrón (ej: DTE El Salvador, CCF, etc)"
    )
    
    tipo_patron = models.CharField(
        max_length=20,
        choices=TIPO_PATRON_CHOICES,
        default='costo',
        db_index=True,
        help_text="¿Es patrón para facturas de COSTO (proveedores) o de VENTA (clientes)?"
    )
    
    tipo_factura = models.CharField(
        max_length=20,
        choices=TIPO_FACTURA_CHOICES,
        default='nacional',
        db_index=True,
        help_text="Tipo de factura (nacional o internacional). Solo aplica para patrones de VENTA"
    )
    
    activo = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Si está activo, se usará en la extracción automática"
    )
    
    prioridad = models.IntegerField(
        default=10,
        help_text="Orden de aplicación (menor = mayor prioridad)"
    )
    
    # === PATRONES REGEX ===
    
    patron_numero_factura = models.TextField(
        blank=True,
        help_text="Regex para extraer número de factura. Ej: DTE-\\d{2}-[A-Z]\\d+-\\d+"
    )
    
    patron_numero_control = models.TextField(
        blank=True,
        help_text="Regex para extraer número de control (El Salvador DTE)"
    )
    
    patron_fecha_emision = models.TextField(
        blank=True,
        help_text="Regex para extraer fecha de emisión"
    )
    
    patron_nit_emisor = models.TextField(
        blank=True,
        help_text="Regex para extraer NIT del emisor"
    )
    
    patron_nombre_emisor = models.TextField(
        blank=True,
        help_text="Regex para extraer nombre del emisor"
    )
    
    patron_nit_cliente = models.TextField(
        blank=True,
        help_text="Regex para extraer NIT del cliente"
    )
    
    patron_nombre_cliente = models.TextField(
        blank=True,
        help_text="Regex para extraer nombre del cliente"
    )
    
    patron_subtotal = models.TextField(
        blank=True,
        help_text="Regex para extraer subtotal (total antes de IVA)"
    )
    
    patron_subtotal_gravado = models.TextField(
        blank=True,
        help_text="Regex para extraer subtotal gravado (base imponible con IVA)"
    )
    
    patron_subtotal_exento = models.TextField(
        blank=True,
        help_text="Regex para extraer subtotal exento (sin IVA)"
    )
    
    patron_iva = models.TextField(
        blank=True,
        help_text="Regex para extraer IVA"
    )
    
    patron_total = models.TextField(
        blank=True,
        help_text="Regex para extraer monto total final"
    )
    
    patron_retencion = models.TextField(
        blank=True,
        help_text="Regex para extraer monto de retención general"
    )
    
    patron_retencion_iva = models.TextField(
        blank=True,
        help_text="Regex para extraer retención de IVA (1% para Grandes Contribuyentes)"
    )
    
    patron_retencion_renta = models.TextField(
        blank=True,
        help_text="Regex para extraer retención de renta"
    )
    
    patron_otros_montos = models.TextField(
        blank=True,
        help_text="Regex para extraer otros montos no afectos (cargos adicionales que no llevan IVA)"
    )
    
    # === CONFIGURACIÓN DE IVA ===
    
    porcentaje_iva_default = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=13.00,
        help_text="Porcentaje de IVA por defecto (13% en El Salvador)"
    )
    
    permite_iva_mixto = models.BooleanField(
        default=True,
        help_text="Si permite líneas con y sin IVA en la misma factura"
    )
    
    # === ORGANIZACIÓN POR GRUPOS (UNIFICACIÓN) ===
    
    # Para COSTO: relación con proveedor
    proveedor = models.ForeignKey(
        'Provider',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patrones_factura',
        db_index=True,
        help_text="Para patrones de COSTO, proveedor asociado. Permite agrupar patrones por proveedor"
    )
    
    # Para VENTA: tipo de documento
    tipo_documento = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text="Para patrones de VENTA: DTE, CCF, Invoice, etc. Permite agrupar patrones por tipo"
    )
    
    # Jerarquía de grupos
    es_grupo_principal = models.BooleanField(
        default=True,
        db_index=True,
        help_text="True = es un grupo contenedor. False = es un patrón individual dentro de un grupo"
    )
    
    grupo_padre = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='patrones_hijos',
        help_text="Grupo al que pertenece este patrón (solo para patrones individuales)"
    )
    
    # Campo objetivo (granularidad)
    campo_objetivo = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Campo específico a extraer: numero_factura, mbl, hbl, total, fecha, iva, etc."
    )
    
    # Patrón regex específico (para patrones individuales)
    patron_regex = models.TextField(
        blank=True,
        help_text="Regex específico cuando es patrón individual (alternativa a los patron_* específicos)"
    )
    
    # === ESTADÍSTICAS DE USO ===
    
    uso_count = models.IntegerField(
        default=0,
        help_text="Número de veces que se ha usado este patrón en extracciones"
    )
    
    exito_count = models.IntegerField(
        default=0,
        help_text="Número de extracciones exitosas con este patrón"
    )
    
    ultima_uso = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora del último uso de este patrón"
    )
    
    # === CONFIGURACIÓN ADICIONAL ===
    
    case_sensitive = models.BooleanField(
        default=False,
        help_text="Si el patrón regex distingue mayúsculas/minúsculas"
    )
    
    # Test cases para validación
    casos_prueba = models.JSONField(
        default=list,
        blank=True,
        help_text="Casos de prueba: [{'input': 'texto', 'expected': 'valor', 'description': '...'}]"
    )
    
    # === NOTAS Y EJEMPLOS ===
    
    notas = models.TextField(
        blank=True,
        help_text="Notas sobre el uso del patrón"
    )
    
    ejemplo_texto = models.TextField(
        blank=True,
        help_text="Ejemplo de texto de factura que matchea con este patrón"
    )
    
    class Meta:
        db_table = 'catalogs_invoice_pattern'
        ordering = ['tipo_patron', '-es_grupo_principal', 'prioridad', 'nombre']
        verbose_name = 'Patrón de Factura'
        verbose_name_plural = 'Patrones de Facturas'
        indexes = [
            models.Index(fields=['activo', 'prioridad']),
            models.Index(fields=['tipo_factura', 'activo']),
            models.Index(fields=['tipo_patron', 'activo']),
            models.Index(fields=['es_grupo_principal', 'activo']),
            models.Index(fields=['proveedor', 'activo']),
            models.Index(fields=['campo_objetivo']),
        ]
    
    def __str__(self):
        if self.es_grupo_principal:
            if self.proveedor:
                return f"📦 GRUPO: {self.proveedor.nombre} - {self.nombre}"
            else:
                return f"📋 GRUPO: {self.nombre}"
        else:
            return f"🎯 {self.campo_objetivo or 'Campo'}: {self.nombre}"
    
    @property
    def tasa_exito(self):
        """Calcula el porcentaje de éxito del patrón"""
        if self.uso_count == 0:
            return 0
        return round((self.exito_count / self.uso_count) * 100, 1)
    
    def incrementar_uso(self, exitoso=True):
        """Incrementa contadores de uso y actualiza última fecha"""
        from django.utils import timezone
        self.uso_count += 1
        if exitoso:
            self.exito_count += 1
        self.ultima_uso = timezone.now()
        self.save(update_fields=['uso_count', 'exito_count', 'ultima_uso'])

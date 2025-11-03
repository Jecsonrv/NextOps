"""
Modelos para la gestión de aliases de clientes.

El sistema detecta clientes similares usando fuzzy matching pero NUNCA fusiona
automáticamente. Siempre requiere aprobación manual del administrador.

Casos contemplados:
- Variaciones de formato: mayúsculas/minúsculas, puntuación, espacios extras
- Nombres similares que corresponden a empresas diferentes
"""

from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal
from common.models import TimeStampedModel, SoftDeleteModel
from catalogs.models import Provider


class ClientAlias(TimeStampedModel, SoftDeleteModel):
    """
    Representa un alias de cliente detectado en documentos (Excel, facturas, etc).
    
    El sistema normaliza nombres pero NO fusiona automáticamente clientes similares.
    Cada alias se mantiene independiente hasta que un admin decida fusionarlo.
    """
    
    # Nombre original tal como viene en el documento
    original_name = models.CharField(
        max_length=500,
        help_text="Nombre exacto como aparece en el documento (Excel, factura, etc)"
    )
    
    # Nombre normalizado (uppercase, sin espacios extras, etc)
    normalized_name = models.CharField(
        max_length=500,
        db_index=True,
        help_text="Versión normalizada para búsquedas (uppercase, sin puntuación extra)"
    )
    
    # Alias corto para usar en nombres de archivos y referencias rápidas
    short_name = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text="Alias corto para usar en nombres de archivos (ej: 'SIMAN', 'WALMART', 'PRICESMART')"
    )

    # Proveedor asociado (si aplica)
    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_aliases',
        help_text="Proveedor que reportó este cliente (útil para contexto)"
    )
    
    # Información adicional para ayudar en decisiones
    notes = models.TextField(
        blank=True,
        help_text="Notas del administrador sobre este cliente"
    )
    
    # Cliente principal al que está fusionado (si fue aprobado)
    merged_into = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='merged_aliases',
        help_text="Si este alias fue fusionado, referencia al alias principal"
    )
    
    # Control de verificación manual
    is_verified = models.BooleanField(
        default=False,
        help_text="Si un admin revisó y confirmó que este alias es correcto/único"
    )
    
    verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_clients',
        help_text="Usuario que verificó este alias"
    )
    
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Cuándo fue verificado"
    )
    
    # Contadores de uso
    usage_count = models.IntegerField(
        default=0,
        help_text="Cuántas veces apareció este cliente en documentos"
    )

    # === CAMPOS TRIBUTARIOS - EL SALVADOR ===

    TIPO_CONTRIBUYENTE_CHOICES = [
        ('gran_contribuyente', 'Gran Contribuyente'),
        ('contribuyente_normal', 'Contribuyente Normal'),
        ('pequeño_contribuyente', 'Pequeño Contribuyente'),
        ('regimen_simple', 'Régimen Simplificado'),
        ('no_contribuyente', 'No Contribuyente / Extranjero'),
    ]

    tipo_contribuyente = models.CharField(
        max_length=30,
        choices=TIPO_CONTRIBUYENTE_CHOICES,
        default='contribuyente_normal',
        db_index=True,
        help_text="Tipo de contribuyente según DGII El Salvador"
    )

    # NIT (Número de Identificación Tributaria - El Salvador)
    nit = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        help_text="NIT del cliente (El Salvador)"
    )

    # NRC (Número de Registro de Contribuyente - El Salvador)
    nrc = models.CharField(
        max_length=20,
        blank=True,
        help_text="NRC del cliente (El Salvador)"
    )

    # RETENCIONES que este cliente NOS APLICA (si es gran contribuyente)
    aplica_retencion_iva = models.BooleanField(
        default=False,
        db_index=True,
        help_text="¿Este cliente retiene IVA 1%? (Gran Contribuyente)"
    )

    aplica_retencion_renta = models.BooleanField(
        default=False,
        help_text="¿Este cliente retiene Renta?"
    )

    porcentaje_retencion_renta = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Porcentaje de retención de renta (5%, 10%, etc.)"
    )

    # Régimen de facturación
    acepta_credito_fiscal = models.BooleanField(
        default=True,
        help_text="¿Puede recibir CCF (Comprobante Crédito Fiscal)?"
    )

    # Información de contacto tributaria
    direccion_fiscal = models.TextField(
        blank=True,
        help_text="Dirección fiscal del cliente"
    )

    telefono = models.CharField(
        max_length=50,
        blank=True,
        help_text="Teléfono de contacto"
    )

    email_facturacion = models.EmailField(
        blank=True,
        help_text="Email para envío de facturas electrónicas"
    )

    # Actividad económica
    actividad_economica = models.CharField(
        max_length=200,
        blank=True,
        help_text="Actividad económica principal del cliente"
    )

    class Meta:
        db_table = 'client_aliases'
        verbose_name = 'Alias de Cliente'
        verbose_name_plural = 'Aliases de Clientes'
        ordering = ['-usage_count', 'normalized_name']
        indexes = [
            models.Index(fields=['normalized_name']),
            models.Index(fields=['is_verified']),
        ]
        unique_together = []  # No forzamos unicidad aquí
    
    def __str__(self):
        merged_str = " [FUSIONADO]" if self.merged_into else ""
        return f"{self.original_name}{merged_str}"
    
    def clean(self):
        """Validaciones antes de guardar"""
        super().clean()
        
        # No puede fusionarse consigo mismo
        if self.merged_into and self.merged_into.id == self.id:
            raise ValidationError("Un alias no puede fusionarse consigo mismo")
        
        # Si está fusionado, debe estar hacia un alias sin fusionar
        if self.merged_into and self.merged_into.merged_into:
            raise ValidationError(
                "No se puede fusionar hacia un alias que ya está fusionado. "
                "Fusione hacia el alias principal."
            )
    
    def save(self, *args, **kwargs):
        # Auto-normalizar
        if not self.normalized_name:
            self.normalized_name = self.normalize_name(self.original_name)
        
        # Auto-generar short_name si no existe
        if not self.short_name:
            self.short_name = self.generate_short_name()
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    @staticmethod
    def normalize_name(name):
        """
        Normaliza un nombre para comparaciones.
        - Uppercase
        - Quita espacios extras
        - Quita puntos y comas al final
        """
        if not name:
            return ""
        
        normalized = name.upper().strip()
        # Reemplazar múltiples espacios por uno solo
        normalized = ' '.join(normalized.split())
        # Quitar puntos y comas finales comunes
        normalized = normalized.rstrip('.,;')
        
        return normalized
    
    def generate_short_name(self):
        """
        Genera un alias corto basado en el nombre original con manejo inteligente.

        Mejoras v2:
        - Convierte guiones y guiones bajos a ESPACIOS para mejor legibilidad
        - Maneja formatos: "WAL-MART", "SUPER_SELECTOS", "PRICE-SMART"
        - Preserva palabras completas cuando es posible (más amigable que siglas)
        - Filtra sufijos legales (S.A., LTDA, etc.)
        - Máximo 50 caracteres

        Ejemplos:
        - "WAL-MART" -> "WAL MART"
        - "SUPER-SELECTOS, S.A." -> "SUPER SELECTOS"
        - "ALMACENES_SIMAN" -> "ALMACENES SIMAN"
        - "CORPORACION WALMART DE MEXICO" -> "WALMART MEXICO"
        - "PRICESMART EL SALVADOR" -> "PRICESMART SALVADOR"
        """
        import re

        if not self.original_name:
            return None

        # Normalizar a uppercase
        clean = self.original_name.upper().strip()

        # PASO 1: Reemplazar guiones y guiones bajos por ESPACIOS
        # Esto convierte "WAL-MART" a "WAL MART", más legible
        clean = re.sub(r'[-_—–]', ' ', clean)

        # PASO 2: Remover puntuación extra pero preservar espacios
        clean = re.sub(r'[^\w\s]', ' ', clean)

        # PASO 3: Normalizar espacios múltiples
        clean = ' '.join(clean.split())

        # PASO 4: Palabras a ignorar (sufijos legales y conectores)
        STOP_WORDS = {
            'S.A', 'SA', 'S.A.', 'DE', 'C.V', 'C.V.', 'CV', 'LTDA', 'LTDA.',
            'CIA', 'CIA.', 'COMPANIA', 'COMPANY', 'CO', 'CO.', 'INC', 'INC.',
            'INCORPORATED', 'CORP', 'CORP.', 'CORPORATION', 'LLC', 'LTD', 'LTD.',
            'THE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'Y', 'AND', 'E', 'EN', 'POR',
            'PARA', 'CON', 'SIN'
        }

        # Tokenizar
        words = clean.split()

        # Filtrar stop words
        significant_words = [w for w in words if w not in STOP_WORDS and len(w) > 1]

        if not significant_words:
            # Si no quedan palabras, usar el nombre limpio completo
            base_short_name = clean[:50] if len(clean) <= 50 else clean[:47] + '...'
            return self._ensure_unique_short_name(base_short_name)

        # PASO 5: Generar alias basado en palabras significativas
        # PREFERIR PALABRAS COMPLETAS CON ESPACIOS en lugar de guiones bajos
        if len(significant_words) == 1:
            # Una sola palabra: usarla completa
            base_short_name = significant_words[0][:50]
        elif len(significant_words) == 2:
            # Dos palabras: usar ambas CON ESPACIO
            combined = ' '.join(significant_words[:2])
            base_short_name = combined[:50]
        else:
            # Tres o más palabras: usar las primeras 2-3 según longitud
            combined = ' '.join(significant_words[:2])
            if len(combined) <= 30:
                # Si las primeras dos caben bien, intentar agregar la tercera
                combined_three = ' '.join(significant_words[:3])
                if len(combined_three) <= 50:
                    base_short_name = combined_three
                else:
                    base_short_name = combined
            else:
                base_short_name = combined

        # PASO 6: Asegurar que no exceda 50 caracteres
        if len(base_short_name) > 50:
            base_short_name = base_short_name[:47] + '...'

        return self._ensure_unique_short_name(base_short_name)

    def _ensure_unique_short_name(self, base_short_name):
        """
        Asegura que el short_name sea único agregando sufijo numérico si es necesario.

        Args:
            base_short_name: Nombre base a hacer único

        Returns:
            str: Nombre único con sufijo si fue necesario
        """
        short_name = base_short_name
        counter = 1

        while ClientAlias.objects.filter(short_name=short_name).exclude(pk=self.pk).exists():
            # Agregar sufijo con espacio (más legible que guión bajo)
            suffix = f" {counter}"
            max_len = 50 - len(suffix)
            short_name = f"{base_short_name[:max_len]}{suffix}"
            counter += 1

            # Evitar loops infinitos
            if counter > 1000:
                # Usar timestamp como último recurso
                import time
                timestamp = int(time.time() * 1000) % 100000
                short_name = f"{base_short_name[:40]} {timestamp}"
                break

        return short_name
    
    def increment_usage(self):
        """Incrementa el contador de uso cuando aparece en un documento"""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])
    
    def get_effective_alias(self):
        """
        Obtiene el alias efectivo (si está fusionado, devuelve el principal)
        """
        if self.merged_into:
            return self.merged_into.get_effective_alias()
        return self


class SimilarityMatch(TimeStampedModel):
    """
    Representa una SUGERENCIA de que dos aliases podrían ser el mismo cliente.
    
    NUNCA se aplica automáticamente. El admin debe revisar y decidir:
    - APROBAR: fusiona los aliases
    - RECHAZAR: marca que NO son el mismo (evita sugerencias futuras)
    - IGNORAR: deja pendiente para revisar después
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente de Revisión'),
        ('approved', 'Aprobado - Fusionado'),
        ('rejected', 'Rechazado - Son Diferentes'),
        ('ignored', 'Ignorado - Revisar Después'),
    ]
    
    # Los dos aliases que podrían ser similares
    alias_1 = models.ForeignKey(
        ClientAlias,
        on_delete=models.CASCADE,
        related_name='similarity_matches_as_first'
    )
    
    alias_2 = models.ForeignKey(
        ClientAlias,
        on_delete=models.CASCADE,
        related_name='similarity_matches_as_second'
    )
    
    # Score de similitud (0-100)
    similarity_score = models.FloatField(
        help_text="Score de similitud calculado por fuzzy matching (0-100)"
    )
    
    # Método de detección
    detection_method = models.CharField(
        max_length=50,
        default='fuzzywuzzy',
        help_text="Algoritmo usado para detectar similitud"
    )
    
    # Estado de la sugerencia
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Quién revisó y cuándo
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_similarities'
    )
    
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Notas del revisor
    review_notes = models.TextField(
        blank=True,
        help_text="Por qué se aprobó o rechazó"
    )
    
    class Meta:
        db_table = 'similarity_matches'
        verbose_name = 'Sugerencia de Similitud'
        verbose_name_plural = 'Sugerencias de Similitud'
        ordering = ['-similarity_score', '-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['similarity_score']),
            models.Index(fields=['-similarity_score', 'status']),
        ]
        # Evitar sugerencias duplicadas
        unique_together = [['alias_1', 'alias_2']]
    
    def __str__(self):
        return (
            f"{self.alias_1.original_name} ≈ {self.alias_2.original_name} "
            f"({self.similarity_score:.1f}%) - {self.get_status_display()}"
        )
    
    def clean(self):
        """Validaciones"""
        super().clean()
        
        # No puede comparar un alias consigo mismo
        if self.alias_1.id == self.alias_2.id:
            raise ValidationError("No se puede comparar un alias consigo mismo")
        
        # No puede sugerir fusión si alguno ya está fusionado
        if self.alias_1.merged_into or self.alias_2.merged_into:
            raise ValidationError(
                "No se puede crear sugerencia para aliases ya fusionados"
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ClientResolution(TimeStampedModel):
    """
    Cachea decisiones de normalización de nombres de clientes.

    Cuando un usuario resuelve un conflicto (ej: JUGUESAL S.A. DE C.V. → JUGUESAL),
    guardamos esa decisión para aplicarla automáticamente en futuras cargas.

    Esto evita que el mismo conflicto aparezca repetidamente en cada carga de archivo.
    """

    RESOLUTION_TYPE_CHOICES = [
        ('manual', 'Resolución Manual'),
        ('automatic', 'Resolución Automática'),
        ('conflict', 'Resolución de Conflicto'),
    ]

    # Nombre original tal como aparece en el Excel
    original_name = models.CharField(
        max_length=500,
        db_index=True,
        help_text="Nombre original del cliente como aparece en el Excel"
    )

    # Nombre normalizado para búsqueda fuzzy
    normalized_name = models.CharField(
        max_length=500,
        help_text="Nombre normalizado para búsqueda fuzzy"
    )

    # Cliente al que se resolvió
    resolved_to = models.ForeignKey(
        ClientAlias,
        on_delete=models.CASCADE,
        related_name='resolutions',
        help_text="Cliente al que se resolvió esta variación"
    )

    # Tipo de resolución
    resolution_type = models.CharField(
        max_length=20,
        choices=RESOLUTION_TYPE_CHOICES,
        default='manual',
        help_text="Tipo de resolución aplicada"
    )

    # Audit trail
    created_by = models.CharField(
        max_length=100,
        default='system',
        blank=True
    )

    class Meta:
        db_table = 'client_resolutions'
        verbose_name = 'Resolución de Cliente'
        verbose_name_plural = 'Resoluciones de Clientes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['original_name']),
            models.Index(fields=['normalized_name']),
        ]
        unique_together = [('original_name', 'resolved_to')]

    def __str__(self):
        return f"{self.original_name} → {self.resolved_to.original_name}"

    @classmethod
    def find_resolution(cls, original_name: str):
        """
        Busca una resolución cacheada para un nombre original.

        Returns:
            ClientAlias si hay una resolución, None si no hay
        """
        normalized = ClientAlias.normalize_name(original_name)
        resolution = cls.objects.filter(
            normalized_name=normalized
        ).select_related('resolved_to').first()

        if resolution:
            return resolution.resolved_to.get_effective_alias()

        return None

    @classmethod
    def cache_resolution(cls, original_name: str, resolved_to: ClientAlias,
                        resolution_type: str = 'manual', created_by: str = 'system'):
        """
        Cachea una resolución para uso futuro.

        Args:
            original_name: Nombre original del cliente
            resolved_to: ClientAlias al que se resolvió
            resolution_type: Tipo de resolución
            created_by: Usuario que creó la resolución
        """
        normalized = ClientAlias.normalize_name(original_name)

        # Crear o actualizar
        resolution, created = cls.objects.update_or_create(
            original_name=original_name,
            defaults={
                'normalized_name': normalized,
                'resolved_to': resolved_to,
                'resolution_type': resolution_type,
                'created_by': created_by
            }
        )

        return resolution

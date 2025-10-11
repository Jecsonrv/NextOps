"""
Modelos para la gestión de aliases de clientes.

El sistema detecta clientes similares usando fuzzy matching pero NUNCA fusiona
automáticamente. Siempre requiere aprobación manual del administrador.

Casos contemplados:
- ALMACENES SIMAN, S.A. DE C.V. (El Salvador) ≠ ALMACENES SIMAN, S.A. (Nicaragua)
- Variaciones de formato: mayúsculas/minúsculas, puntuación, espacios extras
"""

from django.db import models
from django.core.exceptions import ValidationError
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
    
    # País para diferenciar entidades similares de diferentes países
    country = models.CharField(
        max_length=3,
        blank=True,
        null=True,
        help_text="Código ISO del país (GT, SV, NI, etc) - ayuda a diferenciar empresas similares"
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
    
    class Meta:
        db_table = 'client_aliases'
        verbose_name = 'Alias de Cliente'
        verbose_name_plural = 'Aliases de Clientes'
        ordering = ['-usage_count', 'normalized_name']
        indexes = [
            models.Index(fields=['normalized_name']),
            models.Index(fields=['country', 'normalized_name']),
            models.Index(fields=['is_verified']),
        ]
        # Un nombre normalizado puede repetirse SOLO si son de diferentes países
        # o si uno está fusionado
        unique_together = []  # No forzamos unicidad aquí
    
    def __str__(self):
        country_str = f" ({self.country})" if self.country else ""
        merged_str = " [FUSIONADO]" if self.merged_into else ""
        return f"{self.original_name}{country_str}{merged_str}"
    
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
        Genera un alias corto basado en el nombre original.
        
        Estrategia:
        1. Toma las siglas de palabras significativas (excluye: S.A., DE, C.V., etc)
        2. Si ya existe, agrega sufijo numérico
        3. Máximo 50 caracteres
        
        Ejemplos:
        - "ALMACENES SIMAN, S.A. DE C.V." -> "SIMAN"
        - "CORPORACION WALMART DE MEXICO" -> "WALMART"
        - "PRICESMART EL SALVADOR" -> "PRICESMART"
        """
        import re
        
        if not self.original_name:
            return None
        
        # Palabras a ignorar (artículos, conectores, sufijos legales comunes)
        STOP_WORDS = {
            'S.A', 'SA', 'S.A.', 'DE', 'C.V', 'C.V.', 'CV', 'LTDA', 'LTDA.', 
            'CIA', 'CIA.', 'COMPANIA', 'COMPANY', 'CO', 'CO.', 'INC', 'INC.',
            'INCORPORATED', 'CORP', 'CORP.', 'CORPORATION', 'LLC', 'LTD', 'LTD.',
            'THE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'Y', 'AND', 'E', 'EN', 'POR',
            'PARA', 'CON', 'SIN'
        }
        
        # Limpiar y dividir en palabras
        name = self.original_name.upper().strip()
        # Remover puntuación excepto espacios
        name = re.sub(r'[^\w\s]', ' ', name)
        words = name.split()
        
        # Filtrar palabras significativas
        significant_words = [w for w in words if w not in STOP_WORDS and len(w) > 1]
        
        if not significant_words:
            # Si no quedan palabras, usar las primeras letras del nombre original
            clean_name = re.sub(r'[^\w]', '', self.original_name.upper())
            base_short_name = clean_name[:20] if clean_name else 'CLIENT'
        else:
            # Si hay una sola palabra significativa, usarla directamente
            if len(significant_words) == 1:
                base_short_name = significant_words[0][:30]
            # Si la primera palabra es suficientemente descriptiva (>5 chars), usarla
            elif len(significant_words[0]) > 5:
                base_short_name = significant_words[0][:30]
            # Si hay varias palabras, usar las primeras dos
            elif len(significant_words) >= 2:
                base_short_name = '_'.join(significant_words[:2])[:30]
            else:
                base_short_name = '_'.join(significant_words)[:30]
        
        # Asegurar que sea único
        short_name = base_short_name
        counter = 1
        while ClientAlias.objects.filter(short_name=short_name).exclude(pk=self.pk).exists():
            suffix = f"_{counter}"
            max_len = 50 - len(suffix)
            short_name = f"{base_short_name[:max_len]}{suffix}"
            counter += 1
            
            # Evitar loops infinitos
            if counter > 1000:
                # Usar timestamp como último recurso
                import time
                timestamp = int(time.time() * 1000) % 100000
                short_name = f"{base_short_name[:40]}_{timestamp}"
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

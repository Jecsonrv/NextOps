"""
Modelos para la gestión de Órdenes de Trabajo (OTs).

El sistema maneja:
- OTs con múltiples contenedores
- Jerarquía de provisiones (House BL → Master BL → Contenedor)
- Búsqueda avanzada por contenedor, BL, cliente
- Tracking de costos y provisiones
"""

import re

from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from common.models import TimeStampedModel, SoftDeleteModel
from catalogs.models import Provider
from client_aliases.models import ClientAlias


CONTAINER_NUMBER_PATTERN = re.compile(r"^[A-Z]{4}\d{7}$")


class OT(TimeStampedModel, SoftDeleteModel):
    """
    Orden de Trabajo (OT) - Documento principal del sistema.
    
    Representa una operación logística que puede incluir:
    - Múltiples contenedores
    - Master BL (Bill of Lading)
    - House BLs (sub-conocimientos de embarque)
    - Provisiones de costos
    """
    
    # Número de OT (identificador único)
    numero_ot = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9\-]+$',
                message='El número de OT debe contener solo letras mayúsculas, números y guiones'
            )
        ],
        help_text="Número único de la orden de trabajo (ej: OT-2024-0001)"
    )
    
    # Proveedor que genera la OT (opcional, puede ser null)
    proveedor = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ots',
        help_text="Proveedor/transportista que emite esta OT (opcional)"
    )
    
    # Cliente (beneficiario de la carga)
    cliente = models.ForeignKey(
        ClientAlias,
        on_delete=models.PROTECT,
        related_name='ots',
        help_text="Cliente al que pertenece esta carga"
    )
    
    # Master Bill of Lading (conocimiento de embarque principal)
    master_bl = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="Número del Master BL (conocimiento de embarque principal)"
    )
    
    # House Bills of Lading (sub-conocimientos) - Array JSON
    house_bls = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de House BLs asociados a esta OT. Formato: ['HBL001', 'HBL002']"
    )
    
    # Contenedores - Lista de números
    contenedores = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Lista de números de contenedores. "
            "Formato: ['MSCU1234567', 'MSCU7654321']"
        )
    )
    
    # Fechas importantes
    fecha_eta = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha estimada de llegada (Estimated Time of Arrival)"
    )
    
    fecha_llegada = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha real de llegada"
    )
    
    # Puerto de origen y destino
    puerto_origen = models.CharField(
        max_length=100,
        blank=True,
        help_text="Puerto de origen de la carga"
    )
    
    puerto_destino = models.CharField(
        max_length=100,
        blank=True,
        help_text="Puerto de destino de la carga"
    )
    
    # Información adicional de embarque
    operativo = models.CharField(
        max_length=100,
        blank=True,
        default='-',
        help_text="Nombre del operativo asignado (inferido del archivo o asignado manualmente)"
    )
    
    # Tipo de operación (importación o exportación)
    TIPO_OPERACION_CHOICES = [
        ('importacion', 'Importación'),
        ('exportacion', 'Exportación'),
    ]
    
    tipo_operacion = models.CharField(
        max_length=20,
        choices=TIPO_OPERACION_CHOICES,
        default='importacion',
        db_index=True,
        help_text="Tipo de operación: importación o exportación (detectado automáticamente)"
    )
    
    tipo_embarque = models.CharField(
        max_length=50,
        blank=True,
        default='-',
        help_text="Tipo de embarque (FCL, LCL, etc.)"
    )
    
    barco = models.CharField(
        max_length=200,
        blank=True,
        default='-',
        help_text="Nombre del barco/buque"
    )

    # --- INICIO: Sistema de Jerarquía de Fuentes de Datos ---
    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('csv', 'CSV'),
        ('excel', 'Excel'),
    ]

    HIERARCHY_PRIORITY = {
        'manual': 3,
        'csv': 2,
        'excel': 1,
        '': 0
    }

    # Campos con seguimiento de fuente
    estado_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    fecha_eta_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    fecha_llegada_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    barco_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    proveedor_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    puerto_origen_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    puerto_destino_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, default='')
    # --- FIN: Sistema de Jerarquía de Fuentes de Datos ---
    
    etd = models.DateField(
        null=True,
        blank=True,
        help_text="Estimated Time of Departure - Fecha estimada de salida"
    )
    
    # Fechas de facturación
    fecha_solicitud_facturacion = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se solicitó la facturación"
    )
    
    fecha_recepcion_factura = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se recibió la factura"
    )
    
    # Estado de facturación (calculado automáticamente)
    ESTADO_FACTURACION_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('facturado', 'Facturado'),
    ]
    
    estado_facturado = models.CharField(
        max_length=20,
        choices=ESTADO_FACTURACION_CHOICES,
        default='pendiente',
        help_text="Estado de facturación (calculado automáticamente)"
    )
    
    # Express Release y Contra Entrega
    express_release_tipo = models.CharField(
        max_length=150,
        blank=True,
        default='-',
        help_text="Tipo de Express Release"
    )
    
    express_release_fecha = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de Express Release"
    )
    
    contra_entrega_tipo = models.CharField(
        max_length=150,
        blank=True,
        default='-',
        help_text="Tipo de Contra Entrega"
    )
    
    contra_entrega_fecha = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de Contra Entrega"
    )
    
    # Envío de cierre
    envio_cierre_ot = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de envío de cierre de OT"
    )
    
    # Comentarios (NO se importan, solo edición manual)
    comentarios = models.TextField(
        blank=True,
        default='',
        help_text="Comentarios adicionales (solo edición manual)"
    )
    
    # Provisiones - Jerarquía de costos estimados
    provision_hierarchy = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Jerarquía de provisiones de costos. "
            "Formato: {'total': 5000, 'items': [{'concepto': 'Flete', 'monto': 3000}, ...]}"
        )
    )
    
    # Campos de control de provisiones (MANUAL > CSV > EXCEL)
    PROVISION_SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('csv', 'CSV'),
        ('excel', 'Excel'),
    ]
    
    fecha_provision = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de la provisión de proveedor"
    )
    
    provision_source = models.CharField(
        max_length=20,
        choices=PROVISION_SOURCE_CHOICES,
        blank=True,
        default='',
        help_text="Fuente de la provisión (MANUAL, CSV, EXCEL)"
    )
    
    provision_locked = models.BooleanField(
        default=False,
        help_text="Si está bloqueada, no puede ser sobrescrita por importaciones de menor prioridad"
    )
    
    provision_updated_by = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Usuario o sistema que actualizó la provisión"
    )
    
    # Estado de provisión (calculado automáticamente)
    ESTADO_PROVISION_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('provisionada', 'Provisionada'),
        ('revision', 'En Revisión'),
        ('disputada', 'Disputada'),
    ]
    
    estado_provision = models.CharField(
        max_length=20,
        choices=ESTADO_PROVISION_CHOICES,
        default='pendiente',
        help_text="Estado de provisión (calculado automáticamente o seteable por admin)"
    )
    
    # Estado de la OT
    STATUS_CHOICES = [
        ('almacenadora', 'Almacenadora'),
        ('bodega', 'Bodega'),
        ('cerrada', 'Cerrada'),
        ('desprendimiento', 'Desprendimiento'),
        ('disputa', 'Disputa'),
        ('en_rada', 'En Rada'),
        ('fact_adicionales', 'Fact Adicionales'),
        ('finalizada', 'Finalizada'),
        ('puerto', 'Puerto'),
        ('transito', 'Tránsito'),
        # Estados legacy (mantener por compatibilidad)
        ('pendiente', 'Pendiente'),
        ('entregado', 'Entregado'),
        ('facturado', 'Facturado'),
        ('cerrado', 'Cerrado'),
        ('cancelado', 'Cancelado'),
    ]
    
    estado = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='transito',
        db_index=True,
        help_text="Estado actual de la OT"
    )
    
    # Notas adicionales
    notas = models.TextField(
        blank=True,
        help_text="Notas o comentarios sobre esta OT"
    )
    
    # Hash de la fila para detectar cambios
    row_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="SHA256 hash of the row data to detect changes."
    )

    # Tracking de cambios
    modificado_por = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ots_modificadas',
        help_text="Último usuario que modificó esta OT"
    )
    
    class Meta:
        db_table = 'ots'
        verbose_name = 'Orden de Trabajo'
        verbose_name_plural = 'Órdenes de Trabajo'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['numero_ot']),
            models.Index(fields=['master_bl']),
            models.Index(fields=['estado']),
            models.Index(fields=['proveedor', 'estado']),
            models.Index(fields=['cliente']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['row_hash']),
        ]
    
    def __str__(self):
        return f"{self.numero_ot} - {self.cliente.original_name}"
    
    def clean(self):
        """Validaciones antes de guardar"""
        super().clean()
        
        # Validar formato de contenedores
        if self.contenedores and not isinstance(self.contenedores, list):
            raise ValidationError({
                'contenedores': 'Los contenedores deben ser una lista/array'
            })

        self._normalize_contenedores()
        
        # Validar formato de house_bls
        if self.house_bls:
            if not isinstance(self.house_bls, list):
                raise ValidationError({
                    'house_bls': 'Los House BLs deben ser una lista/array'
                })
        
        # Validar formato de provision_hierarchy
        if self.provision_hierarchy:
            if not isinstance(self.provision_hierarchy, dict):
                raise ValidationError({
                    'provision_hierarchy': 'La jerarquía de provisiones debe ser un objeto/dict'
                })
    
    def save(self, *args, **kwargs):
        # Debug: Ver qué valor llega ANTES de cualquier procesamiento
        print(f"🔵 [SAVE] Valores ANTES del procesamiento:")
        print(f"  - estado_provision: {self.estado_provision}")
        print(f"  - fecha_provision: {self.fecha_provision}")
        
        # Normalizar número de OT a mayúsculas
        if self.numero_ot:
            self.numero_ot = self.numero_ot.upper().strip()
        
        # Normalizar Master BL a mayúsculas
        if self.master_bl:
            self.master_bl = self.master_bl.upper().strip()
        
        # Normalizar House BLs a mayúsculas
        if self.house_bls and isinstance(self.house_bls, list):
            self.house_bls = [hbl.upper().strip() if isinstance(hbl, str) else hbl for hbl in self.house_bls]
        
        # Normalizar números de contenedores
        self._normalize_contenedores()
        
        # Actualizar estado de facturación automáticamente solo si está en pendiente
        # y hay cambio en la fecha (no sobreescribir cambios manuales)
        if self.fecha_recepcion_factura and self.estado_facturado == 'pendiente':
            self.estado_facturado = 'facturado'
        elif not self.fecha_recepcion_factura and self.estado_facturado == 'facturado':
            # Si quitan la fecha pero el estado es facturado, volver a pendiente
            self.estado_facturado = 'pendiente'
        
        print(f"🟡 [SAVE] ANTES de lógica de provisión:")
        print(f"  - estado_provision: {self.estado_provision}")
        print(f"  - fecha_provision: {self.fecha_provision}")
        
        # LÓGICA ROBUSTA de auto-marcado de estado de provisión:
        # 1. Si hay fecha_provision -> estado debe ser 'provisionada'
        # 2. Si NO hay fecha_provision -> estado debe ser 'pendiente'
        # EXCEPTO si el estado es 'rechazada', 'disputada', 'revision', 'anulada' o 'anulada_parcialmente' (estos se mantienen)
        if self.estado_provision not in ['rechazada', 'disputada', 'revision', 'anulada', 'anulada_parcialmente']:
            if self.fecha_provision:
                if self.estado_provision != 'provisionada':
                    self.estado_provision = 'provisionada'
                    print(f"  ✅ Cambiado a 'provisionada' (hay fecha)")
            else:
                if self.estado_provision != 'pendiente':
                    self.estado_provision = 'pendiente'
                    print(f"  ✅ Cambiado a 'pendiente' (sin fecha)")
        else:
            print(f"  ⚪ Estado manual '{self.estado_provision}' mantenido")
        
        print(f"🟢 [SAVE] DESPUÉS de lógica de provisión:")
        print(f"  - estado_provision: {self.estado_provision}")
        
        # Convertir campos vacíos a '-' (excepto los que pueden ser null)
        if not self.operativo or not self.operativo.strip():
            self.operativo = '-'
        if not self.tipo_embarque or not self.tipo_embarque.strip():
            self.tipo_embarque = '-'
        if not self.barco or not self.barco.strip():
            self.barco = '-'
        if not self.express_release_tipo or not self.express_release_tipo.strip():
            self.express_release_tipo = '-'
        if not self.contra_entrega_tipo or not self.contra_entrega_tipo.strip():
            self.contra_entrega_tipo = '-'
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    def _normalize_contenedores(self):
        """Normaliza y valida la lista de contenedores."""
        if not self.contenedores:
            self.contenedores = []
            return

        if not isinstance(self.contenedores, list):
            raise ValidationError({
                'contenedores': 'Los contenedores deben ser representados como una lista'
            })

        normalized = []
        for raw in self.contenedores:
            if isinstance(raw, dict):
                numero = raw.get('numero', '')
            else:
                numero = raw

            if numero is None:
                continue

            if not isinstance(numero, str):
                numero = str(numero)

            cleaned = numero.upper().strip()
            cleaned = re.sub(r"[^A-Z0-9]", "", cleaned)

            if not cleaned:
                continue

            if not CONTAINER_NUMBER_PATTERN.match(cleaned):
                raise ValidationError({
                    'contenedores': f'Número de contenedor inválido: {numero}'
                })

            if cleaned not in normalized:
                normalized.append(cleaned)

        self.contenedores = normalized

    def get_total_contenedores(self):
        """Retorna el número total de contenedores"""
        return len(self.get_contenedores_numeros())

    def get_contenedores_numeros(self):
        """Retorna lista de números de contenedores"""
        if not self.contenedores:
            return []

        self._normalize_contenedores()

        return list(self.contenedores)
    
    def get_provision_total(self):
        """Retorna el total de provisiones"""
        if not self.provision_hierarchy or not isinstance(self.provision_hierarchy, dict):
            return 0.0
        
        return float(self.provision_hierarchy.get('total', 0.0))
    
    def add_contenedor(self, numero):
        """Agrega un contenedor a la OT asegurando unicidad."""
        if not numero:
            raise ValidationError("El número de contenedor es obligatorio")

        cleaned = numero.upper().strip()
        cleaned = re.sub(r"[^A-Z0-9]", "", cleaned)

        if not cleaned:
            raise ValidationError("El número de contenedor no puede estar vacío")

        if not CONTAINER_NUMBER_PATTERN.match(cleaned):
            raise ValidationError("El número de contenedor debe tener formato AAAA0000000")

        self._normalize_contenedores()

        if cleaned in self.contenedores:
            raise ValidationError(f"El contenedor {cleaned} ya existe en esta OT")

        self.contenedores.append(cleaned)
    
    def remove_contenedor(self, numero):
        """Elimina un contenedor por su número"""
        if not self.contenedores:
            return False

        self._normalize_contenedores()

        objetivo = numero.upper().strip()
        objetivo = re.sub(r"[^A-Z0-9]", "", objetivo)
        original_length = len(self.contenedores)

        self.contenedores = [
            cont for cont in self.contenedores if cont != objetivo
        ]

        return len(self.contenedores) < original_length
    
    def add_house_bl(self, house_bl):
        """Agrega un House BL a la lista"""
        if not self.house_bls:
            self.house_bls = []
        
        house_bl = house_bl.upper().strip()
        
        if house_bl not in self.house_bls:
            self.house_bls.append(house_bl)
    
    def set_provision(self, concepto, monto, categoria='operacion'):
        """
        Establece o actualiza una provisión.
        
        Args:
            concepto: Concepto de la provisión (ej: 'Flete', 'Almacenaje')
            monto: Monto de la provisión
            categoria: Categoría ('operacion', 'puerto', 'transporte', 'otros')
        """
        if not self.provision_hierarchy:
            self.provision_hierarchy = {'items': [], 'total': 0.0}
        
        if 'items' not in self.provision_hierarchy:
            self.provision_hierarchy['items'] = []
        
        # Buscar si ya existe
        item_existente = None
        for item in self.provision_hierarchy['items']:
            if item.get('concepto') == concepto:
                item_existente = item
                break
        
        if item_existente:
            item_existente['monto'] = float(monto)
            item_existente['categoria'] = categoria
        else:
            self.provision_hierarchy['items'].append({
                'concepto': concepto,
                'monto': float(monto),
                'categoria': categoria
            })
        
        # Recalcular total
        self.provision_hierarchy['total'] = sum(
            float(item.get('monto', 0)) 
            for item in self.provision_hierarchy['items']
        )
    
    def get_provisions_by_categoria(self):
        """Retorna provisiones agrupadas por categoría"""
        if not self.provision_hierarchy or 'items' not in self.provision_hierarchy:
            return {}
        
        categorias = {}
        for item in self.provision_hierarchy['items']:
            categoria = item.get('categoria', 'otros')
            if categoria not in categorias:
                categorias[categoria] = []
            categorias[categoria].append(item)
        
        return categorias
    
    def get_tiempo_transito(self):
        """
        Calcula el tiempo de tránsito en días (ETA - ETD).
        Retorna None si no hay ambas fechas, o '-' como string para UI.
        """
        if self.fecha_eta and self.etd:
            delta = self.fecha_eta - self.etd
            return delta.days
        return None
    
    def get_tiempo_transito_display(self):
        """Retorna el tiempo de tránsito formateado para UI"""
        dias = self.get_tiempo_transito()
        if dias is not None:
            return f"{dias} días"
        return '-'
    
    def get_numero_contenedores(self):
        """Retorna el número de contenedores (alias de get_total_contenedores)"""
        return self.get_total_contenedores()
    
    def can_update_field(self, field_name: str, new_source: str) -> bool:
        """
        Verifica si un campo puede ser actualizado según la jerarquía de fuentes.
        
        Args:
            field_name: El nombre del campo a verificar (ej: 'estado', 'fecha_eta').
            new_source: La nueva fuente que intenta la actualización ('manual', 'csv', 'excel').
            
        Returns:
            True si la actualización está permitida, False en caso contrario.
        """
        # El campo de provisión tiene una lógica especial con 'provision_locked'
        if field_name == 'fecha_provision':
            if self.provision_locked and new_source != 'manual':
                return False
            current_source = self.provision_source
        else:
            current_source = getattr(self, f"{field_name}_source", '')

        current_priority = self.HIERARCHY_PRIORITY.get(current_source, 0)
        new_priority = self.HIERARCHY_PRIORITY.get(new_source, 0)

        return new_priority >= current_priority

    def can_update_provision(self, new_source='excel'):
        """
        Wrapper para mantener compatibilidad. Usa la nueva lógica genérica.
        """
        can_update = self.can_update_field('fecha_provision', new_source)
        reason = '' if can_update else f'Prioridad insuficiente: {new_source} < {self.provision_source}'
        if self.provision_locked and new_source != 'manual':
            reason = 'Provisión bloqueada por cambio manual'
        
        return can_update, reason


class ProcessedFile(TimeStampedModel):
    """
    Registro de archivos Excel procesados para evitar reprocesamiento.

    Usa SHA256 del contenido del archivo para detectar si un archivo ya fue procesado.
    Esto mejora significativamente el rendimiento al evitar procesar el mismo archivo
    múltiples veces sin cambios.
    """

    # Hash SHA256 del contenido del archivo
    file_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="SHA256 hash del contenido del archivo"
    )

    # Nombre original del archivo
    filename = models.CharField(
        max_length=500,
        help_text="Nombre original del archivo procesado"
    )

    # Estadísticas del procesamiento
    total_rows = models.IntegerField(
        default=0,
        help_text="Total de filas procesadas"
    )

    created_count = models.IntegerField(
        default=0,
        help_text="Número de OTs creadas"
    )

    updated_count = models.IntegerField(
        default=0,
        help_text="Número de OTs actualizadas"
    )

    skipped_count = models.IntegerField(
        default=0,
        help_text="Número de filas omitidas"
    )

    # Usuario que procesó el archivo
    processed_by = models.CharField(
        max_length=100,
        help_text="Usuario que procesó el archivo"
    )

    # Tipo de operación procesada
    operation_type = models.CharField(
        max_length=20,
        default='importacion',
        help_text="Tipo de operación del archivo (importacion/exportacion)"
    )

    class Meta:
        db_table = 'processed_files'
        verbose_name = 'Archivo Procesado'
        verbose_name_plural = 'Archivos Procesados'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['file_hash']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.filename} ({self.file_hash[:8]}...) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    @classmethod
    def is_already_processed(cls, file_hash: str) -> bool:
        """
        Verifica si un archivo ya fue procesado.

        Args:
            file_hash: SHA256 hash del archivo

        Returns:
            True si ya fue procesado, False si es nuevo
        """
        return cls.objects.filter(file_hash=file_hash).exists()

    @classmethod
    def get_processed_file_info(cls, file_hash: str):
        """
        Obtiene información del procesamiento previo de un archivo.

        Args:
            file_hash: SHA256 hash del archivo

        Returns:
            Instancia de ProcessedFile si existe, None si no
        """
        return cls.objects.filter(file_hash=file_hash).first()

    @classmethod
    def mark_as_processed(cls, file_hash: str, filename: str, stats: dict,
                         processed_by: str = 'system', operation_type: str = 'importacion'):
        """
        Marca un archivo como procesado y guarda las estadísticas.

        Args:
            file_hash: SHA256 hash del archivo
            filename: Nombre del archivo
            stats: Diccionario con estadísticas (total_rows, created, updated, skipped)
            processed_by: Usuario que procesó
            operation_type: Tipo de operación
        """
        obj, created = cls.objects.update_or_create(
            file_hash=file_hash,
            defaults={
                'filename': filename,
                'total_rows': stats.get('total_rows', 0),
                'created_count': stats.get('created', 0),
                'updated_count': stats.get('updated', 0),
                'skipped_count': stats.get('skipped', 0),
                'processed_by': processed_by,
                'operation_type': operation_type,
            }
        )
        return obj

"""
Models para el módulo de facturas (Invoices).
Fase 7-8: Sistema de gestión de facturas con matching automático a OTs.
"""

from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from django.contrib.postgres.indexes import GinIndex
from common.models import TimeStampedModel, SoftDeleteModel
from ots.models import OT
from catalogs.models import Provider
from decimal import Decimal
import hashlib
import os


class UploadedFile(TimeStampedModel):
    """
    Registro de archivos subidos (PDFs, JSONs, etc.).
    Maneja deduplicación por hash SHA256.
    """
    
    filename = models.CharField(
        max_length=500,
        help_text="Nombre original del archivo"
    )
    
    path = models.CharField(
        max_length=1024,
        help_text="Ruta relativa del archivo en el storage"
    )
    
    sha256 = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Hash SHA256 del archivo para deduplicación"
    )
    
    size = models.BigIntegerField(
        help_text="Tamaño del archivo en bytes"
    )
    
    content_type = models.CharField(
        max_length=100,
        help_text="MIME type del archivo (application/pdf, application/json, etc.)"
    )
    
    class Meta:
        db_table = 'invoices_uploaded_file'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sha256']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.filename} ({self.sha256[:8]}...)"
    
    @staticmethod
    def calculate_hash(file_content):
        """Calcula SHA256 de un archivo"""
        return hashlib.sha256(file_content).hexdigest()


class Invoice(TimeStampedModel, SoftDeleteModel):
    """
    Factura procesada del sistema.
    Puede venir de: email automático, upload manual, o importación CSV.
    """
    
    # Choices para campos enumerados
    # Usar las mismas opciones que Provider.TYPE_CHOICES para consistencia
    TIPO_PROVEEDOR_CHOICES = [
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
    
    PROVEEDOR_CATEGORIA_CHOICES = [
        ('local', 'Local'),
        ('internacional', 'Internacional'),
    ]
    
    # NOTA: TIPO_COSTO_CHOICES se mantiene solo para referencia legacy y migraciones antiguas.
    # El sistema ahora usa tipos de costo DINÁMICOS desde el modelo CostType.
    # Este campo NO debe usarse para validación en nuevos desarrollos.
    TIPO_COSTO_CHOICES = [
        ('FLETE', 'Flete'),
        ('CARGOS_NAVIERA', 'Cargos de Naviera'),
        ('TRANSPORTE', 'Transporte'),
        ('ADUANA', 'Aduana'),
        ('ALMACENAJE', 'Almacenaje'),
        ('DEMORA', 'Demora'),
        ('OTRO', 'Otro'),
    ]
    
    ASSIGNMENT_METHOD_CHOICES = [
        ('ot_directa', 'OT Directa'),
        ('mbl_contenedor', 'MBL + Contenedor'),
        ('solo_mbl', 'Solo MBL'),
        ('solo_contenedor', 'Solo Contenedor'),
        ('proveedor_fecha', 'Proveedor + Fecha'),
        ('manual', 'Asignación Manual'),
        ('no_match', 'Sin Match'),
    ]
    
    ESTADO_PROVISION_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('revision', 'En Revisión'),
        ('disputada', 'Disputada'),
        ('provisionada', 'Provisionada'),
        ('anulada', 'Anulada'),
        ('anulada_parcialmente', 'Anulada Parcialmente'),
        ('rechazada', 'Rechazada'),
    ]
    
    ESTADO_FACTURACION_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('facturada', 'Facturada'),
    ]
    
    PROCESSING_SOURCE_CHOICES = [
        ('email_auto', 'Email Automático'),
        ('upload_manual', 'Upload Manual'),
        ('csv_import', 'Importación CSV'),
    ]
    
    TIPO_PAGO_CHOICES = [
        ('contado', 'Contado'),
        ('credito', 'Crédito'),
    ]
    
    # === Vinculación con OT ===
    ot = models.ForeignKey(
        OT,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='facturas',
        help_text="OT asociada a esta factura"
    )
    
    ot_number = models.CharField(
        max_length=32,
        blank=True,
        default='',
        db_index=True,
        help_text="Número de OT denormalizado para búsquedas rápidas"
    )
    
    # === Información del Proveedor ===
    proveedor = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='facturas',
        help_text="Proveedor del catálogo (si existe)"
    )
    
    proveedor_nit = models.CharField(
        max_length=64,
        blank=True,
        default='',
        help_text="NIT del proveedor"
    )
    
    proveedor_nombre = models.CharField(
        max_length=255,
        help_text="Nombre del proveedor (texto libre)"
    )
    
    tipo_proveedor = models.CharField(
        max_length=32,
        choices=TIPO_PROVEEDOR_CHOICES,
        default='otro',
        help_text="Tipo de proveedor"
    )
    
    proveedor_categoria = models.CharField(
        max_length=32,
        choices=PROVEEDOR_CATEGORIA_CHOICES,
        default='local',
        help_text="Categoría del proveedor"
    )
    
    # === Información de la Factura ===
    numero_factura = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Número único de la factura (único solo entre facturas no eliminadas)"
    )
    
    fecha_emision = models.DateField(
        db_index=True,
        help_text="Fecha de emisión de la factura"
    )
    
    # === Términos de Pago y Vencimiento ===
    tipo_pago = models.CharField(
        max_length=16,
        choices=TIPO_PAGO_CHOICES,
        default='contado',
        db_index=True,
        help_text="Tipo de pago: contado o crédito"
    )
    
    dias_credito_aplicado = models.PositiveIntegerField(
        default=0,
        help_text="Días de crédito aplicados desde el proveedor"
    )
    
    fecha_vencimiento = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Fecha de vencimiento calculada (fecha_emision + dias_credito_aplicado)"
    )
    
    alerta_vencimiento = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Alerta si está próxima a vencer (7 días)"
    )
    
    monto_original = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monto original de la factura antes de aplicar notas de crédito"
    )

    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto de la factura en USD"
    )
    
    monto_aplicable = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monto real a pagar después de ajustes por disputa. Si null, se usa el monto original."
    )
    
    # Tipo de costo - ahora acepta valores dinámicos desde CostType
    # Se eliminó choices para permitir tipos personalizados
    tipo_costo = models.CharField(
        max_length=50,  # Aumentado para soportar códigos más largos
        default='OTRO',
        db_index=True,
        help_text="Tipo de costo (código desde catálogo CostType)"
    )
    
    # === Detección Automática y Matching ===
    referencias_detectadas = models.JSONField(
        default=dict,
        blank=True,
        help_text="Referencias detectadas: {mbl, contenedor, ot, barco, fecha_eta, etc.}"
    )
    
    confianza_match = models.DecimalField(
        max_digits=4,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[MinValueValidator(Decimal('0.000'))],
        help_text="Nivel de confianza del matching (0.000 - 1.000)"
    )
    
    assignment_method = models.CharField(
        max_length=32,
        choices=ASSIGNMENT_METHOD_CHOICES,
        blank=True,
        default='',
        help_text="Método usado para asignar la OT"
    )
    
    requiere_revision = models.BooleanField(
        default=True,
        help_text="Indica si requiere revisión manual"
    )
    
    # === Estados y Fechas ===
    estado_provision = models.CharField(
        max_length=32,
        choices=ESTADO_PROVISION_CHOICES,
        default='pendiente',
        help_text="Estado de la provisión"
    )
    
    fecha_provision = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se provisionó"
    )
    
    estado_facturacion = models.CharField(
        max_length=32,
        choices=ESTADO_FACTURACION_CHOICES,
        default='pendiente',
        help_text="Estado de facturación"
    )
    
    fecha_facturacion = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se facturó"
    )

    # === Estado de Pago (CxP - Cuentas por Pagar) ===
    ESTADO_PAGO_CHOICES = [
        ('pendiente', 'Pendiente de Pago'),
        ('pagado_parcial', 'Pagado Parcialmente'),
        ('pagado_total', 'Pagado Totalmente'),
    ]

    estado_pago = models.CharField(
        max_length=20,
        choices=ESTADO_PAGO_CHOICES,
        default='pendiente',
        db_index=True,
        help_text="Estado de pago a proveedor"
    )

    monto_pagado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto total pagado a este proveedor por esta factura"
    )

    monto_pendiente = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto pendiente de pago (calculado automáticamente)"
    )

    # === Archivo Asociado ===
    uploaded_file = models.OneToOneField(
        UploadedFile,
        on_delete=models.PROTECT,
        related_name='invoice',
        help_text="Archivo original de la factura"
    )
    
    # === Procesamiento ===
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de procesamiento"
    )
    
    processed_by = models.CharField(
        max_length=255,
        default='system',
        help_text="Usuario o sistema que procesó la factura"
    )
    
    processing_source = models.CharField(
        max_length=32,
        choices=PROCESSING_SOURCE_CHOICES,
        default='upload_manual',
        help_text="Origen del procesamiento"
    )
    
    # === Notas y Metadata ===
    notas = models.TextField(
        blank=True,
        default='',
        help_text="Notas adicionales"
    )
    
    class Meta:
        db_table = 'invoices_invoice'
        ordering = ['-fecha_emision', '-created_at']
        indexes = [
            models.Index(fields=['numero_factura']),
            models.Index(fields=['ot_number']),
            models.Index(fields=['-fecha_emision']),
            models.Index(fields=['estado_provision']),
            models.Index(fields=['requiere_revision']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['tipo_pago']),
            models.Index(fields=['fecha_vencimiento']),
            models.Index(fields=['alerta_vencimiento']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['numero_factura', 'proveedor'],
                condition=models.Q(is_deleted=False),
                name='unique_numero_factura_proveedor_not_deleted'
            )
        ]
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
    
    def __str__(self):
        return f"Factura {self.numero_factura} - {self.proveedor_nombre}"

    def get_tipo_costo_display(self):
        """
        Retorna el nombre legible del tipo de costo.
        Consulta CostType para tipos dinámicos, usa legacy para tipos hardcoded.
        """
        # Primero intentar desde CostType (dinámico)
        from catalogs.models import CostType
        try:
            cost_type = CostType.objects.filter(
                code=self.tipo_costo,
                is_active=True,
                is_deleted=False
            ).first()
            if cost_type:
                return cost_type.name
        except Exception:
            pass

        # Fallback a choices legacy
        for code, name in self.TIPO_COSTO_CHOICES:
            if code == self.tipo_costo:
                return name

        # Si no se encuentra, retornar el código mismo
        return self.tipo_costo

    def save(self, *args, **kwargs):
        # Obtener el estado anterior ANTES de cualquier cambio
        old_estado_provision = None
        old_tipo_costo = None

        if self.pk:
            try:
                old_instance = Invoice.objects.get(pk=self.pk)
                old_estado_provision = old_instance.estado_provision
                old_tipo_costo = old_instance.tipo_costo
            except Invoice.DoesNotExist:
                pass  # Es una instancia nueva, no hay estado anterior

        # REGLA CRÍTICA: Si se cambia de un tipo vinculado a OT a uno NO vinculado,
        # limpiar las fechas que fueron heredadas de la OT
        if old_tipo_costo and old_tipo_costo != self.tipo_costo:
            # Verificar si el tipo anterior estaba vinculado y el nuevo no lo está
            old_vinculado = self._es_tipo_vinculado(old_tipo_costo)
            new_vinculado = self.es_costo_vinculado_ot()

            if old_vinculado and not new_vinculado:
                # Cambió de vinculado a NO vinculado -> limpiar fechas heredadas
                self.fecha_provision = None
                self.fecha_facturacion = None
                # Mantener el estado si es manual, sino volver a pendiente
                if self.estado_provision not in ['disputada', 'revision', 'rechazada']:
                    self.estado_provision = 'pendiente'
                if self.estado_facturacion not in ['disputada', 'en_revision']:
                    self.estado_facturacion = 'pendiente'

        # Sincronizar ot_number con el objeto OT
        if self.ot:
            self.ot_number = self.ot.numero_ot

        # Calcular vencimiento automático si es crédito
        if self.tipo_pago == 'credito':
            if self.proveedor and self.proveedor.tiene_credito:
                self.dias_credito_aplicado = self.proveedor.dias_credito
            if self.dias_credito_aplicado > 0 and self.fecha_emision:
                from datetime import timedelta
                self.fecha_vencimiento = self.fecha_emision + timedelta(days=self.dias_credito_aplicado)
        else:
            self.dias_credito_aplicado = 0
            self.fecha_vencimiento = None
            self.alerta_vencimiento = False

        if self.monto_aplicable is None:
            self.monto_aplicable = self.monto
        
        # VALIDACIÓN MEJORADA: Solo permitir monto_aplicable diferente de monto
        # si hay notas de crédito o disputas que justifiquen el cambio
        if self.monto_aplicable != self.monto:
            # Verificar si hay razones válidas para tener monto_aplicable diferente
            tiene_nc_aplicadas = self.notas_credito.filter(
                is_deleted=False, 
                estado='aplicada'
            ).exists() if self.pk else False
            
            tiene_disputas_aprobadas = self.disputas.filter(
                is_deleted=False,
                estado__in=['resuelta', 'cerrada'],
                resultado__in=['aprobada_total', 'aprobada_parcial']
            ).exists() if self.pk else False
            
            # Si no hay razones válidas y monto_aplicable <= 0, restaurar al monto original
            if not tiene_nc_aplicadas and not tiene_disputas_aprobadas:
                if self.monto_aplicable <= Decimal('0.00'):
                    self.monto_aplicable = self.monto
        
        # Asegurar que nunca sea negativo
        if self.monto_aplicable < Decimal('0.00'):
            self.monto_aplicable = Decimal('0.00')
        
        # Asegurar que no exceda el monto original
        if self.monto_aplicable > self.monto:
            self.monto_aplicable = self.monto

        if self.fecha_facturacion and self.estado_facturacion == 'pendiente':
            self.estado_facturacion = 'facturada'

        # REGLA: Si se agrega fecha_provision, el estado cambia a 'provisionada' SOLO SI el estado actual es 'pendiente' o 'en_revision'.
        if self.fecha_provision and self.estado_provision in ['pendiente', 'en_revision']:
            self.estado_provision = 'provisionada'
        
        # Lógica de herencia de fechas desde la OT (solo si la factura no tiene fecha)
        if self.es_costo_vinculado_ot() and self.ot:
            if not self.fecha_provision and self.ot.fecha_provision:
                self.fecha_provision = self.ot.fecha_provision
                # Solo cambiar estado si es pendiente o en revisión
                if self.estado_provision in ['pendiente', 'en_revision']:
                    self.estado_provision = 'provisionada'
            if not self.fecha_facturacion and self.ot.fecha_recepcion_factura:
                self.fecha_facturacion = self.ot.fecha_recepcion_factura
                # Solo cambiar estado si es pendiente
                if self.estado_facturacion == 'pendiente':
                    self.estado_facturacion = 'facturada'

        # === Cálculo de Estado de Pago ===
        # Usar monto_aplicable si existe, sino usar monto
        monto_a_pagar = self.monto_aplicable if self.monto_aplicable else self.monto

        # Calcular monto pendiente
        self.monto_pendiente = monto_a_pagar - self.monto_pagado

        # Asegurar que el monto pendiente no sea negativo
        if self.monto_pendiente < Decimal('0.00'):
            self.monto_pendiente = Decimal('0.00')

        # Actualizar estado_pago automáticamente
        if self.monto_pagado == Decimal('0.00'):
            self.estado_pago = 'pendiente'
        elif self.monto_pagado >= monto_a_pagar:
            self.estado_pago = 'pagado_total'
            # Asegurar que monto_pagado no exceda el monto a pagar
            if self.monto_pagado > monto_a_pagar:
                self.monto_pagado = monto_a_pagar
            self.monto_pendiente = Decimal('0.00')
        else:
            self.estado_pago = 'pagado_parcial'

        super().save(*args, **kwargs)

        # NOTA: La sincronización Invoice -> OT ahora se maneja mediante señal
        # post_save en invoices/signals.py (sync_invoice_to_ot_on_assignment)
        # Esto garantiza que SIEMPRE se sincronice, incluso cuando se asigna una OT
        # a una factura existente o cuando se actualiza cualquier campo relevante.
    
    def get_confidence_level(self):
        """Retorna el nivel de confianza en formato legible"""
        if self.confianza_match >= 0.9:
            return 'Alta'
        elif self.confianza_match >= 0.7:
            return 'Media'
        elif self.confianza_match >= 0.5:
            return 'Baja'
        else:
            return 'Muy Baja'
    
    def get_file_url(self):
        """Retorna la URL del archivo"""
        if self.uploaded_file:
            return f"/media/{self.uploaded_file.path}"
        return None
    
    def _sincronizar_estado_con_ot(self):
        """
        Sincroniza Invoice -> OT considerando TODAS las facturas vinculadas a la OT.
        Solo se ejecuta para costos vinculados (Flete/Cargos Naviera).

        LÓGICA DE CONSOLIDACIÓN (Optimista):
        - Consulta TODAS las facturas vinculadas activas (no eliminadas, no anuladas)
        - Aplica regla OPTIMISTA para el estado:
          Prioridad: provisionada > disputada > revision > pendiente
          → Si AL MENOS UNA está provisionada → OT = provisionada
          → Si ninguna provisionada pero hay disputada → OT = disputada

        FECHAS:
        - fecha_provision: USA LA MÁS ANTIGUA de las facturas provisionadas
        - fecha_facturacion: USA LA MÁS ANTIGUA de todas las facturas

        EJEMPLOS:
        ┌─────────────────┬─────────────────┬──────────────┬─────────────┐
        │ Factura A       │ Factura B       │ Estado OT    │ Fecha OT    │
        ├─────────────────┼─────────────────┼──────────────┼─────────────┤
        │ provisionada    │ provisionada    │ provisionada │ MIN(A, B)   │
        │ provisionada    │ disputada       │ provisionada │ fecha de A  │
        │ disputada       │ pendiente       │ disputada    │ null        │
        │ pendiente       │ pendiente       │ pendiente    │ null        │
        └─────────────────┴─────────────────┴──────────────┴─────────────┘

        IMPORTANTE: OT no tiene estados 'anulada' o 'anulada_parcialmente'.
        Estos estados son exclusivos de Invoice.
        """
        if not self.ot:
            return

        # Obtener TODAS las facturas vinculadas a esta OT (no eliminadas, no anuladas)
        facturas_vinculadas = Invoice.objects.filter(
            ot=self.ot,
            is_deleted=False
        ).exclude(
            estado_provision__in=['anulada', 'anulada_parcialmente', 'rechazada']
        ).filter(
            tipo_costo__in=['FLETE', 'CARGOS_NAVIERA']
        )

        # También incluir facturas con tipos dinámicos vinculados
        from catalogs.models import CostType
        tipos_vinculados = CostType.objects.filter(
            is_linked_to_ot=True,
            is_active=True,
            is_deleted=False
        ).values_list('code', flat=True)

        if tipos_vinculados:
            facturas_vinculadas = facturas_vinculadas | Invoice.objects.filter(
                ot=self.ot,
                is_deleted=False,
                tipo_costo__in=list(tipos_vinculados)
            ).exclude(
                estado_provision__in=['anulada', 'anulada_parcialmente', 'rechazada']
            )

        facturas_vinculadas = facturas_vinculadas.distinct()

        if not facturas_vinculadas.exists():
            # Si no hay facturas vinculadas activas, resetear OT a pendiente
            self.ot.estado_provision = 'pendiente'
            self.ot.fecha_provision = None
            self.ot.fecha_recepcion_factura = None
            self.ot._skip_invoice_sync = True
            self.ot.save(update_fields=['estado_provision', 'fecha_provision', 'fecha_recepcion_factura', 'updated_at'])
            self.ot._skip_invoice_sync = False
            return

        # CONSOLIDAR ESTADOS - Nueva lógica optimista
        # Prioridad: provisionada > disputada > revision > pendiente
        # Si AL MENOS UNA está provisionada → OT = provisionada
        estado_consolidado = 'pendiente'  # Default pesimista
        fecha_provision_consolidada = None
        fecha_facturacion_consolidada = None

        tiene_provisionada = False
        tiene_disputada = False
        tiene_revision = False
        tiene_pendiente = False
        fechas_provision = []
        fechas_facturacion = []

        for factura in facturas_vinculadas:
            # Verificar estados
            if factura.estado_provision == 'provisionada':
                tiene_provisionada = True
            elif factura.estado_provision == 'disputada':
                tiene_disputada = True
            elif factura.estado_provision == 'revision':
                tiene_revision = True
            elif factura.estado_provision == 'pendiente':
                tiene_pendiente = True

            # Recolectar fechas de provisión SOLO de facturas provisionadas
            if factura.fecha_provision and factura.estado_provision == 'provisionada':
                fechas_provision.append(factura.fecha_provision)

            # Recolectar fechas de facturación de TODAS las facturas
            if factura.fecha_facturacion:
                fechas_facturacion.append(factura.fecha_facturacion)

        # Determinar estado consolidado según NUEVA prioridad
        if tiene_provisionada:
            # Si AL MENOS UNA está provisionada → OT = provisionada
            estado_consolidado = 'provisionada'
            # Usar la fecha MÁS ANTIGUA de las provisionadas
            if fechas_provision:
                fecha_provision_consolidada = min(fechas_provision)
        elif tiene_disputada:
            # Si ninguna provisionada pero hay disputada → OT = disputada
            estado_consolidado = 'disputada'
            fecha_provision_consolidada = None
        elif tiene_revision:
            # Si ninguna provisionada/disputada pero hay revision → OT = revision
            estado_consolidado = 'revision'
            fecha_provision_consolidada = None
        else:
            # Todas están pendientes
            estado_consolidado = 'pendiente'
            fecha_provision_consolidada = None

        # Fecha de facturación: usar la MÁS ANTIGUA
        if fechas_facturacion:
            fecha_facturacion_consolidada = min(fechas_facturacion)

        # Actualizar OT solo si hay cambios
        fields_to_update = []

        if self.ot.estado_provision != estado_consolidado:
            self.ot.estado_provision = estado_consolidado
            fields_to_update.append('estado_provision')

        if self.ot.fecha_provision != fecha_provision_consolidada:
            self.ot.fecha_provision = fecha_provision_consolidada
            fields_to_update.append('fecha_provision')

        if self.ot.fecha_recepcion_factura != fecha_facturacion_consolidada:
            self.ot.fecha_recepcion_factura = fecha_facturacion_consolidada
            fields_to_update.append('fecha_recepcion_factura')

        if fields_to_update:
            fields_to_update.append('updated_at')
            self.ot._skip_invoice_sync = True
            self.ot.save(update_fields=list(set(fields_to_update)))
            self.ot._skip_invoice_sync = False
    
    def calcular_dias_hasta_vencimiento(self):
        """Calcula cuántos días faltan para el vencimiento"""
        if not self.fecha_vencimiento:
            return None
        
        from django.utils import timezone
        hoy = timezone.localdate()
        delta = (self.fecha_vencimiento - hoy).days
        return delta
    
    def esta_proxima_a_vencer(self, dias_alerta=7):
        """Verifica si está próxima a vencer en X días"""
        dias = self.calcular_dias_hasta_vencimiento()
        if dias is None:
            return False
        return 0 < dias <= dias_alerta
    
    def esta_vencida(self):
        """Verifica si ya está vencida"""
        dias = self.calcular_dias_hasta_vencimiento()
        if dias is None:
            return False
        return dias < 0
    
    def get_monto_aplicable(self):
        """
        Retorna el monto aplicable (después de ajustes por disputa).
        Si monto_aplicable es null, retorna el monto original.
        """
        return self.monto_aplicable if self.monto_aplicable is not None else self.monto

    def get_monto_anulado(self):
        """
        Calcula el monto anulado (Monto Total - Monto Aplicable).
        Retorna Decimal con el monto que fue anulado por disputas.
        """
        monto_total = self.monto
        monto_aplicable = self.monto_aplicable if self.monto_aplicable is not None else self.monto
        return monto_total - monto_aplicable

    def _es_tipo_vinculado(self, tipo_costo_code):
        """
        Método auxiliar para verificar si un código de tipo está vinculado a OT.
        Usado para comparar estados anteriores durante actualizaciones.

        Args:
            tipo_costo_code: Código del tipo de costo a verificar

        Returns:
            bool: True si el tipo está vinculado a OT
        """
        # Verificación legacy para tipos hardcodeados/prefijos comunes
        if tipo_costo_code in ['FLETE', 'CARGOS_NAVIERA']:
            return True

        # Soportar variantes basadas en prefijos (ej. FLETE_MARITIMO)
        prefijos_vinculados = ('FLETE', 'CARGOS_NAVIERA')
        if any(tipo_costo_code.startswith(prefijo) for prefijo in prefijos_vinculados):
            return True

        # Verificación dinámica: consultar el modelo CostType
        from catalogs.models import CostType
        try:
            cost_type = CostType.objects.filter(
                code=tipo_costo_code,
                is_active=True,
                is_deleted=False
            ).first()

            if cost_type:
                return cost_type.is_linked_to_ot
        except Exception:
            # Si falla la consulta, usar verificación legacy
            pass

        return False

    def es_costo_vinculado_ot(self):
        """
        Determina si este costo está vinculado a la OT (Flete o Cargos de Naviera).
        Estos costos deben sincronizarse con la OT y seguir su flujo.

        NOTA: Verifica tanto tipos hardcodeados (legacy) como tipos dinámicos desde CostType.
        """
        return self._es_tipo_vinculado(self.tipo_costo)
    
    def es_costo_auxiliar(self):
        """
        Determina si este costo es auxiliar (independiente de la OT principal).
        Ejemplos: Almacenaje, Demoras, Transporte, Aduana, etc.
        """
        return not self.es_costo_vinculado_ot()
    
    def debe_sincronizar_con_ot(self):
        """
        Determina si los cambios de estado de esta factura deben propagarse a la OT.
        Esta es la regla GENERAL: una factura anulada ya no debe afectar a la OT.
        La única excepción es el reseteo inicial de la OT, que se llama explícitamente
        desde la lógica de resolución de disputas.
        """
        # Si la factura está anulada, no debe iniciar sincronizaciones.
        if self.estado_provision in ['anulada', 'anulada_parcialmente']:
            return False
        
        return self.es_costo_vinculado_ot() and self.ot is not None
    
    def debe_excluirse_de_estadisticas(self):
        """
        Determina si esta factura debe excluirse de estadísticas de cuentas por pagar.
        Se excluyen: anuladas, rechazadas, y disputadas (hasta que se resuelvan).
        """
        return self.estado_provision in ['anulada', 'rechazada', 'disputada']


class Dispute(TimeStampedModel, SoftDeleteModel):
    """
    Disputa relacionada con una factura.
    Permite gestionar discrepancias, errores o problemas con facturas recibidas.
    """

    TIPO_DISPUTA_CHOICES = [
        ('servicio_no_prestado', 'Servicio No Prestado'),
        ('almacenaje_no_aplica', 'Almacenaje No Aplica'),
        ('dias_libres_incorrectos', 'No Se Están Aplicando Correctamente Los Días Libres'),
        ('cargo_no_aplica', 'Cargo No Aplica'),
        ('demoras_no_aplican', 'Demoras No Aplican'),
        ('otro', 'Otro'),
    ]

    ESTADO_CHOICES = [
        ('abierta', 'Abierta'),
        ('en_revision', 'En Revisión'),
        ('resuelta', 'Resuelta'),
        ('cerrada', 'Cerrada'),
    ]

    RESULTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobada_total', 'Aprobada Total'),
        ('aprobada_parcial', 'Aprobada Parcial'),
        ('rechazada', 'Rechazada por Proveedor'),
        ('anulada', 'Anulada (Error Interno)'),
    ]

    numero_caso = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Número de caso externo (ej: caso con proveedor, naviera, etc.)"
    )

    operativo = models.CharField(
        max_length=255,
        blank=True,
        default='',
        db_index=True,
        help_text="Nombre del operativo responsable de la disputa"
    )

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='disputas',
        help_text="Factura relacionada con la disputa"
    )

    ot = models.ForeignKey(
        OT,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='disputas',
        help_text="OT relacionada (opcional)"
    )

    tipo_disputa = models.CharField(
        max_length=32,
        choices=TIPO_DISPUTA_CHOICES,
        help_text="Tipo de disputa"
    )

    detalle = models.TextField(
        help_text="Descripción detallada de la disputa"
    )

    estado = models.CharField(
        max_length=32,
        choices=ESTADO_CHOICES,
        default='abierta',
        db_index=True,
        help_text="Estado actual de la disputa"
    )

    resultado = models.CharField(
        max_length=32,
        choices=RESULTADO_CHOICES,
        default='pendiente',
        db_index=True,
        help_text="Resultado final de la disputa"
    )

    monto_disputa = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monto en disputa (USD)"
    )

    monto_recuperado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monto recuperado/ajustado (USD)"
    )

    fecha_resolucion = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se resolvió la disputa"
    )

    resolucion = models.TextField(
        blank=True,
        default='',
        help_text="Descripción de cómo se resolvió la disputa"
    )

    notas = models.TextField(
        blank=True,
        default='',
        help_text="Notas adicionales sobre la disputa"
    )

    class Meta:
        db_table = 'invoices_dispute'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['numero_caso']),
            models.Index(fields=['operativo']),
            models.Index(fields=['estado']),
            models.Index(fields=['resultado']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = 'Disputa'
        verbose_name_plural = 'Disputas'

    def __str__(self):
        return f"Disputa {self.numero_caso} - {self.get_tipo_disputa_display()}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_estado = None
        old_resultado = None
        old_monto_recuperado = None

        # Capturar estado anterior si existe
        if not is_new:
            try:
                old_dispute = Dispute.objects.get(pk=self.pk)
                old_estado = old_dispute.estado
                old_resultado = old_dispute.resultado
                old_monto_recuperado = old_dispute.monto_recuperado
            except Dispute.DoesNotExist:
                pass

        # Si se resuelve o cierra, agregar fecha de resolución automática
        if self.estado in ['resuelta', 'cerrada'] and not self.fecha_resolucion:
            from django.utils import timezone
            self.fecha_resolucion = timezone.localdate()

        # Si la OT no está asignada pero la factura tiene OT, asignarla
        if not self.ot and self.invoice and self.invoice.ot:
            self.ot = self.invoice.ot

        # CORRECCIÓN CRÍTICA: Guardar primero para que self.monto_recuperado esté actualizado
        super().save(*args, **kwargs)

        # Actualizar estado de la factura si es nueva disputa
        if is_new and self.invoice:
            # Si la disputa ya está resuelta al momento de creación, actualizar inmediatamente
            if self.estado in ['resuelta', 'cerrada'] and self.resultado != 'pendiente':
                self._actualizar_factura_por_resultado()
            else:
                # Si está activa, marcar factura como disputada
                self.invoice.estado_provision = 'disputada'
                self.invoice.fecha_provision = None  # Limpiar fecha de provisión
                self.invoice.save(update_fields=['estado_provision', 'fecha_provision'])

                # Sincronizar con OT si es costo vinculado
                if self.invoice.debe_sincronizar_con_ot():
                    self.invoice._sincronizar_estado_con_ot()

            # Crear evento inicial (solo si la tabla existe)
            try:
                DisputeEvent.objects.create(
                    dispute=self,
                    tipo='creacion',
                    descripcion=f'Disputa creada: {self.get_tipo_disputa_display()}',
                    usuario=''
                )
            except Exception:
                # Si la tabla no existe aún, ignorar
                pass

        # Manejar cambios de resultado y actualizar factura
        # AHORA self.monto_recuperado ya tiene el valor correcto porque se guardó arriba
        if not is_new:
            # Si cambió el resultado O el monto_recuperado, actualizar la factura
            if (old_resultado != self.resultado and self.resultado != 'pendiente') or \
               (self.resultado == 'aprobada_parcial' and old_monto_recuperado != self.monto_recuperado):
                                self._actualizar_factura_por_resultado()    
    def _actualizar_factura_por_resultado(self):
        """
        Actualiza el estado de la factura según el resultado de la disputa.

        LÓGICA CORRECTA (según especificación):
        - Monto Anulado TOTAL = suma de TODAS las disputas RESUELTAS Y APROBADAS de esta factura
        - Monto Aplicable = Monto Original - Monto Anulado Total
        - Estado "Anulada": SOLO si Monto Anulado Total == Monto Original (100% anulado)
        - Estado "Anulada Parcialmente": Si Monto Anulado Total > 0 pero < Monto Original
        - Solo disputas RESUELTAS afectan el estado (estado='resuelta' o 'cerrada')

        IMPORTANTE: Considera TODAS las disputas RESUELTAS de la factura, no solo la actual.
        """
        if not self.invoice:
            return

        from datetime import date
        from django.db.models import Sum, Q

        # CALCULAR MONTO ANULADO TOTAL DE TODAS LAS DISPUTAS APROBADAS Y RESUELTAS
        # Solo incluir disputas que estén RESUELTAS (estado='resuelta' o 'cerrada')
        # Y que tengan resultado aprobada_total o aprobada_parcial
        disputas_aprobadas = Dispute.objects.filter(
            invoice=self.invoice,
            is_deleted=False,
            estado__in=['resuelta', 'cerrada']  # ✅ CRÍTICO: Solo disputas resueltas
        ).filter(
            Q(resultado='aprobada_total') | Q(resultado='aprobada_parcial')
        )

        total_anulado = Decimal('0.00')
        for disputa in disputas_aprobadas:
            if disputa.resultado == 'aprobada_total':
                # Aprobación total: se anula todo el monto disputado
                total_anulado += disputa.monto_disputa
            elif disputa.resultado == 'aprobada_parcial':
                # Aprobación parcial: se anula solo el monto recuperado
                total_anulado += (disputa.monto_recuperado or Decimal('0.00'))

        # Normalizar a 2 decimales para evitar diferencias mínimas
        total_anulado = total_anulado.quantize(Decimal('0.01'))
        monto_original = self.invoice.monto.quantize(Decimal('0.01'))

        # Calcular nuevo monto aplicable basado en el monto ORIGINAL
        nuevo_monto_aplicable = (monto_original - total_anulado).quantize(Decimal('0.01'))

        # Asegurar que no sea negativo
        if nuevo_monto_aplicable < Decimal('0.00'):
            nuevo_monto_aplicable = Decimal('0.00')

        # Actualizar monto_aplicable
        self.invoice.monto_aplicable = nuevo_monto_aplicable

        # Verificar si hay disputas ACTIVAS (no resueltas) para mantener estado disputada
        tiene_disputas_activas = Dispute.objects.filter(
            invoice=self.invoice,
            is_deleted=False,
            estado__in=['abierta', 'en_revision']
        ).exists()

        # Determinar estado según especificación
        # REGLA: Anulada SOLO si el total anulado es IGUAL al monto original Y no hay disputas activas
        if not tiene_disputas_activas:
            if total_anulado > Decimal('0.00'):
                if total_anulado >= monto_original:
                    # Anulación TOTAL de la factura
                    self.invoice.estado_provision = 'anulada'
                    self.invoice.fecha_provision = None
                else:
                    # Anulación PARCIAL
                    self.invoice.estado_provision = 'anulada_parcialmente'
                    self.invoice.fecha_provision = None
            else:
                # No hay anulaciones y no hay disputas activas
                # Si la disputa actual fue rechazada o anulada, volver a pendiente
                if self.resultado in ['rechazada', 'anulada']:
                    self.invoice.estado_provision = 'pendiente'
                    self.invoice.fecha_provision = None
                    # Restaurar monto aplicable al monto original
                    self.invoice.monto_aplicable = self.invoice.monto
        else:
            # Aún hay disputas activas, mantener estado disputada
            if self.invoice.estado_provision != 'disputada':
                self.invoice.estado_provision = 'disputada'
                self.invoice.fecha_provision = None

        self.invoice.save()

        # Si la factura es de tipo vinculado a OT, sincronizar el cambio
        if self.invoice.debe_sincronizar_con_ot():
            self.invoice._sincronizar_estado_con_ot()


class DisputeEvent(TimeStampedModel):
    """
    Evento/Avance en el timeline de una disputa.
    Registra todos los cambios y actualizaciones importantes.
    """
    
    TIPO_CHOICES = [
        ('creacion', 'Creación'),
        ('actualizacion', 'Actualización'),
        ('comentario', 'Comentario'),
        ('cambio_estado', 'Cambio de Estado'),
        ('resolucion', 'Resolución'),
        ('archivo_adjunto', 'Archivo Adjunto'),
    ]

    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name='eventos',
        help_text="Disputa relacionada"
    )

    tipo = models.CharField(
        max_length=32,
        choices=TIPO_CHOICES,
        help_text="Tipo de evento"
    )

    descripcion = models.TextField(
        help_text="Descripción del evento"
    )

    usuario = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Usuario que generó el evento"
    )

    monto_recuperado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monto recuperado (si aplica)"
    )

    metadata = models.JSONField(
        blank=True,
        null=True,
        help_text="Datos adicionales del evento (JSON)"
    )
    
    class Meta:
        db_table = 'invoices_dispute_event'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['dispute', '-created_at']),
        ]
        verbose_name = 'Evento de Disputa'
        verbose_name_plural = 'Eventos de Disputas'
    
    def __str__(self):
        return f"{self.get_tipo_display()} - Disputa #{self.dispute.id}"


class CreditNote(TimeStampedModel, SoftDeleteModel):
    """
    Nota de Crédito emitida por proveedores.
    Representa un ajuste negativo a una factura o un crédito a favor del cliente.
    """

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente de Aplicar'),
        ('aplicada', 'Aplicada'),
        ('rechazada', 'Rechazada'),
    ]

    numero_nota = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Número único de la nota de crédito (único solo entre notas no eliminadas)"
    )

    invoice_relacionada = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notas_credito',
        help_text="Factura a la que se aplica la nota de crédito (si aplica)"
    )

    proveedor = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        related_name='credit_notes',
        help_text="Proveedor que emitió la nota de crédito"
    )

    proveedor_nombre = models.CharField(
        max_length=255,
        help_text="Nombre del proveedor (denormalizado)"
    )

    fecha_emision = models.DateField(
        db_index=True,
        help_text="Fecha de emisión de la nota de crédito"
    )

    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Monto de la nota de crédito (SIEMPRE NEGATIVO)"
    )

    motivo = models.TextField(
        blank=True,
        default='',
        help_text="Motivo de la emisión de la nota de crédito"
    )

    estado = models.CharField(
        max_length=32,
        choices=ESTADO_CHOICES,
        default='pendiente',
        db_index=True,
        help_text="Estado de la nota de crédito"
    )

    uploaded_file = models.OneToOneField(
        UploadedFile,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='credit_note',
        help_text="Archivo original de la nota de crédito (PDF)"
    )

    fecha_aplicacion = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se aplicó la nota de crédito"
    )

    notas = models.TextField(
        blank=True,
        default='',
        help_text="Notas adicionales sobre la nota de crédito"
    )

    # Referencias detectadas automáticamente
    referencias_detectadas = models.JSONField(
        default=dict,
        blank=True,
        help_text="Referencias detectadas: {numero_factura, monto, etc.}"
    )

    # Procesamiento
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de procesamiento"
    )

    processed_by = models.CharField(
        max_length=255,
        default='system',
        help_text="Usuario o sistema que procesó la nota"
    )

    processing_source = models.CharField(
        max_length=32,
        choices=[
            ('upload_auto', 'Upload Automático'),
            ('upload_manual', 'Upload Manual'),
            ('manual_entry', 'Entrada Manual'),
        ],
        default='upload_manual',
        help_text="Origen del procesamiento"
    )

    class Meta:
        db_table = 'invoices_credit_note'
        ordering = ['-fecha_emision', '-created_at']
        indexes = [
            models.Index(fields=['numero_nota']),
            models.Index(fields=['-fecha_emision']),
            models.Index(fields=['estado']),
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['numero_nota'],
                condition=models.Q(is_deleted=False),
                name='unique_numero_nota_not_deleted'
            )
        ]
        verbose_name = 'Nota de Crédito'
        verbose_name_plural = 'Notas de Crédito'

    def __str__(self):
        return f"NC {self.numero_nota} - {self.proveedor_nombre}"

    def save(self, *args, **kwargs):
        # Forzar que el monto sea negativo
        if self.monto and self.monto > 0:
            self.monto = -abs(self.monto)

        # Sincronizar nombre del proveedor
        if self.proveedor:
            self.proveedor_nombre = self.proveedor.nombre

        # Auto-aplicar fecha si cambia a estado "aplicada"
        if self.estado == 'aplicada' and not self.fecha_aplicacion:
            from django.utils import timezone
        super().save(*args, **kwargs)

        # Actualizar factura relacionada cuando se aplica la nota de crédito
        if self.estado == 'aplicada' and self.invoice_relacionada:
            invoice = self.invoice_relacionada
            
            # Guardar el monto original si no existe
            if invoice.monto_original is None:
                invoice.monto_original = invoice.monto

            # CRÍTICO: Filtrar solo notas de crédito NO eliminadas
            total_credit_notes = invoice.notas_credito.filter(
                estado='aplicada',
                is_deleted=False  # ← FIX: Excluir notas eliminadas
            ).aggregate(total=models.Sum('monto'))['total'] or 0
            
            # Calcular monto aplicable después de notas de crédito
            invoice.monto_aplicable = invoice.monto_original + total_credit_notes

            # Actualizar estado según monto aplicable
            if invoice.monto_aplicable <= 0:
                invoice.estado_provision = 'anulada'
            else:
                invoice.estado_provision = 'anulada_parcialmente'
            
            invoice.save()

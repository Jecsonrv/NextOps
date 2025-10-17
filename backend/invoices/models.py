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
    TIPO_PROVEEDOR_CHOICES = [
        ('naviera', 'Naviera'),
        ('transporte_local', 'Transporte Local'),
        ('aduana', 'Aduana'),
        ('agente_carga', 'Agente de Carga'),
        ('otro', 'Otro'),
    ]
    
    PROVEEDOR_CATEGORIA_CHOICES = [
        ('local', 'Local'),
        ('internacional', 'Internacional'),
    ]
    
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
        unique=True,
        db_index=True,
        help_text="Número único de la factura"
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
    
    tipo_costo = models.CharField(
        max_length=32,
        choices=TIPO_COSTO_CHOICES,
        default='OTRO',
        help_text="Tipo de costo"
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
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
    
    def __str__(self):
        return f"Factura {self.numero_factura} - {self.proveedor_nombre}"
    
    def save(self, *args, **kwargs):
        # Obtener el estado anterior ANTES de cualquier cambio
        old_estado_provision = None
        if self.pk:
            try:
                old_estado_provision = Invoice.objects.get(pk=self.pk).estado_provision
            except Invoice.DoesNotExist:
                pass  # Es una instancia nueva, no hay estado anterior

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
        if self.monto_aplicable < Decimal('0.00'):
            self.monto_aplicable = Decimal('0.00')
        if self.monto_aplicable > self.monto:
            self.monto_aplicable = self.monto

        if self.fecha_facturacion and self.estado_facturacion == 'pendiente':
            self.estado_facturacion = 'facturada'

        # REGLA: Si se agrega fecha_provision, el estado cambia a 'provisionada' SOLO SI el estado actual es 'pendiente' o 'en_revision'.
        if self.fecha_provision and self.estado_provision in ['pendiente', 'en_revision']:
            self.estado_provision = 'provisionada'
        
        # Lógica de herencia de fechas desde la OT (solo si la factura no tiene fecha)
        if self.es_costo_vinculado_ot() and self.ot and self.estado_provision not in ['anulada', 'anulada_parcialmente', 'disputada']:
            if not self.fecha_provision and self.ot.fecha_provision:
                self.fecha_provision = self.ot.fecha_provision
                if self.estado_provision == 'pendiente':
                    self.estado_provision = 'provisionada'
            if not self.fecha_facturacion and self.ot.fecha_recepcion_factura:
                self.fecha_facturacion = self.ot.fecha_recepcion_factura
                if self.estado_facturacion == 'pendiente':
                    self.estado_facturacion = 'facturada'
        
        super().save(*args, **kwargs)
        
        # --- Lógica de Sincronización POST-SAVE ---
        is_transitioning_to_anulada = (
            old_estado_provision not in ['anulada', 'anulada_parcialmente'] and
            self.estado_provision in ['anulada', 'anulada_parcialmente']
        )

        # Determinar si se debe sincronizar
        should_sync = False
        # Sincronizar si es una actualización normal de una factura no anulada
        if self.estado_provision not in ['anulada', 'anulada_parcialmente']:
            should_sync = True
        # O sincronizar si es el momento exacto de la transición a un estado anulado (para resetear la OT)
        elif is_transitioning_to_anulada:
            should_sync = True

        if should_sync and self.es_costo_vinculado_ot() and self.ot:
            self._sincronizar_estado_con_ot()
    
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
        Sincroniza COMPLETO Invoice <-> OT (bidireccional).
        Solo se ejecuta para costos vinculados (Flete/Cargos Naviera).

        SINCRONIZA:
        - estado_provision <-> estado_provision (solo estados válidos en OT)
        - fecha_provision <-> fecha_provision
        - fecha_facturacion <-> fecha_recepcion_factura

        IMPORTANTE: OT no tiene estados 'anulada' o 'anulada_parcialmente'.
        Estos estados son exclusivos de Invoice. Cuando una factura se anula,
        la OT debe ir a 'revision' para revisión manual.
        """
        if not self.ot:
            return

        fields_to_update = []

        # 1. SINCRONIZAR ESTADO Y FECHA DE PROVISIÓN
        if self.estado_provision in ['disputada', 'revision']:
            # Si la factura está en disputa o revisión, la OT también
            if self.ot.estado_provision != self.estado_provision:
                self.ot.estado_provision = self.estado_provision
                fields_to_update.append('estado_provision')

            # Limpiar fecha_provision de la OT
            if self.ot.fecha_provision:
                self.ot.fecha_provision = None
                fields_to_update.append('fecha_provision')

        elif self.estado_provision in ['anulada', 'anulada_parcialmente']:
            # NUEVO COMPORTAMIENTO: La OT vuelve a 'pendiente' para esperar la nueva factura del proveedor
            # La factura anulada queda registrada para histórico, pero la OT debe estar lista para
            # recibir la nueva factura que emita el proveedor
            if self.ot.estado_provision != 'pendiente':
                self.ot.estado_provision = 'pendiente'
                fields_to_update.append('estado_provision')

            # Limpiar fecha_provision de la OT
            if self.ot.fecha_provision:
                self.ot.fecha_provision = None
                fields_to_update.append('fecha_provision')
        
        elif self.estado_provision == 'provisionada':
            # Si la factura se provisiona, actualizar fecha en OT
            if self.fecha_provision and self.ot.fecha_provision != self.fecha_provision:
                self.ot.fecha_provision = self.fecha_provision
                self.ot.estado_provision = 'provisionada'
                fields_to_update.extend(['fecha_provision', 'estado_provision'])
        
        elif self.estado_provision == 'pendiente':
            # Si vuelve a pendiente, sincronizar también
            if self.ot.estado_provision != 'pendiente':
                self.ot.estado_provision = 'pendiente'
                fields_to_update.append('estado_provision')
            if self.ot.fecha_provision:
                self.ot.fecha_provision = None
                fields_to_update.append('fecha_provision')
        
        # 2. SINCRONIZAR FECHA DE FACTURACIÓN (Invoice.fecha_facturacion <-> OT.fecha_recepcion_factura)
        # Solo sincronizar si hay cambio real
        if self.fecha_facturacion != self.ot.fecha_recepcion_factura:
            self.ot.fecha_recepcion_factura = self.fecha_facturacion
            fields_to_update.append('fecha_recepcion_factura')
        
        # Guardar OT solo si hay cambios
        if fields_to_update:
            fields_to_update.append('updated_at')
            # Remover duplicados
            fields_to_update = list(set(fields_to_update))
            # Marcar que estamos sincronizando desde Invoice para evitar bucle
            self.ot._skip_invoice_sync = True
            self.ot.save(update_fields=fields_to_update)
            self.ot._skip_invoice_sync = False
    
    def calcular_dias_hasta_vencimiento(self):
        """Calcula cuántos días faltan para el vencimiento"""
        if not self.fecha_vencimiento:
            return None
        
        from datetime import date
        hoy = date.today()
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

    def es_costo_vinculado_ot(self):
        """
        Determina si este costo está vinculado a la OT (Flete o Cargos de Naviera).
        Estos costos deben sincronizarse con la OT y seguir su flujo.
        """
        return self.tipo_costo in ['FLETE', 'CARGOS_NAVIERA']
    
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
        ('flete', 'Flete'),
        ('cargos_naviera', 'Cargos de Naviera'),
        ('cantidad', 'Cantidad Incorrecta'),
        ('servicio', 'Servicio No Prestado'),
        ('duplicada', 'Factura Duplicada'),
        ('precio', 'Diferencias de Valor'), # Renamed from 'Precio Incorrecto'
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
            from datetime import date
            self.fecha_resolucion = date.today()

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

                # Crear evento de cambio de resultado
                try:
                    DisputeEvent.objects.create(
                        dispute=self,
                        tipo='cambio_estado',
                        descripcion=f'Resultado actualizado: {self.get_resultado_display()}',
                        usuario='',
                        monto_recuperado=self.monto_recuperado if self.monto_recuperado and self.monto_recuperado > 0 else None
                    )
                except Exception:
                    pass
    
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
        unique=True,
        db_index=True,
        help_text="Número único de la nota de crédito"
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
            from datetime import date
        super().save(*args, **kwargs)

        if self.estado == 'aplicada' and self.invoice_relacionada:
            invoice = self.invoice_relacionada
            if invoice.monto_original is None:
                invoice.monto_original = invoice.monto

            total_credit_notes = invoice.notas_credito.filter(
                estado='aplicada'
            ).aggregate(total=models.Sum('monto'))['total'] or 0
            
            invoice.monto_aplicable = invoice.monto_original + total_credit_notes

            if invoice.monto_aplicable <= 0:
                invoice.estado_provision = 'anulada'
            else:
                invoice.estado_provision = 'anulada_parcialmente'
            
            invoice.save()

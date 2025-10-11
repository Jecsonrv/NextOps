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
        ('provisionada', 'Provisionada'),
        ('revision', 'En Revisión'),
        ('disputada', 'Disputada'),
        ('rechazada', 'Rechazada (Legacy)'),
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
    
    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto de la factura en USD"
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
        # Sincronizar ot_number con el objeto OT
        if self.ot:
            self.ot_number = self.ot.numero_ot
        
        # Calcular vencimiento automático si es crédito
        if self.tipo_pago == 'credito':
            if self.proveedor and self.proveedor.tiene_credito:
                # Aplicar días de crédito del proveedor
                self.dias_credito_aplicado = self.proveedor.dias_credito
            
            # Calcular fecha de vencimiento
            if self.dias_credito_aplicado > 0 and self.fecha_emision:
                from datetime import timedelta
                self.fecha_vencimiento = self.fecha_emision + timedelta(days=self.dias_credito_aplicado)
        else:
            # Si es contado, limpiar campos de crédito
            self.dias_credito_aplicado = 0
            self.fecha_vencimiento = None
            self.alerta_vencimiento = False
        
        # Auto-actualizar estado_facturacion
        if self.fecha_facturacion and self.estado_facturacion == 'pendiente':
            self.estado_facturacion = 'facturada'
        
        # Auto-actualizar estado_provision
        if self.fecha_provision and self.estado_provision == 'pendiente':
            self.estado_provision = 'provisionada'
        
        super().save(*args, **kwargs)
    
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

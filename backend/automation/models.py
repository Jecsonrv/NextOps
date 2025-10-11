"""
Models para el módulo de automatización de emails.
Registra el procesamiento de emails con DTEs/facturas.
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField
from common.models import TimeStampedModel
from invoices.models import Invoice


class EmailProcessingLog(TimeStampedModel):
    """
    Registro de procesamiento de emails con DTEs.
    Almacena el historial de emails procesados para evitar duplicados.
    """
    
    STATUS_CHOICES = [
        ('success', 'Exitoso'),
        ('failed', 'Fallido'),
        ('partial', 'Parcial'),
        ('skipped', 'Omitido'),
    ]
    
    # Información del Email
    message_id = models.CharField(
        max_length=500,
        unique=True,
        db_index=True,
        help_text="Message-ID único del email (usado para deduplicación)"
    )
    
    subject = models.CharField(
        max_length=1000,
        help_text="Asunto del email"
    )
    
    sender_email = models.EmailField(
        help_text="Email del remitente"
    )
    
    received_date = models.DateTimeField(
        help_text="Fecha y hora en que se recibió el email"
    )
    
    # Archivos Adjuntos
    attachment_count = models.IntegerField(
        default=0,
        help_text="Cantidad de archivos adjuntos en el email"
    )
    
    attachment_filenames = ArrayField(
        models.CharField(max_length=500),
        default=list,
        blank=True,
        help_text="Lista de nombres de archivos adjuntos"
    )
    
    # Procesamiento
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='success',
        help_text="Estado del procesamiento"
    )
    
    invoices_created = models.ManyToManyField(
        Invoice,
        blank=True,
        related_name='email_logs',
        help_text="Facturas creadas a partir de este email"
    )
    
    invoices_count = models.IntegerField(
        default=0,
        help_text="Cantidad de facturas creadas exitosamente"
    )
    
    error_message = models.TextField(
        blank=True,
        help_text="Mensaje de error si el procesamiento falló"
    )
    
    processing_time_seconds = models.FloatField(
        null=True,
        blank=True,
        help_text="Tiempo de procesamiento en segundos"
    )
    
    # Metadata
    folder_path = models.CharField(
        max_length=500,
        default='Inbox',
        help_text="Ruta de la carpeta donde se encontró el email (ej: Inbox, Inbox/DTEs)"
    )
    
    auto_matched_ots = models.IntegerField(
        default=0,
        help_text="Cantidad de facturas que se asignaron automáticamente a OTs"
    )
    
    class Meta:
        db_table = 'automation_email_processing_log'
        ordering = ['-received_date']
        indexes = [
            models.Index(fields=['message_id']),
            models.Index(fields=['-received_date']),
            models.Index(fields=['status']),
            models.Index(fields=['sender_email']),
        ]
    
    def __str__(self):
        return f"{self.subject} - {self.sender_email} ({self.status})"


class EmailAutoProcessingConfig(TimeStampedModel):
    """
    Configuración para el procesamiento automático de emails.
    Permite activar/desactivar el procesamiento automático.
    """
    
    is_active = models.BooleanField(
        default=True,
        help_text="Si está activo el procesamiento automático de emails"
    )
    
    check_interval_minutes = models.IntegerField(
        default=15,
        help_text="Intervalo en minutos para revisar nuevos emails"
    )
    
    target_folders = ArrayField(
        models.CharField(max_length=200),
        default=list,
        blank=True,
        help_text="Lista de carpetas a monitorear (ej: ['Inbox', 'Inbox/DTEs'])"
    )
    
    subject_filters = ArrayField(
        models.CharField(max_length=200),
        default=list,
        blank=True,
        help_text="Filtros de asunto para buscar (ej: ['DTE', 'Factura', 'Invoice'])"
    )
    
    sender_whitelist = ArrayField(
        models.EmailField(),
        default=list,
        blank=True,
        help_text="Lista de emails permitidos (vacío = todos permitidos)"
    )
    
    auto_parse_enabled = models.BooleanField(
        default=True,
        help_text="Si se debe usar auto_parse al crear facturas"
    )
    
    max_emails_per_run = models.IntegerField(
        default=50,
        help_text="Máximo de emails a procesar en cada ejecución"
    )
    
    last_run_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de la última ejecución"
    )
    
    last_run_status = models.CharField(
        max_length=500,
        blank=True,
        help_text="Estado de la última ejecución"
    )
    
    class Meta:
        db_table = 'automation_email_config'
        verbose_name = "Configuración de Email Automation"
        verbose_name_plural = "Configuraciones de Email Automation"
    
    def __str__(self):
        status = "Activo" if self.is_active else "Inactivo"
        return f"Email Auto-Processing Config ({status})"

from django.db import models, transaction
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from common.models import TimeStampedModel, SoftDeleteModel
from common.storage_backends import CloudinaryMediaStorage
import logging

logger = logging.getLogger(__name__)

# Importar modelos de líneas de factura al final del archivo
# para evitar imports circulares


class SalesInvoice(TimeStampedModel, SoftDeleteModel):
    """
    Factura de venta emitida a clientes.
    IMPORTANTE: Las facturas se CARGAN desde sistema externo, no se generan aquí.
    """

    # Choices
    ESTADO_FACTURACION_CHOICES = [
        ('facturada', 'Facturada'),
        ('pendiente_cobro', 'Pendiente de Cobro'),
        ('pagada', 'Pagada'),
        ('anulada_parcial', 'Anulada Parcialmente'),
        ('anulada', 'Anulada'),
    ]

    ESTADO_PAGO_CHOICES = [
        ('pendiente', 'Pendiente de Pago'),
        ('pagado_parcial', 'Pagado Parcialmente'),
        ('pagado_total', 'Pagado Totalmente'),
    ]

    # Campos principales
    numero_factura = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Número de factura de venta del sistema externo"
    )

    # Relaciones
    ot = models.ForeignKey(
        'ots.OT',
        on_delete=models.PROTECT,
        related_name='sales_invoices',
        null=True,
        blank=True,
        help_text="Orden de trabajo asociada"
    )

    cliente = models.ForeignKey(
        'client_aliases.ClientAlias',
        on_delete=models.PROTECT,
        related_name='sales_invoices',
        help_text="Cliente al que se factura"
    )

    # Relación con facturas de costo (Many-to-Many)
    cost_invoices = models.ManyToManyField(
        'invoices.Invoice',
        related_name='sales_invoices_linked',
        blank=True,
        help_text="Facturas de costo asociadas a esta factura de venta"
    )

    # Fechas
    fecha_emision = models.DateField(
        help_text="Fecha de emisión de la factura"
    )

    fecha_vencimiento = models.DateField(
        help_text="Fecha de vencimiento del pago"
    )

    # Montos
    monto_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto total de la factura de venta"
    )

    monto_pagado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monto total pagado (suma de pagos validados)"
    )

    monto_pendiente = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monto pendiente de pago (calculado automáticamente)"
    )

    # Campos adicionales del sistema externo (legacy - para facturas antiguas)
    @property
    def subtotal(self):
        return self.subtotal_gravado + self.subtotal_exento

    @property
    def iva(self):
        return self.iva_total

    # === NUEVOS CAMPOS PARA SISTEMA DE LÍNEAS CON IVA MIXTO ===
    subtotal_gravado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Suma de subtotales de líneas CON IVA"
    )

    subtotal_exento = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Suma de subtotales de líneas SIN IVA (exentas)"
    )

    iva_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Suma total de IVA de todas las líneas"
    )

    descuento = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Descuento aplicado"
    )

    # === RETENCIONES - EL SALVADOR ===

    # Retención IVA (1% sobre subtotal gravado)
    aplica_retencion_iva = models.BooleanField(
        default=False,
        db_index=True,
        help_text="¿Se aplica retención de IVA 1%? (Gran Contribuyente)"
    )

    monto_retencion_iva = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto retenido de IVA (1% del subtotal gravado)"
    )

    # Retención Renta (5%, 10% según tipo de servicio)
    aplica_retencion_renta = models.BooleanField(
        default=False,
        help_text="¿Se aplica retención de renta?"
    )

    porcentaje_retencion_renta = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Porcentaje de retención de renta aplicado"
    )

    monto_retencion_renta = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto retenido de renta"
    )

    # Totales con retenciones
    total_retenciones = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total de retenciones (IVA + Renta)"
    )

    monto_neto_cobrar = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto total - retenciones = A COBRAR"
    )

    # Tipo de documento fiscal - El Salvador
    TIPO_DOCUMENTO_CHOICES = [
        ('ccf', 'Comprobante de Crédito Fiscal (CCF)'),
        ('factura', 'Factura de Consumidor Final'),
        ('factura_exportacion', 'Factura de Exportación'),
        ('nota_debito', 'Nota de Débito'),
        ('nota_credito', 'Nota de Crédito'),
    ]

    tipo_documento = models.CharField(
        max_length=30,
        choices=TIPO_DOCUMENTO_CHOICES,
        default='ccf',
        db_index=True,
        help_text="Tipo de documento fiscal (El Salvador)"
    )

    # Tipo de operación (nacional o internacional)
    TIPO_OPERACION_CHOICES = [
        ('nacional', 'Operación Nacional'),
        ('internacional', 'Operación Internacional'),
    ]

    tipo_operacion = models.CharField(
        max_length=20,
        choices=TIPO_OPERACION_CHOICES,
        default='nacional',
        db_index=True,
        help_text="Tipo de operación: nacional (con IVA) o internacional (sin IVA)"
    )

    # Archivos
    archivo_pdf = models.FileField(
        upload_to='sales_invoices/',
        storage=CloudinaryMediaStorage(),
        null=True,
        blank=True,
        help_text="PDF de la factura de venta del sistema externo"
    )

    # Estados
    estado_facturacion = models.CharField(
        max_length=20,
        choices=ESTADO_FACTURACION_CHOICES,
        default='facturada',
        db_index=True,
        help_text="Estado de facturación"
    )

    estado_pago = models.CharField(
        max_length=20,
        choices=ESTADO_PAGO_CHOICES,
        default='pendiente',
        db_index=True,
        help_text="Estado de pago"
    )

    # Campos de rastreo
    autorizacion_sri = models.CharField(
        max_length=100,
        blank=True,
        help_text="Número de autorización SRI (si es electrónica)"
    )

    clave_acceso = models.CharField(
        max_length=100,
        blank=True,
        help_text="Clave de acceso de factura electrónica"
    )

    # Notas
    notas = models.TextField(
        blank=True,
        help_text="Observaciones o notas adicionales"
    )

    descripcion = models.TextField(
        blank=True,
        help_text="Descripción de los servicios facturados"
    )

    # Auditoría
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_sales_invoices',
        help_text="Usuario que cargó la factura"
    )

    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_sales_invoices',
        help_text="Último usuario que actualizó"
    )

    class Meta:
        db_table = 'sales_invoices'
        verbose_name = 'Factura de Venta'
        verbose_name_plural = 'Facturas de Venta'
        ordering = ['-fecha_emision', '-numero_factura']
        constraints = [
            # Constraint único parcial: numero_factura único solo si no está eliminado
            models.UniqueConstraint(
                fields=['numero_factura'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_numero_factura_active'
            )
        ]
        indexes = [
            models.Index(fields=['numero_factura']),
            models.Index(fields=['estado_facturacion']),
            models.Index(fields=['estado_pago']),
            models.Index(fields=['fecha_vencimiento']),
            models.Index(fields=['cliente', 'fecha_emision']),
            models.Index(fields=['autorizacion_sri']),
            models.Index(fields=['clave_acceso']),
            # Índices compuestos para queries frecuentes
            models.Index(fields=['estado_pago', '-fecha_vencimiento']),
            models.Index(fields=['cliente', 'estado_facturacion']),
            models.Index(fields=['ot', '-fecha_emision']),
        ]

    def __str__(self):
        return f"{self.numero_factura} - {self.cliente.short_name} - ${self.monto_total}"

    def save(self, *args, **kwargs):
        # If the invoice has no line items, allow direct modification of subtotals
        # and recalculate totals.
        # Solo verificar lineas si el objeto ya existe en BD (tiene pk)
        tiene_lineas = False
        if self.pk:
            tiene_lineas = self.lineas.exists()
        
        if not tiene_lineas:
            # Si no hay IVA total, calcularlo automáticamente
            if self.iva_total is None or self.iva_total == Decimal('0.00'):
                self.iva_total = (self.subtotal_gravado * Decimal('0.13')).quantize(Decimal('0.01'))
            # Si no hay monto total, calcularlo
            if self.monto_total is None or self.monto_total == Decimal('0.00'):
                self.monto_total = self.subtotal_gravado + self.subtotal_exento + self.iva_total

        if self.monto_total is None:
            self.monto_total = Decimal('0.00')

        # Calcular total de notas de crédito aplicadas (solo si ya existe en BD)
        total_notas_credito = Decimal('0.00')
        if self.pk:
            total_notas_credito = self.credit_notes.aggregate(
                total=models.Sum('monto')
            )['total'] or Decimal('0.00')

        # Calcular monto pendiente: monto_total - notas_crédito - monto_pagado
        monto_neto = self.monto_total - total_notas_credito
        self.monto_pendiente = max(monto_neto - self.monto_pagado, Decimal('0.00'))

        # Actualizar estado de pago automáticamente
        if self.monto_pagado == 0 and total_notas_credito == 0:
            self.estado_pago = 'pendiente'
        elif self.monto_pagado >= monto_neto or monto_neto <= 0:
            self.estado_pago = 'pagado_total'
            # Si está en pendiente_cobro, mover a pagada cuando se pague completamente
            if self.estado_facturacion == 'pendiente_cobro':
                self.estado_facturacion = 'pagada'
        else:
            self.estado_pago = 'pagado_parcial'

        super().save(*args, **kwargs)
        
        # Calcular retenciones después de guardar (necesita self.pk)
        if self.pk and self.cliente:
            self.calcular_retenciones()

        # Actualizar métricas de la OT si existe (con manejo de errores)
        if self.ot:
            try:
                if hasattr(self.ot, 'calcular_metricas_venta'):
                    self.ot.calcular_metricas_venta()
            except Exception as e:
                logger.error(f"Error calculando métricas de OT {self.ot.id}: {e}")

    @property
    def esta_vencida(self):
        """Verifica si la factura está vencida"""
        from django.utils import timezone
        return (
            self.fecha_vencimiento < timezone.now().date()
            and self.estado_pago != 'pagado_total'
        )

    @property
    def dias_vencimiento(self):
        """Días transcurridos desde el vencimiento (negativo si no ha vencido)"""
        from django.utils import timezone
        delta = timezone.now().date() - self.fecha_vencimiento
        return delta.days

    @property
    def porcentaje_pagado(self):
        """Porcentaje del monto total que ha sido pagado"""
        if self.monto_total == 0:
            return Decimal('0.00')
        return (self.monto_pagado / self.monto_total * 100).quantize(Decimal('0.01'))

    @property
    def margen_bruto(self):
        """Calcula el margen bruto (venta - costos asociados)"""
        if not self.pk:
            return Decimal('0.00')
        total_costos = self.cost_mappings.aggregate(
            total=models.Sum('monto_asignado')
        )['total'] or Decimal('0.00')
        return self.monto_total - total_costos

    @property
    def porcentaje_margen(self):
        """Porcentaje de margen sobre el total de venta"""
        if self.monto_total == 0:
            return Decimal('0.00')
        return (self.margen_bruto / self.monto_total * 100).quantize(Decimal('0.01'))

    @transaction.atomic
    def recalcular_totales_desde_lineas(self):
        """
        Recalcula todos los totales de la factura desde las líneas.
        Este método es llamado automáticamente por los signals de SalesInvoiceItem.

        Calcula:
        - subtotal_gravado: suma de subtotales de líneas con IVA
        - subtotal_exento: suma de subtotales de líneas sin IVA
        - iva_total: suma de IVA de todas las líneas
        - monto_total: total general de la factura

        Retorna:
            dict: Diccionario con los totales calculados
        """
        from decimal import Decimal

        # Validar que la instancia tenga pk antes de acceder a relaciones
        if not self.pk:
            logger.warning("No se puede recalcular totales de una factura sin ID")
            return None

        # Obtener todas las líneas activas (no soft-deleted)
        lineas_activas = self.lineas.filter(deleted_at__isnull=True)

        # Inicializar totales
        subtotal_gravado = Decimal('0.00')
        subtotal_exento = Decimal('0.00')
        iva_total = Decimal('0.00')
        descuento_total = Decimal('0.00')

        # Iterar sobre las líneas y sumar
        for linea in lineas_activas:
            descuento_total += linea.descuento_monto

            if linea.aplica_iva:
                # Línea CON IVA
                subtotal_gravado += linea.subtotal - linea.descuento_monto
                iva_total += linea.iva
            else:
                # Línea SIN IVA (exenta)
                subtotal_exento += linea.subtotal - linea.descuento_monto

        # Calcular monto total
        monto_total = subtotal_gravado + subtotal_exento + iva_total

        # Actualizar campos
        self.subtotal_gravado = subtotal_gravado.quantize(Decimal('0.01'))
        self.subtotal_exento = subtotal_exento.quantize(Decimal('0.01'))
        self.iva_total = iva_total.quantize(Decimal('0.01'))
        self.descuento = descuento_total.quantize(Decimal('0.01'))
        self.monto_total = monto_total.quantize(Decimal('0.01'))

        # Actualizar campos legacy para compatibilidad
        self.subtotal = (subtotal_gravado + subtotal_exento).quantize(Decimal('0.01'))
        self.iva = iva_total

        # Guardar sin triggers para evitar loops infinitos
        # Usamos update para evitar llamar a save() de nuevo
        SalesInvoice.objects.filter(pk=self.pk).update(
            subtotal_gravado=self.subtotal_gravado,
            subtotal_exento=self.subtotal_exento,
            iva_total=self.iva_total,
            descuento=self.descuento,
            monto_total=self.monto_total,
            subtotal=self.subtotal,
            iva=self.iva,
            monto_pendiente=self.monto_total - self.monto_pagado,
        )

        logger.info(
            f"Totales recalculados para {self.numero_factura}: "
            f"Gravado=${subtotal_gravado}, Exento=${subtotal_exento}, "
            f"IVA=${iva_total}, Total=${monto_total}"
        )

        # Calcular retenciones automáticamente
        self.calcular_retenciones()

        return {
            'subtotal_gravado': float(subtotal_gravado),
            'subtotal_exento': float(subtotal_exento),
            'iva_total': float(iva_total),
            'descuento_total': float(descuento_total),
            'monto_total': float(monto_total),
            'num_lineas': lineas_activas.count(),
            'num_lineas_gravadas': lineas_activas.filter(aplica_iva=True).count(),
            'num_lineas_exentas': lineas_activas.filter(aplica_iva=False).count(),
            'retenciones': {
                'iva': float(self.monto_retencion_iva),
                'renta': float(self.monto_retencion_renta),
                'total': float(self.total_retenciones),
            },
            'neto_a_cobrar': float(self.monto_neto_cobrar),
        }

    @transaction.atomic
    def calcular_retenciones(self):
        """
        Calcula retenciones basado en el tipo de contribuyente del cliente.
        Debe llamarse DESPUÉS de recalcular_totales_desde_lineas().

        RETENCIONES EN EL SALVADOR:
        - Retención IVA: 1% sobre subtotal GRAVADO (solo gran contribuyente)
        - Retención Renta: 5% o 10% sobre TOTAL de factura (según tipo de servicio)

        Returns:
            dict: Diccionario con retenciones calculadas
        """
        from decimal import Decimal

        # 1. Verificar si el cliente aplica retenciones
        if not self.cliente:
            # Sin cliente, resetear retenciones
            self.monto_retencion_iva = Decimal('0.00')
            self.monto_retencion_renta = Decimal('0.00')
            self.total_retenciones = Decimal('0.00')
            self.monto_neto_cobrar = self.monto_total
            return

        # Resetear retenciones por defecto
        self.monto_retencion_iva = Decimal('0.00')
        self.monto_retencion_renta = Decimal('0.00')
        self.total_retenciones = Decimal('0.00')

        # 2. RETENCIÓN DE IVA (1%)
        # Solo si el usuario marcó manualmente que aplica retención en el formulario
        # Y además el tipo de operación es nacional
        if self.aplica_retencion_iva and self.tipo_operacion == 'nacional':
            # 1% sobre el subtotal GRAVADO (sin IVA)
            self.monto_retencion_iva = (
                self.subtotal_gravado * Decimal('0.01')
            ).quantize(Decimal('0.01'))

        # 3. RETENCIÓN DE RENTA
        # Solo si el usuario marcó manualmente que aplica retención
        if self.aplica_retencion_renta and self.porcentaje_retencion_renta > 0:
            # Retención sobre el TOTAL de la factura
            self.monto_retencion_renta = (
                self.monto_total * self.porcentaje_retencion_renta / 100
            ).quantize(Decimal('0.01'))
        else:
            self.porcentaje_retencion_renta = Decimal('0.00')

        # 4. CALCULAR TOTALES
        self.total_retenciones = self.monto_retencion_iva + self.monto_retencion_renta
        self.monto_neto_cobrar = self.monto_total - self.total_retenciones

        # 5. GUARDAR (usar update para evitar loops)
        SalesInvoice.objects.filter(pk=self.pk).update(
            aplica_retencion_iva=self.aplica_retencion_iva,
            monto_retencion_iva=self.monto_retencion_iva,
            aplica_retencion_renta=self.aplica_retencion_renta,
            porcentaje_retencion_renta=self.porcentaje_retencion_renta,
            monto_retencion_renta=self.monto_retencion_renta,
            total_retenciones=self.total_retenciones,
            monto_neto_cobrar=self.monto_neto_cobrar,
        )

        logger.info(
            f"Retenciones calculadas para {self.numero_factura}: "
            f"IVA=${self.monto_retencion_iva}, Renta=${self.monto_retencion_renta}, "
            f"Neto a cobrar=${self.monto_neto_cobrar}"
        )

        return {
            'retencion_iva': float(self.monto_retencion_iva),
            'retencion_renta': float(self.monto_retencion_renta),
            'total_retenciones': float(self.total_retenciones),
            'neto_a_cobrar': float(self.monto_neto_cobrar),
        }


class InvoiceSalesMapping(TimeStampedModel):
    """
    Asociación entre facturas de costo (Invoice) y facturas de venta (SalesInvoice).
    Permite asignar parcialmente costos a ventas y calcular márgenes.
    """

    # Relaciones
    sales_invoice = models.ForeignKey(
        'SalesInvoice',
        on_delete=models.CASCADE,
        related_name='cost_mappings',
        help_text="Factura de venta"
    )

    cost_invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.PROTECT,
        related_name='sales_mappings',
        help_text="Factura de costo asociada"
    )

    # Montos
    monto_asignado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto del costo asignado a esta venta (puede ser parcial)"
    )

    porcentaje_markup = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Porcentaje de markup aplicado sobre este costo"
    )

    # Notas
    notas = models.TextField(
        blank=True,
        help_text="Notas sobre esta asociación"
    )

    class Meta:
        db_table = 'invoice_sales_mappings'
        verbose_name = 'Asociación Costo-Venta'
        verbose_name_plural = 'Asociaciones Costo-Venta'
        ordering = ['-created_at']
        unique_together = [['sales_invoice', 'cost_invoice']]
        indexes = [
            models.Index(fields=['sales_invoice']),
            models.Index(fields=['cost_invoice']),
        ]

    def __str__(self):
        return f"{self.sales_invoice.numero_factura} ← {self.cost_invoice.numero_factura} (${self.monto_asignado})"

    def clean(self):
        """Validaciones personalizadas - solo validaciones críticas"""
        if self.monto_asignado and self.cost_invoice:
            # VALIDACIÓN DESHABILITADA: Permitir que costos excedan ventas (escenario de pérdida)
            # En el mundo real, las empresas pueden tener pérdidas en ciertas operaciones
            pass
            
            # # Validar que la suma de asignaciones no exceda el monto aplicable
            # total_asignado = InvoiceSalesMapping.objects.filter(
            #     cost_invoice=self.cost_invoice
            # ).exclude(
            #     pk=self.pk if self.pk else None
            # ).aggregate(
            #     total=models.Sum('monto_asignado')
            # )['total'] or Decimal('0.00')

            # monto_aplicable = self.cost_invoice.get_monto_aplicable()
            # if (total_asignado + self.monto_asignado) > monto_aplicable:
            #     raise ValidationError({
            #         'monto_asignado': f"La suma de asignaciones (${total_asignado + self.monto_asignado}) "
            #                          f"excedería el monto aplicable (${monto_aplicable})"
            #     })

    def _calcular_markup(self):
        """Método auxiliar para calcular markup"""
        if self.sales_invoice and self.sales_invoice.monto_total > 0:
            total_costos = self.sales_invoice.cost_mappings.aggregate(
                total=models.Sum('monto_asignado')
            )['total'] or Decimal('0.00')

            # Incluir el monto actual si es una edición
            if self.pk:
                try:
                    old_mapping = InvoiceSalesMapping.objects.get(pk=self.pk)
                    total_costos = total_costos - old_mapping.monto_asignado + self.monto_asignado
                except InvoiceSalesMapping.DoesNotExist:
                    total_costos += self.monto_asignado
            else:
                total_costos += self.monto_asignado

            if total_costos > 0:
                margen = self.sales_invoice.monto_total - total_costos
                self.porcentaje_markup = (margen / total_costos * 100).quantize(Decimal('0.01'))

    @transaction.atomic
    def save(self, *args, **kwargs):
        try:
            self.full_clean()
            super().save(*args, **kwargs)

            # Actualizar métricas de la factura de venta
            if self.sales_invoice:
                self.sales_invoice.save()
        except Exception as e:
            logger.error(f"Error in InvoiceSalesMapping save: {e}")
            raise

    @transaction.atomic
    def delete(self, *args, **kwargs):
        """Al eliminar, actualizar métricas de la factura de venta"""
        sales_invoice = self.sales_invoice
        super().delete(*args, **kwargs)
        if sales_invoice:
            sales_invoice.save()


class Payment(TimeStampedModel, SoftDeleteModel):
    """
    Registro de pagos recibidos para facturas de venta.
    Incluye validación por parte de finanzas.
    """

    # Choices
    METODO_PAGO_CHOICES = [
        ('transferencia', 'Transferencia Bancaria'),
        ('cheque', 'Cheque'),
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta de Crédito/Débito'),
        ('compensacion', 'Compensación'),
        ('nota_credito', 'Nota de Crédito'),
        ('otro', 'Otro'),
    ]

    ESTADO_CHOICES = [
        ('pendiente_validacion', 'Pendiente de Validación'),
        ('validado', 'Validado'),
        ('rechazado', 'Rechazado'),
    ]

    # Relaciones
    sales_invoice = models.ForeignKey(
        'SalesInvoice',
        on_delete=models.CASCADE,
        related_name='payments',
        help_text="Factura de venta asociada"
    )

    # Información del pago
    fecha_pago = models.DateField(
        help_text="Fecha en que se realizó el pago"
    )

    monto = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto del pago"
    )

    metodo_pago = models.CharField(
        max_length=20,
        choices=METODO_PAGO_CHOICES,
        help_text="Método de pago utilizado"
    )

    referencia = models.CharField(
        max_length=100,
        help_text="Número de referencia o transacción"
    )

    banco = models.CharField(
        max_length=100,
        blank=True,
        help_text="Banco de origen (si aplica)"
    )

    # Archivo
    archivo_comprobante = models.FileField(
        upload_to='payment_receipts/',
        storage=CloudinaryMediaStorage(),
        null=True,
        blank=True,
        help_text="Comprobante de pago (PDF, imagen)"
    )

    # Estado
    estado = models.CharField(
        max_length=25,
        choices=ESTADO_CHOICES,
        default='pendiente_validacion',
        db_index=True,
        help_text="Estado de validación del pago"
    )

    # Auditoría
    registrado_por = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='registered_payments',
        help_text="Usuario que registró el pago"
    )

    validado_por = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_payments',
        help_text="Usuario (finanzas) que validó el pago"
    )

    fecha_validacion = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de validación"
    )

    # Notas
    notas = models.TextField(
        blank=True,
        help_text="Observaciones sobre el pago"
    )

    notas_rechazo = models.TextField(
        blank=True,
        help_text="Motivo del rechazo (si aplica)"
    )

    class Meta:
        db_table = 'payments'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_pago']
        indexes = [
            models.Index(fields=['sales_invoice', 'estado']),
            models.Index(fields=['fecha_pago']),
            models.Index(fields=['estado']),
            models.Index(fields=['referencia']),
        ]

    def __str__(self):
        return f"Pago {self.referencia} - ${self.monto} ({self.sales_invoice.numero_factura})"

    def clean(self):
        """Validaciones personalizadas"""
        if self.sales_invoice and self.monto:
            # Calcular cuánto está disponible considerando otros pagos validados
            otros_pagos = self.sales_invoice.payments.filter(
                estado='validado'
            ).exclude(pk=self.pk if self.pk else None).aggregate(
                total=models.Sum('monto')
            )['total'] or Decimal('0.00')

            disponible = self.sales_invoice.monto_total - otros_pagos

            if self.monto > disponible:
                raise ValidationError({
                    'monto': f"El monto del pago (${self.monto}) excede el disponible (${disponible})"
                })

    @transaction.atomic
    def save(self, *args, **kwargs):
        # Guardar estado anterior para detectar cambios
        old_estado = None
        if self.pk:
            try:
                old_instance = Payment.objects.get(pk=self.pk)
                old_estado = old_instance.estado
            except Payment.DoesNotExist:
                pass

        self.full_clean()
        super().save(*args, **kwargs)

        # Actualizar si cambió el estado o si está validado
        if self.estado == 'validado' or (old_estado == 'validado' and self.estado != 'validado'):
            self._actualizar_factura()

    def _actualizar_factura(self):
        """Actualiza el monto pagado de la factura"""
        total_pagado = self.sales_invoice.payments.filter(
            estado='validado'
        ).aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')

        self.sales_invoice.monto_pagado = total_pagado
        self.sales_invoice.save()

    def validar(self, user):
        """Validar el pago"""
        from django.utils import timezone
        self.estado = 'validado'
        self.validado_por = user
        self.fecha_validacion = timezone.now()
        self.save()

    def rechazar(self, user, motivo):
        """Rechazar el pago"""
        from django.utils import timezone
        self.estado = 'rechazado'
        self.validado_por = user
        self.fecha_validacion = timezone.now()
        self.notas_rechazo = motivo
        self.save()


class CreditNote(TimeStampedModel, SoftDeleteModel):
    """
    Nota de Crédito asociada a una factura de venta.
    Se usa para anular total o parcialmente una factura.
    """
    
    # Relación con la factura de venta
    sales_invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.PROTECT,
        related_name='credit_notes',
        help_text="Factura de venta a la que se aplica esta nota de crédito"
    )
    
    # Información de la nota de crédito
    numero_nota_credito = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Número de la nota de crédito"
    )
    
    fecha_emision = models.DateField(
        help_text="Fecha de emisión de la nota de crédito"
    )
    
    monto = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto de la nota de crédito"
    )
    
    motivo = models.TextField(
        help_text="Motivo de la nota de crédito"
    )
    
    # Archivo PDF de la nota de crédito
    archivo_pdf = models.FileField(
        upload_to='credit_notes/',
        storage=CloudinaryMediaStorage(),
        null=True,
        blank=True,
        help_text="PDF de la nota de crédito"
    )
    
    notas = models.TextField(
        blank=True,
        help_text="Notas adicionales sobre la nota de crédito"
    )
    
    class Meta:
        db_table = 'sales_credit_notes'
        verbose_name = 'Nota de Crédito'
        verbose_name_plural = 'Notas de Crédito'
        ordering = ['-fecha_emision', '-created_at']
        indexes = [
            models.Index(fields=['sales_invoice', '-fecha_emision']),
            models.Index(fields=['numero_nota_credito']),
        ]
    
    def __str__(self):
        return f"NC {self.numero_nota_credito} - {self.sales_invoice.numero_factura}"
    
    def clean(self):
        """
        Validar que el monto no exceda el monto ORIGINAL de la factura.
        Nota: SÍ puede exceder lo que queda después de costos asociados.
        """
        if not self.sales_invoice_id:
            return
        
        # Calcular total de notas de crédito existentes (excluyendo esta si es edición)
        total_nc = self.sales_invoice.credit_notes.exclude(
            pk=self.pk
        ).aggregate(
            total=models.Sum('monto')
        )['total'] or Decimal('0.00')
        
        # Validación: Total de NCs no puede exceder el monto ORIGINAL de la factura
        monto_con_nc = total_nc + self.monto
        
        if monto_con_nc > self.sales_invoice.monto_total:
            raise ValidationError({
                'monto': f'El monto total de notas de crédito (${monto_con_nc}) '
                        f'excede el monto original de la factura (${self.sales_invoice.monto_total}). '
                        f'Ya hay ${total_nc} en otras notas de crédito.'
            })
    
    @transaction.atomic
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Actualizar estado de la factura
        self._actualizar_estado_factura()
    
    def _actualizar_estado_factura(self):
        """
        Actualiza el estado de la factura según las notas de crédito.
        Si se anula completamente, elimina las asociaciones con costos.
        """
        factura = self.sales_invoice
        
        # Calcular total de notas de crédito
        total_nc = factura.credit_notes.aggregate(
            total=models.Sum('monto')
        )['total'] or Decimal('0.00')
        
        # Si la nota de crédito cubre el total, marcar como anulada
        if total_nc >= factura.monto_total:
            factura.estado_facturacion = 'anulada'
            
            # Eliminar asociaciones con facturas de costo
            # (la factura de venta ya no es válida, no debe restar de los costos)
            factura.invoice_sales_mappings.all().delete()
            
        elif total_nc > 0:
            factura.estado_facturacion = 'anulada_parcial'
        
        factura.save()


# === IMPORTAR MODELOS DE LÍNEAS DE FACTURA ===
# Se importa al final para evitar imports circulares
from .models_items import SalesInvoiceItem  # noqa: E402, F401

"""
Modelos para líneas/items de facturas de venta.
Sistema robusto y escalable para manejar IVA mixto (líneas con y sin IVA).
"""

from django.db import models, transaction
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from decimal import Decimal
from common.models import TimeStampedModel, SoftDeleteModel
import logging

logger = logging.getLogger(__name__)


class SalesInvoiceItem(TimeStampedModel, SoftDeleteModel):
    """
    Línea/Item individual de una factura de venta.
    Permite IVA mixto: algunas líneas con IVA, otras exentas.

    Ejemplo de uso:
    - Línea 1: Flete Local ($500) → CON IVA 13%
    - Línea 2: Flete Marítimo ($2,000) → EXENTO (internacional)
    - Línea 3: Almacenaje ($300) → CON IVA 13%
    """

    # Choices para conceptos comunes
    CONCEPTO_CHOICES = [
        ('flete_local', 'Flete Local'),
        ('flete_maritimo', 'Flete Marítimo'),
        ('flete_aereo', 'Flete Aéreo'),
        ('flete_terrestre', 'Flete Terrestre'),
        ('almacenaje', 'Almacenaje'),
        ('handling', 'Handling / Manipulación'),
        ('documentacion', 'Documentación'),
        ('tramites_aduaneros', 'Trámites Aduaneros'),
        ('seguro', 'Seguro de Carga'),
        ('demora', 'Demora / Estadía'),
        ('inspeccion', 'Inspección'),
        ('consolidacion', 'Consolidación'),
        ('desconsolidacion', 'Desconsolidación'),
        ('embalaje', 'Embalaje'),
        ('etiquetado', 'Etiquetado'),
        ('otro', 'Otro'),
    ]

    # === Relación con factura padre ===
    factura = models.ForeignKey(
        'SalesInvoice',
        on_delete=models.CASCADE,
        related_name='lineas',
        help_text="Factura de venta a la que pertenece este item"
    )

    # === Información del item ===
    numero_linea = models.PositiveIntegerField(
        default=1,
        help_text="Número de orden de la línea en la factura"
    )

    descripcion = models.CharField(
        max_length=500,
        help_text="Descripción detallada del servicio/producto"
    )

    concepto = models.CharField(
        max_length=50,
        choices=CONCEPTO_CHOICES,
        default='otro',
        db_index=True,
        help_text="Concepto/categoría del cargo"
    )

    # === TIPO DE SERVICIO (para retención de renta - El Salvador) ===
    TIPO_SERVICIO_CHOICES = [
        ('servicio_profesional', 'Servicio Profesional (10%)'),
        ('servicio_tecnico', 'Servicio Técnico (10%)'),
        ('otros_servicios', 'Otros Servicios (5%)'),
        ('arrendamiento', 'Arrendamiento (10%)'),
        ('transporte_carga', 'Transporte de Carga (5%)'),
        ('comisiones', 'Comisiones (10%)'),
        ('venta_bienes', 'Venta de Bienes (5%)'),
    ]

    tipo_servicio = models.CharField(
        max_length=50,
        choices=TIPO_SERVICIO_CHOICES,
        default='otros_servicios',
        db_index=True,
        help_text="Tipo de servicio para determinar % de retención de renta (El Salvador)"
    )

    # === Cantidades y precios ===
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal('1.000'),
        validators=[MinValueValidator(Decimal('0.001'))],
        help_text="Cantidad de unidades"
    )

    unidad_medida = models.CharField(
        max_length=20,
        default='servicio',
        help_text="Unidad de medida (servicio, kg, m3, contenedor, etc.)"
    )

    precio_unitario = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.0001'))],
        help_text="Precio por unidad"
    )

    # === Montos calculados (se calculan automáticamente en save()) ===
    subtotal = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Subtotal = cantidad × precio_unitario (calculado automáticamente)"
    )

    # === IVA - configurable por línea ===
    aplica_iva = models.BooleanField(
        default=True,
        db_index=True,
        help_text="¿Esta línea aplica IVA?"
    )

    porcentaje_iva = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('13.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
        ],
        help_text="Porcentaje de IVA a aplicar (13% por defecto en Ecuador)"
    )

    iva = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto de IVA (calculado automáticamente)"
    )

    # === Descuentos ===
    descuento_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
        ],
        help_text="Porcentaje de descuento aplicado a esta línea"
    )

    descuento_monto = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto del descuento (calculado automáticamente)"
    )

    # === Total de la línea ===
    total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total de la línea = (subtotal - descuento) + IVA (calculado automáticamente)"
    )

    # === Metadata de exención ===
    razon_exencion = models.CharField(
        max_length=200,
        blank=True,
        help_text="Razón de exención de IVA (ej: 'Flete internacional', 'Exportación', 'Servicio exento')"
    )

    codigo_exencion_sri = models.CharField(
        max_length=20,
        blank=True,
        help_text="Código de exención SRI si aplica"
    )

    # === Notas adicionales ===
    notas = models.TextField(
        blank=True,
        help_text="Notas adicionales sobre esta línea"
    )

    # === Audit ===
    modificado_por = models.CharField(
        max_length=100,
        blank=True,
        help_text="Usuario que modificó por última vez esta línea"
    )

    class Meta:
        db_table = 'sales_invoice_items'
        ordering = ['factura', 'numero_linea']
        verbose_name = 'Línea de Factura de Venta'
        verbose_name_plural = 'Líneas de Facturas de Venta'
        indexes = [
            models.Index(fields=['factura', 'numero_linea']),
            models.Index(fields=['concepto']),
            models.Index(fields=['aplica_iva']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(cantidad__gt=0),
                name='sales_invoice_item_cantidad_positiva'
            ),
            models.CheckConstraint(
                check=models.Q(precio_unitario__gte=0),
                name='sales_invoice_item_precio_no_negativo'
            ),
        ]

    def __str__(self):
        return f"{self.factura.numero_factura} - Línea {self.numero_linea}: {self.descripcion[:50]}"

    def clean(self):
        """Validaciones personalizadas"""
        errors = {}

        # Validar que si no aplica IVA, debe haber razón
        if not self.aplica_iva and not self.razon_exencion:
            errors['razon_exencion'] = 'Debe especificar la razón de exención de IVA'

        # Validar porcentaje de IVA razonable
        if self.porcentaje_iva < 0 or self.porcentaje_iva > 100:
            errors['porcentaje_iva'] = 'El porcentaje de IVA debe estar entre 0 y 100'

        # Validar descuento
        if self.descuento_porcentaje < 0 or self.descuento_porcentaje > 100:
            errors['descuento_porcentaje'] = 'El descuento debe estar entre 0 y 100%'

        if errors:
            raise ValidationError(errors)

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        Calcula automáticamente los montos antes de guardar.
        Usa transacción atómica para garantizar consistencia.
        """
        try:
            # 1. Calcular subtotal
            self.subtotal = (self.cantidad * self.precio_unitario).quantize(Decimal('0.01'))

            # 2. Calcular descuento
            if self.descuento_porcentaje > 0:
                self.descuento_monto = (
                    self.subtotal * self.descuento_porcentaje / 100
                ).quantize(Decimal('0.01'))
            else:
                self.descuento_monto = Decimal('0.00')

            # 3. Subtotal después de descuento
            subtotal_con_descuento = self.subtotal - self.descuento_monto

            # 4. Calcular IVA
            if self.aplica_iva:
                self.iva = (
                    subtotal_con_descuento * self.porcentaje_iva / 100
                ).quantize(Decimal('0.01'))
            else:
                self.iva = Decimal('0.00')
                # Si no aplica IVA pero no hay razón, agregar una genérica
                if not self.razon_exencion:
                    self.razon_exencion = 'Servicio exento de IVA'

            # 5. Calcular total
            self.total = (subtotal_con_descuento + self.iva).quantize(Decimal('0.01'))

            # Validar antes de guardar
            self.full_clean()

            # Guardar
            super().save(*args, **kwargs)

            logger.info(
                f"Item guardado: {self.descripcion[:30]} | "
                f"Subtotal: ${self.subtotal} | IVA: ${self.iva} | Total: ${self.total}"
            )

        except Exception as e:
            logger.error(f"Error guardando SalesInvoiceItem {self.id}: {e}")
            raise

    def get_detalle_calculo(self):
        """
        Retorna un diccionario con el desglose del cálculo.
        Útil para auditoría y debugging.
        """
        return {
            'cantidad': float(self.cantidad),
            'precio_unitario': float(self.precio_unitario),
            'subtotal_bruto': float(self.subtotal),
            'descuento_porcentaje': float(self.descuento_porcentaje),
            'descuento_monto': float(self.descuento_monto),
            'subtotal_neto': float(self.subtotal - self.descuento_monto),
            'aplica_iva': self.aplica_iva,
            'porcentaje_iva': float(self.porcentaje_iva) if self.aplica_iva else 0,
            'iva_monto': float(self.iva),
            'total': float(self.total),
        }


# === SIGNALS PARA RECALCULAR TOTALES DE LA FACTURA ===

@receiver(post_save, sender=SalesInvoiceItem)
def recalcular_totales_factura_on_save(sender, instance, created, **kwargs):
    """
    Recalcula los totales de la factura cuando se guarda una línea.
    """
    try:
        if instance.factura:
            instance.factura.recalcular_totales_desde_lineas()
            logger.info(f"Totales recalculados para factura {instance.factura.numero_factura}")
    except Exception as e:
        logger.error(f"Error recalculando totales en post_save: {e}")


@receiver(post_delete, sender=SalesInvoiceItem)
def recalcular_totales_factura_on_delete(sender, instance, **kwargs):
    """
    Recalcula los totales de la factura cuando se elimina una línea.
    """
    try:
        if instance.factura:
            instance.factura.recalcular_totales_desde_lineas()
            logger.info(f"Totales recalculados tras eliminar línea de {instance.factura.numero_factura}")
    except Exception as e:
        logger.error(f"Error recalculando totales en post_delete: {e}")

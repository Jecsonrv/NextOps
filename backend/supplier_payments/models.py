"""
Modelos para el módulo de Pagos a Proveedores (Cuentas por Pagar).
CORREGIDO: Con validaciones y transacciones atómicas.
"""

from django.db import models, transaction
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from common.models import TimeStampedModel, SoftDeleteModel


class SupplierPayment(TimeStampedModel, SoftDeleteModel):
    """
    Representa un pago a proveedor (puede cubrir múltiples facturas).
    Ejemplo: Una transferencia bancaria que paga varias facturas de costo.
    """

    proveedor = models.ForeignKey(
        'catalogs.Provider',
        on_delete=models.PROTECT,
        related_name='supplier_payments',
        help_text="Proveedor al que se realizó el pago"
    )

    fecha_pago = models.DateField(
        help_text="Fecha en que se realizó el pago/transferencia"
    )

    monto_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monto total de la transferencia o pago"
    )

    referencia = models.CharField(
        max_length=100,
        blank=True,
        help_text="Número de referencia, ID de transferencia, etc."
    )

    archivo_comprobante = models.FileField(
        upload_to='supplier_payments/',
        null=True,
        blank=True,
        help_text="Comprobante de pago (PDF, imagen)"
    )

    notas = models.TextField(
        blank=True,
        help_text="Notas internas"
    )

    registrado_por = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_supplier_payments',
        help_text="Usuario que registró el pago"
    )

    class Meta:
        db_table = 'supplier_payments'
        verbose_name = 'Pago a Proveedor'
        verbose_name_plural = 'Pagos a Proveedores'
        ordering = ['-fecha_pago']
        indexes = [
            models.Index(fields=['-fecha_pago']),
            models.Index(fields=['proveedor', '-fecha_pago']),
        ]

    def __str__(self):
        proveedor_nombre = self.proveedor.nombre if self.proveedor else "Sin proveedor"
        return f"Pago a {proveedor_nombre} - ${self.monto_total} ({self.fecha_pago})"

    @transaction.atomic
    def delete(self, using=None, keep_parents=False):
        """
        Override soft delete para eliminar físicamente los links asociados
        y recalcular el estado de las facturas afectadas.
        """
        # Guardar referencias a las facturas afectadas
        affected_invoices = []
        for link in self.invoice_links.all():
            affected_invoices.append(link.cost_invoice)
            link.delete()  # Esto dispara el recálculo en SupplierPaymentLink.delete()

        # Realizar el soft delete del pago
        super().delete(using=using, keep_parents=keep_parents)


class SupplierPaymentLink(TimeStampedModel):
    """
    Tabla pivote que conecta un Pago a Proveedor con las múltiples
    facturas de costo que dicho pago está cubriendo.
    Permite pagos parciales y múltiples pagos por factura.
    """

    supplier_payment = models.ForeignKey(
        'SupplierPayment',
        on_delete=models.CASCADE,
        related_name='invoice_links',
        help_text="Pago al que pertenece este link"
    )

    cost_invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.PROTECT,
        related_name='supplier_payment_links',
        help_text="Factura de costo que se está pagando"
    )

    monto_pagado_factura = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Cuánto de este pago se asigna a esta factura específica"
    )

    class Meta:
        db_table = 'supplier_payment_links'
        verbose_name = 'Link de Pago a Factura'
        verbose_name_plural = 'Links de Pago a Facturas'
        unique_together = [['supplier_payment', 'cost_invoice']]
        indexes = [
            models.Index(fields=['supplier_payment']),
            models.Index(fields=['cost_invoice']),
        ]

    def __str__(self):
        return f"Link: {self.supplier_payment} -> {self.cost_invoice.numero_factura} (${self.monto_pagado_factura})"

    def clean(self):
        """Validar antes de guardar"""
        if self.cost_invoice.estado_provision != 'provisionada':
            raise ValidationError({
                'cost_invoice': f"La factura de costo {self.cost_invoice.numero_factura} no está provisionada."
            })

        if self.monto_pagado_factura and self.cost_invoice:
            # Calcular cuánto ya se pagó (excluyendo el actual si es edición)
            total_pagado_actual = SupplierPaymentLink.objects.filter(
                cost_invoice=self.cost_invoice
            ).exclude(pk=self.pk if self.pk else None).aggregate(
                total=models.Sum('monto_pagado_factura')
            )['total'] or Decimal('0.00')

            # Validar que no exceda el monto aplicable
            if (total_pagado_actual + self.monto_pagado_factura) > self.cost_invoice.monto_aplicable:
                raise ValidationError({
                    'monto_pagado_factura': f"El pago total (${total_pagado_actual + self.monto_pagado_factura}) "
                                           f"excedería el monto de la factura (${self.cost_invoice.monto_aplicable})"
                })

            # Validar que el monto pendiente sea suficiente
            monto_pendiente = self.cost_invoice.monto_aplicable - total_pagado_actual
            if self.monto_pagado_factura > monto_pendiente:
                raise ValidationError({
                    'monto_pagado_factura': f"El monto del pago (${self.monto_pagado_factura}) excede "
                                           f"el monto pendiente (${monto_pendiente})"
                })

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        LÓGICA CRÍTICA: Al guardar este link, actualizar el
        monto_pagado en la factura de costo (Invoice).
        """
        # Ejecutar validaciones
        self.full_clean()

        super().save(*args, **kwargs)

        # Recalcular el total pagado para la factura de costo
        from django.db.models import Sum
        invoice = self.cost_invoice

        total_pagado = SupplierPaymentLink.objects.filter(
            cost_invoice=invoice
        ).aggregate(
            total=Sum('monto_pagado_factura')
        )['total'] or Decimal('0.00')

        invoice.monto_pagado = total_pagado
        invoice.save()  # Esto dispara la lógica de cálculo automático en Invoice.save()

    @transaction.atomic
    def delete(self, *args, **kwargs):
        """
        Al eliminar un link, recalcular el monto pagado de la factura.
        """
        invoice = self.cost_invoice
        super().delete(*args, **kwargs)

        # Recalcular después de eliminar
        from django.db.models import Sum
        total_pagado = SupplierPaymentLink.objects.filter(
            cost_invoice=invoice
        ).aggregate(
            total=Sum('monto_pagado_factura')
        )['total'] or Decimal('0.00')

        invoice.monto_pagado = total_pagado
        invoice.save()

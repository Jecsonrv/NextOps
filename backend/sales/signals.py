"""
Signals para el módulo de ventas.
Maneja actualizaciones automáticas de estados y métricas.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import SalesInvoice, InvoiceSalesMapping, Payment


@receiver(pre_save, sender=SalesInvoice)
def limpiar_asociaciones_al_soft_delete(sender, instance, **kwargs):
    """
    Cuando se hace soft-delete de una factura de venta,
    eliminar las asociaciones con facturas de costo.
    """
    if instance.pk and instance.deleted_at:
        # Si ya existe y se está marcando como eliminada
        try:
            old_instance = SalesInvoice.all_objects.get(pk=instance.pk)
            # Si antes no estaba eliminada y ahora sí
            if not old_instance.deleted_at:
                # Eliminar todas las asociaciones
                InvoiceSalesMapping.objects.filter(sales_invoice=instance).delete()
        except SalesInvoice.DoesNotExist:
            pass


@receiver(post_save, sender=InvoiceSalesMapping)
@receiver(post_delete, sender=InvoiceSalesMapping)
def actualizar_metricas_al_cambiar_mapping(sender, instance, **kwargs):
    """
    Cuando se crea/actualiza/elimina un mapping de costo-venta,
    actualizar las métricas de la factura de venta y de la OT.
    """
    if instance.sales_invoice:
        # Forzar save para recalcular propiedades
        instance.sales_invoice.save()
        
        # Actualizar métricas de la OT si existe
        if instance.sales_invoice.ot:
            instance.sales_invoice.ot.calcular_metricas_venta()


@receiver(post_save, sender=SalesInvoice)
@receiver(post_delete, sender=SalesInvoice)
def actualizar_ot_al_cambiar_factura_venta(sender, instance, **kwargs):
    """
    Cuando se crea/actualiza/elimina una factura de venta,
    actualizar las métricas de la OT.
    """
    if instance.ot and not kwargs.get('update_fields'):
        # Solo actualizar si no es un save() con update_fields
        # (para evitar recursión con el save() interno)
        instance.ot.calcular_metricas_venta()


@receiver(post_save, sender=Payment)
def actualizar_factura_al_validar_pago(sender, instance, created, **kwargs):
    """
    Cuando se valida un pago, actualizar el monto pagado de la factura.
    """
    if not created and instance.estado == 'validado':
        # Solo si es una actualización y el estado es validado
        instance._actualizar_factura()


@receiver(post_delete, sender=Payment)
def actualizar_factura_al_eliminar_pago(sender, instance, **kwargs):
    """
    Cuando se elimina un pago validado, recalcular el monto pagado.
    """
    if instance.estado == 'validado' and instance.sales_invoice:
        from django.db.models import Sum
        from decimal import Decimal
        
        total_pagado = instance.sales_invoice.payments.filter(
            estado='validado'
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        instance.sales_invoice.monto_pagado = total_pagado
        instance.sales_invoice.save()


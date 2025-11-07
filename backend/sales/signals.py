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


# FIX 3: Limpieza de fechas al desasociar facturas de costo
@receiver(post_delete, sender=InvoiceSalesMapping)
def limpiar_fechas_al_desasociar(sender, instance, **kwargs):
    """
    Limpia las fechas de facturación cuando se desasocia una factura de costo.

    REGLAS:
    - Si la factura de costo NO tiene otras asociaciones activas, limpiar fecha_facturacion
    - Si es costo vinculado y no tiene otras asociaciones, limpiar fechas de OT

    IMPORTANTE: Solo se ejecuta si la factura NO está asociada a otras facturas de venta
    """
    from invoices.models import Invoice
    import logging

    logger = logging.getLogger(__name__)
    cost_invoice = instance.cost_invoice

    # Verificar si la factura tiene otras asociaciones activas
    otras_asociaciones = InvoiceSalesMapping.objects.filter(
        cost_invoice=cost_invoice
    ).exists()

    if otras_asociaciones:
        logger.info(
            f"[DESASOCIAR] Factura de costo {cost_invoice.numero_factura} tiene otras asociaciones, "
            f"no se limpian fechas"
        )
        return

    # No hay otras asociaciones, limpiar fechas
    logger.warning(
        f"[DESASOCIAR] Factura de costo {cost_invoice.numero_factura} desasociada de TODAS las facturas de venta, "
        f"limpiando fechas de facturación"
    )

    # Limpiar fecha_facturacion de la factura de costo
    cost_invoice.fecha_facturacion = None
    cost_invoice.estado_facturacion = 'pendiente'
    cost_invoice.save(update_fields=['fecha_facturacion', 'estado_facturacion', 'updated_at'])

    # Si es costo vinculado, también limpiar fechas de la OT
    if cost_invoice.es_costo_vinculado_ot() and cost_invoice.ot:
        # Verificar si hay otras facturas vinculadas a la misma OT
        # que aún tengan fecha_facturacion
        otras_facturas_vinculadas = Invoice.objects.filter(
            ot=cost_invoice.ot,
            is_deleted=False
        ).exclude(
            id=cost_invoice.id
        ).exclude(
            estado_provision__in=['anulada', 'anulada_parcialmente', 'rechazada']
        ).filter(
            fecha_facturacion__isnull=False
        ).exists()

        if not otras_facturas_vinculadas:
            # No hay otras facturas con fecha_facturacion, limpiar OT
            ot = cost_invoice.ot
            ot.fecha_recepcion_factura = None
            ot.fecha_solicitud_facturacion = None

            # Volver el estado a pendiente si estaba facturado
            if ot.estado_facturado == 'facturado':
                ot.estado_facturado = 'pendiente'

            ot._skip_invoice_sync = True
            ot.save(update_fields=['fecha_recepcion_factura', 'fecha_solicitud_facturacion', 'estado_facturado', 'updated_at'])
            ot._skip_invoice_sync = False

            logger.warning(
                f"[DESASOCIAR] OT {ot.numero_ot}: fechas de facturación limpiadas y estado a pendiente "
                f"(todas las facturas vinculadas fueron desasociadas)"
            )


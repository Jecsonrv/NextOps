"""
Signals para el módulo de Invoices.
Sincronización bidireccional de fechas entre Invoice y OT.
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from ots.models import OT
from invoices.models import Invoice


@receiver(post_save, sender=OT)
def sync_ot_to_invoices(sender, instance, created, **kwargs):
    """
    Sincronización OT -> Invoices (funciona con CUALQUIER fuente: manual, Excel, CSV)

    REGLAS DE NEGOCIO:
    - Cuando se actualiza una OT, sus cambios deben propagarse a las facturas VINCULADAS.
    - Una factura VINCULADA es aquella cuyo tipo_costo es FLETE o CARGOS_NAVIERA.
    - ¡IMPORTANTE! Las facturas en estado ANULADA o ANULADA_PARCIALMENTE se consideran
      desvinculadas funcionalmente y NUNCA deben ser modificadas por cambios en la OT.
    """
    if created:
        return

    if getattr(instance, '_skip_invoice_sync', False):
        return
    
    from invoices.models import Invoice
    from django.db.models import Q
    
    # Obtener facturas vinculadas (FLETE o CARGOS_NAVIERA) asociadas a esta OT.
    # EXCLUIR INMEDIATAMENTE las facturas anuladas para que no sean afectadas por ningún cambio.
    invoices_to_update = Invoice.objects.filter(
        ot=instance,
        is_deleted=False
    ).filter(
        Q(tipo_costo__startswith='FLETE') | Q(tipo_costo='CARGOS_NAVIERA')
    ).exclude(
        estado_provision__in=['anulada', 'anulada_parcialmente']
    )
    
    if not invoices_to_update.exists():
        return
    
    update_data = {}
    estado_ot = instance.estado_provision

    # Lógica para determinar qué datos actualizar en las facturas válidas
    if estado_ot in ['disputada', 'revision']:
        update_data['estado_provision'] = estado_ot
        update_data['fecha_provision'] = None
    elif estado_ot == 'provisionada':
        update_data['estado_provision'] = 'provisionada'
        update_data['fecha_provision'] = instance.fecha_provision
    elif estado_ot == 'pendiente':
        update_data['estado_provision'] = 'pendiente'
        update_data['fecha_provision'] = None
    else:
        # Fallback para cualquier otro estado que pueda tener la OT
        update_data['estado_provision'] = estado_ot
        update_data['fecha_provision'] = instance.fecha_provision

    # Sincronizar fecha de facturación (esto se aplica a todas las facturas no anuladas)
    if instance.fecha_recepcion_factura:
        update_data['fecha_facturacion'] = instance.fecha_recepcion_factura
        update_data['estado_facturacion'] = 'facturada'
    else:
        update_data['fecha_facturacion'] = None
        update_data['estado_facturacion'] = 'pendiente'

    if not update_data:
        return

    count = invoices_to_update.update(**update_data)
    
    if count > 0:
        print(f"[SIGNAL OT->INVOICE] OT {instance.numero_ot}: Sincronizadas {count} facturas no anuladas.")
        print(f"  - Datos aplicados: {update_data}")


@receiver(post_save, sender=Invoice)
def sync_invoice_to_ot_on_assignment(sender, instance, created, **kwargs):
    """
    Sincronización Invoice -> OT cuando se asigna o actualiza una factura.

    REGLAS DE NEGOCIO:
    - Cuando se crea o actualiza una factura vinculada (FLETE/CARGOS_NAVIERA),
      debe actualizar el estado de su OT según las reglas de consolidación.
    - Ignora facturas anuladas o sin OT asignada.
    - Usa el método _sincronizar_estado_con_ot() del modelo Invoice.
    """
    # Evitar loops infinitos de sincronización
    if getattr(instance, '_skip_signal_sync', False):
        return

    # Solo procesar facturas vinculadas a OT
    if not instance.ot:
        return

    # Solo procesar facturas de tipo vinculado (FLETE, CARGOS_NAVIERA, o dinámicos)
    if not instance.es_costo_vinculado_ot():
        return

    # No sincronizar facturas anuladas
    if instance.estado_provision in ['anulada', 'anulada_parcialmente', 'rechazada']:
        return

    # Ejecutar sincronización Invoice -> OT
    print(f"[SIGNAL INVOICE->OT] Factura {instance.numero_factura}: Sincronizando con OT {instance.ot.numero_ot}")

    # Marcar para evitar loop
    instance._skip_signal_sync = True
    try:
        instance._sincronizar_estado_con_ot()
    finally:
        instance._skip_signal_sync = False

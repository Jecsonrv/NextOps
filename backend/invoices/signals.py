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
    - Una factura VINCULADA es aquella cuyo tipo_costo está configurado con is_linked_to_ot=True
    - Incluye tipos hardcodeados (FLETE, CARGOS_NAVIERA) y tipos dinámicos del catálogo
    - ¡IMPORTANTE! Las facturas en estado ANULADA o ANULADA_PARCIALMENTE se consideran
      desvinculadas funcionalmente y NUNCA deben ser modificadas por cambios en la OT.
    """
    if created:
        return

    if getattr(instance, '_skip_invoice_sync', False):
        return
    
    from invoices.models import Invoice
    from catalogs.models import CostType
    from django.db.models import Q
    
    # Obtener todos los códigos de tipos vinculados desde el catálogo
    tipos_vinculados_dinamicos = list(CostType.objects.filter(
        is_linked_to_ot=True,
        is_active=True,
        is_deleted=False
    ).values_list('code', flat=True))
    
    # Tipos hardcodeados legacy (siempre vinculados)
    tipos_hardcoded = ['FLETE', 'CARGOS_NAVIERA']
    
    # Combinar ambas listas
    todos_tipos_vinculados = set(tipos_hardcoded + tipos_vinculados_dinamicos)
    
    # Obtener facturas vinculadas asociadas a esta OT
    # EXCLUIR INMEDIATAMENTE las facturas anuladas para que no sean afectadas por ningún cambio
    invoices_to_update = Invoice.objects.filter(
        ot=instance,
        is_deleted=False,
        tipo_costo__in=list(todos_tipos_vinculados)
    ).exclude(
        estado_provision__in=['anulada', 'anulada_parcialmente']
    )
    
    if not invoices_to_update.exists():
        # Logging para debug: No hay facturas vinculadas
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[SIGNAL OT->INVOICE] OT {instance.numero_ot}: No hay facturas vinculadas activas para sincronizar")
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
    
    # Logging mejorado
    import logging
    logger = logging.getLogger(__name__)
    if count > 0:
        logger.info(f"[SIGNAL OT->INVOICE] OT {instance.numero_ot}: Sincronizadas {count} facturas vinculadas.")
        logger.debug(f"  - Tipos vinculados considerados: {list(todos_tipos_vinculados)}")
        logger.debug(f"  - Datos aplicados: {update_data}")
    else:
        logger.warning(f"[SIGNAL OT->INVOICE] OT {instance.numero_ot}: No se actualizó ninguna factura (posible error de filtro)")


@receiver(post_save, sender=Invoice)
def sync_invoice_to_ot_on_assignment(sender, instance, created, **kwargs):
    """
    Sincronización Invoice -> OT cuando se asigna o actualiza una factura.

    REGLAS DE NEGOCIO:
    - Cuando se crea o actualiza una factura vinculada, debe actualizar el estado
      de su OT según las reglas de consolidación
    - Vinculación se determina por is_linked_to_ot del tipo de costo (hardcoded + dinámico)
    - Ignora facturas anuladas o sin OT asignada
    - Usa el método _sincronizar_estado_con_ot() del modelo Invoice
    - FIX 2: También sincroniza fecha_facturacion hacia la OT (bidireccional completa)
    """
    import logging
    logger = logging.getLogger(__name__)

    # Evitar loops infinitos de sincronización
    if getattr(instance, '_skip_signal_sync', False):
        return

    # Solo procesar facturas vinculadas a OT
    if not instance.ot:
        logger.debug(f"[SIGNAL INVOICE->OT] Factura {instance.numero_factura}: Sin OT asignada, skip")
        return

    # Solo procesar facturas de tipo vinculado (usa verificación dinámica)
    es_vinculado = instance.es_costo_vinculado_ot()
    if not es_vinculado:
        logger.debug(f"[SIGNAL INVOICE->OT] Factura {instance.numero_factura}: Tipo '{instance.tipo_costo}' NO vinculado a OT, skip")
        return

    # No sincronizar facturas anuladas
    if instance.estado_provision in ['anulada', 'anulada_parcialmente', 'rechazada']:
        logger.debug(f"[SIGNAL INVOICE->OT] Factura {instance.numero_factura}: Estado anulado/rechazado, skip")
        return

    # Ejecutar sincronización Invoice -> OT
    logger.info(f"[SIGNAL INVOICE->OT] Factura {instance.numero_factura} (tipo: {instance.tipo_costo}): Sincronizando con OT {instance.ot.numero_ot}")

    # Marcar para evitar loop
    instance._skip_signal_sync = True
    try:
        # FIX 2: Sincronizar fecha_facturacion hacia la OT (bidireccional)
        if instance.fecha_facturacion and instance.ot.fecha_recepcion_factura != instance.fecha_facturacion:
            instance.ot.fecha_recepcion_factura = instance.fecha_facturacion
            instance.ot.fecha_solicitud_facturacion = instance.fecha_facturacion

            # Actualizar estado_facturado si está pendiente
            if instance.ot.estado_facturado == 'pendiente':
                instance.ot.estado_facturado = 'facturado'

            instance.ot._skip_invoice_sync = True
            instance.ot.save(update_fields=['fecha_recepcion_factura', 'fecha_solicitud_facturacion', 'estado_facturado', 'updated_at'])
            instance.ot._skip_invoice_sync = False
            logger.info(
                f"[SIGNAL INVOICE->OT] ✓ OT {instance.ot.numero_ot}: "
                f"fecha_recepcion_factura actualizada a {instance.fecha_facturacion} y estado a facturado"
            )

        # Sincronización de estado Invoice -> OT
        instance._sincronizar_estado_con_ot()
        logger.info(f"[SIGNAL INVOICE->OT] ✓ Sincronización completada para factura {instance.numero_factura}")
    except Exception as e:
        logger.error(f"[SIGNAL INVOICE->OT] ✗ Error al sincronizar factura {instance.numero_factura}: {e}")
    finally:
        instance._skip_signal_sync = False

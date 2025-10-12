"""
Signals para el módulo de Invoices.
Sincronización bidireccional de fechas entre Invoice y OT.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from ots.models import OT


@receiver(post_save, sender=OT)
def sync_ot_to_invoices(sender, instance, created, **kwargs):
    """
    Sincronización OT -> Invoices (funciona con CUALQUIER fuente: manual, Excel, CSV)

    REGLAS INAMOVIBLES:
    Cuando se actualiza fecha_provision o fecha_recepcion_factura en OT, sincronizar con todas las
    facturas relacionadas que sean:
    - tipo_costo in ['FLETE', 'CARGOS_NAVIERA']
    - tipo_proveedor = 'naviera'

    MAPEO DE CAMPOS:
    - OT.fecha_provision <-> Invoice.fecha_provision
    - OT.fecha_recepcion_factura <-> Invoice.fecha_facturacion

    Para otros tipos de costo (ALMACENAJE, DEMORA, TRANSPORTE, etc.) NO se sincroniza.
    """
    # No procesar en creación (solo en updates)
    if created:
        return

    # ⚠️ IMPORTANTE: Si estamos sincronizando desde Invoice, no volver a sincronizar
    # para evitar bucles infinitos
    if getattr(instance, '_skip_invoice_sync', False):
        return
    
    # Importar aquí para evitar circular import
    from invoices.models import Invoice
    from django.db.models import Q
    
    # Obtener facturas de FLETE (cualquier tipo) o CARGOS_NAVIERA de NAVIERA asociadas a este OT
    invoices_to_update = Invoice.objects.filter(
        ot=instance,
        tipo_proveedor='naviera',
        is_deleted=False
    ).filter(
        Q(tipo_costo__startswith='FLETE') | Q(tipo_costo='CARGOS_NAVIERA')
    )
    
    if not invoices_to_update.exists():
        return
    
    # Preparar datos de actualización
    update_data = {}

    # SINCRONIZAR estado_provision / fecha_provision según estado actual de la OT
    estado_ot = instance.estado_provision

    if estado_ot in ['disputada', 'revision', 'anulada', 'anulada_parcialmente']:
        update_data['estado_provision'] = estado_ot
        update_data['fecha_provision'] = None
    elif estado_ot == 'provisionada':
        update_data['estado_provision'] = 'provisionada'
        update_data['fecha_provision'] = instance.fecha_provision
    elif estado_ot == 'pendiente':
        # ⚠️ IMPORTANTE: NO sobrescribir el estado de facturas anuladas/anuladas_parcialmente
        # Si la OT está en pendiente pero la factura está anulada (por disputa resuelta),
        # mantener el estado anulado
        # Actualizar solo las facturas que NO están en estados de anulación
        invoices_to_update = invoices_to_update.exclude(
            estado_provision__in=['anulada', 'anulada_parcialmente']
        )
        update_data['estado_provision'] = 'pendiente'
        update_data['fecha_provision'] = None
    else:
        # Fallback: replicar estado y fecha tal como están
        update_data['estado_provision'] = estado_ot
        update_data['fecha_provision'] = instance.fecha_provision

    # SINCRONIZAR fecha_recepcion_factura -> fecha_facturacion
    if instance.fecha_recepcion_factura:
        update_data['fecha_facturacion'] = instance.fecha_recepcion_factura
        update_data['estado_facturacion'] = 'facturada'
    else:
        update_data['fecha_facturacion'] = None
        update_data['estado_facturacion'] = 'pendiente'

    # Aplicar actualización
    count = invoices_to_update.update(**update_data)
    
    print(f"[SIGNAL OT->INVOICE] OT {instance.numero_ot}: Sincronizadas {count} facturas")
    print(f"  - fecha_provision: {instance.fecha_provision} -> estado_provision: {update_data.get('estado_provision')}")
    print(f"  - fecha_recepcion_factura: {instance.fecha_recepcion_factura} -> fecha_facturacion: {update_data.get('fecha_facturacion')}, estado_facturacion: {update_data.get('estado_facturacion')}")

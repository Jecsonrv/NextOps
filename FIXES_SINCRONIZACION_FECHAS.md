# 🔧 FIXES PARA SINCRONIZACIÓN COMPLETA DE FECHAS

## 📋 PROBLEMAS IDENTIFICADOS

1. **DESINCRONIZACIÓN Invoice → OT**: Signal no actualiza fechas de facturación
2. **FACTURAS ANULADAS**: Se actualizan incorrectamente
3. **DESASOCIACIÓN**: No limpia fechas huérfanas

---

## ✅ FIX 1: Excluir facturas anuladas/rechazadas

**Archivo:** `backend/sales/serializers.py`

```python
def actualizar_fechas_facturas_costo_asociadas(sales_invoice, cost_invoice_ids):
    """
    Actualiza las fechas de facturación de las facturas de costo asociadas a una factura de venta.

    REGLAS:
    1. Invoice.fecha_facturacion = SalesInvoice.fecha_emision (SIEMPRE)
    2. Si Invoice.es_costo_vinculado_ot() == True (FLETE, CARGOS_NAVIERA, etc.):
       - OT.fecha_solicitud_facturacion = SalesInvoice.fecha_emision
       - OT.fecha_recepcion_factura = SalesInvoice.fecha_emision
    3. NO tocar Invoice.fecha_provision (nunca se actualiza desde factura de venta)
    4. EXCLUIR facturas anuladas, rechazadas o eliminadas

    Args:
        sales_invoice: Instancia de SalesInvoice
        cost_invoice_ids: Lista de IDs de facturas de costo asociadas
    """
    if not cost_invoice_ids or not sales_invoice.fecha_emision:
        return

    fecha_emision_venta = sales_invoice.fecha_emision

    # Obtener facturas de costo asociadas
    # ✅ FIX: Excluir facturas anuladas, rechazadas y eliminadas
    facturas_costo = Invoice.objects.filter(
        id__in=cost_invoice_ids,
        is_deleted=False
    ).exclude(
        estado_provision__in=['anulada', 'anulada_parcialmente', 'rechazada']
    ).select_related('ot')

    for factura_costo in facturas_costo:
        # REGLA 1: Actualizar fecha_facturacion de la factura de costo
        factura_costo.fecha_facturacion = fecha_emision_venta
        factura_costo.save(update_fields=['fecha_facturacion', 'updated_at'])

        logger.info(
            f"Factura de costo {factura_costo.numero_factura}: "
            f"fecha_facturacion actualizada a {fecha_emision_venta}"
        )

        # REGLA 2: Si es costo vinculado a OT, actualizar fechas de la OT
        if factura_costo.es_costo_vinculado_ot() and factura_costo.ot:
            ot = factura_costo.ot
            ot.fecha_solicitud_facturacion = fecha_emision_venta
            ot.fecha_recepcion_factura = fecha_emision_venta
            ot.save(update_fields=['fecha_solicitud_facturacion', 'fecha_recepcion_factura', 'updated_at'])

            logger.info(
                f"OT {ot.numero_ot}: fechas de facturación actualizadas a {fecha_emision_venta} "
                f"(por factura de costo vinculada {factura_costo.numero_factura})"
            )
```

---

## ✅ FIX 2: Sincronización bidireccional completa Invoice ↔ OT

**Archivo:** `backend/invoices/signals.py`

**Modificar signal `sync_invoice_to_ot_on_assignment`:**

```python
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
    - ✅ NUEVO: También sincroniza fecha_facturacion hacia la OT
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

    # Marcar para evitar loop
    instance._skip_signal_sync = True
    try:
        # ✅ NUEVO: Sincronizar fecha_facturacion hacia la OT
        if instance.fecha_facturacion and instance.ot.fecha_recepcion_factura != instance.fecha_facturacion:
            instance.ot.fecha_recepcion_factura = instance.fecha_facturacion
            instance.ot.fecha_solicitud_facturacion = instance.fecha_facturacion
            instance.ot._skip_invoice_sync = True
            instance.ot.save(update_fields=['fecha_recepcion_factura', 'fecha_solicitud_facturacion', 'updated_at'])
            instance.ot._skip_invoice_sync = False
            logger.info(
                f"[SIGNAL INVOICE->OT] ✓ OT {instance.ot.numero_ot}: "
                f"fecha_recepcion_factura actualizada a {instance.fecha_facturacion}"
            )

        # Ejecutar sincronización de estado Invoice -> OT
        logger.info(f"[SIGNAL INVOICE->OT] Factura {instance.numero_factura} (tipo: {instance.tipo_costo}): Sincronizando con OT {instance.ot.numero_ot}")
        instance._sincronizar_estado_con_ot()
        logger.info(f"[SIGNAL INVOICE->OT] ✓ Sincronización completada para factura {instance.numero_factura}")

    except Exception as e:
        logger.error(f"[SIGNAL INVOICE->OT] ✗ Error al sincronizar factura {instance.numero_factura}: {e}")
    finally:
        instance._skip_signal_sync = False
```

---

## ✅ FIX 3: Limpieza de fechas al desasociar

**Archivo:** `backend/sales/models.py`

**Agregar signal para InvoiceSalesMapping:**

```python
from django.db.models.signals import post_delete
from django.dispatch import receiver

@receiver(post_delete, sender=InvoiceSalesMapping)
def limpiar_fechas_al_desasociar(sender, instance, **kwargs):
    """
    Limpia las fechas de facturación cuando se desasocia una factura de costo.

    REGLAS:
    - Si la factura de costo NO tiene otras asociaciones activas, limpiar fecha_facturacion
    - Si es costo vinculado y no tiene otras asociaciones, limpiar fechas de OT

    IMPORTANTE: Solo se ejecuta si la factura NO está asociada a otras facturas de venta
    """
    import logging
    logger = logging.getLogger(__name__)

    cost_invoice = instance.cost_invoice

    # Verificar si la factura tiene otras asociaciones activas
    otras_asociaciones = InvoiceSalesMapping.objects.filter(
        cost_invoice=cost_invoice
    ).exclude(pk=instance.pk).exists()

    if otras_asociaciones:
        logger.info(
            f"Factura de costo {cost_invoice.numero_factura} tiene otras asociaciones, "
            f"no se limpian fechas"
        )
        return

    # No hay otras asociaciones, limpiar fechas
    logger.warning(
        f"Factura de costo {cost_invoice.numero_factura} desasociada de TODAS las facturas de venta, "
        f"limpiando fechas de facturación"
    )

    # Limpiar fecha_facturacion de la factura de costo
    cost_invoice.fecha_facturacion = None
    cost_invoice.estado_facturacion = 'pendiente'
    cost_invoice.save(update_fields=['fecha_facturacion', 'estado_facturacion', 'updated_at'])

    # Si es costo vinculado, también limpiar fechas de la OT
    if cost_invoice.es_costo_vinculado_ot() and cost_invoice.ot:
        # Verificar si hay otras facturas vinculadas a la misma OT
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
            ot.save(update_fields=['fecha_recepcion_factura', 'fecha_solicitud_facturacion', 'updated_at'])

            logger.warning(
                f"OT {ot.numero_ot}: fechas de facturación limpiadas "
                f"(todas las facturas vinculadas fueron desasociadas)"
            )
```

**Registrar el signal en `backend/sales/apps.py`:**

```python
from django.apps import AppConfig

class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sales'

    def ready(self):
        import sales.signals  # noqa: F401
```

**Crear archivo `backend/sales/signals.py`:**

```python
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import InvoiceSalesMapping
from invoices.models import Invoice
import logging

logger = logging.getLogger(__name__)

@receiver(post_delete, sender=InvoiceSalesMapping)
def limpiar_fechas_al_desasociar(sender, instance, **kwargs):
    # ... (código del fix arriba)
```

---

## 🎯 RESUMEN DE CAMBIOS

| Fix | Archivo | Cambio | Impacto |
|-----|---------|--------|---------|
| **1** | `sales/serializers.py` | Excluir facturas anuladas | Evita actualizar facturas inactivas |
| **2** | `invoices/signals.py` | Sincronizar `fecha_facturacion` Invoice → OT | Mantiene consistencia bidireccional |
| **3** | `sales/signals.py` (nuevo) | Limpiar fechas al desasociar | Evita fechas huérfanas |

---

## ✅ TESTING DESPUÉS DE FIXES

### Test 1: Editar Invoice.fecha_facturacion manualmente
```python
# Antes del fix: OT NO se actualizaba
# Después del fix: OT SÍ se actualiza automáticamente
```

### Test 2: Desasociar factura de costo
```python
# Antes del fix: Fechas quedaban huérfanas
# Después del fix: Fechas se limpian si no hay otras asociaciones
```

### Test 3: Asociar factura anulada
```python
# Antes del fix: Se actualizaba igual
# Después del fix: Se excluye automáticamente
```

---

## 🚀 IMPLEMENTACIÓN

1. Aplicar **FIX 1** en `sales/serializers.py`
2. Aplicar **FIX 2** en `invoices/signals.py`
3. Crear archivos para **FIX 3**:
   - `sales/signals.py`
   - Modificar `sales/apps.py`
4. Ejecutar migraciones (si aplica)
5. Ejecutar tests exhaustivos
6. Commit con mensaje descriptivo

---

## 📝 NOTAS FINALES

- **Opción A (Sobreescribir siempre)** se mantiene como comportamiento por defecto
- Si se desea advertir al usuario antes de sobreescribir, agregar validación en el frontend
- Todos los fixes son **backward compatible** y no rompen funcionalidad existente
- Los signals usan flags para evitar loops infinitos

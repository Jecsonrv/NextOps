# Corrección en Lógica de Anulación y Provisión de Facturas

Este documento detalla las correcciones implementadas en el sistema de facturación para resolver inconsistencias relacionadas con el manejo de facturas anuladas y su impacto en las Órdenes de Trabajo (OTs) asociadas.

## Problema Original

Se detectaron dos problemas principales que no cumplían con la lógica de negocio deseada:

1.  **Cambio de Estado Incorrecto:** Al registrar una `fecha_provision` en una factura que ya estaba en estado `ANULADA` o `ANULADA PARCIALMENTE`, el sistema cambiaba incorrectamente su estado a `PROVISIONADA`. El comportamiento deseado es que se pueda registrar la fecha para fines contables, pero sin alterar el estado de anulación.

2.  **Sincronización Incorrecta con la OT:** Cuando una factura se anulaba (generalmente después de una disputa), la OT asociada no regresaba a un estado `PENDIENTE`. Permanecía incorrectamente vinculada a la factura anulada, impidiendo que una nueva factura correctiva pudiera ser asociada a la OT para completar el flujo de provisión.

## Soluciones Implementadas

Se realizaron dos cambios clave en el modelo `Invoice` (`backend/invoices/models.py`) para corregir estos comportamientos.

### 1. Lógica de Actualización de Estado más Estricta

Se modificó el método `save` del modelo `Invoice` para asegurar que el estado de una factura solo cambie a `PROVISIONADA` bajo condiciones específicas.

**Lógica Anterior:**
La lógica era demasiado permisiva y no prevenía adecuadamente el cambio de estado si la factura ya estaba anulada.

**Nueva Lógica:**
```python
# REGLA: Si se agrega fecha_provision, el estado cambia a 'provisionada' 
# SOLO SI el estado actual es 'pendiente' o 'en_revision'.
# Si el estado es 'anulada' o 'anulada_parcialmente', la fecha_provision se puede registrar
# pero NO debe cambiar el estado.
if self.fecha_provision and self.estado_provision in ['pendiente', 'en_revision']:
    self.estado_provision = 'provisionada'
```

**Impacto:**
- Ahora, solo las facturas que están `pendientes` o `en revisión` pasarán a `provisionadas` al recibir una fecha de provisión.
- Las facturas `anuladas` o `anulada_parcialmente` mantendrán su estado aunque se les registre una `fecha_provision`, cumpliendo con el requisito de negocio.

### 2. Corrección en la Sincronización con la OT

Se ajustó el método `debe_sincronizar_con_ot` para permitir que la lógica de sincronización se ejecute para las facturas anuladas.

**Lógica Anterior:**
El método explícitamente prevenía la sincronización para facturas en estado `anulada` o `anulada_parcialmente`, lo cual era la causa del segundo problema.

**Nueva Lógica:**
```python
def debe_sincronizar_con_ot(self):
    """
    Determina si los cambios de estado deben sincronizarse con la OT.
    (...)
    IMPORTANTE: Las facturas anuladas SÍ deben sincronizarse para poder
    desvincular la OT, es decir, resetear su estado a 'pendiente' y limpiar
    la fecha de provisión. La lógica para este reseteo está en _sincronizar_estado_con_ot.
    """
    return self.es_costo_vinculado_ot() and self.ot is not None
```

**Impacto:**
- Al anular una factura, ahora se activa la sincronización con la OT.
- El método `_sincronizar_estado_con_ot` (que ya contenía la lógica correcta) ahora se ejecuta y se encarga de:
    - Cambiar el `estado_provision` de la OT a `PENDIENTE`.
    - Limpiar la `fecha_provision` de la OT.
- Esto "libera" la OT, dejándola lista para que una nueva factura del proveedor sea asignada y complete el ciclo de provisión correctamente.

## Conclusión

Con estas dos correcciones, el sistema ahora maneja el ciclo de vida de las facturas anuladas y su relación con las OTs de manera robusta y acorde a las especificaciones, asegurando la integridad de los datos y la correcta continuación de los flujos de trabajo.

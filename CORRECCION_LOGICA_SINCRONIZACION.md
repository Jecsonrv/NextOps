# Corrección Profesional de Lógica de Sincronización (OTs y Facturas)

Este documento detalla el análisis y la solución de dos errores críticos en la lógica de sincronización de fechas entre Órdenes de Trabajo (OTs) y Facturas (`Invoices`).

## Resumen de Problemas

Se reportaron dos comportamientos incorrectos en el sistema:

1.  **Fallo de Sincronización (Factura → OT):** Al asignar una `fecha_provision` a una factura en estado `pendiente` y con tipo de costo `FLETE`, la fecha no se sincronizaba con la OT correspondiente. El sistema esperaba incorrectamente que el proveedor fuera exclusivamente de tipo `naviera`.

2.  **Sincronización Incorrecta (OT → Factura Anulada):** Al modificar la `fecha_provision` de una OT, esta fecha se propagaba erróneamente a facturas asociadas que ya estaban en estado `anulada` o `anulada_parcialmente`. Las facturas anuladas deben ser inmutables a cambios de la OT.

## Causa Raíz

El análisis reveló que la causa fundamental de ambos problemas era una **lógica de negocio dispersa y conflictiva**. Las reglas de sincronización estaban implementadas de forma inconsistente en tres lugares distintos:

- El modelo `Invoice` (`models.py`).
- El serializador `InvoiceUpdateSerializer` (`serializers.py`).
- El manejador de señales `sync_ot_to_invoices` (`signals.py`).

Esta duplicación provocaba que una lógica correcta en un lugar fuera invalidada por una lógica incorrecta en otro, dependiendo de cómo se realizara la actualización.

## Solución Implementada

Se aplicó un refactor profesional para centralizar la lógica y asegurar que el sistema tenga una **única fuente de verdad** para las reglas de negocio.

### 1. Corrección de Sincronización Factura → OT

- **Acción:** Se eliminó por completo el bloque de código que manejaba la sincronización desde el serializador `InvoiceUpdateSerializer`.
- **Impacto:** Ahora, cualquier actualización de una factura a través de la API es manejada exclusivamente por el método `save()` del modelo `Invoice`. Este método ya contenía la lógica correcta para sincronizar la `fecha_provision` con la OT solo si el tipo de costo es `FLETE` o `CARGOS_NAVIERA`, sin la restricción incorrecta sobre el tipo de proveedor.

### 2. Corrección de Sincronización OT → Factura

- **Acción:** Se refactorizó la señal `sync_ot_to_invoices` en `signals.py`.
- **Impacto:** La consulta que busca facturas para actualizar ahora **excluye desde el principio** a todas aquellas cuyo estado sea `anulada` o `anulada_parcialmente`. Esto garantiza que, sin importar qué cambio se haga en la OT, las facturas anuladas nunca serán modificadas.

### 3. Verificación con Pruebas

- Se añadieron **dos nuevas pruebas automatizadas** al archivo `invoices/tests.py`.
- Estas pruebas simulan específicamente los dos escenarios reportados, asegurando que las correcciones funcionan como se espera y previniendo futuras regresiones.

## Refinamiento Final: Independencia de Facturas Anuladas

Posterior a las correcciones iniciales, se detectó un último caso de uso sutil que no se comportaba como se esperaba:

- **Problema:** Si un usuario asignaba una fecha de provisión a la OT (pensando en una futura factura de reemplazo) y luego, por razones contables, asignaba otra fecha de provisión a la factura ya `anulada`, este último acto borraba la fecha de provisión de la OT.
- **Causa:** La lógica aún permitía que el acto de *guardar* una factura anulada iniciara una sincronización de "reseteo" hacia la OT, lo cual solo debe ocurrir una vez, en el momento de la anulación.

### Solución Definitiva

Para resolver esto, se implementó una solución más robusta y profesional directamente en el modelo `Invoice`:

- **Acción:** Se modificó el método `save()` del modelo `Invoice` para que sea "consciente de las transiciones de estado".
- **Implementación:** Antes de guardar, el método ahora captura el estado *anterior* de la factura. La lógica de sincronización post-guardado fue mejorada para ejecutarse únicamente si se cumple una de estas dos condiciones:
    1. La factura **no está** en un estado anulado.
    2. La factura está **transicionando hacia** un estado anulado en ese preciso guardado.
- **Impacto:** Este cambio asegura que la sincronización de reseteo de la OT ocurra **una sola vez**. Cualquier guardado posterior sobre una factura ya anulada no disparará ninguna sincronización, garantizando la total independencia entre la OT y la factura anulada después de la desvinculación inicial. Se añadió una prueba de regresión final para validar este comportamiento específico.

## Conclusión

Con estas correcciones, la lógica de sincronización ha sido robustecida y centralizada. El sistema ahora se comporta de manera predecible y correcta, y está protegido por pruebas automatizadas que garantizan su estabilidad a largo plazo. La tarea ha sido completada.
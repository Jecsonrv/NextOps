# Solución: Manejo de Facturas de PLG El Salvador (Empresa Hermana)

## Problema

PLG DIVISIÓN ADUANAS recibe facturas de PLG EL SALVADOR (empresa hermana) que no corresponden a trámites propios y por lo tanto no tienen OT asociada. Estas facturas necesitan:

-   Registro en el sistema
-   Posibilidad de disputas/anulación
-   Tracking de estados
-   NO contaminar métricas operativas

## Solución Recomendada: OT Comodín + Filtros Inteligentes

### 1. Crear Cliente Especial

```
Nombre: PLG EL SALVADOR (Empresa Hermana)
Alias: PLGSV-HERMANA
Tipo: Inter-company
```

### 2. Crear OT Permanente

```
Número OT: OT-PLGSV-INTERCOMPANY
Cliente: PLG EL SALVADOR (Empresa Hermana)
Estado: transito (permanente)
Tipo: operaciones inter-company
Notas: "OT comodín para facturas de PLG El Salvador sin trámite asociado"
```

### 3. Proceso de Trabajo

#### Cuando llega una factura de PLG El Salvador:

1. **¿Es para un trámite tuyo?**

    - ✅ SÍ → Asignar a la OT real del trámite
    - ❌ NO → Asignar a `OT-PLGSV-INTERCOMPANY`

2. **Marcar con tipo de costo especial:**
    - Crear tipo: `INTER_COMPANY` (no vinculado a OT)
    - Esto permite identificarlas fácilmente en reportes

#### Flujo de disputa:

-   Funciona igual que cualquier factura
-   Se puede disputar, anular parcial/total
-   Se mantiene historial completo

### 4. Mejoras al Sistema (Opcionales)

#### A) Campo en Invoice: `es_inter_company`

```python
es_inter_company = models.BooleanField(
    default=False,
    db_index=True,
    help_text="Factura de operación inter-company (no operativa)"
)
```

#### B) Filtro Automático en Reportes

```python
# Excluir automáticamente facturas inter-company de métricas operativas
facturas_operativas = Invoice.objects.filter(
    es_inter_company=False
)
```

#### C) Vista Especial en Admin/Frontend

-   Sección dedicada: "Facturas Inter-Company"
-   Dashboard separado para estas operaciones
-   Alertas si hay muchas facturas acumuladas

### 5. Ventajas de esta Solución

✅ **Minimal impact:** No requiere cambios mayores al código
✅ **Flexible:** Funciona con el flujo actual de disputas/estados
✅ **Trazabilidad:** Historial completo de todas las facturas
✅ **Separación clara:** No contamina métricas operativas si se filtra
✅ **Escalable:** Si hay otras empresas hermanas, mismo patrón

### 6. Implementación Paso a Paso

#### Paso 1: Crear Cliente (En Django Admin)

```
Client Alias:
- Original Name: PLG EL SALVADOR (EMPRESA HERMANA)
- Short Name: PLGSV-HERMANA
- Normalized Name: plg_el_salvador_hermana
- Active: Yes
```

#### Paso 2: Crear OT Comodín (En Django Admin)

**Guía Completa de Campos para OT Comodín PLG El Salvador:**

| Campo                                   | Valor a Usar                                                                                                    | Explicación                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **📋 IDENTIFICACIÓN**                   |
| `numero_ot`                             | `OT-PLGSV-INTERCOMPANY`                                                                                         | Número único identificador                        |
| `cliente`                               | `PLG EL SALVADOR (EMPRESA HERMANA)`                                                                             | Cliente especial creado en Paso 1                 |
| `proveedor`                             | **VACÍO/NULL**                                                                                                  | No aplica - no es un proveedor específico         |
| **🚢 INFORMACIÓN DE EMBARQUE**          |
| `master_bl`                             | **VACÍO/NULL** o `N/A-INTERCOMPANY`                                                                             | No hay BL real                                    |
| `house_bls`                             | `[]` (array vacío)                                                                                              | No hay House BLs                                  |
| `contenedores`                          | `[]` (array vacío)                                                                                              | No hay contenedores                               |
| `barco`                                 | `N/A - INTERCOMPANY` o `-`                                                                                      | No hay barco                                      |
| `tipo_embarque`                         | `N/A - INTERCOMPANY` o `-`                                                                                      | No aplica                                         |
| **📍 PUERTOS Y FECHAS**                 |
| `puerto_origen`                         | **VACÍO** o `N/A`                                                                                               | No aplica                                         |
| `puerto_destino`                        | **VACÍO** o `N/A`                                                                                               | No aplica                                         |
| `fecha_eta`                             | **NULL** (vacío)                                                                                                | No aplica                                         |
| `fecha_llegada`                         | **NULL** (vacío)                                                                                                | No aplica                                         |
| `etd`                                   | **NULL** (vacío)                                                                                                | No aplica                                         |
| **👤 OPERACIÓN**                        |
| `operativo`                             | `INTER-COMPANY` o nombre del responsable                                                                        | Identifica tipo de operación                      |
| `tipo_operacion`                        | `importacion`                                                                                                   | Usar el más común en tu operación                 |
| `estado`                                | `transito` o `fact_adicionales`                                                                                 | Estado permanente (recomiendo `fact_adicionales`) |
| **💰 FACTURACIÓN Y PROVISIÓN**          |
| `fecha_provision`                       | **NULL** (vacío)                                                                                                | Se llenará con las facturas individuales          |
| `estado_provision`                      | `pendiente`                                                                                                     | Cambiará según facturas                           |
| `fecha_solicitud_facturacion`           | **NULL**                                                                                                        | No aplica                                         |
| `fecha_recepcion_factura`               | **NULL**                                                                                                        | Se actualizará automáticamente                    |
| `estado_facturado`                      | `pendiente`                                                                                                     | Se actualizará automáticamente                    |
| **📝 EXPRESS RELEASE Y CONTRA ENTREGA** |
| `express_release_tipo`                  | `-`                                                                                                             | No aplica                                         |
| `express_release_fecha`                 | **NULL**                                                                                                        | No aplica                                         |
| `contra_entrega_tipo`                   | `-`                                                                                                             | No aplica                                         |
| `contra_entrega_fecha`                  | **NULL**                                                                                                        | No aplica                                         |
| `envio_cierre_ot`                       | **NULL**                                                                                                        | No aplica                                         |
| **📊 PROVISIÓN**                        |
| `provision_hierarchy`                   | `{}` (objeto vacío)                                                                                             | Se calculará con las facturas                     |
| `provision_source`                      | **VACÍO**                                                                                                       | No tiene fuente                                   |
| `provision_locked`                      | `False`                                                                                                         | No bloquear                                       |
| `provision_updated_by`                  | **VACÍO**                                                                                                       | No aplica                                         |
| **💬 NOTAS Y COMENTARIOS**              |
| `notas`                                 | `OT comodín para facturas inter-company de PLG El Salvador sin trámite asociado. NO usar para trámites reales.` | Documentación importante                          |
| `comentarios`                           | `Esta OT agrupa todas las facturas de PLG El Salvador que no corresponden a trámites de PLG División Aduanas.`  | Explicación adicional                             |

**📋 CONFIGURACIÓN MÍNIMA REQUERIDA:**

```
✅ OBLIGATORIOS:
- Número OT: OT-PLGSV-INTERCOMPANY
- Cliente: PLG EL SALVADOR (EMPRESA HERMANA)
- Estado: fact_adicionales (o transito)
- Tipo Operación: importacion

⚪ DEJAR VACÍO/NULL:
- Proveedor
- Master BL, House BLs, Contenedores
- Fechas (ETA, llegada, ETD)
- Puertos

➖ USAR VALORES PLACEHOLDER:
- Operativo: "INTER-COMPANY"
- Barco: "N/A - INTERCOMPANY" o "-"
- Tipo Embarque: "N/A - INTERCOMPANY" o "-"
```

**💡 RECOMENDACIÓN DE ESTADO:**

-   **`fact_adicionales`** ← MEJOR opción (indica facturas adicionales/especiales)
-   `transito` (también válido, pero menos descriptivo)
-   `cerrada` (NO recomendado - parece terminada)
-   `finalizada` (NO recomendado - parece terminada)

#### Paso 3: Crear Tipo de Costo (En Django Admin - Catalogs > Cost Types)

```
Cost Type:
- Code: INTER_COMPANY
- Name: Operación Inter-Company
- Description: "Facturas de empresas hermanas sin trámite asociado"
- Is Linked to OT: NO (unchecked)
- Active: Yes
```

#### Paso 4: Proceso Operativo

1. Cuando llega factura de PLG El Salvador:
    - Si NO es tu trámite → Asignar a `OT-PLGSV-INTERCOMPANY`
    - Tipo de costo: `INTER_COMPANY`
2. Si necesitan disputar/anular:
    - Crear disputa normal
    - Marcar resultado
    - Sistema actualiza estados automáticamente

### 7. Alternativa: Si quieres separación MÁS estricta

Si en el futuro la OT tiene DEMASIADAS facturas (100+), puedes:

**Opción A: OTs anuales**

```
OT-PLGSV-INTERCOMPANY-2024
OT-PLGSV-INTERCOMPANY-2025
```

**Opción B: OTs trimestrales**

```
OT-PLGSV-Q1-2024
OT-PLGSV-Q2-2024
```

Esto mantiene la lógica pero agrupa mejor las facturas.

### 8. Reportería

#### Consulta para facturas inter-company:

```python
facturas_plgsv = Invoice.objects.filter(
    ot__numero_ot='OT-PLGSV-INTERCOMPANY'
)
```

#### Consulta para facturas SOLO operativas:

```python
facturas_operativas = Invoice.objects.exclude(
    ot__numero_ot='OT-PLGSV-INTERCOMPANY'
)
```

#### Dashboard sugerido:

-   **Sección:** "Facturas Inter-Company"
    -   Total facturas recibidas de PLGSV
    -   Facturas disputadas
    -   Facturas anuladas
    -   Monto total vs monto aplicable

## Resumen

Esta solución te permite:

-   ✅ Registrar todas las facturas de PLG El Salvador
-   ✅ Disputar/anular cuando sea necesario
-   ✅ Mantener historial completo
-   ✅ No contaminar tus métricas operativas
-   ✅ Escalar si aparecen otras empresas hermanas
-   ✅ Funciona con el sistema actual sin cambios mayores

**Próximos pasos:**

1. Crear cliente "PLG EL SALVADOR (EMPRESA HERMANA)"
2. Crear OT comodín "OT-PLGSV-INTERCOMPANY"
3. Crear tipo de costo "INTER_COMPANY"
4. Documentar proceso operativo
5. (Opcional) Agregar filtros en frontend para separar reportes

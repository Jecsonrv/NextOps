# 📊 Resumen: Sistema de Gestión de Disputas

## ✅ Implementación Completada

### 🎯 Problema Resuelto

**Pregunta Original**: *"¿Cómo manejamos las disputas? ¿Qué estatus tendría al final? ¿Cómo sabe contabilidad que no se pagará? ¿Cómo evitamos que sume en estadísticas?"*

**Solución Implementada**: Sistema profesional completo con flujo de estados, vinculación por tipo de costo, y exclusión automática de estadísticas.

---

## 🔑 Conceptos Clave

### 1. Estados de Factura
```
PENDIENTE → REVISION → PROVISIONADA ✅ (A contabilidad)
         ↓
      DISPUTADA ⚠️ (NO se paga hasta resolver)
         ↓
      [Resolución]
         ↓
      ANULADA ❌ (NO se paga, excluida de stats)
      ANULADA_PARCIALMENTE 🔄 (Monto ajustado)
      RECHAZADA 🚫 (No procede)
```

### 2. Resultados de Disputa
```
APROBADA_TOTAL      → Factura ANULADA (no se paga)
APROBADA_PARCIAL    → Factura ajustada (se paga menos)
RECHAZADA           → Factura PENDIENTE (se paga completa)
ANULADA             → Factura PENDIENTE (error nuestro)
```

### 3. Vinculación por Tipo de Costo

#### Costos Vinculados a OT
- **FLETE** y **CARGOS_NAVIERA**
- ✅ Se sincronizan con OT
- ✅ Heredan fecha_provision de OT
- ✅ Cambios visibles en OTsPage

#### Costos Auxiliares
- **TRANSPORTE**, **ADUANA**, **ALMACENAJE**, **DEMORA**, **OTRO**
- ❌ NO se sincronizan con OT
- ✅ Gestión independiente
- ✅ Solo visibles en lista de facturas

---

## 📋 Respuestas a tus Preguntas

### ❓ "¿Qué estatus tendría al final?"

**Respuesta**: Depende del resultado de la disputa:

| Resultado Disputa | Estado Final Factura | ¿Se Paga? |
|-------------------|---------------------|-----------|
| Aprobada Total | `ANULADA` | ❌ NO |
| Aprobada Parcial | `ANULADA_PARCIALMENTE` → `PROVISIONADA` | ✅ SÍ (monto ajustado) |
| Rechazada | `PENDIENTE` → `PROVISIONADA` | ✅ SÍ (monto completo) |
| Anulada (error) | `PENDIENTE` → `PROVISIONADA` | ✅ SÍ |

### ❓ "¿Cómo sabe contabilidad que no se pagará?"

**Respuesta**: Contabilidad **solo recibe facturas en estado `PROVISIONADA`**.

- Facturas `DISPUTADAS` → NO aparecen hasta resolver
- Facturas `ANULADAS` → NUNCA aparecen
- Facturas `RECHAZADAS` → NO aparecen

### ❓ "¿Cómo evitamos que sume en estadísticas?"

**Respuesta**: Exclusión automática en el endpoint `/api/invoices/stats/`:

```python
# Se excluyen automáticamente:
estado_provision in ['anulada', 'rechazada', 'disputada']
```

**Estadísticas incluyen**:
- `total_disputadas`: Facturas en disputa (informativo)
- `total_anuladas`: Facturas anuladas (informativo)
- `total_monto`: Solo facturas válidas para pagar

---

## 🔄 Flujo Operativo Completo

### Ejemplo 1: Factura de Flete Incorrecta ($1,000)

```
1. Factura recibida → PENDIENTE
2. Operativo detecta error → Crea disputa
3. Factura → DISPUTADA (no se provisiona)
4. OT también → DISPUTADA (porque es FLETE)
5. Gestión con naviera → Acepta 100%
6. Operativo: resultado = APROBADA_TOTAL
7. Automático:
   - Factura → ANULADA
   - OT actualizada
   - Excluida de stats
   - Nota agregada
8. Contabilidad: NO recibe esta factura ✅
```

### Ejemplo 2: Factura de Demoras Parcial ($1,000 → $600)

```
1. Factura recibida → PENDIENTE
2. Operativo crea disputa por $400
3. Factura → DISPUTADA
4. OT NO se afecta (porque es DEMORA, no FLETE)
5. Proveedor acepta $400 de ajuste
6. Operativo: resultado = APROBADA_PARCIAL, monto_recuperado = 400
7. Se crea nota de crédito por $400
8. Automático:
   - Factura → ANULADA_PARCIALMENTE
   - monto_original = 1000
   - monto = 600
   - Factura → PROVISIONADA (con $600)
9. Contabilidad: Recibe factura por $600 ✅
```

### Ejemplo 3: Disputa Rechazada

```
1. Factura recibida → PENDIENTE
2. Operativo crea disputa
3. Factura → DISPUTADA
4. Proveedor rechaza con evidencia
5. Operativo: resultado = RECHAZADA
6. Automático:
   - Factura → PENDIENTE
   - Requiere nueva revisión
7. Operativo revisa → PROVISIONADA
8. Contabilidad: Recibe factura completa ✅
```

---

## 🛠️ Archivos Modificados

### Backend
- ✅ `backend/invoices/models.py` - Modelos actualizados
- ✅ `backend/invoices/serializers.py` - Serializers con nuevos campos
- ✅ `backend/invoices/views.py` - Estadísticas con exclusión
- ✅ `backend/invoices/migrations/0010_dispute_resultado_monto_recuperado.py` - Migración

### Documentación
- ✅ `SISTEMA_DISPUTAS.md` - Documentación completa
- ✅ `RESUMEN_DISPUTAS.md` - Este archivo
- ✅ `aplicar_migraciones_disputas.bat` - Script para aplicar migraciones

---

## 🚀 Próximos Pasos

### Inmediato
1. **Aplicar migración**: Ejecutar `aplicar_migraciones_disputas.bat`
2. **Verificar**: Probar creación de disputa en el sistema

### Frontend (Pendiente)
1. Actualizar `DisputeFormModal`:
   - Agregar campo `resultado` (select)
   - Agregar campo `monto_recuperado` (number)
2. Actualizar `DisputeDetailPage`:
   - Mostrar resultado con badge de color
   - Timeline visual con eventos
3. Agregar badges en `InvoiceList`:
   - Badge "En Disputa" (amarillo)
   - Badge "Anulada" (rojo)
   - Badge "Anulada Parcial" (naranja)
4. Indicadores en `OTsPage`:
   - Solo para costos vinculados (FLETE/CARGOS_NAVIERA)
   - Icono de advertencia si factura disputada

---

## 📞 Preguntas Frecuentes

### ¿Puedo tener múltiples disputas en una factura?
**No**. Solo puede haber UNA disputa activa (abierta o en_revision) por factura. Debe resolverse antes de crear otra.

### ¿Qué pasa si marco una factura como PROVISIONADA manualmente?
Si es un **costo vinculado** (FLETE/CARGOS_NAVIERA), la OT también se actualizará automáticamente.

### ¿Las facturas auxiliares afectan el estado de la OT?
**No**. Solo los costos FLETE y CARGOS_NAVIERA se sincronizan con la OT.

### ¿Cómo sé qué facturas están excluidas de estadísticas?
Usa el campo `debe_excluirse_estadisticas` en el serializer, o filtra por `estado_provision in ['anulada', 'rechazada', 'disputada']`.

### ¿Se pueden reabrir disputas cerradas?
Sí, puedes cambiar el estado de `cerrada` a `en_revision` si es necesario.

---

## ✨ Beneficios del Sistema

1. ✅ **Trazabilidad completa** - Timeline de eventos
2. ✅ **Automatización** - Transiciones de estado automáticas
3. ✅ **Claridad para contabilidad** - Solo reciben facturas PROVISIONADAS
4. ✅ **Estadísticas precisas** - Exclusión automática de facturas no válidas
5. ✅ **Vinculación inteligente** - Por tipo de costo
6. ✅ **Profesional** - Siguiendo mejores prácticas de la industria

---

**Última actualización**: 2025-10-11 18:03

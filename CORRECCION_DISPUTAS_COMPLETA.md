# Corrección Completa del Sistema de Disputas

**Fecha:** 12 de octubre, 2025  
**Módulo:** Backend Invoices + Frontend InvoiceDetailPage

## Problemas Identificados y Corregidos

### 1. ❌ Fecha de Provisión NO se Limpiaba al Crear Disputa
**Problema:** Al disputar una factura, la `fecha_provision` no se limpiaba automáticamente.

**Solución Implementada:**
```python
# backend/invoices/models.py - Línea 704
if is_new and self.invoice:
    self.invoice.estado_provision = 'disputada'
    self.invoice.fecha_provision = None  # ✅ CORREGIDO: Limpiar fecha de provisión
    self.invoice.save(update_fields=['estado_provision', 'fecha_provision'])
```

---

### 2. ❌ Lógica de Estados Incorrecta (Anulada vs Anulada Parcialmente)
**Problema:** La lógica NO consideraba **múltiples disputas** y usaba `>=` en lugar de comparación exacta.

**Ejemplo del Error:**
- Factura de $1000
- Disputa 1: $500 aprobada parcial → recuperó $300
- Disputa 2: $200 aprobada parcial → recuperó $100
- **Total Anulado:** $400
- **Estado Correcto:** Anulada Parcialmente
- **Error Previo:** Cada disputa sobrescribía el cálculo, ignorando las otras

**Solución Implementada:**
```python
# backend/invoices/models.py - Método _actualizar_factura_por_resultado()

# ✅ NUEVO: Calcular monto anulado de TODAS las disputas aprobadas
disputas_aprobadas = Dispute.objects.filter(
    invoice=self.invoice,
    is_deleted=False
).filter(
    Q(resultado='aprobada_total') | Q(resultado='aprobada_parcial')
)

total_anulado = Decimal('0.00')
for disputa in disputas_aprobadas:
    if disputa.resultado == 'aprobada_total':
        total_anulado += disputa.monto_disputa
    elif disputa.resultado == 'aprobada_parcial':
        total_anulado += (disputa.monto_recuperado or Decimal('0.00'))

# ✅ Calcular monto aplicable basado en el monto ORIGINAL
nuevo_monto_aplicable = self.invoice.monto - total_anulado

# ✅ REGLA CORRECTA: Anulada SOLO si total_anulado == monto_original
if abs(total_anulado - monto_original) < Decimal('0.01'):
    # Anulación TOTAL (100%)
    self.invoice.estado_provision = 'anulada'
else:
    # Anulación PARCIAL
    self.invoice.estado_provision = 'anulada_parcialmente'
```

**Reglas de Negocio Implementadas:**
- ✅ **Anulada Totalmente:** SOLO si `Monto Anulado Total == Monto Original` (con tolerancia de $0.01)
- ✅ **Anulada Parcialmente:** Si `Monto Anulado Total > 0` pero `< Monto Original`
- ✅ **Monto Aplicable:** Siempre calculado como `Monto Original - Total Anulado de TODAS las disputas`

---

### 3. ❌ NO se Mostraba Resolución en Frontend
**Problema:** En `InvoiceDetailPage.jsx`, las disputas resueltas NO mostraban el resumen del ajuste (similar al modal de resolución).

**Solución Implementada:**
```jsx
{/* Resumen de Resolución */}
{dispute.estado === 'resuelta' && dispute.resultado && dispute.resultado !== 'pendiente' && (
    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
        <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
            Resumen de Resolución
        </h5>
        <div className="space-y-1 text-sm">
            {/* Aprobada Total */}
            {dispute.resultado === 'aprobada_total' && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Monto Original:</span>
                        <span className="font-semibold">${invoice.monto}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-600">
                        <span>Monto Anulado (100% disputa):</span>
                        <span className="font-semibold">-${dispute.monto_disputa}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t">
                        <span className="font-semibold text-gray-800">Monto Aplicable:</span>
                        <span className="font-bold text-green-600">
                            ${invoice.monto_aplicable}
                        </span>
                    </div>
                </>
            )}
            
            {/* Aprobada Parcial */}
            {dispute.resultado === 'aprobada_parcial' && dispute.monto_recuperado > 0 && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Monto Original:</span>
                        <span className="font-semibold">${invoice.monto}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Monto en Disputa:</span>
                        <span className="font-semibold">${dispute.monto_disputa}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                        <span>Monto Recuperado:</span>
                        <span className="font-semibold">-${dispute.monto_recuperado}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t">
                        <span className="font-semibold text-gray-800">Nuevo Monto Factura:</span>
                        <span className="font-bold text-blue-600">
                            ${invoice.monto_aplicable}
                        </span>
                    </div>
                </>
            )}
            
            {/* Resolución (texto) */}
            {dispute.resolucion && (
                <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-600 mb-1">Resolución:</p>
                    <p className="text-sm text-gray-800 italic">{dispute.resolucion}</p>
                </div>
            )}
        </div>
    </div>
)}
```

**Visualización Mejorada:**
- ✅ Muestra desglose completo del ajuste
- ✅ Códigos de color semánticos (verde para recuperado, rojo para anulado)
- ✅ Incluye descripción de la resolución
- ✅ Badges de resultado (Aprobada Total, Aprobada Parcial, Rechazada, Anulada)

---

### 4. ✅ Sincronización con OT (FLETE y CARGOS_NAVIERA)
**Verificado:** La sincronización se ejecuta correctamente en:

1. **Al crear disputa:**
```python
# Línea 708-709
if self.invoice.debe_sincronizar_con_ot():
    self.invoice._sincronizar_estado_con_ot()
```

2. **Al resolver disputa:**
```python
# Línea 845-846
if self.invoice.debe_sincronizar_con_ot():
    self.invoice._sincronizar_estado_con_ot()
```

3. **Al guardar factura (general):**
```python
# Línea 420-421
if self.debe_sincronizar_con_ot():
    self._sincronizar_estado_con_ot()
```

**Comportamiento Correcto:**
- ✅ **Costos Vinculados (FLETE, CARGOS_NAVIERA):**
  - Estado de factura → se sincroniza con estado de OT
  - `fecha_provision` de factura → se sincroniza con OT
  - Factura DISPUTADA → OT pasa a DISPUTADA
  - Factura ANULADA/ANULADA_PARCIALMENTE → OT también, y se limpia `fecha_provision`

- ✅ **Costos Auxiliares (TRANSPORTE, ADUANA, etc.):**
  - Gestión independiente, NO se sincronizan con OT

---

## Flujo Completo de Disputa (Corregido)

### Escenario 1: Aprobación Total
1. Usuario crea disputa de $500 en factura de $1000
2. **Backend automático:**
   - Factura → Estado: `disputada`
   - Factura → `fecha_provision = null` ✅
   - Si es FLETE/CARGOS_NAVIERA → OT también pasa a `disputada` ✅
3. Usuario resuelve con resultado: `aprobada_total`
4. **Backend automático:**
   - Total anulado = $500
   - Monto aplicable = $1000 - $500 = $500
   - Estado: `anulada_parcialmente` (porque $500 ≠ $1000) ✅
   - Si es FLETE/CARGOS_NAVIERA → OT pasa a `anulada_parcialmente` ✅
5. **Frontend:** Muestra resumen de ajuste en detalle de factura ✅

### Escenario 2: Anulación Total de Factura
1. Factura de $1000 con dos disputas:
   - Disputa A: $600 → Aprobada total ($600 anulados)
   - Disputa B: $400 → Aprobada total ($400 anulados)
2. **Backend automático:**
   - Total anulado = $600 + $400 = $1000
   - Monto aplicable = $1000 - $1000 = $0
   - Estado: `anulada` (porque $1000 == $1000) ✅
   - `fecha_provision = null`
   - Si es FLETE/CARGOS_NAVIERA → OT pasa a `anulada` ✅
3. **Frontend:** Muestra ambas disputas con sus respectivos resúmenes ✅

### Escenario 3: Disputa Rechazada
1. Usuario crea y resuelve disputa con resultado: `rechazada`
2. **Backend automático:**
   - Total anulado = $0
   - Monto aplicable = monto original (sin cambios)
   - Estado: `pendiente` (debe pagarse) ✅
   - Si es FLETE/CARGOS_NAVIERA → OT vuelve a estado anterior ✅
3. **Frontend:** Muestra mensaje "Disputa rechazada por proveedor" ✅

---

## Archivos Modificados

### Backend
- ✅ `backend/invoices/models.py`
  - Método `Dispute.save()` → Limpia `fecha_provision` al crear disputa
  - Método `Dispute._actualizar_factura_por_resultado()` → Lógica completamente reescrita

### Frontend
- ✅ `frontend/src/pages/InvoiceDetailPage.jsx`
  - Sección de disputas → Agregado resumen de resolución
  - Badges de resultado → Visualización mejorada

---

## Pruebas Recomendadas

### Test 1: Disputa Simple con Aprobación Parcial
1. Crear factura de $1000 (FLETE)
2. Crear disputa de $500
3. Resolver con `aprobada_parcial`, monto recuperado $300
4. **Verificar:**
   - ✅ `monto_aplicable = $700`
   - ✅ `estado_provision = anulada_parcialmente`
   - ✅ OT en estado `anulada_parcialmente` (si es FLETE)
   - ✅ Frontend muestra resumen: Original $1000, Recuperado -$300, Nuevo $700

### Test 2: Múltiples Disputas con Anulación Total
1. Crear factura de $1000 (CARGOS_NAVIERA)
2. Crear disputa A de $600 → Resolver `aprobada_total`
3. Crear disputa B de $400 → Resolver `aprobada_total`
4. **Verificar:**
   - ✅ `monto_aplicable = $0`
   - ✅ `estado_provision = anulada` (no `anulada_parcialmente`)
   - ✅ OT en estado `anulada`
   - ✅ Frontend muestra ambos resúmenes

### Test 3: Disputa en Costo Auxiliar (sin OT)
1. Crear factura de $500 (TRANSPORTE)
2. Crear disputa → Resolver `aprobada_total`
3. **Verificar:**
   - ✅ Factura actualizada correctamente
   - ✅ OT NO afectada (costos auxiliares son independientes)

### Test 4: Disputa Rechazada
1. Crear factura de $800
2. Crear disputa → Resolver `rechazada`
3. **Verificar:**
   - ✅ `monto_aplicable = $800` (sin cambios)
   - ✅ `estado_provision = pendiente`
   - ✅ Frontend muestra "Disputa rechazada por proveedor"

---

## Estado del Sistema

### ✅ Completado
1. Limpieza de `fecha_provision` al crear disputa
2. Lógica correcta de estados (Anulada vs Anulada Parcialmente)
3. Cálculo correcto de `monto_aplicable` considerando TODAS las disputas
4. Resumen de resolución en frontend (InvoiceDetailPage)
5. Sincronización automática con OT para costos vinculados
6. Manejo correcto de múltiples disputas en una misma factura

### 📋 Pendiente (Opcional)
1. Tests unitarios automatizados
2. Migrar campos si hay datos en producción
3. Actualizar documentación de usuario

---

## Notas Importantes

1. **Tolerancia de Redondeo:** Se usa `abs(total_anulado - monto_original) < Decimal('0.01')` para evitar problemas de precisión decimal.

2. **Múltiples Disputas:** El sistema ahora suma correctamente TODAS las disputas aprobadas antes de determinar el estado final.

3. **Costos Vinculados:** Solo FLETE y CARGOS_NAVIERA se sincronizan con OT. Los demás costos (TRANSPORTE, ADUANA, etc.) son independientes.

4. **Eventos de Disputa:** Se crean automáticamente eventos en el timeline cuando se cambia el resultado.

---

**Autor:** Cascade AI  
**Revisión:** Requerida antes de deploy a producción

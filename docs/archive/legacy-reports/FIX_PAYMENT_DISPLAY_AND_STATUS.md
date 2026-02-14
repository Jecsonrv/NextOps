# 🔧 FIX: Visualización de Comprobantes y Estado de Facturas

## 🐛 Problemas Detectados

1. **No se puede ver el comprobante de pago** - Faltaba columna en la tabla
2. **La factura no se marca como pagada** - Los pagos requieren validación
3. **Nombres de campos incorrectos** - `numero_referencia` vs `referencia`, `factura_venta` vs `sales_invoice`
4. **Estado incorrecto** - `pendiente` vs `pendiente_validacion`

---

## 📊 Análisis del Flujo de Pagos

### Flujo Backend:

```
1. Usuario registra pago
   ↓
2. Pago se crea con estado: "pendiente_validacion"
   ↓
3. Finanzas revisa el pago
   ↓
4. Finanzas VALIDA o RECHAZA el pago
   ↓
5. Si se VALIDA → Se actualiza monto_pagado de la factura
   ↓
6. Factura recalcula su estado_pago automáticamente
```

### Método `_actualizar_factura()` del modelo `Payment`:

```python
def _actualizar_factura(self):
    """Actualiza el monto pagado de la factura"""
    total_pagado = self.sales_invoice.payments.filter(
        estado='validado'  # ⚠️ SOLO pagos validados
    ).aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')

    self.sales_invoice.monto_pagado = total_pagado
    self.sales_invoice.save()
```

### Método `save()` de `SalesInvoice`:

```python
# Actualizar estado de pago automáticamente
if self.monto_pagado == 0:
    self.estado_pago = 'pendiente'
elif self.monto_pagado >= self.monto_total:
    self.estado_pago = 'pagado_total'
    # Si está en pendiente_cobro, mover a pagada
    if self.estado_facturacion == 'pendiente_cobro':
        self.estado_facturacion = 'pagada'
else:
    self.estado_pago = 'pagado_parcial'
```

---

## ✅ Correcciones Aplicadas

### 1. **PaymentsPage.jsx** - Columna de Comprobante

**Agregada nueva columna en `<thead>`**:

```jsx
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
    Comprobante
</th>
```

**Agregada celda en `<tbody>`**:

```jsx
<td className="px-6 py-4 whitespace-nowrap text-sm">
    {payment.archivo_comprobante ? (
        <a
            href={payment.archivo_comprobante}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
            <FileText className="h-4 w-4" />
            Ver
        </a>
    ) : (
        <span className="text-gray-400">Sin comprobante</span>
    )}
</td>
```

### 2. **PaymentsPage.jsx** - Nombres de Campos Correctos

**Campo de referencia**:

```jsx
// ANTES ❌
{
    payment.numero_referencia || "-";
}

// DESPUÉS ✅
{
    payment.referencia || "-";
}
```

**Campo de factura**:

```jsx
// ANTES ❌
to={`/sales/invoices/${payment.factura_venta}`}
{payment.factura_venta_numero || payment.factura_venta}

// DESPUÉS ✅
to={`/sales/invoices/${payment.sales_invoice}`}
{payment.factura_venta_numero || payment.sales_invoice}
```

### 3. **PaymentsPage.jsx** - Estado Correcto

**Choices de estado**:

```jsx
// ANTES ❌
const ESTADO_CHOICES = [
    { value: "pendiente", label: "Pendiente", variant: "warning" },
    { value: "validado", label: "Validado", variant: "success" },
    { value: "rechazado", label: "Rechazado", variant: "destructive" },
];

// DESPUÉS ✅
const ESTADO_CHOICES = [
    { value: "pendiente_validacion", label: "Pendiente", variant: "warning" },
    { value: "validado", label: "Validado", variant: "success" },
    { value: "rechazado", label: "Rechazado", variant: "destructive" },
];
```

**Condición para mostrar botones**:

```jsx
// ANTES ❌
{payment.estado === "pendiente" && (

// DESPUÉS ✅
{payment.estado === "pendiente_validacion" && (
```

**Contador de pendientes**:

```jsx
// ANTES ❌
payments.results.filter((p) => p.estado === "pendiente").length;

// DESPUÉS ✅
payments.results.filter((p) => p.estado === "pendiente_validacion").length;
```

### 4. **Importación de FileText**:

```jsx
import {
    Search,
    Filter,
    DollarSign,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    FileText, // ✅ Agregado
} from "lucide-react";
```

---

## 🎯 Flujo de Usuario Correcto

### Escenario: Registrar y validar un pago

1. **Usuario registra pago**:

    - Selecciona factura
    - Ingresa monto
    - Adjunta comprobante
    - Envía formulario
    - ✅ Pago creado con estado: `pendiente_validacion`

2. **Estado de la factura**:

    - ⚠️ **AÚN NO se actualiza** `monto_pagado`
    - ⚠️ **AÚN NO cambia** `estado_pago`
    - ℹ️ Esto es correcto - espera validación

3. **Finanzas revisa el pago**:

    - Ve el pago en estado `pendiente_validacion`
    - Ve el comprobante (si fue adjuntado)
    - Verifica la información

4. **Finanzas VALIDA el pago**:

    - Click en botón ✅ (CheckCircle)
    - Backend ejecuta `payment.validar(user)`
    - Se actualiza estado a `validado`
    - **SE EJECUTA** `_actualizar_factura()`
    - ✅ Se suma el monto a `monto_pagado`
    - ✅ Se recalcula `estado_pago`
    - ✅ Si el pago completa la factura → `pagado_total`

5. **Resultado final**:
    - Pago: estado `validado`
    - Factura: `monto_pagado` actualizado
    - Factura: `estado_pago` actualizado (pendiente/pagado_parcial/pagado_total)

---

## ⚠️ IMPORTANTE: Por Qué los Pagos Necesitan Validación

### Razones del Diseño:

1. **Control Financiero**:

    - No todos los pagos registrados son reales
    - Pueden haber errores de captura
    - Evita fraudes o registros incorrectos

2. **Doble Verificación**:

    - Usuario de ventas registra
    - Finanzas valida con comprobante
    - Reduce errores

3. **Trazabilidad**:

    - Se sabe quién registró el pago
    - Se sabe quién lo validó
    - Fecha de validación

4. **Posibilidad de Rechazo**:
    - Si el pago es incorrecto, se rechaza
    - No afecta el estado de la factura
    - Se puede registrar un nuevo pago corregido

---

## 🔄 Opciones de Configuración (Si se Requiere)

### Opción 1: Auto-validar pagos (NO RECOMENDADO)

Si se quiere que los pagos se validen automáticamente:

```python
# backend/sales/models.py - Payment.save()

def save(self, *args, **kwargs):
    # Auto-validar al crear (NO RECOMENDADO EN PRODUCCIÓN)
    if not self.pk:  # Si es un nuevo pago
        self.estado = 'validado'
        self.validado_por = self.registrado_por
        from django.utils import timezone
        self.fecha_validacion = timezone.now()

    super().save(*args, **kwargs)

    if self.estado == 'validado':
        self._actualizar_factura()
```

⚠️ **RIESGO**: Elimina el control financiero y la doble verificación.

### Opción 2: Validación Opcional por Rol

Configurar que solo ciertos roles requieren validación:

```python
def save(self, *args, **kwargs):
    # Si el usuario que registra es de finanzas, auto-validar
    if self.registrado_por and self.registrado_por.groups.filter(name='Finanzas').exists():
        if not self.pk:  # Nuevo pago
            self.estado = 'validado'
            self.validado_por = self.registrado_por
            from django.utils import timezone
            self.fecha_validacion = timezone.now()

    super().save(*args, **kwargs)

    if self.estado == 'validado':
        self._actualizar_factura()
```

---

## 🧪 Pruebas Recomendadas

### Test 1: Ver comprobante de pago

1. ✅ Registrar pago con archivo adjunto
2. ✅ Ir a lista de pagos
3. ✅ Verificar columna "Comprobante"
4. ✅ Click en "Ver" → debe abrir el archivo

### Test 2: Flujo de validación completo

1. ✅ Registrar pago de $1,000 para factura de $2,000
2. ✅ Verificar factura aún muestra `estado_pago: pendiente`
3. ✅ Verificar `monto_pagado: $0` (pago no validado)
4. ✅ Validar el pago en lista de pagos
5. ✅ Verificar factura actualiza a `estado_pago: pagado_parcial`
6. ✅ Verificar `monto_pagado: $1,000`
7. ✅ Registrar segundo pago de $1,000
8. ✅ Validar segundo pago
9. ✅ Verificar factura actualiza a `estado_pago: pagado_total`
10. ✅ Verificar `estado_facturacion: pagada`

### Test 3: Rechazo de pago

1. ✅ Registrar pago incorrecto
2. ✅ Rechazar con motivo en modal
3. ✅ Verificar estado cambia a `rechazado`
4. ✅ Verificar factura NO se actualiza
5. ✅ Registrar nuevo pago correcto
6. ✅ Validar y verificar factura se actualiza

---

## 📊 Resumen de Cambios

| Componente         | Cambio                                                | Resultado                                             |
| ------------------ | ----------------------------------------------------- | ----------------------------------------------------- |
| `PaymentsPage.jsx` | Agregada columna "Comprobante"                        | ✅ Se puede ver/descargar comprobante                 |
| `PaymentsPage.jsx` | Corregido `numero_referencia` → `referencia`          | ✅ Se muestra la referencia correcta                  |
| `PaymentsPage.jsx` | Corregido `factura_venta` → `sales_invoice`           | ✅ Links funcionan correctamente                      |
| `PaymentsPage.jsx` | Corregido estado `pendiente` → `pendiente_validacion` | ✅ Botones de validar/rechazar aparecen               |
| `PaymentsPage.jsx` | Contador de pendientes actualizado                    | ✅ Estadísticas correctas                             |
| Backend            | Explicado flujo de validación                         | ℹ️ Pagos requieren validación para actualizar factura |

---

## ✨ Conclusión

El sistema ahora:

-   ✅ **Muestra comprobantes de pago** con botón "Ver"
-   ✅ **Usa nombres de campos correctos** del modelo backend
-   ✅ **Detecta estado correcto** (`pendiente_validacion`)
-   ℹ️ **Requiere validación** de pagos antes de actualizar facturas (por diseño)

El comportamiento de requerir validación es **CORRECTO** y **RECOMENDADO** para mantener control financiero. Las facturas se marcarán como pagadas **después** de que finanzas valide los pagos.

---

**Fecha**: 2025-11-02  
**Archivos modificados**:

-   `frontend/src/pages/sales/PaymentsPage.jsx`

**Estado**: ✅ **COMPLETADO**

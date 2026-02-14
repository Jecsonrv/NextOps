# 🔧 FIX: Corregidos Nombres de Campos en Formulario de Pagos

## 🐛 Problema Detectado

El formulario de registro de pagos (`PaymentFormPage.jsx`) estaba usando nombres de campos incorrectos que no coincidían con el modelo backend `Payment`:

### Error Original:

```json
{
  'referencia': [ErrorDetail(string='Este campo es requerido.', code='required')],
  'sales_invoice': [ErrorDetail(string='Este campo es requerido.', code='required')]
}
```

---

## 📊 Análisis del Modelo Backend

### Modelo: `backend/sales/models.py` - `Payment`

```python
class Payment(TimeStampedModel, SoftDeleteModel):
    # Relaciones
    sales_invoice = models.ForeignKey(
        'SalesInvoice',
        on_delete=models.CASCADE,
        related_name='payments',
        help_text="Factura de venta asociada"
    )

    # Información del pago
    fecha_pago = models.DateField(...)
    monto = models.DecimalField(...)
    metodo_pago = models.CharField(...)

    referencia = models.CharField(
        max_length=100,
        help_text="Número de referencia o transacción"
    )

    banco = models.CharField(
        max_length=100,
        blank=True,
        help_text="Banco de origen (si aplica)"
    )

    # Archivo
    archivo_comprobante = models.FileField(
        upload_to='payment_receipts/',
        storage=CloudinaryMediaStorage(),
        null=True,
        blank=True,
        help_text="Comprobante de pago (PDF, imagen)"
    )
```

---

## ✅ Correcciones Aplicadas

### Archivo: `frontend/src/pages/sales/PaymentFormPage.jsx`

#### 1. Estado Inicial del Formulario

**ANTES** ❌:

```javascript
const [formData, setFormData] = useState({
    factura_venta: preselectedInvoice || "", // ❌ Incorrecto
    monto: "",
    fecha_pago: getTodayString(),
    metodo_pago: "transferencia",
    numero_referencia: "", // ❌ Incorrecto
    banco_emisor: "", // ❌ Incorrecto
    banco_receptor: "", // ❌ Incorrecto
    notas: "",
});
```

**DESPUÉS** ✅:

```javascript
const [formData, setFormData] = useState({
    sales_invoice: preselectedInvoice || "", // ✅ Correcto
    monto: "",
    fecha_pago: getTodayString(),
    metodo_pago: "transferencia",
    referencia: "", // ✅ Correcto
    banco: "", // ✅ Correcto
    notas: "",
});
```

#### 2. Validación de Factura Seleccionada

**ANTES** ❌:

```javascript
const selectedInvoice = invoices?.results?.find(
    (inv) => inv.id.toString() === formData.factura_venta
);

if (!formData.factura_venta) {
    toast.error("Debe seleccionar una factura de venta");
    return;
}
```

**DESPUÉS** ✅:

```javascript
const selectedInvoice = invoices?.results?.find(
    (inv) => inv.id.toString() === formData.sales_invoice
);

if (!formData.sales_invoice) {
    toast.error("Debe seleccionar una factura de venta");
    return;
}
```

#### 3. Select de Factura

**ANTES** ❌:

```jsx
<Select
    value={formData.factura_venta}
    onValueChange={(value) =>
        handleInputChange("factura_venta", value)
    }
    required
>
```

**DESPUÉS** ✅:

```jsx
<Select
    value={formData.sales_invoice}
    onValueChange={(value) =>
        handleInputChange("sales_invoice", value)
    }
    required
>
```

#### 4. Campo de Referencia

**ANTES** ❌:

```jsx
<label className="block text-sm font-medium text-gray-700 mb-2">
    Número de Referencia
</label>
<Input
    type="text"
    value={formData.numero_referencia}
    onChange={(e) =>
        handleInputChange("numero_referencia", e.target.value)
    }
    placeholder="Número de transacción, cheque, etc."
/>
```

**DESPUÉS** ✅:

```jsx
<label className="block text-sm font-medium text-gray-700 mb-2">
    Número de Referencia *
</label>
<Input
    type="text"
    value={formData.referencia}
    onChange={(e) =>
        handleInputChange("referencia", e.target.value)
    }
    placeholder="Número de transacción, cheque, etc."
    required
/>
```

**Nota**: Se agregó el asterisco `*` y el atributo `required` porque el modelo backend lo requiere.

#### 5. Campo de Banco (Simplificado)

**ANTES** ❌:

```jsx
{
    (formData.metodo_pago === "transferencia" ||
        formData.metodo_pago === "cheque") && (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banco Emisor
                </label>
                <Input
                    type="text"
                    value={formData.banco_emisor}
                    onChange={(e) =>
                        handleInputChange("banco_emisor", e.target.value)
                    }
                    placeholder="Nombre del banco"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banco Receptor
                </label>
                <Input
                    type="text"
                    value={formData.banco_receptor}
                    onChange={(e) =>
                        handleInputChange("banco_receptor", e.target.value)
                    }
                    placeholder="Nombre del banco"
                />
            </div>
        </>
    );
}
```

**DESPUÉS** ✅:

```jsx
{
    (formData.metodo_pago === "transferencia" ||
        formData.metodo_pago === "cheque") && (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco
            </label>
            <Input
                type="text"
                value={formData.banco}
                onChange={(e) => handleInputChange("banco", e.target.value)}
                placeholder="Nombre del banco"
            />
        </div>
    );
}
```

**Nota**: Se simplificó de 2 campos (`banco_emisor` y `banco_receptor`) a 1 solo campo `banco` para coincidir con el modelo.

#### 6. Nombre del Archivo Adjunto

**ANTES** ❌:

```javascript
if (comprobante) {
    data.append("comprobante_pago", comprobante);
}
```

**DESPUÉS** ✅:

```javascript
if (comprobante) {
    data.append("archivo_comprobante", comprobante);
}
```

---

## 🎯 Resumen de Cambios

| Campo Frontend (ANTES) | Campo Backend         | Campo Frontend (DESPUÉS) | Estado         |
| ---------------------- | --------------------- | ------------------------ | -------------- |
| `factura_venta`        | `sales_invoice`       | `sales_invoice`          | ✅ Corregido   |
| `numero_referencia`    | `referencia`          | `referencia`             | ✅ Corregido   |
| `banco_emisor`         | `banco`               | `banco`                  | ✅ Corregido   |
| `banco_receptor`       | _(no existe)_         | _(removido)_             | ✅ Eliminado   |
| `comprobante_pago`     | `archivo_comprobante` | `archivo_comprobante`    | ✅ Corregido   |
| `monto`                | `monto`               | `monto`                  | ✅ Ya correcto |
| `fecha_pago`           | `fecha_pago`          | `fecha_pago`             | ✅ Ya correcto |
| `metodo_pago`          | `metodo_pago`         | `metodo_pago`            | ✅ Ya correcto |
| `notas`                | `notas`               | `notas`                  | ✅ Ya correcto |

---

## ✅ Verificación

### Campos Requeridos por el Backend:

-   ✅ `sales_invoice` - **CORREGIDO**
-   ✅ `referencia` - **CORREGIDO** (ahora marcado como requerido en UI)
-   ✅ `monto` - Ya correcto
-   ✅ `fecha_pago` - Ya correcto
-   ✅ `metodo_pago` - Ya correcto

### Campos Opcionales:

-   ✅ `banco` - Corregido (solo 1 campo en lugar de 2)
-   ✅ `archivo_comprobante` - Corregido
-   ✅ `notas` - Ya correcto

---

## 🧪 Pruebas Recomendadas

1. ✅ **Seleccionar factura**: Verificar que se llena `sales_invoice` correctamente
2. ✅ **Ingresar referencia**: Campo ahora es requerido (\*)
3. ✅ **Seleccionar método de pago**:
    - Transferencia/Cheque → muestra campo `banco`
    - Otros métodos → oculta campo `banco`
4. ✅ **Adjuntar comprobante**: Verificar que sube como `archivo_comprobante`
5. ✅ **Enviar formulario**: Debe crearse el pago sin errores de campos requeridos

---

## 📝 Notas Adicionales

-   El campo `referencia` ahora está marcado como **requerido** (`*`) en la UI para coincidir con la validación del backend.
-   Se eliminó la complejidad de `banco_emisor` y `banco_receptor` ya que el modelo solo tiene un campo `banco`.
-   Todos los nombres de campos ahora coinciden **exactamente** con el modelo Django `Payment`.

---

## ✨ Estado Final

**ANTES**: ❌ Errores de validación al enviar el formulario  
**DESPUÉS**: ✅ Formulario funcional con campos correctos

---

**Fecha**: 2025-11-02  
**Archivo modificado**: `frontend/src/pages/sales/PaymentFormPage.jsx`  
**Estado**: ✅ **COMPLETADO Y LISTO PARA PRUEBAS**

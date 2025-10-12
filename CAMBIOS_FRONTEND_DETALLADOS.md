# 📋 DOCUMENTACIÓN COMPLETA DE CAMBIOS EN FRONTEND
## Sistema NextOps - Recuperación de Código

**Fecha**: 2025-10-11  
**Propósito**: Documento de referencia para reconstruir el frontend desde Git

---

## 🎯 RESUMEN EJECUTIVO

Este documento detalla **TODOS** los cambios realizados en el frontend del sistema NextOps.

**Archivos correctos (NO tocar)**:
- ✅ Todos los catálogos: ClientsPage, ProvidersPage, CostTypesPage, etc.

**Archivos dañados (Requieren reconstrucción)**:
- ⚠️ InvoicesPage.jsx
- ⚠️ InvoiceDetailPage.jsx  
- ⚠️ DisputesPage.jsx
- ⚠️ DisputeDetailPage.jsx
- ⚠️ CreditNotesPage.jsx
- ⚠️ DashboardPage, OTsPage, LoginPage, etc.

---

## 🎨 SISTEMA DE COLORES

### Paleta Principal
```javascript
// Estados de Provisión
pendiente: "warning"           // Amarillo
provisionada: "success"        // Verde
disputada: "destructive"       // Rojo
anulada: "destructive"         // Rojo
anulada_parcialmente: "warning" // Naranja

// Resultados de Disputa
aprobada_total: "success"      // Verde
aprobada_parcial: "default"    // Azul
rechazada: "destructive"       // Rojo
```

---

## 🔧 COMPONENTES NUEVOS

### 1. InvoiceStatusBadge.jsx
**Ruta**: `src/components/invoices/InvoiceStatusBadge.jsx`

**Exporta 4 componentes**:
- `InvoiceStatusBadge` (default) - Badge de estado
- `DisputeResultBadge` - Badge de resultado
- `CostTypeBadge` - Indicador "Vinculado OT"
- `ExcludedFromStatsBadge` - Indicador "Excluida Stats"

---

### 2. DisputeResultForm.jsx
**Ruta**: `src/components/disputes/DisputeResultForm.jsx`

Formulario para resolver disputas con:
- Select de resultado
- Campo monto recuperado (condicional)
- Descripción de resolución
- Alertas de impacto

---

### 3. AddProvisionDateModal.jsx
**Ruta**: `src/components/invoices/AddProvisionDateModal.jsx`

Modal para agregar fecha de provisión a facturas anuladas.

---

## 📄 CAMBIOS EN PÁGINAS

### InvoicesPage.jsx

**Cambios**:
1. Nueva columna "Estado" en tabla
2. Badges visuales (estado, vinculado OT, excluida stats)
3. Imports:
```jsx
import InvoiceStatusBadge, {
    CostTypeBadge,
    ExcludedFromStatsBadge,
} from "../components/invoices/InvoiceStatusBadge";
```

**Estructura tabla**:
```jsx
<td>
    <div className="flex flex-col gap-1">
        <InvoiceStatusBadge estado={invoice.estado_provision} />
        <CostTypeBadge tipoCosto={invoice.tipo_costo} />
        {invoice.debe_excluirse_estadisticas && <ExcludedFromStatsBadge />}
    </div>
</td>
```

---

### InvoiceDetailPage.jsx

**Cambios principales**:
1. Botón "Crear Disputa"
2. Botón "Agregar Fecha Provisión" (facturas anuladas)
3. Desglose de montos (anuladas parcialmente)
4. Sección disputas y notas de crédito
5. Navegación contextual

**Imports adicionales**:
```jsx
import { AddProvisionDateModal } from "../components/invoices/AddProvisionDateModal";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
```

**Estados adicionales**:
```jsx
const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
const [isAddProvisionDateModalOpen, setIsAddProvisionDateModalOpen] = useState(false);
const originPage = location.state?.from || "/invoices";
```

---

### DisputesPage.jsx

**Cambios**:
1. Stats cards mejoradas
2. Tabla con badges de estado y resultado
3. Filtros avanzados
4. Botón "Nueva Disputa"

**Estructura stats**:
```jsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card>Total Disputas</Card>
    <Card>Abiertas</Card>
    <Card>Resueltas</Card>
    <Card>Monto Disputado</Card>
</div>
```

---

### DisputeDetailPage.jsx

**Cambios**:
1. Sección "Resultado de la Disputa"
2. Badge de resultado visible
3. Mostrar monto recuperado
4. Descripción de resolución en card azul
5. Botón "Resolver Disputa"

**Imports adicionales**:
```jsx
import { DisputeResultBadge } from "../components/invoices/InvoiceStatusBadge";
import { TrendingUp } from "lucide-react";
```

---

### DisputeFormModal.jsx

**Cambios**:
1. Importar DisputeResultForm
2. Campos adicionales en estado:
```jsx
estado: dispute?.estado || "abierta",
resultado: dispute?.resultado || "pendiente",
monto_recuperado: dispute?.monto_recuperado || "",
resolucion: dispute?.resolucion || "",
```

3. Sección "Resolución" (solo en edición):
```jsx
{dispute && (
    <div className="border-t pt-6 mt-6">
        <h3>Resolución de la Disputa</h3>
        <DisputeResultForm
            resultado={formData.resultado}
            montoRecuperado={formData.monto_recuperado}
            resolucion={formData.resolucion}
            montoDisputa={formData.monto_disputa}
            onChange={handleChange}
        />
    </div>
)}
```

---

### CreditNotesPage.jsx

**Estructura similar a InvoicesPage**:
- Tabla con filtros
- Badges de estado
- Búsqueda
- Paginación

---

## 📊 FLUJO DE DISPUTAS

```
FACTURA → PENDIENTE
    ↓
¿Problema? → SÍ → CREAR DISPUTA → DISPUTADA
    ↓
EDITAR DISPUTA → Seleccionar RESULTADO
    ↓
APROBADA_TOTAL → Factura ANULADA (no se paga)
APROBADA_PARCIAL → Factura ANULADA_PARCIALMENTE (monto ajustado)
RECHAZADA → Factura PENDIENTE (se paga completa)
```

---

## 🎨 DETALLES VISUALES

### Badges
- Bordes redondeados: `rounded-full`
- Padding: `px-2 py-1`
- Tamaño texto: `text-xs`
- Iconos: `w-3 h-3 mr-1`

### Cards
- Sombra: `shadow-sm`
- Borde: `border border-gray-200`
- Padding: `p-4` o `p-6`
- Hover: `hover:shadow-md transition-shadow`

### Botones
- Primario: `bg-blue-600 hover:bg-blue-700`
- Secundario: `border border-gray-300`
- Destructivo: `bg-red-600 hover:bg-red-700`
- Tamaños: `size="sm"` para acciones secundarias

### Tablas
- Header: `bg-gray-50`
- Hover row: `hover:bg-blue-50 transition-colors`
- Bordes: `border-b border-gray-200`

---

## 📦 ARCHIVOS A REVISAR EN GIT

### Componentes (src/components/)
```
✅ invoices/InvoiceStatusBadge.jsx (NUEVO)
✅ invoices/AddProvisionDateModal.jsx (NUEVO)
✅ disputes/DisputeResultForm.jsx (NUEVO)
✅ disputes/DisputeFormModal.jsx (MODIFICADO)
✅ disputes/DisputeTimeline.jsx (REVISAR)
```

### Páginas (src/pages/)
```
⚠️ InvoicesPage.jsx (RECONSTRUIR)
⚠️ InvoiceDetailPage.jsx (RECONSTRUIR)
⚠️ DisputesPage.jsx (RECONSTRUIR)
⚠️ DisputeDetailPage.jsx (RECONSTRUIR)
⚠️ CreditNotesPage.jsx (RECONSTRUIR)
⚠️ CreditNoteUploadPage.jsx (RECONSTRUIR)
```

---

## 🚀 PASOS PARA RECONSTRUIR

1. **Restaurar desde Git** los archivos dañados
2. **Crear componentes nuevos**:
   - InvoiceStatusBadge.jsx
   - DisputeResultForm.jsx
   - AddProvisionDateModal.jsx
3. **Modificar DisputeFormModal.jsx** (agregar sección resolución)
4. **Actualizar InvoicesPage.jsx** (columna estado + badges)
5. **Actualizar InvoiceDetailPage.jsx** (botones + sección disputas)
6. **Actualizar DisputesPage.jsx** (stats + badges)
7. **Actualizar DisputeDetailPage.jsx** (resultado + monto recuperado)

---

## 📝 NOTAS IMPORTANTES

- **Catálogos están correctos**: No modificar ClientsPage, ProvidersPage, etc.
- **Colores consistentes**: Usar paleta definida arriba
- **Iconos**: Lucide-react para todos los iconos
- **Formato moneda**: `toLocaleString('es-MX', { minimumFractionDigits: 2 })`
- **Fechas**: Usar `formatDate()` y `formatDateTime()` de `lib/dateUtils`

---

**Última actualización**: 2025-10-11 22:15

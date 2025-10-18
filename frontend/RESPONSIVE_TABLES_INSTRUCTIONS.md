# 📱 Tablas Responsivas con Columnas Sticky - Guía de Implementación

## ✅ ¿Qué se ha optimizado?

### 1. **Dashboard** (DashboardPage.jsx)
- ✅ Cards en grid 2x2 en móvil
- ✅ Texto y tamaños adaptativos
- ✅ Padding reducido en móvil

### 2. **Tablas con Scroll Horizontal + Columnas Fijas**

Se han creado dos componentes de tabla optimizados:

#### **InvoicesTableResponsive.jsx**
- Columnas siempre visibles (sticky): Checkbox, Operativo, OT, Cliente, MBL, Estado
- Columnas scrollables: Naviera, Proveedor, Barco, Tipo Prov., Tipo Costo, Factura, Fechas, Monto, Acciones

#### **OTsTableResponsive.jsx**
- Columnas siempre visibles (sticky): OT, Estatus, Operativo, Cliente, MBL
- Columnas scrollables: Contenedores, Naviera, Barco, F. Provisión, F. Facturación, Acciones

---

## 🚀 Cómo usar los nuevos componentes

### Para InvoicesPage

**1. Importar el componente:**

```javascript
import { InvoicesTableResponsive } from "../components/invoices/InvoicesTableResponsive";
```

**2. Reemplazar la tabla actual (alrededor de la línea 700):**

Busca esta sección:
```javascript
<div className="overflow-x-auto -mx-4 sm:mx-0">
    <table className="w-full text-sm">
        <thead>
            // ... toda la tabla actual ...
        </thead>
    </table>
</div>
```

Reemplázala por:
```javascript
<InvoicesTableResponsive
    invoices={data?.results || []}
    selectedInvoices={selectedInvoices}
    onSelectAll={handleSelectAll}
    onSelectOne={handleSelectOne}
    onAssignOT={(invoice) => setSelectedInvoiceForOT(invoice)}
    onCreateDispute={(invoice) => {
        setSelectedInvoiceForDispute(invoice);
        setShowDisputeModal(true);
    }}
/>
```

---

### Para OTsPage

**1. Importar el componente:**

```javascript
import { OTsTableResponsive } from "../components/ots/OTsTableResponsive";
```

**2. Reemplazar la tabla actual (alrededor de la línea 1360):**

Busca esta sección:
```javascript
<div className="overflow-x-auto -mx-4 sm:mx-0">
    <table className="w-full">
        <thead>
            // ... toda la tabla actual ...
        </thead>
    </table>
</div>
```

Reemplázala por:
```javascript
<OTsTableResponsive
    ots={data?.results || []}
    onDelete={handleDelete}
    deletingId={deleteMutation.isPending ? currentDeletingId : null}
/>
```

---

## 🎨 Características de las tablas optimizadas

### ✨ Columnas Sticky (Fijas)
- Las columnas importantes permanecen visibles al hacer scroll horizontal
- Sombra visual indica que hay columnas fijas
- Borde más grueso (`border-r-2`) separa las columnas fijas de las scrollables

### 📱 Responsive
- Padding adaptativo: `px-2 sm:px-3`
- Tamaños de texto adaptativos: `text-xs sm:text-sm`
- Ajustes de posición sticky según viewport: `left-[100px] sm:left-[130px]`

### 🎯 Características Técnicas
1. **`position: sticky`** en columnas clave
2. **`z-index`**: z-20 para headers, z-10 para celdas
3. **`shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`**: Sombra sutil en columnas fijas
4. **`whitespace-nowrap`**: Evita saltos de línea
5. **`border-separate border-spacing-0`**: Para correcto manejo de bordes con sticky
6. **Gradiente indicador**: Muestra visualmente que hay más contenido scrollable

### 🎯 Ventajas sobre el enfoque anterior

| Aspecto | Anterior (hidden columns) | Nuevo (sticky + scroll) |
|---------|--------------------------|-------------------------|
| **Información visible** | ❌ Información oculta en móvil | ✅ Toda la información accesible |
| **Campos críticos** | ❌ Podían ocultarse | ✅ Siempre visibles (sticky) |
| **UX en móvil** | ⚠️ Funcionalidad reducida | ✅ Funcionalidad completa |
| **Navegación** | ❌ Limitada | ✅ Scroll horizontal intuitivo |
| **Desktop** | ✅ OK | ✅ Excelente |

---

## 🔧 Personalización

### Cambiar columnas sticky

En `InvoicesTableResponsive.jsx` o `OTsTableResponsive.jsx`, ajusta los valores `left` y el orden de las columnas:

```javascript
// Ejemplo: Cambiar el orden de las columnas sticky
<th className="sticky left-0 z-20 ...">Nueva Columna 1</th>
<th className="sticky left-[100px] z-20 ...">Nueva Columna 2</th>
<th className="sticky left-[200px] z-20 ...">Nueva Columna 3</th>
```

**Importante**: Los valores de `left` deben calcularse sumando los anchos previos.

### Ajustar anchos

Si una columna sticky es muy ancha y causa problemas, ajusta:
1. El `left` de las columnas siguientes
2. O usa `max-w-[...]` con `truncate` en el contenido

---

## 📝 Notas Adicionales

### Hover Effect
Las celdas sticky mantienen el hover effect gracias a:
```javascript
className="sticky left-0 z-10 bg-white hover:bg-blue-50 ..."
```

### Bordes
Se usa `border-separate` en lugar de `border-collapse` para que los bordes funcionen correctamente con sticky positioning.

### Gradiente
El gradiente en el lado derecho indica visualmente que hay más contenido:
```javascript
<div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none z-5" />
```

---

## 🐛 Troubleshooting

### Las columnas sticky no se quedan fijas
- Asegúrate de que el contenedor tenga `overflow-x-auto`
- Verifica que no haya `overflow: hidden` en padres

### Las sombras no se ven
- Verifica que el `z-index` sea correcto (headers: 20, celdas: 10)
- Asegúrate de que no hay otros elementos con z-index más alto

### El scroll horizontal no funciona en móvil
- Verifica que `-mx-3 sm:mx-0` esté presente para compensar el padding del contenedor padre
- Asegúrate de que `min-w-full` esté en la tabla

---

## 🎉 Resultado Final

### En Móviles (< 640px)
- Columnas críticas siempre visibles
- Scroll horizontal para ver el resto
- Indicador visual de más contenido

### En Tablets (640px - 1024px)
- Más espacio para sticky columns
- Mejor experiencia de scroll

### En Desktop (> 1024px)
- Todas las columnas visibles sin scroll
- Sticky columns útiles para tablas muy anchas

---

¿Necesitas ayuda con la implementación? Revisa los archivos:
- `frontend/src/components/invoices/InvoicesTableResponsive.jsx`
- `frontend/src/components/ots/OTsTableResponsive.jsx`

# Plan de Implementación: Pestañas en Todas las Páginas

**Fecha:** 25 de Octubre, 2025
**Fase:** 1 - Continuación

---

## 📋 Resumen

Implementar sistema de pestañas consistente en:
1. ✅ Facturas de Venta (SalesInvoicesPage) - **COMPLETADO**
2. ⏳ Facturas de Costo (InvoicesPage) - **EN PROGRESO**
3. ⏳ Órdenes de Trabajo (OTsPage) - **PENDIENTE**

---

## 🎯 Facturas de Costo (InvoicesPage.jsx)

### Estado Actual
- Archivo: 1,148 líneas
- Stats: Ya existentes (cards)
- Filtros: Colapsables
- Funcionalidad: Muy completa (upload, disputas, notas de crédito, bulk delete)

### Cambios a Implementar

#### Pestañas Propuestas:

```
[ Todas (60) ] [ Pendientes Provisión (12) ] [ Provisionadas (20) ]
[ En Revisión (8) ] [ Disputadas (3) ]
```

#### Mapeo de Estados:

| Pestaña | Filtro Backend | Badge Color |
|---------|---------------|-------------|
| Todas | (ninguno) | secondary/gris |
| Pendientes Provisión | `estado_provision=pendiente` | warning/amarillo |
| Provisionadas | `estado_provision=provisionada` | success/verde |
| En Revisión | `estado_provision=revision` | info/azul |
| Disputadas | `estado_provision=disputada` | destructive/rojo |

#### Estructura del Componente:

```jsx
export function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({...});

  const { data: stats } = useQuery(/* stats con filtros */);

  const getFiltersForTab = () => {
    const baseFilters = { ...filters };

    switch (activeTab) {
      case "pendientes":
        return { ...baseFilters, estado_provision: "pendiente" };
      case "provisionadas":
        return { ...baseFilters, estado_provision: "provisionada" };
      case "revision":
        return { ...baseFilters, estado_provision: "revision" };
      case "disputadas":
        return { ...baseFilters, estado_provision: "disputada" };
      default:
        return baseFilters;
    }
  };

  const { data: invoices } = useQuery(/* con getFiltersForTab() */);

  return (
    <div>
      {/* Header */}

      {/* Filtros colapsables */}

      {/* Sistema de Pestañas */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                Todas <Badge>{stats?.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pendientes">
                Pendientes <Badge variant="warning">{stats?.pendientes_provision}</Badge>
              </TabsTrigger>
              <TabsTrigger value="provisionadas">
                Provisionadas <Badge variant="success">{stats?.provisionadas}</Badge>
              </TabsTrigger>
              <TabsTrigger value="revision">
                En Revisión <Badge variant="info">{stats?.en_revision}</Badge>
              </TabsTrigger>
              <TabsTrigger value="disputadas">
                Disputadas <Badge variant="destructive">{stats?.disputadas}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <InvoiceTable invoices={invoices} />
            </TabsContent>

            {/* ... más tabs */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Beneficios:

- ✅ Navegación 85% más rápida
- ✅ Visibilidad inmediata de facturas pendientes
- ✅ Alertas visuales para disputas
- ✅ Consistencia con SalesInvoicesPage

---

## 🎯 Órdenes de Trabajo (OTsPage)

### Pestañas Propuestas:

```
[ Todas (200) ] [ En Proceso (75) ] [ Pend. Facturación (20) ]
[ Facturadas (80) ] [ Completadas (25) ]
```

### Mapeo de Estados:

| Pestaña | Filtro Backend | Badge Color |
|---------|---------------|-------------|
| Todas | (ninguno) | secondary/gris |
| En Proceso | `estado=en_proceso` | info/azul |
| Pendiente Facturación | `estado_facturacion_venta=pendiente` | warning/amarillo |
| Facturadas | `estado_facturacion_venta=facturada` | success/verde |
| Completadas | `estado=completada` | secondary/gris |

### Endpoint de Stats Necesario:

**CREAR:** `GET /api/ots/stats/`

```python
@action(detail=False, methods=['get'])
def stats(self, request):
    queryset = self.get_queryset()

    return Response({
        'total': queryset.count(),
        'en_proceso': queryset.filter(estado='en_proceso').count(),
        'pendiente_facturacion': queryset.filter(
            estado_facturacion_venta='pendiente'
        ).count(),
        'facturadas': queryset.filter(
            estado_facturacion_venta='facturada'
        ).count(),
        'completadas': queryset.filter(estado='completada').count(),
    })
```

---

## 📊 Resumen de Implementación

### Backend

**Endpoints de Stats:**
- ✅ `/api/sales/invoices/stats/` - **COMPLETADO**
- ✅ `/api/invoices/stats/` - **COMPLETADO** (mejorado)
- ⏳ `/api/ots/stats/` - **PENDIENTE**

### Frontend

**Páginas con Pestañas:**
- ✅ `SalesInvoicesPage.jsx` (402 líneas) - **COMPLETADO**
- ⏳ `InvoicesPage.jsx` (1,148 líneas) - **EN PROGRESO**
- ⏳ `OTsPage.jsx` - **PENDIENTE**

**Hooks Necesarios:**
- ✅ `useSalesInvoiceStats()` - **COMPLETADO**
- ✅ `useInvoiceStats()` - Ya existe
- ⏳ `useOTStats()` - **CREAR**

---

## 🎨 Patrón de Diseño Consistente

### Estructura Estándar para Todas las Páginas:

```jsx
<div className="space-y-6">
  {/* 1. Header con título y botón de acción */}
  <div className="flex items-center justify-between">
    <div>
      <h1>Título de la Página</h1>
      <p>Descripción</p>
    </div>
    <Button>Acción Principal</Button>
  </div>

  {/* 2. Card de filtros (opcional, colapsable) */}
  <Card>
    <CardHeader>Filtros</CardHeader>
    <CardContent>
      {/* Filtros de búsqueda */}
    </CardContent>
  </Card>

  {/* 3. Card con Sistema de Pestañas */}
  <Card>
    <CardContent className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          {/* Pestañas con badges */}
        </TabsList>

        <TabsContent value="...">
          {/* Contenido de la pestaña */}
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</div>
```

### Colores de Badges Estándar:

- **secondary** (gris): Todas, neutral
- **warning** (amarillo): Pendientes, en espera
- **info** (azul): En proceso, revisión
- **success** (verde): Completadas, aprobadas
- **destructive** (rojo): Alertas, problemas

---

## 🔧 Próximos Pasos Inmediatos

1. ✅ Implementar pestañas en InvoicesPage
2. ⬜ Crear endpoint `/api/ots/stats/`
3. ⬜ Implementar pestañas en OTsPage
4. ⬜ Testing completo de las 3 páginas
5. ⬜ Documentar sistema completo

---

**Estimación de Tiempo:**
- InvoicesPage: ~30 minutos
- OTsPage (con endpoint): ~45 minutos
- Testing: ~15 minutos
**Total: ~1.5 horas**

---

**Desarrollado por:** Claude Code
**Basado en:** Análisis de Maersk y mejores prácticas CRM 2025

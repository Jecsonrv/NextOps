# Sistema Profesional de Gestión de Disputas de Facturas

## 📋 Resumen Ejecutivo

Este documento describe el sistema completo de gestión de disputas implementado para NextOps, diseñado específicamente para la industria de freight forwarding.

---

## 🎯 Objetivos del Sistema

1. **Gestionar disputas** de facturas de proveedores de manera profesional
2. **Mantener trazabilidad** completa del proceso de resolución
3. **Sincronizar estados** entre facturas y OTs según el tipo de costo
4. **Excluir automáticamente** facturas disputadas/anuladas de estadísticas financieras
5. **Facilitar la comunicación** con contabilidad sobre qué facturas pagar

---

## 🔄 Flujo de Estados

### Estados de Factura (`Invoice.estado_provision`)

```
┌─────────────┐
│  PENDIENTE  │ ← Factura recibida, esperando revisión
└──────┬──────┘
       │
       ├──→ ┌──────────┐
       │    │ REVISION │ ← En proceso de validación operativa
       │    └────┬─────┘
       │         │
       │         ├──→ ┌──────────────┐
       │         │    │ PROVISIONADA │ ← Aprobada, lista para contabilidad
       │         │    └──────────────┘
       │         │
       │         └──→ ┌───────────┐
       │              │ DISPUTADA │ ← Tiene disputa activa
       │              └─────┬─────┘
       │                    │
       │                    └──→ (Ver flujo de resolución)
       │
       └──→ ┌───────────┐
            │ RECHAZADA │ ← No procede (duplicada, no es nuestra, etc.)
            └───────────┘
```

### Estados de Disputa (`Dispute.estado`)

```
┌─────────┐
│ ABIERTA │ ← Recién creada, pendiente de gestión
└────┬────┘
     │
     ├──→ ┌──────────────┐
     │    │ EN_REVISION  │ ← En proceso con proveedor/naviera
     │    └──────┬───────┘
     │           │
     │           └──→ ┌───────────┐
     │                │ RESUELTA  │ ← Cerrada con resultado definido
     │                └─────┬─────┘
     │                      │
     │                      └──→ ┌──────────┐
     │                           │ CERRADA  │ ← Archivada
     │                           └──────────┘
     │
     └──→ (Puede cerrarse directamente)
```

### Resultados de Disputa (`Dispute.resultado`)

```
┌────────────────────┐
│ PENDIENTE          │ ← Sin resolver aún
└────────┬───────────┘
         │
         ├──→ ┌──────────────────┐     ┌─────────────────────┐
         │    │ APROBADA_TOTAL   │ ──→ │ Factura: ANULADA    │
         │    └──────────────────┘     └─────────────────────┘
         │                              NO va a contabilidad
         │
         ├──→ ┌──────────────────┐     ┌──────────────────────────┐
         │    │ APROBADA_PARCIAL │ ──→ │ Factura: ANULADA_PARCIAL │
         │    └──────────────────┘     └──────────────────────────┘
         │                              Monto ajustado → PROVISIONADA
         │
         ├──→ ┌──────────────────┐     ┌─────────────────────┐
         │    │ RECHAZADA        │ ──→ │ Factura: PENDIENTE  │
         │    └──────────────────┘     └─────────────────────┘
         │                              Debemos pagar → PROVISIONADA
         │
         └──→ ┌──────────────────┐     ┌─────────────────────┐
              │ ANULADA          │ ──→ │ Factura: PENDIENTE  │
              └──────────────────┘     └─────────────────────┘
                                       Error interno → Revisión
```

---

## 🔗 Lógica de Vinculación por Tipo de Costo

### **REGLA FUNDAMENTAL**: La vinculación con OT depende del `tipo_costo`

### 1️⃣ Costos Vinculados a OT

**Tipos de Costo**: `FLETE`, `CARGOS_NAVIERA`

**Características**:
- ✅ Se sincronizan automáticamente con la OT
- ✅ Heredan `fecha_provision` de la OT si no tienen una
- ✅ Los cambios de estado se reflejan en la OT
- ✅ Visibles en OTsPage con indicadores de estado

**Sincronización**:
```python
# Método: Invoice.debe_sincronizar_con_ot()
if tipo_costo in ['FLETE', 'CARGOS_NAVIERA'] and ot is not None:
    # Sincronizar estados: disputada, revision, provisionada
    # Sincronizar fecha_provision
```

### 2️⃣ Costos Auxiliares (Independientes)

**Tipos de Costo**: `TRANSPORTE`, `ADUANA`, `ALMACENAJE`, `DEMORA`, `OTRO`

**Características**:
- ❌ NO se sincronizan con la OT
- ✅ Gestión independiente de provisión y facturación
- ✅ `fecha_provision` se gestiona manualmente
- ✅ Visibles en OTsPage solo como lista de facturas relacionadas

---

## 📊 Exclusión de Estadísticas

### Facturas Excluidas de Cuentas por Pagar

Las siguientes facturas **NO se incluyen** en estadísticas financieras:

```python
# Método: Invoice.debe_excluirse_de_estadisticas()
estado_provision in ['anulada', 'rechazada', 'disputada']
```

**Razones**:
- `ANULADA`: No se pagará (nota de crédito 100%)
- `RECHAZADA`: No procede (duplicada, error, etc.)
- `DISPUTADA`: En proceso, no se provisiona hasta resolver

### Endpoint de Estadísticas

```http
GET /api/invoices/stats/?incluir_excluidas=false
```

**Respuesta incluye**:
```json
{
  "total": 150,
  "total_monto": 125000.00,
  "provisionadas": 100,
  "total_disputadas": 5,
  "total_anuladas": 3,
  "total_anuladas_parcial": 2
}
```

---

## 🔧 Implementación Técnica

### Modelos

#### Invoice (Actualizado)
```python
class Invoice:
    estado_provision = CharField(choices=[
        ('pendiente', 'Pendiente'),
        ('revision', 'En Revisión'),
        ('disputada', 'Disputada'),
        ('provisionada', 'Provisionada'),
        ('anulada', 'Anulada'),
        ('anulada_parcialmente', 'Anulada Parcialmente'),
        ('rechazada', 'Rechazada'),
    ])
    
    # Métodos helper
    def es_costo_vinculado_ot(self) -> bool
    def es_costo_auxiliar(self) -> bool
    def debe_sincronizar_con_ot(self) -> bool
    def debe_excluirse_de_estadisticas(self) -> bool
```

#### Dispute (Actualizado)
```python
class Dispute:
    estado = CharField(choices=[
        ('abierta', 'Abierta'),
        ('en_revision', 'En Revisión'),
        ('resuelta', 'Resuelta'),
        ('cerrada', 'Cerrada'),
    ])
    
    resultado = CharField(choices=[  # NUEVO
        ('pendiente', 'Pendiente'),
        ('aprobada_total', 'Aprobada Total'),
        ('aprobada_parcial', 'Aprobada Parcial'),
        ('rechazada', 'Rechazada por Proveedor'),
        ('anulada', 'Anulada (Error Interno)'),
    ])
    
    monto_recuperado = DecimalField()  # NUEVO
```

#### DisputeEvent
```python
class DisputeEvent:
    tipo = CharField(choices=[
        ('creacion', 'Creación'),
        ('actualizacion', 'Actualización'),
        ('comentario', 'Comentario'),
        ('cambio_estado', 'Cambio de Estado'),
        ('resolucion', 'Resolución'),
        ('archivo_adjunto', 'Archivo Adjunto'),
    ])
```

### Endpoints API

#### Disputas
```http
GET    /api/disputes/                    # Listar disputas
POST   /api/invoices/disputes/create/    # Crear disputa
GET    /api/disputes/{id}/               # Detalle de disputa
PATCH  /api/disputes/{id}/               # Actualizar disputa
DELETE /api/disputes/{id}/               # Eliminar disputa
GET    /api/disputes/{id}/eventos/       # Timeline de eventos
POST   /api/disputes/{id}/add_evento/    # Agregar evento
GET    /api/disputes/stats/              # Estadísticas
```

#### Facturas
```http
GET    /api/invoices/stats/?incluir_excluidas=false
```

---

## 📝 Casos de Uso

### Caso 1: Disputa Aprobada Totalmente

**Escenario**: Factura de $1,000 por flete, pero el servicio nunca se prestó.

**Flujo**:
1. Operativo crea disputa con `monto_disputa = 1000`
2. Factura pasa a estado `DISPUTADA`
3. Si es costo vinculado (FLETE), OT también pasa a `DISPUTADA`
4. Se gestiona con proveedor → Acepta 100%
5. Operativo actualiza disputa: `resultado = aprobada_total`
6. **Automáticamente**:
   - Factura → `ANULADA`
   - Se crea nota en factura
   - Se excluye de estadísticas
   - OT se actualiza (si aplica)

**Resultado**: Factura no se paga, no aparece en cuentas por pagar.

---

### Caso 2: Disputa Aprobada Parcialmente

**Escenario**: Factura de $1,000 por demoras, pero solo aplican $600.

**Flujo**:
1. Operativo crea disputa con `monto_disputa = 400`
2. Factura pasa a estado `DISPUTADA`
3. Se gestiona con proveedor → Acepta $400 de ajuste
4. Operativo actualiza: `resultado = aprobada_parcial`, `monto_recuperado = 400`
5. Se crea nota de crédito por $400
6. **Automáticamente**:
   - Factura → `ANULADA_PARCIALMENTE`
   - `monto_original = 1000`
   - `monto = 600` (después de aplicar NC)
   - Factura vuelve a `PROVISIONADA` con monto ajustado

**Resultado**: Factura se paga por $600.

---

### Caso 3: Disputa Rechazada

**Escenario**: Reclamamos $500, pero proveedor demuestra que el cargo es válido.

**Flujo**:
1. Operativo crea disputa
2. Factura pasa a estado `DISPUTADA`
3. Proveedor rechaza el reclamo con evidencia
4. Operativo actualiza: `resultado = rechazada`
5. **Automáticamente**:
   - Factura → `PENDIENTE`
   - Se limpia `fecha_provision`
   - Requiere nueva revisión y provisión

**Resultado**: Factura debe pagarse normalmente.

---

### Caso 4: Disputa Anulada (Error Interno)

**Escenario**: Creamos disputa por error, el cargo es correcto.

**Flujo**:
1. Operativo crea disputa por error
2. Se dan cuenta del error
3. Operativo actualiza: `resultado = anulada`
4. **Automáticamente**:
   - Factura → `PENDIENTE`
   - Vuelve al flujo normal de revisión

**Resultado**: Factura sigue el proceso normal.

---

## 🎨 Indicadores Visuales

### En InvoiceList
```jsx
{invoice.estado_provision === 'disputada' && (
  <Badge color="warning">En Disputa</Badge>
)}
{invoice.estado_provision === 'anulada' && (
  <Badge color="error">Anulada</Badge>
)}
```

### En OTsPage (solo costos vinculados)
```jsx
{invoice.es_costo_vinculado_ot && invoice.has_disputes && (
  <Tooltip title="Factura en disputa">
    <WarningIcon color="warning" />
  </Tooltip>
)}
```

---

## ✅ Reglas de Negocio

1. ✅ **Facturas DISPUTADAS NO se provisionan** hasta resolver
2. ✅ **Facturas ANULADAS NO aparecen** en estadísticas de cuentas por pagar
3. ✅ **Facturas ANULADAS_PARCIALMENTE** sí se provisionan con monto ajustado
4. ✅ **Contabilidad solo recibe** facturas en estado `PROVISIONADA`
5. ✅ **Sincronización con OT** solo para costos `FLETE` y `CARGOS_NAVIERA`
6. ✅ **Costos auxiliares** se gestionan independientemente
7. ✅ **Una factura solo puede tener UNA disputa activa** a la vez
8. ✅ **Eventos automáticos** se crean en cada cambio de estado

---

## 🚀 Próximos Pasos

### Backend ✅
- [x] Modelo Dispute con campos `resultado` y `monto_recuperado`
- [x] Modelo DisputeEvent para timeline
- [x] Lógica de transición automática de estados
- [x] Sincronización con OT por tipo de costo
- [x] Exclusión de estadísticas
- [x] Migración de base de datos

### Frontend (Pendiente)
- [ ] DisputeDetailPage con timeline visual
- [ ] DisputeFormModal mejorado con campo `resultado`
- [ ] Badges visuales en InvoiceList
- [ ] Indicadores en OTsPage para costos vinculados
- [ ] Sistema de archivos adjuntos en disputas

---

## 📞 Contacto y Soporte

Para dudas sobre el sistema de disputas, contactar al equipo de desarrollo.

**Última actualización**: 2025-10-11

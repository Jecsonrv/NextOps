# Matriz de Permisos - Sistema NextOps

## Resumen de Roles

| Rol | Descripción | Hereda de |
|-----|-------------|-----------|
| **Admin** | Control total del sistema | Todos los roles |
| **Jefe de Operaciones** | Operativo con permisos de importación | Operativo |
| **Finanzas** | Gestión financiera y estatus de documentos | Operativo |
| **Operativo** | Solo lectura y consulta | - |

---

## 1. ADMINISTRADOR (Admin)

### Gestión del Sistema
- ✅ Acceso total a **Gestión de Usuarios**
  - Crear usuarios
  - Editar usuarios
  - Desactivar/activar usuarios
  - Asignar roles
  - Ver todos los usuarios

- ✅ Acceso total a **Catálogos**
  - Proveedores (ver, crear, editar)
  - Tipos de Costo (ver, crear, editar)
  - Categorías de Costo (ver, crear, editar)
  - Alias de Clientes (ver, crear, editar)

- ✅ Acceso total a **Automatización**
  - Ver configuraciones
  - Crear/editar reglas de automatización
  - Ejecutar procesos automáticos

### Gestión de Datos
- ✅ **Importar** reportes, facturas y OTs
- ✅ **Ver y gestionar** todos los módulos

### Módulos Ocultos (Solo Admin)
- ✅ **Pagos Recibidos** (Sales Payments)
  - Ver lista de pagos
  - Crear pagos
  - Editar pagos
  - Eliminar pagos

### Permisos Heredados
- ✅ Todos los permisos de **Jefe de Operaciones**
- ✅ Todos los permisos de **Finanzas**
- ✅ Todos los permisos de **Operativo**

---

## 2. JEFE DE OPERACIONES

### Funciones Clave
- ✅ **Importar OTs** (upload masivo desde Excel/CSV)
- ✅ **Importar Facturas** (upload de XML/PDF)
- ✅ **Importar Reportes** de proveedores

### Permisos Denegados
- ❌ **NO** puede acceder a Gestión de Usuarios
- ❌ **NO** puede acceder a Catálogos
- ❌ **NO** puede acceder a Automatización
- ❌ **NO** puede acceder a Pagos Recibidos
- ❌ **NO** puede editar estatus de facturas (Pagadas/Provisionadas/Facturadas)

### Permisos Heredados
- ✅ Todos los permisos de **Operativo**

---

## 3. FINANZAS

### Funciones Específicas

#### Gestión de Estatus de Facturas de Costo
- ✅ **Marcar como Pagada**
- ✅ **Marcar como Provisionada**
- ✅ **Marcar como Facturada**
- ✅ **Editar estatus** de facturas

#### Gestión de Estatus de OTs
- ✅ **Marcar como Pagada**
- ✅ **Marcar como Provisionada**
- ✅ **Editar estatus** de OTs

#### Módulo de Finanzas (CRM)
- ✅ **Facturas de Venta**
  - Ver lista
  - Crear nueva
  - Editar
  - Cambiar estatus (facturada, pendiente_cobro, pagada, anulada)
  - Descargar PDF/XML

- ✅ **Dashboard Financiero**
  - Ver métricas financieras
  - Ver reportes de cobros
  - Ver cuentas por cobrar

#### Proveedores (CxP)
- ✅ **Pagos a Proveedores**
  - Ver lista de pagos pendientes
  - Registrar pagos
  - Ver historial de pagos

### Permisos Denegados
- ❌ **NO** puede importar OTs, facturas o reportes
- ❌ **NO** puede acceder a Gestión de Usuarios
- ❌ **NO** puede acceder a Automatización
- ❌ **NO** puede acceder a Catálogos
- ❌ **NO** puede acceder a Pagos Recibidos

### Permisos Heredados
- ✅ Todos los permisos de **Operativo**

---

## 4. OPERATIVO

### Permisos Permitidos (Solo Lectura)

#### Órdenes de Trabajo (OTs)
- ✅ **Ver** lista de OTs
- ✅ **Ver** detalle de OT
- ✅ **Exportar** a Excel
- ✅ **Filtrar** y buscar

#### Facturas de Costo
- ✅ **Ver** lista de facturas
- ✅ **Ver** detalle de factura
- ✅ **Descargar** PDF de factura
- ✅ **Descargar** XML de factura
- ✅ **Exportar** a Excel
- ✅ **Filtrar** y buscar

#### Disputas
- ✅ **Ver** lista de disputas
- ✅ **Ver** detalle de disputa
- ✅ **Exportar** a Excel

#### Clientes
- ✅ **Ver** lista de clientes
- ✅ **Ver** información de cliente

#### Dashboard
- ✅ **Ver** dashboard principal
- ✅ **Ver** métricas básicas

### Permisos Denegados
- ❌ **NO** puede importar OTs
- ❌ **NO** puede importar facturas
- ❌ **NO** puede importar reportes
- ❌ **NO** puede crear/editar OTs manualmente
- ❌ **NO** puede editar estatus de facturas
- ❌ **NO** puede editar estatus de OTs
- ❌ **NO** puede acceder a Gestión de Usuarios
- ❌ **NO** puede acceder a Catálogos
- ❌ **NO** puede acceder a Automatización
- ❌ **NO** puede acceder a Pagos Recibidos
- ❌ **NO** puede acceder al módulo de Finanzas (CRM)
- ❌ **NO** puede acceder a Pagos a Proveedores

---

## Matriz de Permisos por Funcionalidad

| Funcionalidad | Admin | Jefe Ops | Finanzas | Operativo |
|--------------|:-----:|:--------:|:--------:|:---------:|
| **GESTIÓN DEL SISTEMA** |
| Gestión de Usuarios | ✅ | ❌ | ❌ | ❌ |
| Catálogos (ver/crear/editar) | ✅ | ❌ | ❌ | ❌ |
| Automatización | ✅ | ❌ | ❌ | ❌ |
| **IMPORTACIÓN DE DATOS** |
| Importar OTs | ✅ | ✅ | ❌ | ❌ |
| Importar Facturas | ✅ | ✅ | ❌ | ❌ |
| Importar Reportes | ✅ | ✅ | ❌ | ❌ |
| **ÓRDENES DE TRABAJO** |
| Ver OTs | ✅ | ✅ | ✅ | ✅ |
| Crear/Editar OT manual | ✅ | ✅ | ❌ | ❌ |
| Editar estatus OT | ✅ | ❌ | ✅ | ❌ |
| Exportar OTs a Excel | ✅ | ✅ | ✅ | ✅ |
| **FACTURAS DE COSTO** |
| Ver Facturas | ✅ | ✅ | ✅ | ✅ |
| Descargar PDF/XML | ✅ | ✅ | ✅ | ✅ |
| Editar estatus Factura | ✅ | ❌ | ✅ | ❌ |
| Marcar como Pagada | ✅ | ❌ | ✅ | ❌ |
| Marcar como Provisionada | ✅ | ❌ | ✅ | ❌ |
| Marcar como Facturada | ✅ | ❌ | ✅ | ❌ |
| Exportar Facturas a Excel | ✅ | ✅ | ✅ | ✅ |
| **FINANZAS (CRM)** |
| Facturas de Venta (ver/crear/editar) | ✅ | ❌ | ✅ | ❌ |
| Pagos Recibidos | ✅ | ❌ | ❌ | ❌ |
| Pagos a Proveedores (CxP) | ✅ | ❌ | ✅ | ❌ |
| Dashboard Financiero | ✅ | ❌ | ✅ | ❌ |
| **OTROS MÓDULOS** |
| Ver Clientes | ✅ | ✅ | ✅ | ✅ |
| Ver Disputas | ✅ | ✅ | ✅ | ✅ |
| Dashboard Principal | ✅ | ✅ | ✅ | ✅ |

---

## Endpoints del Backend - Permisos

### Gestión de Usuarios
```
GET    /api/users/              [Admin]
POST   /api/users/              [Admin]
GET    /api/users/:id/          [Admin]
PATCH  /api/users/:id/          [Admin]
DELETE /api/users/:id/          [Admin]
GET    /api/users/me/           [Authenticated]
PATCH  /api/users/me/           [Authenticated]
```

### Catálogos
```
# Proveedores
GET    /api/catalogs/providers/         [Admin]
POST   /api/catalogs/providers/         [Admin]
PATCH  /api/catalogs/providers/:id/     [Admin]

# Tipos de Costo
GET    /api/catalogs/cost-types/        [Admin]
POST   /api/catalogs/cost-types/        [Admin]
PATCH  /api/catalogs/cost-types/:id/    [Admin]

# Categorías
GET    /api/catalogs/cost-categories/   [Admin]
POST   /api/catalogs/cost-categories/   [Admin]

# Alias de Clientes
GET    /api/client-aliases/             [Admin]
POST   /api/client-aliases/             [Admin]
PATCH  /api/client-aliases/:id/         [Admin]
```

### OTs
```
GET    /api/ots/                   [Authenticated]
POST   /api/ots/                   [Admin, Jefe Ops]
GET    /api/ots/:id/               [Authenticated]
PATCH  /api/ots/:id/               [Admin, Jefe Ops, Finanzas*]
DELETE /api/ots/:id/               [Admin]
POST   /api/ots/import/            [Admin, Jefe Ops]
GET    /api/ots/export/            [Authenticated]
```
*Finanzas solo puede editar campos de estatus financiero

### Facturas de Costo
```
GET    /api/invoices/              [Authenticated]
POST   /api/invoices/              [Admin, Jefe Ops]
GET    /api/invoices/:id/          [Authenticated]
PATCH  /api/invoices/:id/          [Admin, Jefe Ops, Finanzas*]
DELETE /api/invoices/:id/          [Admin]
POST   /api/invoices/upload/       [Admin, Jefe Ops]
GET    /api/invoices/:id/file/     [Authenticated]
GET    /api/invoices/export/       [Authenticated]
```
*Finanzas solo puede editar campos de estatus financiero

### Facturas de Venta (CRM)
```
GET    /api/sales/invoices/        [Admin, Finanzas]
POST   /api/sales/invoices/        [Admin, Finanzas]
GET    /api/sales/invoices/:id/    [Admin, Finanzas]
PATCH  /api/sales/invoices/:id/    [Admin, Finanzas]
DELETE /api/sales/invoices/:id/    [Admin]
```

### Pagos Recibidos (Solo Admin)
```
GET    /api/sales/payments/        [Admin]
POST   /api/sales/payments/        [Admin]
GET    /api/sales/payments/:id/    [Admin]
PATCH  /api/sales/payments/:id/    [Admin]
DELETE /api/sales/payments/:id/    [Admin]
```

### Pagos a Proveedores (CxP)
```
GET    /api/supplier-payments/     [Admin, Finanzas]
POST   /api/supplier-payments/     [Admin, Finanzas]
PATCH  /api/supplier-payments/:id/ [Admin, Finanzas]
```

### Automatización
```
GET    /api/automation/*           [Admin]
POST   /api/automation/*           [Admin]
PATCH  /api/automation/*           [Admin]
```

### Otros (Todos pueden ver)
```
GET    /api/clients/               [Authenticated]
GET    /api/disputes/              [Authenticated]
GET    /api/disputes/:id/          [Authenticated]
```

---

## Rutas del Frontend - Permisos

### Públicas
- `/login` - Todos

### Protegidas por Rol

#### Admin Solo
```jsx
<ProtectedRoute allowedRoles={['admin']}>
  - /admin/users
  - /catalogs/providers
  - /catalogs/providers/create
  - /catalogs/providers/:id/edit
  - /catalogs/cost-types
  - /catalogs/cost-categories
  - /catalogs/aliases
  - /catalogs/aliases/create
  - /catalogs/aliases/:id/edit
  - /sales/payments (Pagos Recibidos)
  - /sales/payments/new
  - /automation/*
</ProtectedRoute>
```

#### Admin + Jefe Ops
```jsx
<ProtectedRoute allowedRoles={['admin', 'jefe_operaciones']}>
  - /ots/import
  - /invoices/new
  - /invoices/upload
</ProtectedRoute>
```

#### Admin + Finanzas
```jsx
<ProtectedRoute allowedRoles={['admin', 'finanzas']}>
  - /sales/invoices
  - /sales/invoices/new
  - /sales/invoices/:id
  - /sales/dashboard
  - /supplier-payments
  - /supplier-payments/new
</ProtectedRoute>
```

#### Todos (Authenticated)
```jsx
<ProtectedRoute>
  - /
  - /ots
  - /ots/:id
  - /invoices
  - /invoices/:id
  - /clients
  - /disputes
  - /disputes/:id
  - /profile
</ProtectedRoute>
```

---

## UI Condicional en Componentes

### Sidebar Navigation
```javascript
// Solo mostrar según rol
{user?.role === 'admin' && (
  <MenuItem to="/admin/users">Gestión de Usuarios</MenuItem>
)}

{user?.role === 'admin' && (
  <MenuGroup title="Catálogos">
    <MenuItem to="/catalogs/providers">Proveedores</MenuItem>
    <MenuItem to="/catalogs/cost-types">Tipos de Costo</MenuItem>
  </MenuGroup>
)}

{['admin', 'finanzas'].includes(user?.role) && (
  <MenuGroup title="Finanzas">
    <MenuItem to="/sales/invoices">Facturas de Venta</MenuItem>
    {user?.role === 'admin' && (
      <MenuItem to="/sales/payments">Pagos Recibidos</MenuItem>
    )}
    <MenuItem to="/supplier-payments">Pagos a Proveedores</MenuItem>
  </MenuGroup>
)}

{user?.role === 'admin' && (
  <MenuItem to="/automation">Automatización</MenuItem>
)}
```

### Botones de Acción

#### Importar OTs/Facturas
```javascript
{['admin', 'jefe_operaciones'].includes(user?.role) && (
  <Button onClick={handleImport}>Importar OTs</Button>
)}
```

#### Editar Estatus de Factura
```javascript
{['admin', 'finanzas'].includes(user?.role) && (
  <>
    <Button onClick={() => markAsPaid(invoice.id)}>
      Marcar como Pagada
    </Button>
    <Button onClick={() => markAsProvisioned(invoice.id)}>
      Marcar como Provisionada
    </Button>
  </>
)}
```

---

## Validaciones en Backend

### Permisos Específicos por Campo

Para endpoints donde **Finanzas** puede editar solo ciertos campos:

```python
# En invoices/views.py o ots/views.py
def update(self, request, *args, **kwargs):
    user = request.user

    # Si es Finanzas, solo permitir editar campos financieros
    if user.role == 'finanzas':
        allowed_fields = {'status', 'payment_status', 'provisioned', 'invoiced'}
        requested_fields = set(request.data.keys())

        if not requested_fields.issubset(allowed_fields):
            return Response(
                {"detail": "No tienes permiso para editar estos campos"},
                status=status.HTTP_403_FORBIDDEN
            )

    return super().update(request, *args, **kwargs)
```

---

## Mensajes de Error

Para mejor UX, mensajes claros según el error:

```python
# 401 - No autenticado
{"detail": "Las credenciales de autenticación no se proporcionaron."}

# 403 - Sin permisos
{"detail": "No tienes permiso para realizar esta acción."}

# 403 - Rol insuficiente
{"detail": "Esta acción requiere rol de Administrador."}

# 403 - Campo no editable
{"detail": "No tienes permiso para editar estos campos. Solo puedes editar: status, payment_status"}
```

---

## Testing de Permisos

### Casos de Prueba

1. **Admin**
   - ✅ Puede acceder a todo
   - ✅ Puede ver Pagos Recibidos
   - ✅ Puede crear/editar usuarios
   - ✅ Puede editar catálogos

2. **Jefe Operaciones**
   - ✅ Puede importar OTs/Facturas
   - ✅ Puede ver dashboard
   - ❌ NO puede editar estatus de facturas
   - ❌ NO puede acceder a Gestión de Usuarios

3. **Finanzas**
   - ✅ Puede editar estatus de facturas
   - ✅ Puede ver Facturas de Venta
   - ✅ Puede acceder a Pagos a Proveedores
   - ❌ NO puede importar OTs
   - ❌ NO puede ver Pagos Recibidos

4. **Operativo**
   - ✅ Puede ver OTs
   - ✅ Puede descargar facturas
   - ✅ Puede exportar a Excel
   - ❌ NO puede importar
   - ❌ NO puede editar estatus
   - ❌ NO puede acceder a Finanzas

---

## Implementación en Fases

### Fase 1: Backend - Permisos Base ✅ (Ya existe)
- Modelo User con roles
- Clases IsAdmin, IsJefeOperaciones, IsFinanzas, IsOperativo

### Fase 2: Backend - Permisos Granulares (Implementar)
- Decorador para acciones específicas
- Validación de campos editables por rol
- Protección de todos los endpoints

### Fase 3: Frontend - Rutas Protegidas (Expandir)
- Actualizar todas las rutas con allowedRoles
- Ocultar Pagos Recibidos para no-admin
- Proteger páginas de Finanzas

### Fase 4: Frontend - UI Condicional (Implementar)
- Actualizar Sidebar con permisos
- Ocultar/mostrar botones según rol
- Deshabilitar acciones no permitidas

### Fase 5: Testing y Refinamiento
- Probar todos los casos de uso
- Verificar mensajes de error
- Optimizar UX

---

Esta matriz cubre todos los permisos definidos. ¿Alguna aclaración o ajuste necesario antes de proceder con la implementación?

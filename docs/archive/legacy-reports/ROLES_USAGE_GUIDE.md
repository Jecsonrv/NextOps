# Guía de Uso del Sistema de Roles - NextOps

## 📚 Índice

1. [Descripción General](#descripción-general)
2. [Roles del Sistema](#roles-del-sistema)
3. [Backend - Uso de Permisos](#backend---uso-de-permisos)
4. [Frontend - Uso de Permisos](#frontend---uso-de-permisos)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Solución de Problemas](#solución-de-problemas)

---

## Descripción General

NextOps implementa un sistema de control de acceso basado en roles (RBAC) con 4 niveles de permisos:

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|-----------------|
| **Admin** | Control total | 100% |
| **Jefe de Operaciones** | Importación + Operaciones | 70% |
| **Finanzas** | Gestión Financiera + CRM | 60% |
| **Operativo** | Solo Lectura | 40% |

---

## Roles del Sistema

### 👑 Admin (Administrador)
**Control total del sistema**

#### Permisos Exclusivos:
- ✅ Gestión de Usuarios (crear, editar, desactivar)
- ✅ Editar Catálogos (proveedores, tipos de costo, etc.)
- ✅ Automatización
- ✅ **Pagos Recibidos** (módulo oculto para todos los demás)

#### Hereda Todo de:
- Jefe de Operaciones
- Finanzas
- Operativo

---

### 📦 Jefe de Operaciones
**Importación y gestión operativa**

#### Puede:
- ✅ Importar OTs, Facturas, Reportes
- ✅ Crear/Editar OTs y Facturas (todos los campos)
- ✅ Ver todo (Dashboard, OTs, Facturas, Disputas, Clientes)
- ✅ Descargar archivos
- ✅ Exportar a Excel

#### NO Puede:
- ❌ Editar estatus financieros (pagada, provisionada, facturada)
- ❌ Acceder a módulo de Finanzas (Facturas de Venta, Pagos)
- ❌ Gestionar Usuarios
- ❌ Editar Catálogos
- ❌ Acceder a Automatización

---

### 💰 Finanzas
**Gestión financiera y CRM**

#### Puede:
- ✅ **Editar estatus financieros** de OTs y Facturas
  - Marcar como Pagada
  - Marcar como Provisionada
  - Marcar como Facturada
- ✅ **Facturas de Venta** (CRUD completo)
- ✅ **Pagos a Proveedores** (CxP - CRUD completo)
- ✅ **Dashboard Financiero**
- ✅ Ver todo (OTs, Facturas, Disputas, Clientes)
- ✅ Descargar archivos
- ✅ Exportar a Excel

#### NO Puede:
- ❌ Importar OTs o Facturas
- ❌ Crear/Editar OTs o Facturas (campos no financieros)
- ❌ Acceder a **Pagos Recibidos** (solo Admin)
- ❌ Gestionar Usuarios
- ❌ Editar Catálogos
- ❌ Acceder a Automatización

---

### 👀 Operativo
**Solo lectura y consulta**

#### Puede:
- ✅ Ver Dashboard
- ✅ Ver OTs (lista y detalle)
- ✅ Ver Facturas (lista y detalle)
- ✅ Ver Disputas
- ✅ Ver Clientes
- ✅ Ver Catálogos
- ✅ Descargar archivos (PDFs, XMLs)
- ✅ Exportar a Excel

#### NO Puede:
- ❌ Importar datos
- ❌ Crear/Editar/Eliminar nada
- ❌ Cambiar estatus
- ❌ Acceder a Finanzas
- ❌ Gestionar Usuarios
- ❌ Editar Catálogos
- ❌ Acceder a Automatización

---

## Backend - Uso de Permisos

### Clases de Permisos Disponibles

```python
from common.permissions import (
    IsAdmin,              # Solo admin
    IsAdminOrJefeOps,     # Admin o Jefe de Operaciones
    IsAdminOrFinanzas,    # Admin o Finanzas
    CanImportData,        # Admin o Jefe Ops (importar)
    CanEditFinancialStatus, # Admin o Finanzas (editar estatus)
)
```

### Uso en ViewSets

#### Ejemplo 1: Permisos por acción

```python
class OTViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        # Solo lectura - todos
        if self.action in ['list', 'retrieve', 'export_excel']:
            return [IsAuthenticated()]

        # Importar - Admin o Jefe Ops
        if self.action == 'import_excel':
            return [CanImportData()]

        # Crear/Eliminar - Admin o Jefe Ops
        if self.action in ['create', 'destroy']:
            return [IsAdminOrJefeOps()]

        # Actualizar - todos (validación de campos por mixin)
        return [IsAuthenticated()]
```

#### Ejemplo 2: Validación de campos por rol

```python
from common.mixins import RoleBasedFieldValidationMixin

class InvoiceViewSet(RoleBasedFieldValidationMixin, viewsets.ModelViewSet):
    # Definir qué campos puede editar cada rol
    role_editable_fields = {
        'admin': '__all__',
        'jefe_operaciones': '__all__',
        'finanzas': {
            'estado_provision',
            'estado_facturacion',
            'estado_pago',
            'monto_pagado',
            'fecha_pago'
        },
        'operativo': set()  # No puede editar nada
    }
```

El mixin automáticamente valida que:
- **Finanzas** solo pueda editar campos financieros
- **Admin y Jefe Ops** puedan editar todo
- **Operativo** no pueda editar nada

### Crear Nuevos Permisos

```python
# En common/permissions.py
class CanDoSomething(permissions.BasePermission):
    """
    Descripción del permiso.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'otro_rol']
        )
```

---

## Frontend - Uso de Permisos

### 1. Proteger Rutas

```jsx
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Ruta solo para Admin
<Route
    path="/admin/users"
    element={
        <ProtectedRoute allowedRoles={["admin"]}>
            <Layout>
                <UserManagementPage />
            </Layout>
        </ProtectedRoute>
    }
/>

// Ruta para Admin + Finanzas
<Route
    path="/sales/invoices"
    element={
        <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
            <Layout>
                <SalesInvoicesPage />
            </Layout>
        </ProtectedRoute>
    }
/>

// Ruta para todos (sin allowedRoles)
<Route
    path="/ots"
    element={
        <ProtectedRoute>
            <Layout>
                <OTsPage />
            </Layout>
        </ProtectedRoute>
    }
/>
```

### 2. Mostrar/Ocultar Componentes

#### Opción A: Usando `PermissionGate`

```jsx
import { PermissionGate } from "../components/common/PermissionGate";

function MyComponent() {
    return (
        <div>
            {/* Botón solo para Admin y Jefe Ops */}
            <PermissionGate allowedRoles={["admin", "jefe_operaciones"]}>
                <Button onClick={handleImport}>
                    Importar OTs
                </Button>
            </PermissionGate>

            {/* Botón solo para Admin */}
            <PermissionGate allowedRoles={["admin"]}>
                <Button onClick={handleCreateUser}>
                    Crear Usuario
                </Button>
            </PermissionGate>

            {/* Sección solo para Admin y Finanzas */}
            <PermissionGate allowedRoles={["admin", "finanzas"]}>
                <FinancialSection />
            </PermissionGate>
        </div>
    );
}
```

#### Opción B: Usando el hook `usePermissions`

```jsx
import { usePermissions } from "../components/common/PermissionGate";

function MyComponent() {
    const { canImport, canEditCatalogs, isAdmin, hasRole } = usePermissions();

    return (
        <div>
            {/* Botón de importar - solo Admin y Jefe Ops */}
            {canImport && (
                <Button onClick={handleImport}>
                    Importar OTs
                </Button>
            )}

            {/* Botón de editar catálogo - solo Admin */}
            {canEditCatalogs && (
                <Button onClick={handleEdit}>
                    Editar Catálogo
                </Button>
            )}

            {/* Verificación personalizada */}
            {hasRole(["admin", "finanzas"]) && (
                <FinancialDashboard />
            )}
        </div>
    );
}
```

### 3. Funciones Helper de Permisos

```jsx
import {
    isAdmin,
    canImportData,
    canAccessFinance,
    canEditCatalogs,
} from "../utils/permissions";

// Verificar si el usuario puede importar
if (canImportData(user)) {
    // Mostrar opción de importación
}

// Verificar si es admin
if (isAdmin(user)) {
    // Mostrar opciones de admin
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Página de OTs con Botones Condicionales

```jsx
import { usePermissions } from "../components/common/PermissionGate";

function OTsPage() {
    const { canImport } = usePermissions();

    return (
        <div>
            <h1>Órdenes de Trabajo</h1>

            <div className="flex gap-2">
                {/* Botón visible para todos */}
                <Button onClick={handleExport}>
                    Exportar a Excel
                </Button>

                {/* Botón solo para Admin y Jefe Ops */}
                {canImport && (
                    <Button onClick={handleImport}>
                        Importar OTs
                    </Button>
                )}
            </div>

            <OTsList />
        </div>
    );
}
```

### Ejemplo 2: Formulario con Campos Condicionales

```jsx
import { usePermissions } from "../components/common/PermissionGate";

function InvoiceForm() {
    const { canEditFinancialStatus, isAdmin } = usePermissions();

    return (
        <form>
            {/* Campos básicos - todos pueden ver */}
            <Input name="numero_factura" label="Número de Factura" />
            <Input name="monto" label="Monto" />

            {/* Campos financieros - solo Admin y Finanzas */}
            {canEditFinancialStatus && (
                <>
                    <Select name="estado_pago" label="Estado de Pago">
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                    </Select>
                    <Input
                        type="date"
                        name="fecha_pago"
                        label="Fecha de Pago"
                    />
                </>
            )}

            {/* Campo solo para Admin */}
            {isAdmin && (
                <Input name="notas_admin" label="Notas Internas" />
            )}
        </form>
    );
}
```

### Ejemplo 3: Menú con Items Condicionales

```jsx
import { usePermissions } from "../components/common/PermissionGate";

function ActionsMenu({ invoice }) {
    const { canImport, canEditFinancialStatus, isAdmin } = usePermissions();

    return (
        <DropdownMenu>
            {/* Acción para todos */}
            <MenuItem onClick={() => handleDownload(invoice)}>
                Descargar PDF
            </MenuItem>

            {/* Acción para Admin y Jefe Ops */}
            {canImport && (
                <MenuItem onClick={() => handleEdit(invoice)}>
                    Editar Factura
                </MenuItem>
            )}

            {/* Acción para Admin y Finanzas */}
            {canEditFinancialStatus && (
                <MenuItem onClick={() => handleMarkAsPaid(invoice)}>
                    Marcar como Pagada
                </MenuItem>
            )}

            {/* Acción solo para Admin */}
            {isAdmin && (
                <MenuItem onClick={() => handleDelete(invoice)}>
                    Eliminar
                </MenuItem>
            )}
        </DropdownMenu>
    );
}
```

---

## Solución de Problemas

### Error: "No tienes permiso para realizar esta acción"

**Causa:** El usuario intenta acceder a una ruta o ejecutar una acción sin los permisos necesarios.

**Solución:**
1. Verificar que el usuario tenga el rol correcto en la base de datos
2. Verificar que la ruta esté protegida con los roles correctos
3. Verificar que el endpoint del backend tenga los permisos correctos

### Error: "No tienes permiso para editar estos campos"

**Causa:** Usuario de Finanzas intenta editar campos que no son financieros.

**Solución:**
1. Verificar `role_editable_fields` en el ViewSet del backend
2. En frontend, ocultar o deshabilitar campos que no pueda editar
3. Usar `usePermissions` para mostrar solo los campos editables

### Pagos Recibidos no aparece en el menú para Finanzas

**Comportamiento esperado:** Pagos Recibidos es un módulo oculto solo para Admin.

**Verificación:**
1. El menú "Pagos Recibidos" tiene `roles: ["admin"]`
2. La ruta `/sales/payments` está protegida con `allowedRoles={["admin"]}`
3. El backend `PaymentViewSet` tiene `permission_classes = [IsAdminOnly]`

### Usuario no ve opciones de crear/editar en Catálogos

**Comportamiento esperado:** Solo Admin puede crear/editar catálogos. Otros roles solo pueden ver.

**Verificación:**
1. Botones de "Crear" y "Editar" deben estar en `<PermissionGate allowedRoles={["admin"]}>`
2. Rutas de creación/edición deben tener `allowedRoles={["admin"]}`
3. Backend debe validar con `IsAdmin`

---

## Resumen de Permisos por Módulo

| Módulo | Ver | Crear | Editar | Eliminar |
|--------|-----|-------|--------|----------|
| **OTs** | Todos | Admin, Jefe Ops | Admin, Jefe Ops, Finanzas* | Admin, Jefe Ops |
| **Facturas Costo** | Todos | Admin, Jefe Ops | Admin, Jefe Ops, Finanzas* | Admin, Jefe Ops |
| **Disputas** | Todos | Todos | Todos | Admin |
| **Clientes** | Todos | - | - | - |
| **Facturas Venta** | Admin, Finanzas | Admin, Finanzas | Admin, Finanzas | Admin |
| **Pagos Recibidos** | **Solo Admin** | **Solo Admin** | **Solo Admin** | **Solo Admin** |
| **Pagos Proveedores** | Admin, Finanzas | Admin, Finanzas | Admin, Finanzas | Admin |
| **Catálogos** | Todos | **Solo Admin** | **Solo Admin** | **Solo Admin** |
| **Usuarios** | **Solo Admin** | **Solo Admin** | **Solo Admin** | **Solo Admin** |
| **Automatización** | **Solo Admin** | **Solo Admin** | **Solo Admin** | **Solo Admin** |

*Finanzas solo puede editar campos financieros (estado, fechas de pago, provisión, etc.)

---

## Contacto y Soporte

Para preguntas o problemas con el sistema de roles:
1. Revisar esta documentación
2. Revisar `PERMISSIONS_MATRIX.md` para detalles técnicos
3. Contactar al administrador del sistema

---

**Última actualización:** Noviembre 2025
**Versión del sistema:** NextOps 1.0

# Guía de Inicio Rápido - CRM NextOps

## Estado Actual del Sistema

✅ **Backend**: Corriendo en `http://localhost:8000`
✅ **Base de Datos**: PostgreSQL activa y saludable
✅ **Redis**: Activo y saludable
✅ **Frontend**: Build compilado exitosamente

## Cómo Iniciar el Sistema

### 1. Backend (Ya está corriendo)

Los contenedores de Docker ya están activos:
- `nextops_backend` - Puerto 8000
- `nextops_db` - PostgreSQL en puerto 5432
- `nextops_redis` - Puerto 6379

### 2. Frontend

```bash
cd frontend
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## Acceso al Sistema

### Endpoints Principales

**Backend API:**
- Base URL: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`

**Nuevos Endpoints CRM:**
- Facturas Venta: `http://localhost:8000/api/sales/invoices/`
- Pagos: `http://localhost:8000/api/sales/payments/`
- Dashboard: `http://localhost:8000/api/sales/dashboard/`

### Navegación Frontend

Una vez iniciado el frontend, podrás acceder a:

1. **Dashboard Principal**: `/`
2. **CRM / Ventas** (nuevo menú en sidebar):
   - Dashboard Finanzas: `/sales/dashboard`
   - Facturas de Venta: `/sales/invoices`
   - Pagos: `/sales/payments`

## Flujo de Trabajo Típico

### Para Usuarios de Operaciones

1. **Crear OT** (si no existe)
   - Ir a "OTs" → "Crear Nueva OT"

2. **Cargar Factura de Venta**
   - Ir a "CRM / Ventas" → "Facturas de Venta"
   - Click en "Cargar Factura"
   - Completar formulario:
     - Número de factura
     - Seleccionar OT
     - Seleccionar Cliente
     - Ingresar monto total e impuestos
     - Fechas
     - Subir PDF (obligatorio)
     - Subir XML (opcional)
   - Guardar

3. **Asociar Facturas de Costo** (opcional)
   - Desde el detalle de la factura de venta
   - Click en "Asociar Costos"
   - Seleccionar facturas de costo relacionadas
   - El sistema calcula automáticamente los márgenes

### Para Usuarios de Finanzas

1. **Ver Dashboard Financiero**
   - Ir a "CRM / Ventas" → "Dashboard Finanzas"
   - Seleccionar rango de fechas
   - Ver métricas:
     - Total vendido
     - Total cobrado
     - Por cobrar
     - Margen bruto
     - Top OTs por margen
     - Facturas próximas a vencer

2. **Registrar Pago**
   - Ir a "CRM / Ventas" → "Pagos"
   - Click en "Registrar Pago"
   - Seleccionar factura de venta
   - Ingresar monto del pago
   - Seleccionar método de pago
   - Agregar referencia/comprobante
   - Guardar

3. **Validar/Rechazar Pagos**
   - Ir a "CRM / Ventas" → "Pagos"
   - Ver pagos con estado "Pendiente"
   - Click en botón de validar (✓) o rechazar (✗)
   - El sistema actualiza automáticamente los saldos

## Roles y Permisos

### Admin
- Acceso total a todas las funcionalidades

### Jefe de Operaciones
- Crear/editar facturas de venta
- Asociar facturas de costo
- Ver todas las métricas

### Operativo
- Crear/editar facturas de venta
- Ver OTs asignadas

### Finanzas
- Ver facturas de venta (solo lectura)
- Registrar pagos
- Validar/rechazar pagos
- Acceso completo a dashboard financiero

## Características Automáticas

### Cálculos en Tiempo Real

El sistema calcula automáticamente:
- **Saldo Pendiente**: Monto total - Monto pagado
- **Margen Bruto**: Ventas - Costos
- **Porcentaje de Margen**: (Margen / Ventas) × 100
- **Estado de Pago**: pendiente → parcial → pagado

### Actualizaciones en Cascada

Cuando se registra un pago:
1. Se actualiza el `monto_pagado` de la factura
2. Se recalcula el `saldo_pendiente`
3. Se actualiza el `estado_pago` automáticamente
4. Se recalculan las métricas de la OT asociada

## Formatos de Archivo

### Facturas de Venta (PDF)
- Tamaño máximo: 10 MB
- Formato: PDF
- Almacenamiento: Cloudinary

### Facturas de Venta (XML)
- Tamaño máximo: 5 MB
- Formato: XML
- Opcional
- Almacenamiento: Cloudinary

### Comprobantes de Pago
- Tamaño máximo: 10 MB
- Formatos: PDF, JPG, PNG
- Almacenamiento: Cloudinary

## Filtros Disponibles

### Facturas de Venta
- Búsqueda por número, cliente, OT
- Estado de facturación: pendiente, emitida, enviada, cobrada, cancelada
- Estado de pago: pendiente, parcial, pagado, vencido

### Pagos
- Búsqueda por referencia, factura
- Estado: pendiente, validado, rechazado
- Método de pago: transferencia, cheque, efectivo, tarjeta, otro

### Dashboard Financiero
- Rango de fechas personalizado
- Filtros automáticos por período

## Indicadores Visuales

### Badges de Estado

**Facturas de Venta:**
- 🟡 Pendiente (amarillo)
- 🔵 Emitida (azul)
- 🔵 Enviada (azul)
- 🟢 Cobrada (verde)
- 🔴 Cancelada (rojo)

**Pagos:**
- 🟡 Pendiente validación (amarillo)
- 🔵 Parcial (azul)
- 🟢 Validado/Pagado (verde)
- 🔴 Rechazado/Vencido (rojo)

**Márgenes:**
- 🟢 ≥ 30% (excelente)
- 🔵 15-29% (bueno)
- 🟡 5-14% (aceptable)
- 🔴 < 5% (bajo)

## Solución de Problemas

### El backend no responde
```bash
docker logs nextops_backend
```

### Error de base de datos
```bash
docker exec -it nextops_backend python manage.py migrate
```

### Frontend no compila
```bash
cd frontend
npm install
npm run build
```

### Cloudinary no funciona
Verificar en `backend/.env`:
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

## Comandos Útiles

### Backend
```bash
# Ver logs
docker logs nextops_backend -f

# Ejecutar migrations
docker exec -it nextops_backend python manage.py migrate

# Crear superusuario
docker exec -it nextops_backend python manage.py createsuperuser

# Shell de Django
docker exec -it nextops_backend python manage.py shell
```

### Frontend
```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Preview build
npm run preview
```

## Próximas Mejoras Recomendadas

1. **Notificaciones en Tiempo Real**
   - Alertas cuando hay pagos pendientes de validación
   - Notificaciones de facturas próximas a vencer

2. **Reportes Exportables**
   - Exportar dashboard a Excel
   - Generar reportes PDF personalizados

3. **Gráficos Interactivos**
   - Integrar Recharts para visualizaciones
   - Gráficos de tendencias de ventas
   - Distribución de márgenes por cliente

4. **Automatización**
   - Recordatorios automáticos de vencimiento
   - Auto-generación de reportes mensuales
   - Integración con email para envío de facturas

## Soporte

Para cualquier problema o duda:
1. Revisar logs del backend
2. Verificar estado de contenedores Docker
3. Consultar documentación en `CRM_ARQUITECTURA_COMPLETA.md`
4. Revisar implementación en `CRM_IMPLEMENTADO.md`

---

**Sistema desarrollado con:**
- Django REST Framework
- React + Vite
- PostgreSQL
- Cloudinary
- TailwindCSS
- React Query

**Estado**: ✅ Producción Ready

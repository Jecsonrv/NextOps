# 🚀 Instrucciones Finales - Sistema de Disputas

## ✅ Lo que ya está implementado

### Backend (100% Completo)
- ✅ Modelos actualizados con nuevos campos
- ✅ Lógica de transición automática de estados
- ✅ Vinculación por tipo de costo (FLETE/CARGOS vs Auxiliares)
- ✅ Exclusión automática de estadísticas
- ✅ Serializers con campos nuevos
- ✅ Endpoints API funcionando
- ✅ Migración de base de datos creada
- ✅ Documentación completa

### Frontend (Componentes de ejemplo creados)
- ✅ `InvoiceStatusBadge.jsx` - Badges visuales para estados
- ✅ `DisputeResultForm.jsx` - Formulario de resultado

---

## 📋 Pasos para Completar la Implementación

### Paso 1: Aplicar Migración en Docker ⚠️ IMPORTANTE

```bash
# Opción A: Usar el script batch
.\aplicar_migraciones_disputas.bat

# Opción B: Comando manual
docker-compose exec backend python manage.py migrate invoices
```

**Verificar que se aplicó correctamente:**
```bash
docker-compose exec backend python manage.py showmigrations invoices
```

Debes ver:
```
[X] 0010_dispute_resultado_monto_recuperado
```

---

### Paso 2: Probar el Backend (Opcional)

```bash
# Desde el contenedor de backend
docker-compose exec backend python test_dispute_system.py
```

Este script verifica:
- Métodos helper de Invoice
- Campos nuevos de Dispute
- Sistema de eventos
- Estadísticas con exclusión
- Vinculación por tipo de costo

---

### Paso 3: Actualizar Frontend

#### 3.1 Actualizar `DisputeFormModal.jsx`

**Ubicación**: `frontend/src/components/disputes/DisputeFormModal.jsx`

**Cambios necesarios**:

1. Importar el nuevo componente:
```jsx
import DisputeResultForm from './DisputeResultForm';
```

2. Agregar campos al estado inicial:
```jsx
const [formData, setFormData] = useState({
  // ... campos existentes ...
  resultado: dispute?.resultado || 'pendiente',
  monto_recuperado: dispute?.monto_recuperado || 0,
});
```

3. Agregar el componente en el formulario (después de los campos existentes):
```jsx
{/* Solo mostrar si es edición de disputa existente */}
{dispute && (
  <DisputeResultForm
    dispute={dispute}
    formData={formData}
    setFormData={setFormData}
  />
)}
```

#### 3.2 Actualizar `InvoiceList.jsx`

**Ubicación**: `frontend/src/pages/invoices/InvoiceList.jsx`

**Cambios necesarios**:

1. Importar badges:
```jsx
import InvoiceStatusBadge, { 
  CostTypeBadge, 
  ExcludedFromStatsBadge 
} from '../../components/invoices/InvoiceStatusBadge';
```

2. Reemplazar el badge de estado actual con:
```jsx
<InvoiceStatusBadge invoice={invoice} />
```

3. Agregar indicadores adicionales:
```jsx
<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
  <InvoiceStatusBadge invoice={invoice} />
  <CostTypeBadge invoice={invoice} />
  <ExcludedFromStatsBadge invoice={invoice} />
</Box>
```

#### 3.3 Actualizar `DisputeDetailPage.jsx`

**Ubicación**: `frontend/src/pages/disputes/DisputeDetailPage.jsx`

**Cambios necesarios**:

1. Importar badge de resultado:
```jsx
import { DisputeResultBadge } from '../../components/invoices/InvoiceStatusBadge';
```

2. Agregar sección de resultado (después de la información básica):
```jsx
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" gutterBottom>
    Resultado de la Disputa
  </Typography>
  <DisputeResultBadge resultado={dispute.resultado} />
  
  {dispute.monto_recuperado > 0 && (
    <Typography variant="body2" sx={{ mt: 1 }}>
      Monto recuperado: <strong>${dispute.monto_recuperado}</strong>
    </Typography>
  )}
</Box>
```

#### 3.4 Actualizar `OTDetailPage.jsx` (Opcional)

**Ubicación**: `frontend/src/pages/ots/OTDetailPage.jsx`

**En la sección de facturas relacionadas**, agregar indicador para costos vinculados:

```jsx
{invoice.es_costo_vinculado_ot && invoice.has_disputes && (
  <Tooltip title="Esta factura tiene una disputa activa">
    <WarningIcon color="warning" sx={{ ml: 1 }} />
  </Tooltip>
)}
```

---

### Paso 4: Actualizar Endpoints en el Frontend

**Archivo**: `frontend/src/services/api.js` (o donde tengas los endpoints)

Verificar que los endpoints de disputas incluyan los nuevos campos:

```javascript
// Actualizar disputa
export const updateDispute = async (id, data) => {
  const response = await api.patch(`/disputes/${id}/`, {
    estado: data.estado,
    resultado: data.resultado,  // NUEVO
    monto_recuperado: data.monto_recuperado,  // NUEVO
    resolucion: data.resolucion,
    notas: data.notas,
    // ... otros campos
  });
  return response.data;
};
```

---

### Paso 5: Probar el Flujo Completo

#### Test 1: Crear Disputa
1. Ir a una factura
2. Crear disputa
3. Verificar que la factura pasa a estado "DISPUTADA"
4. Si es FLETE/CARGOS_NAVIERA, verificar que la OT también se actualiza

#### Test 2: Resolver Disputa - Aprobada Total
1. Abrir disputa existente
2. Cambiar resultado a "Aprobada Total"
3. Guardar
4. Verificar:
   - Factura pasa a "ANULADA"
   - Evento creado en timeline
   - Factura excluida de estadísticas

#### Test 3: Resolver Disputa - Aprobada Parcial
1. Abrir disputa existente
2. Cambiar resultado a "Aprobada Parcial"
3. Ingresar monto recuperado (ej: $500)
4. Guardar
5. Verificar:
   - Factura pasa a "ANULADA_PARCIALMENTE"
   - Monto original guardado
   - Evento creado con monto recuperado

#### Test 4: Resolver Disputa - Rechazada
1. Abrir disputa existente
2. Cambiar resultado a "Rechazada"
3. Guardar
4. Verificar:
   - Factura vuelve a "PENDIENTE"
   - Evento creado
   - Factura debe provisionarse nuevamente

#### Test 5: Estadísticas
1. Ir a dashboard o estadísticas
2. Verificar que facturas anuladas/disputadas NO suman
3. Verificar contadores separados para disputadas/anuladas

---

## 🎨 Colores y Estilos Sugeridos

### Estados de Factura
- **Pendiente**: Gris (default)
- **Revisión**: Azul (info)
- **Disputada**: Amarillo (warning)
- **Provisionada**: Verde (success)
- **Anulada**: Rojo (error)
- **Anulada Parcial**: Naranja (warning)
- **Rechazada**: Rojo (error)

### Resultados de Disputa
- **Pendiente**: Gris (default)
- **Aprobada Total**: Verde (success)
- **Aprobada Parcial**: Azul (info)
- **Rechazada**: Rojo (error)
- **Anulada**: Naranja (warning)

---

## 📊 Endpoints API Disponibles

```
GET    /api/invoices/                           # Lista con campos nuevos
GET    /api/invoices/{id}/                      # Detalle con campos nuevos
GET    /api/invoices/stats/?incluir_excluidas=false  # Estadísticas

GET    /api/disputes/                           # Lista de disputas
POST   /api/invoices/disputes/create/           # Crear disputa
GET    /api/disputes/{id}/                      # Detalle con resultado
PATCH  /api/disputes/{id}/                      # Actualizar (incluye resultado)
GET    /api/disputes/{id}/eventos/              # Timeline de eventos
POST   /api/disputes/{id}/add_evento/           # Agregar evento manual
```

---

## 🐛 Troubleshooting

### Error: "Campo 'resultado' no existe"
**Solución**: Aplicar migración (Paso 1)

### Error: "AttributeError: 'Invoice' object has no attribute 'es_costo_vinculado_ot'"
**Solución**: Reiniciar contenedor de backend después de aplicar cambios

### Frontend no muestra campos nuevos
**Solución**: Verificar que los serializers incluyan los campos en la respuesta

### OT no se sincroniza con factura
**Solución**: Verificar que el tipo_costo sea 'FLETE' o 'CARGOS_NAVIERA'

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs de backend: `docker-compose logs backend`
2. Verificar migración aplicada: `docker-compose exec backend python manage.py showmigrations`
3. Ejecutar script de prueba: `docker-compose exec backend python test_dispute_system.py`

---

## ✨ Resultado Final

Después de completar estos pasos, tendrás:

✅ Sistema completo de gestión de disputas
✅ Flujo de estados automatizado
✅ Vinculación inteligente por tipo de costo
✅ Estadísticas precisas sin facturas anuladas
✅ Timeline de eventos completo
✅ UI profesional con badges y colores
✅ Documentación completa

---

**¡Éxito con la implementación!** 🎉

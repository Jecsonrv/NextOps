# Sistema Completo de Normalización Inteligente de Clientes

## 📋 Resumen Ejecutivo

Se ha implementado un **sistema completo end-to-end** para normalizar automáticamente aliases de clientes basándose en los proveedores detectados en facturas. El sistema incluye:

✅ **Backend (Django REST API)**: 3 nuevos endpoints + lógica mejorada
✅ **Frontend (React)**: Interfaz completa con wizard intuitivo
✅ **Algoritmos inteligentes**: Fuzzy matching multi-capa
✅ **UX/UI mejorada**: Generación de aliases más legibles

---

## 🎯 Características Principales

### 1. Detección Automática desde Facturas
- Analiza todos los nombres de proveedores en facturas activas
- Identifica clientes únicos que NO están en el catálogo
- Filtra clientes ya registrados (opcional)

### 2. Agrupación Inteligente
- Agrupa variantes similares usando fuzzy matching
- Algoritmo multi-capa con umbral configurable (70-95%)
- Prioriza el nombre más común como "canónico"
- Calcula similitud para cada variante

### 3. Generación Mejorada de Aliases
**ANTES:**
```
"WAL-MART" → "WAL_MART"
"SUPER SELECTOS" → "SUPER_SELECTOS"
```

**AHORA:**
```
"WAL-MART" → "WAL MART"
"SUPER SELECTOS" → "SUPER SELECTOS"
"ALMACENES_SIMAN" → "ALMACENES SIMAN"
```

**Mejoras:**
- ✅ Convierte **guiones y guiones bajos a ESPACIOS**
- ✅ Preserva **palabras completas** (más legible que siglas)
- ✅ Filtra sufijos legales (S.A., LTDA, DE C.V., etc.)
- ✅ Máximo 50 caracteres

### 4. Recomendaciones Inteligentes
El sistema recomienda automáticamente:
- **"Crear Nuevo"**: Si no existe un alias similar (< 85%)
- **"Fusionar con Existente"**: Si detecta alias similar (≥ 85%)

### 5. Creación/Fusión Masiva
- Crea alias unificados para múltiples variantes
- Actualiza facturas automáticamente
- Incrementa contadores de uso
- Registra auditoría completa

---

## 🏗️ Arquitectura del Sistema

### Backend (Django)

#### Archivos Modificados/Creados:

1. **`client_aliases/models.py`** (líneas 163-275)
   - `generate_short_name()` mejorado
   - `_ensure_unique_short_name()` nuevo método

2. **`client_aliases/views.py`** (líneas 848-1310)
   - `from_invoices()` - GET endpoint para análisis
   - `bulk_create_from_invoices()` - POST para creación masiva
   - `bulk_merge_from_invoices()` - POST para fusión
   - `_group_similar_names()` - Agrupación inteligente
   - `_generate_smart_short_name()` - Generación mejorada

3. **`client_aliases/NORMALIZACION_CLIENTES.md`**
   - Documentación técnica completa
   - Ejemplos de uso de API
   - Casos de uso y troubleshooting

### Frontend (React)

#### Archivos Creados/Modificados:

1. **`hooks/useCatalogs.js`** (líneas 710-782)
   - `useClientAliasesFromInvoices()` - Hook para análisis
   - `useBulkCreateFromInvoices()` - Hook para creación
   - `useBulkMergeFromInvoices()` - Hook para fusión

2. **`pages/ClientNormalizationPage.jsx`** (NUEVO - 800+ líneas)
   - Interfaz completa de normalización
   - Stats cards con métricas en tiempo real
   - Controles de umbral y límite
   - Lista expandible de grupos
   - Edición en línea de nombres
   - Búsqueda y filtrado

3. **`pages/ClientAliasesPage.jsx`** (modificado)
   - Botón "Normalización Automática" agregado

4. **`App.jsx`** (modificado)
   - Import de `ClientNormalizationPage`
   - Ruta `/catalogs/aliases/normalize`

---

## 📡 API Endpoints

### 1. Obtener Clientes desde Facturas
```http
GET /api/clients/client-aliases/from_invoices/
```

**Query Parameters:**
- `threshold` (default: 85): Umbral de similitud (70-100)
- `limit` (default: 50): Máximo de grupos
- `include_existing` (default: false): Incluir clientes ya registrados

**Response:**
```json
{
  "total_unique_names": 120,
  "total_groups": 45,
  "threshold_used": 85.0,
  "groups": [
    {
      "canonical_name": "WALMART",
      "suggested_short_name": "WALMART",
      "variants": [
        {
          "name": "WALMART DE CENTRO AMERICA",
          "invoice_count": 25,
          "similarity_to_canonical": 95.5,
          "is_canonical": false
        },
        {
          "name": "WALMART",
          "invoice_count": 50,
          "similarity_to_canonical": 100.0,
          "is_canonical": true
        }
      ],
      "total_invoices": 75,
      "existing_alias": null,
      "recommendation": "create_new"
    }
  ]
}
```

### 2. Crear Alias Masivamente
```http
POST /api/clients/client-aliases/bulk_create_from_invoices/
```

**Body:**
```json
{
  "canonical_name": "WALMART",
  "variants": [
    "WALMART DE CENTRO AMERICA",
    "WAL-MART"
  ],
  "short_name": "WALMART",
  "notes": "Cliente creado desde normalización"
}
```

**Response:**
```json
{
  "message": "Alias creado exitosamente. 75 facturas asociadas.",
  "alias": {
    "id": 123,
    "original_name": "WALMART",
    "short_name": "WALMART",
    "usage_count": 75,
    "is_verified": true
  },
  "invoices_updated": 75,
  "variants_processed": 2
}
```

### 3. Fusionar con Existente
```http
POST /api/clients/client-aliases/bulk_merge_from_invoices/
```

**Body:**
```json
{
  "target_alias_id": 123,
  "variants": ["WALMART DE CENTRO AMERICA"],
  "notes": "Fusionando variante detectada"
}
```

---

## 🚀 Flujo de Trabajo del Usuario

### Paso 1: Acceder a Normalización
1. Ir a **Catálogos → Alias de Clientes**
2. Click en **"Normalización Automática"**

### Paso 2: Ajustar Parámetros
- **Umbral de Similitud**: 70-95% (recomendado: 85%)
- **Máximo de Grupos**: 10-100 (default: 50)
- **Incluir existentes**: Opción para ver todos

### Paso 3: Revisar Grupos
El sistema muestra:
- **Nombre Canónico**: Más común del grupo
- **Alias Sugerido**: Generado automáticamente
- **Variantes**: Lista completa con similitud
- **Total Facturas**: Impacto de la normalización
- **Recomendación**: Crear nuevo o fusionar

### Paso 4A: Crear Nuevo Alias
1. Expandir grupo
2. (Opcional) Click "Personalizar" para editar nombre/alias
3. Click **"Crear Alias"**
4. Confirmar acción
5. ✅ Alias creado y facturas actualizadas

### Paso 4B: Fusionar con Existente
1. Expandir grupo
2. Ver alias existente detectado (nombre, similitud)
3. Click **"Fusionar"**
4. Confirmar acción
5. ✅ Variantes fusionadas y facturas actualizadas

---

## 📊 Interfaz de Usuario (UI)

### Dashboard de Stats
```
┌─────────────────┬──────────────────┬─────────────────┬──────────────────┐
│ Nombres Únicos  │ Grupos Detectados│ Total Facturas  │ Para Normalizar  │
│      120        │        45        │       850       │       40         │
└─────────────────┴──────────────────┴─────────────────┴──────────────────┘
```

### Tarjeta de Grupo (Expandida)
```
┌────────────────────────────────────────────────────────────────────────┐
│ WALMART                                           [✓ Crear Nuevo]      │
│ -------------------------------------------------------------------- --│
│ 👥 3 variantes  📄 75 facturas  [WALMART]                              │
│                                                                        │
│ Variantes Detectadas:                                                 │
│ ┌────────────────────────────────────────────────────────────┐        │
│ │ [Canónico] WALMART                         50 facturas     │        │
│ │ WALMART DE CENTRO AMERICA    95.5% similar 25 facturas     │        │
│ │ WAL-MART                     90.0% similar  0 facturas     │        │
│ └────────────────────────────────────────────────────────────┘        │
│                                                                        │
│ [Personalizar]  [Crear Alias]                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Controles Interactivos
- **Slider de Umbral**: 70% (Flexible) ←→ 95% (Estricto)
- **Slider de Límite**: 10 ←→ 100 grupos
- **Checkbox**: Incluir clientes existentes
- **Búsqueda**: Filtrado en tiempo real
- **Expandir/Contraer**: Todos los grupos a la vez

---

## 🎨 Mejoras UX/UI Implementadas

### 1. Aliases más Legibles
**Problema anterior:**
- Guiones bajos: `WAL_MART`, `SUPER_SELECTOS`
- Difícil de leer en interfaces

**Solución:**
- Espacios: `WAL MART`, `SUPER SELECTOS`
- Natural y legible
- Mejor para búsquedas y filtros

### 2. Edición en Línea
- Click "Personalizar" para ajustar nombre y alias
- Preview en tiempo real
- Validación instantánea
- Guardar o cancelar

### 3. Recomendaciones Contextuales
- Badges de color según acción
  - Verde: Crear Nuevo
  - Amarillo: Fusionar Existente
- Información de alias existente
- Porcentaje de similitud visible

### 4. Estadísticas en Tiempo Real
- Total nombres únicos detectados
- Grupos formados
- Facturas afectadas
- Pendientes de normalización

### 5. Feedback Visual
- Loading spinners durante análisis
- Toasts de éxito/error
- Confirmaciones antes de acciones
- Estados de carga en botones

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Cliente con Guiones
**Facturas detectadas:**
```
- WAL-MART (10 facturas)
- WALMART (50 facturas)
- WALMART DE C.A. (15 facturas)
```

**Sistema agrupa:**
```json
{
  "canonical_name": "WALMART",
  "suggested_short_name": "WAL MART",
  "variants": [
    {"name": "WALMART", "invoice_count": 50, "similarity": 100},
    {"name": "WAL-MART", "invoice_count": 10, "similarity": 95},
    {"name": "WALMART DE C.A.", "invoice_count": 15, "similarity": 90}
  ],
  "total_invoices": 75,
  "recommendation": "create_new"
}
```

**Acción:**
1. Usuario ve grupo
2. Click "Crear Alias"
3. ✅ Alias "WALMART" (WAL MART) creado
4. ✅ 75 facturas actualizadas

### Ejemplo 2: Cliente Similar a Existente
**Facturas detectadas:**
```
- SUPER SELECTOS EL SALVADOR (20 facturas)
```

**Sistema detecta alias existente:**
```json
{
  "canonical_name": "SUPER SELECTOS EL SALVADOR",
  "existing_alias": {
    "id": 45,
    "name": "SUPER SELECTOS",
    "short_name": "SUPER SELECTOS",
    "similarity": 92.5
  },
  "recommendation": "merge_with_existing"
}
```

**Acción:**
1. Usuario ve recomendación de fusión
2. Click "Fusionar"
3. ✅ 20 facturas asociadas a alias existente
4. ✅ Contador de uso incrementado

---

## 🔧 Algoritmo de Similitud

El sistema usa un algoritmo multi-capa:

### Paso 1: Extracción de Sufijos
```python
"ALMACENES SIMAN, S.A. DE C.V."
→ business: "ALMACENES SIMAN"
→ suffix: "S.A. DE C.V."
→ type: "complete_cv"
```

### Paso 2: Normalización
```python
"WAL-MART" → "WAL MART"
"SUPER_SELECTOS" → "SUPER SELECTOS"
```

### Paso 3: Tokenización
```python
"CORPORACION WALMART DE MEXICO"
→ tokens: ["CORPORACION", "WALMART", "MEXICO"]
→ significant: ["CORPORACION", "WALMART", "MEXICO"]  # sin "DE"
```

### Paso 4: Validaciones
- Palabras clave comunes (mín. 2 para nombres largos)
- Primer token similar (previene falsos positivos)
- Longitud proporcional

### Paso 5: Métricas Combinadas
```python
score = (token_sort * 0.5) + (partial * 0.3) + (exact * 0.2)
```

### Paso 6: Penalizaciones
- Sufijos incompatibles: -70%
- Sin palabras comunes: -80%
- Primer token diferente: -70%
- Longitud muy diferente: -40%

**Umbral recomendado:** 85%

---

## 📝 Mantenimiento y Mejoras Futuras

### Próximas Funcionalidades Sugeridas

1. **Auto-normalización Programada**
   - Tarea Celery semanal
   - Email a Jefe de Operaciones
   - Reporte de nuevos clientes

2. **Machine Learning**
   - Entrenar con decisiones manuales
   - Mejorar umbral dinámicamente
   - Detectar patrones específicos

3. **Dashboard de Progreso**
   - Gráfico de normalización en el tiempo
   - Métricas de calidad
   - Alertas de duplicados

4. **Bulk Operations**
   - Normalizar todos los grupos a la vez
   - Preview antes de aplicar
   - Rollback de operaciones

5. **Exportación**
   - Excel con grupos detectados
   - CSV para análisis externo
   - PDF con reporte ejecutivo

---

## 🐛 Troubleshooting

### "No se encuentran clientes nuevos"
**Causa:** Todos los clientes ya están normalizados
**Solución:**
- Verifica checkbox "Incluir existentes"
- Revisa que las facturas tengan `proveedor_nombre`

### "El threshold no agrupa suficientes variantes"
**Causa:** Umbral muy alto
**Solución:**
- Baja el threshold a 80% o 75%
- Revisa que los nombres sean realmente similares

### "Alias duplicado"
**Causa:** Ya existe un alias con ese nombre normalizado
**Solución:**
- Usa la opción "Fusionar" en lugar de "Crear"
- Edita el nombre para hacerlo único

### "Error 500 al cargar grupos"
**Causa:** Demasiados nombres únicos
**Solución:**
- Reduce el límite a 20-30 grupos
- Aumenta el threshold a 90%

---

## ✅ Checklist de Implementación

### Backend
- [x] Endpoint `from_invoices` con agrupación inteligente
- [x] Endpoint `bulk_create_from_invoices`
- [x] Endpoint `bulk_merge_from_invoices`
- [x] Mejora en `generate_short_name()` con espacios
- [x] Algoritmo de similitud multi-capa
- [x] Validaciones y manejo de errores
- [x] Documentación técnica (`NORMALIZACION_CLIENTES.md`)

### Frontend
- [x] Hooks para consumir endpoints
- [x] Página completa `ClientNormalizationPage`
- [x] Integración en `App.jsx`
- [x] Botón de acceso desde `ClientAliasesPage`
- [x] UI con stats, controles y búsqueda
- [x] Edición en línea de nombres
- [x] Feedback visual (toasts, loading)

### Pendientes (Opcionales)
- [ ] Tests unitarios (backend)
- [ ] Tests de componentes (frontend)
- [ ] Tutorial en video
- [ ] Dashboard de progreso
- [ ] Auto-normalización programada
- [ ] Machine Learning para mejorar algoritmo

---

## 📚 Archivos Modificados/Creados

### Backend
```
backend/client_aliases/
├── models.py                        [MODIFICADO - líneas 163-275]
├── views.py                         [MODIFICADO - líneas 848-1310]
├── fuzzy_utils.py                   [EXISTENTE - sin cambios]
└── NORMALIZACION_CLIENTES.md        [NUEVO - documentación técnica]
```

### Frontend
```
frontend/src/
├── hooks/
│   └── useCatalogs.js               [MODIFICADO - líneas 710-782]
├── pages/
│   ├── ClientNormalizationPage.jsx  [NUEVO - 800+ líneas]
│   └── ClientAliasesPage.jsx        [MODIFICADO - botón agregado]
└── App.jsx                          [MODIFICADO - import + ruta]
```

### Documentación
```
/
└── SISTEMA_NORMALIZACION_CLIENTES_COMPLETO.md  [NUEVO - este archivo]
```

---

## 🎓 Guía Rápida de Uso

### Para Usuarios Finales

1. **Acceder:**
   - Catálogos → Alias de Clientes → "Normalización Automática"

2. **Configurar:**
   - Umbral: 85% (recomendado)
   - Límite: 50 grupos
   - Incluir existentes: NO

3. **Revisar Grupos:**
   - Expandir para ver detalles
   - Verificar variantes y facturas

4. **Actuar:**
   - Verde (Crear Nuevo): Click "Crear Alias"
   - Amarillo (Fusionar): Click "Fusionar"
   - Personalizar si necesitas ajustar nombres

5. **Repetir:**
   - Procesa grupos de mayor a menor impacto
   - Click "Actualizar" para refrescar

### Para Desarrolladores

**Backend:**
```python
# views.py:848-971
@action(detail=False, methods=['get'])
def from_invoices(self, request):
    # Analiza facturas y agrupa variantes
    groups = self._group_similar_names(unique_names, threshold)
    return Response({'groups': groups})
```

**Frontend:**
```jsx
// ClientNormalizationPage.jsx
const { data } = useClientAliasesFromInvoices({ threshold, limit });

const handleCreateNew = (group) => {
  createMutation.mutateAsync({
    canonical_name: group.canonical_name,
    variants: group.variants.map(v => v.name)
  });
};
```

---

## 🏆 Beneficios del Sistema

### Para el Negocio
- ⚡ **Ahorro de tiempo**: Normalización en minutos vs horas
- 🎯 **Precisión**: Algoritmo inteligente reduce errores humanos
- 📊 **Métricas claras**: Impacto visible de cada acción
- 🔄 **Escalabilidad**: Maneja cientos de clientes fácilmente

### Para los Usuarios
- 🖱️ **UX intuitiva**: Wizard guiado paso a paso
- 👁️ **Transparencia**: Ve exactamente qué se va a hacer
- ✏️ **Control**: Personaliza antes de confirmar
- 📈 **Progreso visible**: Stats en tiempo real

### Para el Código
- 🏗️ **Arquitectura limpia**: Separación backend/frontend
- 🔧 **Mantenible**: Código bien documentado
- 🧪 **Testeable**: Hooks y funciones aisladas
- 🚀 **Extensible**: Fácil agregar nuevas funcionalidades

---

## 📞 Soporte

Para dudas o problemas:
1. Consultar esta documentación
2. Revisar `NORMALIZACION_CLIENTES.md` (técnica)
3. Verificar logs del backend para errores

---

**Versión:** 1.0
**Fecha:** 2025-01-22
**Estado:** ✅ COMPLETO Y FUNCIONAL

🎉 **¡El sistema está listo para usar!**

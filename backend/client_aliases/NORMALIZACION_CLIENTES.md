# Normalización Inteligente de Clientes desde Facturas

## Descripción General

Sistema completo para normalizar y gestionar aliases de clientes basándose en los proveedores detectados en facturas. Permite agrupar variantes similares, generar aliases automáticos con manejo inteligente de guiones/espacios, y crear o fusionar clientes de manera masiva.

---

## 🎯 Características Principales

### 1. Detección Automática de Clientes desde Facturas
- **Endpoint**: `GET /api/client-aliases/from_invoices/`
- Analiza todas las facturas del sistema
- Identifica proveedores únicos que NO están en el catálogo
- Agrupa variantes similares usando fuzzy matching inteligente
- Recomienda normalización automática

### 2. Generación Inteligente de Alias
**Mejoras clave:**
- ✅ Convierte **guiones a espacios** para mejor legibilidad
- ✅ Maneja formatos: `WAL-MART`, `SUPER_SELECTOS`, `PRICE-SMART`
- ✅ Preserva **palabras completas** cuando es posible
- ✅ Filtra sufijos legales (`S.A.`, `LTDA`, `DE C.V.`, etc.)
- ✅ Máximo 50 caracteres

**Ejemplos de transformación:**
```
"WAL-MART" → "WAL MART"
"SUPER-SELECTOS, S.A." → "SUPER SELECTOS"
"ALMACENES_SIMAN" → "ALMACENES SIMAN"
"CORPORACION WALMART DE MEXICO" → "WALMART MEXICO"
"PRICESMART EL SALVADOR" → "PRICESMART SALVADOR"
```

### 3. Agrupación Inteligente de Variantes
El algoritmo agrupa automáticamente variantes similares del mismo cliente:

**Ejemplo de agrupación:**
```json
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
      "name": "WAL-MART",
      "invoice_count": 10,
      "similarity_to_canonical": 90.0,
      "is_canonical": false
    },
    {
      "name": "WALMART",
      "invoice_count": 50,
      "similarity_to_canonical": 100.0,
      "is_canonical": true
    }
  ],
  "total_invoices": 85,
  "existing_alias": null,
  "recommendation": "create_new"
}
```

### 4. Creación Masiva de Aliases
- **Endpoint**: `POST /api/client-aliases/bulk_create_from_invoices/`
- Crea un alias unificado para todas las variantes
- Actualiza facturas automáticamente
- Marca el alias como verificado
- Incrementa contador de uso

### 5. Fusión Masiva con Alias Existente
- **Endpoint**: `POST /api/client-aliases/bulk_merge_from_invoices/`
- Fusiona variantes con un cliente ya existente
- Actualiza facturas
- Registra auditoría

---

## 📋 Endpoints Disponibles

### 1. Obtener Clientes de Facturas
```http
GET /api/client-aliases/from_invoices/?threshold=85&limit=50&include_existing=false
```

**Query Parameters:**
- `threshold` (default: 85): Umbral de similitud para agrupar (0-100)
- `limit` (default: 50): Máximo de grupos a retornar
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
      "variants": [...],
      "total_invoices": 85,
      "existing_alias": null,
      "recommendation": "create_new"
    }
  ]
}
```

### 2. Crear Alias Masivamente
```http
POST /api/client-aliases/bulk_create_from_invoices/
```

**Body:**
```json
{
  "canonical_name": "WALMART",
  "variants": [
    "WALMART DE CENTRO AMERICA",
    "WAL-MART",
    "WALMART S.A."
  ],
  "short_name": "WALMART",
  "notes": "Cliente creado desde análisis de facturas"
}
```

**Response:**
```json
{
  "message": "Alias creado exitosamente. 85 facturas asociadas.",
  "alias": {
    "id": 123,
    "original_name": "WALMART",
    "short_name": "WALMART",
    "usage_count": 85,
    "is_verified": true
  },
  "invoices_updated": 85,
  "variants_processed": 3
}
```

### 3. Fusionar con Alias Existente
```http
POST /api/client-aliases/bulk_merge_from_invoices/
```

**Body:**
```json
{
  "target_alias_id": 123,
  "variants": [
    "WALMART DE CENTRO AMERICA",
    "WAL-MART"
  ],
  "notes": "Fusionando variantes detectadas en facturas"
}
```

**Response:**
```json
{
  "message": "Variantes fusionadas exitosamente. 35 facturas actualizadas.",
  "alias": {...},
  "invoices_updated": 35,
  "variants_processed": 2
}
```

---

## 🔧 Flujo de Trabajo Recomendado

### Paso 1: Analizar Facturas
```bash
GET /api/client-aliases/from_invoices/?threshold=85
```

Esto te dará grupos de clientes similares con recomendaciones.

### Paso 2: Revisar Recomendaciones

Para cada grupo, el sistema te dirá si:
- **`create_new`**: No hay alias similar, crear uno nuevo
- **`merge_with_existing`**: Ya existe un alias similar (≥85%), fusionar

### Paso 3A: Crear Nuevo Alias (si `recommendation = "create_new"`)
```bash
POST /api/client-aliases/bulk_create_from_invoices/
{
  "canonical_name": "WALMART",
  "variants": ["WALMART DE CENTRO AMERICA", "WAL-MART"],
  "short_name": "WALMART"
}
```

### Paso 3B: Fusionar con Existente (si `recommendation = "merge_with_existing"`)
```bash
POST /api/client-aliases/bulk_merge_from_invoices/
{
  "target_alias_id": 123,
  "variants": ["WALMART DE CENTRO AMERICA"]
}
```

---

## 🎨 Mejoras en UX/UI

### 1. Generación de Alias más Legibles
**ANTES:**
```
"WAL-MART" → "WAL_MART"
"SUPER SELECTOS" → "SUPER_SELECTOS"
```

**AHORA:**
```
"WAL-MART" → "WAL MART"
"SUPER SELECTOS" → "SUPER SELECTOS"
```

### 2. Manejo Inteligente de Formatos
- `kebab-case` → `PALABRAS SEPARADAS`
- `snake_case` → `PALABRAS SEPARADAS`
- `PascalCase` → `PALABRAS SEPARADAS`

### 3. Recomendaciones Contextuales
El sistema indica:
- Si ya existe un alias similar
- El nivel de similitud
- La acción recomendada
- Cuántas facturas se verán afectadas

---

## 📊 Algoritmo de Similitud

El sistema usa un algoritmo multi-capa que:

1. **Extrae sufijos legales** (S.A., LTDA, DE C.V., etc.)
2. **Normaliza nombres** (uppercase, sin espacios extras)
3. **Tokeniza palabras significativas** (filtra conectores)
4. **Valida palabras clave comunes** (mínimo 2 para nombres largos)
5. **Compara primer token** (nombre principal del negocio)
6. **Combina múltiples métricas** de fuzzy matching
7. **Aplica penalizaciones** por diferencias estructurales

**Umbral recomendado:** 85%

---

## 🔐 Permisos

- **Lectura** (`from_invoices`): Autenticado
- **Creación/Fusión masiva**: Jefe de Operaciones o Admin
- **Edición de aliases**: Jefe de Operaciones o Admin

---

## 💡 Casos de Uso

### Caso 1: Normalizar Clientes Nuevos
**Situación:** Acabas de importar 100 facturas con nombres variados.

**Solución:**
1. `GET /api/client-aliases/from_invoices/` → obtienes 25 grupos
2. Revisas los grupos con más facturas primero
3. Para cada grupo, decides crear nuevo o fusionar
4. El sistema actualiza automáticamente las facturas

### Caso 2: Corregir Errores de Captura
**Situación:** "WAL-MART" y "WALMART" son el mismo cliente.

**Solución:**
1. El sistema los agrupa automáticamente (similitud 95%)
2. Recomienda crear un alias unificado
3. Generas "WAL MART" como alias (sin guión, con espacio)
4. 50 facturas se actualizan automáticamente

### Caso 3: Fusionar con Cliente Existente
**Situación:** "SUPER SELECTOS EL SALVADOR" ya existe como "SUPER SELECTOS".

**Solución:**
1. El sistema detecta similitud del 92%
2. Recomienda `merge_with_existing`
3. Fusionas las variantes con el alias existente
4. Contadores de uso se actualizan

---

## 🚀 Próximos Pasos (Recomendaciones)

### Frontend (UI)
1. **Vista de Normalización de Clientes:**
   - Tabla con grupos de variantes
   - Botones "Crear Nuevo" / "Fusionar"
   - Preview de facturas afectadas
   - Edición en línea del nombre canónico

2. **Dashboard de Progreso:**
   - Barra de progreso: "45 de 120 clientes normalizados"
   - Gráfico de facturas sin normalizar
   - Alertas de clientes duplicados probables

3. **Wizard de Normalización:**
   - Paso 1: Ver grupos pendientes
   - Paso 2: Revisar y editar
   - Paso 3: Confirmar y aplicar
   - Paso 4: Resumen de cambios

### Backend (Futuras Mejoras)
1. **Auto-normalización programada:**
   - Tarea Celery que corre semanalmente
   - Genera reporte de nuevos clientes detectados
   - Email a Jefe de Operaciones

2. **Machine Learning:**
   - Entrenar modelo con decisiones manuales
   - Mejorar umbral de similitud dinámicamente
   - Detectar patrones específicos del negocio

3. **Auditoría completa:**
   - Log de todas las normalizaciones
   - Rollback de normalizaciones incorrectas
   - Historial de cambios por cliente

---

## 📝 Notas Técnicas

### Modelos Actualizados
- `ClientAlias.generate_short_name()` → Mejorado con lógica de espacios
- `ClientAlias._ensure_unique_short_name()` → Nuevo método auxiliar

### Nuevos Endpoints
- `from_invoices` → Análisis inteligente
- `bulk_create_from_invoices` → Creación masiva
- `bulk_merge_from_invoices` → Fusión masiva

### Dependencias
- `fuzzywuzzy` → Fuzzy matching
- `python-Levenshtein` → Optimización de similitud

---

## 🐛 Troubleshooting

### "No se encuentran clientes nuevos"
- Verifica que `include_existing=false`
- Revisa que las facturas tengan `proveedor_nombre` poblado

### "El threshold no agrupa suficientes variantes"
- Baja el threshold a 80 o 75
- Revisa que los nombres sean similares (no completamente diferentes)

### "Alias duplicado"
- El sistema previene duplicados por `normalized_name`
- Si necesitas un nombre exacto, fusiona con el existente

---

## ✅ Checklist de Implementación

- [x] Endpoint `from_invoices` con agrupación inteligente
- [x] Endpoint `bulk_create_from_invoices` para creación masiva
- [x] Endpoint `bulk_merge_from_invoices` para fusión
- [x] Mejora en `generate_short_name()` con manejo de guiones
- [x] Algoritmo de similitud multi-capa
- [x] Validaciones y manejo de errores
- [x] Documentación completa
- [ ] Tests unitarios
- [ ] UI/Frontend para normalización
- [ ] Tutorial en video

---

**Versión:** 1.0
**Fecha:** 2025-01-22
**Autor:** Sistema NextOps - Client Aliases Module

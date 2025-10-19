# Configuración de Cloudinary para NextOps

## 📋 Resumen del Problema Original

El sistema tenía problemas para subir archivos PDF (facturas) con los siguientes errores:

1. **Error CORS**: `No 'Access-Control-Allow-Origin' header is present`
2. **Error 500**: Fallo interno del servidor al procesar uploads
3. **Error de red**: Timeout o fallo de conexión con Cloudinary

## ✅ Soluciones Implementadas

### 1. Storage Backend Limpio (`common/storage_backends.py`)

Se reescribió completamente el backend de almacenamiento con:

- **Streaming eficiente**: El archivo se pasa directamente a Cloudinary sin leerlo completamente en memoria
- **Logging detallado**: Todos los pasos del upload están logueados
- **Manejo robusto de errores**: Errores claros y descriptivos
- **Fallback automático**: Si Cloudinary está deshabilitado, usa filesystem local

### 2. Configuración CORS Completa (`settings/base.py`)

Se agregaron las siguientes configuraciones:

```python
CORS_EXPOSE_HEADERS = [
    'Content-Disposition',
    'Content-Length',
    'Content-Type',
]

CORS_ALLOW_METHODS = [
    'DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'origin', 'user-agent', 'x-csrftoken',
]
```

### 3. Lógica de Upload Simplificada (`invoices/views.py`)

- Eliminadas lecturas duplicadas del archivo
- Logging en cada paso del proceso
- Mensajes de error descriptivos para el usuario

## 🚀 Configuración Paso a Paso

### Paso 1: Obtener Credenciales de Cloudinary

1. Ve a [Cloudinary Console](https://console.cloudinary.com/)
2. Inicia sesión o crea una cuenta
3. En el Dashboard, encontrarás:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### Paso 2: Configurar Variables de Entorno

Edita el archivo `backend/.env` y agrega:

```env
# Cloudinary Configuration
USE_CLOUDINARY=True
CLOUDINARY_CLOUD_NAME=tu-cloud-name-aqui
CLOUDINARY_API_KEY=tu-api-key-aqui
CLOUDINARY_API_SECRET=tu-api-secret-aqui
```

### Paso 3: Verificar la Configuración

Ejecuta el script de prueba:

```bash
# Usando Docker
docker exec nextops_backend python test_cloudinary.py

# O localmente
cd backend
python test_cloudinary.py
```

Deberías ver:

```
✓ All tests passed! Cloudinary is configured correctly.
```

### Paso 4: Reiniciar el Backend

```bash
# Con Docker
docker-compose restart backend

# O sin Docker
# Detener el servidor y volver a iniciarlo
```

## 🔧 Troubleshooting

### Error: "USE_CLOUDINARY=False"

**Problema**: Cloudinary está deshabilitado.

**Solución**:
```bash
# Editar .env
echo "USE_CLOUDINARY=True" >> backend/.env

# Reiniciar
docker-compose restart backend
```

### Error: "Error uploading to Cloudinary: 401 Unauthorized"

**Problema**: Credenciales incorrectas.

**Solución**:
1. Verifica que las credenciales en `.env` sean correctas
2. Asegúrate de no tener espacios extra
3. Reinicia el backend después de cambiar

### Error: "Network Error" en el Frontend

**Problema**: El frontend no puede conectarse al backend.

**Solución**:
1. Verifica que CORS esté configurado correctamente
2. Verifica que el backend esté corriendo: `docker ps`
3. Verifica los logs: `docker logs nextops_backend`

### Error: "Timeout" al Subir Archivos Grandes

**Problema**: Archivos muy grandes (>10MB) tardan demasiado.

**Solución**:
```python
# En storage_backends.py, aumentar timeout
upload_result = cloudinary.uploader.upload(
    content,
    timeout=300,  # 5 minutos en lugar de 2
    chunk_size=6000000,
)
```

## 📊 Logs y Debugging

### Ver Logs del Backend

```bash
# Logs en tiempo real
docker logs -f nextops_backend

# Últimas 100 líneas
docker logs --tail=100 nextops_backend

# Filtrar por Cloudinary
docker logs nextops_backend 2>&1 | grep -i cloudinary
```

### Logs Importantes

Cuando subes un archivo, deberías ver:

```
INFO: Processing file: factura.pdf (size: 125000 bytes)
INFO: Uploading new file: 20251019_120000_factura.pdf
INFO: Uploading to Cloudinary: invoices/20251019_120000_factura
INFO: ✓ Upload successful: invoices/20251019_120000_factura.pdf
INFO: ✓ File saved successfully: invoices/20251019_120000_factura.pdf
INFO: ✓ UploadedFile record created: ID=123
```

### Errores Comunes en Logs

| Error | Causa | Solución |
|-------|-------|----------|
| `No module named 'cloudinary'` | Librería no instalada | `pip install cloudinary` |
| `401 Unauthorized` | Credenciales incorrectas | Revisar `.env` |
| `Connection timeout` | Red lenta o Cloudinary caído | Aumentar timeout |
| `Invalid cloud_name` | Cloud name incorrecto | Verificar en Cloudinary console |

## 🧪 Testing

### Test Manual con cURL

```bash
# Obtener token JWT
TOKEN=$(curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tu-password"}' \
  | jq -r '.access')

# Subir archivo
curl -X POST http://localhost:8000/api/invoices/upload/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@test.pdf" \
  -F "proveedor_id=1" \
  -F "auto_parse=true"
```

### Test desde el Frontend

1. Abre el frontend: http://localhost:5173
2. Ve a "Facturas" → "Subir Facturas"
3. Selecciona un proveedor
4. Arrastra un PDF de prueba
5. Haz clic en "Subir"

**Resultado esperado**:
- Barra de progreso al 100%
- Mensaje "✓ Factura creada exitosamente"
- El archivo aparece en la lista de facturas

## 🌐 Producción (Railway)

### Variables de Entorno en Railway

1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Agrega:
   ```
   USE_CLOUDINARY=true
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_API_SECRET=tu-api-secret
   ```

### Verificar en Producción

```bash
# SSH a Railway (si está disponible)
railway run python test_cloudinary.py

# O verificar logs
railway logs
```

## 📚 Arquitectura del Sistema

```
┌─────────────┐
│  Frontend   │  (React + Vite)
│  :5173      │
└──────┬──────┘
       │ HTTP POST /api/invoices/upload/
       │ FormData: files[], proveedor_id
       ▼
┌─────────────────────────────────────┐
│  Django Backend                     │
│  ┌───────────────────────────────┐  │
│  │  InvoiceViewSet.upload()      │  │
│  │  1. Calcular SHA256            │  │
│  │  2. Verificar duplicado        │  │
│  │  3. get_storage().save()       │  │
│  └────────────┬──────────────────┘  │
│               ▼                     │
│  ┌───────────────────────────────┐  │
│  │  CloudinaryMediaStorage       │  │
│  │  - _save() → upload a cloud   │  │
│  │  - url() → genera URL pública │  │
│  └────────────┬──────────────────┘  │
└────────────────┼─────────────────────┘
                 │ API REST
                 ▼
         ┌──────────────┐
         │  Cloudinary  │
         │   Cloud      │
         └──────────────┘
```

## 🔐 Seguridad

### No Exponer Credenciales

❌ **MAL**:
```python
# settings.py
CLOUDINARY_API_KEY = "123456789"  # NUNCA hacer esto
```

✅ **BIEN**:
```python
# settings.py
CLOUDINARY_API_KEY = config('CLOUDINARY_API_KEY')

# .env
CLOUDINARY_API_KEY=123456789
```

### Gitignore

Asegúrate de que `.env` esté en `.gitignore`:

```gitignore
# .gitignore
.env
.env.local
.env.production
```

## 📞 Soporte

Si sigues teniendo problemas:

1. Revisa los logs: `docker logs nextops_backend`
2. Ejecuta el test: `python test_cloudinary.py`
3. Verifica las credenciales en [Cloudinary Console](https://console.cloudinary.com/)
4. Revisa que CORS esté configurado en `settings/base.py`

## 📝 Cambios Realizados

### Archivos Modificados

1. ✅ `backend/common/storage_backends.py` - Reescrito desde cero
2. ✅ `backend/proyecto/settings/base.py` - Agregado CORS completo
3. ✅ `backend/invoices/views.py` - Simplificada lógica de upload
4. ✅ `backend/test_cloudinary.py` - Script de testing creado

### Archivos Nuevos

1. ✅ `CLOUDINARY_SETUP.md` - Esta guía
2. ✅ `test_cloudinary.py` - Script de diagnóstico

## 🎯 Resultado Final

Con estos cambios, el sistema ahora:

- ✅ Sube archivos PDF correctamente a Cloudinary
- ✅ Maneja errores de forma clara y descriptiva
- ✅ Tiene logging detallado para debugging
- ✅ CORS configurado correctamente
- ✅ Funciona tanto en desarrollo (filesystem) como en producción (Cloudinary)
- ✅ Tiene fallback automático si Cloudinary falla

# ☁️ Configuración de Cloudinary para NextOps (Producción Railway)

## 📋 Credenciales de Cloudinary

```
Cloud name:  dackhl30s
API key:     283423631597279
API secret:  AsR54uSB8up4QNSwb7gCeItoACw
```

---

## 🚀 Configuración en Railway (PRODUCCIÓN)

### Variables de Entorno en Railway

Ve a tu proyecto en Railway → **Settings** → **Variables** y agrega:

```env
USE_CLOUDINARY=True
CLOUDINARY_CLOUD_NAME=dackhl30s
CLOUDINARY_API_KEY=283423631597279
CLOUDINARY_API_SECRET=AsR54uSB8up4QNSwb7gCeItoACw
```

O puedes usar la variable unificada:

```env
CLOUDINARY_URL=cloudinary://283423631597279:AsR54uSB8up4QNSwb7gCeItoACw@dackhl30s
```

**IMPORTANTE**: Railway redeploya automáticamente cuando cambias variables de entorno.

---

## 💻 Configuración Local (DESARROLLO)

### backend/.env (Local - NO usar Cloudinary)

```env
# Cloudinary - DESHABILITADO en desarrollo (usa filesystem local)
USE_CLOUDINARY=False
CLOUDINARY_CLOUD_NAME=dackhl30s
CLOUDINARY_API_KEY=283423631597279
CLOUDINARY_API_SECRET=AsR54uSB8up4QNSwb7gCeItoACw

# Otros ajustes
DEBUG=True
BACKEND_URL=http://localhost:8000
```

**¿Por qué `USE_CLOUDINARY=False` en desarrollo?**
- ✅ Más rápido (sin latencia de red)
- ✅ No consume cuota de Cloudinary
- ✅ Funciona sin internet
- ✅ Archivos locales fáciles de inspeccionar

---

## 🧪 Verificar Configuración

### En Railway (Producción)

```bash
# Método 1: Desde Railway CLI
railway run python test_cloudinary.py

# Método 2: Ver logs
railway logs
```

**Resultado esperado:**
```
✓ USE_CLOUDINARY: True
✓ CLOUD_NAME: dackhl30s
✓ Upload successful!
✓ All tests passed!
```

### En Local (Desarrollo)

```bash
docker exec nextops_backend python test_cloudinary.py
```

**Resultado esperado:**
```
✓ USE_CLOUDINARY: False
✓ Using local filesystem
✓ All tests passed!
```

---

## 📊 Flujo de Archivos

### Desarrollo (Local)
```
┌──────────┐     Upload     ┌──────────────┐
│ Frontend │ ──────────────> │   Backend    │
│  :5173   │                 │  (Django)    │
└──────────┘                 └──────┬───────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │ FileSystem    │
                            │ backend/media/│
                            └───────────────┘
```

### Producción (Railway)
```
┌──────────┐     Upload     ┌──────────────┐
│ Frontend │ ──────────────> │   Backend    │
│ Vercel   │                 │  (Railway)   │
└──────────┘                 └──────┬───────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Cloudinary   │
                            │  (dackhl30s)  │
                            └───────────────┘
```

---

## 🔍 Troubleshooting

### Error: "401 Unauthorized" en Railway

**Causa**: Credenciales incorrectas o no configuradas.

**Solución**:
1. Ve a Railway → Variables
2. Verifica que estén EXACTAMENTE así:
   ```
   CLOUDINARY_CLOUD_NAME=dackhl30s
   CLOUDINARY_API_KEY=283423631597279
   CLOUDINARY_API_SECRET=AsR54uSB8up4QNSwb7gCeItoACw
   USE_CLOUDINARY=True
   ```
3. Railway redeploya automáticamente

### Error: "Archivos se guardan localmente en Railway"

**Causa**: `USE_CLOUDINARY=False` o no está configurado.

**Solución**:
```bash
# Verificar en Railway
railway run python -c "from django.conf import settings; print(settings.USE_CLOUDINARY)"
# Debe retornar: True
```

### Archivos no se ven después del redeploy en Railway

**Causa**: Railway no tiene volúmenes persistentes (los archivos locales se pierden).

**Solución**:
- ✅ **Ya está resuelto**: Con `USE_CLOUDINARY=True`, todos los archivos van a Cloudinary
- ✅ Cloudinary es persistente (no se pierden entre deploys)

### CORS Error desde Vercel → Railway

**Causa**: CORS no configurado correctamente.

**Solución**: Ya está configurado en `settings/base.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'https://nextops-plg.vercel.app',
    # ... otros orígenes
]
```

---

## 📝 Checklist de Configuración

### ✅ En Railway (Ya configurado en el código)

- [x] Storage backend limpio (`storage_backends.py`)
- [x] CORS configurado (`settings/base.py`)
- [x] Upload optimizado (`views.py`)
- [x] Logging detallado

### ⏳ En Railway (Debes configurar)

- [ ] Agregar variables de entorno:
  - `USE_CLOUDINARY=True`
  - `CLOUDINARY_CLOUD_NAME=dackhl30s`
  - `CLOUDINARY_API_KEY=283423631597279`
  - `CLOUDINARY_API_SECRET=AsR54uSB8up4QNSwb7gCeItoACw`

### ✅ En Local (Desarrollo)

- [ ] Verificar `backend/.env`:
  - `USE_CLOUDINARY=False`
  - Credenciales presentes (para testing)

---

## 🎯 Configurar Railway AHORA

### Opción 1: Desde Railway Dashboard

1. Ve a https://railway.app
2. Abre tu proyecto **NextOps**
3. Click en el servicio **backend**
4. Tab **Variables**
5. Click **+ New Variable**
6. Agrega una por una:

```
Name: USE_CLOUDINARY
Value: True
```

```
Name: CLOUDINARY_CLOUD_NAME
Value: dackhl30s
```

```
Name: CLOUDINARY_API_KEY
Value: 283423631597279
```

```
Name: CLOUDINARY_API_SECRET
Value: AsR54uSB8up4QNSwb7gCeItoACw
```

7. Railway redeploya automáticamente ✅

### Opción 2: Desde Railway CLI

```bash
railway variables set USE_CLOUDINARY=True
railway variables set CLOUDINARY_CLOUD_NAME=dackhl30s
railway variables set CLOUDINARY_API_KEY=283423631597279
railway variables set CLOUDINARY_API_SECRET=AsR54uSB8up4QNSwb7gCeItoACw
```

---

## 🧪 Probar en Producción

### Después de configurar las variables:

1. Espera a que Railway termine el redeploy (~2 min)
2. Ve a tu frontend en Vercel: https://nextops-plg.vercel.app
3. Sube una factura de prueba
4. Verifica en Cloudinary Console: https://console.cloudinary.com/console/dackhl30s/media_library

**Deberías ver:**
- ✅ Archivo en carpeta `invoices/`
- ✅ Timestamp en el nombre
- ✅ URL pública funcional

---

## 📊 Monitoreo

### Ver logs en Railway

```bash
railway logs --follow
```

Busca mensajes como:
```
INFO: Uploading to Cloudinary: invoices/20251019_120000_factura
INFO: ✓ Upload successful: invoices/20251019_120000_factura.pdf
```

### Ver archivos en Cloudinary

1. Ve a https://console.cloudinary.com/console/dackhl30s
2. Click en **Media Library**
3. Carpeta **invoices/**
4. Verás todos los PDFs subidos

---

## 💾 Cuota de Cloudinary

Tu plan de Cloudinary incluye:

- **Free Plan**: 25 GB almacenamiento, 25 GB bandwidth/mes
- **Archivos PDF**: ~100-500 KB cada uno
- **Capacidad estimada**: ~50,000 facturas en el plan free

Para ver tu uso actual:
https://console.cloudinary.com/console/dackhl30s/settings/usage

---

## 🔐 Seguridad

### ⚠️ IMPORTANTE: No subir credenciales a Git

Verifica que `.env` esté en `.gitignore`:

```bash
# Verificar
cat .gitignore | grep .env
```

Debe mostrar:
```
.env
.env.local
.env.production
```

### Variables en Railway vs Git

✅ **CORRECTO**: Variables en Railway Dashboard
❌ **INCORRECTO**: Variables hardcodeadas en código

```python
# ❌ NUNCA hacer esto
CLOUDINARY_API_KEY = "283423631597279"

# ✅ SIEMPRE hacer esto
CLOUDINARY_API_KEY = config('CLOUDINARY_API_KEY')
```

---

## 📞 Siguiente Paso

**Configura las variables en Railway AHORA** siguiendo la sección "Configurar Railway AHORA" arriba.

Después de configurar:
1. Railway redeploya automáticamente
2. Prueba subiendo una factura desde Vercel
3. Verifica que aparezca en Cloudinary Console

¿Listo? 🚀

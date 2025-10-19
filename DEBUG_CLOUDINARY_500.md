# 🔍 Debug Error 500 al Descargar PDFs

## 📋 Situación Actual

- ✅ Facturas se suben correctamente
- ❌ Error 500 al intentar ver/descargar: `GET /api/invoices/110/file/ 500`

---

## 🚀 Paso 1: Deploy con Logging Mejorado

Acabo de agregar logging detallado para identificar exactamente dónde falla.

```bash
git push origin main
```

**Espera** ~3 minutos para que Railway redeploy.

---

## 🔍 Paso 2: Reproducir el Error

1. Ve a https://nextops-plg.vercel.app
2. Abre cualquier factura
3. Click "Ver PDF"
4. **Debe dar error 500** (esperado por ahora)

---

## 📊 Paso 3: Ver Logs de Railway

```bash
railway logs --tail=100
```

O desde Railway Dashboard:
1. Ve a tu proyecto
2. Click en servicio "backend"
3. Tab "Deployments"
4. Click en el último deployment
5. Ver logs

---

## 🎯 Qué Buscar en los Logs

Busca estas líneas (en orden):

```
INFO: Fetching file from Cloudinary: invoices/XXXXX.pdf
INFO: Invoice ID: 110, Filename: XXXXX.pdf
INFO: Generated download URL: https://api.cloudinary.com/...
INFO: Downloading from Cloudinary...
INFO: Cloudinary response status: XXX
```

### Posibles Escenarios:

#### Escenario A: Error al generar URL

```
ERROR: Error generating download URL: ...
```

**Causa**: Problema con `private_download_url`
**Solución**: El código tiene fallback automático

#### Escenario B: File not found (404)

```
ERROR: File not found in Cloudinary: invoices/XXXXX.pdf
```

**Causa**: Archivo no existe en Cloudinary
**Solución**: Re-subir factura

#### Escenario C: Error de autenticación (401/403)

```
ERROR: Cloudinary download failed: 401
```

**Causa**: Credenciales incorrectas
**Solución**: Verificar variables en Railway

#### Escenario D: Timeout

```
ERROR: Timeout al descargar de Cloudinary
```

**Causa**: Archivo muy grande o red lenta
**Solución**: Aumentar timeout

---

## 🛠️ Soluciones por Escenario

### Si el archivo no existe (404)

El archivo se subió pero con una ruta diferente.

**Verificar en Cloudinary Console**:
1. Ve a https://console.cloudinary.com/console/dackhl30s/media_library
2. Busca la carpeta `invoices/`
3. Encuentra el archivo
4. Verifica el "Public ID"

**Si el Public ID es diferente**:
- Ejemplo: Esperado `invoices/20251019_185625_SVIMC131873.pdf`
- Real en Cloudinary: `invoices/20251019_185625_SVIMC131873` (sin extensión)

→ Necesitamos ajustar el código.

### Si las credenciales fallan (401)

```bash
# Verificar variables en Railway
railway run env | grep CLOUDINARY

# Deben estar todas:
CLOUDINARY_CLOUD_NAME=dackhl30s
CLOUDINARY_API_KEY=283423631597279
CLOUDINARY_API_SECRET=AsR54uSB8up4QNSwb7gCeItoACw
```

---

## 📝 Compartir Logs

Después de reproducir el error, copia los logs:

```bash
railway logs --tail=50 > cloudinary_error.log
```

Y pega aquí:

```
[PEGAR LOGS AQUÍ]
```

---

## 🔧 Fix Temporal: Re-subir Facturas

Mientras debugueamos:

1. Ve a Facturas
2. Elimina la factura con error
3. Vuelve a subirla
4. Intenta ver/descargar

**¿Funciona ahora?**
- ✅ Sí → El problema era con facturas viejas
- ❌ No → El problema es con el código actual

---

## 💡 Siguiente Paso

1. **Hacer push**:
   ```bash
   git push origin main
   ```

2. **Esperar deploy** (~3 min)

3. **Reproducir error**

4. **Ver logs**:
   ```bash
   railway logs --tail=100 | grep -E "INFO|ERROR|Cloudinary"
   ```

5. **Compartir output** para que pueda hacer el fix específico

---

## 🎯 Con los logs podré:

- ✅ Identificar la causa exacta
- ✅ Ver el Public ID real vs esperado
- ✅ Ver el status code de Cloudinary
- ✅ Hacer fix preciso en minutos

¿Listo? Haz push y comparte los logs 🚀

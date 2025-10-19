# 🚀 Quick Fix: Configuración de Cloudinary

## El Problema
- ❌ Error CORS al subir facturas
- ❌ Error 500 en el servidor
- ❌ Archivos no se suben a Cloudinary

## La Solución (3 Pasos)

### 1️⃣ Configurar Cloudinary

Edita `backend/.env` y agrega tus credenciales:

```env
USE_CLOUDINARY=True
CLOUDINARY_CLOUD_NAME=tu-nombre-aqui
CLOUDINARY_API_KEY=tu-api-key-aqui
CLOUDINARY_API_SECRET=tu-secret-aqui
```

**¿Dónde consigo estas credenciales?**
👉 https://console.cloudinary.com/ (Dashboard principal)

### 2️⃣ Reiniciar el Backend

```bash
docker-compose restart backend
```

### 3️⃣ Probar

```bash
docker exec nextops_backend python test_cloudinary.py
```

**Resultado esperado:**
```
✓ All tests passed! Cloudinary is configured correctly.
```

## ¿Qué se arregló?

### ✅ Storage Backend Limpio
- Ahora usa streaming (no carga el archivo completo en memoria)
- Logging detallado en cada paso
- Manejo robusto de errores

### ✅ CORS Configurado Correctamente
- Headers expuestos correctamente
- Métodos HTTP permitidos
- Headers de autorización configurados

### ✅ Upload Simplificado
- Una sola lectura del archivo (no múltiples)
- Logs claros para debugging
- Errores descriptivos

## Ver Logs

```bash
# En tiempo real
docker logs -f nextops_backend

# Filtrar por Cloudinary
docker logs nextops_backend 2>&1 | grep -i cloudinary
```

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `USE_CLOUDINARY=False` | Cambiar a `True` en `.env` y reiniciar |
| `401 Unauthorized` | Verificar credenciales en `.env` |
| `Network Error` | Verificar CORS en `settings/base.py` |
| `Timeout` | Aumentar timeout en `storage_backends.py` |

## Archivos Modificados

```
✅ backend/common/storage_backends.py (reescrito)
✅ backend/proyecto/settings/base.py (CORS agregado)
✅ backend/invoices/views.py (upload simplificado)
✅ backend/test_cloudinary.py (nuevo script de testing)
```

## ¿Necesitas Más Ayuda?

Lee la guía completa: `CLOUDINARY_SETUP.md`

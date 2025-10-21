# Configuración de Railway para Optimización de Memoria

## Variables de Entorno a Agregar/Actualizar en Railway

### 1. Variables de Gunicorn (CRÍTICO)
```bash
GUNICORN_WORKERS=2
GUNICORN_WORKER_CLASS=gevent
GUNICORN_TIMEOUT=120
GUNICORN_MAX_REQUESTS=500
GUNICORN_MAX_REQUESTS_JITTER=50
GUNICORN_WORKER_CONNECTIONS=500
```

### 2. Variables de Django
```bash
DJANGO_SETTINGS_MODULE=proyecto.settings.prod
LOG_LEVEL=WARNING
PYTHONUNBUFFERED=1
```

### 3. Variables de Base de Datos (ya existentes, verificar)
```bash
DATABASE_URL=<tu-url-de-postgres>
REDIS_URL=<tu-url-de-redis>
```

### 4. Variables de Cloudinary (ya existentes, verificar)
```bash
USE_CLOUDINARY=true
CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
CLOUDINARY_API_KEY=<tu-api-key>
CLOUDINARY_API_SECRET=<tu-api-secret>
```

---

## Pasos para Deploy

### 1. Instalar Nueva Dependencia
El archivo `requirements.txt` ahora incluye `gevent==24.2.1`. Railway lo instalará automáticamente en el próximo deploy.

### 2. Verificar Variables de Entorno
En el dashboard de Railway:
1. Ve a tu servicio → **Variables** tab
2. Agrega las variables de Gunicorn listadas arriba
3. Verifica que `DJANGO_SETTINGS_MODULE=proyecto.settings.prod`

### 3. Deploy
```bash
git add .
git commit -m "Optimize: Reduce memory usage from 5GB to ~1GB

- Reduce Gunicorn workers from 5 to 2
- Switch to gevent workers for async I/O
- Add worker recycling (max_requests=500)
- Simplify logging (remove file handlers)
- Reduce DB connection lifetime
- Add memory optimization documentation"

git push origin main
```

Railway detectará el push y hará deploy automáticamente.

### 4. Monitorear Después del Deploy

#### En Railway Dashboard:
- **Memory Usage**: Debería bajar de ~5GB a **~1GB o menos**
- **CPU Usage**: Podría aumentar ligeramente (normal con menos workers)
- **Response Times**: Deberían mejorar con gevent

#### Verificar Logs:
```bash
# En Railway, ve a Deployments → View Logs
# Busca esta línea al inicio:
"Gunicorn starting with config:"
"  Workers: 2"
"  Timeout: 120s"
```

---

## Troubleshooting

### Si el Deploy Falla

#### Error: "No module named 'gevent'"
**Solución**: Verificar que `requirements.txt` tiene `gevent==24.2.1`

```bash
# Verificar localmente:
cat backend/requirements.txt | grep gevent

# Debe mostrar:
gevent==24.2.1
```

#### Error: "Worker timeout"
**Solución**: Aumentar timeout temporalmente

```bash
# En Railway variables:
GUNICORN_TIMEOUT=180
```

#### Memory Usage Sigue Alto
**Posibles causas**:
1. Celery workers no optimizados (si los tienes)
2. Queries pesadas en background
3. Memory leak en código personalizado

**Debugging**:
```bash
# Ver procesos en Railway:
railway run ps aux

# Ver memoria por proceso:
railway run top -b -n 1
```

---

## Próximos Pasos (Opcional)

### Fase 2: Optimizaciones de Código
Si después de esto sigues teniendo problemas:

1. **Optimizar Exports** (invoices/ots views)
   - Usar `.iterator()` en lugar de cargar todo en memoria
   - Implementar paginación en exports

2. **Streaming de Archivos**
   - Calcular hash sin cargar archivo completo
   - Upload a Cloudinary por chunks

3. **Agregar Memory Profiling**
   - Instalar `memory-profiler`
   - Agregar middleware para tracking

### Ejemplo de Memory Middleware:
```python
# backend/common/middleware/memory_monitor.py
import logging
import random

logger = logging.getLogger('memory')

class MemoryMonitorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Sample 1% of requests
        if random.randint(1, 100) == 1:
            try:
                import psutil
                process = psutil.Process()
                mem_mb = process.memory_info().rss / 1024 / 1024
                logger.warning(f'Memory: {mem_mb:.0f}MB | Path: {request.path}')
            except:
                pass

        return response
```

---

## Costos Esperados

### Antes (5GB RAM):
- Plan Railway: Pro ($20/mes base)
- Memory overage: ~$20-30/mes adicional
- **Total: ~$40-50/mes**

### Después (1GB RAM):
- Plan Railway: Pro ($20/mes base)
- Memory overage: $0 (dentro del límite)
- **Total: ~$20/mes** ✅

**Ahorro estimado: $20-30/mes**

---

## Checklist de Deploy

- [ ] Variables de Gunicorn agregadas en Railway
- [ ] `gevent==24.2.1` en requirements.txt
- [ ] Commit y push a main
- [ ] Verificar deploy exitoso en Railway
- [ ] Monitorear memory usage por 24 horas
- [ ] Verificar que la app funciona correctamente
- [ ] Documentar consumo de memoria nuevo

---

## Contacto y Soporte

Si tienes problemas con el deploy:

1. **Railway Logs**: Revisa primero los logs del deploy
2. **Railway Discord**: https://discord.gg/railway
3. **Documentación**: https://docs.railway.app

---

## Notas Adicionales

### ¿Por qué gevent?
- **Mejor para I/O**: Tu app hace muchas operaciones de I/O (Cloudinary, DB, Redis)
- **Menos memoria**: 1 worker gevent puede manejar muchas conexiones concurrentes
- **Mejor throughput**: Con 2 workers gevent vs 5 sync

### ¿Cuándo NO usar gevent?
- Si tu app hace mucho procesamiento CPU-intensivo (no es el caso)
- Si usas librerías que no son gevent-compatible (todas las tuyas lo son)

### Alternativas consideradas
- **gunicorn sync**: Simple pero usa mucha memoria
- **uvicorn**: Más moderno pero requiere cambios en el código
- **gevent**: ✅ Mejor balance para tu caso de uso

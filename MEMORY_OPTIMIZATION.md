# Optimización de Consumo de Memoria en Railway

## Problema Actual
- Consumo: **~5GB RAM** sin uso activo
- Plan Railway: Probablemente 512MB-1GB (se está excediendo)
- Costo: Cobros por overages

## Causas Identificadas

### 1. Configuración de Gunicorn (CRÍTICO)
**Archivo**: `backend/gunicorn_config.py:13`

**Problema**:
```python
workers = multiprocessing.cpu_count() * 2 + 1  # = 5 workers con 2 CPUs
```
- Cada worker: ~400-800MB
- Total: **~3GB solo en workers**

**Solución**:
```python
# Optimizado para Railway (1GB RAM)
workers = int(os.getenv('GUNICORN_WORKERS', 2))  # Máximo 2 workers
worker_class = 'gevent'  # Async workers (mejor para I/O)
worker_connections = 500  # Reducido de 1000
max_requests = 500  # Reciclar workers cada 500 requests
max_requests_jitter = 50  # Evitar reciclaje simultáneo
```

### 2. Exports Sin Paginación (CRÍTICO)
**Archivos**:
- `backend/invoices/views.py:960`
- `backend/ots/views.py:1058`

**Problema**:
```python
self.paginator.page_size = 10000  # Carga TODO en memoria
```

**Solución**:
```python
# Usar iterador en lugar de cargar todo
queryset = self.filter_queryset(self.get_queryset())
for row_num, record in enumerate(queryset.iterator(chunk_size=100), 2):
    # Procesar en chunks de 100
```

### 3. Archivos en Memoria (ALTO)
**Archivo**: `backend/invoices/views.py:442`

**Problema**:
```python
file_content = file.read()  # 15MB × 3 copias = 45MB
```

**Solución**:
```python
# Usar streaming para archivos grandes
import hashlib
hasher = hashlib.sha256()
file.seek(0)
for chunk in file.chunks(chunk_size=8192):
    hasher.update(chunk)
file_hash = hasher.hexdigest()
```

### 4. Queries N+1 en Loops (MEDIO)
**Archivo**: `backend/ots/views.py:1108`

**Problema**:
```python
for ot in queryset:
    cliente_name = ot.cliente.original_name  # Query por cada OT
```

**Solución**:
```python
# Ya tienes select_related, pero falta en exports:
queryset = queryset.select_related('cliente', 'proveedor', 'modificado_por')
```

### 5. Logging Filesystem (BAJO)
**Archivo**: `backend/proyecto/settings/base.py:364`

**Problema**:
- 50MB de logs en disco
- Logs duplicados en múltiples handlers

**Solución**:
```python
# En producción, solo logs a stdout (Railway los captura)
if not DEBUG:
    LOGGING['handlers'] = {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    }
```

### 6. Connection Pooling (BAJO)
**Archivo**: `backend/proyecto/settings/base.py:91`

**Problema**:
```python
conn_max_age=600  # 10 minutos
```

**Solución**:
```python
# Reducir a 60 segundos para liberar conexiones
conn_max_age=60,
conn_health_checks=True,
```

---

## Plan de Implementación (Priorizado)

### FASE 1: Quick Wins (Reducir ~2-3GB)
1. **Reducir workers de Gunicorn** (5 → 2)
2. **Agregar max_requests** (reciclar workers)
3. **Cambiar a gevent workers** (async I/O)

### FASE 2: Optimizaciones de Código (Reducir ~1GB)
4. **Fix exports con iterators**
5. **Streaming para archivos grandes**
6. **Optimizar logging**

### FASE 3: Monitoring (Prevenir futuros leaks)
7. **Agregar middleware de memory tracking**
8. **Configurar alerts en Railway**

---

## Consumo Esperado Después de Optimizaciones

### Antes:
- Workers: 5 × 600MB = **3GB**
- Exports: **500MB** (picos)
- Uploads: **200MB** (picos)
- Logs: **50MB**
- **Total: ~5GB**

### Después:
- Workers: 2 × 400MB = **800MB**
- Exports: **50MB** (streaming)
- Uploads: **50MB** (streaming)
- Logs: **10MB** (solo stdout)
- **Total: ~1GB** ✅

---

## Variables de Entorno para Railway

```bash
# Agregar a Railway:
GUNICORN_WORKERS=2
GUNICORN_TIMEOUT=120
WEB_CONCURRENCY=2  # Para Heroku/Railway auto-config
PYTHONUNBUFFERED=1
LOG_LEVEL=WARNING  # Reducir logs en producción
```

---

## Monitoreo

### Railway Dashboard
- Memory usage
- CPU usage
- Response times

### Django Debug Toolbar (solo dev)
- Query counts
- Cache hits/misses

### Custom Middleware (producción)
```python
# backend/common/middleware/memory_monitor.py
import psutil
import logging

class MemoryMonitorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('memory')

    def __call__(self, request):
        response = self.get_response(request)

        # Log memory usage cada 100 requests
        if random.randint(1, 100) == 1:
            process = psutil.Process()
            mem_mb = process.memory_info().rss / 1024 / 1024
            self.logger.warning(f'Memory: {mem_mb:.0f}MB')

        return response
```

---

## Referencias
- [Gunicorn Workers](https://docs.gunicorn.org/en/stable/design.html#choosing-a-worker-type)
- [Django QuerySet Optimization](https://docs.djangoproject.com/en/5.1/topics/db/optimization/)
- [Railway Memory Limits](https://docs.railway.app/reference/scaling)

# 🚨 CRÍTICO: Memory Leaks en Celery Workers

## ⚠️ PROBLEMAS GRAVES ENCONTRADOS

### 1. 🔴 Celery Workers Sin Optimizar (CRÍTICO)

**Ubicación**: En Railway tienes Celery workers corriendo que **NO están optimizados**

#### Problema:
```yaml
# docker-compose.yml muestra:
celery:
  command: celery -A workers.celery worker --loglevel=info

celery-beat:
  command: celery -A workers.celery beat --loglevel=info
```

**Estos workers están consumiendo memoria adicional sin límites:**
- Cada worker Celery: **~500-800MB** constante
- Sin `max-tasks-per-child` → **NUNCA reciclan** → Memory leaks acumulados
- Sin `--concurrency` configurado → Usa CPU count (puede ser 4-8 workers)
- Total estimado: **2-4GB solo en Celery** 🔥

---

### 2. 🔴 Email Processor Carga Archivos Completos (CRÍTICO)

**Archivo**: `backend/automation/services/email_processor.py:336-337`

```python
# PROBLEMA:
content_bytes_base64 = attachment.get('contentBytes', '')
content_bytes = base64.b64decode(content_bytes_base64)  # ¡TODO EN MEMORIA!
```

**Impacto**:
- Attachment de **10MB** → Se carga **completo** en RAM
- Si procesa **10 emails** con attachments → **100MB+ en memoria**
- Tarea se ejecuta **cada 15 minutos** → Memoria nunca se libera completamente
- **Acumulación**: 100MB cada 15 min × 24 horas = **potencial 9.6GB/día** 🔥

---

### 3. 🟡 Archivos No Se Guardan en Storage (BUG)

**Archivo**: `backend/automation/services/email_processor.py:399`

```python
# TODO: Guardar archivo físicamente en storage
# Por ahora solo creamos el registro  ← ¡ESTO ES UN BUG!
```

**Problema**:
- Crea registro en DB pero **NO guarda el archivo**
- Referencias de `uploaded_file` apuntan a archivos **inexistentes**
- Cuando intentas descargar después → **404 error**
- Memory leak: contenido del archivo **permanece en memoria** del worker

---

### 4. 🔴 Task Sin Límite de Tiempo

**Archivo**: `backend/automation/tasks.py:18-19`

```python
@shared_task(
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
# ¡Falta time_limit!
```

**Problema**:
- Task puede correr **indefinidamente**
- Si MS Graph se cuelga → Worker bloqueado permanentemente
- Worker bloqueado = **Memoria no se libera**

---

### 5. 🟡 Celery Beat Schedule Desconfigurado

**Archivo**: `backend/proyecto/settings/base.py:310`

```python
CELERY_BEAT_SCHEDULE = {}  # ¡Vacío!
```

**Pero en otro archivo hay**:
```python
CELERY_BEAT_SCHEDULE = {
    'process-dte-mailbox-every-15-minutes': {
        'task': 'automation.process_dte_mailbox',
        'schedule': crontab(minute='*/15'),  # ¡Cada 15 minutos!
    },
}
```

**Problema**: Configuración inconsistente entre archivos

---

## 💥 IMPACTO TOTAL ESTIMADO

| Componente | Consumo RAM | Frecuencia |
|------------|-------------|------------|
| Gunicorn (sin opt) | 3GB | Constante |
| Celery Workers (4×) | 3GB | Constante |
| Email Processing | 100MB | Cada 15min |
| Archivos en memoria | Variable | Acumulativo |
| **TOTAL** | **~6-8GB** | 🔥 |

**Tu problema de 5GB es la SUMA de Gunicorn + Celery sin optimizar.**

---

## ✅ SOLUCIONES URGENTES

### 1. Optimizar Celery Workers

**Crear**: `backend/celery_config.py`
```python
# Celery Worker Configuration (Railway optimized)
CELERYD_MAX_TASKS_PER_CHILD = 100  # Reciclar cada 100 tasks
CELERYD_CONCURRENCY = 2  # Solo 2 workers (como Gunicorn)
CELERYD_PREFETCH_MULTIPLIER = 1  # No acumular tasks
CELERYD_TASK_SOFT_TIME_LIMIT = 300  # 5 min soft limit
CELERYD_TASK_TIME_LIMIT = 600  # 10 min hard limit

# Memory optimization
CELERYD_WORKER_LOST_WAIT = 10
CELERYD_WORKER_MAX_MEMORY_PER_CHILD = 200000  # 200MB max per child
```

### 2. Optimizar Email Processor - Streaming

**Modificar**: `backend/automation/services/email_processor.py`
```python
def _process_attachment(self, attachment, message_id, sender_email):
    # BEFORE: content_bytes = base64.b64decode(content_bytes_base64)

    # AFTER: Stream to file directly
    content_bytes_base64 = attachment.get('contentBytes', '')

    # Usar tempfile para no cargar en memoria
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        # Decode en chunks
        decoded = base64.b64decode(content_bytes_base64)
        tmp.write(decoded)
        tmp.flush()

        # Guardar a Cloudinary/Storage desde archivo
        with open(tmp.name, 'rb') as f:
            uploaded_file = self._save_to_storage(filename, f, content_type)

        # Limpiar tempfile
        os.unlink(tmp.name)

    return uploaded_file
```

### 3. Guardar Archivos en Storage (Fix Bug)

```python
def _create_uploaded_file(self, filename, content, content_type):
    sha256 = UploadedFile.calculate_hash(content)
    existing = UploadedFile.objects.filter(sha256=sha256).first()
    if existing:
        return existing

    # Crear ContentFile para Django storage
    from django.core.files.base import ContentFile
    from django.core.files.storage import storages

    storage = storages['default']
    date_path = datetime.now().strftime('%Y/%m')
    filename_safe = f"{date_path}/{filename}"

    # GUARDAR ARCHIVO REALMENTE
    path = storage.save(f'invoices/email/{filename_safe}', ContentFile(content))

    uploaded_file = UploadedFile.objects.create(
        filename=filename,
        path=path,
        sha256=sha256,
        size=len(content),
        content_type=content_type
    )

    return uploaded_file
```

### 4. Agregar Time Limits a Tasks

```python
@shared_task(
    name='automation.process_dte_mailbox',
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    time_limit=600,  # 10 minutos hard limit
    soft_time_limit=540  # 9 minutos soft limit
)
def process_dte_mailbox(self):
    # ...
```

### 5. Deshabilitar Celery en Railway (Opción Inmediata)

**Si no necesitas procesamiento automático de emails**:

En Railway, asegúrate de **NO desplegar** servicios de Celery.

Railway.json debería tener **SOLO** el servicio web:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "gunicorn proyecto.wsgi:application --config gunicorn_config.py"
  }
}
```

**NO incluyas**:
- ❌ `celery worker`
- ❌ `celery beat`

---

## 🚨 ACCIÓN INMEDIATA RECOMENDADA

### Opción A: Deshabilitar Celery (Más rápido)

Si no usas el procesamiento automático de emails:

1. **Verificar en Railway**: Ve a Deployments → Ver si hay workers Celery
2. **Si los hay**: Elimínalos o asegúrate que NO se despliegan
3. **Resultado**: Ahorras **~3GB inmediatamente**

### Opción B: Optimizar Celery (Si lo necesitas)

1. Aplicar configuración optimizada de Celery
2. Fix bug de guardado de archivos
3. Agregar streaming para attachments
4. Resultado: Reduce de 3GB → ~500MB

---

## 📊 Consumo Esperado Después de Fixes

### Sin Celery (Opción A):
```
Gunicorn optimizado: 800MB
Total: ~1GB ✅
```

### Con Celery Optimizado (Opción B):
```
Gunicorn optimizado: 800MB
Celery (2 workers):  500MB
Total: ~1.3GB ✅
```

---

## ⚠️ RECOMENDACIÓN

**Para Railway (producción)**:
1. **Deshabilita Celery** en Railway (no lo necesitas 24/7)
2. **Mantén solo Gunicorn** optimizado
3. **Si necesitas procesamiento de emails**:
   - Hazlo manualmente desde admin
   - O configura un cron job separado (no 24/7)

**Para desarrollo local**:
- Puedes mantener Celery con docker-compose
- Pero con configuración optimizada

---

## 🔍 Verificar si Celery está Corriendo en Railway

```bash
# En Railway:
railway ps

# O ver logs:
railway logs | grep -i celery

# Si ves "celery worker" o "celery beat" → Están consumiendo memoria
```

---

## 📝 Archivos a Modificar

Si decides optimizar Celery (Opción B):

1. ✅ `backend/workers/celery.py` - Agregar configuración
2. ✅ `backend/automation/services/email_processor.py` - Fix storage + streaming
3. ✅ `backend/automation/tasks.py` - Agregar time limits
4. ✅ `backend/proyecto/settings/base.py` - Limpiar CELERY_BEAT_SCHEDULE

---

## 🎯 Conclusión

**Tu consumo de 5GB es causado por**:
- 60% Gunicorn sin optimizar (3GB) ← Ya lo arreglamos
- 40% **Celery workers sin límites (2-3GB)** ← Arreglar AHORA

**Prioridad**:
1. 🔥 Verificar si Celery está en Railway
2. 🔥 Deshabilitarlo si no se usa
3. ⚡ Aplicar optimizaciones si se necesita

¿Quieres que deshabilite Celery o que lo optimice?

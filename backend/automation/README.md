# Sistema de Automatización de Emails DTE

Sistema completo para procesar automáticamente emails con DTEs/facturas desde Microsoft 365 y crear registros de Invoice en NextOps.

## 📋 Tabla de Contenidos

-   [Características](#características)
-   [Arquitectura](#arquitectura)
-   [Configuración](#configuración)
-   [Uso](#uso)
-   [Administración](#administración)
-   [Troubleshooting](#troubleshooting)

## ✨ Características

-   **Procesamiento Automático**: Celery Beat ejecuta el procesamiento cada 15 minutos
-   **Microsoft Graph API**: Integración completa con Microsoft 365
-   **Auto-parsing**: Los DTEs se parsean automáticamente usando los parsers existentes
-   **Matching de OTs**: Intenta hacer match automático con OTs basado en RUT de proveedor
-   **Deduplicación**: Evita procesar el mismo email múltiples veces
-   **Whitelist**: Opcional - solo procesa emails de remitentes autorizados
-   **Logging Completo**: Registra cada procesamiento con detalles y errores
-   **Admin Interface**: Panel de administración para monitorear y configurar
-   **Management Command**: Procesamiento manual sin Celery

## 🏗 Arquitectura

### Componentes

```
automation/
├── models.py                 # EmailProcessingLog, EmailAutoProcessingConfig
├── admin.py                  # Django admin interface
├── tasks.py                  # Celery tasks
├── services/
│   ├── microsoft_graph.py    # MS Graph API client
│   └── email_processor.py    # Email processing logic
└── management/
    └── commands/
        └── process_emails.py # Django command
```

### Flujo de Procesamiento

```
┌─────────────────┐
│  Celery Beat    │ Every 15 min
│  Schedule Task  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  process_dte_   │
│  mailbox()      │ Celery Task
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EmailProcessor  │
│ .process_       │
│  mailbox()      │
└────────┬────────┘
         │
         ├─► MicrosoftGraphClient
         │   └─► Search messages by keywords
         │   └─► List attachments
         │   └─► Download attachments
         │   └─► Mark as read
         │
         ├─► EmailProcessor._process_single_message()
         │   ├─► Check deduplication (message_id)
         │   ├─► Check sender whitelist
         │   ├─► Filter supported file types
         │   └─► Process each attachment
         │
         ├─► EmailProcessor._process_attachment()
         │   ├─► Create UploadedFile
         │   ├─► InvoiceCreateSerializer (auto_parse=True)
         │   └─► Triggers parsers + OT matching
         │
         └─► EmailProcessingLog.create()
             └─► Log results, errors, invoices created
```

## 🔧 Configuración

### 1. Azure App Registration

Para usar Microsoft Graph API, necesitas registrar una aplicación en Azure:

#### Paso 1: Crear App Registration

1. Ve a [Azure Portal](https://portal.azure.com)
2. Busca **Azure Active Directory** / **Entra ID**
3. Navega a **App registrations** > **New registration**
4. Configura:
    - **Name**: `NextOps DTE Email Processor`
    - **Supported account types**: Single tenant
    - **Redirect URI**: No requerido (usamos Client Credentials Flow)
5. Click **Register**

#### Paso 2: Configurar Permisos

1. En tu app registration, ve a **API permissions**
2. Click **Add a permission** > **Microsoft Graph** > **Application permissions**
3. Agrega los siguientes permisos:
    ```
    Mail.Read           - Read mail in all mailboxes
    Mail.ReadWrite      - Read and write mail in all mailboxes
    ```
4. Click **Grant admin consent** (requiere admin de tenant)
    - ⚠️ **IMPORTANTE**: Sin el admin consent, la API no funcionará

#### Paso 3: Crear Client Secret

1. Ve a **Certificates & secrets**
2. Click **New client secret**
3. Configura:
    - **Description**: `NextOps Production Secret`
    - **Expires**: 24 months (recomendado)
4. Click **Add**
5. **⚠️ COPIA EL SECRET INMEDIATAMENTE** (no se puede recuperar después)

#### Paso 4: Obtener IDs

1. En **Overview**, copia:
    - **Application (client) ID**: `GRAPH_CLIENT_ID`
    - **Directory (tenant) ID**: `GRAPH_TENANT_ID`

### 2. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Microsoft Graph API - REQUERIDO
GRAPH_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_CLIENT_SECRET=tu_secret_aqui

# Email del buzón compartido o usuario
GRAPH_SHARED_MAILBOX=dteproveedores@plg.com.sv

# Carpeta a monitorear (opcional, default: Inbox)
GRAPH_MAILBOX_FOLDER=/Inbox/DTE PROVEEDORES

# Intervalo de procesamiento en minutos (opcional, default: 15)
EMAIL_PROCESSING_INTERVAL_MINUTES=15

# Tamaño máximo de attachment en MB (opcional, default: 15)
MAX_ATTACHMENT_SIZE_MB=15

# Redis para Celery (requerido para tasks)
REDIS_URL=redis://redis:6379/0
```

### 3. Configuración en Django Admin

1. Ve a `/admin/automation/emailautoprocessingconfig/`
2. Edita la configuración (solo puede haber una):

```
is_active: ✓ (activar procesamiento automático)
check_interval_minutes: 15
target_folders: ["Inbox", "Inbox/DTE PROVEEDORES"]
subject_filters: ["DTE", "Factura", "Invoice"]
sender_whitelist: [] (vacío = aceptar todos)
auto_parse_enabled: ✓
max_emails_per_run: 50
```

## 🚀 Uso

### Procesamiento Automático (Celery)

El sistema procesa automáticamente cada 15 minutos si está activo:

```bash
# Iniciar Celery worker
docker-compose exec backend celery -A proyecto worker -l info

# Iniciar Celery Beat (scheduler)
docker-compose exec backend celery -A proyecto beat -l info
```

**Recomendado**: Usar `docker-compose` para manejar ambos servicios:

```yaml
# docker-compose.yml
services:
    celery-worker:
        build: ./backend
        command: celery -A proyecto worker -l info
        depends_on:
            - db
            - redis
        environment:
            - DATABASE_URL=${DATABASE_URL}
            - REDIS_URL=${REDIS_URL}
            - GRAPH_TENANT_ID=${GRAPH_TENANT_ID}
            - GRAPH_CLIENT_ID=${GRAPH_CLIENT_ID}
            - GRAPH_CLIENT_SECRET=${GRAPH_CLIENT_SECRET}

    celery-beat:
        build: ./backend
        command: celery -A proyecto beat -l info
        depends_on:
            - db
            - redis
        environment:
            - DATABASE_URL=${DATABASE_URL}
            - REDIS_URL=${REDIS_URL}
```

### Procesamiento Manual (Django Command)

Para procesar emails sin Celery:

```bash
# Test de conexión
docker-compose exec backend python manage.py process_emails --test-connection

# Dry run (listar emails sin procesar)
docker-compose exec backend python manage.py process_emails --dry-run

# Procesamiento normal
docker-compose exec backend python manage.py process_emails

# Procesar carpeta específica
docker-compose exec backend python manage.py process_emails --folder "Inbox/DTE"

# Limitar cantidad de emails
docker-compose exec backend python manage.py process_emails --max-emails 10

# Buscar por keyword específico
docker-compose exec backend python manage.py process_emails --subject "Factura"
```

### API de Celery

También puedes ejecutar las tareas desde código:

```python
from automation.tasks import process_dte_mailbox, test_graph_connection

# Ejecutar procesamiento
result = process_dte_mailbox.delay()

# Test de conexión
test_result = test_graph_connection.delay()
```

## 🎛 Administración

### Django Admin

#### EmailProcessingLog

Ubicación: `/admin/automation/emailprocessinglog/`

**Listado**:

-   Status badge (verde/rojo/naranja)
-   Subject (truncado)
-   Sender
-   Received date
-   Attachments count
-   Invoices created (con links)
-   Processing time

**Filtros**:

-   Status (success/failed/partial/skipped)
-   Sender email
-   Received date
-   Folder path

**Búsqueda**:

-   Message ID
-   Subject
-   Sender email

**Detalle**:

-   Información completa del mensaje
-   Lista de attachments
-   Lista de facturas creadas (links clickeables)
-   Errores si los hay
-   Tiempo de procesamiento
-   Auto-matched OTs

#### EmailAutoProcessingConfig

Ubicación: `/admin/automation/emailautoprocessingconfig/`

**Configuración única** (singleton pattern):

-   **is_active**: Activar/desactivar procesamiento automático
-   **check_interval_minutes**: Intervalo entre ejecuciones (default: 15)
-   **target_folders**: Lista de carpetas a monitorear
-   **subject_filters**: Keywords en subject (OR logic)
-   **sender_whitelist**: Lista de emails autorizados (vacío = todos)
-   **auto_parse_enabled**: Auto-parsear DTEs con parsers
-   **max_emails_per_run**: Límite por ejecución
-   **last_run_at**: Última ejecución (auto)
-   **last_run_status**: Estado de última ejecución (auto)

### Monitoring

#### Ver logs de procesamiento

```bash
# Logs de Celery
docker-compose logs -f celery-worker celery-beat

# Logs de Django (en código)
# Se registran en logger 'automation.services.email_processor'
# y 'automation.services.microsoft_graph'
```

#### Estadísticas en Admin

El listado de `EmailProcessingLog` muestra:

-   Total de emails procesados
-   Success rate
-   Emails con errores
-   Facturas creadas

## 🐛 Troubleshooting

### Error: "Failed to get access token"

**Problema**: No se puede autenticar con MS Graph API

**Soluciones**:

1. Verifica que `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET` estén correctos
2. Verifica que el secret no haya expirado en Azure Portal
3. Verifica que los permisos `Mail.Read` y `Mail.ReadWrite` tengan **Admin consent**
4. Test de conexión: `python manage.py process_emails --test-connection`

### Error: "MailboxNotEnabledForRESTAPI"

**Problema**: El buzón no tiene licencia de Exchange Online

**Solución**: Asegúrate que el usuario/buzón compartido tenga una licencia activa de Microsoft 365 con Exchange Online

### Error: "Sender not in whitelist"

**Problema**: Email de remitente no autorizado

**Solución**:

1. Ve a `/admin/automation/emailautoprocessingconfig/`
2. Agrega el email a `sender_whitelist`
3. O deja `sender_whitelist` vacío para aceptar todos

### Error: "No supported file types found"

**Problema**: Los attachments no son de tipos soportados

**Archivos soportados**: `.json`, `.pdf`, `.xml`, `.txt`

**Solución**: Verifica que los DTEs vengan en estos formatos

### Error: "Message already processed"

**Problema**: Email ya fue procesado anteriormente

**Comportamiento normal**: El sistema evita duplicados usando `message_id`

**Solución**: Si necesitas reprocesar, elimina el registro de `EmailProcessingLog` con ese `message_id`

### Emails no se procesan automáticamente

**Checklist**:

1. ✓ `EmailAutoProcessingConfig.is_active = True`
2. ✓ Celery worker running: `docker-compose ps celery-worker`
3. ✓ Celery beat running: `docker-compose ps celery-beat`
4. ✓ Redis accessible: `docker-compose exec redis redis-cli ping`
5. ✓ Variables de entorno configuradas
6. ✓ Admin consent otorgado en Azure

**Debug**:

```bash
# Check Celery beat schedule
docker-compose exec backend python manage.py shell
>>> from django.conf import settings
>>> settings.CELERY_BEAT_SCHEDULE

# Check last run
>>> from automation.models import EmailAutoProcessingConfig
>>> config = EmailAutoProcessingConfig.objects.get(id=1)
>>> config.last_run_at
>>> config.last_run_status
```

### Facturas no se crean automáticamente

**Checklist**:

1. ✓ `EmailAutoProcessingConfig.auto_parse_enabled = True`
2. ✓ Parsers funcionan correctamente (ver logs)
3. ✓ Attachments son de tipos soportados
4. ✓ No hay errores en `EmailProcessingLog.error_message`

**Debug**:

```bash
# Test parsing manual
docker-compose exec backend python manage.py process_emails --dry-run
docker-compose exec backend python manage.py process_emails --max-emails 1
```

## 📊 Métricas y Reportes

### Query útiles en Django shell

```python
from automation.models import EmailProcessingLog, EmailAutoProcessingConfig
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Avg

# Estadísticas últimas 24 horas
yesterday = timezone.now() - timedelta(days=1)
stats = EmailProcessingLog.objects.filter(processed_at__gte=yesterday).aggregate(
    total=Count('id'),
    success=Count('id', filter=Q(status='success')),
    failed=Count('id', filter=Q(status='failed')),
    invoices=Sum('invoices_count'),
    avg_time=Avg('processing_time_seconds')
)

# Emails con errores
errors = EmailProcessingLog.objects.filter(
    status='failed',
    processed_at__gte=yesterday
).values('error_message').annotate(count=Count('id'))

# Facturas auto-matched
auto_matched = EmailProcessingLog.objects.filter(
    auto_matched_ots__gt=0,
    processed_at__gte=yesterday
).count()
```

## 🔐 Seguridad

### Permisos de Graph API

El sistema usa **Application permissions** (no delegated):

-   `Mail.Read`: Leer emails de cualquier buzón
-   `Mail.ReadWrite`: Marcar como leído, mover

**Importante**: Estos permisos dan acceso a TODOS los buzones del tenant. Asegúrate que:

1. La app solo se use para este propósito
2. El client secret esté seguro (no en repositorio)
3. Solo admins tengan acceso al secret
4. Rotación de secrets cada 12-24 meses

### Whitelist

Usa `sender_whitelist` para restringir remitentes:

```python
config = EmailAutoProcessingConfig.objects.get(id=1)
config.sender_whitelist = [
    'facturas@proveedor1.com',
    'billing@proveedor2.com'
]
config.save()
```

## 📝 Changelog

### v1.0.0 (2025-01-04)

-   ✨ Implementación completa del sistema de automatización
-   ✨ Integración con Microsoft Graph API
-   ✨ Procesamiento automático con Celery
-   ✨ Auto-parsing de DTEs
-   ✨ Matching automático con OTs
-   ✨ Django Admin interface
-   ✨ Management command para procesamiento manual
-   ✨ Logging completo de operaciones

## 🤝 Contribuir

Para agregar nuevos tipos de archivos soportados:

1. Edita `EmailProcessor.SUPPORTED_EXTENSIONS`
2. Asegúrate que el parser correspondiente exista
3. Test con el nuevo tipo de archivo

## 📧 Soporte

Para problemas o preguntas:

1. Revisa esta documentación
2. Revisa los logs en Django Admin
3. Usa `--test-connection` para verificar conectividad
4. Contacta al equipo de desarrollo

---

**Documentación actualizada**: 2025-01-04

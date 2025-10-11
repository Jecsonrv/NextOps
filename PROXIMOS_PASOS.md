# Próximos Pasos - NextOps Implementation

## ✅ Fase 1 COMPLETADA: Estructura Base

Se ha implementado exitosamente:

-   ✅ Estructura de carpetas completa del proyecto
-   ✅ Configuración Django con settings por capas (base/dev/prod)
-   ✅ Módulo `common` con utilities, permissions, pagination
-   ✅ Módulo `accounts` completo con User custom, roles, JWT auth
-   ✅ Configuración Celery + Beat con schedules
-   ✅ Docker Compose con Postgres, Redis, Django, Celery Worker y Beat
-   ✅ API documentation setup (drf-spectacular)
-   ✅ Requirements.txt con todas las dependencias
-   ✅ README.md con instrucciones completas

## ✅ Fase 2-5 COMPLETADAS: Catálogos, Patrones, Clientes, OTs

Se han implementado exitosamente:

-   ✅ Módulo `catalogs` con Provider (proveedores)
-   ✅ Módulo `patterns` con ShipmentPattern (patrones de embarque)
-   ✅ Módulo `clients` con Client (clientes)
-   ✅ Módulo `ots` con OT (órdenes de transporte) - Core completo

## ✅ Fase 6 COMPLETADA: Excel Import/Export Enhancements

Se han implementado exitosamente:

-   ✅ 18 nuevos campos en modelo OT (operativo, tipo_embarque, barco, ETD, etc.)
-   ✅ Sistema de provisión jerárquico (provision_cliente/provision_proveedor)
-   ✅ ExcelProcessor con soporte IMPORT y EXPORT
-   ✅ Validación flexible (OT+CLIENTE+MBL)
-   ✅ Inferencia automática de operativo
-   ✅ Testing: 56/57 IMPORT (98%), 131/138 EXPORT (95%)

Ver detalles en: [FASE_6_SISTEMA_COMPLETADO.md](FASE_6_SISTEMA_COMPLETADO.md)

## ✅ Fase 7-8 COMPLETADA: Sistema de Gestión de Facturas (Invoices)

Se han implementado exitosamente:

-   ✅ Modelos: Invoice (45+ campos) + UploadedFile (con SHA256)
-   ✅ 6 Serializadores especializados (List/Detail/Create/Update/Stats)
-   ✅ API REST completa con 11 endpoints
-   ✅ Sistema de deduplicación de archivos
-   ✅ Interfaz de administración Django con badges
-   ✅ Parsers: DTEJsonParser, PDFExtractor, InvoiceMatcher
-   ✅ Motor de matching automático (5 niveles de confianza)
-   ✅ Migraciones aplicadas
-   ✅ Limpieza de archivos temporales

**Total:** ~2,600 líneas de código

Ver detalles en: [FASE_7_8_INVOICES_COMPLETADA.md](FASE_7_8_INVOICES_COMPLETADA.md)

## 🚀 Comandos para Iniciar

### Opción 1: Con Docker (Recomendado)

```bash
# 1. Navegar al directorio
cd c:\Users\jecso\Desktop\NextOps

# 2. Configurar .env
cd backend
copy .env.example .env
# Editar .env con tus valores

# 3. Levantar servicios
cd ..
docker-compose up -d

# 4. Ver logs
docker-compose logs -f

# 5. Aplicar migraciones
docker-compose exec backend python manage.py migrate

# 6. Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# 7. Acceder a:
# - API: http://localhost:8000/api/
# - Admin: http://localhost:8000/admin/
# - Swagger: http://localhost:8000/api/docs/
```

### Opción 2: Sin Docker (Local)

```bash
# 1. Crear entorno virtual
cd c:\Users\jecso\Desktop\NextOps\backend
python -m venv venv
venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar .env
copy .env.example .env
# Editar .env y configurar DATABASE_URL y REDIS_URL

# 4. Aplicar migraciones
python manage.py migrate

# 5. Crear superusuario
python manage.py createsuperuser

# 6. Ejecutar servidor
python manage.py runserver

# 7. En otra terminal: Celery Worker
celery -A workers.celery worker --loglevel=info

# 8. En otra terminal: Celery Beat
celery -A workers.celery beat --loglevel=info
```

## � Comandos para Iniciar

### Con Docker (Recomendado)

```bash
# 1. Navegar al directorio
cd c:\Users\jecso\Desktop\NextOps

# 2. Configurar .env
cd backend
copy .env.example .env
# Editar .env con tus valores

# 3. Levantar servicios
cd ..
docker-compose up -d

# 4. Ver logs
docker-compose logs -f

# 5. Aplicar migraciones
docker-compose exec backend python manage.py migrate

# 6. Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# 7. Acceder a:
# - API: http://localhost:8000/api/
# - Admin: http://localhost:8000/admin/
# - Swagger: http://localhost:8000/api/docs/
```

---

## 📋 Fase 9: Automation (Email Processing) - PRÓXIMA

### Objetivos:

Automatizar la recepción y procesamiento de facturas por correo electrónico usando Microsoft Graph API y Celery.

### Tareas Pendientes:

1. **Crear Model EmailProcessingLog**

    - `message_id` (unique) - ID del mensaje de correo
    - `subject` - Asunto del correo
    - `sender` - Remitente
    - `received_at` - Fecha de recepción
    - `status` - Choices: pending, processing, completed, error
    - `invoice` (FK) - Factura creada (nullable)
    - `attachments_count` - Cantidad de archivos adjuntos
    - `processed_count` - Cantidad de archivos procesados
    - `error_message` - Mensaje de error si falla
    - `processing_time` - Tiempo de procesamiento en segundos

2. **Crear email_monitor.py**

    - Configuración de Microsoft Graph API con OAuth2
    - Método para leer mailbox
    - Filtrado por remitente/asunto
    - Descarga de attachments
    - Deduplicación por message_id

3. **Crear Celery Tasks**

    - `process_dte_mailbox()` - Tarea periódica cada 15 minutos
    - `process_email_attachment()` - Procesar cada archivo adjunto
    - Retry automático en fallos (max 3 intentos)
    - Logging detallado

4. **Configurar Beat Schedule**

    ```python
    # workers/celery.py
    beat_schedule = {
        'process-dte-emails': {
            'task': 'automation.tasks.process_dte_mailbox',
            'schedule': crontab(minute='*/15'),  # Cada 15 minutos
        },
    }
    ```

5. **Crear Management Command**

    ```bash
    # automation/management/commands/process_dte_emails.py
    # Para ejecutar manualmente si es necesario
    python manage.py process_dte_emails --from-date=2025-01-01
    ```

6. **Testing:**
    - [ ] Test conexión Microsoft Graph
    - [ ] Test descarga de archivos
    - [ ] Test deduplicación
    - [ ] Test procesamiento completo
    - [ ] Test manejo de errores

---

## 📋 Fase 10: Reportes y Stats - SIGUIENTE

### Objetivos:

Generar reportes y exportes para contabilidad y análisis de negocio.

### Tareas:

1. **Endpoints de Estadísticas**

    - Dashboard general con métricas clave
    - Estadísticas por proveedor
    - Estadísticas por cliente
    - Estadísticas por OT

2. **Reportes Excel para Contabilidad**

    - Reporte de provisiones por período
    - Reporte de facturación por período
    - Reporte de costos por OT
    - Reporte de pendientes de pago

3. **Exportes Programados**

    - Celery task para generación automática
    - Envío por correo a finanzas
    - Almacenamiento en sistema

4. **Dashboards Avanzados**
    - Gráficos de tendencias
    - KPIs principales
    - Alertas y notificaciones

---

## 🧪 Testing General del Sistema

### Testing Pendiente Inmediato (Fase 7-8):

1. **Test Manual en Django Admin:**

    ```bash
    # Acceder a http://localhost:8000/admin/
    # Probar:
    - Crear Invoice manualmente
    - Subir archivo y verificar deduplicación
    - Asignar OT manualmente
    - Cambiar estados (provisión, facturación)
    - Ver badges de confianza
    ```

2. **Test API con Postman/httpie:**

    ```bash
    # GET - Listar facturas
    http GET http://localhost:8000/api/invoices/ \
      Authorization:"Bearer {token}"

    # POST - Crear factura con archivo
    http POST http://localhost:8000/api/invoices/ \
      Authorization:"Bearer {token}" \
      numero_factura="FAC-001" \
      fecha_emision="2025-01-15" \
      monto="1500.00" \
      file@factura.pdf

    # GET - Estadísticas
    http GET http://localhost:8000/api/invoices/stats/ \
      Authorization:"Bearer {token}"

    # POST - Asignar OT
    http POST http://localhost:8000/api/invoices/1/assign_ot/ \
      Authorization:"Bearer {token}" \
      ot_id=123
    ```

3. **Instalar Dependencias Faltantes:**

    ```bash
    docker-compose exec backend pip install pdfplumber
    # Opcional para OCR:
    # docker-compose exec backend pip install pytesseract

    # Actualizar requirements.txt
    docker-compose exec backend pip freeze > requirements.txt
    ```

4. **Verificar Parsers:**

    ```python
    # Django shell
    docker-compose exec backend python manage.py shell

    >>> from invoices.parsers import DTEJsonParser, PDFExtractor, InvoiceMatcher

    # Test DTE Parser
    >>> parser = DTEJsonParser()
    >>> with open('factura.json', 'rb') as f:
    >>>     result = parser.parse(f.read())
    >>> print(result)

    # Test PDF Extractor
    >>> extractor = PDFExtractor()
    >>> with open('factura.pdf', 'rb') as f:
    >>>     result = extractor.extract(f.read())
    >>> print(result)

    # Test Matcher
    >>> matcher = InvoiceMatcher()
    >>> referencias = [
    >>>     {'tipo': 'mbl', 'valor': 'MAEU1234567'},
    >>>     {'tipo': 'contenedor', 'valor': 'TEMU1234567'}
    >>> ]
    >>> ot, confidence, method, refs = matcher.match(referencias)
    >>> print(f"OT: {ot}, Confianza: {confidence}, Método: {method}")
    ```

## 📚 Recursos y Referencias

-   **Django Docs**: https://docs.djangoproject.com/
-   **DRF Docs**: https://www.django-rest-framework.org/
-   **Celery Docs**: https://docs.celeryproject.org/
-   **Microsoft Graph API**: https://learn.microsoft.com/en-us/graph/
-   **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html

## 💡 Tips de Desarrollo

1. **Siempre crear migraciones después de cambios en models**

    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

2. **Usar Django shell para testing rápido**

    ```bash
    python manage.py shell
    >>> from accounts.models import User
    >>> User.objects.all()
    ```

3. **Ver logs de Celery**

    ```bash
    docker-compose logs -f celery
    ```

4. **Limpiar caché de Redis**

    ```bash
    docker-compose exec redis redis-cli FLUSHALL
    ```

5. **Backup de base de datos**
    ```bash
    docker-compose exec db pg_dump -U nextops_user nextops > backup.sql
    ```

## 🐛 Troubleshooting Común

### Error: "django.core.exceptions.ImproperlyConfigured"

-   Verificar que DJANGO_SETTINGS_MODULE esté configurado
-   Verificar que todas las apps estén en INSTALLED_APPS

### Error: "django.db.utils.OperationalError: could not connect to server"

-   Verificar que PostgreSQL esté corriendo
-   Verificar DATABASE_URL en .env

### Error: "celery.exceptions.NotRegistered"

-   Verificar que las tasks estén en tasks.py de cada app
-   Reiniciar worker Celery

### Error de importación de módulos

-   Activar entorno virtual
-   Instalar todas las dependencias: `pip install -r requirements.txt`

## 📞 Soporte

Si encuentras problemas o tienes dudas:

1. Revisar logs: `docker-compose logs -f`
2. Consultar ESPECIFICACION_DJANGO.md
3. Verificar que todos los servicios estén corriendo: `docker-compose ps`

---

**¡Felicitaciones por completar la Fase 1!** 🎉

El proyecto tiene una base sólida y está listo para comenzar con la implementación de los módulos de negocio.

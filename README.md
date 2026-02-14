# NextOps - Sistema de Control de Facturas y Órdenes de Trabajo

Sistema integral para la gestión automatizada de facturas y órdenes de trabajo, con procesamiento automático de correos, matching inteligente y exportación para contabilidad.

## 📊 Estado del Proyecto

**Versión:** 1.0.0 (Fases 1-9 Completadas)
**Progreso General:** ~90%

### 📚 Documentación

- Operativa rápida: `GUIA_INICIO_CRM.md`
- Índice de documentación vigente: `docs/README.md`
- Roadmap UX/ERP: `docs/UX_PROFESSIONAL_ROADMAP.md`
- Reportes históricos: `docs/archive/legacy-reports/`

### ✅ Fases Completadas

- [x] **Fase 1:** Infraestructura Base (Django + DRF + Docker + Celery)
- [x] **Fase 2:** Módulo Catalogs (Proveedores)
- [x] **Fase 3:** Módulo Patterns (Patrones Regex)
- [x] **Fase 4:** Módulo Clients (Aliases de Clientes)
- [x] **Fase 5-6:** Módulo OTs (Órdenes de Trabajo + Procesamiento Excel)
- [x] **Fase 7-8:** Módulo Invoices (Facturas + Motor de Matching)
- [x] **Fase 9:** Automatización de Correos (Microsoft Graph API)

### 🚧 Pendiente

- [ ] **Fase 10:** Reportes y Estadísticas Avanzadas

---

## 🚀 Características Principales

- **Automatización de Ingesta**: Procesamiento automático de correos Outlook con adjuntos PDF y JSON DTE
- **Matching Inteligente**: Motor de matching multi-nivel (OT directa, MBL+contenedor, solo MBL, etc.)
- **Gestión de OTs**: CRUD completo, importación desde Excel, provisión jerárquica
- **Gestión de Facturas**: Upload manual, extracción automática, vinculación con OTs
- **Exportes Automáticos**: Reportes diarios/semanales para contabilidad
- **API RESTful**: Django REST Framework con documentación OpenAPI/Swagger
- **Autenticación JWT**: Control de acceso basado en roles (admin, jefe_operaciones, finanzas, operativo)

---

## 🛠️ Stack Tecnológico

### Backend

- **Framework**: Django 5.1 + Django REST Framework 3.15
- **Base de Datos**: PostgreSQL 15+ (desarrollo con Docker, producción Neon)
- **Caché/Queue**: Redis 7.x (Upstash o local)
- **Tareas Asíncronas**: Celery 5.3 + Beat
- **Autenticación**: SimpleJWT 5.3
- **Procesamiento**: pdfplumber, pytesseract, pandas, openpyxl
- **Email/Outlook**: Microsoft Graph API (msal)

### Frontend (separado)

- React 18 + Vite 5
- TailwindCSS + shadcn/ui
- React Query + Axios
- Despliegue: Vercel

---

## 📋 Requisitos Previos

- Python 3.11+
- PostgreSQL 15+ (o Docker)
- Redis 7+ (o Docker)
- Node.js 18+ (para frontend)
- Git
- Docker Desktop (recomendado)

---

## 🔧 Instalación Rápida

### Opción 1: Con Docker (Recomendado)

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd NextOps

# 2. Configurar variables de entorno
cd backend
cp .env.example .env
# Editar .env con tus valores

# 3. Levantar servicios con Docker Compose
cd ..
docker-compose up -d

# 4. Aplicar migraciones
docker-compose exec backend python manage.py migrate

# 5. Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# 6. Acceder a la aplicación
# API: http://localhost:8000/api/
# Admin: http://localhost:8000/admin/
# Swagger: http://localhost:8000/api/docs/
```

### Opción 2: Instalación Local (sin Docker)

```bash
# 1. Crear entorno virtual
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar PostgreSQL y Redis locales
# Crear base de datos 'nextops'
# Actualizar DATABASE_URL y REDIS_URL en .env

# 4. Aplicar migraciones
python manage.py migrate

# 5. Crear superusuario
python manage.py createsuperuser

# 6. Ejecutar servicios (en terminales separadas)
python manage.py runserver  # Django
celery -A workers.celery worker --loglevel=info  # Worker
celery -A workers.celery beat --loglevel=info  # Scheduler
```

---

## 📁 Estructura del Proyecto

```
NextOps/
├── backend/
│   ├── proyecto/               # Configuración Django
│   │   ├── settings/          # Settings por capas (base/dev/prod)
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   ├── common/                 # Código compartido
│   ├── accounts/               # Usuarios y autenticación
│   ├── catalogs/               # Catálogos (proveedores, tipos)
│   ├── patterns/               # Patrones regex
│   ├── clients/                # Aliases de clientes
│   ├── ots/                    # Órdenes de trabajo
│   ├── invoices/               # Facturas
│   ├── automation/             # Automatización y correo
│   ├── workers/                # Celery configuración
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
│
├── docker-compose.yml
├── README.md
└── ESPECIFICACION_DJANGO.md    # Especificación técnica completa
```

---

## 🔑 Variables de Entorno Clave

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nextops

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Microsoft Graph API
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_SHARED_MAILBOX=dteproveedores@plg.com.sv

# Logging
LOG_LEVEL=INFO
```

---

## 🌐 Endpoints Principales

### Autenticación

- `POST /api/auth/login/` - Login con JWT
- `POST /api/auth/refresh/` - Refresh token
- `GET /api/auth/me/` - Perfil usuario actual
- `POST /api/auth/change-password/` - Cambiar contraseña

### Catálogos

- `GET/POST /api/catalogs/providers/` - Proveedores
- `GET/POST /api/catalogs/cost-types/` - Tipos de costo

### Órdenes de Trabajo

- `GET/POST /api/ots/` - CRUD de OTs
- `POST /api/ots/import-excel/` - Importar desde Excel
- `POST /api/ots/upload-csv-provisions/` - Cargar provisiones CSV

### Facturas

- `GET/POST /api/invoices/` - CRUD de facturas
- `POST /api/invoices/upload/` - Subir PDFs manualmente
- `POST /api/invoices/{id}/assign-ot/` - Asignar OT
- `GET /api/invoices/pending-review/` - Pendientes de revisión
- `GET /api/invoices/export-contabilidad/` - Export para contabilidad

### Documentación

- `GET /api/docs/` - Swagger UI
- `GET /api/redoc/` - ReDoc
- `GET /api/health/` - Health check

---

## 🔐 Roles y Permisos

| Acción              | Admin | Jefe Ops | Finanzas | Operativo |
| ------------------- | ----- | -------- | -------- | --------- |
| Gestionar Usuarios  | ✅    | ❌       | ❌       | ❌        |
| CRUD Catálogos      | ✅    | ✅       | ❌       | ❌        |
| CRUD OTs            | ✅    | ✅       | ❌       | ✅        |
| Importar Excel      | ✅    | ✅       | ❌       | ✅        |
| Aprobar Provisiones | ✅    | ✅       | ❌       | ❌        |
| Upload Facturas     | ✅    | ✅       | ❌       | ✅        |
| Ver Reportes        | ✅    | ✅       | ✅       | ❌        |
| Export Contabilidad | ✅    | ✅       | ✅       | ❌        |

---

## 🧪 Testing

```bash
# Ejecutar tests
python manage.py test

# Con cobertura
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

---

## 🚀 Despliegue a Producción

### Render / Railway

1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Configurar servicios:
    - Web: `gunicorn proyecto.wsgi:application`
    - Worker: `celery -A workers.celery worker`
    - Beat: `celery -A workers.celery beat`
4. Conectar Postgres (Neon) y Redis (Upstash)
5. Ejecutar migraciones automáticamente

### Variables de Entorno Producción

```env
DEBUG=False
DJANGO_SETTINGS_MODULE=proyecto.settings.prod
ALLOWED_HOSTS=your-domain.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=strong-random-key
```

---

## 📊 Comandos Útiles

```bash
# Docker
docker-compose up -d          # Levantar servicios
docker-compose logs -f        # Ver logs
docker-compose ps             # Estado de servicios
docker-compose down           # Detener servicios

# Django
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py createsuperuser

# Base de Datos
docker-compose exec db psql -U nextops_user -d nextops

# Celery
docker-compose exec celery celery -A workers.celery inspect registered
docker-compose logs -f celery
```

---

## 🎯 Motor de Matching

El sistema incluye un motor de matching inteligente con 5 niveles de confianza:

1. **OT Directa (95%)**: Número de OT encontrado en factura
2. **MBL + Contenedor (90%)**: Coincidencia de BL y contenedor
3. **Solo MBL (80%)**: Solo BL coincide (requiere revisión)
4. **Solo Contenedor (70%)**: Solo contenedor coincide (requiere revisión)
5. **Proveedor + ETA ±7 días (60%)**: Matching por proveedor y fecha (requiere revisión)

---

## 📈 Métricas de Éxito

- **Automatización**: ≥70% facturas procesadas sin intervención manual
- **Reducción de tiempo**: De 5h a ≤2h diarias
- **Precisión de matching**: ≥90% en niveles 1-3
- **Duplicados**: 0 (control por hash SHA256)
- **Performance**: Búsqueda OTs <300ms, carga tabla <1s

---

## 📚 Documentación Adicional

- `ESPECIFICACION_DJANGO.md` - Especificación técnica completa del sistema
- `PROXIMOS_PASOS.md` - Guía de implementación de fases pendientes
- `/api/docs/` - Documentación interactiva de la API (Swagger)

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## 📝 Licencia

Este proyecto es privado y confidencial.

---

## 📧 Contacto

Para preguntas o soporte, contactar al equipo de desarrollo.

---

**Última actualización:** Octubre 2025
**Estado:** Fase 9 completada, sistema funcional en producción

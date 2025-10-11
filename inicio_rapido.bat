@echo off
REM NextOps - Script de inicio rápido para Windows

echo ================================================
echo   NextOps - Sistema de Control de Facturas
echo ================================================
echo.

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker no está instalado o no está en el PATH
    echo Por favor, instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/6] Verificando archivos de configuracion...
if not exist "backend\.env" (
    echo.
    echo WARNING: No se encontro el archivo .env
    echo Copiando desde .env.example...
    copy "backend\.env.example" "backend\.env"
    echo.
    echo IMPORTANTE: Edita backend\.env con tus valores antes de continuar
    echo.
    pause
)

echo [2/6] Deteniendo servicios previos (si existen)...
docker-compose down

echo.
echo [3/6] Construyendo imagenes Docker...
docker-compose build

echo.
echo [4/6] Levantando servicios...
docker-compose up -d

echo.
echo [5/6] Esperando que los servicios esten listos...
timeout /t 10 /nobreak >nul

echo.
echo [6/6] Aplicando migraciones...
docker-compose exec -T backend python manage.py migrate

echo.
echo ================================================
echo   Servicios iniciados correctamente!
echo ================================================
echo.
echo Accede a:
echo   - API:     http://localhost:8000/api/
echo   - Admin:   http://localhost:8000/admin/
echo   - Swagger: http://localhost:8000/api/docs/
echo   - Health:  http://localhost:8000/api/health/
echo.
echo Comandos utiles:
echo   - Ver logs:       docker-compose logs -f
echo   - Crear superusuario: docker-compose exec backend python manage.py createsuperuser
echo   - Detener:        docker-compose down
echo.
echo Consulta COMANDOS_UTILES.md para mas comandos
echo.
pause

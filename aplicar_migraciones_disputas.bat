@echo off
echo ========================================
echo Aplicando Migraciones del Sistema de Disputas
echo ========================================
echo.

echo [1/3] Verificando contenedores Docker...
docker-compose ps

echo.
echo [2/3] Aplicando migraciones de invoices...
docker-compose exec -T backend python manage.py migrate invoices

echo.
echo [3/3] Verificando migraciones aplicadas...
docker-compose exec -T backend python manage.py showmigrations invoices

echo.
echo ========================================
echo Proceso completado
echo ========================================
pause

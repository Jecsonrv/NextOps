# Script de inicio para NextOps
# Uso: .\start.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   NextOps - Inicio de Proyecto  " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Docker está corriendo
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Opciones de inicio:" -ForegroundColor Cyan
Write-Host "1. Backend + Frontend (modo desarrollo) [RECOMENDADO]"
Write-Host "2. Todo con Docker"
Write-Host "3. Solo Backend"
Write-Host ""

$opcion = Read-Host "Selecciona una opción (1-3)"

switch ($opcion) {
    "1" {
        Write-Host ""
        Write-Host "Iniciando Backend con Docker..." -ForegroundColor Yellow
        docker-compose up -d backend db redis
        
        Write-Host ""
        Write-Host "Esperando a que el backend esté listo..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host ""
        Write-Host "✓ Backend iniciado" -ForegroundColor Green
        Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "Iniciando Frontend en modo desarrollo..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "IMPORTANTE: Abre una nueva terminal PowerShell y ejecuta:" -ForegroundColor Cyan
        Write-Host "  cd frontend" -ForegroundColor White
        Write-Host "  npm run dev" -ForegroundColor White
        Write-Host ""
        Write-Host "El frontend estará disponible en: http://localhost:5173" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Presiona cualquier tecla para ver los logs del backend..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        docker-compose logs -f backend
    }
    
    "2" {
        Write-Host ""
        Write-Host "Iniciando todos los servicios con Docker..." -ForegroundColor Yellow
        docker-compose up -d
        
        Write-Host ""
        Write-Host "✓ Servicios iniciados" -ForegroundColor Green
        Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Gray
        Write-Host "  Frontend: http://localhost:80" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Presiona cualquier tecla para ver los logs..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        docker-compose logs -f
    }
    
    "3" {
        Write-Host ""
        Write-Host "Iniciando solo Backend..." -ForegroundColor Yellow
        docker-compose up -d backend db redis
        
        Write-Host ""
        Write-Host "✓ Backend iniciado" -ForegroundColor Green
        Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Presiona cualquier tecla para ver los logs..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        docker-compose logs -f backend
    }
    
    default {
        Write-Host ""
        Write-Host "Opción no válida" -ForegroundColor Red
        exit 1
    }
}

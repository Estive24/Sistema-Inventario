# Script de inicialización del Sistema de Inventario
Write-Host "🚀 Iniciando Sistema de Inventario..." -ForegroundColor Cyan

# Verificar Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado o no está en PATH" -ForegroundColor Red
    exit 1
}

# Construir y ejecutar servicios
Write-Host "🔨 Construyendo contenedores..." -ForegroundColor Yellow
docker-compose build

Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

# Esperar a que los servicios estén listos
Write-Host "⏳ Esperando a que los servicios inicien..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Ejecutar migraciones
Write-Host "📊 Ejecutando migraciones de base de datos..." -ForegroundColor Yellow
docker-compose exec -T backend python manage.py makemigrations
docker-compose exec -T backend python manage.py migrate

Write-Host ""
Write-Host "🎉 ¡Sistema iniciado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 URLs de acceso:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   API Backend: http://localhost:8000/api/" -ForegroundColor White
Write-Host "   Admin Django: http://localhost:8000/admin/" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   Ver logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Parar sistema: docker-compose down" -ForegroundColor White
Write-Host "   Reiniciar: docker-compose restart" -ForegroundColor White
Write-Host ""

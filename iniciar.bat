@echo off
REM Inicia Software Engineering Services (Windows)
cd /d "%~dp0"
where docker >nul 2>nul || (echo Docker no esta instalado. Descargalo en https://www.docker.com/products/docker-desktop/ & pause & exit /b 1)
if not exist .env copy .env.example .env >nul
docker compose up -d --build
echo.
echo Listo: abre http://localhost:8080
start http://localhost:8080
pause

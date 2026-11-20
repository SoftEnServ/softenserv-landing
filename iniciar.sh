#!/usr/bin/env bash
# Inicia Software Engineering Services (Mac / Linux)
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no está instalado. Descárgalo en https://www.docker.com/products/docker-desktop/"; exit 1
fi
[ -f .env ] || cp .env.example .env
docker compose up -d --build && echo "" && echo "Listo: abre http://localhost:8080"

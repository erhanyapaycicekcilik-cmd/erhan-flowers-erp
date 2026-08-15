$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

& (Join-Path $root "scripts\stop-extra-dev-servers.ps1")

docker compose -f (Join-Path $root "docker-compose.dev.yml") up -d postgres-dev

New-Item -ItemType Directory -Force -Path "D:\stok-gorseller-dev" | Out-Null

$backendScript = Join-Path $root "scripts\start-dev-backend.ps1"
$frontendScript = Join-Path $root "scripts\start-dev-frontend.ps1"

Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$backendScript`"" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "backend\server-dev.log") `
  -RedirectStandardError (Join-Path $root "backend\server-dev.err.log")

Start-Sleep -Seconds 8

Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$frontendScript`"" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "frontend\server-dev.log") `
  -RedirectStandardError (Join-Path $root "frontend\server-dev.err.log")

"Development ortami baslatildi: Frontend 3101, Backend 8101, PostgreSQL 5433"

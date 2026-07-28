$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

docker compose -f (Join-Path $root "docker-compose.yml") up -d postgres

Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run","start" `
  -WorkingDirectory (Join-Path $root "backend") `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "backend\server.log") `
  -RedirectStandardError (Join-Path $root "backend\server.err.log")

Start-Sleep -Seconds 8

Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run","start","--","-H","0.0.0.0","-p","3001" `
  -WorkingDirectory (Join-Path $root "frontend") `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "frontend\server.log") `
  -RedirectStandardError (Join-Path $root "frontend\server.err.log")

"Canli ortam baslatildi: Frontend 3001, Backend 8001, PostgreSQL 5432"

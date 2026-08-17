$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workDir = Join-Path $root "work"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

function Write-Step($text) {
  Write-Host ""
  Write-Host "== $text ==" -ForegroundColor Cyan
}

# 1) Eski dev sureclerini (backend/frontend) ve eski cloudflared tunelini temizle
Write-Step "Eski surecler temizleniyor"
& (Join-Path $root "scripts\stop-extra-dev-servers.ps1")
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2) Postgres (docker)
Write-Step "PostgreSQL baslatiliyor"
docker compose -f (Join-Path $root "docker-compose.dev.yml") up -d postgres-dev
New-Item -ItemType Directory -Force -Path "D:\stok-gorseller-dev" | Out-Null

# 3) Backend (8101) ve Frontend (3101)
Write-Step "Backend (8101) baslatiliyor"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $root 'scripts\start-dev-backend.ps1')`"" `
  -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "backend\server-dev.log") `
  -RedirectStandardError (Join-Path $root "backend\server-dev.err.log")

Write-Step "Backend hazir olana kadar bekleniyor"
$backendReady = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 2
  try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8101" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $backendReady = $true
    break
  } catch {
    if ($_.Exception.Response) { $backendReady = $true; break }
  }
}
if ($backendReady) { Write-Host "Backend ayakta." -ForegroundColor Green }
else { Write-Host "Backend henuz yanit vermiyor, devam ediliyor (loglara bak: backend\server-dev.err.log)" -ForegroundColor Yellow }

Write-Step "Frontend (3101) baslatiliyor"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $root 'scripts\start-dev-frontend.ps1')`"" `
  -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root "frontend\server-dev.log") `
  -RedirectStandardError (Join-Path $root "frontend\server-dev.err.log")

# 4) Gorsel tuneli (cloudflared -> 8101)
Write-Step "Gorsel tuneli aciliyor (Trendyol/N11/Ticimax gorselleri icin)"
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $cloudflared = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "cloudflared.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}

$tunnelLog = Join-Path $workDir "cloudflared-8101.log"
$urlFile = Join-Path $workDir "public-file-base-url.txt"
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

if (-not $cloudflared) {
  Write-Host "cloudflared bulunamadi, gorsel tuneli atlaniyor. Pazaryeri gorselleri calismayabilir." -ForegroundColor Yellow
} else {
  Start-Process -FilePath $cloudflared `
    -ArgumentList "tunnel --url http://127.0.0.1:8101 --no-autoupdate" `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelLog

  $tunnelUrl = $null
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $tunnelLog) {
      $content = Get-Content -Path $tunnelLog -Raw
      $match = [regex]::Match($content, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
      if ($match.Success) { $tunnelUrl = $match.Value; break }
    }
  }

  if ($tunnelUrl) {
    $tunnelUrl | Set-Content -Path $urlFile -Encoding ascii -NoNewline
    Write-Host "Gorsel tuneli hazir: $tunnelUrl" -ForegroundColor Green
  } else {
    Write-Host "Gorsel tuneli linki bulunamadi, work\cloudflared-8101.log dosyasina bak." -ForegroundColor Yellow
  }
}

# 5) Tarayiciyi ac
Write-Step "Tamam"
Start-Process "http://localhost:3101/login"
Write-Host ""
Write-Host "Frontend : http://localhost:3101" -ForegroundColor Green
Write-Host "Backend  : http://localhost:8101" -ForegroundColor Green
Write-Host "Gorseller: $(if (Test-Path $urlFile) { Get-Content $urlFile } else { 'tunel yok' })" -ForegroundColor Green
Write-Host ""
Write-Host "Bu pencereyi kapatabilirsin, servisler arka planda calismaya devam eder." -ForegroundColor DarkGray

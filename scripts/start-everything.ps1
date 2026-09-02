$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workDir = Join-Path $root "work"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

function Write-Step($text) {
  Write-Host ""
  Write-Host "== $text ==" -ForegroundColor Cyan
}

# 1) Eski cloudflared tunelini temizle (backend/frontend artik Docker container
# olarak calisiyor - Windows sureci olarak baslatilmadiklari icin ayrica
# "eski surecleri kapat" adimina gerek yok, `docker compose up` zaten
# var olan container'lari guvenle yeniden kullanir/gunceller).
Write-Step "Eski gorsel tuneli temizleniyor"
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2) Postgres + Backend (8101) + Frontend (3101) - hepsi Docker container.
# Windows'ta bazen bu surecleri normal yetkiyle kapatmak/PID ile oldurmek
# "Erisim engellendi" hatasi veriyordu - Docker container'lar bu soruna hic
# takilmiyor, "docker compose restart" her zaman calisir.
Write-Step "Backend + Frontend + PostgreSQL (Docker) baslatiliyor"
docker compose -f (Join-Path $root "docker-compose.dev.yml") up -d --build

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
else { Write-Host "Backend henuz yanit vermiyor, devam ediliyor (loglara bak: docker compose -f docker-compose.dev.yml logs backend-dev)" -ForegroundColor Yellow }

# 4) Gorsel tuneli (kalici Cloudflare Tunnel -> 8101)
# Sabit adres: https://gorseller.florayapaycicek.com (florayapaycicek.com Cloudflare'e
# tasindi, erhanflowers.com'daki canli Ticimax sitesine/e-postasina dokunulmadi).
# Eskiden kullanilan gecici "trycloudflare.com" tuneli her yeniden baslatmada adres
# degistirdigi icin Trendyol'a gonderilen gorseller zamanla kirilirdi; artik sabit.
Write-Step "Gorsel tuneli aciliyor (kalici adres: gorseller.florayapaycicek.com)"
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $cloudflared = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "cloudflared.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}

$tunnelLog = Join-Path $workDir "cloudflared-named.log"
$tunnelErrLog = Join-Path $workDir "cloudflared-named.err.log"
$urlFile = Join-Path $workDir "public-file-base-url.txt"
$stableUrl = "https://gorseller.florayapaycicek.com"

if (-not $cloudflared) {
  Write-Host "cloudflared bulunamadi, gorsel tuneli atlaniyor. Pazaryeri gorselleri calismayabilir." -ForegroundColor Yellow
} else {
  Start-Process -FilePath $cloudflared `
    -ArgumentList "tunnel run erhan-flowers-images" `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelErrLog

  $stableUrl | Set-Content -Path $urlFile -Encoding ascii -NoNewline
  Write-Host "Gorsel tuneli hazir (sabit adres): $stableUrl" -ForegroundColor Green
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

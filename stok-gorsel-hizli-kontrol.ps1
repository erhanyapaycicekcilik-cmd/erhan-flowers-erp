$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "ERHAN FLOWERS - STOK GORSEL HIZLI KONTROL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$Root = Get-Location

Write-Host ""
Write-Host "Proje klasoru:" -ForegroundColor Yellow
Write-Host $Root.Path

Write-Host ""
Write-Host "1. Next.js config dosyalari kontrol ediliyor..." -ForegroundColor Yellow

$Configs = Get-ChildItem -Path $Root -Recurse -File `
    -Include next.config.js,next.config.mjs,next.config.ts `
    -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" }

foreach ($Config in $Configs) {
    Write-Host ""
    Write-Host $Config.FullName -ForegroundColor Green

    $Content = Get-Content $Config.FullName -Raw

    if ($Content -match "remotePatterns|domains") {
        Write-Host "Gorsel domain ayari mevcut." -ForegroundColor Green
    }
    else {
        Write-Host "UYARI: remotePatterns veya domains bulunamadi." -ForegroundColor Red
    }

    if ($Content -match "localhost") {
        Write-Host "localhost ayari mevcut." -ForegroundColor Green
    }
    else {
        Write-Host "UYARI: localhost ayari bulunamadi." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Gorsel klasorleri kontrol ediliyor..." -ForegroundColor Yellow

$Folders = Get-ChildItem -Path $Root -Recurse -Directory `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.Name -match "upload|uploads|media|images|photos"
    }

foreach ($Folder in $Folders) {
    $Count = @(
        Get-ChildItem -Path $Folder.FullName -Recurse -File `
            -Include *.jpg,*.jpeg,*.png,*.webp,*.gif `
            -ErrorAction SilentlyContinue
    ).Count

    Write-Host "$($Folder.FullName) -> $Count gorsel" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. Prisma schema kontrol ediliyor..." -ForegroundColor Yellow

$Schemas = Get-ChildItem -Path $Root -Recurse -File `
    -Filter schema.prisma `
    -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" }

foreach ($Schema in $Schemas) {
    Write-Host ""
    Write-Host $Schema.FullName -ForegroundColor Green

    Select-String -Path $Schema.FullName `
        -Pattern "model Media|model MediaFile|imageUrl|coverImage|thumbnail|mediaFiles|images" `
        -Context 2,5
}

Write-Host ""
Write-Host "4. Stok karti kodlari kontrol ediliyor..." -ForegroundColor Yellow

$CodeFiles = Get-ChildItem -Path $Root -Recurse -File `
    -Include *.ts,*.tsx,*.js,*.jsx `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\.next\\"
    }

$Matches = $CodeFiles | Select-String `
    -Pattern "stockCard|stock-card|stockCards|stok kart|imageUrl|mediaFiles|coverImage" `
    -ErrorAction SilentlyContinue

$Matches |
    Select-Object -First 150 Path,LineNumber,Line |
    Format-Table -AutoSize

Write-Host ""
Write-Host "5. Calisan portlar kontrol ediliyor..." -ForegroundColor Yellow

$Ports = 3001,3101,8001,8101

foreach ($Port in $Ports) {
    try {
        $Connection = Test-NetConnection localhost -Port $Port `
            -WarningAction SilentlyContinue

        if ($Connection.TcpTestSucceeded) {
            Write-Host "Port $Port CALISIYOR" -ForegroundColor Green
        }
        else {
            Write-Host "Port $Port KAPALI" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Port $Port kontrol edilemedi." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Kontrol tamamlandi." -ForegroundColor Cyan

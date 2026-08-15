[CmdletBinding()]
param(
    [ValidateSet("production", "development", "all")]
    [string]$Environment = "all",

    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$vaultRoot = Join-Path $projectRoot "database-vault"

$targets = @{
    production = @{
        Container = "erhan-flowers-postgres"
        Folder    = "production"
        Port      = 5432
    }
    development = @{
        Container = "erhan-flowers-postgres-dev"
        Folder    = "development"
        Port      = 5433
    }
}

function Get-ContainerSetting {
    param(
        [Parameter(Mandatory)]
        [string[]]$Settings,

        [Parameter(Mandatory)]
        [string]$Name
    )

    $prefix = "$Name="
    $match = $Settings | Where-Object { $_.StartsWith($prefix) } | Select-Object -First 1
    if (-not $match) {
        throw "$Name ayari PostgreSQL konteynerinde bulunamadi."
    }

    return $match.Substring($prefix.Length)
}

function Assert-SafeIdentifier {
    param(
        [Parameter(Mandatory)]
        [string]$Value,

        [Parameter(Mandatory)]
        [string]$Label
    )

    if ($Value -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
        throw "$Label guvenli bir PostgreSQL tanimlayicisi degil."
    }
}

function Backup-Database {
    param(
        [Parameter(Mandatory)]
        [string]$TargetName
    )

    $target = $targets[$TargetName]
    $container = $target.Container

    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCommand) {
        throw "Docker bulunamadi. Yedek alma islemi baslatilmadi."
    }

    $state = (& docker inspect --format "{{.State.Status}}" $container 2>$null)
    if ($LASTEXITCODE -ne 0 -or $state -ne "running") {
        throw "$TargetName PostgreSQL konteyneri calismiyor: $container"
    }

    $settingsJson = (& docker inspect --format "{{json .Config.Env}}" $container)
    if ($LASTEXITCODE -ne 0) {
        throw "$container ayarlari okunamadi."
    }

    $settings = $settingsJson | ConvertFrom-Json
    $database = Get-ContainerSetting -Settings $settings -Name "POSTGRES_DB"
    $databaseUser = Get-ContainerSetting -Settings $settings -Name "POSTGRES_USER"
    Assert-SafeIdentifier -Value $database -Label "Veritabani adi"
    Assert-SafeIdentifier -Value $databaseUser -Label "Veritabani kullanicisi"

    Write-Host ("[OK] {0}: konteyner={1}, veritabani={2}, port={3}" -f `
        $TargetName, $container, $database, $target.Port)

    if ($CheckOnly) {
        return
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupName = "{0}-{1}" -f $database, $timestamp
    $destination = Join-Path (Join-Path $vaultRoot $target.Folder) $backupName
    $dumpFile = Join-Path $destination "$backupName.dump"
    $checksumFile = "$dumpFile.sha256"
    $manifestFile = Join-Path $destination "manifest.json"
    $containerTemp = "/tmp/$backupName.dump"

    New-Item -ItemType Directory -Path $destination -Force | Out-Null

    try {
        & docker exec $container pg_dump `
            --username=$databaseUser `
            --dbname=$database `
            --format=custom `
            --compress=9 `
            --file=$containerTemp
        if ($LASTEXITCODE -ne 0) {
            throw "pg_dump islemi basarisiz oldu."
        }

        & docker cp "${container}:${containerTemp}" $dumpFile
        if ($LASTEXITCODE -ne 0) {
            throw "Yedek dosyasi kasaya kopyalanamadi."
        }

        if (-not (Test-Path -LiteralPath $dumpFile) -or (Get-Item $dumpFile).Length -eq 0) {
            throw "Olusturulan yedek dosyasi bos veya bulunamadi."
        }

        $listOutput = & docker exec $container pg_restore --list $containerTemp
        if ($LASTEXITCODE -ne 0 -or -not $listOutput) {
            throw "Yedek arsiv yapisi dogrulanamadi."
        }

        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $dumpFile).Hash.ToLowerInvariant()
        "$hash  $backupName.dump" | Set-Content -LiteralPath $checksumFile -Encoding ascii

        $dumpInfo = Get-Item -LiteralPath $dumpFile
        [ordered]@{
            format        = "postgresql-custom"
            environment   = $TargetName
            createdAt     = (Get-Date).ToString("o")
            container     = $container
            database      = $database
            sourcePort    = $target.Port
            dumpFile      = $dumpInfo.Name
            sizeBytes     = $dumpInfo.Length
            sha256        = $hash
            archiveListed = $true
        } | ConvertTo-Json | Set-Content -LiteralPath $manifestFile -Encoding utf8

        Write-Host ("[YEDEK] {0}" -f $dumpFile)
        Write-Host ("[SHA256] {0}" -f $hash)
    }
    catch {
        Write-Error ("{0} yedegi tamamlanamadi: {1}" -f $TargetName, $_.Exception.Message)
    }
    finally {
        & docker exec $container rm -f $containerTemp 2>$null | Out-Null
    }
}

$selectedTargets = if ($Environment -eq "all") {
    @("production", "development")
}
else {
    @($Environment)
}

$failures = @()
foreach ($targetName in $selectedTargets) {
    try {
        Backup-Database -TargetName $targetName
    }
    catch {
        $failures += ("{0}: {1}" -f $targetName, $_.Exception.Message)
        Write-Warning $failures[-1]
    }
}

if ($failures.Count -gt 0) {
    Write-Error ("Kontrol/yedekleme tamamlanamadi:`n- " + ($failures -join "`n- "))
    exit 1
}

if ($CheckOnly) {
    Write-Host "Tum secili veritabani hedefleri kullanima hazir."
}

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendScript = Join-Path $root "scripts\start-dev-backend.ps1"

$connections = netstat -ano | Select-String ":8101\s" | ForEach-Object {
  $parts = ($_ -replace "^\s+", "") -split "\s+"
  if ($parts.Length -ge 5 -and $parts[3] -eq "LISTENING") {
    [int]$parts[4]
  }
}

$processIds = @($connections | Select-Object -Unique)
foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    "8101 backend kapatildi: PID $processId"
  } catch {
    "8101 backend kapatilamadi: PID $processId. Gorev Yoneticisi'nden kapatin."
  }
}

Start-Sleep -Seconds 2
& $backendScript

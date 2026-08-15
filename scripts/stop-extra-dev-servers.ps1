$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$portsToClear = @(3101, 8101, 8102)

$ownedProcessIds = New-Object System.Collections.Generic.HashSet[int]

foreach ($port in $portsToClear) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -gt 0 } |
    ForEach-Object { [void]$ownedProcessIds.Add([int]$_.OwningProcess) }
}

$projectNodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -and (
      $_.CommandLine.Contains($root) -or
      $_.CommandLine.Contains("nest start --watch") -or
      $_.CommandLine.Contains("next dev")
    )
  }

foreach ($process in $projectNodeProcesses) {
  [void]$ownedProcessIds.Add([int]$process.ProcessId)
}

foreach ($processId in $ownedProcessIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
  } catch {
    # Process may have already exited while we were cleaning up.
  }
}

Start-Sleep -Seconds 2
"Eski dev sunucu kopyalari durduruldu. Veri veya dosya silinmedi."

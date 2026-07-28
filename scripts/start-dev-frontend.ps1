$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendDir = Join-Path $root "frontend"
$frontendEnv = Join-Path $frontendDir ".env.dev"

Get-Content -LiteralPath $frontendEnv | ForEach-Object {
  if ($_ -match "^\w+=") {
    $parts = $_ -split "=", 2
    $value = $parts[1].Trim('"')
    Set-Item -Path "Env:$($parts[0])" -Value $value
  }
}

$env:NEXT_DIST_DIR = ".next-dev"
Set-Location $frontendDir
npm.cmd run dev -- -H 0.0.0.0 -p 3101

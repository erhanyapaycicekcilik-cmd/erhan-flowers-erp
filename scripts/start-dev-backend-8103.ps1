$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $root "backend"
$backendEnv = Join-Path $backendDir ".env.dev"

Get-Content -LiteralPath $backendEnv | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $parts = $line -split "=", 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    [Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

$env:ENV_FILE = $backendEnv
$env:PORT = "8103"
$env:DATABASE_URL = $env:DATABASE_URL -replace "@localhost:5433/", "@127.0.0.1:5433/"
$env:AUTH_COOKIE_NAME = "auth_token_dev_8103"

Set-Location $backendDir
npx.cmd ts-node src/main.ts

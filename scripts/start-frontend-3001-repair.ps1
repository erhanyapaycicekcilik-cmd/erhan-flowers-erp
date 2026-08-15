$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontend = Join-Path $root "frontend"

$env:NEXT_PUBLIC_API_URL = "http://localhost:8101"
$env:NEXT_PUBLIC_UPLOAD_URL = "http://localhost:8101"

Set-Location $frontend
npm.cmd run dev -- -H 0.0.0.0 -p 3001

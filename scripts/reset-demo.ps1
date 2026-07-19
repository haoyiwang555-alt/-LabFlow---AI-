param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Copy-Item -Force (Join-Path $root 'data\seed.json') (Join-Path $root 'data\runtime.json')
Write-Host "Demo data reset. Start with: `$env:PORT=$Port; npm start"

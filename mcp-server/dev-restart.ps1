# dev-restart.ps1
# Automatisches Beenden, Builden und Neustarten des MCP-Servers

Write-Host "--- Starting Dev Restart Process ---" -ForegroundColor Cyan

# 1. Kill Node processes
Write-Host "Cleaning up Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Kill anything on Port 3000 (common hang point)
Write-Host "Freeing Port 3000..."
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    $port3000 | ForEach-Object {
        Write-Host "Stopping PID $($_.OwningProcess) on Port 3000"
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# 3. Build
Write-Host "Building project..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting restart." -ForegroundColor Red
    exit 1
}

# 4. Start Server
Write-Host "Starting Server..." -ForegroundColor Green
$logPath = Join-Path $PSScriptRoot "server.log"
Start-Process node -ArgumentList "build/index.js" -WorkingDirectory $PSScriptRoot -RedirectStandardOutput $logPath -RedirectStandardError $logPath

Write-Host "Server started. Logs: $logPath" -ForegroundColor Cyan
Write-Host "Waiting 5s for initialization..."
Start-Sleep -Seconds 5
Get-Content $logPath -Tail 20

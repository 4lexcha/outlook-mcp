# Setup auto-start for Outlook Auth Server using PM2
# Run this script once as Administrator in PowerShell

Write-Host "Setting up Outlook Auth Server auto-start..." -ForegroundColor Cyan

# Step 1: Install PM2 globally
Write-Host "`n[1/4] Installing PM2..." -ForegroundColor Yellow
npm install -g pm2
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed" -ForegroundColor Red; exit 1 }

# Step 2: Create logs directory
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "Created logs directory: $logsDir" -ForegroundColor Green
}

# Step 3: Start auth server with PM2
Write-Host "`n[2/4] Starting auth server with PM2..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
pm2 start ecosystem.config.js
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: PM2 start failed" -ForegroundColor Red; exit 1 }

# Step 4: Save PM2 process list
Write-Host "`n[3/4] Saving PM2 process list..." -ForegroundColor Yellow
pm2 save

# Step 5: Create Windows Scheduled Task to start PM2 on login
Write-Host "`n[4/4] Creating Windows Scheduled Task..." -ForegroundColor Yellow

$pm2Path = (Get-Command pm2 -ErrorAction SilentlyContinue).Source
if (-not $pm2Path) {
    # Try common npm global paths
    $npmGlobal = npm root -g
    $pm2Path = Join-Path (Split-Path $npmGlobal) "pm2.cmd"
}

$taskName = "OutlookAuthServer-PM2"
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c pm2 resurrect" `
    -WorkingDirectory $PSScriptRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Remove existing task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Auto-start Outlook MCP Auth Server via PM2 on user login" | Out-Null

Write-Host "`n✅ Done! Auth server is now:" -ForegroundColor Green
Write-Host "   • Running right now (PM2)" -ForegroundColor Green
Write-Host "   • Will auto-start on every Windows login" -ForegroundColor Green
Write-Host "`nUseful PM2 commands:" -ForegroundColor Cyan
Write-Host "   pm2 status              - check status"
Write-Host "   pm2 logs outlook-auth-server  - view logs"
Write-Host "   pm2 restart outlook-auth-server - restart"
Write-Host "   pm2 stop outlook-auth-server    - stop"

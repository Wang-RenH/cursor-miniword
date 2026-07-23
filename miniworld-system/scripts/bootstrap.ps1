# MiniWorld Theme Hub bootstrap
# Creates active CSS, merges Cursor settings, prints next steps.

param(
  [string]$HubRoot = 'D:\cursor-themes\miniworld-system'
)

$ErrorActionPreference = 'Stop'
$apply = Join-Path $HubRoot 'scripts\Apply-Theme.ps1'

# Backup settings if not already backed up today
$settings = Join-Path $env:APPDATA 'Cursor\User\settings.json'
$backupDir = Join-Path $HubRoot 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $settings (Join-Path $backupDir "settings.bootstrap.$stamp.json") -Force

& $apply -HubRoot $HubRoot -Scheme 'sunny-town' -Background 'sunny-town-hero.png' -ButtonSkin 'chunky-block'

Write-Host ''
Write-Host '=== MiniWorld Theme Hub bootstrap complete ===' -ForegroundColor Green
Write-Host 'Next steps:'
Write-Host '1. Install extensions: shalldie.background , be5invis.vscode-custom-css , local miniworld VSIX'
Write-Host '2. Restart Cursor as Administrator'
Write-Host '3. Command Palette: "Enable Custom CSS and JS"'
Write-Host '4. Command Palette: "Background: Enable and apply the background" (wording may vary)'
Write-Host '5. Reload Window'
Write-Host "Hub: $HubRoot"

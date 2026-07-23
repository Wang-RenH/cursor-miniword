param(
  [string]$HubRoot = 'D:\cursor-themes\miniworld-system'
)

$settings = Join-Path $env:APPDATA 'Cursor\User\settings.json'
$backupDir = Join-Path $HubRoot 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dest = Join-Path $backupDir "settings.$stamp.json"
Copy-Item $settings $dest -Force
Write-Host "Backed up to $dest"

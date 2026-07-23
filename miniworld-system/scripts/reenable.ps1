# Re-enable MiniWorld theme after Cursor update or when styles disappear.

param(
  [string]$HubRoot = 'D:\cursor-themes\miniworld-system'
)

$ErrorActionPreference = 'Continue'

Write-Host '1) Re-applying settings + concatenating theme.css...' -ForegroundColor Cyan
& (Join-Path $HubRoot 'scripts\Apply-Theme.ps1') -HubRoot $HubRoot

Write-Host '2) Injecting CSS into Cursor workbench.html...' -ForegroundColor Cyan
& (Join-Path $HubRoot 'scripts\Inject-CustomCSS.ps1') -HubRoot $HubRoot
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Injection needs Administrator. Elevating...' -ForegroundColor Yellow
  $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$HubRoot\scripts\Inject-CustomCSS.ps1`" -HubRoot `"$HubRoot`""
  try {
    Start-Process powershell.exe -Verb RunAs -ArgumentList $arg -Wait
  } catch {
    Write-Host "UAC cancelled or failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ''
Write-Host '3) In Cursor Command Palette also run (if background missing):' -ForegroundColor Yellow
Write-Host '   - Background: Enable and apply the background / Install Background'
Write-Host '   - Developer: Reload Window'
Write-Host ''
Write-Host 'Optional: Fix VSCode Checksums if "installation corrupt" appears.'
Start-Process explorer.exe $HubRoot

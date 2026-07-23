# Inject MiniWorld CSS into Cursor workbench.html (same mechanism as Custom CSS Loader).
# Requires write access to Cursor install dir — run as Administrator if it fails.

param(
  [string]$HubRoot = 'D:\cursor-themes\miniworld-system',
  [string]$WorkbenchHtml = 'C:\Users\sadasdas\AppData\Local\Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html'
)

$ErrorActionPreference = 'Stop'

# Ensure theme.css is fresh
& (Join-Path $HubRoot 'scripts\Apply-Theme.ps1') -HubRoot $HubRoot

$themeCss = Join-Path $HubRoot 'css\active\theme.css'
if (-not (Test-Path $themeCss)) { throw "theme.css missing" }
if (-not (Test-Path $WorkbenchHtml)) { throw "workbench.html missing: $WorkbenchHtml" }

$css = Get-Content $themeCss -Raw -Encoding UTF8
# Escape nothing special for style tag; strip potential closing style
$css = $css -replace '</style>', '</ style>'

$session = [guid]::NewGuid().ToString()
$html = Get-Content $WorkbenchHtml -Raw -Encoding UTF8

# Remove previous patches
$html = [regex]::Replace($html, '<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->\r?\n*', '')
$html = [regex]::Replace($html, '<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID [\w-]+ !! -->\r?\n*', '')
$html = [regex]::Replace($html, '<!-- !! MINIWORLD-THEME-START !! -->[\s\S]*?<!-- !! MINIWORLD-THEME-END !! -->\r?\n*', '')

$inject = @"
<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID $session !! -->
<!-- !! VSCODE-CUSTOM-CSS-START !! -->
<!-- !! MINIWORLD-THEME-START !! -->
<style id="miniworld-theme-hub">
$css
</style>
<!-- !! MINIWORLD-THEME-END !! -->
<!-- !! VSCODE-CUSTOM-CSS-END !! -->
"@

if ($html -notmatch '</head>') { throw 'No </head> in workbench.html' }
$html = $html -replace '</head>', ($inject + "`n</head>")

# Backup
$bak = Join-Path $HubRoot ("backups\workbench.html." + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".bak")
Copy-Item $WorkbenchHtml $bak -Force

try {
  [System.IO.File]::WriteAllText($WorkbenchHtml, $html, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Injected MiniWorld CSS into workbench.html" -ForegroundColor Green
  Write-Host "Backup: $bak"
  Write-Host "Reload Cursor window to see window/panel/chat styles."
} catch {
  Write-Host "WRITE FAILED (need Administrator): $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Right-click PowerShell -> Run as administrator, then:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit 1
}

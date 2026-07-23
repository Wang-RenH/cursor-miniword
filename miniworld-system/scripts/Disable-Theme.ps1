# One-click restore original Cursor UI (remove MiniWorld theme)

param(
  [string]$HubRoot = 'D:\cursor-themes\miniworld-system'
)

$ErrorActionPreference = 'Stop'

$settingsPath = Join-Path $env:APPDATA 'Cursor\User\settings.json'
$backupDir = Join-Path $HubRoot 'backups'
$workbench = 'C:\Users\sadasdas\AppData\Local\Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html'

# 1) Prefer earliest original settings backup
$original = Get-ChildItem $backupDir -Filter 'settings.*.json' -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notmatch 'bootstrap' } |
  Sort-Object Name |
  Select-Object -First 1

if (-not $original) {
  $original = Get-ChildItem $backupDir -Filter 'settings*.json' | Sort-Object CreationTime | Select-Object -First 1
}

if ($original) {
  Copy-Item $original.FullName $settingsPath -Force
  Write-Host "Restored settings from $($original.Name)" -ForegroundColor Green
} else {
  # Fallback: strip MiniWorld keys from current settings
  Write-Host 'No backup found — stripping MiniWorld keys from current settings...' -ForegroundColor Yellow
  $raw = Get-Content $settingsPath -Raw -Encoding UTF8
  $jsonText = ($raw -split "`n" | ForEach-Object { if ($_ -match '^\s*//') { '' } else { $_ } }) -join "`n"
  $s = $jsonText | ConvertFrom-Json
  foreach ($k in @(
    'workbench.colorCustomizations',
    'editor.tokenColorCustomizations',
    'background.enabled',
    'background.editor',
    'background.auxiliarybar',
    'background.sidebar',
    'background.panel',
    'vscode_custom_css.imports',
    'vscode_custom_css.policy',
    'miniworldThemeHub.enabled',
    'miniworldThemeHub.hubRoot',
    'miniworldThemeHub.energySword'
  )) {
    if ($s.PSObject.Properties.Name -contains $k) {
      $s.PSObject.Properties.Remove($k)
    }
  }
  $s | Add-Member -NotePropertyName 'workbench.colorTheme' -NotePropertyValue 'Default Light+' -Force
  [System.IO.File]::WriteAllText($settingsPath, ($s | ConvertTo-Json -Depth 30), (New-Object System.Text.UTF8Encoding $false))
}

# 2) Remove CSS injection from workbench.html
if (Test-Path $workbench) {
  $html = [System.IO.File]::ReadAllText($workbench)
  $html2 = [regex]::Replace($html, '<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->\r?\n*', '')
  $html2 = [regex]::Replace($html2, '<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID [\w-]+ !! -->\r?\n*', '')
  $html2 = [regex]::Replace($html2, '<!-- !! MINIWORLD-THEME-START !! -->[\s\S]*?<!-- !! MINIWORLD-THEME-END !! -->\r?\n*', '')
  if ($html2 -ne $html) {
    $bak = Join-Path $backupDir ("workbench.html.disable." + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".bak")
    Copy-Item $workbench $bak -Force
    try {
      [System.IO.File]::WriteAllText($workbench, $html2, (New-Object System.Text.UTF8Encoding $false))
      Write-Host 'Removed MiniWorld CSS from workbench.html' -ForegroundColor Green
    } catch {
      Write-Host "Need Administrator to clean workbench.html: $($_.Exception.Message)" -ForegroundColor Red
      Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -HubRoot `"$HubRoot`"" -Wait
      exit 0
    }
  } else {
    Write-Host 'workbench.html had no MiniWorld patch'
  }
}

# 3) Mark state disabled
$statePath = Join-Path $HubRoot 'state.json'
if (Test-Path $statePath) {
  $state = Get-Content $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
  $state | Add-Member -NotePropertyName 'enabled' -NotePropertyValue $false -Force
  $state | Add-Member -NotePropertyName 'energySword' -NotePropertyValue $false -Force
  $state | ConvertTo-Json -Depth 8 | Set-Content $statePath -Encoding UTF8
}

Write-Host ''
Write-Host '原始 UI 已还原。请在 Cursor 执行: Developer: Reload Window' -ForegroundColor Cyan
Write-Host '若背景仍在: 命令面板 Background: Disable / Uninstall Background'

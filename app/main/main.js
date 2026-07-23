const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

function getThemesRoot() {
  if (isDev) return path.join(__dirname, '..', '..', 'themes');
  return path.join(process.resourcesPath, 'themes');
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadDefaults() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'defaults.json'), 'utf8')
  );
}

function loadConfig() {
  const p = getConfigPath();
  const defaults = loadDefaults();
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(defaults, null, 2), 'utf8');
    return { ...defaults };
  }
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch {
    return { ...defaults };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

function listThemes() {
  const root = getThemesRoot();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const themeJson = path.join(root, d.name, 'theme.json');
      if (!fs.existsSync(themeJson)) return null;
      const meta = JSON.parse(fs.readFileSync(themeJson, 'utf8'));
      const preview = path.join(root, d.name, meta.preview || 'preview.png');
      const previewUrl = fs.existsSync(preview)
        ? `file://${preview.replace(/\\/g, '/')}`
        : null;
      // resolve cursor preview from hub or local
      const cursors = (meta.cursors || []).map((c) => {
        if (!c.file) return { ...c, previewUrl: null };
        const local = path.join(root, d.name, c.file);
        const hub = path.join(meta.hubRoot || '', 'assets', 'cursors', path.basename(c.file));
        const file = fs.existsSync(local) ? local : fs.existsSync(hub) ? hub : null;
        return {
          ...c,
          previewUrl: file ? `file://${file.replace(/\\/g, '/')}` : null
        };
      });
      return {
        ...meta,
        folder: d.name,
        previewUrl:
          previewUrl ||
          `file://${path.join(__dirname, '..', 'renderer', 'assets', 'mascot.png').replace(/\\/g, '/')}`,
        cursors
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
}

function runPowerShell(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const psArgs = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      ...args
    ];
    const child = spawn('powershell.exe', psArgs, { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, out: out.trim() });
      else reject(new Error(err || out || `exit ${code}`));
    });
  });
}

function resolveWorkbenchHtml(cursorRoot) {
  const candidates = [
    path.join(
      cursorRoot,
      'resources',
      'app',
      'out',
      'vs',
      'code',
      'electron-sandbox',
      'workbench',
      'workbench.html'
    ),
    path.join(
      cursorRoot,
      'resources',
      'app',
      'out',
      'vs',
      'code',
      'electron-browser',
      'workbench',
      'workbench.html'
    )
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

async function applyTheme(themeId, cursorId) {
  const themes = listThemes();
  const theme = themes.find((t) => t.id === themeId);
  if (!theme) throw new Error(`主题不存在: ${themeId}`);

  const cfg = loadConfig();
  const hub = theme.hubRoot || cfg.themeHubRoot;
  const apply = path.join(hub, 'scripts', 'Apply-Theme.ps1');
  const inject = path.join(hub, 'scripts', 'Inject-CustomCSS.ps1');
  if (!fs.existsSync(apply)) throw new Error(`找不到 Apply 脚本: ${apply}`);

  const swordOn = cursorId === 'energy-sword' || cursorId === theme.defaultCursor;
  const args = ['-HubRoot', hub, '-Scheme', theme.scheme || 'glass-mini'];
  args.push('-EnergySword', swordOn && cursorId !== 'default' ? 'true' : 'false');

  await runPowerShell(apply, args);

  const workbench = resolveWorkbenchHtml(cfg.cursorInstallPath);
  if (fs.existsSync(inject)) {
    try {
      await runPowerShell(inject, ['-HubRoot', hub, '-WorkbenchHtml', workbench]);
    } catch (e) {
      // may need admin
      return {
        ok: true,
        needAdmin: true,
        message: `主题已写入 settings，但 CSS 注入需要管理员权限：${e.message}`
      };
    }
  }

  cfg.activeThemeId = themeId;
  cfg.activeCursorId = cursorId || theme.defaultCursor || 'default';
  saveConfig(cfg);
  return { ok: true, needAdmin: false, message: '主题已应用。请在 Cursor 中 Reload Window。' };
}

async function restoreOriginal() {
  const cfg = loadConfig();
  const hub = cfg.themeHubRoot;
  const disable = path.join(hub, 'scripts', 'Disable-Theme.ps1');
  if (!fs.existsSync(disable)) throw new Error(`找不到 Disable 脚本: ${disable}`);
  try {
    await runPowerShell(disable, ['-HubRoot', hub]);
  } catch (e) {
    return {
      ok: false,
      needAdmin: true,
      message: `还原需要管理员权限，请右键以管理员运行本软件后再试。\n${e.message}`
    };
  }
  cfg.activeThemeId = null;
  saveConfig(cfg);
  return { ok: true, message: '已还原原始 UI。请在 Cursor 中 Reload Window。' };
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: 'Cursor Theme Studio',
    backgroundColor: '#0f1419',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-bootstrap', () => {
  const cfg = loadConfig();
  return {
    config: cfg,
    themes: listThemes(),
    themesRoot: getThemesRoot(),
    workbench: resolveWorkbenchHtml(cfg.cursorInstallPath),
    workbenchExists: fs.existsSync(resolveWorkbenchHtml(cfg.cursorInstallPath))
  };
});

ipcMain.handle('save-config', (_e, patch) => {
  const cfg = { ...loadConfig(), ...patch };
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle('pick-cursor-path', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择 Cursor 安装目录',
    properties: ['openDirectory']
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle('pick-hub-path', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择主题 Hub 目录（含 scripts/Apply-Theme.ps1）',
    properties: ['openDirectory']
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle('apply-theme', async (_e, { themeId, cursorId }) => {
  try {
    return await applyTheme(themeId, cursorId);
  } catch (e) {
    return { ok: false, message: String(e.message || e) };
  }
});

ipcMain.handle('restore-original', async () => {
  try {
    return await restoreOriginal();
  } catch (e) {
    return { ok: false, message: String(e.message || e) };
  }
});

ipcMain.handle('open-path', (_e, p) => {
  if (p) shell.openPath(p);
});

ipcMain.handle('open-external', (_e, url) => {
  shell.openExternal(url);
});

ipcMain.handle('reenable-theme', async () => {
  const cfg = loadConfig();
  const hub = cfg.themeHubRoot;
  const script = path.join(hub, 'scripts', 'reenable.ps1');
  try {
    await runPowerShell(script, ['-HubRoot', hub]);
    return { ok: true, message: '已重新启用。请 Reload Cursor 窗口。' };
  } catch (e) {
    return { ok: false, needAdmin: true, message: String(e.message || e) };
  }
});

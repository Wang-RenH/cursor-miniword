const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_HUB = 'D:/cursor-themes/miniworld-system';

function hubRoot() {
  return (
    vscode.workspace.getConfiguration('miniworldThemeHub').get('hubRoot') ||
    DEFAULT_HUB
  ).replace(/\//g, path.sep);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listSchemes(hub) {
  const dir = path.join(hub, 'schemes');
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const scheme = readJson(path.join(dir, d.name, 'scheme.json'));
      return {
        id: scheme.id || d.name,
        label: scheme.label || d.name,
        description: scheme.description || '',
        scheme
      };
    });
}

function listBackgrounds(hub) {
  const dir = path.join(hub, 'assets', 'backgrounds');
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(f))
    .map((f) => ({ label: f, description: path.join(dir, f) }));
}

function listButtonSkins(hub) {
  const dir = path.join(hub, 'css', 'buttons');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => ({
      id: path.basename(f, '.css'),
      label: path.basename(f, '.css'),
      description: f
    }));
}

function runPs(script, hub, extras = {}) {
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-HubRoot', hub];
  if (extras.scheme) args.push('-Scheme', extras.scheme);
  if (extras.background) args.push('-Background', extras.background);
  if (extras.buttonSkin) args.push('-ButtonSkin', extras.buttonSkin);
  if (typeof extras.energySword === 'boolean') {
    args.push('-EnergySword', extras.energySword ? 'true' : 'false');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', args, { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || out || `exit ${code}`));
    });
  });
}

async function applyAndInject(hub, extras = {}) {
  await runPs(path.join(hub, 'scripts', 'Apply-Theme.ps1'), hub, extras);
  try {
    await runPs(path.join(hub, 'scripts', 'Inject-CustomCSS.ps1'), hub);
    return { injected: true };
  } catch (e) {
    return { injected: false, error: String(e.message || e) };
  }
}

async function afterApply(result, msg) {
  for (const cmd of ['background.enable', 'background.apply', 'extension.installBackground']) {
    try {
      await vscode.commands.executeCommand(cmd);
    } catch (_) {}
  }
  const pick = await vscode.window.showInformationMessage(
    msg ||
      (result.injected
        ? '主题已应用。请 Reload Window。'
        : '配色已更新；窗口 CSS 需管理员注入。可用「重新启用」。'),
    'Reload Window',
    '稍后'
  );
  if (pick === 'Reload Window') {
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
}

function activate(context) {
  const withApply = (title, extrasFactory, doneMsg) =>
    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, async () => {
      const hub = hubRoot();
      const extras =
        typeof extrasFactory === 'function' ? await extrasFactory(hub) : extrasFactory || {};
      if (extras === null) return null;
      const result = await applyAndInject(hub, extras);
      await afterApply(result, doneMsg);
      return result;
    });

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.switchScheme', async () => {
      await withApply('正在应用风格方案…', async (hub) => {
        const pick = await vscode.window.showQuickPick(
          listSchemes(hub).map((s) => ({
            label: s.label,
            description: s.id,
            detail: s.description,
            id: s.id,
            scheme: s.scheme
          })),
          { placeHolder: '选择风格（推荐：晴空毛玻璃 Glass Mini）' }
        );
        if (!pick) return null;
        return { scheme: pick.id, background: pick.scheme.defaultBackground };
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.switchBackground', async () => {
      await withApply('正在切换背景图…', async (hub) => {
        const pick = await vscode.window.showQuickPick(listBackgrounds(hub), {
          placeHolder: '选择背景图'
        });
        if (!pick) return null;
        return { background: pick.label };
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.switchButtonSkin', async () => {
      await withApply('正在切换按钮皮肤…', async (hub) => {
        const pick = await vscode.window.showQuickPick(
          listButtonSkins(hub).map((s) => ({
            label: s.label,
            description: s.description,
            id: s.id
          })),
          { placeHolder: '选择按钮皮肤' }
        );
        if (!pick) return null;
        return { buttonSkin: pick.id };
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.toggleEnergySword', async () => {
      const hub = hubRoot();
      const state = readJson(path.join(hub, 'state.json'));
      const next = !state.energySword;
      await withApply(
        next ? '开启能量剑光标…' : '关闭能量剑光标…',
        { energySword: next },
        next
          ? '能量剑已开启（刀尖为点击点）。请 Reload Window。'
          : '能量剑已关闭。请 Reload Window。'
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.applyCurrent', async () => {
      await withApply('正在重新应用当前配置…', {});
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.disableTheme', async () => {
      const hub = hubRoot();
      const confirm = await vscode.window.showWarningMessage(
        '一键还原原始 Cursor UI？（移除迷你世界配色、CSS 注入与主题标记）',
        { modal: true },
        '还原'
      );
      if (confirm !== '还原') return;
      const script = path.join(hub, 'scripts', 'Disable-Theme.ps1');
      try {
        await runPs(script, hub);
      } catch (e) {
        // elevate
        const terminal = vscode.window.createTerminal({ name: 'MiniWorld Disable' });
        terminal.show();
        terminal.sendText(
          `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""${script}""'`
        );
      }
      const pick = await vscode.window.showInformationMessage(
        '已请求还原。完成后请 Reload Window；若壁纸仍在，执行 Background Disable。',
        'Reload Window'
      );
      if (pick === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.openHub', async () => {
      await vscode.env.openExternal(vscode.Uri.file(hubRoot()));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.reenable', async () => {
      const hub = hubRoot();
      const script = path.join(hub, 'scripts', 'reenable.ps1');
      const terminal = vscode.window.createTerminal({
        name: 'MiniWorld Re-enable',
        cwd: path.join(hub, 'scripts')
      });
      terminal.show();
      terminal.sendText(
        `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""${script}""'`
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniworld.restoreBackup', async () => {
      const hub = hubRoot();
      const backupDir = path.join(hub, 'backups');
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith('settings.') && f.endsWith('.json'))
        .sort()
        .reverse();
      if (!files.length) {
        vscode.window.showWarningMessage('未找到 settings 备份');
        return;
      }
      const pick = await vscode.window.showQuickPick(
        files.map((f) => ({ label: f, description: path.join(backupDir, f) })),
        { placeHolder: '选择要恢复的 settings 备份' }
      );
      if (!pick) return;
      const confirm = await vscode.window.showWarningMessage(
        `将用 ${pick.label} 覆盖当前 Cursor settings.json，确认？`,
        { modal: true },
        '恢复'
      );
      if (confirm !== '恢复') return;
      fs.copyFileSync(
        path.join(backupDir, pick.label),
        path.join(process.env.APPDATA, 'Cursor', 'User', 'settings.json')
      );
      const reload = await vscode.window.showInformationMessage('已恢复备份', 'Reload Window');
      if (reload === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };

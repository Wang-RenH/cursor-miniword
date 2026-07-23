# Cursor Theme Studio

开源桌面主题管理器（Electron）。图标使用你提供的恐龙抱 Cursor Logo 形象。

## 功能

- **总览**：当前主题 / 光标 / 路径状态，快捷操作
- **主题市场**：本地 `themes/` 包封装，可切换迷你世界毛玻璃 / 晴空小镇，后续继续加包
- **光标样式**：能量剑（刀尖热点），可扩展更多
- **设置**：自定义 Cursor 安装目录、主题 Hub 路径
- **恢复原版 UI**：一键还原
- **重新启用补丁**：Cursor 更新后补丁丢失时用

## 安装包位置

```
D:\cursor-themes\ThemeStudio\release\CursorThemeStudio-Setup-1.0.0.exe
```

双击安装后会创建桌面快捷方式 **Cursor Theme Studio**。

也可直接运行免安装目录：

```
D:\cursor-themes\ThemeStudio\release\win-unpacked\CursorThemeStudio.exe
```

## 开发

```bash
cd D:\cursor-themes\ThemeStudio
npm install
npm start
npm run dist
```

## 新增主题包

1. 复制 `themes/miniworld-glass`
2. 修改 `theme.json`（`id` / `name` / `scheme` / `hubRoot`）
3. 替换 `preview.png`
4. 重启 Studio，市场中即可看到

主题实际注入仍依赖 Hub：`D:\cursor-themes\miniworld-system` 的 PowerShell 脚本。

## 注意

- 首次应用 / 还原若提示权限，请 **右键管理员运行** Theme Studio
- 应用后请在 Cursor 执行 `Developer: Reload Window`
- MIT License

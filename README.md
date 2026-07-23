# 迷你世界 Cursor 主题系统（毛玻璃版）

根目录：`D:\cursor-themes\miniworld-system`

## 设计方向（v2）

- **简洁毛玻璃**：侧栏 / 聊天 / 弹层用 `backdrop-filter`，细线分隔，去掉拉伸像素贴图
- **迷你世界点缀**：天蓝 / 草绿 / 熊橙作强调色，低透明度海报背景
- **能量剑光标**：刀尖为点击热点 `(3,3)`，可开关
- **一键还原**：随时退回原始 Cursor UI

推荐方案：**晴空毛玻璃 `glass-mini`**（默认）

## 命令面板

| 命令 | 作用 |
|------|------|
| `MiniWorld: 切换风格方案` | glass-mini / sunny-town / grassland / wooden-village / clear-focus |
| `MiniWorld: 切换背景图` | `assets/backgrounds` |
| `MiniWorld: 切换按钮皮肤` | 柔和玻璃按钮变体 |
| `MiniWorld: 开关能量剑光标` | 开/关自定义光标 |
| `MiniWorld: 重新应用当前配置` | 重写 settings + 注入 CSS |
| **`MiniWorld: 一键还原原始 UI`** | 恢复备份 settings + 清除 workbench 注入 |
| `MiniWorld: 重新启用主题系统` | 更新 Cursor 后补丁失效时用 |
| `MiniWorld: 打开主题文件夹` | 打开 Hub |

## 如何重新加载

改完后必须：

1. `Ctrl+Shift+P` → **`Developer: Reload Window`**
2. 若背景没了 → Background Enable/Apply

管理员一键重启用：

```powershell
powershell -ExecutionPolicy Bypass -File "D:\cursor-themes\miniworld-system\scripts\reenable.ps1"
```

一键取消主题：

```powershell
powershell -ExecutionPolicy Bypass -File "D:\cursor-themes\miniworld-system\scripts\Disable-Theme.ps1"
```

或命令面板：`MiniWorld: 一键还原原始 UI`，然后 Reload Window。

## 能量剑光标

- 资源：`assets/cursors/energy-sword.png`
- CSS：`cursor: url(...) 3 3` —— **热点在刀尖**，不是刀柄
- 关闭：`MiniWorld: 开关能量剑光标`

## 目录摘要

- `schemes/glass-mini` — 默认毛玻璃色板
- `css/base.css` / `chat.css` — 玻璃 UI（无像素天空条）
- `css/cursor.css` — 能量剑
- `scripts/Apply-Theme.ps1` / `Inject-CustomCSS.ps1` / `Disable-Theme.ps1`
- `backups/` — settings 与 workbench 备份

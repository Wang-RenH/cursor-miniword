(() => {
  const state = {
    config: null,
    themes: [],
    filter: 'all',
    search: '',
    selectedThemeId: null,
    selectedCursorId: null
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function toast(msg, type = 'ok') {
    const el = $('#toast');
    el.hidden = false;
    el.className = `toast ${type}`;
    el.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 4200);
  }

  function setStatus(text) {
    $('#statusPill').textContent = text;
  }

  function goto(view) {
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
    const map = {
      home: ['总览', '管理 Cursor 主题、光标与安装路径'],
      market: ['主题市场', '浏览、选择并应用已封装的主题包'],
      cursors: ['光标样式', '为当前主题选择自定义指针'],
      settings: ['设置', '指定 Cursor 与主题 Hub 路径'],
      about: ['关于开源', '主题包格式与贡献说明']
    };
    $('#viewTitle').textContent = map[view][0];
    $('#viewDesc').textContent = map[view][1];
  }

  function currentTheme() {
    return state.themes.find((t) => t.id === state.selectedThemeId) || state.themes[0];
  }

  function renderStats() {
    const t = currentTheme();
    $('#statTheme').textContent = t ? t.name : '未选择';
    $('#statCursor').textContent = state.selectedCursorId || 'default';
    $('#statCount').textContent = String(state.themes.length);
    $('#statPath').textContent = state.config?.cursorInstallPath || '—';
  }

  function filteredThemes() {
    const q = state.search.trim().toLowerCase();
    return state.themes.filter((t) => {
      if (state.filter === 'featured' && !t.featured) return false;
      if (state.filter === 'installed' && t.id !== state.config?.activeThemeId) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.description} ${(t.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderMarket() {
    const grid = $('#themeGrid');
    const list = filteredThemes();
    if (!list.length) {
      grid.innerHTML = `<div class="panel"><p class="muted">没有匹配的主题包。可在 themes/ 目录添加 theme.json。</p></div>`;
      return;
    }
    grid.innerHTML = list
      .map((t) => {
        const active = t.id === state.selectedThemeId;
        const applied = t.id === state.config?.activeThemeId;
        const tags = (t.tags || []).map((x) => `<span class="tag">${x}</span>`).join('');
        return `
        <article class="theme-card ${active ? 'active' : ''}" data-id="${t.id}">
          <img class="theme-preview" src="${t.previewUrl || 'assets/mascot.png'}" alt="" />
          <div class="theme-body">
            <div class="theme-name">${t.name}${applied ? ' · 使用中' : ''}</div>
            <div class="theme-desc">${t.description || ''}</div>
            <div class="tags">${tags}</div>
            <div class="card-actions">
              <button class="btn btn-secondary select-theme" data-id="${t.id}">选择</button>
              <button class="btn btn-primary apply-theme" data-id="${t.id}">应用</button>
            </div>
          </div>
        </article>`;
      })
      .join('');
  }

  function renderCursors() {
    const t = currentTheme();
    const grid = $('#cursorGrid');
    const cursors = t?.cursors || [
      { id: 'energy-sword', name: '能量剑', previewUrl: 'assets/cursor-energy-sword.png' },
      { id: 'default', name: '系统默认', previewUrl: null }
    ];
    grid.innerHTML = cursors
      .map((c) => {
        const active = c.id === state.selectedCursorId;
        const img = c.previewUrl
          ? `<img src="${c.previewUrl}" alt="" />`
          : `<div style="color:#8b9aab;font-size:13px">系统箭头</div>`;
        return `
        <article class="cursor-card ${active ? 'active' : ''}" data-id="${c.id}">
          <div class="cursor-preview-wrap">${img}</div>
          <div class="cursor-body">
            <div class="cursor-name">${c.name}</div>
            <div class="theme-desc">${c.id === 'energy-sword' ? '迷你世界能量剑 · 刀尖热点' : '使用系统默认光标'}</div>
            <div class="card-actions">
              <button class="btn btn-primary select-cursor" data-id="${c.id}">选用</button>
            </div>
          </div>
        </article>`;
      })
      .join('');
  }

  function fillSettings() {
    $('#inputCursorPath').value = state.config.cursorInstallPath || '';
    $('#inputHubPath').value = state.config.themeHubRoot || '';
    $('#chkReloadHint').checked = !!state.config.autoReloadHint;
  }

  async function refresh() {
    const data = await window.themeStudio.getBootstrap();
    state.config = data.config;
    state.themes = data.themes;
    state.selectedThemeId = state.config.activeThemeId || state.themes[0]?.id || null;
    state.selectedCursorId = state.config.activeCursorId || 'energy-sword';
    renderStats();
    renderMarket();
    renderCursors();
    fillSettings();
    $('#workbenchHint').textContent = data.workbenchExists
      ? `已检测到 workbench：${data.workbench}`
      : '未检测到 workbench.html，请检查 Cursor 安装路径';
    setStatus(data.workbenchExists ? '路径有效' : '路径待确认');
  }

  async function apply(themeId) {
    const id = themeId || state.selectedThemeId;
    if (!id) return toast('请先选择主题', 'err');
    setStatus('应用中…');
    $('#btnApply').disabled = true;
    const res = await window.themeStudio.applyTheme({
      themeId: id,
      cursorId: state.selectedCursorId || 'energy-sword'
    });
    $('#btnApply').disabled = false;
    if (res.ok) {
      setStatus('已应用');
      toast(res.message + (res.needAdmin ? '（若样式未变请用管理员运行）' : ''));
      await refresh();
    } else {
      setStatus('失败');
      toast(res.message || '应用失败', 'err');
    }
  }

  async function restore() {
    const ok = confirm('确定恢复 Cursor 原版 UI？将清除主题 CSS 注入并还原 settings 备份。');
    if (!ok) return;
    setStatus('还原中…');
    const res = await window.themeStudio.restoreOriginal();
    if (res.ok) {
      setStatus('已还原');
      toast(res.message);
      await refresh();
    } else {
      setStatus('需管理员');
      toast(res.message || '还原失败', 'err');
    }
  }

  // nav
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => goto(b.dataset.view)));
  $$('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => goto(b.dataset.goto))
  );

  $('#btnApply').addEventListener('click', () => apply());
  $('#btnQuickApply').addEventListener('click', () => {
    const featured = state.themes.find((t) => t.featured) || state.themes[0];
    if (featured) {
      state.selectedThemeId = featured.id;
      apply(featured.id);
    }
  });
  $('#btnRestore').addEventListener('click', restore);
  $('#btnRestore2').addEventListener('click', restore);
  $('#btnReenable').addEventListener('click', async () => {
    const res = await window.themeStudio.reenableTheme();
    toast(res.message, res.ok ? 'ok' : 'err');
  });

  $('#marketSearch').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderMarket();
  });
  $$('#marketFilter .seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      $$('#marketFilter .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.filter = b.dataset.filter;
      renderMarket();
    })
  );

  $('#themeGrid').addEventListener('click', (e) => {
    const sel = e.target.closest('.select-theme');
    const appBtn = e.target.closest('.apply-theme');
    if (sel) {
      state.selectedThemeId = sel.dataset.id;
      renderMarket();
      renderCursors();
      renderStats();
    }
    if (appBtn) {
      state.selectedThemeId = appBtn.dataset.id;
      apply(appBtn.dataset.id);
    }
  });

  $('#cursorGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.select-cursor');
    if (!btn) return;
    state.selectedCursorId = btn.dataset.id;
    renderCursors();
    renderStats();
    toast(`已选择光标：${btn.dataset.id}（点击「应用当前主题」生效）`);
  });

  $('#btnPickCursor').addEventListener('click', async () => {
    const p = await window.themeStudio.pickCursorPath();
    if (p) $('#inputCursorPath').value = p;
  });
  $('#btnPickHub').addEventListener('click', async () => {
    const p = await window.themeStudio.pickHubPath();
    if (p) $('#inputHubPath').value = p;
  });
  $('#btnSaveSettings').addEventListener('click', async () => {
    state.config = await window.themeStudio.saveConfig({
      cursorInstallPath: $('#inputCursorPath').value,
      themeHubRoot: $('#inputHubPath').value,
      autoReloadHint: $('#chkReloadHint').checked
    });
    toast('设置已保存');
    await refresh();
  });
  $('#btnOpenHub').addEventListener('click', () => {
    window.themeStudio.openPath($('#inputHubPath').value);
  });
  $('#btnOpenThemes').addEventListener('click', async () => {
    const data = await window.themeStudio.getBootstrap();
    window.themeStudio.openPath(data.themesRoot);
  });

  refresh().catch((e) => toast(String(e), 'err'));
})();

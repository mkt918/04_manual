/**
 * Manual Hub Frontend Logic
 * 機能: マニュアル閲覧 / ピン留め / タグ強化検索 / 関連ノート / 月次サマリー / カレンダー / タスク
 */

// --- STATE ---
let allManuals = [];
let currentFilter = 'all';
let searchQuery = '';
let activeId = null;

// カレンダー状態
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed
let selectedDate = null; // 'YYYY-MM-DD' 形式

// 月次サマリー状態
let summaryYear = new Date().getFullYear();
let summaryMonth = new Date().getMonth();

// --- DOM ELEMENTS ---
let manualList, genreFilters, searchInput, resultsCount;
let welcomeView, manualView, contentRender, mainMeta;
let sidebar, toggleSidebar, rightPanel, toggleRightPanel, panelOverlay;
let calGrid, calMonthLabel, calPrev, calNext, calDayList;
let pinnedSection, pinnedList;

function initElements() {
    manualList        = document.getElementById('manual-list');
    genreFilters      = document.getElementById('genre-filters');
    searchInput       = document.getElementById('search-input');
    resultsCount      = document.getElementById('results-count');

    welcomeView       = document.getElementById('welcome-view');
    manualView        = document.getElementById('manual-view');
    contentRender     = document.getElementById('content-render');
    mainMeta          = document.getElementById('main-meta');

    sidebar           = document.getElementById('sidebar');
    toggleSidebar     = document.getElementById('toggle-sidebar');
    rightPanel        = document.getElementById('calendar-panel');
    toggleRightPanel  = document.getElementById('toggle-right-panel');
    panelOverlay      = document.getElementById('panel-overlay');

    calGrid           = document.getElementById('cal-grid');
    calMonthLabel     = document.getElementById('cal-month-label');
    calPrev           = document.getElementById('cal-prev');
    calNext           = document.getElementById('cal-next');
    calDayList        = document.getElementById('cal-day-list');

    pinnedSection     = document.getElementById('pinned-section');
    pinnedList        = document.getElementById('pinned-list');
}

/** モバイル用パネル操作ユーティリティ */
function openPanel(panel) {
    panel.classList.add('open');
    panelOverlay.classList.remove('hidden');
}

function closeAllPanels() {
    sidebar.classList.remove('open');
    rightPanel.classList.remove('open');
    panelOverlay.classList.add('hidden');
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    fetchManuals();

    // 検索イベント
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        selectedDate = null;
        renderManuals();
        renderCalendar();
    });

    // モバイル: 左サイドバートグル
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('open');
            closeAllPanels();
            if (!isOpen) openPanel(sidebar);
        });
    }

    // モバイル: 右パネルトグル
    if (toggleRightPanel) {
        toggleRightPanel.addEventListener('click', () => {
            const isOpen = rightPanel.classList.contains('open');
            closeAllPanels();
            if (!isOpen) openPanel(rightPanel);
        });
    }

    // オーバーレイクリックで全パネルを閉じる
    if (panelOverlay) {
        panelOverlay.addEventListener('click', closeAllPanels);
    }

    // カレンダー月移動
    calPrev.addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });
    calNext.addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    // Marked.js設定
    marked.setOptions({ breaks: true, gfm: true });
});

// --- API FUNCTIONS ---

async function fetchManuals() {
    try {
        const response = await fetch('manuals.json');
        allManuals = await response.json();
        renderFilters();
        renderPinnedSection();
        renderManuals();
        renderCalendar();
    } catch (error) {
        console.error('Fetch error:', error);
        manualList.innerHTML = '<p class="text-xs text-red-500 py-10 font-bold">Failed to load manuals.</p>';
    }
}

async function openDetail(id) {
    const manual = allManuals.find(m => m.id === id);
    if (!manual) return;

    activeId = id;
    renderManuals();
    renderPinnedSection();

    closeAllPanels();

    welcomeView.classList.add('hidden');
    manualView.classList.remove('hidden');

    contentRender.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>';
    contentRender.classList.add('fade-in');

    // 重要度バッジ
    const importanceLabel = { high: '★ 重要', normal: '普通', low: '参考' };
    const importanceCls   = { high: 'importance-high', normal: 'importance-normal', low: 'importance-low' };
    const imp = manual.importance || 'normal';

    mainMeta.innerHTML = `
        <span class="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-black rounded-lg uppercase tracking-[0.15em] border border-indigo-100/50">${manual.genre}</span>
        <span class="importance-badge ${importanceCls[imp]}">${importanceLabel[imp]}</span>
        <span class="text-slate-400 text-[11px] font-bold uppercase tracking-widest self-center">${new Date(manual.created_at).toLocaleDateString('ja-JP')}</span>
        ${manual.pinned ? '<span class="text-[11px] font-black text-amber-500">📌 ピン留め</span>' : ''}
    `;

    try {
        const response = await fetch(manual.path);
        const mdText = await response.text();
        contentRender.innerHTML = marked.parse(mdText);
    } catch (error) {
        contentRender.innerHTML = '<p class="text-red-500">ファイルの読み込みに失敗しました。</p>';
    }

    // タグチップ描画
    renderTagChips(manual);
    // 関連ノート描画
    renderRelatedNotes(manual);
}

// --- RENDERING ---

/**
 * ピン留めセクションを描画する
 */
function renderPinnedSection() {
    const pinned = allManuals.filter(m => m.pinned);
    if (pinned.length === 0) {
        pinnedSection.classList.add('hidden');
        return;
    }
    pinnedSection.classList.remove('hidden');
    pinnedList.innerHTML = pinned.map(m => `
        <div class="pinned-item ${activeId === m.id ? 'active' : ''}" onclick="openDetail('${m.id}')">
            <p class="text-[12px] font-bold text-amber-800 leading-tight">${m.title}</p>
            <p class="text-[9px] font-black text-amber-500 uppercase tracking-wider mt-0.5">${m.genre}</p>
        </div>
    `).join('');
}

/**
 * タグチップを詳細画面下部に描画する
 */
function renderTagChips(manual) {
    const tagArea = document.getElementById('tag-area');
    const tagChips = document.getElementById('tag-chips');
    if (!manual.tags || manual.tags.trim() === '') {
        tagArea.classList.add('hidden');
        return;
    }
    const tags = manual.tags.split(',').map(t => t.trim()).filter(t => t);
    tagArea.classList.remove('hidden');
    tagChips.innerHTML = tags.map(tag => `
        <button class="tag-chip" onclick="filterByTag('${escapeHtml(tag)}')">#${escapeHtml(tag)}</button>
    `).join('');
}

/**
 * 関連ノートを描画する
 */
function renderRelatedNotes(manual) {
    const area = document.getElementById('related-notes-area');
    const list = document.getElementById('related-notes-list');
    const ids = manual.related_ids || [];
    const related = ids.map(id => allManuals.find(m => m.id === id)).filter(Boolean);

    if (related.length === 0) {
        area.classList.add('hidden');
        return;
    }
    area.classList.remove('hidden');
    list.innerHTML = related.map(m => `
        <div class="related-card" onclick="openDetail('${m.id}')">
            <p class="text-[12px] font-bold text-slate-700 leading-snug mb-1">${escapeHtml(m.title)}</p>
            <div class="flex items-center gap-2">
                <span class="text-[9px] font-black text-indigo-400 uppercase tracking-wider">${escapeHtml(m.genre)}</span>
                <span class="text-[9px] text-slate-300">·</span>
                <span class="text-[9px] font-bold text-slate-400">${new Date(m.created_at).toLocaleDateString('ja-JP')}</span>
            </div>
        </div>
    `).join('');
}

/**
 * タグをクリックして絞り込む（#タグ名 形式で検索ボックスに入力）
 */
function filterByTag(tag) {
    searchInput.value = `#${tag}`;
    searchQuery = `#${tag}`;
    selectedDate = null;
    currentFilter = 'all';
    renderManuals();
    renderFilters();
    renderCalendar();
}

/**
 * タグ強化検索パーサー
 * - "#タグ1 #タグ2" → AND絞り込み
 * - 通常テキスト → タイトル/内容/ジャンル検索
 */
function applySearch(manuals, query) {
    if (!query || query.trim() === '') return manuals;

    const q = query.trim();
    // #プレフィクスのトークンを抽出
    const tagTokens = [];
    const plainTokens = [];

    q.split(/\s+/).forEach(token => {
        if (token.startsWith('#')) {
            tagTokens.push(token.slice(1).toLowerCase());
        } else if (token.length > 0) {
            plainTokens.push(token.toLowerCase());
        }
    });

    return manuals.filter(m => {
        const tagsStr = (m.tags || '').toLowerCase();
        // AND: すべてのタグトークンがマッチすること
        const tagMatch = tagTokens.every(tag => tagsStr.includes(tag));
        // AND: すべての平文トークンがタイトル・内容・ジャンルにマッチすること
        const plainMatch = plainTokens.every(p =>
            (m.title || '').toLowerCase().includes(p) ||
            (m.content || '').toLowerCase().includes(p) ||
            (m.genre || '').toLowerCase().includes(p) ||
            tagsStr.includes(p)
        );
        return tagMatch && plainMatch;
    });
}

function renderManuals() {
    let filtered = allManuals;

    // ジャンル/タグフィルター
    if (currentFilter !== 'all') {
        filtered = filtered.filter(m => m.genre === currentFilter || (m.tags && m.tags.includes(currentFilter)));
    }

    // 日付選択
    if (selectedDate) {
        filtered = filtered.filter(m => {
            if (!m.created_at) return false;
            const d = new Date(m.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            return key === selectedDate;
        });
    } else {
        // 検索
        filtered = applySearch(filtered, searchQuery);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    resultsCount.textContent = filtered.length;

    if (filtered.length === 0) {
        manualList.innerHTML = `
            <div class="py-10 text-center">
                <p class="text-slate-300 text-xs font-bold uppercase tracking-widest">No results</p>
            </div>
        `;
        return;
    }

    manualList.innerHTML = filtered.map((manual) => `
        <div class="manual-list-item ${activeId === manual.id ? 'active' : ''}"
             onclick="openDetail('${manual.id}')">
            <h4 class="text-sm font-bold mb-1 leading-tight transition-colors">${manual.title}</h4>
            <div class="flex items-center gap-2 opacity-60">
                <span class="text-[9px] font-black uppercase tracking-widest text-indigo-500">${manual.genre}</span>
                <span class="text-[9px] font-bold text-slate-400">•</span>
                <span class="text-[9px] font-bold text-slate-400">${new Date(manual.created_at).toLocaleDateString('ja-JP')}</span>
                ${manual.pinned ? '<span class="text-[9px] text-amber-400">📌</span>' : ''}
            </div>
        </div>
    `).join('');
}

function renderFilters() {
    const genres = ['all', ...new Set(allManuals.map(m => m.genre).filter(g => g))];
    genreFilters.innerHTML = genres.map(g => `
        <button onclick="filterBy('${g}')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${currentFilter === g ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}">
            ${g === 'all' ? 'All' : g}
        </button>
    `).join('');
}

// --- カレンダー ---

function renderCalendar() {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    calMonthLabel.textContent = `${calYear}年 ${calMonth + 1}月`;

    // この月に登録があるマニュアルの日付セット
    const manualDates = {};
    allManuals.forEach(m => {
        if (!m.created_at) return;
        const d = new Date(m.created_at);
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
            const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!manualDates[key]) manualDates[key] = [];
            manualDates[key].push(m);
        }
    });

    // グリッド生成
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();

    let cells = '';

    for (let i = firstDay - 1; i >= 0; i--) {
        cells += `<div class="cal-cell other-month">${daysInPrev - i}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = key === todayKey;
        const isSelected = key === selectedDate;
        const hasDot = !!manualDates[key];

        let cls = 'cal-cell';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';

        cells += `
            <div class="${cls}" onclick="selectCalDate('${key}')">
                ${d}
                ${hasDot ? '<span class="cal-dot"></span>' : ''}
            </div>
        `;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        cells += `<div class="cal-cell other-month">${d}</div>`;
    }

    calGrid.innerHTML = cells;
    renderCalMonthList(manualDates);
}

function renderCalMonthList(manualDates) {
    const label = document.querySelector('#cal-day-manuals p');

    if (selectedDate && manualDates[selectedDate]) {
        const d = new Date(selectedDate);
        if (label) label.textContent = `${d.getMonth()+1}月${d.getDate()}日のマニュアル`;
        calDayList.innerHTML = manualDates[selectedDate].map(m => `
            <div class="cal-manual-card" onclick="openDetail('${m.id}')">
                <p class="text-[11px] font-bold text-indigo-700 leading-snug">${m.title}</p>
                <p class="text-[9px] text-indigo-400 font-black uppercase tracking-wider mt-0.5">${m.genre}</p>
            </div>
        `).join('');
    } else {
        if (label) label.textContent = `この月のアーカイブ`;
        const monthManuals = allManuals.filter(m => {
            if (!m.created_at) return false;
            const d = new Date(m.created_at);
            return d.getFullYear() === calYear && d.getMonth() === calMonth;
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        if (monthManuals.length === 0) {
            calDayList.innerHTML = `<p class="text-[10px] text-slate-300 font-bold text-center py-4">この月の登録はありません</p>`;
            return;
        }

        calDayList.innerHTML = monthManuals.map(m => {
            const d = new Date(m.created_at);
            return `
                <div class="cal-manual-card" onclick="openDetail('${m.id}')">
                    <p class="text-[11px] font-bold text-indigo-700 leading-snug">${m.title}</p>
                    <p class="text-[9px] text-indigo-400 font-black uppercase tracking-wider mt-0.5">${d.getMonth()+1}/${d.getDate()} · ${m.genre}</p>
                </div>
            `;
        }).join('');
    }
}

// --- 月次サマリー ---

function openMonthlySummary() {
    summaryYear = calYear;
    summaryMonth = calMonth;
    renderMonthlySummary(summaryYear, summaryMonth);
    document.getElementById('monthly-modal').classList.remove('hidden');
}

function closeMonthlySummary() {
    document.getElementById('monthly-modal').classList.add('hidden');
}

function shiftSummaryYear(delta) {
    summaryYear += delta;
    renderMonthlySummary(summaryYear, summaryMonth);
}

function renderMonthlySummary(year, month) {
    const modal = document.getElementById('monthly-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = `${year}年 ${month + 1}月 のまとめ`;

    // 当該月のマニュアルを取得
    const monthManuals = allManuals.filter(m => {
        if (!m.created_at) return false;
        const d = new Date(m.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (monthManuals.length === 0) {
        body.innerHTML = `<p class="text-center text-slate-400 font-bold py-10">${year}年${month+1}月の記録はありません</p>`;
        return;
    }

    // ジャンル別集計
    const genreMap = {};
    monthManuals.forEach(m => {
        genreMap[m.genre] = (genreMap[m.genre] || 0) + 1;
    });

    const genreCards = Object.entries(genreMap).map(([g, cnt]) => `
        <div class="summary-genre-card">
            <span class="text-[12px] font-bold text-slate-700">${escapeHtml(g)}</span>
            <span class="text-[12px] font-black text-indigo-600">${cnt} 件</span>
        </div>
    `).join('');

    // ピン留め済み
    const pinnedItems = monthManuals.filter(m => m.pinned);
    const pinnedHtml = pinnedItems.length > 0
        ? pinnedItems.map(m => `
            <div class="summary-timeline-item" onclick="closeMonthlySummary(); openDetail('${m.id}')">
                <span class="summary-timeline-date">${new Date(m.created_at).getDate()}日</span>
                <span class="summary-timeline-title">📌 ${escapeHtml(m.title)}</span>
                <span class="summary-timeline-genre">${escapeHtml(m.genre)}</span>
            </div>
          `).join('')
        : `<p class="text-[11px] text-slate-300 font-bold">ピン留めなし</p>`;

    // タイムライン（全件）
    const timelineHtml = monthManuals.map(m => `
        <div class="summary-timeline-item" onclick="closeMonthlySummary(); openDetail('${m.id}')">
            <span class="summary-timeline-date">${new Date(m.created_at).getDate()}日</span>
            <span class="summary-timeline-title">${escapeHtml(m.title)}</span>
            <span class="summary-timeline-genre">${escapeHtml(m.genre)}</span>
        </div>
    `).join('');

    body.innerHTML = `
        <!-- 件数サマリー -->
        <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">ジャンル別件数</p>
            <div class="grid grid-cols-2 gap-2">${genreCards}</div>
        </div>
        <!-- ピン留め -->
        <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">📌 ピン留め済み</p>
            <div>${pinnedHtml}</div>
        </div>
        <!-- タイムライン -->
        <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">📅 タイムライン（${monthManuals.length} 件）</p>
            <div>${timelineHtml}</div>
        </div>
    `;
}

// --- HELPERS ---

function filterBy(genreOrTag) {
    if (window.event) window.event.stopPropagation();
    currentFilter = genreOrTag;
    selectedDate = null;
    searchQuery = '';
    searchInput.value = '';
    renderManuals();
    renderFilters();
    renderCalendar();
}

function selectCalDate(dateKey) {
    selectedDate = selectedDate === dateKey ? null : dateKey;
    searchInput.value = '';
    searchQuery = '';
    renderManuals();
    renderCalendar();
}

// --- XSS防止ユーティリティ ---
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// --- グローバル公開 ---
window.filterBy = filterBy;
window.filterByTag = filterByTag;
window.openDetail = openDetail;
window.selectCalDate = selectCalDate;
window.openMonthlySummary = openMonthlySummary;
window.closeMonthlySummary = closeMonthlySummary;
window.shiftSummaryYear = shiftSummaryYear;

// ============================================================
// タスク管理
// ============================================================

let tasks = [];
let currentTaskFilter = 'all';

async function fetchTasks() {
    try {
        const res = await fetch('tasks.json');
        tasks = await res.json();
    } catch (_) {
        tasks = [];
    }
    renderTasks();
}

function setTaskFilter(filter) {
    currentTaskFilter = filter;
    ['all', 'active', 'done'].forEach(f => {
        const btn = document.getElementById(`tf-${f}`);
        if (btn) btn.className = `task-filter-btn flex-1 text-[10px] font-black py-1.5 rounded-lg transition-all${f === filter ? ' active-filter' : ''}`;
    });
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById('task-list');
    const progressLabel = document.getElementById('task-progress-label');
    const progressBar = document.getElementById('task-progress-bar');
    if (!list) return;

    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    progressLabel.textContent = `${done} / ${total}`;
    progressBar.style.width = total === 0 ? '0%' : `${Math.round(done / total * 100)}%`;

    let filtered = tasks;
    if (currentTaskFilter === 'active') filtered = tasks.filter(t => !t.done);
    if (currentTaskFilter === 'done')   filtered = tasks.filter(t => t.done);

    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-center text-[10px] text-slate-300 font-bold py-6 uppercase tracking-widest">タスクなし</p>`;
        return;
    }

    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const sorted = [...filtered].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    });

    list.innerHTML = sorted.map(t => {
        const priorityClass = t.done ? '' : `priority-${t.priority}`;
        const doneClass = t.done ? 'done-task' : '';
        const checkClass = t.done ? 'checked' : '';
        const textClass = t.done ? 'done-text' : '';
        const checkMark = t.done
            ? `<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`
            : '';
        return `
            <div class="task-item ${priorityClass} ${doneClass}">
                <div class="task-check ${checkClass}">${checkMark}</div>
                <span class="task-title ${textClass}">${escapeHtml(t.title)}</span>
            </div>
        `;
    }).join('');
}

function switchTab(tab) {
    const sectionIds = { calendar: 'section-calendar', todo: 'section-todo', tasks: 'section-tasks' };
    const btnIds     = { calendar: 'tab-cal-btn', todo: 'tab-todo-btn', tasks: 'tab-task-btn' };

    const active   = 'tab-btn tab-active flex-1 text-[10px] font-black py-2 rounded-lg transition-all';
    const inactive = 'tab-btn flex-1 text-[10px] font-black py-2 rounded-lg transition-all';

    Object.keys(sectionIds).forEach(t => {
        const section = document.getElementById(sectionIds[t]);
        const btn     = document.getElementById(btnIds[t]);
        if (section) section.classList.toggle('hidden', t !== tab);
        if (btn)     btn.className = t === tab ? active : inactive;
    });

    if (tab === 'todo')  renderTodo();
    if (tab === 'tasks') renderTasks();
}

function renderTodo() {
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MS_DAY = 86400000;

    const items = [];

    allManuals.forEach(m => {
        if (!m.created_at) return;
        const d = new Date(m.created_at);
        d.setHours(0, 0, 0, 0);
        if (d >= today) {
            items.push({ type: 'event', title: m.title, date: d, label: m.genre, id: m.id });
        }
    });

    tasks.filter(t => !t.done).forEach(t => {
        const date = t.due_date
            ? (() => { const d = new Date(t.due_date); d.setHours(0, 0, 0, 0); return d; })()
            : null;
        items.push({ type: 'task', title: t.title, date, priority: t.priority, id: t.id });
    });

    const groups = [
        { key: 'today',    label: '今日',     cls: 'text-rose-500   bg-rose-50   border-rose-200',   items: [] },
        { key: 'tomorrow', label: '明日',     cls: 'text-orange-500 bg-orange-50 border-orange-200', items: [] },
        { key: 'week',     label: '今週',     cls: 'text-indigo-500 bg-indigo-50 border-indigo-200', items: [] },
        { key: 'later',    label: 'それ以降', cls: 'text-slate-500  bg-slate-50  border-slate-200',  items: [] },
        { key: 'none',     label: '期限なし', cls: 'text-slate-400  bg-slate-50  border-slate-100',  items: [] },
    ];

    items.forEach(item => {
        if (!item.date) { groups[4].items.push(item); return; }
        const diff = Math.round((item.date - today) / MS_DAY);
        if      (diff === 0) groups[0].items.push(item);
        else if (diff === 1) groups[1].items.push(item);
        else if (diff <= 6)  groups[2].items.push(item);
        else                 groups[3].items.push(item);
    });

    const priorityOrder = { high: 0, normal: 1, low: 2 };
    groups.forEach(g => {
        g.items.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'event' ? -1 : 1;
            return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        });
    });

    const filledGroups = groups.filter(g => g.items.length > 0);
    if (filledGroups.length === 0) {
        todoList.innerHTML = `<p class="text-center text-[10px] text-slate-300 font-bold py-6 uppercase tracking-widest">予定・タスクなし</p>`;
        return;
    }

    todoList.innerHTML = filledGroups.map(g => `
        <div class="mb-5">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-[9px] font-black px-2 py-0.5 rounded-full border ${g.cls}">${g.label}</span>
                <div class="flex-1 h-px bg-slate-100"></div>
            </div>
            <div class="space-y-1.5">
                ${g.items.map(renderTodoItem).join('')}
            </div>
        </div>
    `).join('');
}

function renderTodoItem(item) {
    if (item.type === 'event') {
        const mm = item.date.getMonth() + 1;
        const dd = item.date.getDate();
        return `
            <div class="todo-item todo-event" onclick="openDetail('${item.id}')">
                <span class="todo-icon">📅</span>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-slate-700 leading-snug">${escapeHtml(item.title)}</p>
                    <p class="text-[9px] text-indigo-400 font-black tracking-wide mt-0.5">${mm}/${dd} · ${escapeHtml(item.label)}</p>
                </div>
            </div>
        `;
    }
    const dotCls = { high: 'bg-rose-400', normal: 'bg-indigo-400', low: 'bg-emerald-400' }[item.priority] || 'bg-slate-300';
    return `
        <div class="todo-item todo-task">
            <span class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotCls}"></span>
            <p class="text-[11px] font-bold text-slate-700 leading-snug">${escapeHtml(item.title)}</p>
        </div>
    `;
}

// --- グローバル公開 ---
window.setTaskFilter = setTaskFilter;
window.switchTab = switchTab;

// --- 初期化時にタスクを取得 ---
fetchTasks();

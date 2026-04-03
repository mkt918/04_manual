/**
 * Manual Hub Frontend Logic (3-Column with Calendar)
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

// --- DOM ELEMENTS ---
let manualList, genreFilters, searchInput, resultsCount;
let welcomeView, manualView, contentRender, mainMeta;
let sidebar, toggleSidebar;
let calGrid, calMonthLabel, calPrev, calNext, calDayList;

function initElements() {
    manualList     = document.getElementById('manual-list');
    genreFilters   = document.getElementById('genre-filters');
    searchInput    = document.getElementById('search-input');
    resultsCount   = document.getElementById('results-count');

    welcomeView    = document.getElementById('welcome-view');
    manualView     = document.getElementById('manual-view');
    contentRender  = document.getElementById('content-render');
    mainMeta       = document.getElementById('main-meta');

    sidebar        = document.getElementById('sidebar');
    toggleSidebar  = document.getElementById('toggle-sidebar');

    calGrid        = document.getElementById('cal-grid');
    calMonthLabel  = document.getElementById('cal-month-label');
    calPrev        = document.getElementById('cal-prev');
    calNext        = document.getElementById('cal-next');
    calDayList     = document.getElementById('cal-day-list');
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    fetchManuals();

    // 検索イベント
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        selectedDate = null; // 日付選択をリセット
        renderManuals();
        renderCalendar();
    });

    // モバイルサイドバートグル
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
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

    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }

    welcomeView.classList.add('hidden');
    manualView.classList.remove('hidden');

    contentRender.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>';
    contentRender.classList.add('fade-in');

    mainMeta.innerHTML = `
        <span class="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-black rounded-lg uppercase tracking-[0.15em] border border-indigo-100/50">${manual.genre}</span>
        <span class="text-slate-400 text-[11px] font-bold uppercase tracking-widest self-center">${new Date(manual.created_at).toLocaleDateString('ja-JP')}</span>
    `;

    try {
        const response = await fetch(manual.path);
        const mdText = await response.text();
        contentRender.innerHTML = marked.parse(mdText);
    } catch (error) {
        contentRender.innerHTML = '<p class="text-red-500">ファイルの読み込みに失敗しました。</p>';
    }
}

// --- RENDERING ---

function renderManuals() {
    let filtered = allManuals;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(m => m.genre === currentFilter || (m.tags && m.tags.includes(currentFilter)));
    }

    if (selectedDate) {
        filtered = filtered.filter(m => {
            if (!m.created_at) return false;
            const d = new Date(m.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            return key === selectedDate;
        });
    } else if (searchQuery) {
        filtered = filtered.filter(m =>
            m.title.toLowerCase().includes(searchQuery) ||
            (m.tags && m.tags.toLowerCase().includes(searchQuery)) ||
            (m.genre && m.genre.toLowerCase().includes(searchQuery)) ||
            (m.content && m.content.toLowerCase().includes(searchQuery))
        );
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

    // 月ラベル
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
    const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=日
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();

    let cells = '';

    // 前月の埋めセル
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = daysInPrev - i;
        cells += `<div class="cal-cell other-month">${d}</div>`;
    }

    // 当月のセル
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

    // 後月の埋めセル
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        cells += `<div class="cal-cell other-month">${d}</div>`;
    }

    calGrid.innerHTML = cells;

    // 下部リスト：選択日 or 当月全マニュアル
    renderCalMonthList(manualDates);
}

function renderCalMonthList(manualDates) {
    const label = document.querySelector('#cal-day-manuals p');
    
    if (selectedDate && manualDates[selectedDate]) {
        // 選択された日のマニュアル
        const d = new Date(selectedDate);
        if (label) label.textContent = `${d.getMonth()+1}月${d.getDate()}日のマニュアル`;
        calDayList.innerHTML = manualDates[selectedDate].map(m => `
            <div class="cal-manual-card" onclick="openDetail('${m.id}')">
                <p class="text-[11px] font-bold text-indigo-700 leading-snug">${m.title}</p>
                <p class="text-[9px] text-indigo-400 font-black uppercase tracking-wider mt-0.5">${m.genre}</p>
            </div>
        `).join('');
    } else {
        // 当月のマニュアル一覧
        if (label) label.textContent = `この月のアーカイブ`;
        const monthManuals = allManuals.filter(m => {
            if (!m.created_at) return false;
            const d = new Date(m.created_at);
            return d.getFullYear() === calYear && d.getMonth() === calMonth;
        }).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

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

// --- HELPERS ---

function filterBy(genreOrTag) {
    if (window.event) window.event.stopPropagation();
    currentFilter = genreOrTag;
    selectedDate = null;
    renderManuals();
    renderFilters();
    renderCalendar();
}

function selectCalDate(dateKey) {
    if (selectedDate === dateKey) {
        // 同じ日を再クリックで解除
        selectedDate = null;
        searchInput.value = '';
        searchQuery = '';
    } else {
        selectedDate = dateKey;
        searchInput.value = '';
        searchQuery = '';
    }
    renderManuals();
    renderCalendar();
}

window.filterBy = filterBy;
window.openDetail = openDetail;
window.selectCalDate = selectCalDate;

// ============================================================
// タスク管理
// ============================================================

const TASKS_KEY = 'manual_hub_tasks';
let tasks = [];
let currentTaskPriority = 'normal';
let currentTaskFilter = 'all'; // 'all' | 'active' | 'done'

// --- タスクデータ読み込み ---
function loadTasks() {
    try {
        tasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
    } catch (_) {
        tasks = [];
    }
}

// --- タスクデータ保存 ---
function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// --- タスク追加 ---
function addTask() {
    const input = document.getElementById('task-input');
    const title = input.value.trim();
    if (!title) return;

    const task = {
        id: Date.now().toString(),
        title,
        done: false,
        priority: currentTaskPriority,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);
    saveTasks();
    input.value = '';
    renderTasks();
}

// --- タスク完了トグル ---
function toggleTask(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    saveTasks();
    renderTasks();
}

// --- タスク削除 ---
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

// --- 完了済み一括削除 ---
function clearDoneTasks() {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    renderTasks();
}

// --- 優先度設定 ---
function setTaskPriority(priority) {
    currentTaskPriority = priority;
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.className = 'priority-btn flex-1 text-[10px] font-black py-1.5 rounded-lg border-2 border-slate-200 text-slate-400 hover:border-slate-300 transition-all';
    });
    const colors = { low: 'border-emerald-400 text-emerald-600 bg-emerald-50', normal: 'border-indigo-400 text-indigo-600 bg-indigo-50', high: 'border-rose-400 text-rose-600 bg-rose-50' };
    const labels = { low: '低', normal: '中', high: '高' };
    document.querySelectorAll('.priority-btn').forEach(btn => {
        if (btn.textContent.trim() === labels[priority]) {
            btn.className = `priority-btn flex-1 text-[10px] font-black py-1.5 rounded-lg border-2 ${colors[priority]} transition-all`;
        }
    });
}

// --- フィルター変更 ---
function setTaskFilter(filter) {
    currentTaskFilter = filter;
    ['all', 'active', 'done'].forEach(f => {
        const btn = document.getElementById(`tf-${f}`);
        if (btn) btn.className = `task-filter-btn flex-1 text-[10px] font-black py-1.5 rounded-lg transition-all${f === filter ? ' active-filter' : ''}`;
    });
    renderTasks();
}

// --- タスク描画 ---
function renderTasks() {
    const list = document.getElementById('task-list');
    const progressLabel = document.getElementById('task-progress-label');
    const progressBar = document.getElementById('task-progress-bar');
    if (!list) return;

    // 進捗バー更新
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    progressLabel.textContent = `${done} / ${total}`;
    progressBar.style.width = total === 0 ? '0%' : `${Math.round(done / total * 100)}%`;

    // フィルター適用
    let filtered = tasks;
    if (currentTaskFilter === 'active') filtered = tasks.filter(t => !t.done);
    if (currentTaskFilter === 'done')   filtered = tasks.filter(t => t.done);

    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-center text-[10px] text-slate-300 font-bold py-6 uppercase tracking-widest">タスクなし</p>`;
        return;
    }

    // 優先度順（high > normal > low）+ 未完了を上
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
        const checkMark = t.done ? `<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>` : '';
        return `
            <div class="task-item ${priorityClass} ${doneClass}">
                <div class="task-check ${checkClass}" onclick="toggleTask('${t.id}')">${checkMark}</div>
                <span class="task-title ${textClass}">${escapeHtml(t.title)}</span>
                <button class="task-del-btn" onclick="deleteTask('${t.id}')">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        `;
    }).join('');
}

// --- XSS防止ユーティリティ ---
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// --- タブ切り替え ---
function switchTab(tab) {
    const calSection  = document.getElementById('section-calendar');
    const taskSection = document.getElementById('section-tasks');
    const calBtn      = document.getElementById('tab-cal-btn');
    const taskBtn     = document.getElementById('tab-task-btn');

    const active   = 'tab-btn tab-active flex-1 text-[11px] font-black py-2 rounded-lg transition-all';
    const inactive = 'tab-btn flex-1 text-[11px] font-black py-2 rounded-lg transition-all';

    if (tab === 'calendar') {
        calSection.classList.remove('hidden');
        taskSection.classList.add('hidden');
        calBtn.className = active;
        taskBtn.className = inactive;
    } else {
        calSection.classList.add('hidden');
        taskSection.classList.remove('hidden');
        calBtn.className = inactive;
        taskBtn.className = active;
        renderTasks();
    }
}

// --- グローバル公開 ---
window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.clearDoneTasks = clearDoneTasks;
window.setTaskPriority = setTaskPriority;
window.setTaskFilter = setTaskFilter;
window.switchTab = switchTab;

// --- 初期化時にタスクを読み込み ---
loadTasks();

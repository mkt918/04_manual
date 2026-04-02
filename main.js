/**
 * Manual Hub Frontend Logic (2-Column Revision)
 */

// --- STATE ---
let allManuals = [];
let currentFilter = 'all';
let searchQuery = '';
let activeId = null;

// --- DOM ELEMENTS ---
let manualList, genreFilters, searchInput, resultsCount;
let welcomeView, manualView, contentRender, mainMeta;
let sidebar, toggleSidebar;

function initElements() {
    manualList = document.getElementById('manual-list');
    genreFilters = document.getElementById('genre-filters');
    searchInput = document.getElementById('search-input');
    resultsCount = document.getElementById('results-count');
    
    welcomeView = document.getElementById('welcome-view');
    manualView = document.getElementById('manual-view');
    contentRender = document.getElementById('content-render');
    mainMeta = document.getElementById('main-meta');
    
    sidebar = document.getElementById('sidebar');
    toggleSidebar = document.getElementById('toggle-sidebar');
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    fetchManuals();
    
    // Search Event
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderManuals();
    });

    // Mobile Toggle
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Marked.js Configuration
    marked.setOptions({
        breaks: true,
        gfm: true
    });
});

// --- API FUNCTIONS ---

async function fetchManuals() {
    try {
        const response = await fetch('manuals.json');
        allManuals = await response.json();
        
        renderFilters();
        renderManuals();
    } catch (error) {
        console.error('Fetch error:', error);
        manualList.innerHTML = '<p class="text-xs text-red-500 py-10 font-bold">Failed to load manuals.</p>';
    }
}

async function openDetail(id) {
    const manual = allManuals.find(m => m.id === id);
    if (!manual) return;

    activeId = id;
    renderManuals(); // Refresh list to show active state

    // Close mobile sidebar if open
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }

    // Switch views
    welcomeView.classList.add('hidden');
    manualView.classList.remove('hidden');
    
    contentRender.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>';
    contentRender.classList.add('fade-in');
    
    mainMeta.innerHTML = `
        <span class="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-black rounded-lg uppercase tracking-[0.15em] border border-indigo-100/50">${manual.genre}</span>
        <span class="text-slate-400 text-[11px] font-bold uppercase tracking-widest self-center">${new Date(manual.created_at).toLocaleDateString()}</span>
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

    if (searchQuery) {
        filtered = filtered.filter(m => 
            m.title.toLowerCase().includes(searchQuery) || 
            (m.tags && m.tags.toLowerCase().includes(searchQuery)) ||
            (m.genre && m.genre.toLowerCase().includes(searchQuery))
        );
    }

    filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    resultsCount.textContent = filtered.length;

    if (filtered.length === 0) {
        manualList.innerHTML = `
            <div class="py-10 text-center animate-fade-in">
                <p class="text-slate-300 text-xs font-bold uppercase tracking-widest">No results</p>
            </div>
        `;
        return;
    }

    manualList.innerHTML = filtered.map((manual, index) => `
        <div class="manual-list-item ${activeId === manual.id ? 'active' : ''}" 
             onclick="openDetail('${manual.id}')">
            <h4 class="text-sm font-bold mb-1 leading-tight transition-colors">${manual.title}</h4>
            <div class="flex items-center gap-2 opacity-60">
                <span class="text-[9px] font-black uppercase tracking-widest text-indigo-500">${manual.genre}</span>
                <span class="text-[9px] font-bold text-slate-400">•</span>
                <span class="text-[9px] font-bold text-slate-400">${new Date(manual.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

function renderFilters() {
    const genres = ['all', ...new Set(allManuals.map(m => m.genre).filter(g => g))];
    genreFilters.innerHTML = genres.map(g => `
        <button onclick="filterBy('${g}')" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${currentFilter === g ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}">
            ${g === 'all' ? 'All' : g}
        </button>
    `).join('');
}

// --- HELPERS ---

function filterBy(genreOrTag) {
    if (window.event) window.event.stopPropagation();
    currentFilter = genreOrTag;
    renderManuals();
    renderFilters();
}

window.filterBy = filterBy;
window.openDetail = openDetail;

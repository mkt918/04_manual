/**
 * Manual Hub Frontend Logic (Static Version)
 */

// --- STATE ---
let allManuals = [];
let currentFilter = 'all';
let searchQuery = '';

// --- DOM ELEMENTS ---
const manualGrid = document.getElementById('manual-grid');
const genreFilters = document.getElementById('genre-filters');
const searchInput = document.getElementById('search-input');
const resultsCount = document.getElementById('results-count');
const detailModal = document.getElementById('detail-modal');
const modalContent = document.getElementById('modal-content');
const modalMeta = document.getElementById('modal-meta');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    fetchManuals();
    
    // Search Event
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderManuals();
    });

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
        
        // Fetch first lines of each markdown for search index (optional but good for search)
        // For now we assume manuals.json has title and tags which are enough for simple search
        
        renderFilters();
        renderManuals();
    } catch (error) {
        console.error('Fetch error:', error);
        manualGrid.innerHTML = '<p class="col-span-full text-center text-red-500 py-20 font-bold">データの取得に失敗しました。</p>';
    }
}

async function openDetail(id) {
    const manual = allManuals.find(m => m.id === id);
    if (!manual) return;

    modalContent.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>';
    modalMeta.innerHTML = `
        <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-100/50">${manual.genre}</span>
        <span class="text-slate-400 text-[10px] font-bold uppercase tracking-tighter self-center">${new Date(manual.created_at).toLocaleDateString()}</span>
    `;
    detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(manual.path);
        const mdText = await response.text();
        modalContent.innerHTML = marked.parse(mdText);
    } catch (error) {
        modalContent.innerHTML = '<p class="text-red-500">ファイルの読み込みに失敗しました。</p>';
    }
}

function closeDetail() {
    detailModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
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
    resultsCount.textContent = `${filtered.length} Manuals`;

    if (filtered.length === 0) {
        manualGrid.innerHTML = `
            <div class="col-span-full py-20 text-center animate-fade-in">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-slate-300">!</div>
                <p class="text-slate-400 font-bold tracking-tight">該当するマニュアルが見つかりませんでした。</p>
            </div>
        `;
        return;
    }

    manualGrid.innerHTML = filtered.map((manual, index) => `
        <div class="manual-card group bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 fade-in cursor-pointer border-t-4 hover:border-t-indigo-500" 
             style="animation-delay: ${index * 0.05}s"
             onclick="openDetail('${manual.id}')">
            <div class="flex justify-between items-center mb-6">
                <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-100/50">${manual.genre || '未分類'}</span>
                <span class="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">${new Date(manual.created_at).toLocaleDateString()}</span>
            </div>
            <h4 class="text-2xl font-black mb-4 text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">${manual.title}</h4>
            <div class="flex flex-wrap gap-2 mt-auto">
                ${(manual.tags || '').split(',').filter(t => t.trim()).map(tag => `
                    <span class="px-3 py-1.5 bg-slate-50 text-slate-400 text-[10px] font-bold rounded-full ring-1 ring-inset ring-slate-200/50 hover:text-indigo-600 transition-colors">#${tag.trim()}</span>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function renderFilters() {
    const genres = ['all', ...new Set(allManuals.map(m => m.genre).filter(g => g))];
    genreFilters.innerHTML = genres.map(g => `
        <button onclick="filterBy('${g}')" class="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all duration-300 ${currentFilter === g ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300 hover:text-indigo-500'}">
            ${g === 'all' ? 'All Archives' : g}
        </button>
    `).join('');
}

// --- HELPERS ---

function filterBy(genreOrTag) {
    if (event) event.stopPropagation(); // Prevent modal from opening if tag is clicked inside card
    currentFilter = genreOrTag;
    renderManuals();
    renderFilters();
    document.getElementById('list').scrollIntoView({ behavior: 'smooth' });
}

window.filterBy = filterBy;
window.openDetail = openDetail;
window.closeDetail = closeDetail;

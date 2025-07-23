// script.js - Letras de Músicas com sincronização GitHub

// === CONFIGURAÇÃO (ALTERE PARA SEU REPOSITÓRIO) ===
const GITHUB_REPO = 'marcilioapd/SiteHinos'; // Ex: 'joao/hinos-app'
const GITHUB_FILE = 'data.json';
const GITHUB_TOKEN = ''; // 🔐 Deixe vazio ou adicione seu token (não envie público!)

// === Elementos ===
const musicForm = document.getElementById('musicForm');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const paginationContainer = document.getElementById('pagination');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const themeToggle = document.getElementById('themeToggle');

// === Dados ===
let musicList = [];
let filteredList = [];
let currentPage = 1;
let worker = null;

// ================== Modo Escuro ==================
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});

// ================== Web Worker com Fallback ==================
try {
  if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
    worker = new Worker('worker.js');
    worker.onmessage = e => {
      filteredList = e.data;
      currentPage = 1;
      renderResults();
      renderPagination();
    };
    worker.onerror = () => { worker = null; };
  }
} catch (e) {
  worker = null;
}

// ================== Fallback de Busca ==================
function handleSearchFallback() {
  const q = (searchInput.value || '').trim().toLowerCase();
  filteredList = !q ? [...musicList] : musicList.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.artist.toLowerCase().includes(q) ||
    m.lyrics.toLowerCase().includes(q)
  );
  currentPage = 1;
  renderResults();
  renderPagination();
}

let debounceTimer;
function handleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (worker) worker.postMessage({ musicList, query: searchInput.value.trim() });
    else handleSearchFallback();
  }, 300);
}

// ================== Renderização ==================
function renderResults() {
  resultsContainer.innerHTML = '';
  const start = (currentPage - 1) * 10;
  const end = start + 10;
  const pageItems = filteredList.slice(start, end);

  if (pageItems.length === 0) {
    resultsContainer.innerHTML = '<p>Nenhuma música encontrada.</p>';
    paginationContainer.innerHTML = '';
    return;
  }

  pageItems.forEach((m, i) => {
    const item = document.createElement('div');
    item.className = 'music-item';
    const hl = searchInput.value.trim() ? (txt => txt.replace(new RegExp(`(${searchInput.value})`, 'gi'), '<mark>$1</mark>')) : (txt => txt);
    
    item.innerHTML = `
      <h3>${hl(m.title)}</h3>
      <p><strong>Autor:</strong> ${hl(m.artist)}</p>
      <div class="lyrics-content" id="lyrics-${i}">${hl(m.lyrics)}</div>
    `;
    
    item.addEventListener('click', () => {
      const div = document.getElementById(`lyrics-${i}`);
      div.style.display = div.style.display === 'block' ? 'none' : 'block';
    });
    
    resultsContainer.appendChild(item);
  });
}

function renderPagination() {
  paginationContainer.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(filteredList.length / 10));
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = i; renderResults(); renderPagination(); });
    paginationContainer.appendChild(btn);
  }
}

// ================== Carregar do GitHub ==================
async function loadFromGitHub() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.content) {
      musicList = JSON.parse(atob(data.content));
      saveLocal(musicList);
      handleSearch();
    }
  } catch (err) {
    console.warn('GitHub falhou. Usando cache local.');
    musicList = JSON.parse(localStorage.getItem('music_lyrics_db')) || [];
    handleSearch();
  }
}

// ================== Salvar no GitHub ==================
async function saveToGitHub(newList) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
  try {
    const info = await fetch(url).then(r => r.json());
    const content = btoa(JSON.stringify(newList, null, 2));
    const commit = {
      message: `Atualizado via app em ${new Date().toISOString()}`,
      content,
      sha: info.sha
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commit)
    });

    if (response.ok) {
      saveLocal(newList);
    } else {
      const err = await response.json();
      console.error('Erro GitHub:', err);
      saveLocal(newList);
      alert('Salvo localmente. Erro no GitHub (token?).');
    }
  } catch (err) {
    console.error('Erro ao salvar no GitHub:', err);
    saveLocal(newList);
    alert('Erro de rede. Salvo localmente.');
  }
}

// ================== Funções auxiliares ==================
function saveLocal(list) {
  try {
    localStorage.setItem('music_lyrics_db', JSON.stringify(list));
  } catch (e) { console.error('localStorage cheio'); }
}

// ================== Cadastro ==================
musicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const artist = document.getElementById('artist').value.trim();
  const lyrics = document.getElementById('lyrics').value.trim();

  if (title && artist && lyrics) {
    const newMusic = { title, artist, lyrics };
    musicList.push(newMusic);

    if (GITHUB_TOKEN) {
      await saveToGitHub(musicList);
    } else {
      saveLocal(musicList);
      alert('Música salva localmente. Configure o token para sincronizar.');
    }

    musicForm.reset();
    handleSearch();
  }
});

// ================== Backup Manual ==================
exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(musicList, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hinos-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported)) {
        musicList = imported;
        saveLocal(musicList);
        if (GITHUB_TOKEN) saveToGitHub(musicList);
        else handleSearch();
        alert(`Importado: ${imported.length} músicas.`);
      }
    } catch (err) {
      alert('Erro ao ler JSON.');
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

// ================== Inicialização ==================
loadFromGitHub();
searchInput.addEventListener('input', handleSearch);

// script.js - Aplicativo de Letras de Músicas (Corrigido para GitHub Pages)

const STORAGE_KEY = 'music_lyrics_db';
const PAGE_SIZE = 10;

// Elementos do DOM
const musicForm = document.getElementById('musicForm');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const paginationContainer = document.getElementById('pagination');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const themeToggle = document.getElementById('themeToggle');

// Dados
let musicList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let filteredList = [...musicList];
let currentPage = 1;
let worker = null;

// =============== Modo Escuro ===============
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
});

// =============== Web Worker com Fallback ===============
try {
  // Só cria worker em ambientes seguros (HTTPS ou localhost)
  if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
      filteredList = e.data;
      currentPage = 1;
      renderResults();
      renderPagination();
    };

    worker.onerror = function() {
      console.warn('Web Worker falhou. Usando busca no thread principal.');
      worker = null;
    };
  }
} catch (e) {
  console.warn('Worker não disponível:', e);
  worker = null;
}

// =============== Fallback: Busca no thread principal ===============
function handleSearchFallback() {
  const query = (searchInput.value || '').trim().toLowerCase();
  if (!query) {
    filteredList = [...musicList];
  } else {
    filteredList = musicList.filter(music =>
      music.title.toLowerCase().includes(query) ||
      music.artist.toLowerCase().includes(query) ||
      music.lyrics.toLowerCase().includes(query)
    );
  }
  currentPage = 1;
  renderResults();
  renderPagination();
}

// =============== Debounce na busca ===============
let debounceTimer;
function handleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (worker) {
      worker.postMessage({ musicList, query: searchInput.value.trim() });
    } else {
      handleSearchFallback();
    }
  }, 300);
}

// =============== Renderização ===============
function renderResults() {
  resultsContainer.innerHTML = '';
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredList.slice(start, end);

  if (pageItems.length === 0) {
    resultsContainer.innerHTML = '<p>Nenhuma música encontrada.</p>';
    paginationContainer.innerHTML = '';
    return;
  }

  pageItems.forEach((music, index) => {
    const item = document.createElement('div');
    item.className = 'music-item';

    let highlightedLyrics = music.lyrics;
    const query = searchInput.value.trim();
    if (query) {
      const regex = new RegExp(`(${query})`, 'gi');
      highlightedLyrics = music.lyrics.replace(regex, '<mark>$1</mark>');
    }

    item.innerHTML = `
      <h3>${highlightText(music.title, query)}</h3>
      <p><strong>Autor:</strong> ${highlightText(music.artist, query)}</p>
      <div class="lyrics-content" id="lyrics-${index}">${highlightedLyrics}</div>
    `;

    item.addEventListener('click', () => {
      const div = document.getElementById(`lyrics-${index}`);
      div.style.display = div.style.display === 'block' ? 'none' : 'block';
    });

    resultsContainer.appendChild(item);
  });
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function renderPagination() {
  paginationContainer.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentPage = i;
      renderResults();
      renderPagination();
    });
    paginationContainer.appendChild(btn);
  }
}

// =============== Cadastro de Música ===============
musicForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const artist = document.getElementById('artist').value.trim();
  const lyrics = document.getElementById('lyrics').value.trim();

  if (title && artist && lyrics) {
    musicList.push({ title, artist, lyrics });
    saveToStorage();
    musicForm.reset();
    handleSearch(); // Atualiza lista
    alert('Música adicionada com sucesso!');
  }
});

// =============== Backup: Exportar / Importar ===============
exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(musicList, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `musicas-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        musicList = imported;
        saveToStorage();
        handleSearch();
        alert(`Backup importado: ${imported.length} músicas.`);
      } else {
        alert('Formato inválido. Deve ser um array de músicas.');
      }
    } catch (err) {
      alert('Erro ao ler o arquivo. Verifique se é um JSON válido.');
    }
  };
  reader.readAsText(file);
  importFile.value = ''; // Limpa input
});

// =============== Funções de Persistência ===============
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(musicList));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
    alert('Armazenamento cheio. Limpe dados ou use outro navegador.');
  }
}

// =============== Inicialização ===============
searchInput.addEventListener('input', handleSearch);
handleSearch(); // Carrega lista inicial

const STORAGE_KEY = 'music_lyrics_db';
const PAGE_SIZE = 10;

const musicForm = document.getElementById('musicForm');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const paginationContainer = document.getElementById('pagination');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const themeToggle = document.getElementById('themeToggle');

let musicList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let filteredList = [...musicList];
let currentPage = 1;

// Inicializa o Web Worker
const worker = new Worker('worker.js');

// Web Worker: recebe resultados
worker.onmessage = function(e) {
  filteredList = e.data;
  currentPage = 1;
  renderResults();
  renderPagination();
};

// Função para salvar
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(musicList));
  } catch (e) {
    console.error('Erro ao salvar:', e);
    alert('Erro ao salvar. Limite do localStorage atingido.');
  }
}

// Renderiza resultados com paginação
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

    // Destaque na letra se houver busca
    let highlightedLyrics = music.lyrics;
    if (searchInput.value.trim()) {
      const regex = new RegExp(`(${searchInput.value})`, 'gi');
      highlightedLyrics = music.lyrics.replace(regex, '<mark>$1</mark>');
    }

    item.innerHTML = `
      <h3>${highlightText(music.title, searchInput.value)}</h3>
      <p><strong>Autor:</strong> ${highlightText(music.artist, searchInput.value)}</p>
      <div class="lyrics-content" id="lyrics-${index}">${highlightedLyrics}</div>
    `;

    item.addEventListener('click', () => {
      const lyricsDiv = document.getElementById(`lyrics-${index}`);
      lyricsDiv.style.display = lyricsDiv.style.display === 'block' ? 'none' : 'block';
    });

    resultsContainer.appendChild(item);
  });
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Paginação
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

// Debounce para busca
let debounceTimer;
function handleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const query = searchInput.value.trim();
    worker.postMessage({ musicList, query }); // Envia para o worker
  }, 300);
}

// Adicionar música
musicForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const artist = document.getElementById('artist').value.trim();
  const lyrics = document.getElementById('lyrics').value.trim();

  if (title && artist && lyrics) {
    musicList.push({ title, artist, lyrics });
    saveToStorage();
    musicForm.reset();
    handleSearch(); // Atualiza busca
    alert('Música adicionada!');
  }
});

// Exportar backup
exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(musicList, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-musicas-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

// Importar backup
importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        musicList = imported;
        saveToStorage();
        handleSearch(); // Atualiza
        alert(`Backup importado com sucesso: ${imported.length} músicas.`);
      } else {
        alert('Arquivo inválido.');
      }
    } catch (err) {
      alert('Erro ao ler o arquivo. Certifique-se de que é um JSON válido.');
    }
  };
  reader.readAsText(file);
  importFile.value = ''; // Reset
});

// Modo escuro
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});

// Carrega modo escuro ao iniciar
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}

// Inicialização
searchInput.addEventListener('input', handleSearch);
handleSearch(); // Carrega tudo inicialmente
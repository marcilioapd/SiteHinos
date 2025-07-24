// script.js - Letras de Músicas com Firebase

const musicForm = document.getElementById('musicForm');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const paginationContainer = document.getElementById('pagination');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const themeToggle = document.getElementById('themeToggle');

let musicList = [];
let filteredList = [];
let currentPage = 1;
let worker = null;
let firstSync = true;

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
  }
} catch (e) {
  worker = null;
}

// ================== Renderização com Botão de Editar ==================
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

  pageItems.forEach((music, index) => {
    const item = document.createElement('div');
    item.className = 'music-item';

    const query = searchInput.value.trim();
    const hl = (text) => {
      if (!query) return text;
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    // ✅ SEM "Autor:", apenas o nome em negrito
    item.innerHTML = `
      <h3>${hl(music.title)}</h3>
      <p><strong>${hl(music.artist)}</strong></p>
      <div class="lyrics-content" id="lyrics-${index}">${hl(music.lyrics)}</div>
      <div class="music-actions">
        <button class="edit-btn" data-index="${musicList.indexOf(music)}">✏️ Editar</button>
      </div>
    `;

    // Alternar exibição da letra
    const lyricsDiv = document.getElementById(`lyrics-${index}`);
    if (lyricsDiv) {
      lyricsDiv.style.display = 'none';
    }

    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('edit-btn')) {
        const div = document.getElementById(`lyrics-${index}`);
        if (div) {
          div.style.display = div.style.display === 'block' ? 'none' : 'block';
        }
      }
    });

    resultsContainer.appendChild(item);
  });

  // Adiciona eventos aos botões de editar
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita abrir/fechar a letra
      const index = parseInt(e.target.dataset.index);
      openEditModal(musicList[index], index);
    });
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
    btn.addEventListener('click', () => {
      currentPage = i;
      renderResults();
      renderPagination();
    });
    paginationContainer.appendChild(btn);
  }
}

// ================== Debounce na busca ==================
let debounceTimer;
function handleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (worker) {
      worker.postMessage({ musicList, query: searchInput.value.trim() });
    } else {
      const q = (searchInput.value || '').toLowerCase().trim();
      filteredList = !q ? [...musicList] : musicList.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.artist.toLowerCase().includes(q) ||
        m.lyrics.toLowerCase().includes(q)
      );
      currentPage = 1;
      renderResults();
      renderPagination();
    }
  }, 300);
}

// ================== Editar Música ==================
function openEditModal(music, index) {
  const title = prompt('Nome da música:', music.title);
  if (title === null) return;

  const artist = prompt('Autor:', music.artist);
  if (artist === null) return;

  const lyrics = prompt('Letra da música:', music.lyrics);
  if (lyrics === null) return;

  musicList[index] = { title, artist, lyrics };
  saveToFirebase(musicList);
  alert('Música atualizada com sucesso!');
}

// ================== Firebase ==================
musicRef.on('value', (snapshot) => {
  const data = snapshot.val();
  musicList = data ? Object.values(data) : [];
  
  if (firstSync) {
    console.log('✅ Dados carregados do Firebase');
    firstSync = false;
    saveToLocalStorage(musicList);
  }
  handleSearch();
});

function saveToFirebase(newList) {
  const obj = {};
  newList.forEach((item, idx) => {
    obj[`item_${idx}`] = item;
  });

  musicRef.set(obj)
    .then(() => {
      console.log('✅ Salvo no Firebase');
      saveToLocalStorage(newList);
    })
    .catch(err => {
      console.error('Erro Firebase:', err);
      alert('Erro ao salvar. Verifique a conexão.');
      saveToLocalStorage(newList);
    });
}

function saveToLocalStorage(list) {
  try {
    localStorage.setItem('music_lyrics_db', JSON.stringify(list));
  } catch (e) {
    console.error('localStorage cheio');
  }
}

// ================== Cadastro ==================
musicForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const artist = document.getElementById('artist').value.trim();
  const lyrics = document.getElementById('lyrics').value.trim();

  if (title && artist && lyrics) {
    musicList.push({ title, artist, lyrics });
    saveToFirebase(musicList);
    musicForm.reset();
    alert('Música adicionada e sincronizada!');
  }
});

// ================== Backup ==================
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

importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        musicList = imported;
        saveToFirebase(musicList);
        alert(`Importado: ${imported.length} músicas.`);
      }
    } catch (err) {
      alert('Erro ao ler o arquivo.');
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

// ================== Inicialização ==================
saveToLocalStorage(musicList); // Atualiza cache
searchInput.addEventListener('input', handleSearch);

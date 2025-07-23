// worker.js - Roda em background, sem travar a UI

self.onmessage = function(e) {
  const { musicList, query } = e.data;

  if (!query || query.trim() === '') {
    self.postMessage(musicList);
    return;
  }

  const q = query.toLowerCase();

  const results = musicList.filter(music =>
    music.title.toLowerCase().includes(q) ||
    music.artist.toLowerCase().includes(q) ||
    music.lyrics.toLowerCase().includes(q)
  );

  self.postMessage(results);
};
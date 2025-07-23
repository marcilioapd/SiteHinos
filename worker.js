// worker.js
self.onmessage = function(e) {
  const { musicList, query } = e.data;
  const q = (query || '').toLowerCase().trim();
  if (!q) self.postMessage(musicList);
  else {
    const results = musicList.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.artist.toLowerCase().includes(q) ||
      m.lyrics.toLowerCase().includes(q)
    );
    self.postMessage(results);
  }
};

self.onmessage = function(e) {
  const { musicList, query } = e.data;
  const q = (query || '').toLowerCase().trim();

  if (!q) {
    self.postMessage(musicList);
    return;
  }

  const results = musicList.filter(music =>
    music.title.toLowerCase().includes(q) ||
    music.artist.toLowerCase().includes(q) ||
    music.lyrics.toLowerCase().includes(q)
  );

  self.postMessage(results);
};

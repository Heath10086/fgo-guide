// Optional JP names only. Combat data continues to come from NA.
let namesPromise;
export function getJapaneseNames() {
  if (!namesPromise) {
    namesPromise = fetch('/api/japanese-names', {
      signal: AbortSignal.timeout(20000)
    }).then(async response => {
      if (!response.ok) throw new Error(`Japanese names: ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid Japanese character list');
      return new Map(rows.map(s => [String(s.id), s.originalName || s.name]));
    }).catch(error => { namesPromise = undefined; throw error; });
  }
  return namesPromise;
}

export function japaneseLabel(servant) {
  const label = document.createElement('p');
  label.className = 'japanese-name';
  label.lang = 'ja';
  label.dataset.jpId = String(servant.id);
  label.hidden = true;
  return label;
}

export async function fillJapaneseNames(root = document) {
  try {
    const names = await getJapaneseNames();
    root.querySelectorAll('[data-jp-id]').forEach(label => {
      const name = names.get(label.dataset.jpId);
      if (name) { label.textContent = name; label.hidden = false; }
    });
  } catch (error) {
    // Japanese is supplementary: English search and profiles remain usable.
    console.warn('Japanese names unavailable; keeping English names.', error);
  }
}

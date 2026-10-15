// Data access only. Page and search interactions live in separate modules.
const BASE_URL = "/api";
const detailCache = new Map();
let listPromise;

async function readJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (url === `${BASE_URL}/servants` && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
        && (response.status === 404 || response.headers.get('content-type')?.includes('text/html'))) {
      const error = new Error('Local API not connected. Run npm start in VS Code to start Vercel local preview, then open http://localhost:3000. Go Live alone cannot run the backend functions.');
      error.code = 'LOCAL_API_MISSING';
      throw error;
    }
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export function getServantList() {
  if (!listPromise) {
    listPromise = readJSON(`${BASE_URL}/servants`)
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Expected a character list.");
        return data.filter(s => s.collectionNo > 0 && ["normal", "heroine"].includes(s.type));
      }).catch(error => { listPromise = undefined; throw error; });
  }
  return listPromise;
}

export async function getServant(id) {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw new Error("Invalid character number.");
  if (!detailCache.has(String(id))) {
    const request = readJSON(`${BASE_URL}/servant?id=${encodeURIComponent(id)}`).then(data => {
      if (!data || typeof data.name !== "string") throw new Error("Invalid character response.");
      return data;
    }).catch(error => { detailCache.delete(String(id)); throw error; });
    detailCache.set(String(id), request);
  }
  return detailCache.get(String(id));
}


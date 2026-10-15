// BACKEND: Vercel runs this file; it is not sent to the browser.
// One function serves the list, character details and Japanese names.
// Atlas Academy requires no key. Future secrets belong in server environment
// variables, never in public/ or in the JSON returned from this function.
const ATLAS = 'https://api.atlasacademy.io';
const SUCCESS_CACHE = 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300';

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// fetchImpl can be replaced by a fake response in tests (no real API needed).
export function createHandler(fetchImpl = fetch) {
  return async function atlas(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    function reply(status, data) {
      res.statusCode = status;
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data));
    }
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        throw new ApiError(405, 'Method not allowed.');
      }
      // Vercel rewrites add resource to req.query. Reject duplicate values.
      const params = new URL(req.url, 'http://localhost').searchParams;
      const query = req.query || Object.fromEntries([...params.keys()].map(key =>
        [key, params.getAll(key).length === 1 ? params.get(key) : params.getAll(key)]));
      const resource = query.resource;
      let path;
      if (resource === 'servants') path = '/export/NA/basic_servant.json';
      else if (resource === 'japanese-names') path = '/export/JP/basic_servant.json';
      else if (resource === 'servant') {
        if (typeof query.id !== 'string' || !/^[1-9]\d{0,9}$/.test(query.id)) {
          throw new ApiError(400, 'Provide a positive character id, for example ?id=1.');
        }
        path = `/nice/NA/servant/${query.id}`;
      } else throw new ApiError(404, 'Unknown API endpoint.');

      // Fixed host and allowlisted paths: this is not an arbitrary URL proxy.
      const upstream = await fetchImpl(`${ATLAS}${path}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      if (upstream.status === 404) throw new ApiError(404, 'Character not found.');
      if (!upstream.ok) throw new ApiError(502, 'Character data service is unavailable. Please retry.');
      let data = await upstream.json();
      if (resource === 'servant') {
        if (!data || typeof data.name !== 'string') throw new ApiError(502, 'Invalid character response.');
      } else {
        if (!Array.isArray(data)) throw new ApiError(502, 'Invalid character list.');
        data = resource === 'servants'
          ? data.filter(s => s && s.collectionNo > 0 && ['normal', 'heroine'].includes(s.type))
          : data.filter(s => s && s.id && typeof (s.originalName || s.name) === 'string')
            .map(s => ({ id: s.id, name: s.originalName || s.name }));
      }
      res.setHeader('Cache-Control', SUCCESS_CACHE);
      reply(200, data);
    } catch (error) {
      res.setHeader('Cache-Control', 'no-store');
      if (error instanceof ApiError) reply(error.status, { error: error.message });
      else if (['TimeoutError', 'AbortError'].includes(error.name)) reply(504, { error: 'Character data service timed out. Please retry.' });
      else reply(502, { error: 'Could not load character data. Please retry.' });
    }
  };
}

export default createHandler();

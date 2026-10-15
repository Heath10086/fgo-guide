// Built-in Node test runner; no Express or testing library is installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHandler } from '../api/atlas.js';

async function request(fetchImpl, query, method = 'GET') {
  const headers = {};
  let body;
  const res = { statusCode: 200, setHeader: (k, v) => { headers[k] = v; }, end: value => { body = value; } };
  await createHandler(fetchImpl)({ method, url: '/api/atlas', query }, res);
  return { status: res.statusCode, headers, body: body ? JSON.parse(body) : undefined };
}
const unexpectedFetch = () => { throw new Error('Must not request Atlas for invalid input'); };

test('three public paths map to one backend; static output is only public/', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url)));
  assert.equal(config.outputDirectory, 'public');
  assert.equal(config.framework, null);
  assert.deepEqual(config.rewrites, ['servants', 'servant', 'japanese-names'].map(name => ({
    source: `/api/${name}`, destination: `/api/atlas?resource=${name}`
  })));
});

test('list removes enemy-only records; JP returns only id and name', async () => {
  const calls = [];
  const mock = async url => { calls.push(url); return Response.json([
    { id: 100100, collectionNo: 2, type: 'normal', name: 'Altria', originalName: 'アルトリア', extra: 'unused' },
    { id: 9, collectionNo: 0, type: 'enemy', name: 'Enemy' }, null
  ]); };
  const list = await request(mock, { resource: 'servants' });
  assert.equal(list.status, 200); assert.equal(list.body.length, 1);
  assert.match(list.headers['Cache-Control'], /s-maxage=3600/);
  const jp = await request(mock, { resource: 'japanese-names' });
  assert.deepEqual(jp.body, [{ id: 100100, name: 'アルトリア' }, { id: 9, name: 'Enemy' }]);
  assert.deepEqual(calls, ['https://api.atlasacademy.io/export/NA/basic_servant.json', 'https://api.atlasacademy.io/export/JP/basic_servant.json']);
});

test('details accept collection number and internal ID, with a fixed upstream host', async () => {
  for (const id of ['1', '800100']) {
    const result = await request(async (url, options) => {
      assert.equal(url, `https://api.atlasacademy.io/nice/NA/servant/${id}`);
      assert.ok(options.signal); return Response.json({ name: 'Mash' });
    }, { resource: 'servant', id });
    assert.equal(result.status, 200); assert.equal(result.body.name, 'Mash');
  }
});

test('invalid IDs, duplicate parameters, unknown resources and writes are rejected', async () => {
  for (const id of [undefined, '0', '-1', 'abc', ['1', '2'], '1.5', 'https://example.com', '1/../2', '12345678901']) {
    const result = await request(unexpectedFetch, { resource: 'servant', id });
    assert.equal(result.status, 400); assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  for (const resource of [undefined, '', 'unknown', ['servants', 'servant'], 'https://example.com']) {
    assert.equal((await request(unexpectedFetch, { resource })).status, 404);
  }
  const post = await request(unexpectedFetch, { resource: 'servants' }, 'POST');
  assert.equal(post.status, 405); assert.equal(post.headers.Allow, 'GET, HEAD');
});

test('failures have safe messages and no cache; no upstream internals are exposed', async () => {
  for (const [mock, expected] of [
    [async () => new Response('', { status: 404 }), 404],
    [async () => new Response('private secret', { status: 500 }), 502],
    [async () => { throw new DOMException('private secret', 'TimeoutError'); }, 504],
    [async () => { throw new Error('private secret'); }, 502],
    [async () => new Response('invalid JSON'), 502],
    [async () => Response.json({}), 502]
  ]) {
    const result = await request(mock, { resource: 'servant', id: '1' });
    assert.equal(result.status, expected); assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(typeof result.body.error, 'string'); assert.ok(!result.body.error.includes('private'));
  }
  for (const resource of ['servants', 'japanese-names']) {
    assert.equal((await request(async () => Response.json({}), { resource })).status, 502);
  }
});

test('HEAD responses have no body', async () => {
  const result = await request(async () => Response.json({ name: 'Mash' }), { resource: 'servant', id: '1' }, 'HEAD');
  assert.equal(result.status, 200); assert.equal(result.body, undefined);
});

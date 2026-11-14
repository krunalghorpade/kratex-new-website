import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createSiteServer } from '../server.mjs';

test('serves every public route, video ranges, and protects project files', async t => {
  const server = createSiteServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const route of [
    '/',
    '/about/',
    '/house-music-dj-india/',
    '/faktahouse/orkut/',
    '/settings.json',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/assets/grain.svg'
  ]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    await response.arrayBuffer();
  }
  for (const route of ['/about', '/house-music-dj-india', '/faktahouse/orkut']) {
    const response = await fetch(origin + route, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), route + '/');
  }
  for (const route of ['/.git/config', '/server.mjs', '/package.json', '/node_modules/jsdom/package.json', '/assets/%2e%2e%2f.git/config', '/missing']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 404, route);
  }
  const sitemap = await fetch(origin + '/sitemap.xml');
  assert.match(sitemap.headers.get('content-type'), /^application\/xml/);
  assert.match(await sitemap.text(), /house-music-dj-india/);
  const llms = await fetch(origin + '/llms.txt');
  assert.match(llms.headers.get('content-type'), /^text\/plain/);
  assert.match(await llms.text(), /Indian house music DJ/);
  const range = await fetch(origin + '/assets/video/video.mp4', { headers: { Range: 'bytes=0-127' } });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 128);
  assert.match(range.headers.get('content-range'), /^bytes 0-127\/\d+$/);
  const suffix = await fetch(origin + '/assets/video/video.mp4', { headers: { Range: 'bytes=-64' } });
  assert.equal(suffix.status, 206);
  assert.equal((await suffix.arrayBuffer()).byteLength, 64);
  const invalid = await fetch(origin + '/style.css', { headers: { Range: 'bytes=999999999-' } });
  assert.equal(invalid.status, 416);
  const head = await fetch(origin + '/assets/video/video.mp4', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal((await head.text()).length, 0);
  assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
});

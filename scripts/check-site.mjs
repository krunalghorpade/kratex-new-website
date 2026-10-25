import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./content-manifest.json', import.meta.url)));
JSON.parse(await readFile(path.join(root, 'settings.json')));
JSON.parse(await readFile(path.join(root, 'socials.json')));
const attrValues = (html, tag, attr) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']*)`, 'gi'))].map(match => match[1].replaceAll('&amp;', '&'));
let total = 0;
for (const [file, original] of Object.entries(manifest)) {
  const html = await readFile(path.join(root, file), 'utf8');
  const links = attrValues(html, 'a', 'href');
  for (const link of original.links) assert(links.includes(link.replaceAll('&amp;', '&')), `${file}: original link missing: ${link}`);
  assert.deepEqual(attrValues(html, 'section', 'id'), original.sections, `${file}: section order changed`);
  const ids = attrValues(html, '[a-z][a-z0-9-]*', 'id');
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate IDs`);
  for (const resource of [...links, ...attrValues(html, '(?:img|script|source|iframe)', 'src'), ...attrValues(html, 'link', 'href')]) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(resource)) continue;
    const url = new URL(resource, `https://kratex.local/${file}`);
    let destination = path.join(root, decodeURIComponent(url.pathname));
    let info;
    try { info = await stat(destination); } catch { assert.fail(`${file}: missing local resource ${resource}`); }
    if (info.isDirectory()) destination = path.join(destination, 'index.html');
    if (url.hash && destination.endsWith('.html')) {
      const target = await readFile(destination, 'utf8');
      assert(attrValues(target, '[a-z][a-z0-9-]*', 'id').includes(decodeURIComponent(url.hash.slice(1))), `${file}: missing anchor ${resource}`);
    }
  }
  total += original.links.length;
  console.log(`${file}: ${original.links.length} original destinations retained; section order and local links verified.`);
}
console.log(`PASS — ${total} original destinations preserved across all three pages.`);

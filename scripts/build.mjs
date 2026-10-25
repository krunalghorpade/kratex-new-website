import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { publicEntries } from '../server.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of [...publicEntries, '.htaccess']) {
  await cp(path.join(root, entry), path.join(out, entry), {
    recursive: true, filter: source => !path.basename(source).startsWith('.') || path.basename(source) === '.htaccess'
  });
}
console.log('Built dist/ with all pages and assets. Upload its contents to your current web host, or use SERVE_DIST=1 npm start.');

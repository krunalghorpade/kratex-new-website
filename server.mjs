import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
export const publicEntries = ['index.html', 'style.css', 'mobile.css', 'script.js', 'settings.json', 'socials.json', 'assets', 'about', 'faktahouse'];
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf'
};

export function createSiteServer(root = projectRoot) {
  return createServer(async (req, res) => {
    const fail = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return fail(405, 'Method not allowed');
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const parts = pathname.split('/').filter(Boolean);
      if (parts.some(part => part.startsWith('.') || part.includes('\\') || part.includes('\0'))) return fail(404, 'Not found');
      if (parts.length && !publicEntries.includes(parts[0])) return fail(404, 'Not found');
      let candidate = path.resolve(root, '.' + pathname);
      let info = await stat(candidate);
      if (info.isDirectory()) {
        if (!pathname.endsWith('/')) {
          // Relative asset URLs on the existing nested pages require a trailing slash.
          const location = pathname + '/' + new URL(req.url, 'http://localhost').search;
          res.writeHead(308, { Location: location }); res.end(); return;
        }
        candidate = path.join(candidate, 'index.html');
        info = await stat(candidate);
      }
      const canonicalRoot = await realpath(root);
      const canonicalFile = await realpath(candidate);
      if (!canonicalFile.startsWith(canonicalRoot + path.sep) || !info.isFile()) return fail(404, 'Not found');
      const contentType = mimeTypes[path.extname(candidate).toLowerCase()];
      if (!contentType) return fail(404, 'Not found');
      const headers = {
        'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': ['html', 'json', 'css', 'javascript'].some(type => contentType.includes(type)) ? 'no-cache' : 'public, max-age=3600',
        'Accept-Ranges': 'bytes', 'Content-Length': info.size
      };
      let start = 0, end = info.size - 1, status = 200;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!match || (!match[1] && !match[2])) {
          res.setHeader('Content-Range', `bytes */${info.size}`); return fail(416, 'Invalid range');
        }
        if (match[1]) {
          start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
        } else { start = Math.max(0, info.size - Number(match[2])); }
        if (start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
          res.setHeader('Content-Range', `bytes */${info.size}`); return fail(416, 'Invalid range');
        }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        headers['Content-Length'] = end - start + 1;
      }
      res.writeHead(status, headers);
      if (req.method === 'HEAD' || info.size === 0) return res.end();
      const stream = createReadStream(candidate, { start, end });
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      fail(error instanceof URIError ? 400 : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500,
        error instanceof URIError ? 'Invalid URL' : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 'Not found' : 'Unable to serve this file');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createSiteServer(process.env.SERVE_DIST === '1' ? path.join(projectRoot, 'dist') : projectRoot);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`KRATEX local preview: http://${host}:${port}`));
}

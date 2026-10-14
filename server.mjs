// Local room for coding. The live chat and game sit in room.mjs, same as the Worker.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachSocket, acceptKey } from './live-socket.mjs';
import { JSON_LIMIT, PAGE_CSP, UPLOAD_LIMIT, createRoom } from './room.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const stickersDir = path.resolve(process.env.NOOK_STICKERS || path.join(root, 'stickers'));
const port = Number(process.env.NOOK_PORT || 8787);
const BUILD_FILES = ['index.html', 'app.css', 'app.js', 'e2e.js', 'whimsy.js', 'emoji.js', 'affirmations.js', 'colosseum.js', 'colosseum.css', 'colosseum-art.js', 'colosseum-logic.mjs', 'colosseum-world.mjs', 'colosseum-story.mjs', 'popup.js'];
let buildCache = { key: '', token: '' };

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('NOOK_PORT is not a usable port.');
  process.exit(1);
}

const room = createRoom({ word: process.env.NOOK_ROOM_WORD });
const sockets = new Set();
room.listen((message) => {
  const text = JSON.stringify(message);
  for (const client of sockets) client.send(text);
});

function sendJson(res, status, body, extra = {}) {
  if (res.headersSent || res.writableEnded) return;
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'none'",
    ...extra,
  });
  res.end(data);
}

function sendText(res, status, text) {
  if (res.headersSent || res.writableEnded) return;
  const data = Buffer.from(text);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(data);
}

function pageBuild() {
  const stats = BUILD_FILES.map((name) => {
    const stat = fs.statSync(path.join(root, 'public', name));
    return `${name}:${stat.mtimeMs}:${stat.size}`;
  });
  const key = stats.join('|');
  if (key === buildCache.key) return buildCache.token;
  const hash = crypto.createHash('sha256');
  for (const name of BUILD_FILES) hash.update(fs.readFileSync(path.join(root, 'public', name)));
  buildCache = { key, token: hash.digest('hex').slice(0, 16) };
  return buildCache.token;
}

function isStickerName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._ -]{0,80}\.(svg|gif)$/i.test(name);
}

function stickerNames() {
  if (!fs.existsSync(stickersDir)) return [];
  return fs.readdirSync(stickersDir).filter((name) => isStickerName(name)).sort((a, b) => a.localeCompare(b));
}

function stickerFile(name) {
  if (!stickerNames().includes(name)) return null;
  const resolved = path.resolve(stickersDir, name);
  const base = path.resolve(stickersDir);
  if (resolved !== path.join(base, name)) return null;
  return resolved;
}

function readBody(req, limit) {
  const claimed = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(claimed) && claimed > limit) {
    req.resume();
    const error = new Error('too big');
    error.code = 'LIMIT';
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error('too big');
        error.code = 'LIMIT';
        req.destroy();
        fail(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (error) => {
      if (error.code === 'LIMIT') return;
      fail(error);
    });
  });
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function serveFile(res, file, { downloadName = '', inlineImage = false, sticker = false } = {}) {
  let stat;
  try { stat = fs.statSync(file); } catch {
    sendText(res, 404, 'Not found');
    return;
  }
  if (!stat.isFile()) {
    sendText(res, 404, 'Not found');
    return;
  }
  const headers = {
    'Content-Type': contentTypeFor(file),
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-cache',
  };
  if (sticker) headers['Content-Security-Policy'] = "sandbox; default-src 'none'";
  if (downloadName) {
    const ascii = downloadName.replace(/[^\x20-\x7E]/g, '_') || 'file';
    const kind = inlineImage ? 'inline' : 'attachment';
    headers['Content-Disposition'] = `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
    headers['Content-Type'] = inlineImage ? contentTypeFor(file) : 'application/octet-stream';
  }
  if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.mjs')) {
    headers['Content-Security-Policy'] = PAGE_CSP;
    headers['Cache-Control'] = 'no-store';
  }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

function serveHome(res, file) {
  let html;
  try { html = fs.readFileSync(file, 'utf8').replaceAll('__NOOK_BUILD__', pageBuild()); }
  catch {
    sendText(res, 404, 'Not found');
    return;
  }
  const data = Buffer.from(html);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': data.length,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': PAGE_CSP,
  });
  res.end(data);
}

const publicFiles = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/app.css', 'app.css'],
  ['/app.js', 'app.js'],
  ['/e2e.js', 'e2e.js'],
  ['/whimsy.js', 'whimsy.js'],
  ['/affirmations.js', 'affirmations.js'],
  ['/emoji.js', 'emoji.js'],
  ['/colosseum.js', 'colosseum.js'],
  ['/colosseum.css', 'colosseum.css'],
  ['/colosseum-art.js', 'colosseum-art.js'],
  ['/colosseum-logic.mjs', 'colosseum-logic.mjs'],
  ['/colosseum-world.mjs', 'colosseum-world.mjs'],
  ['/colosseum-story.mjs', 'colosseum-story.mjs'],
  ['/popup.js', 'popup.js'],
  ['/vapor.js', 'vapor.js'],
  ['/vapor-art.js', 'vapor-art.js'],
  ['/vapor.css', 'vapor.css'],
  ['/paperclip.png', 'paperclip.png'],
  ['/favicon.svg', 'favicon.svg'],
]);

function headerMap(req) {
  const header = req.headers['x-token'];
  return { 'x-token': String((Array.isArray(header) ? header[0] : header) || '') };
}

async function callRoom(req, res, url, { raw = false } = {}) {
  const limit = raw ? UPLOAD_LIMIT + 64 : JSON_LIMIT;
  let body = Buffer.alloc(0);
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await readBody(req, limit);
  let parsed = null;
  if (!raw && body.length) {
    try {
      parsed = JSON.parse(body.toString('utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        sendJson(res, 400, { error: 'That request could not be read.' });
        return;
      }
    } catch {
      sendJson(res, 400, { error: 'That request could not be read.' });
      return;
    }
  }
  const result = await room.handle({
    method: req.method,
    pathname: decodeURIComponent(url.pathname),
    searchParams: url.searchParams,
    headers: headerMap(req),
    json: parsed,
    raw: raw ? new Uint8Array(body) : null,
  });
  if (result.raw) {
    const bytes = Buffer.from(result.raw);
    res.writeHead(result.status, {
      'Content-Length': bytes.length,
      ...(result.headers || {}),
    });
    res.end(bytes);
    return;
  }
  sendJson(res, result.status, result.json || {});
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.includes('..')) {
      sendText(res, 404, 'Not found');
      return;
    }
    if (pathname === '/api/build' && req.method === 'GET') {
      sendJson(res, 200, { build: pageBuild() });
      return;
    }
    if (pathname === '/api/stickers' && req.method === 'GET') {
      sendJson(res, 200, { stickers: stickerNames().map((name) => ({ name })) });
      return;
    }
    if (pathname.startsWith('/stickers/') && req.method === 'GET') {
      const file = stickerFile(pathname.slice('/stickers/'.length));
      if (!file) {
        sendText(res, 404, 'Not found');
        return;
      }
      serveFile(res, file, { sticker: true });
      return;
    }
    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      await callRoom(req, res, url, { raw: pathname === '/api/upload' });
      return;
    }
    const publicName = publicFiles.get(pathname);
    if (publicName && req.method === 'GET') {
      const file = path.join(root, 'public', publicName);
      if (publicName === 'index.html') serveHome(res, file);
      else serveFile(res, file);
      return;
    }
    sendText(res, 404, 'Not found');
  } catch (error) {
    if (error.code === 'LIMIT') {
      sendJson(res, 413, { error: 'That file is too big. The limit is 8 MB.' });
      return;
    }
    console.error('The room hit a problem.');
    sendJson(res, 500, { error: 'Something went wrong.' });
  }
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname !== '/api/live') {
    socket.destroy();
    return;
  }
  const token = url.searchParams.get('token') || '';
  const key = req.headers['sec-websocket-key'];
  if (!key || !room.known(token)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    socket.destroy();
    return;
  }
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n'
    + 'Upgrade: websocket\r\n'
    + 'Connection: Upgrade\r\n'
    + `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n`
    + '\r\n',
  );
  if (head?.length) socket.unshift(head);
  const client = attachSocket(socket, () => sockets.delete(client));
  sockets.add(client);
  try { socket.setNoDelay(true); } catch { /* best effort */ }
  client.send(JSON.stringify({ type: 'places', places: room.placesFor(token) || [] }));
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use.`);
  else console.error('The room could not listen.');
  process.exit(1);
});

function stop() {
  server.close();
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

server.listen(port, '127.0.0.1', () => {
  if (process.env.NOOK_QUIET !== '1') console.log(`Local link: http://127.0.0.1:${port}`);
});

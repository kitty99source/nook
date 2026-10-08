// The Nook: one room, on the laptop that started it.
// The live conversation stays in memory and is gone when this process stops.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const stickersDir = path.resolve(process.env.NOOK_STICKERS || path.join(root, 'stickers'));
let roomWord = '';
let hostToken = (process.env.NOOK_HOST_TOKEN || '').trim();
let publicUrl = '';
let linkFailed = false;
const linkToken = (process.env.NOOK_LINK_TOKEN || '').trim();
const port = Number(process.env.NOOK_PORT || 8787);
const MAX_UPLOAD = 8 * 1024 * 1024;
const MAX_TEXT = 4000;
const PRESENCE_MS = 15000;
const JSON_LIMIT = 256 * 1024;
const PAGE_CSP = "default-src 'self'; img-src 'self' blob: https:; media-src https:; style-src 'self'; script-src 'self'; connect-src 'self' https://gifjif.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com; base-uri 'none'; frame-ancestors 'none'";
const CAT_IDS = new Set(['cream', 'lilac', 'ginger', 'sage', 'bow', 'stripe', 'wave', 'disco']);
const BUILD_FILES = ['index.html', 'app.css', 'app.js', 'e2e.js', 'whimsy.js', 'emoji.js', 'affirmations.js', 'colosseum.js', 'colosseum.css', 'colosseum-art.js', 'colosseum-logic.mjs'];
let buildCache = { key: '', token: '' };

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('NOOK_PORT is not a usable port.');
  process.exit(1);
}

const sessions = new Map();
const live = [];
const files = new Map();
const wraps = [];
const seenNotes = new Set();
const seenWrapParcels = new Set();
const games = [];
const seenGameParcels = new Set();
let nextGameId = 1;
const GAME_POLL_MS = 400;
let nextId = 1;
let nextWrapId = 1;
let nextOrder = 1;

function parcelKey(iv, data) {
  return crypto.createHash('sha256').update(String(iv)).update('\n').update(String(data)).digest('hex');
}

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

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 40) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;
  return name;
}

function sameSecret(given, expected) {
  const a = Buffer.from(String(given ?? ''), 'utf8');
  const b = Buffer.from(String(expected ?? ''), 'utf8');
  if (!b.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function cleanWord(value) {
  const word = String(value ?? '').replace(/[\r\n\u0000]/g, '').trim();
  if (!word || word.length > 80) return '';
  return word;
}

function wordMatches(given) {
  return sameSecret(String(given ?? '').trim(), roomWord);
}

function cleanCat(value) {
  const id = String(value || '');
  return CAT_IDS.has(id) ? id : '';
}

function cleanPhoto(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length > 70000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  const buf = Buffer.from(text, 'base64');
  if (!buf.length || buf.length > 48 * 1024) return null;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const jpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  if (!png && !jpeg) return null;
  return text;
}

function pageBuild() {
  const stats = BUILD_FILES.map((name) => {
    const stat = fs.statSync(path.join(root, 'public', name));
    return `${name}:${stat.mtimeMs}:${stat.size}`;
  });
  const key = stats.join('|');
  if (key === buildCache.key) return buildCache.token;
  const hash = crypto.createHash('sha256');
  for (const name of BUILD_FILES) {
    hash.update(fs.readFileSync(path.join(root, 'public', name)));
  }
  buildCache = { key, token: hash.digest('hex').slice(0, 16) };
  return buildCache.token;
}

function admit(name, publicKey, cat, photo) {
  const token = crypto.randomBytes(24).toString('hex');
  const memberId = crypto.randomBytes(8).toString('hex');
  const order = nextOrder;
  nextOrder += 1;
  sessions.set(token, {
    name,
    memberId,
    publicKey,
    cat: cat || '',
    photo: photo || '',
    order,
    lastSeen: Date.now(),
    typingUntil: 0,
  });
  return { token, memberId, name };
}

function tokenFrom(req, url) {
  const header = req.headers['x-token'];
  const value = (Array.isArray(header) ? header[0] : header) || url.searchParams.get('token') || '';
  return String(value);
}

function sessionFor(token) {
  if (!/^[a-f0-9]{32,128}$/.test(token)) return null;
  const session = sessions.get(token);
  if (!session) return null;
  session.lastSeen = Date.now();
  return session;
}

function isStickerName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._ -]{0,80}\.(svg|gif)$/i.test(name);
}

function stickerNames() {
  if (!fs.existsSync(stickersDir)) return [];
  return fs.readdirSync(stickersDir)
    .filter((name) => isStickerName(name))
    .sort((a, b) => a.localeCompare(b));
}

function stickerFile(name) {
  if (!stickerNames().includes(name)) return null;
  const resolved = path.resolve(stickersDir, name);
  const base = path.resolve(stickersDir);
  if (resolved !== path.join(base, name)) return null;
  return resolved;
}

function cleanB64(value, min, max) {
  const text = String(value || '');
  if (text.length < min || text.length > max) return '';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return '';
  return text;
}

function memberList() {
  const now = Date.now();
  const list = [];
  for (const session of sessions.values()) {
    if (now - session.lastSeen > PRESENCE_MS) continue;
    const person = {
      id: session.memberId,
      name: session.name,
      publicKey: session.publicKey,
      order: session.order,
    };
    if (session.cat) person.cat = session.cat;
    if (session.photo) person.photo = session.photo;
    list.push(person);
  }
  list.sort((a, b) => a.order - b.order);
  return list;
}

function relayMessage(row) {
  return {
    id: row.id,
    memberId: row.memberId,
    iv: row.iv,
    data: row.data,
    at: row.at,
  };
}

function presenceSnapshot(selfToken) {
  const now = Date.now();
  const people = new Map();
  const typing = new Set();
  for (const [token, session] of sessions) {
    if (now - session.lastSeen > PRESENCE_MS) {
      sessions.delete(token);
      continue;
    }
    people.set(session.name, { cat: session.cat || '', photo: session.photo || '' });
    if (session.typingUntil > now && token !== selfToken) typing.add(session.name);
  }
  const sort = (a, b) => a[0].localeCompare(b[0]);
  return {
    presence: [...people.entries()].sort(sort).map(([name, info]) => {
      const person = { name };
      if (info.cat) person.cat = info.cat;
      if (info.photo) person.photo = info.photo;
      return person;
    }),
    typing: [...typing].sort((a, b) => a.localeCompare(b)),
  };
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

async function readJson(req) {
  const buf = await readBody(req, JSON_LIMIT);
  if (!buf.length) return {};
  try {
    const value = JSON.parse(buf.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const error = new Error('bad json');
      error.code = 'JSON';
      throw error;
    }
    return value;
  } catch (error) {
    if (error.code === 'JSON' || error.code === 'LIMIT') throw error;
    const wrapped = new Error('bad json');
    wrapped.code = 'JSON';
    throw wrapped;
  }
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
  try {
    stat = fs.statSync(file);
  } catch {
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
  if (sticker) {
    headers['Content-Security-Policy'] = "sandbox; default-src 'none'";
  }
  if (downloadName) {
    const ascii = downloadName.replace(/[^\x20-\x7E]/g, '_') || 'file';
    const kind = inlineImage ? 'inline' : 'attachment';
    headers['Content-Disposition'] = `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
    if (inlineImage) headers['Content-Type'] = contentTypeFor(file);
    else headers['Content-Type'] = 'application/octet-stream';
  }
  if (file.endsWith('.html')) {
    headers['Content-Security-Policy'] = PAGE_CSP;
    headers['Cache-Control'] = 'no-store';
  }
  if (file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.mjs')) {
    headers['Content-Security-Policy'] = PAGE_CSP;
    headers['Cache-Control'] = 'no-store';
  }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

function serveHome(res, file) {
  let html;
  try {
    html = fs.readFileSync(file, 'utf8').replaceAll('__NOOK_BUILD__', pageBuild());
  } catch {
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
  ['/paperclip.png', 'paperclip.png'],
  ['/favicon.svg', 'favicon.svg'],
]);

function cleanPublicUrl(value) {
  const url = String(value ?? '').trim();
  if (!/^https:\/\/[-a-z0-9]+\.trycloudflare\.com$/i.test(url)) return '';
  return url;
}

async function handlePublicLink(req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, {
      url: publicUrl,
      pending: !publicUrl && !linkFailed,
      failed: linkFailed && !publicUrl,
    });
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use GET or POST.' });
    return;
  }
  const body = await readJson(req);
  if (!linkToken || !sameSecret(body.token, linkToken)) {
    sendJson(res, 403, { error: 'That link cannot be set.' });
    return;
  }
  if (body.failed) {
    linkFailed = true;
    sendJson(res, 200, { ok: true });
    return;
  }
  const url = cleanPublicUrl(body.url);
  if (!url) {
    sendJson(res, 400, { error: 'That link is not a public room link.' });
    return;
  }
  publicUrl = url;
  linkFailed = false;
  sendJson(res, 200, { ok: true });
}

async function handleHostCode(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST to set the code word.' });
    return;
  }
  const body = await readJson(req);
  const word = cleanWord(body.word);
  const name = cleanName(body.name);
  const publicKey = cleanB64(body.publicKey, 80, 200);
  if (roomWord || !hostToken || !sameSecret(body.hostToken, hostToken)) {
    sendJson(res, 403, { error: 'Only the person who started the room can set the code word.' });
    return;
  }
  if (!word) {
    sendJson(res, 400, { error: 'Set a code word for this room.' });
    return;
  }
  if (!name) {
    sendJson(res, 400, { error: 'Say what to call you.' });
    return;
  }
  if (!publicKey) {
    sendJson(res, 400, { error: 'The room could not lock.' });
    return;
  }
  const photo = cleanPhoto(body.photo);
  if (photo == null) {
    sendJson(res, 400, { error: 'That picture could not be used.' });
    return;
  }
  roomWord = word;
  hostToken = '';
  sendJson(res, 200, admit(name, publicKey, photo ? '' : cleanCat(body.cat), photo));
}

async function handleJoin(req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, { needsWord: Boolean(roomWord), waiting: !roomWord });
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST to come in.' });
    return;
  }
  const body = await readJson(req);
  if (!roomWord) {
    sendJson(res, 409, { error: 'The host has not set a code word yet.', waiting: true });
    return;
  }
  if (!wordMatches(body.roomWord)) {
    sendJson(res, 401, { error: 'That room word is not right.', needsWord: true });
    return;
  }
  const name = cleanName(body.name);
  if (!name) {
    sendJson(res, 400, { error: 'Say what to call you.' });
    return;
  }
  const publicKey = cleanB64(body.publicKey, 80, 200);
  if (!publicKey) {
    sendJson(res, 400, { error: 'The room could not lock.' });
    return;
  }
  const photo = cleanPhoto(body.photo);
  if (photo == null) {
    sendJson(res, 400, { error: 'That picture could not be used.' });
    return;
  }
  sendJson(res, 200, admit(name, publicKey, photo ? '' : cleanCat(body.cat), photo));
}

async function handleSend(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST to send.' });
    return;
  }
  const body = await readJson(req);
  const token = tokenFrom(req, url) || String(body.token || '');
  const session = sessionFor(token);
  if (!session) {
    sendJson(res, 401, { error: 'Come in again.' });
    return;
  }
  const iv = cleanB64(body.iv, 8, 40);
  const data = cleanB64(body.data, 16, 24000);
  if (!iv || !data) {
    sendJson(res, 400, { error: 'That note could not be carried.' });
    return;
  }
  const key = parcelKey(iv, data);
  if (seenNotes.has(key)) {
    sendJson(res, 409, { error: 'That note was already carried.' });
    return;
  }
  seenNotes.add(key);
  const row = {
    id: nextId,
    memberId: session.memberId,
    iv,
    data,
    at: Date.now(),
  };
  nextId += 1;
  live.push(row);
  sendJson(res, 200, { message: relayMessage(row) });
}

async function handleWrap(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST to pass a key.' });
    return;
  }
  const session = sessionFor(tokenFrom(req, url));
  if (!session) {
    sendJson(res, 401, { error: 'Come in again.' });
    return;
  }
  const body = await readJson(req);
  const forMemberId = String(body.forMemberId || '');
  const recipient = [...sessions.values()].find((item) => item.memberId === forMemberId);
  const recipientPublic = cleanB64(body.recipientPublic, 80, 200);
  const ephemeralPublic = cleanB64(body.ephemeralPublic, 80, 200);
  const iv = cleanB64(body.iv, 8, 40);
  const data = cleanB64(body.data, 16, 800);
  if (!recipient || !recipientPublic || recipient.publicKey !== recipientPublic || !ephemeralPublic || !iv || !data) {
    sendJson(res, 400, { error: 'That key could not be carried.' });
    return;
  }
  const key = parcelKey(iv, data);
  if (seenWrapParcels.has(key)) {
    sendJson(res, 409, { error: 'That key was already carried.' });
    return;
  }
  seenWrapParcels.add(key);
  const wrap = {
    id: nextWrapId,
    forMemberId,
    fromMemberId: session.memberId,
    recipientPublic,
    ephemeralPublic,
    iv,
    data,
  };
  nextWrapId += 1;
  wraps.push(wrap);
  sendJson(res, 200, { wrap });
}

function relayGame(row) {
  return { id: row.id, memberId: row.memberId, iv: row.iv, data: row.data, at: row.at };
}

function handleGamePoll(req, res, url) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET to refresh the game.' });
    return;
  }
  const session = sessionFor(tokenFrom(req, url));
  if (!session) {
    sendJson(res, 401, { error: 'Come in again.' });
    return;
  }
  let since = Number(url.searchParams.get('since') || 0);
  if (!Number.isFinite(since) || since < 0) since = 0;
  sendJson(res, 200, {
    parcels: games.filter((row) => row.id > since).map(relayGame),
    pollMs: GAME_POLL_MS,
  });
}

async function handleGamePost(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST to send a game parcel.' });
    return;
  }
  const session = sessionFor(tokenFrom(req, url));
  if (!session) {
    sendJson(res, 401, { error: 'Come in again.' });
    return;
  }
  const body = await readJson(req);
  const iv = cleanB64(body.iv, 8, 40);
  const data = cleanB64(body.data, 16, 12000);
  if (!iv || !data) {
    sendJson(res, 400, { error: 'That game parcel could not be carried.' });
    return;
  }
  const key = parcelKey(iv, data);
  if (seenGameParcels.has(key)) {
    sendJson(res, 409, { error: 'That game parcel was already carried.' });
    return;
  }
  seenGameParcels.add(key);
  const row = { id: nextGameId, memberId: session.memberId, iv, data, at: Date.now() };
  nextGameId += 1;
  games.push(row);
  if (games.length > 500) {
    const dropped = games.splice(0, games.length - 500);
    for (const item of dropped) seenGameParcels.delete(parcelKey(item.iv, item.data));
  }
  sendJson(res, 200, { parcel: relayGame(row) });
}

function handlePoll(req, res, url) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET to refresh the room.' });
    return;
  }
  const token = tokenFrom(req, url);
  const session = sessionFor(token);
  if (!session) {
    sendJson(res, 401, { error: 'Come in again.' });
    return;
  }
  if (url.searchParams.get('typing') === '1') session.typingUntil = Date.now() + 2800;
  else session.typingUntil = 0;
  let since = Number(url.searchParams.get('since') || 0);
  if (!Number.isFinite(since) || since < 0) since = 0;
  const messages = live.filter((row) => row.id > since).map((row) => relayMessage(row));
  sendJson(res, 200, {
    messages,
    wraps,
    members: memberList(),
    ...presenceSnapshot(token),
  });
}

async function handleUpload(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST to attach a file.' });
    return;
  }
  const session = sessionFor(tokenFrom(req, url));
  if (!session) {
    sendJson(res, 401, { error: 'Come in again.' });
    return;
  }
  const buf = await readBody(req, MAX_UPLOAD + 64);
  if (!buf.length) {
    sendJson(res, 400, { error: 'That file is empty.' });
    return;
  }
  const id = crypto.randomBytes(16).toString('hex');
  files.set(id, { body: buf });
  sendJson(res, 200, { id, size: buf.length });
}

function serveUpload(res, row) {
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': row.body.length,
    'Content-Disposition': 'attachment; filename="locked"',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "sandbox; default-src 'none'",
  });
  res.end(row.body);
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
    if (pathname === '/api/join') {
      await handleJoin(req, res);
      return;
    }
    if (pathname === '/api/host-code') {
      await handleHostCode(req, res);
      return;
    }
    if (pathname === '/api/public-link') {
      await handlePublicLink(req, res);
      return;
    }
    if (pathname === '/api/send') {
      await handleSend(req, res, url);
      return;
    }
    if (pathname === '/api/wrap') {
      await handleWrap(req, res, url);
      return;
    }
    if (pathname === '/api/poll') {
      handlePoll(req, res, url);
      return;
    }
    if (pathname === '/api/game') {
      if (req.method === 'GET') {
        handleGamePoll(req, res, url);
        return;
      }
      await handleGamePost(req, res, url);
      return;
    }
    if (pathname === '/api/upload') {
      await handleUpload(req, res, url);
      return;
    }
    if (pathname === '/api/stickers' && req.method === 'GET') {
      sendJson(res, 200, {
        stickers: stickerNames().map((name) => ({ name })),
      });
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
    if (pathname.startsWith('/uploads/') && req.method === 'GET') {
      const id = pathname.slice('/uploads/'.length);
      if (!/^[a-f0-9]{32}$/.test(id)) {
        sendText(res, 404, 'Not found');
        return;
      }
      if (!sessionFor(url.searchParams.get('token') || '')) {
        sendText(res, 401, 'Come in again.');
        return;
      }
      const row = files.get(id);
      if (!row) {
        sendText(res, 404, 'Not found');
        return;
      }
      serveUpload(res, row);
      return;
    }

    const publicName = publicFiles.get(pathname);
    if (publicName && req.method === 'GET') {
      const file = path.join(root, 'public', publicName);
      if (publicName === 'index.html') {
        serveHome(res, file);
        return;
      }
      serveFile(res, file);
      return;
    }

    if (pathname.startsWith('/api/')) sendJson(res, 404, { error: 'Not found' });
    else sendText(res, 404, 'Not found');
  } catch (error) {
    if (error.code === 'LIMIT') {
      sendJson(res, 413, { error: 'That file is too big. The limit is 8 MB.' });
      return;
    }
    if (error.code === 'JSON') {
      sendJson(res, 400, { error: 'That request could not be read.' });
      return;
    }
    console.error('The room hit a problem.');
    sendJson(res, 500, { error: 'Something went wrong.' });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use.`);
  else console.error('The room could not listen.');
  process.exit(1);
});

function stop() {
  live.length = 0;
  wraps.length = 0;
  seenNotes.clear();
  seenWrapParcels.clear();
  games.length = 0;
  seenGameParcels.clear();
  files.clear();
  sessions.clear();
  roomWord = '';
  hostToken = '';
  publicUrl = '';
  linkFailed = false;
  server.close();
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

server.listen(port, '127.0.0.1', () => {
  if (process.env.NOOK_QUIET !== '1') {
    console.log(`Local link: http://127.0.0.1:${port}`);
  }
});

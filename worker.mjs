// Standing room. Static files are assets. One Durable Object holds the live room.
import stickerNames from './sticker-names.json' with { type: 'json' };
import { JSON_LIMIT, PAGE_CSP, UPLOAD_LIMIT, createRoom } from './room.mjs';

const FILE_CHUNK = 256 * 1024;

function buildId(env) {
  const id = env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id;
  return String(id || 'nook').slice(0, 16);
}

function jsonResponse(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'none'",
      ...extra,
    },
  });
}

async function readLimited(request, limit) {
  const claimed = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(claimed) && claimed > limit) {
    const error = new Error('too big');
    error.code = 'LIMIT';
    throw error;
  }
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length > limit) {
    const error = new Error('too big');
    error.code = 'LIMIT';
    throw error;
  }
  return buf;
}

async function toRoomRequest(request) {
  const url = new URL(request.url);
  let json = null;
  let raw = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const upload = url.pathname === '/api/upload';
    const buf = await readLimited(request, upload ? UPLOAD_LIMIT + 64 : JSON_LIMIT);
    if (upload) raw = buf;
    else if (buf.length) {
      try {
        json = JSON.parse(new TextDecoder().decode(buf));
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          const error = new Error('bad json');
          error.code = 'JSON';
          throw error;
        }
      } catch (error) {
        if (error.code === 'JSON') throw error;
        const wrapped = new Error('bad json');
        wrapped.code = 'JSON';
        throw wrapped;
      }
    }
  }
  return {
    method: request.method,
    pathname: decodeURIComponent(url.pathname),
    searchParams: url.searchParams,
    headers: { 'x-token': request.headers.get('x-token') || '' },
    json,
    raw,
  };
}

function fromRoom(result) {
  if (result.raw) {
    return new Response(result.raw, { status: result.status, headers: result.headers || {} });
  }
  return jsonResponse(result.status, result.json || {});
}

async function serveAsset(request, env) {
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(request);
  const headers = new Headers(asset.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  const path = url.pathname;
  const type = headers.get('content-type') || '';
  const code = path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.css') || type.includes('javascript') || type.includes('css');
  const html = path === '/' || path.endsWith('.html') || type.includes('text/html');
  if (html || code) {
    headers.set('Content-Security-Policy', PAGE_CSP);
    headers.set('Cache-Control', 'no-store');
  }
  if (path.startsWith('/stickers/')) headers.set('Content-Security-Policy', "sandbox; default-src 'none'");
  if (!html) return new Response(asset.body, { status: asset.status, headers });
  headers.delete('content-length');
  const page = (await asset.text()).replaceAll('__NOOK_BUILD__', buildId(env));
  return new Response(page, { status: asset.status, headers });
}

export class NookRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    this.sockets = new Map();
    this.saving = false;
    this.saveSoon = false;
    this.savedFiles = -1;
    this.placeWait = null;
    this.placesDirty = false;
  }

  async ready() {
    if (this.room) return;
    this.room = createRoom({ word: this.env.NOOK_ROOM_WORD });
    this.room.listen((message, except) => this.broadcast(message, except));
    const meta = await this.ctx.storage.get('meta');
    if (!meta) return;
    const slices = [];
    for (let i = 0; i < (Number(meta.gameSlices) || 0); i += 1) {
      const slice = await this.ctx.storage.get(`games:${i}`);
      if (Array.isArray(slice)) slices.push(slice);
    }
    meta.games = slices;
    const files = [];
    for (const id of meta.fileIds || []) {
      const n = Number(await this.ctx.storage.get(`file:${id}:n`)) || 0;
      const parts = [];
      for (let i = 0; i < n; i += 1) {
        const chunk = await this.ctx.storage.get(`file:${id}:${i}`);
        if (chunk) parts.push(new Uint8Array(chunk));
      }
      const size = parts.reduce((sum, part) => sum + part.length, 0);
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
      }
      if (bytes.length) files.push({ id, bytes });
    }
    this.room.restore(meta, files);
    this.savedFiles = this.room.fileStamp();
  }

  broadcast(message, except) {
    const text = JSON.stringify(message);
    for (const [socket, conn] of this.sockets) {
      if (except && conn === except) continue;
      try { socket.send(text); }
      catch { this.sockets.delete(socket); }
    }
  }

  markPlaces() {
    this.placesDirty = true;
    if (this.placeWait) return;
    this.placeWait = (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        if (!this.placesDirty || !this.room) return;
        this.placesDirty = false;
        await this.scheduleSave(true);
      } finally {
        this.placeWait = null;
        if (this.placesDirty) this.markPlaces();
      }
    })();
    this.ctx.waitUntil(this.placeWait);
  }

  noteLive(outcome) {
    if (!outcome) return;
    if (outcome.persist === 'leave') this.scheduleSave(true);
    else if (outcome.persist === 'later') this.markPlaces();
  }

  async writeState() {
    const meta = this.room.exportMeta();
    const slices = meta.games || [];
    const stored = { ...meta, games: undefined, gameSlices: slices.length };
    delete stored.games;
    await this.ctx.storage.put('meta', stored);
    for (let i = 0; i < slices.length; i += 1) await this.ctx.storage.put(`games:${i}`, slices[i]);
    if (this.room.fileStamp() === this.savedFiles) return;
    for (const id of meta.fileIds || []) {
      const bytes = this.room.exportFile(id);
      if (!bytes) continue;
      const n = Math.max(1, Math.ceil(bytes.length / FILE_CHUNK));
      for (let i = 0; i < n; i += 1) {
        const slice = bytes.subarray(i * FILE_CHUNK, (i + 1) * FILE_CHUNK);
        await this.ctx.storage.put(`file:${id}:${i}`, slice.slice().buffer);
      }
      await this.ctx.storage.put(`file:${id}:n`, n);
    }
    this.savedFiles = this.room.fileStamp();
  }

  scheduleSave(immediate) {
    this.saveSoon = true;
    if (this.saving) return this.tail || Promise.resolve();
    this.saving = true;
    this.tail = (async () => {
      try {
        do {
          this.saveSoon = false;
          if (!immediate) await new Promise((resolve) => setTimeout(resolve, 200));
          immediate = false;
          await this.writeState();
        } while (this.saveSoon);
      } finally {
        this.saving = false;
      }
    })();
    this.ctx.waitUntil(this.tail);
    return this.tail;
  }

  async fetch(request) {
    try {
      await this.ready();
      const url = new URL(request.url);
      if (request.headers.get('Upgrade') === 'websocket' && url.pathname === '/api/live') {
        const token = url.searchParams.get('token') || '';
        if (!this.room.known(token)) return new Response('Come in again.', { status: 401 });
        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        const conn = crypto.randomUUID();
        server.accept();
        this.sockets.set(server, conn);
        const drop = () => this.sockets.delete(server);
        server.addEventListener('close', drop);
        server.addEventListener('error', drop);
        server.addEventListener('message', (event) => {
          let message;
          try {
            const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
            if (raw.length > 8192) return;
            message = JSON.parse(raw);
          } catch { return; }
          this.noteLive(this.room.receive(token, message, conn));
        });
        server.send(JSON.stringify({ type: 'places', places: this.room.placesFor(token) || [] }));
        this.noteLive(this.room.takeLeave() ? { persist: 'leave' } : null);
        return new Response(null, { status: 101, webSocket: client });
      }
      const result = await this.room.handle(await toRoomRequest(request));
      if (result.persist === 'now') await this.scheduleSave(true);
      else if (result.persist === 'soon') this.scheduleSave(false);
      return fromRoom(result);
    } catch (error) {
      if (error.code === 'LIMIT') return jsonResponse(413, { error: 'That file is too big. The limit is 8 MB.' });
      if (error.code === 'JSON') return jsonResponse(400, { error: 'That request could not be read.' });
      return jsonResponse(500, { error: 'Something went wrong.' });
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/build' && request.method === 'GET') return jsonResponse(200, { build: buildId(env) });
    if (path === '/api/stickers' && request.method === 'GET') {
      return jsonResponse(200, { stickers: stickerNames.map((name) => ({ name })) });
    }
    if (path.startsWith('/api/') || path.startsWith('/uploads/')) {
      const id = env.ROOM.idFromName('the-nook');
      return env.ROOM.get(id).fetch(request);
    }
    return serveAsset(request, env);
  },
};

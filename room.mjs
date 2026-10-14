// The live room. The Node server and the Durable Object both call this.
// Chat is locked parcels in memory. A host can persist them; a code deploy does not clear that store.
import crypto from 'node:crypto';

const MAX_TEXT = 4000;
const PRESENCE_MS = 15000;
const GAME_POLL_MS = 2000;
const GAME_LOG = 500;
const CAT_IDS = new Set(['cream', 'lilac', 'ginger', 'sage', 'bow', 'stripe', 'wave', 'disco']);

export const JSON_LIMIT = 256 * 1024;
export const UPLOAD_LIMIT = 8 * 1024 * 1024;
export const PAGE_CSP = "default-src 'self'; img-src 'self' blob: https:; media-src https:; style-src 'self'; script-src 'self'; connect-src 'self' https://gifjif.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com; base-uri 'none'; frame-ancestors 'none'";

export function doorWord(value) {
  const word = String(value ?? '').replace(/[\r\n\u0000]/g, '').trim();
  if (!word || word.length > 80) return 'pspsps';
  return word;
}

function bytesOf(value) {
  return Buffer.from(String(value ?? ''), 'utf8');
}

function sameSecret(given, expected) {
  const a = bytesOf(given);
  const b = bytesOf(expected);
  if (!b.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 40) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;
  return name;
}

function cleanCat(value) {
  const id = String(value || '');
  return CAT_IDS.has(id) ? id : '';
}

function cleanB64(value, min, max) {
  const text = String(value || '');
  if (text.length < min || text.length > max) return '';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return '';
  return text;
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

function parcelKey(iv, data) {
  return crypto.createHash('sha256').update(String(iv)).update('\n').update(String(data)).digest('hex');
}

function cleanKind(value) {
  const kind = String(value || '');
  return /^[a-z0-9-]{1,32}$/.test(kind) ? kind : '';
}

function json(status, body, persist = 'no') {
  return { status, json: body, persist };
}

export function createRoom({ word, now = () => Date.now() } = {}) {
  const roomWord = doorWord(word);
  const sessions = new Map();
  const live = [];
  const files = new Map();
  const wraps = [];
  const seenNotes = new Set();
  const seenWrapParcels = new Set();
  const games = [];
  const seenGameParcels = new Set();
  const places = new Map();
  const listeners = new Set();
  let nextGameId = 1;
  let nextId = 1;
  let nextWrapId = 1;
  let nextOrder = 1;
  let fileStamp = 0;

  function emit(message) {
    for (const fn of listeners) {
      try { fn(message); } catch { /* one listener can miss a push */ }
    }
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
      lastSeen: now(),
      typingUntil: 0,
    });
    return { token, memberId, name };
  }

  function sessionFor(token) {
    if (!/^[a-f0-9]{32,128}$/.test(token || '')) return null;
    const session = sessions.get(token);
    if (!session) return null;
    session.lastSeen = now();
    return session;
  }

  function tokenFrom(req) {
    return String(req.headers?.['x-token'] || req.searchParams?.get('token') || '');
  }

  function dropQuiet() {
    const at = now();
    for (const [token, session] of sessions) {
      if (at - session.lastSeen <= PRESENCE_MS) continue;
      sessions.delete(token);
      places.delete(session.memberId);
    }
  }

  function presentIds() {
    dropQuiet();
    const ids = new Set();
    for (const session of sessions.values()) ids.add(session.memberId);
    return ids;
  }

  function memberList() {
    const ids = presentIds();
    const list = [];
    for (const session of sessions.values()) {
      if (!ids.has(session.memberId)) continue;
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
    return { id: row.id, memberId: row.memberId, iv: row.iv, data: row.data, at: row.at };
  }

  function relayGame(row) {
    return { id: row.id, memberId: row.memberId, iv: row.iv, data: row.data, at: row.at };
  }

  function presenceSnapshot(selfToken) {
    const at = now();
    const people = new Map();
    const typing = new Set();
    for (const [token, session] of sessions) {
      if (at - session.lastSeen > PRESENCE_MS) continue;
      people.set(session.name, { cat: session.cat || '', photo: session.photo || '' });
      if (session.typingUntil > at && token !== selfToken) typing.add(session.name);
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

  function placeRows() {
    const ids = presentIds();
    const rows = [];
    for (const [memberId, row] of places) {
      if (!ids.has(memberId)) {
        places.delete(memberId);
        continue;
      }
      rows.push(relayGame(row));
    }
    rows.sort((a, b) => a.id - b.id);
    return rows;
  }

  function wordMatches(given) {
    return sameSecret(String(given ?? '').trim(), roomWord);
  }

  function handleJoin(req) {
    if (req.method === 'GET') return json(200, { needsWord: true, waiting: false });
    if (req.method !== 'POST') return json(405, { error: 'Use POST to come in.' });
    const body = req.json || {};
    if (!wordMatches(body.roomWord)) {
      return json(401, { error: 'That room word is not right.', needsWord: true });
    }
    const name = cleanName(body.name);
    if (!name) return json(400, { error: 'Say what to call you.' });
    const publicKey = cleanB64(body.publicKey, 80, 200);
    if (!publicKey) return json(400, { error: 'The room could not lock.' });
    const photo = cleanPhoto(body.photo);
    if (photo == null) return json(400, { error: 'That picture could not be used.' });
    return json(200, admit(name, publicKey, photo ? '' : cleanCat(body.cat), photo), 'now');
  }

  function handlePicture(req) {
    if (req.method !== 'POST') return json(405, { error: 'Use POST to change the picture.' });
    const session = sessionFor(tokenFrom(req));
    if (!session) return json(401, { error: 'Come in again.' });
    const photo = cleanPhoto(req.json?.photo);
    if (photo == null) return json(400, { error: 'That picture could not be used.' });
    session.photo = photo;
    session.cat = '';
    return json(200, { ok: true }, 'now');
  }

  function handleSend(req) {
    if (req.method !== 'POST') return json(405, { error: 'Use POST to send.' });
    const body = req.json || {};
    const session = sessionFor(tokenFrom(req) || String(body.token || ''));
    if (!session) return json(401, { error: 'Come in again.' });
    const iv = cleanB64(body.iv, 8, 40);
    const data = cleanB64(body.data, 16, 24000);
    if (!iv || !data) return json(400, { error: 'That note could not be carried.' });
    if (data.length > MAX_TEXT * 8) return json(400, { error: 'That note could not be carried.' });
    const key = parcelKey(iv, data);
    if (seenNotes.has(key)) return json(409, { error: 'That note was already carried.' });
    seenNotes.add(key);
    const row = { id: nextId, memberId: session.memberId, iv, data, at: now() };
    nextId += 1;
    live.push(row);
    return json(200, { message: relayMessage(row) }, 'now');
  }

  function handleWrap(req) {
    if (req.method !== 'POST') return json(405, { error: 'Use POST to pass a key.' });
    const session = sessionFor(tokenFrom(req));
    if (!session) return json(401, { error: 'Come in again.' });
    const body = req.json || {};
    const forMemberId = String(body.forMemberId || '');
    const recipient = [...sessions.values()].find((item) => item.memberId === forMemberId);
    const recipientPublic = cleanB64(body.recipientPublic, 80, 200);
    const ephemeralPublic = cleanB64(body.ephemeralPublic, 80, 200);
    const iv = cleanB64(body.iv, 8, 40);
    const data = cleanB64(body.data, 16, 800);
    if (!recipient || !recipientPublic || recipient.publicKey !== recipientPublic || !ephemeralPublic || !iv || !data) {
      return json(400, { error: 'That key could not be carried.' });
    }
    const key = parcelKey(iv, data);
    if (seenWrapParcels.has(key)) return json(409, { error: 'That key was already carried.' });
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
    return json(200, { wrap }, 'now');
  }

  function handlePoll(req) {
    if (req.method !== 'GET') return json(405, { error: 'Use GET to refresh the room.' });
    const token = tokenFrom(req);
    const session = sessionFor(token);
    if (!session) return json(401, { error: 'Come in again.' });
    if (req.searchParams.get('typing') === '1') session.typingUntil = now() + 2800;
    else session.typingUntil = 0;
    let since = Number(req.searchParams.get('since') || 0);
    if (!Number.isFinite(since) || since < 0) since = 0;
    return json(200, {
      messages: live.filter((row) => row.id > since).map(relayMessage),
      wraps,
      members: memberList(),
      ...presenceSnapshot(token),
    });
  }

  function handleGame(req) {
    if (req.method === 'GET') {
      const session = sessionFor(tokenFrom(req));
      if (!session) return json(401, { error: 'Come in again.' });
      let since = Number(req.searchParams.get('since') || 0);
      if (!Number.isFinite(since) || since < 0) since = 0;
      return json(200, {
        places: placeRows(),
        parcels: games.filter((row) => row.id > since).map(relayGame),
        pollMs: GAME_POLL_MS,
      });
    }
    if (req.method !== 'POST') return json(405, { error: 'Use POST to send a game parcel.' });
    const session = sessionFor(tokenFrom(req));
    if (!session) return json(401, { error: 'Come in again.' });
    const body = req.json || {};
    const iv = cleanB64(body.iv, 8, 40);
    const data = cleanB64(body.data, 16, 12000);
    if (!iv || !data) return json(400, { error: 'That game parcel could not be carried.' });
    const key = parcelKey(iv, data);
    if (seenGameParcels.has(key)) return json(409, { error: 'That game parcel was already carried.' });
    seenGameParcels.add(key);
    const row = { id: nextGameId, memberId: session.memberId, iv, data, at: now() };
    nextGameId += 1;
    games.push(row);
    if (games.length > GAME_LOG) {
      const dropped = games.splice(0, games.length - GAME_LOG);
      for (const item of dropped) seenGameParcels.delete(parcelKey(item.iv, item.data));
    }
    if (cleanKind(body.kind) === 'place') places.set(session.memberId, row);
    const parcel = relayGame(row);
    emit({ type: 'parcel', parcel });
    return json(200, { parcel }, 'soon');
  }

  function handleUpload(req) {
    if (req.method !== 'POST') return json(405, { error: 'Use POST to attach a file.' });
    const session = sessionFor(tokenFrom(req));
    if (!session) return json(401, { error: 'Come in again.' });
    const raw = req.raw instanceof Uint8Array ? req.raw : new Uint8Array();
    if (!raw.length) return json(400, { error: 'That file is empty.' });
    if (raw.length > UPLOAD_LIMIT) return json(413, { error: 'That file is too big. The limit is 8 MB.' });
    const id = crypto.randomBytes(16).toString('hex');
    files.set(id, raw);
    fileStamp += 1;
    return json(200, { id, size: raw.length }, 'now');
  }

  function handleDownload(req) {
    if (req.method !== 'GET') return json(405, { error: 'Use GET to fetch a file.' });
    const id = req.pathname.slice('/uploads/'.length);
    if (!/^[a-f0-9]{32}$/.test(id)) return json(404, { error: 'Not found' });
    if (!sessionFor(req.searchParams.get('token') || '')) return json(401, { error: 'Come in again.' });
    const row = files.get(id);
    if (!row) return json(404, { error: 'Not found' });
    return {
      status: 200,
      raw: row,
      persist: 'no',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="locked"',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-Frame-Options': 'DENY',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "sandbox; default-src 'none'",
      },
    };
  }

  function exportMeta() {
    const gameSlices = [];
    for (let i = 0; i < games.length; i += 25) gameSlices.push(games.slice(i, i + 25));
    return {
      sessions: [...sessions.entries()],
      live,
      wraps,
      seenNotes: [...seenNotes],
      seenWrapParcels: [...seenWrapParcels],
      seenGameParcels: [...seenGameParcels],
      places: [...places.entries()],
      gameSlices: gameSlices.length,
      games: gameSlices,
      nextGameId,
      nextId,
      nextWrapId,
      nextOrder,
      fileIds: [...files.keys()],
    };
  }

  function restore(meta, storedFiles = []) {
    if (!meta || typeof meta !== 'object') return;
    sessions.clear();
    live.length = 0;
    wraps.length = 0;
    seenNotes.clear();
    seenWrapParcels.clear();
    seenGameParcels.clear();
    games.length = 0;
    places.clear();
    const at = now();
    for (const pair of meta.sessions || []) {
      if (!pair || pair.length !== 2) continue;
      const session = pair[1];
      if (!session || typeof session !== 'object') continue;
      session.lastSeen = at;
      sessions.set(pair[0], session);
    }
    for (const row of meta.live || []) live.push(row);
    for (const wrap of meta.wraps || []) wraps.push(wrap);
    for (const key of meta.seenNotes || []) seenNotes.add(key);
    for (const key of meta.seenWrapParcels || []) seenWrapParcels.add(key);
    for (const key of meta.seenGameParcels || []) seenGameParcels.add(key);
    const slices = Array.isArray(meta.games) ? meta.games : [];
    for (const slice of slices) {
      if (Array.isArray(slice)) games.push(...slice);
    }
    for (const pair of meta.places || []) {
      if (pair && pair.length === 2 && pair[1]) places.set(pair[0], pair[1]);
    }
    nextGameId = Number(meta.nextGameId) || (games.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1);
    nextId = Number(meta.nextId) || (live.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1);
    nextWrapId = Number(meta.nextWrapId) || (wraps.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1);
    nextOrder = Number(meta.nextOrder) || 1;
    fileStamp += 1;
    files.clear();
    for (const file of storedFiles) {
      if (!file || !file.id || !(file.bytes instanceof Uint8Array)) continue;
      files.set(file.id, file.bytes);
    }
  }

  return {
    word: roomWord,
    listen(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    fileStamp: () => fileStamp,
    known(token) {
      return Boolean(sessionFor(token));
    },
    placesFor(token) {
      if (!sessionFor(token)) return null;
      return placeRows();
    },
    exportMeta,
    exportFile(id) {
      const bytes = files.get(id);
      return bytes ? Uint8Array.from(bytes) : null;
    },
    restore,
    async handle(req) {
      const pathname = String(req.pathname || '');
      if (pathname.includes('\0') || pathname.includes('..')) return json(404, { error: 'Not found' });
      if (pathname === '/api/join') return handleJoin(req);
      if (pathname === '/api/picture') return handlePicture(req);
      if (pathname === '/api/send') return handleSend(req);
      if (pathname === '/api/wrap') return handleWrap(req);
      if (pathname === '/api/poll') return handlePoll(req);
      if (pathname === '/api/game') return handleGame(req);
      if (pathname === '/api/upload') return handleUpload(req);
      if (pathname.startsWith('/uploads/')) return handleDownload(req);
      return json(404, { error: 'Not found' });
    },
  };
}

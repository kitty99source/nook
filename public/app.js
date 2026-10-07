// Quick Tunnels do not support server-sent events, so the room polls.
import {
  createGroupKey,
  createIdentity,
  decryptBytes,
  decryptJson,
  encryptBytes,
  encryptJson,
  fingerprint,
  unwrapGroupKey,
  wrapGroupKey,
} from './e2e.js';
import { mountWhimsy } from './whimsy.js';

const POLL_MS = 2000;
const MAX_FILE = 8 * 1024 * 1024;

const door = document.querySelector('#door');
const doorForm = document.querySelector('#door-form');
const nameInput = document.querySelector('#name');
const wordLabel = document.querySelector('#word-label');
const wordInput = document.querySelector('#room-word');
const doorError = document.querySelector('#door-error');
const room = document.querySelector('#room');
const messages = document.querySelector('#messages');
const presence = document.querySelector('#presence');
const typingLine = document.querySelector('#typing');
const composer = document.querySelector('#composer');
const text = document.querySelector('#text');
const fileInput = document.querySelector('#file');
const stagedBox = document.querySelector('#staged');
const composerError = document.querySelector('#composer-error');
const drawer = document.querySelector('#drawer');
const stickerGrid = document.querySelector('#sticker-grid');
const stickersBtn = document.querySelector('#stickers-btn');
const dropVeil = document.querySelector('#drop');
const live = document.querySelector('#live');
const fingerprintEl = document.querySelector('#fingerprint');

const PALETTE = [
  ['#e7d6f6', '#4d3568'],
  ['#f6d9c8', '#6a3d32'],
  ['#d7ead8', '#2f5340'],
  ['#f7e3b0', '#6a4e16'],
  ['#d5e4f6', '#2c4668'],
  ['#f6d4e4', '#6a3050'],
];

let token = '';
let memberId = '';
let myName = '';
let identity = null;
let groupKey = null;
let groupKeyRaw = null;
let members = [];
let wraps = [];
const rememberedNames = new Map();
const postedWraps = new Set();
const pending = [];
const seenCipher = new Set();
const seenSeq = new Map();
const seenWraps = new Set();
let sendSeq = 0;
let lastId = 0;
let timer = 0;
let busy = false;
let queued = false;
let armed = false;
let misses = 0;
let staged = null;
let audioCtx = null;
const seen = new Set();
const onScreen = [];

function colourFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0] || '').join('').toUpperCase();
}

function avatar(name, small) {
  const el = document.createElement('span');
  el.className = 'avatar';
  const [bg, fg] = colourFor(name);
  el.style.background = bg;
  el.style.color = fg;
  el.textContent = initials(name);
  el.setAttribute('aria-hidden', 'true');
  if (small) el.dataset.small = '1';
  return el;
}

function formatTime(ms) {
  const date = new Date(ms);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return time;
  const day = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return `${day} ${time}`;
}

function preview(message) {
  if (message.text) return message.text.slice(0, 140);
  if (message.sticker) return 'sent a sticker';
  if (message.attachment) return 'sent a file';
  return 'sent a note';
}

function nearBottom() {
  return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 90;
}

function showEmpty() {
  if (messages.children.length) return;
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = 'The room is quiet.';
  messages.append(li);
}

function renderMessage(message) {
  const empty = messages.querySelector('.empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  li.className = message.mine ? 'mine' : 'theirs';
  if (!message.mine) li.append(avatar(message.name));
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (!message.mine) {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = message.name;
    bubble.append(who);
  }
  if (message.locked) {
    const p = document.createElement('p');
    p.textContent = 'Locked.';
    bubble.append(p);
  } else if (message.text) {
    const p = document.createElement('p');
    p.textContent = message.text;
    bubble.append(p);
  }
  if (message.sticker) {
    const img = document.createElement('img');
    img.className = 'sticker';
    img.alt = 'Sticker';
    img.src = `/stickers/${encodeURIComponent(message.sticker)}`;
    bubble.append(img);
  }
  if (message.attachment) {
    if (message.attachment.inline) {
      const img = document.createElement('img');
      img.className = 'pic';
      img.alt = message.attachment.name;
      img.src = message.attachment.url;
      bubble.append(img);
    } else {
      const link = document.createElement('a');
      link.className = 'file-link';
      link.href = message.attachment.url;
      link.textContent = message.attachment.name;
      link.download = message.attachment.name;
      bubble.append(link);
    }
  }
  const time = document.createElement('time');
  time.dateTime = new Date(message.at).toISOString();
  time.textContent = formatTime(message.at);
  bubble.append(time);
  li.append(bubble);
  messages.append(li);
}

function takeMessages(list, notify) {
  const stick = nearBottom() || messages.querySelector('.empty');
  const fresh = [];
  for (const message of list) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    if (message.id > lastId) lastId = message.id;
    fresh.push(message);
    onScreen.push(message);
    renderMessage(message);
  }
  if (!messages.children.length) showEmpty();
  if (stick) messages.scrollTop = messages.scrollHeight;
  if (!fresh.length) return;
  const others = fresh.filter((message) => !message.mine);
  if (!others.length) return;
  const latest = others[others.length - 1];
  if (!document.hidden) {
    live.textContent = `${latest.name}: ${preview(latest)}`;
    return;
  }
  if (!notify) return;
  document.title = 'New note · The Nook';
  chime();
  if (window.Notification && Notification.permission === 'granted') {
    const body = others.length === 1
      ? `${latest.name}: ${preview(latest)}`
      : `${others.length} new notes. ${latest.name}: ${preview(latest)}`;
    try {
      new Notification('The Nook', { body, tag: 'nook', silent: true });
    } catch {
      // The tab can still chime if notifications are blocked.
    }
  }
}

function paintPresence(data) {
  presence.replaceChildren();
  for (const person of data.presence || []) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.append(avatar(person.name));
    chip.append(document.createTextNode(person.name));
    presence.append(chip);
  }
}

function paintTyping(names) {
  const list = names || [];
  if (!list.length) {
    typingLine.textContent = '';
    return;
  }
  if (list.length === 1) typingLine.textContent = `${list[0]} is typing…`;
  else if (list.length === 2) typingLine.textContent = `${list[0]} and ${list[1]} are typing…`;
  else typingLine.textContent = 'Several people are typing…';
}

function showRoom() {
  door.hidden = true;
  room.hidden = false;
  showEmpty();
  text.focus();
}

function backToDoor(message) {
  token = '';
  memberId = '';
  identity = null;
  groupKey = null;
  groupKeyRaw = null;
  members = [];
  wraps = [];
  pending.length = 0;
  postedWraps.clear();
  seen.clear();
  seenCipher.clear();
  seenSeq.clear();
  seenWraps.clear();
  sendSeq = 0;
  onScreen.length = 0;
  lastId = 0;
  messages.replaceChildren();
  clearTimeout(timer);
  room.hidden = true;
  door.hidden = false;
  doorError.textContent = message || '';
}

function transcript() {
  if (!onScreen.length) return 'The room is quiet.\n';
  return `${onScreen.map((message) => {
    const lines = [`${message.name} — ${formatTime(message.at)}`];
    if (message.text) lines.push(message.text);
    if (message.sticker) {
      const label = message.sticker.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      lines.push(`[sticker: ${label}]`);
    }
    if (message.attachment) lines.push(`[file: ${message.attachment.name}]`);
    return lines.join('\n');
  }).join('\n\n')}\n`;
}

async function copyChat() {
  const note = transcript();
  try {
    await navigator.clipboard.writeText(note);
  } catch {
    const area = document.createElement('textarea');
    area.value = note;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  live.textContent = 'Chat copied.';
}

async function saveNote() {
  const note = transcript();
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'the-nook.txt',
        types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(note);
      await writable.close();
      live.textContent = 'Note saved.';
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }
  }
  const blob = new Blob([note], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'the-nook.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  live.textContent = 'Note saved.';
}

function schedule() {
  clearTimeout(timer);
  if (!token) return;
  timer = setTimeout(() => { refresh(false); }, POLL_MS);
}

function showLock(value) {
  fingerprintEl.textContent = value
    ? `Same locked room if this matches: ${value}`
    : 'Waiting for the room to lock…';
}

async function noteWraps(list) {
  for (const wrap of list || []) {
    if (!wrap || seenWraps.has(wrap.id)) continue;
    seenWraps.add(wrap.id);
    if (wrap.fromMemberId === wrap.forMemberId) continue;
    const from = rememberedNames.get(wrap.fromMemberId) || 'Someone';
    const who = rememberedNames.get(wrap.forMemberId) || 'someone new';
    const member = members.find((item) => item.id === wrap.forMemberId);
    let line = `${from} locked the room key for ${who}. Compare the fingerprint.`;
    if (member && wrap.recipientPublic && member.publicKey !== wrap.recipientPublic) {
      line = `The room key locked for ${who} does not match the key they are showing now. Compare the fingerprint.`;
    }
    const empty = messages.querySelector('.empty');
    if (empty) empty.remove();
    const li = document.createElement('li');
    li.className = 'notice';
    li.textContent = line;
    messages.append(li);
  }
}

function takeRoomWord() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!hash.startsWith('w=')) return;
  try {
    const word = decodeURIComponent(hash.slice(2)).trim();
    if (word) wordInput.value = word;
  } catch {
    // A broken hash is ignored. The door can still ask.
  }
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

async function shareWraps() {
  if (!groupKeyRaw) return;
  for (const member of members) {
    if (wraps.some((wrap) => wrap.forMemberId === member.id)) continue;
    if (postedWraps.has(member.id)) continue;
    postedWraps.add(member.id);
    try {
      const parcel = await wrapGroupKey(groupKeyRaw, member.publicKey);
      const res = await fetch('/api/wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body: JSON.stringify({
          forMemberId: member.id,
          recipientPublic: member.publicKey,
          ...parcel,
        }),
      });
      if (!res.ok) {
        postedWraps.delete(member.id);
        continue;
      }
      const data = await res.json();
      if (data.wrap) wraps.push(data.wrap);
    } catch {
      postedWraps.delete(member.id);
    }
  }
}

async function ensureGroupKey() {
  if (!groupKey) {
    const mine = wraps.filter((wrap) => wrap.forMemberId === memberId);
    for (const wrap of mine) {
      try {
        const opened = await unwrapGroupKey(identity.privateKey, wrap);
        groupKey = opened.key;
        groupKeyRaw = opened.raw;
        showLock(await fingerprint(groupKeyRaw));
        break;
      } catch {
        // Another parcel may be the one meant for this browser.
      }
    }
  }
  if (!groupKey) {
    const earliest = [...members].sort((a, b) => a.order - b.order)[0];
    if (!wraps.length && earliest && earliest.id === memberId) {
      const created = await createGroupKey();
      groupKey = created.key;
      groupKeyRaw = created.raw;
      showLock(await fingerprint(groupKeyRaw));
    } else {
      showLock('');
      return;
    }
  }
  await shareWraps();
}

function parcelKey(parcel) {
  return `${parcel.iv}.${parcel.data}`;
}

async function openParcel(parcel) {
  const name = rememberedNames.get(parcel.memberId) || 'Someone';
  if (!groupKey) return null;
  const key = parcelKey(parcel);
  if (seenCipher.has(key)) return { drop: true };
  try {
    const payload = await decryptJson(groupKey, parcel);
    const n = Number(payload.n);
    const used = seenSeq.get(parcel.memberId) || new Set();
    if (payload.from !== parcel.memberId || !Number.isInteger(n) || n < 1 || used.has(n)) {
      return { drop: true };
    }
    used.add(n);
    seenSeq.set(parcel.memberId, used);
    seenCipher.add(key);
    const message = {
      id: parcel.id,
      name,
      text: String(payload.text || ''),
      sticker: payload.sticker || null,
      attachment: null,
      at: parcel.at,
      mine: parcel.memberId === memberId,
    };
    if (payload.attachment && payload.attachment.id) {
      const res = await fetch(`/uploads/${payload.attachment.id}?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const packed = new Uint8Array(await res.arrayBuffer());
        const plain = await decryptBytes(groupKey, packed);
        const mime = payload.attachment.mime || 'application/octet-stream';
        message.attachment = {
          name: payload.attachment.name || 'file',
          mime,
          inline: mime.startsWith('image/'),
          url: URL.createObjectURL(new Blob([plain], { type: mime })),
        };
      }
    }
    return message;
  } catch {
    return {
      id: parcel.id,
      name,
      text: '',
      locked: true,
      at: parcel.at,
      mine: parcel.memberId === memberId,
    };
  }
}

async function revealParcels(list, notify) {
  const ready = [];
  const hold = (parcel) => pending.some((item) => item.id === parcel.id);
  for (const parcel of list) {
    if (seen.has(parcel.id) || hold(parcel)) continue;
    if (parcel.id > lastId) lastId = parcel.id;
    if (!groupKey) {
      pending.push(parcel);
      continue;
    }
    const message = await openParcel(parcel);
    if (message?.drop) seen.add(parcel.id);
    else if (message) ready.push(message);
  }
  if (groupKey && pending.length) {
    const queuedParcels = pending.splice(0);
    for (const parcel of queuedParcels) {
      if (seen.has(parcel.id)) continue;
      const message = await openParcel(parcel);
      if (message?.drop) seen.add(parcel.id);
      else if (message) ready.push(message);
    }
  }
  if (ready.length) takeMessages(ready, notify);
}

async function refreshOnce(first) {
  const typing = text.value.trim() ? '1' : '0';
  let res;
  try {
    res = await fetch(`/api/poll?since=${lastId}&typing=${typing}`, {
      headers: { 'X-Token': token },
    });
  } catch {
    misses += 1;
    if (misses >= 3) composerError.textContent = 'The room has closed.';
    return;
  }
  if (res.status === 401) {
    backToDoor('Come in again.');
    return;
  }
  if (!res.ok) {
    misses += 1;
    if (misses >= 3) composerError.textContent = 'The room has closed.';
    return;
  }
  misses = 0;
  if (composerError.textContent === 'The room has closed.') composerError.textContent = '';
  const data = await res.json();
  members = data.members || [];
  wraps = data.wraps || [];
  for (const member of members) rememberedNames.set(member.id, member.name);
  await noteWraps(data.wraps);
  await ensureGroupKey();
  await revealParcels(data.messages || [], !first && armed);
  paintPresence(data);
  paintTyping(data.typing);
  if (first) armed = true;
}

async function refresh(first) {
  if (!token) return;
  if (busy) {
    queued = true;
    return;
  }
  busy = true;
  clearTimeout(timer);
  try {
    let initial = first;
    do {
      queued = false;
      await refreshOnce(initial);
      initial = false;
    } while (queued && token);
  } finally {
    busy = false;
    schedule();
  }
}

function primeChime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  audioCtx = audioCtx || new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function chime() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  gain.connect(audioCtx.destination);
  for (const [freq, at] of [[523, 0], [784, 0.12]]) {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now + at);
    osc.stop(now + at + 0.22);
  }
}

function askNotify() {
  if (!window.Notification || Notification.permission !== 'default') return;
  Notification.requestPermission().catch(() => {});
}

function grow() {
  text.style.height = 'auto';
  text.style.height = `${Math.min(text.scrollHeight, 140)}px`;
}

function paintStaged() {
  stagedBox.replaceChildren();
  if (!staged) {
    stagedBox.hidden = true;
    return;
  }
  stagedBox.hidden = false;
  if (staged.url) {
    const img = document.createElement('img');
    img.src = staged.url;
    img.alt = '';
    stagedBox.append(img);
  }
  const name = document.createElement('span');
  name.textContent = staged.name;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => {
    if (staged && staged.url) URL.revokeObjectURL(staged.url);
    staged = null;
    paintStaged();
  });
  stagedBox.append(name, remove);
}

async function stage(file) {
  if (!file || !token) return;
  if (file.size > MAX_FILE) {
    composerError.textContent = 'That file is too big. The limit is 8 MB.';
    return;
  }
  if (!groupKey) {
    composerError.textContent = 'The room is not locked yet.';
    return;
  }
  composerError.textContent = 'Attaching…';
  let res;
  try {
    const sealed = await encryptBytes(groupKey, new Uint8Array(await file.arrayBuffer()));
    res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Token': token,
      },
      body: sealed,
    });
  } catch {
    composerError.textContent = 'That file did not attach.';
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    composerError.textContent = data.error || 'That file did not attach.';
    return;
  }
  if (staged && staged.url) URL.revokeObjectURL(staged.url);
  staged = {
    id: data.id,
    name: file.name || 'file',
    mime: file.type || 'application/octet-stream',
    url: (file.type || '').startsWith('image/') ? URL.createObjectURL(file) : '',
  };
  paintStaged();
  composerError.textContent = '';
}

async function postMessage(payload, local) {
  if (!groupKey) {
    composerError.textContent = 'The room is not locked yet.';
    return;
  }
  sendSeq += 1;
  const sealed = await encryptJson(groupKey, { ...payload, from: memberId, n: sendSeq });
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token,
    },
    body: JSON.stringify(sealed),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    backToDoor('Come in again.');
    return;
  }
  if (!res.ok) {
    composerError.textContent = data.error || 'That note did not send.';
    return;
  }
  composerError.textContent = '';
  if (data.message) {
    seenCipher.add(parcelKey(data.message));
    const used = seenSeq.get(memberId) || new Set();
    used.add(sendSeq);
    seenSeq.set(memberId, used);
    takeMessages([{
      id: data.message.id,
      name: myName,
      text: local.text || '',
      sticker: local.sticker || null,
      attachment: local.attachment || null,
      at: data.message.at,
      mine: true,
    }], false);
  }
  refresh(false);
}

async function sendSticker(name) {
  drawer.hidden = true;
  stickersBtn.setAttribute('aria-expanded', 'false');
  await postMessage({ text: '', sticker: name, attachment: null }, { sticker: name });
}

async function loadStickers() {
  const res = await fetch('/api/stickers');
  if (!res.ok) return;
  const data = await res.json();
  stickerGrid.replaceChildren();
  for (const sticker of data.stickers || []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sticker-btn';
    const img = document.createElement('img');
    img.alt = sticker.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    img.src = `/stickers/${encodeURIComponent(sticker.name)}`;
    button.append(img);
    button.addEventListener('click', () => sendSticker(sticker.name));
    stickerGrid.append(button);
  }
}

doorForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  primeChime();
  askNotify();
  doorError.textContent = '';
  let res;
  try {
    identity = await createIdentity();
    res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameInput.value,
        roomWord: wordInput.value,
        publicKey: identity.publicKey,
      }),
    });
  } catch {
    doorError.textContent = 'The room is not open.';
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    doorError.textContent = data.error || 'Could not come in.';
    if (data.needsWord) {
      wordLabel.hidden = false;
      wordInput.required = true;
    }
    return;
  }
  token = data.token;
  memberId = data.memberId;
  myName = data.name;
  rememberedNames.set(memberId, myName);
  showLock('');
  showRoom();
  await refresh(true);
});

composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  askNotify();
  const note = text.value.trim();
  if (!note && !staged) return;
  const payload = { text: note, sticker: null, attachment: null };
  const local = { text: note };
  if (staged) {
    payload.attachment = { id: staged.id, name: staged.name, mime: staged.mime };
    local.attachment = {
      name: staged.name,
      mime: staged.mime,
      inline: staged.mime.startsWith('image/'),
      url: staged.url,
    };
  }
  text.value = '';
  grow();
  staged = null;
  paintStaged();
  await postMessage(payload, local);
});

text.addEventListener('input', grow);
text.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    composer.requestSubmit();
  }
});
text.addEventListener('paste', (event) => {
  const file = event.clipboardData && event.clipboardData.files && event.clipboardData.files[0];
  if (!file) return;
  event.preventDefault();
  stage(file);
});

document.querySelector('#attach-btn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = '';
  if (file) stage(file);
});

stickersBtn.addEventListener('click', async () => {
  const open = drawer.hidden;
  drawer.hidden = !open;
  stickersBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) await loadStickers();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !drawer.hidden) {
    drawer.hidden = true;
    stickersBtn.setAttribute('aria-expanded', 'false');
  }
});

let dragDepth = 0;
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropVeil.hidden = true;
  if (room.hidden) return;
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) stage(file);
});
room.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth += 1;
  dropVeil.hidden = false;
});
room.addEventListener('dragleave', () => {
  dragDepth -= 1;
  if (dragDepth <= 0) {
    dragDepth = 0;
    dropVeil.hidden = true;
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) document.title = 'The Nook';
});

document.querySelector('#copy-chat').addEventListener('click', () => { copyChat(); });
document.querySelector('#save-note').addEventListener('click', () => { saveNote(); });

try {
  mountWhimsy();
} catch {
  // The door still works if an overlay fails to start.
}

async function boot() {
  takeRoomWord();
  let needsWord = false;
  try {
    const res = await fetch('/api/join');
    const meta = await res.json();
    needsWord = Boolean(meta.needsWord);
  } catch {
    doorError.textContent = 'The room is not open.';
  }
  wordLabel.hidden = false;
  wordInput.required = needsWord;
  wordInput.placeholder = needsWord ? '' : 'Leave blank if there isn’t one';
  room.hidden = true;
  door.hidden = false;
}

boot();

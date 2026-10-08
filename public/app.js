// Quick Tunnels do not support server-sent events, so the room polls.
import {
  b64ToBytes,
  bytesToB64,
  createGroupKey,
  createIdentity,
  decryptBytes,
  decryptJson,
  encryptBytes,
  encryptJson,
  exportIdentity,
  fingerprint,
  importIdentity,
  unwrapGroupKey,
  wrapGroupKey,
} from './e2e.js';
import { EMOJI_GROUPS } from './affirmations.js';
import { CAT_PRESETS, catPortrait, mountWhimsy } from './whimsy.js';
import { mountColosseum, settleColosseum } from './colosseum.js';

const POLL_MS = 2000;
const MAX_FILE = 8 * 1024 * 1024;
const PAGE_SIZE = 30;
const QUICK_REACT = ['👍', '❤️', '😂', '😮', '😢'];
const BOARD_EMOJI = EMOJI_GROUPS.flatMap(([, list]) => list);
const REACTIONS = new Set([...QUICK_REACT, ...BOARD_EMOJI]);
const REACTION_INDEX = new Map();
QUICK_REACT.forEach((emoji, index) => REACTION_INDEX.set(emoji, index));
BOARD_EMOJI.forEach((emoji, index) => {
  if (!REACTION_INDEX.has(emoji)) REACTION_INDEX.set(emoji, QUICK_REACT.length + index);
});
const CAT_IDS = new Set(CAT_PRESETS.map((item) => item.id));
const ENTRY_KEY = 'nook-entry';
const HANDOFF_KEY = 'nook-resume';
const PICTURE_DB = 'nook-picture';
const PICTURE_FILE = 'nook-picture.png';
const COLO_FILE = 'nook-colosseum.json';
const GIF_HOST = 'gifjif.com';
const loadedBuild = document.querySelector('meta[name="nook-build"]')?.content || '';

const door = document.querySelector('#door');
const doorForm = document.querySelector('#door-form');
const nameInput = document.querySelector('#name');
const wordLabel = document.querySelector('#word-label');
const wordLabelText = document.querySelector('#word-label-text');
const wordInput = document.querySelector('#room-word');
const comeIn = document.querySelector('#come-in');
const waiting = document.querySelector('#waiting');
const doorError = document.querySelector('#door-error');
const codeLine = document.querySelector('#code-line');
const codeWord = document.querySelector('#code-word');
const copyCode = document.querySelector('#copy-code');
const linkLine = document.querySelector('#link-line');
const publicLinkEl = document.querySelector('#public-link');
const copyLink = document.querySelector('#copy-link');
const room = document.querySelector('#room');
const messages = document.querySelector('#messages');
const olderPage = document.querySelector('#older-page');
const newerPage = document.querySelector('#newer-page');
const pageLabel = document.querySelector('#page-label');
const presence = document.querySelector('#presence');
const typingLine = document.querySelector('#typing');
const composer = document.querySelector('#composer');
const text = document.querySelector('#text');
const fileInput = document.querySelector('#file');
const stagedBox = document.querySelector('#staged');
const composerError = document.querySelector('#composer-error');
const drawer = document.querySelector('#drawer');
const stickerPane = document.querySelector('#sticker-pane');
const stickerGrid = document.querySelector('#sticker-grid');
const stickersBtn = document.querySelector('#stickers-btn');
const gifPane = document.querySelector('#gif-pane');
const gifQuery = document.querySelector('#gif-query');
const gifStatus = document.querySelector('#gif-status');
const gifGrid = document.querySelector('#gif-grid');
const replyingBox = document.querySelector('#replying');
const replyingLabel = document.querySelector('#replying-label');
const replyingSnippet = document.querySelector('#replying-snippet');
const replyCancel = document.querySelector('#reply-cancel');
const catChoices = document.querySelector('#cat-choices');
const catPick = document.querySelector('#cat-pick');
const catSkip = document.querySelector('#cat-skip');
const ownChoice = document.querySelector('#own-choice');
const ownFileBtn = document.querySelector('#own-file-btn');
const ownFile = document.querySelector('#own-file');
const folderLine = document.querySelector('#folder-line');
const folderBtn = document.querySelector('#folder-btn');
const folderHint = document.querySelector('#folder-hint');
const folderAsk = document.querySelector('#folder-ask');
const folderAllow = document.querySelector('#folder-allow');
const updateToast = document.querySelector('#update-toast');
const emojiBoard = document.querySelector('#emoji-board');
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

let hostToken = '';
let hostCode = '';
let publicLink = '';
let linkTimer = 0;
let doorMode = 'door';
let doorTimer = 0;
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
let replying = null;
let gifSearch = false;
let gifTimer = 0;
let gifAbort = null;
let audioCtx = null;
const reactionBusy = new Set();
const reactionQueue = [];
const rememberedCats = new Map();
const rememberedPhotos = new Map();
let chosenCat = '';
let chosenPhoto = null;
let keptPhoto = null;
let folderHandle = null;
let folderAsked = false;
let keptPreview = '';
let updateSeen = false;
let boardMessage = null;
const seen = new Set();
const onScreen = [];
const feed = [];
let viewPage = 0;
let following = true;

function takeHostToken() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  const fromHash = hash.startsWith('h=') ? hash.slice(2) : '';
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('h') || '';
  let tokenValue = '';
  try {
    tokenValue = decodeURIComponent(fromHash || fromQuery).trim();
  } catch {
    tokenValue = '';
  }
  if (location.hash || fromQuery) {
    params.delete('h');
    const search = params.toString();
    history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}`);
  }
  hostToken = tokenValue;
}

takeHostToken();

function colourFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0] || '').join('').toUpperCase();
}

function catFor(id) {
  const cat = rememberedCats.get(id) || '';
  return CAT_IDS.has(cat) ? cat : '';
}

function photoUrl(key, b64) {
  if (!key) return '';
  if (!b64) {
    const prev = rememberedPhotos.get(key);
    if (prev) URL.revokeObjectURL(prev.url);
    rememberedPhotos.delete(key);
    return '';
  }
  const prev = rememberedPhotos.get(key);
  if (prev && prev.b64 === b64) return prev.url;
  if (prev) URL.revokeObjectURL(prev.url);
  let bytes;
  try { bytes = b64ToBytes(b64); } catch { return ''; }
  const type = bytes[0] === 0x89 ? 'image/png' : 'image/jpeg';
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  rememberedPhotos.set(key, { b64, url });
  return url;
}

function photoFor(id) {
  return rememberedPhotos.get(id)?.url || '';
}

function avatar(name, { small = false, cat = '', photo = '' } = {}) {
  const el = document.createElement('span');
  el.className = 'avatar';
  el.setAttribute('aria-hidden', 'true');
  if (small) el.dataset.small = '1';
  if (photo) {
    el.classList.add('is-photo');
    const img = document.createElement('img');
    img.alt = '';
    img.src = photo;
    el.append(img);
    return el;
  }
  const portrait = CAT_IDS.has(cat) ? catPortrait(cat) : '';
  if (portrait) {
    el.classList.add('is-cat');
    el.innerHTML = portrait;
    return el;
  }
  const [bg, fg] = colourFor(name);
  el.style.background = bg;
  el.style.color = fg;
  el.textContent = initials(name);
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
  if (message.gif) return 'sent a GIF';
  if (message.sticker) return 'sent a sticker';
  if (message.attachment) return 'sent a file';
  return 'sent a note';
}

function snippetFor(message) {
  return preview(message).replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
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

function pageCount() {
  return Math.max(1, Math.ceil(feed.length / PAGE_SIZE));
}

function renderNotice(text) {
  const li = document.createElement('li');
  li.className = 'notice';
  li.textContent = text;
  messages.append(li);
}

function paintPage({ stick = false, reset = false } = {}) {
  const count = pageCount();
  if (following) viewPage = count - 1;
  if (viewPage < 0) viewPage = 0;
  if (viewPage > count - 1) viewPage = count - 1;
  const slice = feed.slice(viewPage * PAGE_SIZE, viewPage * PAGE_SIZE + PAGE_SIZE);
  const previous = messages.scrollTop;
  messages.replaceChildren();
  if (!slice.length) showEmpty();
  else {
    for (const item of slice) {
      if (item.kind === 'notice') renderNotice(item.text);
      else renderMessage(item);
    }
  }
  olderPage.disabled = viewPage <= 0;
  newerPage.disabled = viewPage >= count - 1;
  pageLabel.textContent = `${viewPage + 1} of ${count}`;
  if (reset) messages.scrollTop = viewPage === count - 1 ? messages.scrollHeight : 0;
  else if (stick) messages.scrollTop = messages.scrollHeight;
  else messages.scrollTop = previous;
}

function cleanReply(reply) {
  if (!reply || typeof reply !== 'object') return null;
  const id = Number(reply.id);
  if (!Number.isInteger(id) || id < 1) return null;
  const name = String(reply.name || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name) return null;
  const snippet = String(reply.snippet || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return { id, name, snippet };
}

function motionUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { return ''; }
  if (url.protocol !== 'https:' || url.hostname !== GIF_HOST) return '';
  if (url.username || url.password || url.port) return '';
  if (url.pathname.length > 240 || /poster/i.test(url.pathname)) return '';
  if (!/\.(gif|mp4)$/i.test(url.pathname)) return '';
  return `${url.origin}${url.pathname}`;
}

function appendMotion(parent, url) {
  const safe = motionUrl(url);
  if (!safe) return;
  if (/\.mp4$/i.test(safe)) {
    const video = document.createElement('video');
    video.className = 'gif';
    video.src = safe;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.referrerPolicy = 'no-referrer';
    video.setAttribute('aria-label', 'GIF');
    parent.append(video);
    return;
  }
  const img = document.createElement('img');
  img.className = 'gif';
  img.alt = 'GIF';
  img.referrerPolicy = 'no-referrer';
  img.src = safe;
  parent.append(img);
}

function reactionNames(ids) {
  return ids.map((id) => rememberedNames.get(id) || 'Someone').join(', ');
}

function reactionEntries(message) {
  const bag = message.reactions || {};
  return Object.keys(bag)
    .filter((emoji) => REACTIONS.has(emoji) && Array.isArray(bag[emoji]) && bag[emoji].length)
    .sort((a, b) => (REACTION_INDEX.get(a) ?? 9999) - (REACTION_INDEX.get(b) ?? 9999))
    .map((emoji) => [emoji, bag[emoji]]);
}

function reacted(message, emoji, who = memberId) {
  const list = message.reactions && message.reactions[emoji];
  return Array.isArray(list) && list.includes(who);
}

function applyReaction(message, emoji, who, on) {
  if (!REACTIONS.has(emoji) || !who) return;
  if (!message.reactions) message.reactions = {};
  const list = message.reactions[emoji] ? message.reactions[emoji].slice() : [];
  const at = list.indexOf(who);
  if (on && at < 0) list.push(who);
  if (!on && at >= 0) list.splice(at, 1);
  if (list.length) message.reactions[emoji] = list;
  else delete message.reactions[emoji];
}

function scrollToMessage(id) {
  const el = messages.querySelector(`li[data-id="${CSS.escape(String(id))}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1200);
}

function paintReplying() {
  if (!replying) {
    replyingBox.hidden = true;
    replyingLabel.textContent = '';
    replyingSnippet.textContent = '';
    return;
  }
  replyingBox.hidden = false;
  replyingLabel.textContent = `Replying to ${replying.name}`;
  replyingSnippet.textContent = replying.snippet;
}

function replyFields() {
  if (!replying) return null;
  return { id: replying.id, name: replying.name, snippet: replying.snippet };
}

function clearReply() {
  replying = null;
  paintReplying();
}

function startReply(message) {
  replying = { id: message.id, name: message.name, snippet: snippetFor(message) };
  paintReplying();
  drawer.hidden = true;
  stickersBtn.setAttribute('aria-expanded', 'false');
  text.focus();
}

function renderReacts(message) {
  const row = document.createElement('div');
  row.className = 'reacts';
  for (const [emoji, ids] of reactionEntries(message)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'react-chip';
    if (ids.includes(memberId)) btn.classList.add('mine');
    btn.dataset.emoji = emoji;
    btn.tabIndex = -1;
    btn.textContent = `${emoji} ${ids.length}`;
    const names = reactionNames(ids);
    btn.title = names;
    btn.setAttribute('aria-label', `${emoji}, ${ids.length}, ${names}`);
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleReaction(message, emoji);
    });
    row.append(btn);
  }
  return row;
}

function syncReactionControls(message) {
  const li = messages.querySelector(`li[data-id="${CSS.escape(String(message.id))}"]`);
  if (!li) return;
  const next = renderReacts(message);
  const old = li.querySelector('.reacts');
  if (old) old.replaceWith(next);
  else {
    const time = li.querySelector('time');
    if (time) time.before(next);
    else li.querySelector('.bubble').append(next);
  }
  const focused = li.matches(':focus-within');
  for (const btn of next.querySelectorAll('button')) btn.tabIndex = focused ? 0 : -1;
  for (const btn of li.querySelectorAll('.actions button[data-emoji]')) {
    const on = reacted(message, btn.dataset.emoji);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('on', on);
  }
  if (boardMessage === message) syncBoardPressed(message);
}

function addReactButton(parent, message, emoji) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.emoji = emoji;
  btn.tabIndex = -1;
  btn.textContent = emoji;
  btn.setAttribute('aria-label', `React with ${emoji}`);
  btn.setAttribute('aria-pressed', reacted(message, emoji) ? 'true' : 'false');
  if (reacted(message, emoji)) btn.classList.add('on');
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleReaction(message, emoji);
  });
  parent.append(btn);
  return btn;
}

function bindNote(li, message) {
  li.tabIndex = 0;
  const bar = document.createElement('div');
  bar.className = 'actions';
  for (const emoji of QUICK_REACT) addReactButton(bar, message, emoji);
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'more-react';
  more.tabIndex = -1;
  more.textContent = '＋';
  more.setAttribute('aria-label', 'More reactions');
  more.setAttribute('aria-expanded', 'false');
  more.addEventListener('click', (event) => {
    event.stopPropagation();
    openEmojiBoard(more, message);
  });
  const reply = document.createElement('button');
  reply.type = 'button';
  reply.className = 'reply-btn';
  reply.tabIndex = -1;
  reply.textContent = 'Reply';
  reply.addEventListener('click', (event) => {
    event.stopPropagation();
    startReply(message);
  });
  bar.append(more, reply);
  li.append(bar);
  const buttons = () => [...li.querySelectorAll('.actions button, .react-chip')];
  li.addEventListener('focusin', () => {
    for (const btn of buttons()) btn.tabIndex = 0;
  });
  li.addEventListener('focusout', (event) => {
    if (li.contains(event.relatedTarget) || emojiBoard.contains(event.relatedTarget)) return;
    for (const btn of buttons()) btn.tabIndex = -1;
  });
  li.querySelector('.bubble').addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, a')) return;
    li.focus({ preventScroll: true });
  });
}

const EMBED_CAP = 4;
const PICTURE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const QUIET_HOSTS = [
  'twitter.com',
  'x.com',
  't.co',
  'facebook.com',
  'fb.com',
  'fb.watch',
  'reddit.com',
  'redd.it',
  'v.redd.it',
  'twitch.tv',
  'dailymotion.com',
  'dai.ly',
  'streamable.com',
];

function hostEnds(url, name) {
  const host = url.hostname.toLowerCase();
  return host === name || host.endsWith(`.${name}`);
}

function pathExt(pathname) {
  const leaf = pathname.split('/').filter(Boolean).pop() || '';
  const dot = leaf.lastIndexOf('.');
  if (dot < 0) return '';
  return leaf.slice(dot).toLowerCase();
}

function trimLinkTail(raw) {
  let url = raw;
  while (url) {
    const last = url.at(-1);
    const opens = url.split('(').length - 1;
    const closes = url.split(')').length - 1;
    if (last === ')' && opens < closes) {
      url = url.slice(0, -1);
      continue;
    }
    if (/[.,;:!?\]]$/.test(last)) {
      url = url.slice(0, -1);
      continue;
    }
    break;
  }
  return url;
}

function noteParts(text) {
  const parts = [];
  const re = /https:\/\/[^\s<>"']+/gi;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const trimmed = trimLinkTail(match[0]);
    if (!trimmed) continue;
    parts.push({ kind: 'text', value: text.slice(last, match.index) });
    parts.push({ kind: 'link', value: trimmed });
    last = match.index + trimmed.length;
  }
  parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

function youtubePlan(url) {
  const host = url.hostname.toLowerCase();
  const known = host === 'youtu.be' || host === 'www.youtu.be'
    || hostEnds(url, 'youtube.com') || hostEnds(url, 'youtube-nocookie.com');
  if (!known) return null;
  let id = '';
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (url.searchParams.get('v')) {
    id = url.searchParams.get('v');
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'v') {
      id = parts[1] || '';
    }
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return { mode: 'no' };
  const shorts = url.pathname.toLowerCase().includes('/shorts/');
  return {
    mode: 'play',
    shape: shorts ? 'portrait' : 'wide',
    src: `https://www.youtube.com/embed/${id}`,
  };
}

function vimeoPlan(url) {
  if (!hostEnds(url, 'vimeo.com')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  let id = '';
  let hash = '';
  if (url.hostname.toLowerCase() === 'player.vimeo.com') {
    if (parts[0] === 'video') id = parts[1] || '';
  } else {
    for (let i = 0; i < parts.length; i += 1) {
      if (/^\d{5,12}$/.test(parts[i])) {
        id = parts[i];
        const next = parts[i + 1] || '';
        if (/^[A-Za-z0-9]{4,20}$/.test(next)) hash = next;
        break;
      }
    }
  }
  if (!/^\d{5,12}$/.test(id)) return { mode: 'no' };
  const extra = hash ? `?h=${hash}` : '';
  return {
    mode: 'play',
    shape: 'wide',
    src: `https://player.vimeo.com/video/${id}${extra}`,
  };
}

function tiktokPlan(url) {
  const host = url.hostname.toLowerCase();
  if (host !== 'vm.tiktok.com' && host !== 'vt.tiktok.com' && !hostEnds(url, 'tiktok.com')) return null;
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return { mode: 'no' };
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 't') return { mode: 'no' };
  let id = '';
  const at = parts.indexOf('video');
  if (at >= 0) id = parts[at + 1] || '';
  else if (parts[0] === 'embed' && parts[1] === 'v2') id = parts[2] || '';
  else if (parts[0] === 'player' && parts[1] === 'v1') id = parts[2] || '';
  if (!/^\d{8,22}$/.test(id)) return { mode: 'no' };
  return {
    mode: 'play',
    shape: 'portrait',
    src: `https://www.tiktok.com/embed/v2/${id}`,
  };
}

function instagramPlan(url) {
  if (!hostEnds(url, 'instagram.com')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const head = parts[0] || '';
  const code = parts[1] || '';
  if ((head === 'p' || head === 'reel' || head === 'reels') && /^[A-Za-z0-9_-]{5,30}$/.test(code)) {
    const path = head === 'reels' ? 'reel' : head;
    return {
      mode: 'play',
      shape: head === 'p' ? 'post' : 'portrait',
      src: `https://www.instagram.com/${path}/${code}/embed/captioned/`,
    };
  }
  return { mode: 'no' };
}

function filePlan(url) {
  const ext = pathExt(url.pathname);
  if (PICTURE_EXT.has(ext)) return { mode: 'picture', src: url.href };
  if (VIDEO_EXT.has(ext)) return { mode: 'video', src: url.href };
  return null;
}

function quietHost(url) {
  return QUIET_HOSTS.some((name) => hostEnds(url, name));
}

function mediaPlan(url) {
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) {
    return { mode: 'link' };
  }
  return youtubePlan(url) || vimeoPlan(url) || tiktokPlan(url) || instagramPlan(url) || filePlan(url)
    || (quietHost(url) ? { mode: 'no' } : { mode: 'link' });
}

function unplayableLine() {
  const line = document.createElement('p');
  line.className = 'unplayable';
  line.textContent = 'This will not play inside the page.';
  return line;
}

function playerSrc(src) {
  let url;
  try { url = new URL(src); } catch { return ''; }
  if (url.protocol !== 'https:' || url.username || url.password) return '';
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (host === 'www.youtube.com' && /^\/embed\/[A-Za-z0-9_-]{11}\/?$/.test(path)) return url.href;
  if (host === 'player.vimeo.com' && /^\/video\/\d{5,12}\/?$/.test(path)) return url.href;
  if (host === 'www.tiktok.com' && /^\/embed\/v2\/\d{8,22}\/?$/.test(path)) return url.href;
  if (host === 'www.instagram.com' && /^\/(?:p|reel)\/[A-Za-z0-9_-]{5,30}\/embed\/captioned\/?$/.test(path)) {
    return url.href;
  }
  return '';
}

function appendPlay(parent, plan) {
  const src = playerSrc(plan.src);
  if (!src) {
    parent.append(unplayableLine());
    return;
  }
  const box = document.createElement('div');
  box.className = plan.shape && plan.shape !== 'wide' ? `embed ${plan.shape}` : 'embed';
  const frame = document.createElement('iframe');
  frame.title = 'Video';
  frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  frame.setAttribute('allowfullscreen', '');
  frame.addEventListener('load', () => {
    let blocked = false;
    try {
      blocked = frame.contentWindow.location.href === 'about:blank';
    } catch {
      blocked = false;
    }
    if (blocked) box.replaceWith(unplayableLine());
  });
  frame.src = src;
  box.append(frame);
  parent.append(box);
}

function appendPicture(parent, src) {
  const box = document.createElement('div');
  box.className = 'embed';
  const img = document.createElement('img');
  img.className = 'embed-pic';
  img.alt = 'Picture';
  img.referrerPolicy = 'no-referrer';
  img.src = src;
  box.append(img);
  parent.append(box);
}

function appendClip(parent, src) {
  const box = document.createElement('div');
  box.className = 'embed';
  const video = document.createElement('video');
  video.className = 'clip';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = src;
  video.referrerPolicy = 'no-referrer';
  video.addEventListener('play', () => {
    video.muted = false;
  });
  box.append(video);
  parent.append(box);
}

function appendNote(bubble, text) {
  const p = document.createElement('p');
  const previews = [];
  let players = 0;
  for (const part of noteParts(text)) {
    if (part.kind === 'text') {
      p.append(document.createTextNode(part.value));
      continue;
    }
    let url;
    try { url = new URL(part.value); } catch {
      p.append(document.createTextNode(part.value));
      continue;
    }
    if (url.protocol !== 'https:' || url.username || url.password) {
      p.append(document.createTextNode(part.value));
      continue;
    }
    const link = document.createElement('a');
    link.className = 'note-link';
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = part.value;
    p.append(link);
    const plan = mediaPlan(url);
    if (plan.mode === 'no') {
      const line = document.createElement('span');
      line.className = 'unplayable';
      line.textContent = 'This will not play inside the page.';
      p.append(line);
    } else if (plan.mode !== 'link' && players < EMBED_CAP) {
      players += 1;
      previews.push(plan);
    }
  }
  bubble.append(p);
  for (const plan of previews) {
    if (plan.mode === 'picture') appendPicture(bubble, plan.src);
    else if (plan.mode === 'video') appendClip(bubble, plan.src);
    else appendPlay(bubble, plan);
  }
}

function renderMessage(message) {
  const empty = messages.querySelector('.empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  li.className = message.mine ? 'mine' : 'theirs';
  li.dataset.id = String(message.id);
  if (!message.mine) {
    li.append(avatar(message.name, { cat: catFor(message.member), photo: photoFor(message.member) }));
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (!message.mine) {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = message.name;
    bubble.append(who);
  }
  if (message.reply) {
    const quote = document.createElement('button');
    quote.type = 'button';
    quote.className = 'quote';
    const label = document.createElement('span');
    label.className = 'quote-name';
    label.textContent = `Replying to ${message.reply.name}`;
    const snip = document.createElement('span');
    snip.className = 'quote-snip';
    snip.textContent = message.reply.snippet;
    quote.append(label, snip);
    quote.addEventListener('click', (event) => {
      event.stopPropagation();
      scrollToMessage(message.reply.id);
    });
    bubble.append(quote);
  }
  if (message.locked) {
    const p = document.createElement('p');
    p.textContent = 'Locked.';
    bubble.append(p);
  } else if (message.text) {
    appendNote(bubble, message.text);
  }
  if (message.sticker) {
    const img = document.createElement('img');
    img.className = 'sticker';
    img.alt = 'Sticker';
    img.src = `/stickers/${encodeURIComponent(message.sticker)}`;
    bubble.append(img);
  }
  if (message.gif) appendMotion(bubble, message.gif);
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
  if (!message.locked) bubble.append(renderReacts(message));
  const time = document.createElement('time');
  time.dateTime = new Date(message.at).toISOString();
  time.textContent = formatTime(message.at);
  bubble.append(time);
  li.append(bubble);
  if (!message.locked) bindNote(li, message);
  messages.append(li);
}

function takeMessages(list, notify) {
  const stick = following && (nearBottom() || !!messages.querySelector('.empty'));
  const fresh = [];
  for (const message of list) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    if (message.id > lastId) lastId = message.id;
    fresh.push(message);
    onScreen.push(message);
    feed.push(message);
  }
  if (fresh.length || !feed.length) paintPage({ stick });
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
    const photo = person.photo ? photoUrl(`name:${person.name}`, person.photo) : '';
    chip.append(avatar(person.name, { small: true, cat: person.cat || '', photo }));
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

function stopLinkWatch() {
  if (!linkTimer) return;
  clearTimeout(linkTimer);
  linkTimer = 0;
}

async function watchPublicLink() {
  stopLinkWatch();
  try {
    const res = await fetch('/api/public-link');
    const data = await res.json();
    if (data.url) {
      publicLink = data.url;
      publicLinkEl.textContent = data.url;
      copyLink.hidden = false;
      return;
    }
    copyLink.hidden = true;
    publicLink = '';
    publicLinkEl.textContent = data.failed
      ? 'There is no public link yet.'
      : 'The public link is on its way.';
  } catch {
    publicLinkEl.textContent = 'The public link is on its way.';
  }
  linkTimer = setTimeout(watchPublicLink, POLL_MS);
}

function showHostCode(word) {
  hostCode = word;
  codeWord.textContent = word;
  copyCode.textContent = 'Copy';
  codeLine.hidden = false;
  linkLine.hidden = false;
  publicLinkEl.textContent = 'The public link is on its way.';
  copyLink.hidden = true;
  watchPublicLink();
}

function colosseumHooks() {
  return {
    getToken: () => token,
    getMemberId: () => memberId,
    getName: () => myName,
    getGroupKey: () => groupKey,
    people: () => members.map((member) => ({
      id: member.id,
      name: rememberedNames.get(member.id) || member.name,
      photo: photoFor(member.id),
    })),
    readCopy: readColosseumCopy,
    writeCopy: writeColosseumCopy,
  };
}

function showRoom() {
  door.hidden = true;
  room.hidden = false;
  following = true;
  paintPage({ stick: true, reset: true });
  text.focus();
  mountColosseum(colosseumHooks());
}

function backToDoor(message) {
  settleColosseum();
  stopLinkWatch();
  hostCode = '';
  publicLink = '';
  codeWord.textContent = '';
  codeLine.hidden = true;
  linkLine.hidden = true;
  copyLink.hidden = true;
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
  feed.length = 0;
  viewPage = 0;
  following = true;
  replying = null;
  paintReplying();
  reactionBusy.clear();
  reactionQueue.length = 0;
  rememberedCats.clear();
  for (const item of rememberedPhotos.values()) URL.revokeObjectURL(item.url);
  rememberedPhotos.clear();
  updateToast.hidden = true;
  closeEmojiBoard();
  if (gifAbort) gifAbort.abort();
  gifQuery.value = '';
  gifGrid.replaceChildren();
  lastId = 0;
  messages.replaceChildren();
  pageLabel.textContent = '1 of 1';
  olderPage.disabled = true;
  newerPage.disabled = true;
  clearTimeout(timer);
  room.hidden = true;
  door.hidden = false;
  showGuestDoor();
  doorError.textContent = message || '';
}

function transcript() {
  if (!onScreen.length) return 'The room is quiet.\n';
  return `${onScreen.map((message) => {
    const lines = [`${message.name} — ${formatTime(message.at)}`];
    if (message.reply) lines.push(`Replying to ${message.reply.name}: ${message.reply.snippet}`);
    if (message.text) lines.push(message.text);
    if (message.gif) lines.push('[GIF]');
    if (message.sticker) {
      const label = message.sticker.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      lines.push(`[sticker: ${label}]`);
    }
    if (message.attachment) lines.push(`[file: ${message.attachment.name}]`);
    const reacts = reactionEntries(message);
    if (reacts.length) lines.push(reacts.map(([emoji, ids]) => `${emoji} ${ids.length}`).join('  '));
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
    feed.push({ kind: 'notice', text: line });
    paintPage({ stick: following && (nearBottom() || !!messages.querySelector('.empty')) });
  }
}

function stopDoorWait() {
  if (!doorTimer) return;
  clearTimeout(doorTimer);
  doorTimer = 0;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('slow')), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(id); resolve(value); },
      (error) => { clearTimeout(id); reject(error); },
    );
  });
}

function showWaiting() {
  doorMode = 'wait';
  waiting.hidden = false;
  doorForm.hidden = true;
  wordInput.required = false;
}

function showHostSetter() {
  doorMode = 'host';
  waiting.hidden = true;
  doorForm.hidden = false;
  wordLabel.hidden = false;
  wordLabelText.textContent = 'Set a code word for this room';
  wordInput.required = true;
  wordInput.placeholder = '';
  comeIn.textContent = 'Set the code and come in';
}

function showGuestDoor() {
  doorMode = 'door';
  waiting.hidden = true;
  doorForm.hidden = false;
  wordLabel.hidden = false;
  wordLabelText.textContent = 'Room word';
  wordInput.required = true;
  wordInput.placeholder = '';
  comeIn.textContent = 'Come in';
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
    if (seenCipher.has(key)) return { drop: true };
    seenCipher.add(key);
    if (Object.prototype.hasOwnProperty.call(payload, 'reaction')) {
      const raw = payload.reaction;
      const target = raw && typeof raw === 'object' ? Number(raw.id) : NaN;
      const emoji = raw && typeof raw.emoji === 'string' ? raw.emoji : '';
      if (!Number.isInteger(target) || target < 1 || !REACTIONS.has(emoji)) return { drop: true };
      return {
        kind: 'reaction',
        target,
        emoji,
        on: raw.on === true,
        memberId: parcel.memberId,
      };
    }
    const message = {
      id: parcel.id,
      name,
      text: String(payload.text || ''),
      sticker: payload.sticker || null,
      member: parcel.memberId,
      gif: motionUrl(payload.gif) || null,
      reply: cleanReply(payload.reply),
      reactions: {},
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

function applyIncoming(reaction) {
  const message = feed.find((item) => item.kind !== 'notice' && item.id === reaction.target);
  if (!message || message.locked) {
    if (!message && reactionQueue.length < 200) reactionQueue.push(reaction);
    return;
  }
  applyReaction(message, reaction.emoji, reaction.memberId, reaction.on);
  syncReactionControls(message);
  if (reaction.memberId !== memberId) {
    const who = rememberedNames.get(reaction.memberId) || 'Someone';
    live.textContent = reaction.on ? `${who} reacted ${reaction.emoji}` : `${who} removed a reaction`;
  }
}

function flushReactions() {
  if (!reactionQueue.length) return;
  const queued = reactionQueue.splice(0);
  for (const reaction of queued) applyIncoming(reaction);
}

async function revealParcels(list, notify) {
  const ready = [];
  const reactions = [];
  const hold = (parcel) => pending.some((item) => item.id === parcel.id);
  const takeParcel = async (parcel) => {
    if (seen.has(parcel.id) || hold(parcel)) return;
    if (parcel.id > lastId) lastId = parcel.id;
    if (!groupKey) {
      pending.push(parcel);
      return;
    }
    const message = await openParcel(parcel);
    if (seen.has(parcel.id)) return;
    if (message?.drop) seen.add(parcel.id);
    else if (message?.kind === 'reaction') {
      seen.add(parcel.id);
      reactions.push(message);
    } else if (message) ready.push(message);
  };
  for (const parcel of list) await takeParcel(parcel);
  if (groupKey && pending.length) {
    const queuedParcels = pending.splice(0);
    for (const parcel of queuedParcels) await takeParcel(parcel);
  }
  if (ready.length) takeMessages(ready, notify);
  flushReactions();
  for (const reaction of reactions) applyIncoming(reaction);
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
  let facesChanged = false;
  for (const member of members) {
    rememberedNames.set(member.id, member.name);
    const cat = CAT_IDS.has(member.cat) ? member.cat : '';
    if ((rememberedCats.get(member.id) || '') !== cat) {
      if (cat) rememberedCats.set(member.id, cat);
      else rememberedCats.delete(member.id);
      facesChanged = true;
    }
    const prevPhoto = rememberedPhotos.get(member.id)?.b64 || '';
    const nextPhoto = typeof member.photo === 'string' ? member.photo : '';
    if (prevPhoto !== nextPhoto) {
      photoUrl(member.id, nextPhoto);
      facesChanged = true;
    }
  }
  await noteWraps(data.wraps);
  await ensureGroupKey();
  await revealParcels(data.messages || [], !first && armed);
  if (facesChanged) paintPage();
  paintPresence(data);
  paintTyping(data.typing);
  if (!updateSeen) checkBuild();
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

async function sealAndSend(payload, onSent) {
  if (!groupKey) {
    composerError.textContent = 'The room is not locked yet.';
    return null;
  }
  sendSeq += 1;
  const n = sendSeq;
  let res;
  try {
    const sealed = await encryptJson(groupKey, { ...payload, from: memberId, n });
    res = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
      },
      body: JSON.stringify(sealed),
    });
  } catch {
    composerError.textContent = 'That note did not send.';
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    backToDoor('Come in again.');
    return null;
  }
  if (!res.ok) {
    composerError.textContent = data.error || 'That note did not send.';
    return null;
  }
  composerError.textContent = '';
  if (data.message) {
    seenCipher.add(parcelKey(data.message));
    const used = seenSeq.get(memberId) || new Set();
    used.add(n);
    seenSeq.set(memberId, used);
    if (onSent) onSent(data.message);
  }
  refresh(false);
  return data.message || null;
}

async function postMessage(payload, local) {
  const sent = await sealAndSend(payload, (row) => {
    takeMessages([{
      id: row.id,
      name: myName,
      text: local.text || '',
      sticker: local.sticker || null,
    member: memberId,
    gif: local.gif || null,
    reply: local.reply || null,
      reactions: {},
      attachment: local.attachment || null,
      at: row.at,
      mine: true,
    }], false);
  });
  return Boolean(sent);
}

async function toggleReaction(message, emoji) {
  if (!REACTIONS.has(emoji) || message.locked) return;
  const key = `${message.id}:${emoji}`;
  if (reactionBusy.has(key)) return;
  if (!groupKey) {
    composerError.textContent = 'The room is not locked yet.';
    return;
  }
  reactionBusy.add(key);
  const on = !reacted(message, emoji);
  applyReaction(message, emoji, memberId, on);
  syncReactionControls(message);
  const sent = await sealAndSend({ reaction: { id: message.id, emoji, on } });
  if (!sent) {
    applyReaction(message, emoji, memberId, !on);
    syncReactionControls(message);
  }
  reactionBusy.delete(key);
}

async function sendSticker(name) {
  drawer.hidden = true;
  stickersBtn.setAttribute('aria-expanded', 'false');
  const reply = replyFields();
  clearReply();
  const payload = { text: '', sticker: name, attachment: null };
  if (reply) payload.reply = reply;
  await postMessage(payload, { sticker: name, reply });
}

function gifChoice(item) {
  const media = item && item.media;
  if (!media) return '';
  const gif = motionUrl(media.gif);
  if (gif && /\.gif$/i.test(gif) && !/tiny\.gif$/i.test(gif)) return gif;
  const video = motionUrl(media.mp4);
  if (video && /\.mp4$/i.test(video)) return video;
  return '';
}

async function sendGif(url) {
  const safe = motionUrl(url);
  if (!safe) return;
  drawer.hidden = true;
  stickersBtn.setAttribute('aria-expanded', 'false');
  const reply = replyFields();
  clearReply();
  const payload = { text: '', sticker: null, gif: safe, attachment: null };
  if (reply) payload.reply = reply;
  await postMessage(payload, { gif: safe, reply });
}

async function runGifSearch(query) {
  if (gifAbort) gifAbort.abort();
  const q = String(query || '').trim().slice(0, 40);
  gifGrid.replaceChildren();
  if (!q) {
    gifStatus.textContent = 'Type a word.';
    return;
  }
  const ctrl = new AbortController();
  gifAbort = ctrl;
  gifStatus.textContent = 'Searching…';
  try {
    const url = new URL(`https://${GIF_HOST}/api/search`);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '12');
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('search failed');
    const data = await res.json();
    if (gifAbort !== ctrl) return;
    const items = [];
    const seenUrl = new Set();
    for (const item of data.items || []) {
      const href = gifChoice(item);
      if (!href || seenUrl.has(href)) continue;
      seenUrl.add(href);
      items.push(href);
    }
    gifGrid.replaceChildren();
    if (!items.length) {
      gifStatus.textContent = 'Nothing matched.';
      return;
    }
    gifStatus.textContent = '';
    for (const href of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sticker-btn';
      button.setAttribute('aria-label', 'Send this GIF');
      appendMotion(button, href);
      button.addEventListener('click', () => sendGif(href));
      gifGrid.append(button);
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    if (gifAbort !== ctrl) return;
    gifGrid.replaceChildren();
    gifStatus.textContent = 'GIF search did not answer.';
  }
}

function enableGif() {
  gifSearch = true;
  stickersBtn.textContent = 'GIF';
  stickerPane.hidden = true;
  gifPane.hidden = false;
}

async function probeGif() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`https://${GIF_HOST}/api/search?q=hello&limit=1`, { signal: ctrl.signal });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.items || []).some((item) => gifChoice(item));
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
  let chosen = '';
  let body = {};
  const setting = doorMode === 'host' && hostToken;
  try {
    identity = await createIdentity();
    chosen = wordInput.value.trim();
    body = {
      name: nameInput.value,
      publicKey: identity.publicKey,
    };
    if (chosenPhoto) body.photo = await blobToB64(chosenPhoto);
    else if (chosenCat) body.cat = chosenCat;
    if (setting) {
      body.hostToken = hostToken;
      body.word = chosen;
    } else {
      body.roomWord = chosen;
    }
    res = await fetch(setting ? '/api/host-code' : '/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  if (chosenPhoto) photoUrl(memberId, body.photo);
  else if (chosenCat) rememberedCats.set(memberId, chosenCat);
  saveEntry(myName, chosenPhoto ? 'photo' : chosenCat);
  if (doorMode === 'host' && chosen) showHostCode(chosen);
  hostToken = '';
  wordInput.value = '';
  showLock('');
  showRoom();
  await refresh(true);
});

composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  askNotify();
  const note = text.value.trim();
  if (!note && !staged) return;
  const reply = replyFields();
  const payload = { text: note, sticker: null, attachment: null };
  const local = { text: note, reply };
  if (reply) payload.reply = reply;
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
  clearReply();
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
  if (!open) return;
  if (gifSearch) {
    gifQuery.focus();
    if (!gifQuery.value.trim()) gifStatus.textContent = 'Type a word.';
    return;
  }
  await loadStickers();
});

gifQuery.addEventListener('input', () => {
  clearTimeout(gifTimer);
  gifTimer = setTimeout(() => runGifSearch(gifQuery.value), 300);
});

gifQuery.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  clearTimeout(gifTimer);
  runGifSearch(gifQuery.value);
});

replyCancel.addEventListener('click', () => clearReply());

document.addEventListener('click', (event) => {
  if (event.target.closest('.more-react, #emoji-board')) return;
  closeEmojiBoard();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!emojiBoard.hidden) {
    closeEmojiBoard();
    return;
  }
  if (!drawer.hidden) {
    drawer.hidden = true;
    stickersBtn.setAttribute('aria-expanded', 'false');
    return;
  }
  if (replying) clearReply();
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

olderPage.addEventListener('click', () => {
  if (viewPage <= 0) return;
  following = false;
  viewPage -= 1;
  paintPage({ reset: true });
});

newerPage.addEventListener('click', () => {
  const count = pageCount();
  if (viewPage >= count - 1) return;
  viewPage += 1;
  following = viewPage === count - 1;
  paintPage({ reset: true });
});

copyCode.addEventListener('click', async () => {
  if (!hostCode) return;
  try {
    await navigator.clipboard.writeText(hostCode);
    copyCode.textContent = 'Copied';
  } catch {
    copyCode.textContent = 'Copy';
  }
});

copyLink.addEventListener('click', async () => {
  if (!publicLink) return;
  try {
    await navigator.clipboard.writeText(publicLink);
    copyLink.textContent = 'Copied';
  } catch {
    copyLink.textContent = 'Copy';
  }
});

document.querySelector('#copy-chat').addEventListener('click', () => { copyChat(); });
document.querySelector('#save-note').addEventListener('click', () => { saveNote(); });

try {
  mountWhimsy();
} catch {
  // The door still works if an overlay fails to start.
}

function closeEmojiBoard() {
  emojiBoard.hidden = true;
  boardMessage = null;
  for (const btn of document.querySelectorAll('.more-react')) btn.setAttribute('aria-expanded', 'false');
}

function syncBoardPressed(message) {
  if (emojiBoard.hidden || boardMessage !== message) return;
  for (const btn of emojiBoard.querySelectorAll('button[data-emoji]')) {
    const on = reacted(message, btn.dataset.emoji);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function openEmojiBoard(anchor, message) {
  if (boardMessage === message && !emojiBoard.hidden) {
    closeEmojiBoard();
    return;
  }
  for (const btn of document.querySelectorAll('.more-react')) btn.setAttribute('aria-expanded', 'false');
  boardMessage = message;
  emojiBoard.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 16);
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (left < 8) left = 8;
  let top = rect.bottom + 6;
  if (top + 280 > window.innerHeight - 8) top = Math.max(8, rect.top - 286);
  emojiBoard.style.left = `${left}px`;
  emojiBoard.style.top = `${top}px`;
  emojiBoard.style.width = `${width}px`;
  anchor.setAttribute('aria-expanded', 'true');
  syncBoardPressed(message);
}

function buildEmojiBoard() {
  for (const [name, list] of EMOJI_GROUPS) {
    const group = document.createElement('section');
    group.className = 'emoji-group';
    const heading = document.createElement('h2');
    heading.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    for (const emoji of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-cell';
      btn.dataset.emoji = emoji;
      btn.textContent = emoji;
      btn.setAttribute('aria-label', `React with ${emoji}`);
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!boardMessage) return;
        toggleReaction(boardMessage, emoji);
      });
      grid.append(btn);
    }
    group.append(heading, grid);
    emojiBoard.append(group);
  }
}

function paintCatChoice() {
  for (const btn of catChoices.querySelectorAll('.cat-choice')) {
    btn.setAttribute('aria-pressed', !chosenPhoto && btn.dataset.cat === chosenCat ? 'true' : 'false');
  }
  ownChoice.setAttribute('aria-pressed', chosenPhoto ? 'true' : 'false');
  catSkip.setAttribute('aria-pressed', !chosenCat && !chosenPhoto ? 'true' : 'false');
}

function selectCat(id) {
  chosenCat = CAT_IDS.has(id) ? id : '';
  chosenPhoto = null;
  paintCatChoice();
}

function selectKeptPhoto() {
  if (!keptPhoto) return;
  chosenPhoto = keptPhoto;
  chosenCat = '';
  paintCatChoice();
}

function paintKeptPhoto() {
  if (keptPreview) URL.revokeObjectURL(keptPreview);
  keptPreview = '';
  ownChoice.replaceChildren();
  if (!keptPhoto) {
    ownChoice.hidden = true;
    return;
  }
  const img = document.createElement('img');
  img.alt = '';
  keptPreview = URL.createObjectURL(keptPhoto);
  img.src = keptPreview;
  ownChoice.append(img);
  ownChoice.hidden = false;
  paintCatChoice();
}

function pictureDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PICTURE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(key) {
  return pictureDb().then((db) => new Promise((resolve, reject) => {
    const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(key, value) {
  return pictureDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

async function rememberPhotoBlob(blob) {
  keptPhoto = blob;
  paintKeptPhoto();
  try { await idbSet('blob', blob); } catch { /* the folder copy can still hold it */ }
}

async function fitPicture(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const max = 96;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf3';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png || png.size > 48 * 1024) throw new Error('big');
    return png;
  } finally {
    bitmap.close();
  }
}

async function blobToB64(blob) {
  return bytesToB64(new Uint8Array(await blob.arrayBuffer()));
}

async function writeFolderPicture(blob) {
  if (!folderHandle || !blob) return;
  const handle = await folderHandle.getFileHandle(PICTURE_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  folderHint.textContent = 'Saved in that folder as nook-picture.png.';
}

async function readColosseumCopy() {
  if (!folderHandle) return '';
  try {
    const handle = await folderHandle.getFileHandle(COLO_FILE);
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return '';
  }
}

async function writeColosseumCopy(text) {
  if (!folderHandle || typeof text !== 'string') return;
  const handle = await folderHandle.getFileHandle(COLO_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function useOwnFile(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    doorError.textContent = 'That picture could not be used.';
    return;
  }
  try {
    const blob = await fitPicture(file);
    chosenPhoto = blob;
    chosenCat = '';
    await rememberPhotoBlob(blob);
    doorError.textContent = '';
    if (folderHandle) {
      try { await writeFolderPicture(blob); } catch {
        doorError.textContent = 'The folder did not keep the picture. This browser still has it.';
      }
    }
  } catch {
    doorError.textContent = 'That picture could not be used.';
  }
}

async function chooseFolder() {
  if (!window.showDirectoryPicker) return;
  try {
    folderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return;
  }
  try { await idbSet('folder', folderHandle); } catch { /* browser remember still works */ }
  folderHint.textContent = 'You can pick Desktop.';
  folderAsk.hidden = true;
  if (chosenPhoto || keptPhoto) {
    try { await writeFolderPicture(chosenPhoto || keptPhoto); } catch {
      doorError.textContent = 'The folder did not keep the picture.';
    }
  }
}

async function readFolderPicture() {
  const handle = await folderHandle.getFileHandle(PICTURE_FILE);
  const file = await handle.getFile();
  if (!file.size) return null;
  return fitPicture(file);
}

async function useFolderIfAllowed() {
  if (!folderHandle) return;
  let perm = 'prompt';
  try {
    perm = await folderHandle.queryPermission({ mode: 'readwrite' });
  } catch {
    return;
  }
  if (perm !== 'granted') return;
  try {
    const blob = await readFolderPicture();
    if (!blob) return;
    await rememberPhotoBlob(blob);
    if (chosenCat === 'photo') selectKeptPhoto();
  } catch {
    // A missing file just leaves the browser copy.
  }
}

function buildCatChoices() {
  for (const preset of CAT_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-choice';
    btn.dataset.cat = preset.id;
    btn.setAttribute('aria-label', preset.label);
    btn.innerHTML = catPortrait(preset.id);
    btn.addEventListener('click', () => selectCat(preset.id));
    catChoices.append(btn);
  }
  catSkip.addEventListener('click', () => selectCat(''));
  ownChoice.addEventListener('click', () => selectKeptPhoto());
  ownFileBtn.addEventListener('click', () => ownFile.click());
  ownFile.addEventListener('change', () => {
    const file = ownFile.files && ownFile.files[0];
    ownFile.value = '';
    if (file) useOwnFile(file);
  });
  catPick.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  catPick.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) useOwnFile(file);
  });
  if (window.showDirectoryPicker) {
    folderLine.hidden = false;
    folderBtn.addEventListener('click', () => chooseFolder());
    folderAllow.addEventListener('click', async () => {
      folderAsk.hidden = true;
      if (!folderHandle || folderAsked) return;
      folderAsked = true;
      try {
        const perm = await folderHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') await useFolderIfAllowed();
      } catch {
        // The browser copy is still there.
      }
    });
  }
}

async function prepareEntry() {
  let savedCat = '';
  try {
    const raw = localStorage.getItem(ENTRY_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const name = String(data.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
        if (name) nameInput.value = name;
        savedCat = String(data.cat || '');
      }
    }
  } catch {
    // A bad saved entry just leaves the door blank.
  }
  if (CAT_IDS.has(savedCat)) selectCat(savedCat);
  else chosenCat = savedCat === 'photo' ? 'photo' : '';
  try {
    const blob = await withTimeout(idbGet('blob'), 1200);
    if (blob instanceof Blob) await withTimeout(rememberPhotoBlob(blob), 1200);
  } catch {
    // No browser copy yet, or it took too long to read.
  }
  try {
    const handle = await withTimeout(idbGet('folder'), 1200);
    if (handle && typeof handle.getFileHandle === 'function') folderHandle = handle;
  } catch {
    folderHandle = null;
  }
  if (folderHandle) {
    let perm = 'prompt';
    try { perm = await withTimeout(folderHandle.queryPermission({ mode: 'readwrite' }), 1200); } catch { perm = 'denied'; }
    if (perm === 'granted') {
      try { await withTimeout(useFolderIfAllowed(), 1500); } catch { /* the door does not wait on the folder */ }
    } else if (perm === 'prompt') folderAsk.hidden = false;
  }
  if (chosenCat === 'photo' && keptPhoto) selectKeptPhoto();
  else if (CAT_IDS.has(chosenCat)) selectCat(chosenCat);
  else paintCatChoice();
}

function saveEntry(name, cat) {
  const choice = CAT_IDS.has(cat) ? cat : (cat === 'photo' ? 'photo' : 'skip');
  try {
    localStorage.setItem(ENTRY_KEY, JSON.stringify({
      name: String(name || '').slice(0, 40),
      cat: choice,
    }));
  } catch {
    // Private mode can refuse storage. The room still opens.
  }
}

function slimMessage(message) {
  if (message.kind === 'notice') return { kind: 'notice', text: String(message.text || '').slice(0, 240) };
  return {
    id: message.id,
    name: message.name,
    text: message.text || '',
    sticker: message.sticker || null,
    member: message.member || '',
    gif: message.gif || null,
    reply: message.reply || null,
    reactions: message.reactions || {},
    at: message.at,
    mine: !!message.mine,
    locked: !!message.locked,
  };
}

async function checkBuild() {
  if (room.hidden || updateSeen || !loadedBuild) return;
  try {
    const res = await fetch('/api/build', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.build && data.build !== loadedBuild) {
      updateSeen = true;
      updateToast.hidden = false;
    }
  } catch {
    // The room keeps working if the check misses.
  }
}

async function keepAndReload() {
  if (!identity || !token) return;
  try {
    const saved = await exportIdentity(identity);
    const payload = {
      token,
      memberId,
      name: myName,
      sendSeq,
      lastId,
      publicKey: saved.publicKey,
      jwk: saved.jwk,
      groupKey: groupKeyRaw ? bytesToB64(groupKeyRaw) : '',
      wrapIds: [...seenWraps],
      messages: feed.map(slimMessage),
    };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    composerError.textContent = 'The page could not keep this room open.';
    return;
  }
  location.reload();
}

async function takeHandoff() {
  let raw = '';
  try { raw = sessionStorage.getItem(HANDOFF_KEY) || ''; } catch { return false; }
  try { sessionStorage.removeItem(HANDOFF_KEY); } catch { /* already gone */ }
  if (!raw) return false;
  let data;
  try { data = JSON.parse(raw); } catch { return false; }
  if (!data || typeof data !== 'object' || !data.token || !data.jwk) return false;
  try {
    identity = await importIdentity(data);
  } catch {
    return false;
  }
  token = String(data.token);
  memberId = String(data.memberId || '');
  myName = String(data.name || '');
  sendSeq = Number(data.sendSeq) || 0;
  lastId = Number(data.lastId) || 0;
  if (data.groupKey) {
    try {
      const rawKey = b64ToBytes(data.groupKey);
      groupKey = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', true, ['encrypt', 'decrypt']);
      groupKeyRaw = rawKey;
    } catch {
      groupKey = null;
      groupKeyRaw = null;
    }
  }
  for (const id of data.wrapIds || []) seenWraps.add(id);
  const restored = [];
  for (const message of data.messages || []) {
    if (!message || typeof message !== 'object') continue;
    if (message.kind === 'notice') {
      feed.push({ kind: 'notice', text: String(message.text || '') });
      continue;
    }
    const id = Number(message.id);
    if (!Number.isInteger(id)) continue;
    const row = {
      id,
      name: String(message.name || myName || 'Someone'),
      text: String(message.text || ''),
      sticker: message.sticker || null,
      member: String(message.member || ''),
      gif: message.gif || null,
      reply: cleanReply(message.reply),
      reactions: message.reactions && typeof message.reactions === 'object' ? message.reactions : {},
      at: Number(message.at) || Date.now(),
      mine: !!message.mine,
      locked: !!message.locked,
    };
    if (seen.has(id)) continue;
    seen.add(id);
    if (id > lastId) lastId = id;
    restored.push(row);
    onScreen.push(row);
    feed.push(row);
  }
  if (memberId && sendSeq) {
    const used = new Set();
    for (let n = 1; n <= sendSeq; n += 1) used.add(n);
    seenSeq.set(memberId, used);
  }
  if (memberId && myName) rememberedNames.set(memberId, myName);
  showLock(groupKeyRaw ? await fingerprint(groupKeyRaw) : '');
  showRoom();
  if (restored.length) paintPage({ stick: true, reset: true });
  await refresh(true);
  return !room.hidden && !!token;
}

document.querySelector('#update-now').addEventListener('click', () => { keepAndReload(); });

buildEmojiBoard();
buildCatChoices();
probeGif().then((ok) => { if (ok) enableGif(); });

async function boot() {
  if (token && !room.hidden) return;
  if (token && room.hidden) {
    token = '';
    memberId = '';
    identity = null;
    groupKey = null;
    groupKeyRaw = null;
  }
  stopDoorWait();
  let meta = {};
  try {
    const res = await fetch('/api/join');
    meta = await res.json();
  } catch {
    doorError.textContent = 'The room is not open.';
    showGuestDoor();
    room.hidden = true;
    door.hidden = false;
    return;
  }
  if (token && !room.hidden) return;
  if (meta.waiting && hostToken) showHostSetter();
  else if (meta.waiting) {
    showWaiting();
    doorTimer = setTimeout(boot, POLL_MS);
  } else showGuestDoor();
  if (token && !room.hidden) return;
  room.hidden = true;
  door.hidden = false;
}

showGuestDoor();

prepareEntry();

(async function openFromDoor() {
  let stayed = false;
  try {
    stayed = await takeHandoff();
  } catch {
    stayed = false;
  }
  if (stayed && token && !room.hidden) return;
  if (!(token && !room.hidden)) boot();
})();

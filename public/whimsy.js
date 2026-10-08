// Summonable overlays. Cats are drawn here as original pixels.
// The paperclip picture is Prakriti's own file, shown as-is.

import { pickAffirmation } from './affirmations.js';

const DISCO_LINE = "You're doing so great and I am so proud of you.";

const COATS = {
  cream: { k: '#5a3b2e', f: '#f3d2a8', s: '#e0b07a', e: '#f6c9c4', t: '#e7b48a', u: '#5a3b2e', w: '#fffaf3', p: '#3a2a22', i: '#ffffff', n: '#e08b93', m: '#a85a62', h: '#f0b0b0', b: '#e7a0c4', c: '#ffe6c8', r: '#c4a48a', d: '#d9a07a' },
  lilac: { k: '#4d3568', f: '#e4d4f6', s: '#cbb4ea', e: '#f3d4e4', t: '#cbb4ea', u: '#4d3568', w: '#fffaf3', p: '#2d2140', i: '#ffffff', n: '#e7a0c0', m: '#8d5a78', h: '#f0b7d0', b: '#f0b7d2', c: '#f7eefc', r: '#b9a6c8', d: '#b894d8' },
  ginger: { k: '#6a3418', f: '#f0a05a', s: '#d4783a', e: '#f6c7b0', t: '#d4783a', u: '#6a3418', w: '#fffaf3', p: '#3a2418', i: '#ffffff', n: '#f0b0a8', m: '#a85a48', h: '#f2c1a0', b: '#f2c1a0', c: '#ffd7b0', r: '#c4896a', d: '#c46a38' },
  sage: { k: '#3e5344', f: '#d5e2c4', s: '#b7cba4', e: '#f0d0d4', t: '#8fb08a', u: '#3e5344', w: '#fffaf3', p: '#243028', i: '#ffffff', n: '#e7a0a8', m: '#7a5a58', h: '#f0c0c8', b: '#e7b7c8', c: '#eef6e4', r: '#8aa57a', d: '#7f9a72' },
};

const W = 28;
const H = 24;

function grid() {
  return Array.from({ length: H }, () => Array(W).fill('.'));
}

function plot(g, x, y, c) {
  if (x < 0 || y < 0 || y >= H || x >= W) return;
  g[y][x] = c;
}

function fill(g, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) plot(g, x, y, c);
  }
}

function catRows({ stripe = false, bow = false, lift = 'none', demon = false } = {}) {
  const g = grid();
  plot(g, 10, 0, 'k'); plot(g, 11, 0, 'k');
  plot(g, 9, 1, 'k'); plot(g, 12, 1, 'k');
  plot(g, 10, 1, 'e'); plot(g, 11, 1, 'e');
  plot(g, 8, 2, 'k'); plot(g, 13, 2, 'k');
  plot(g, 9, 2, 'e'); plot(g, 10, 2, 'e'); plot(g, 11, 2, 'e'); plot(g, 12, 2, 'e');
  plot(g, 18, 0, 'k'); plot(g, 19, 0, 'k');
  plot(g, 17, 1, 'k'); plot(g, 20, 1, 'k');
  plot(g, 18, 1, 'e'); plot(g, 19, 1, 'e');
  plot(g, 16, 2, 'k'); plot(g, 21, 2, 'k');
  plot(g, 17, 2, 'e'); plot(g, 18, 2, 'e'); plot(g, 19, 2, 'e'); plot(g, 20, 2, 'e');
  if (bow) {
    plot(g, 5, 0, 'b'); plot(g, 6, 0, 'b'); plot(g, 7, 0, 'b');
    plot(g, 4, 1, 'b'); plot(g, 5, 1, 'k'); plot(g, 6, 1, 'b'); plot(g, 7, 1, 'b'); plot(g, 8, 1, 'b');
    plot(g, 5, 2, 'b'); plot(g, 6, 2, 'b'); plot(g, 7, 2, 'b');
  }
  fill(g, 8, 3, 21, 11, 'f');
  for (let x = 8; x <= 21; x += 1) plot(g, x, 3, 'k');
  for (let y = 3; y <= 11; y += 1) {
    plot(g, 8, y, 'k');
    plot(g, 21, y, 'k');
  }
  function eye(x, y) {
    fill(g, x, y, x + 3, y + 2, 'w');
    plot(g, x + 1, y + 1, 'p');
    plot(g, x + 2, y + 1, 'p');
    plot(g, x + 1, y, 'i');
  }
  eye(10, 5);
  eye(16, 5);
  plot(g, 14, 8, 'n'); plot(g, 15, 8, 'n');
  plot(g, 10, 8, 'h'); plot(g, 11, 8, 'h');
  plot(g, 18, 8, 'h'); plot(g, 19, 8, 'h');
  plot(g, 13, 10, 'm'); plot(g, 14, 10, 'm'); plot(g, 15, 10, 'm'); plot(g, 16, 10, 'm');
  for (const x of [3, 4, 5, 6, 7]) plot(g, x, 7, 'r');
  for (const x of [4, 5, 6, 7]) plot(g, x, 9, 'r');
  for (const x of [22, 23, 24, 25, 26]) plot(g, x, 7, 'r');
  for (const x of [22, 23, 24, 25]) plot(g, x, 9, 'r');
  fill(g, 7, 12, 22, 18, 'f');
  for (let y = 12; y <= 18; y += 1) {
    plot(g, 7, y, 'k');
    plot(g, 22, y, 'k');
  }
  for (let x = 7; x <= 22; x += 1) plot(g, x, 18, 'k');
  for (let x = 10; x <= 19; x += 1) plot(g, x, 12, 'f');
  fill(g, 12, 14, 17, 17, 'c');
  function paw(a, b, up) {
    fill(g, a, 19 - up, b, 21 - up, 'f');
    for (let x = a; x <= b; x += 1) {
      plot(g, x, 19 - up, 'k');
      plot(g, x, 21 - up, 'k');
    }
    for (let y = 19 - up; y <= 21 - up; y += 1) {
      plot(g, a, y, 'k');
      plot(g, b, y, 'k');
    }
    plot(g, a + 1, 20 - up, 'k');
    plot(g, a + 3, 20 - up, 'k');
  }
  paw(8, 12, lift === 'left' ? 3 : 0);
  paw(17, 21, lift === 'right' ? 3 : 0);
  const tail = [
    [2, 15, 'u'], [3, 14, 'u'], [4, 13, 'u'], [5, 12, 't'],
    [2, 16, 't'], [2, 17, 't'], [3, 17, 't'], [4, 17, 'u'],
    [1, 16, 'u'], [1, 17, 'u'],
    [3, 15, 't'], [4, 14, 't'], [5, 13, 't'],
    [3, 16, 't'],
  ];
  for (const [x, y, c] of tail) plot(g, x, y, c);
  if (stripe) {
    for (let y = 13; y <= 17; y += 2) {
      for (let x = 9; x <= 20; x += 1) if (g[y][x] === 'f') g[y][x] = 's';
    }
  }
  if (demon) {
    plot(g, 9, 0, 'd');
    plot(g, 10, 0, 'd');
    plot(g, 8, 0, 'k');
    plot(g, 19, 0, 'd');
    plot(g, 20, 0, 'd');
    plot(g, 21, 0, 'k');
    plot(g, 13, 11, 'w');
    plot(g, 16, 11, 'w');
  }
  return g;
}

function catSvg(options, coatName) {
  const coat = COATS[coatName] || COATS.cream;
  const rows = catRows(options);
  const body = [];
  const tail = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fillColor = coat[ch];
      if (!fillColor || ch === '.') return;
      const rect = `<rect x="${x}" y="${y}" width="1" height="1" fill="${fillColor}"/>`;
      if (ch === 't' || ch === 'u') tail.push(rect);
      else body.push(rect);
    });
  });
  return `<svg viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true"><g class="cat-tail">${tail.join('')}</g><g>${body.join('')}</g></svg>`;
}

export const CAT_PRESETS = [
  { id: 'cream', label: 'Cream cat', coat: 'cream', options: {} },
  { id: 'lilac', label: 'Lilac cat', coat: 'lilac', options: {} },
  { id: 'ginger', label: 'Ginger cat', coat: 'ginger', options: {} },
  { id: 'sage', label: 'Sage cat', coat: 'sage', options: {} },
  { id: 'bow', label: 'Cat with a bow', coat: 'cream', options: { bow: true } },
  { id: 'stripe', label: 'Striped cat', coat: 'lilac', options: { stripe: true } },
  { id: 'wave', label: 'Waving cat', coat: 'ginger', options: { lift: 'right' } },
  { id: 'disco', label: 'Disco cat', coat: 'sage', options: { bow: true, stripe: true } },
];

export function catPortrait(id) {
  const preset = CAT_PRESETS.find((item) => item.id === id);
  if (!preset) return '';
  return catSvg(preset.options, preset.coat);
}

function discoBallSvg() {
  const colors = ['#fffaf3', '#e7dff6', '#f8d0e0', '#ffe6b0', '#d9f0c8', '#d7e4ff', '#cbb4ea'];
  const facets = [];
  for (let y = 0; y < 14; y += 1) {
    for (let x = 0; x < 14; x += 1) {
      const dx = x - 6.5;
      const dy = y - 6.5;
      if (dx * dx + dy * dy > 42) continue;
      facets.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[(x * 3 + y * 2) % colors.length]}"/>`);
    }
  }
  return `<svg class="ball-svg" viewBox="-2 -4 18 20" shape-rendering="crispEdges" aria-hidden="true"><rect x="6.6" y="-4" width="0.8" height="4" fill="#5c4578"/>${facets.join('')}</svg>`;
}

function currentOffset(card) {
  const parent = card.parentElement.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  return { left: rect.left - parent.left, top: rect.top - parent.top };
}

function moveCard(card, left, top) {
  const parent = card.parentElement;
  if (!parent || !Number.isFinite(left) || !Number.isFinite(top)) return;
  const bounds = parent.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  const maxLeft = Math.max(0, bounds.width - rect.width);
  const maxTop = Math.max(0, bounds.height - rect.height);
  card.style.left = `${Math.min(maxLeft, Math.max(0, left))}px`;
  card.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
}

function enableDrag(card) {
  const bar = card.querySelector('.float-bar');
  if (!bar) return;
  let drag = null;
  const onMove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    moveCard(card, drag.left + (event.clientX - drag.x), drag.top + (event.clientY - drag.y));
  };
  const end = (event) => {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
  };
  bar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-no-drag]')) return;
    event.preventDefault();
    const pos = currentOffset(card);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: pos.left, top: pos.top };
    card.dataset.home = '0';
    card.parentElement?.classList.remove('affirm-home');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  });
  bar.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 28 : 12;
    const keys = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = keys[event.key];
    if (!delta) return;
    event.preventDefault();
    const pos = currentOffset(card);
    card.dataset.home = '0';
    card.parentElement?.classList.remove('affirm-home');
    moveCard(card, pos.left + delta[0], pos.top + delta[1]);
  });
  card.addEventListener('whimsy-discard', end);
}

function placeInLane(card, lane, top) {
  const roomy = Math.max(140, lane.clientWidth - 24);
  const max = card.classList.contains('troupe') ? 460 : 250;
  card.style.width = `${Math.min(roomy, max)}px`;
  const used = card.offsetWidth || Math.min(roomy, max);
  const left = lane.classList.contains('lane-right')
    ? Math.max(8, lane.clientWidth - used - 8)
    : 8;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.dataset.home = '1';
}

function floatBar(title) {
  const bar = document.createElement('div');
  bar.className = 'float-bar';
  bar.tabIndex = 0;
  const grip = document.createElement('span');
  grip.className = 'grip';
  grip.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'float-title';
  label.textContent = title;
  const min = document.createElement('button');
  min.type = 'button';
  min.className = 'float-done';
  min.dataset.noDrag = '1';
  min.dataset.role = 'min';
  min.textContent = 'Min';
  min.setAttribute('aria-label', `Minimise ${title}`);
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'float-done';
  done.dataset.noDrag = '1';
  done.dataset.role = 'done';
  done.textContent = 'Done';
  done.setAttribute('aria-label', `Dismiss ${title}`);
  bar.append(grip, label, min, done);
  return bar;
}

function bindShelf(card, lane, label) {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'side-tab';
  tab.textContent = label;
  tab.hidden = true;
  tab.setAttribute('aria-label', `Open ${label}`);
  lane.append(tab);
  card._tab = tab;
  card.querySelector('[data-role="min"]').addEventListener('click', () => {
    card.hidden = true;
    tab.hidden = false;
  });
  tab.addEventListener('click', () => {
    tab.hidden = true;
    card.hidden = false;
  });
}

const SEQUIN_DIAM = 64;
const PIXEL = 8;
const LOOK_KEY = 'nook-look';
const THEMES = ['paper', 'dark', 'cyberpunk', 'akira'];
const SEQUIN_LOOKS = ['pixel', 'sleek', 'matrix'];
const COLOUR_WAYS = ['silver', 'rainbow', 'crimson', 'neon', 'akira', 'matrix'];
const THEME_BAR = { paper: '#efe8dc', dark: '#100e0c', cyberpunk: '#070910', akira: '#000000' };

const RAINBOW = [
  { fill: '#e15b6b', rim: '#9d3144' },
  { fill: '#ef8a3c', rim: '#b85a1e' },
  { fill: '#f0c84a', rim: '#b08a20' },
  { fill: '#6cb85f', rim: '#3d7a34' },
  { fill: '#4aa3d4', rim: '#2a6c98' },
  { fill: '#7b68d0', rim: '#4a3a96' },
  { fill: '#d45ca8', rim: '#983472' },
];
const RAINBOW_SOFT = [
  { fill: '#d86a78', rim: '#a84858' },
  { fill: '#e08a58', rim: '#b06438' },
  { fill: '#d4b25e', rim: '#a08038' },
  { fill: '#62a878', rim: '#3e7854' },
  { fill: '#5a9cc4', rim: '#3a7094' },
  { fill: '#7a78c0', rim: '#524e90' },
  { fill: '#c46a9e', rim: '#924870' },
];
const CRIMSON = [
  { fill: '#ff4d5a', rim: '#8a1824' },
  { fill: '#c41e3a', rim: '#6e0c18' },
  { fill: '#8b1020', rim: '#4a0812' },
  { fill: '#e23b4a', rim: '#7a1420' },
  { fill: '#6b0f1a', rim: '#3a080e' },
];
const NEON = [
  { fill: '#3ee0ff', rim: '#0c6e88' },
  { fill: '#ff3ec8', rim: '#8a1868' },
  { fill: '#b6ff3e', rim: '#4e7a12' },
  { fill: '#7a5cff', rim: '#2c1c88' },
  { fill: '#ffe14a', rim: '#8a7010' },
];
const AKIRA_RED = [
  { fill: '#e10600', rim: '#6e0400' },
  { fill: '#ff2a1a', rim: '#8a1008' },
  { fill: '#f4f1ea', rim: '#6a6460' },
  { fill: '#8d0808', rim: '#3a0404' },
  { fill: '#c81010', rim: '#5c0808' },
];
const MATRIX_GREEN = [
  { fill: '#39ff7a', rim: '#0d6e32' },
  { fill: '#14c85a', rim: '#085828' },
  { fill: '#b8ffc8', rim: '#1e7a44' },
  { fill: '#0a8f3c', rim: '#044820' },
  { fill: '#5dff9a', rim: '#127a40' },
];

const SILVER = {
  face: [{ fill: '#e4e0d6', rim: '#8a8478' }],
  back: [{ fill: '#c4bfb4', rim: '#6e6a62' }],
};
const SILVER_SLEEK = {
  face: [{ fill: '#e3e6ee', rim: '#8e95a6' }],
  back: [{ fill: '#b7bdca', rim: '#6c7384' }],
};
const WAY_RAINBOW = { face: RAINBOW, back: RAINBOW };
const WAY_RAINBOW_SOFT = { face: RAINBOW_SOFT, back: RAINBOW_SOFT };
const WAY_CRIMSON = { face: CRIMSON, back: CRIMSON };
const WAY_NEON = { face: NEON, back: NEON };
const WAY_AKIRA = { face: AKIRA_RED, back: AKIRA_RED };
const WAY_MATRIX = { face: MATRIX_GREEN, back: MATRIX_GREEN };

function wayStops(way, sleek) {
  if (way === 'rainbow') return sleek ? WAY_RAINBOW_SOFT : WAY_RAINBOW;
  if (way === 'crimson') return WAY_CRIMSON;
  if (way === 'neon') return WAY_NEON;
  if (way === 'akira') return WAY_AKIRA;
  if (way === 'matrix') return WAY_MATRIX;
  return sleek ? SILVER_SLEEK : SILVER;
}

function loadLook() {
  const look = { theme: 'paper', disco: false, sequins: false, sequinLook: 'pixel', colour: 'silver' };
  try {
    const data = JSON.parse(localStorage.getItem(LOOK_KEY) || '');
    if (data && typeof data === 'object') {
      if (THEMES.includes(data.theme)) look.theme = data.theme;
      if (typeof data.disco === 'boolean') look.disco = data.disco;
      if (typeof data.sequins === 'boolean') look.sequins = data.sequins;
      if (SEQUIN_LOOKS.includes(data.sequinLook)) look.sequinLook = data.sequinLook;
      if (COLOUR_WAYS.includes(data.colour)) look.colour = data.colour;
    }
  } catch {
    // A missing choice just starts on paper.
  }
  return look;
}

const look = loadLook();

function saveLook() {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify({
      theme: look.theme,
      disco: look.disco,
      sequins: look.sequins,
      sequinLook: look.sequinLook,
      colour: look.colour,
    }));
  } catch {
    // Private mode still keeps the choice until the tab closes.
  }
}

function paintedWay() {
  if (look.theme === 'dark' && look.disco) return 'crimson';
  return look.colour;
}

function streamKind() {
  if (!look.disco) return '';
  if (look.theme === 'dark') return 'crimson';
  if (look.theme === 'cyberpunk') return 'neon';
  return 'rainbow';
}

function streamPalette(kind) {
  if (kind === 'crimson') return CRIMSON;
  if (kind === 'neon') return NEON;
  return RAINBOW;
}

function easeFlip(t) {
  return t * t * (3 - 2 * t);
}

function hexRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a, b, t) {
  const pa = hexRgb(a);
  const pb = hexRgb(b);
  const ch = (i) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return `rgb(${ch(0)} ${ch(1)} ${ch(2)})`;
}

function hexA(hex, alpha) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function beamAngle(i, t, count) {
  const base = -1.05 + (i / (count - 1)) * 2.35;
  const sway = Math.sin(t / 520 + i * 0.85) * 0.11;
  const bob = Math.sin(t / 250 + i * 1.3) * 0.035;
  return base + sway + bob;
}

function ballDesk() {
  const ball = document.querySelector('.disco-ball');
  const desk = document.querySelector('.desk');
  if (!ball || !desk || !look.disco) return null;
  const deskRect = desk.getBoundingClientRect();
  const ballRect = ball.getBoundingClientRect();
  return {
    x: ballRect.left + ballRect.width / 2 - deskRect.left,
    y: ballRect.top + ballRect.height * 0.62 - deskRect.top,
  };
}

const toneCache = new Map();

function lightAt(origin, deskX, deskY, t, palette) {
  if (!origin || !palette) return null;
  const count = 7;
  let best = 0;
  let hue = 0;
  for (let i = 0; i < count; i += 1) {
    const ang = beamAngle(i, t, count);
    const dx = Math.sin(ang);
    const dy = Math.cos(ang);
    const vx = deskX - origin.x;
    const vy = deskY - origin.y;
    const along = vx * dx + vy * dy;
    if (along < 0) continue;
    const perp = Math.abs(vx * dy - vy * dx);
    const width = 22 + along * 0.11;
    if (perp > width) continue;
    const gain = 1 - perp / width;
    if (gain > best) {
      best = gain;
      hue = ((along / 260) - t / 900 + i * 0.17) % 1;
      if (hue < 0) hue += 1;
    }
  }
  if (best <= 0.08) return null;
  const step = Math.round(best * 8) / 8;
  if (step <= 0) return null;
  return {
    gain: step,
    colour: palette[Math.min(palette.length - 1, Math.floor(hue * palette.length))],
  };
}

function toneFor(way, sleek, index, back, gleam) {
  const stops = wayStops(way, sleek);
  const list = back ? stops.back : stops.face;
  const base = list[Math.abs(index) % list.length];
  if (!gleam) return base;
  const step = Math.round(gleam.gain * 8);
  const key = `${base.fill}|${base.rim}|${gleam.colour.fill}|${gleam.colour.rim}|${sleek ? 1 : 0}|${step}`;
  const cached = toneCache.get(key);
  if (cached) return cached;
  const mix = (sleek ? 0.58 : 0.72) * (step / 8);
  const tone = {
    fill: mixHex(base.fill, gleam.colour.fill, mix),
    rim: mixHex(base.rim, gleam.colour.rim, mix),
  };
  toneCache.set(key, tone);
  return tone;
}

function drawPixelDisc(g, fill, rim, scale) {
  const rx = Math.max(PIXEL, Math.round((SEQUIN_DIAM / 2) / PIXEL) * PIXEL);
  const ry = Math.max(PIXEL, Math.round((rx * scale) / PIXEL) * PIXEL);
  const inRx = rx - PIXEL;
  const inRy = ry - PIXEL;
  for (let y = -ry; y < ry; y += PIXEL) {
    for (let x = -rx; x < rx; x += PIXEL) {
      const cx = x + PIXEL * 0.5;
      const cy = y + PIXEL * 0.5;
      if ((cx * cx) / (rx * rx) + (cy * cy) / (ry * ry) > 1) continue;
      const inner = inRx > 0 && inRy > 0
        && (cx * cx) / (inRx * inRx) + (cy * cy) / (inRy * inRy) <= 1;
      g.fillStyle = inner ? fill : rim;
      g.fillRect(x, y, PIXEL, PIXEL);
    }
  }
  return { rx, ry };
}

const RUNES = [
  ['#..#', '.#.#', '#..#', '.##.', '#..#'],
  ['.##.', '#..#', '.##.', '#...', '.###'],
  ['#.#.', '.#.#', '#.#.', '.#.#', '#.#.'],
  ['.#..', '###.', '.#..', '.#..', '.##.'],
  ['##.#', '#.#.', '##.#', '#.#.', '##.#'],
];

function mountDiscoLight(desk) {
  const canvas = document.createElement('canvas');
  canvas.className = 'disco-light';
  canvas.setAttribute('aria-hidden', 'true');
  desk.append(canvas);
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let alive = true;

  function layout() {
    const rect = desk.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    if (!alive) return;
    const rect = desk.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    const origin = ballDesk();
    const kind = streamKind();
    if (origin && kind) {
      const t = now * (reduce ? 0.35 : 1);
      const palette = streamPalette(kind);
      const count = 7;
      const length = rect.height + 120;
      for (let i = 0; i < count; i += 1) {
        ctx.save();
        ctx.translate(origin.x, origin.y);
        ctx.rotate(beamAngle(i, t, count));
        const grad = ctx.createLinearGradient(0, 0, 0, length);
        const shift = (t / 900 + i * 0.08) % 1;
        for (let s = 0; s <= 8; s += 1) {
          let u = (s / 8 + shift) % 1;
          if (u < 0) u += 1;
          const colour = palette[Math.floor(u * palette.length) % palette.length];
          const breathe = 0.5 + 0.5 * Math.sin(t / 280 + i * 0.7 + s);
          grad.addColorStop(s / 8, hexA(colour.fill, 0.1 + breathe * 0.22));
        }
        ctx.fillStyle = grad;
        const spread = 36 + i * 8;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-spread, length);
        ctx.lineTo(spread, length);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  layout();
  const watcher = new ResizeObserver(() => { if (alive) layout(); });
  watcher.observe(desk);
  raf = requestAnimationFrame(frame);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    watcher.disconnect();
    canvas.remove();
  };
}

let wakeCloth = () => {};

function mountSequinCloth(room) {
  const canvas = document.createElement('canvas');
  canvas.className = 'sequin-cloth';
  canvas.setAttribute('aria-hidden', 'true');
  room.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sequins = [];
  const sprites = new Map();
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = 0;
  let alive = true;
  let pointer = null;
  let dirty = true;
  let shownKey = '';
  let rafPending = false;

  function remember(key, sprite) {
    sprites.set(key, sprite);
    return sprite;
  }

  function pixelSprite(fill, rim, scale) {
    const rx = Math.max(PIXEL, Math.round((SEQUIN_DIAM / 2) / PIXEL) * PIXEL);
    const ry = Math.max(PIXEL, Math.round((rx * scale) / PIXEL) * PIXEL);
    const key = `p|${fill}|${rim}|${ry}`;
    const cached = sprites.get(key);
    if (cached) return cached;
    const stamp = document.createElement('canvas');
    stamp.width = rx * 2;
    stamp.height = ry * 2;
    const g = stamp.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(rx, ry);
    drawPixelDisc(g, fill, rim, scale);
    return remember(key, { stamp, rx, ry });
  }

  function matrixStrip(fill) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const key = `s|${fill}|${dpr}`;
    const cached = sprites.get(key);
    if (cached) return cached;
    const w = 18;
    const rowH = 6;
    const cycle = RUNES.length * rowH;
    const h = cycle + 32;
    const stamp = document.createElement('canvas');
    stamp.width = Math.max(1, Math.round(w * dpr));
    stamp.height = Math.max(1, Math.round(h * dpr));
    const g = stamp.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = fill;
    const rows = Math.ceil(h / rowH) + 1;
    for (let row = 0; row < rows; row += 1) {
      const rune = RUNES[row % RUNES.length];
      const gy = row * rowH;
      for (let ly = 0; ly < rune.length; ly += 1) {
        const line = rune[ly];
        for (let lx = 0; lx < line.length; lx += 1) {
          if (line[lx] === '#') g.fillRect(1 + lx * 4, gy + ly, 3, 1);
        }
      }
    }
    return remember(key, { stamp, w, cycle, dpr });
  }

  function visualKey() {
    const style = SEQUIN_LOOKS.includes(look.sequinLook) ? look.sequinLook : 'pixel';
    const stream = look.disco ? streamKind() : '';
    return `${style}|${paintedWay()}|${stream}`;
  }

  function layout() {
    const rect = room.getBoundingClientRect();
    if (sequins.length && Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 1) return false;
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sequins.length = 0;
    const stepX = 52;
    const stepY = 46;
    const radius = SEQUIN_DIAM / 2;
    let row = 0;
    for (let y = 8; y < height + SEQUIN_DIAM; y += stepY, row += 1) {
      const offset = (row % 2) * (stepX / 2);
      for (let x = -8 + offset; x < width + SEQUIN_DIAM; x += stepX) {
        sequins.push({
          x,
          y,
          r: radius,
          face: 0,
          spin: 0,
          arm: 0,
          ready: 0,
          lean: 1,
          index: row * 17 + Math.round(x),
          phase: ((x * 0.013) + (y * 0.017)) % 1,
        });
      }
    }
    dirty = true;
    return true;
  }

  function paint(now) {
    const style = SEQUIN_LOOKS.includes(look.sequinLook) ? look.sequinLook : 'pixel';
    const sleek = style === 'sleek';
    const way = paintedWay();
    const discoOn = look.disco;
    const roomRect = discoOn ? room.getBoundingClientRect() : null;
    const deskRect = discoOn ? room.closest('.desk')?.getBoundingClientRect() : null;
    const kind = discoOn ? streamKind() : '';
    const palette = kind ? streamPalette(kind) : null;
    const origin = palette ? ballDesk() : null;
    const t = now * (reduce ? 0.35 : 1);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = sleek;
    for (const sequin of sequins) {
      const shown = sequin.spin === 0 ? 0 : easeFlip(sequin.spin);
      const angle = (sequin.face + shown) * Math.PI;
      const cos = Math.cos(angle);
      const scale = Math.max(0.045, Math.abs(cos));
      const back = cos < 0;
      let gleam = null;
      if (origin && deskRect && roomRect) {
        gleam = lightAt(
          origin,
          sequin.x + roomRect.left - deskRect.left,
          sequin.y + roomRect.top - deskRect.top,
          t,
          palette,
        );
      }
      const tones = toneFor(way, sleek, sequin.index, back, gleam);
      const yShift = sequin.lean * (1 - scale) * sequin.r * 0.28;
      if (style === 'pixel') {
        const sprite = pixelSprite(tones.fill, tones.rim, scale);
        ctx.drawImage(sprite.stamp, Math.round(sequin.x - sprite.rx), Math.round(sequin.y + yShift - sprite.ry));
      } else if (style === 'matrix') {
        const drift = reduce ? sequin.phase : (sequin.phase + now / 700) % 1;
        const strip = matrixStrip(tones.fill);
        const winH = Math.max(8, Math.round(30 * scale));
        const y0 = (drift * strip.cycle) % strip.cycle;
        const x = Math.round(sequin.x - strip.w / 2);
        const y = Math.round(sequin.y + yShift - winH / 2);
        ctx.fillStyle = '#070a08';
        ctx.fillRect(x, y, strip.w, winH);
        ctx.drawImage(
          strip.stamp,
          0,
          y0 * strip.dpr,
          strip.w * strip.dpr,
          winH * strip.dpr,
          x,
          y,
          strip.w,
          winH,
        );
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = tones.rim;
        ctx.strokeRect(x + 0.75, y + 0.75, strip.w - 1.5, winH - 1.5);
      } else {
        ctx.save();
        ctx.translate(sequin.x, sequin.y + yShift);
        ctx.scale(1, scale);
        ctx.beginPath();
        ctx.arc(0, 0, sequin.r, 0, Math.PI * 2);
        ctx.fillStyle = tones.fill;
        ctx.fill();
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = tones.rim;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-sequin.r * 0.22, -sequin.r * 0.28, sequin.r * 0.2, sequin.r * 0.11, -0.6, 0, Math.PI * 2);
        ctx.fillStyle = back ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.38)';
        ctx.fill();
        ctx.restore();
      }
    }
    shownKey = visualKey();
    dirty = false;
  }

  function poke(now, x, y, lean) {
    const reach = SEQUIN_DIAM * 1.35;
    for (const sequin of sequins) {
      if (sequin.spin > 0 || sequin.arm || now < sequin.ready) continue;
      const dist = Math.hypot(sequin.x - x, sequin.y - y);
      if (dist > reach) continue;
      sequin.lean = lean;
      if (reduce) {
        sequin.face = sequin.face ? 0 : 1;
        sequin.ready = now + 420;
      } else {
        sequin.arm = now + dist * 1.7;
      }
    }
  }

  function onPointer(event) {
    if (!alive) return;
    const rect = room.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    const prev = pointer;
    pointer = { x, y };
    if (!prev) return;
    const dx = x - prev.x;
    const dy = y - prev.y;
    if (dx * dx + dy * dy < 36) return;
    poke(performance.now(), x, y, dy < 0 ? -1 : 1);
    if (reduce) paint(performance.now());
  }

  function schedule() {
    if (!alive || reduce || rafPending) return;
    rafPending = true;
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!alive) return;
    rafPending = false;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    let motion = false;
    for (const sequin of sequins) {
      if (sequin.arm && now >= sequin.arm && sequin.spin === 0) {
        sequin.arm = 0;
        sequin.spin = 0.001;
        motion = true;
      }
      if (sequin.spin > 0) {
        motion = true;
        sequin.spin += dt / 0.32;
        if (sequin.spin >= 1) {
          sequin.spin = 0;
          sequin.face = sequin.face ? 0 : 1;
          sequin.ready = now + 420;
        }
      }
    }
    const style = SEQUIN_LOOKS.includes(look.sequinLook) ? look.sequinLook : 'pixel';
    const key = visualKey();
    if (dirty || motion || look.disco || style === 'matrix' || key !== shownKey) paint(now);
    schedule();
  }

  layout();
  paint(performance.now());
  const watcher = new ResizeObserver(() => {
    if (!alive) return;
    if (layout()) paint(performance.now());
  });
  watcher.observe(room);
  room.addEventListener('pointermove', onPointer);
  wakeCloth = () => {
    if (!alive) return;
    dirty = true;
    if (reduce) paint(performance.now());
  };
  schedule();

  return () => {
    alive = false;
    rafPending = false;
    cancelAnimationFrame(raf);
    wakeCloth = () => {};
    watcher.disconnect();
    room.removeEventListener('pointermove', onPointer);
    canvas.remove();
  };
}

function sideSvg(extra, coat) {
  const options = look.theme === 'dark' ? { ...extra, demon: true } : { ...extra };
  return catSvg(options, coat);
}

function repaintSideCats() {
  for (const el of document.querySelectorAll('[data-coat]')) {
    let extra = {};
    try { extra = JSON.parse(el.dataset.extra || '{}'); } catch { extra = {}; }
    el.innerHTML = sideSvg(extra, el.dataset.coat);
  }
}

function syncControls() {
  document.body.dataset.theme = look.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_BAR[look.theme] || THEME_BAR.paper);
  for (const btn of document.querySelectorAll('#theme-choices button')) {
    btn.setAttribute('aria-checked', btn.dataset.theme === look.theme ? 'true' : 'false');
  }
  for (const btn of document.querySelectorAll('#look-choices button')) {
    btn.setAttribute('aria-checked', btn.dataset.look === look.sequinLook ? 'true' : 'false');
  }
  for (const btn of document.querySelectorAll('#colour-choices button')) {
    btn.setAttribute('aria-checked', btn.dataset.colour === look.colour ? 'true' : 'false');
  }
  const discoBtn = document.querySelector('#disco-btn');
  const sequinBtn = document.querySelector('#sequin-btn');
  if (discoBtn) discoBtn.setAttribute('aria-pressed', look.disco ? 'true' : 'false');
  if (sequinBtn) sequinBtn.setAttribute('aria-pressed', look.sequins ? 'true' : 'false');
  const note = document.querySelector('#colour-note');
  if (note) {
    const showing = look.theme === 'dark' && look.disco;
    note.hidden = !showing;
    note.textContent = showing
      ? 'Dark disco is showing crimson for now. Your colour way stays as you set it.'
      : '';
  }
  repaintSideCats();
}

syncControls();

export function mountWhimsy() {
  const room = document.querySelector('#room');
  const leftLane = document.querySelector('#lane-left');
  const rightLane = document.querySelector('#lane-right');
  const desk = document.querySelector('.desk');
  const discoBtn = document.querySelector('#disco-btn');
  const sequinBtn = document.querySelector('#sequin-btn');
  const affirmBtn = document.querySelector('#affirm-btn');
  const settingsBtn = document.querySelector('#settings-btn');
  const settingsPanel = document.querySelector('#settings-panel');
  const attachBtn = document.querySelector('#attach-btn');
  const paperclip = document.querySelector('#paperclip');
  if (!room || !leftLane || !rightLane || !discoBtn || !affirmBtn) return;

  let stopCloth = () => {};
  let clothOn = false;
  let stopLight = () => {};
  let lightOn = false;

  function discard(card) {
    if (!card) return;
    card._tab?.remove();
    card.dispatchEvent(new Event('whimsy-discard'));
    card.remove();
  }

  function markCat(el, coat, extra) {
    el.dataset.coat = coat;
    el.dataset.extra = JSON.stringify(extra);
    el.innerHTML = sideSvg(extra, coat);
  }

  function hideDiscoCard() {
    discard(leftLane.querySelector('.troupe'));
    room.classList.remove('disco-on');
  }

  function showDiscoCard() {
    room.classList.add('disco-on');
    if (leftLane.querySelector('.troupe')) {
      repaintSideCats();
      return;
    }
    const card = document.createElement('section');
    card.className = 'float troupe';
    card.setAttribute('aria-label', 'Disco cats');
    const bar = floatBar('Disco cats');
    bar.querySelector('[data-role="done"]').addEventListener('click', () => {
      look.disco = false;
      saveLook();
      syncControls();
      applyRoom();
    });
    const stage = document.createElement('div');
    stage.className = 'disco-stage';
    const ball = document.createElement('div');
    ball.className = 'disco-ball';
    ball.innerHTML = discoBallSvg();
    ball.setAttribute('role', 'img');
    ball.setAttribute('aria-label', 'A disco ball');
    const say = document.createElement('p');
    say.className = 'say-line';
    say.textContent = DISCO_LINE;
    const cats = document.createElement('div');
    cats.className = 'troupe-cats';
    const troupe = [
      ['cream', { lift: 'left' }],
      ['lilac', { bow: true }],
      ['ginger', { stripe: true, lift: 'right' }],
      ['sage', { lift: 'left' }],
    ];
    for (const [coat, extra] of troupe) {
      const figure = document.createElement('div');
      figure.className = 'cat-figure';
      markCat(figure, coat, extra);
      cats.append(figure);
    }
    stage.append(ball, say, cats);
    card.append(bar, stage);
    leftLane.append(card);
    bindShelf(card, leftLane, 'Disco');
    enableDrag(card);
    placeInLane(card, leftLane, 16);
  }

  function applyRoom() {
    syncControls();
    if (room.hidden) {
      hideDiscoCard();
      if (lightOn) { stopLight(); lightOn = false; stopLight = () => {}; }
      if (clothOn) { stopCloth(); clothOn = false; stopCloth = () => {}; }
      return;
    }
    if (look.disco) showDiscoCard();
    else hideDiscoCard();
    if (look.disco && desk) {
      if (!lightOn) {
        stopLight = mountDiscoLight(desk);
        lightOn = true;
      }
    } else if (lightOn) {
      stopLight();
      lightOn = false;
      stopLight = () => {};
    }
    if (look.sequins) {
      if (!clothOn) {
        stopCloth = mountSequinCloth(room);
        clothOn = true;
      }
    } else if (clothOn) {
      stopCloth();
      clothOn = false;
      stopCloth = () => {};
    }
  }

  function setSettings(open) {
    if (!settingsPanel || !settingsBtn) return;
    settingsPanel.hidden = !open;
    settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  settingsBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    setSettings(!!settingsPanel?.hidden);
  });
  document.addEventListener('click', (event) => {
    if (!settingsPanel || settingsPanel.hidden) return;
    if (event.target.closest('#settings-panel, #settings-btn')) return;
    setSettings(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSettings(false);
  });

  for (const btn of document.querySelectorAll('#theme-choices button')) {
    btn.addEventListener('click', () => {
      if (!THEMES.includes(btn.dataset.theme)) return;
      look.theme = btn.dataset.theme;
      saveLook();
      applyRoom();
    });
  }
  for (const btn of document.querySelectorAll('#look-choices button')) {
    btn.addEventListener('click', () => {
      if (!SEQUIN_LOOKS.includes(btn.dataset.look)) return;
      look.sequinLook = btn.dataset.look;
      saveLook();
      syncControls();
    });
  }
  for (const btn of document.querySelectorAll('#colour-choices button')) {
    btn.addEventListener('click', () => {
      if (!COLOUR_WAYS.includes(btn.dataset.colour)) return;
      if (look.colour === btn.dataset.colour) return;
      look.colour = btn.dataset.colour;
      saveLook();
      for (const other of document.querySelectorAll('#colour-choices button')) {
        other.setAttribute('aria-checked', other.dataset.colour === look.colour ? 'true' : 'false');
      }
      wakeCloth();
    });
  }

  discoBtn.addEventListener('click', () => {
    look.disco = discoBtn.getAttribute('aria-pressed') !== 'true';
    if (look.disco) look.sequins = true;
    saveLook();
    applyRoom();
  });
  sequinBtn?.addEventListener('click', () => {
    look.sequins = sequinBtn.getAttribute('aria-pressed') !== 'true';
    saveLook();
    applyRoom();
  });

  function summonAffirmation() {
    const card = document.createElement('section');
    card.className = 'float affirm-card';
    card.setAttribute('aria-label', 'Affirmation cat');
    const say = document.createElement('p');
    say.className = 'say-line';
    say.textContent = pickAffirmation('');
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'cat-hit';
    hit.setAttribute('aria-label', 'Show another affirmation');
    markCat(hit, 'lilac', {});
    hit.addEventListener('click', () => {
      say.textContent = pickAffirmation(say.textContent);
    });
    const bar = floatBar('Affirmation cat');
    bar.querySelector('[data-role="done"]').addEventListener('click', () => discard(card));
    card.append(bar, say, hit);
    rightLane.append(card);
    bindShelf(card, rightLane, 'Affirmation cat');
    enableDrag(card);
    placeInLane(card, rightLane, 16);
  }

  affirmBtn.addEventListener('click', () => {
    const card = rightLane.querySelector('.affirm-card');
    if (!card) {
      summonAffirmation();
      return;
    }
    if (card.hidden) {
      card.hidden = false;
      if (card._tab) card._tab.hidden = true;
    }
  });

  const observer = new MutationObserver(() => applyRoom());
  observer.observe(room, { attributes: true, attributeFilter: ['hidden'] });
  applyRoom();

  if (!attachBtn || !paperclip) return;
  let hovering = false;
  let blockHover = false;
  let blockFocus = false;
  let leftAfterHide = false;
  const paintClip = () => {
    const focused = document.activeElement === attachBtn;
    const show = (hovering && !blockHover) || (focused && !blockFocus);
    paperclip.classList.toggle('is-peeking', show);
  };
  attachBtn.addEventListener('mouseenter', () => {
    hovering = true;
    if (blockHover && leftAfterHide) {
      blockHover = false;
      leftAfterHide = false;
    }
    paintClip();
  });
  attachBtn.addEventListener('mouseleave', () => {
    hovering = false;
    if (blockHover) leftAfterHide = true;
    paintClip();
  });
  attachBtn.addEventListener('focus', paintClip);
  attachBtn.addEventListener('blur', () => {
    blockFocus = false;
    paintClip();
  });
  attachBtn.addEventListener('click', () => {
    blockHover = true;
    blockFocus = true;
    leftAfterHide = false;
    paintClip();
  });
}

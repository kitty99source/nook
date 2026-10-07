// Summonable overlays. Cats are drawn here as original pixels.
// The paperclip picture is Prakriti's own file, shown as-is.

import { pickAffirmation } from './affirmations.js';

const DISCO_LINE = "You're doing so great and I am so proud of you.";
const RAINBOW_MS = 1400;
const BALL_MS = 2200;

const COATS = {
  cream: { k: '#5a3b2e', f: '#f3d2a8', s: '#e0b07a', e: '#f6c9c4', t: '#e7b48a', u: '#5a3b2e', w: '#fffaf3', p: '#3a2a22', i: '#ffffff', n: '#e08b93', m: '#a85a62', h: '#f0b0b0', b: '#e7a0c4', c: '#ffe6c8', r: '#c4a48a' },
  lilac: { k: '#4d3568', f: '#e4d4f6', s: '#cbb4ea', e: '#f3d4e4', t: '#cbb4ea', u: '#4d3568', w: '#fffaf3', p: '#2d2140', i: '#ffffff', n: '#e7a0c0', m: '#8d5a78', h: '#f0b7d0', b: '#f0b7d2', c: '#f7eefc', r: '#b9a6c8' },
  ginger: { k: '#6a3418', f: '#f0a05a', s: '#d4783a', e: '#f6c7b0', t: '#d4783a', u: '#6a3418', w: '#fffaf3', p: '#3a2418', i: '#ffffff', n: '#f0b0a8', m: '#a85a48', h: '#f2c1a0', b: '#f2c1a0', c: '#ffd7b0', r: '#c4896a' },
  sage: { k: '#3e5344', f: '#d5e2c4', s: '#b7cba4', e: '#f0d0d4', t: '#8fb08a', u: '#3e5344', w: '#fffaf3', p: '#243028', i: '#ffffff', n: '#e7a0a8', m: '#7a5a58', h: '#f0c0c8', b: '#e7b7c8', c: '#eef6e4', r: '#8aa57a' },
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

function catRows({ stripe = false, bow = false, lift = 'none' } = {}) {
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

export function mountWhimsy() {
  const room = document.querySelector('#room');
  const leftLane = document.querySelector('#lane-left');
  const rightLane = document.querySelector('#lane-right');
  const discoBtn = document.querySelector('#disco-btn');
  const affirmBtn = document.querySelector('#affirm-btn');
  const attachBtn = document.querySelector('#attach-btn');
  const paperclip = document.querySelector('#paperclip');
  if (!room || !leftLane || !rightLane || !discoBtn || !affirmBtn) return;

  let timers = [];
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const clearTimers = () => {
    for (const id of timers) clearTimeout(id);
    timers = [];
  };

  function discard(card) {
    if (!card) return;
    card._tab?.remove();
    card.dispatchEvent(new Event('whimsy-discard'));
    card.remove();
  }

  function clearDisco() {
    clearTimers();
    room.classList.remove('disco-rainbow');
    discard(leftLane.querySelector('.troupe'));
  }

  function fillCats(stage) {
    stage.replaceChildren();
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
    for (const [coat, options] of troupe) {
      const figure = document.createElement('div');
      figure.className = 'cat-figure';
      figure.innerHTML = catSvg(options, coat);
      cats.append(figure);
    }
    stage.append(say, cats);
  }

  function startDisco() {
    clearDisco();
    const card = document.createElement('section');
    card.className = 'float troupe';
    card.setAttribute('aria-label', 'Disco cats');
    const bar = floatBar('Disco cats');
    bar.querySelector('[data-role="done"]').addEventListener('click', () => {
      clearTimers();
      discard(card);
    });
    const stage = document.createElement('div');
    stage.className = 'disco-stage';
    const ball = document.createElement('div');
    ball.className = 'disco-ball';
    ball.innerHTML = discoBallSvg();
    ball.setAttribute('role', 'img');
    ball.setAttribute('aria-label', 'A disco ball');
    stage.append(ball);
    card.append(bar, stage);
    leftLane.append(card);
    bindShelf(card, leftLane, 'Disco');
    enableDrag(card);
    placeInLane(card, leftLane, 16);
    room.classList.add('disco-rainbow');
    later(() => room.classList.remove('disco-rainbow'), RAINBOW_MS);
    later(() => {
      if (!card.isConnected) return;
      fillCats(stage);
    }, BALL_MS);
  }

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
    hit.innerHTML = catSvg({}, 'lilac');
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

  discoBtn.addEventListener('click', startDisco);
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

  const observer = new MutationObserver(() => {
    if (room.hidden) {
      clearDisco();
      discard(rightLane.querySelector('.affirm-card'));
    }
  });
  observer.observe(room, { attributes: true, attributeFilter: ['hidden'] });

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

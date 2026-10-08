// Square windows over the world: drag by the bar, resize from the corner, minimise to the tray.
// Only the window layout is remembered in this browser. Never chat, never a room word.

const LAYOUT_KEY = 'nook-pops';
const pops = new Map();
let topZ = 20;

function readLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeLayout(id, box) {
  try {
    const all = readLayout();
    all[id] = { x: Math.round(box.x), y: Math.round(box.y), size: Math.round(box.size) };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch {
    // Private windows can refuse storage. The window still works.
  }
}

function tray() {
  let el = document.querySelector('#tray');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tray';
    el.className = 'tray';
    document.body.append(el);
  }
  return el;
}

function viewport() {
  return { w: window.innerWidth, h: window.innerHeight };
}

export function popBar(title, { min = true, close = true } = {}) {
  const bar = document.createElement('div');
  bar.className = 'pop-bar';
  const grip = document.createElement('span');
  grip.className = 'grip';
  grip.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'pop-title';
  label.textContent = title;
  bar.append(grip, label);
  const tools = document.createElement('span');
  tools.className = 'pop-tools';
  if (min) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pop-btn';
    btn.dataset.role = 'min';
    btn.textContent = '–';
    btn.setAttribute('aria-label', `Minimise ${title}`);
    tools.append(btn);
  }
  if (close) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pop-btn';
    btn.dataset.role = 'close';
    btn.textContent = '×';
    btn.setAttribute('aria-label', `Close ${title}`);
    tools.append(btn);
  }
  bar.append(tools);
  return bar;
}

// el: the window element. bar: the drag handle inside it.
export function popup(el, { id, label = id, bar, square = true, min = 220, size: start = 360, place = 'center', onClose, onShow } = {}) {
  el.classList.add('pop');
  el.dataset.pop = id;
  const handle = bar || el.querySelector('.pop-bar');
  const grip = document.createElement('div');
  grip.className = 'pop-resize';
  grip.setAttribute('aria-hidden', 'true');
  el.append(grip);
  let tab = null;
  const saved = readLayout()[id];
  const box = { x: 0, y: 0, size: start };

  function maxSize() {
    const v = viewport();
    return Math.max(min, Math.min(v.w - 16, v.h - 16));
  }

  function initial() {
    const v = viewport();
    const size = Math.min(maxSize(), start);
    const spots = {
      center: { x: (v.w - size) / 2, y: (v.h - size) / 2 },
      right: { x: v.w - size - 16, y: 64 },
      left: { x: 16, y: 84 },
      'bottom-left': { x: 16, y: v.h - size - 16 },
      'top-right': { x: v.w - size - 16, y: 16 },
      'top-center': { x: (v.w - size) / 2, y: 84 },
      'bottom-center': { x: (v.w - size) / 2 - Math.min(160, v.w / 6), y: v.h - size - 84 },
    };
    const spot = typeof place === 'function' ? place(size, v) : spots[place] || spots.center;
    return { ...spot, size };
  }

  function apply() {
    const v = viewport();
    const narrow = v.w < 560;
    box.size = Math.max(Math.min(min, maxSize()), Math.min(maxSize(), box.size));
    const w = narrow ? v.w - 16 : box.size;
    const h = square ? (narrow ? Math.min(box.size, v.h - 16) : box.size) : null;
    box.x = Math.max(8 - w + 80, Math.min(v.w - 80, box.x));
    box.y = Math.max(8, Math.min(v.h - 44, box.y));
    el.style.left = `${narrow ? 8 : Math.round(box.x)}px`;
    el.style.top = `${Math.round(box.y)}px`;
    el.style.width = `${Math.round(w)}px`;
    el.style.height = h ? `${Math.round(h)}px` : '';
  }

  Object.assign(box, saved && Number.isFinite(saved.x) ? saved : initial());
  apply();

  function front() {
    topZ += 1;
    el.style.zIndex = String(topZ);
  }

  el.addEventListener('pointerdown', front, true);

  let drag = null;
  const onMove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.kind === 'move') {
      box.x = drag.x0 + (event.clientX - drag.cx);
      box.y = drag.y0 + (event.clientY - drag.cy);
    } else {
      const grow = Math.max(event.clientX - drag.cx, event.clientY - drag.cy);
      box.size = drag.s0 + grow;
    }
    apply();
  };
  const end = (event) => {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    drag = null;
    el.classList.remove('pop-dragging');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    writeLayout(id, box);
  };
  const begin = (event, kind) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = { id: event.pointerId, kind, cx: event.clientX, cy: event.clientY, x0: box.x, y0: box.y, s0: box.size };
    el.classList.add('pop-dragging');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  handle?.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, input, textarea, select, a, [data-no-drag]')) return;
    begin(event, 'move');
  });
  grip.addEventListener('pointerdown', (event) => begin(event, 'size'));
  handle?.addEventListener('keydown', (event) => {
    if (event.target !== handle) return;
    const step = event.shiftKey ? 32 : 12;
    const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const delta = keys[event.key];
    if (!delta) return;
    event.preventDefault();
    box.x += delta[0];
    box.y += delta[1];
    apply();
    writeLayout(id, box);
  });
  if (handle && !handle.hasAttribute('tabindex')) handle.tabIndex = 0;

  function hide() {
    el.hidden = true;
    if (tab) tab.hidden = true;
  }
  function show() {
    el.hidden = false;
    if (tab) tab.hidden = true;
    apply();
    front();
    if (onShow) onShow();
  }
  function minimise() {
    el.hidden = true;
    if (!tab) {
      tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tray-tab';
      tab.textContent = label;
      tab.setAttribute('aria-label', `Open ${label}`);
      tab.addEventListener('click', show);
      tray().append(tab);
    }
    tab.hidden = false;
  }
  el.querySelector('.pop-bar [data-role="min"]')?.addEventListener('click', minimise);
  el.querySelector('.pop-bar [data-role="close"]')?.addEventListener('click', () => {
    hide();
    if (onClose) onClose();
  });

  const controller = {
    el,
    show,
    hide,
    minimise,
    front,
    toggle(force) {
      const open = typeof force === 'boolean' ? force : el.hidden;
      if (open) show();
      else hide();
      return open;
    },
    isOpen: () => !el.hidden,
    reset() {
      Object.assign(box, initial());
      apply();
      writeLayout(id, box);
    },
    discard() {
      tab?.remove();
      el.remove();
      pops.delete(id);
    },
  };
  pops.set(id, { controller, apply });
  return controller;
}

window.addEventListener('resize', () => {
  for (const { apply } of pops.values()) apply();
});

export function resetPops() {
  for (const { controller } of pops.values()) controller.reset();
}

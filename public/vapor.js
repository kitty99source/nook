// Mounts the vaporwave scene from vapor-art.js. No inline styles, no network.
import { sceneMarkup } from './vapor-art.js';

const REDUCE = '(prefers-reduced-motion: reduce)';
const MAX_SHIFT = 12;

let started = false;

function passedDoor() {
  const room = document.querySelector('#room');
  return !!(room && !room.hidden);
}

export function initVapor() {
  if (started) return;
  started = true;

  const reduceQuery = window.matchMedia(REDUCE);
  let root = null;
  let mode = '';
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let raf = 0;
  let hasBlobs = false;

  function reduced() {
    return reduceQuery.matches;
  }

  function stopShift() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function clearShift() {
    stopShift();
    tx = 0;
    ty = 0;
    cx = 0;
    cy = 0;
    if (!root) return;
    root.removeAttribute('data-px');
    root.removeAttribute('data-py');
  }

  function applyMotion() {
    if (!root) return;
    root.dataset.motion = reduced() ? 'off' : 'full';
    if (reduced()) clearShift();
  }

  function holdSun() {
    if (!root) return;
    if (passedDoor()) root.removeAttribute('data-vapor-hold');
    else root.setAttribute('data-vapor-hold', '');
  }

  function syncPause() {
    if (document.hidden) document.documentElement.setAttribute('data-vapor-paused', '');
    else document.documentElement.removeAttribute('data-vapor-paused');
    if (document.hidden) stopShift();
  }

  function drop() {
    stopShift();
    hasBlobs = false;
    mode = '';
    if (root) root.remove();
    root = null;
  }

  function build(theme) {
    if (!root) {
      root = document.createElement('div');
      root.id = 'vapor';
      root.setAttribute('aria-hidden', 'true');
      const world = document.querySelector('#world');
      if (world) world.before(root);
      else document.body.prepend(root);
    }
    root.innerHTML = sceneMarkup(theme);
    mode = theme;
    hasBlobs = !!root.querySelector('.vapor-blob');
    applyMotion();
    holdSun();
    syncPause();
    clearShift();
  }

  function sync() {
    const theme = document.body.dataset.theme || '';
    if (!theme.startsWith('vapor-')) {
      drop();
      return;
    }
    if (!root || mode !== theme) build(theme);
    else {
      applyMotion();
      holdSun();
    }
  }

  function step() {
    raf = 0;
    if (!root || reduced() || document.hidden || !hasBlobs) return;
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    const x = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, Math.round(cx)));
    const y = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, Math.round(cy)));
    if (root.dataset.px !== String(x)) root.dataset.px = String(x);
    if (root.dataset.py !== String(y)) root.dataset.py = String(y);
    if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) {
      raf = requestAnimationFrame(step);
    }
  }

  function onPointer(event) {
    if (!hasBlobs || reduced() || document.hidden) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    tx = ((event.clientX / w) * 2 - 1) * MAX_SHIFT;
    ty = ((event.clientY / h) * 2 - 1) * MAX_SHIFT;
    if (!raf) raf = requestAnimationFrame(step);
  }

  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const room = document.querySelector('#room');
  if (room) {
    new MutationObserver(() => holdSun()).observe(room, {
      attributes: true,
      attributeFilter: ['hidden'],
    });
  }

  document.addEventListener('visibilitychange', syncPause);
  reduceQuery.addEventListener('change', () => {
    applyMotion();
    if (!reduced() && root) hasBlobs = !!root.querySelector('.vapor-blob');
  });
  window.addEventListener('pointermove', onPointer, { passive: true });
  sync();
}

initVapor();

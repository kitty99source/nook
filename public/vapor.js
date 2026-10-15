// Mounts the vaporwave scene from vapor-art.js. No inline styles, no network.
import { panelSceneMarkup, sceneMarkup } from './vapor-art.js';

const REDUCE = '(prefers-reduced-motion: reduce)';
const MAX_SHIFT = 12;

let started = false;

// The loading scene covers the codeword screen only. Chat can be hidden
// and the town is still on: the door, not the chat window, decides.
export function townRevealed(doorHidden) {
  return doorHidden === true;
}

function passedDoor() {
  const door = document.querySelector('#door');
  return townRevealed(!!door && door.hidden);
}

export function initVapor() {
  if (started) return;
  started = true;

  const reduceQuery = window.matchMedia(REDUCE);
  let root = null;
  let chat = null;
  let mode = '';
  let chatMode = '';
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

  function mirrorChatMotion() {
    if (!chat || !root || !root.dataset.motion) return;
    if (chat.dataset.motion !== root.dataset.motion) chat.dataset.motion = root.dataset.motion;
  }

  function mirrorChatHold() {
    if (!chat) return;
    if (passedDoor()) chat.removeAttribute('data-vapor-hold');
    else chat.setAttribute('data-vapor-hold', '');
  }

  function applyMotion() {
    if (!root) return;
    root.dataset.motion = reduced() ? 'off' : 'full';
    mirrorChatMotion();
    if (reduced()) clearShift();
  }

  function holdSun() {
    if (root) {
      if (passedDoor()) root.removeAttribute('data-vapor-hold');
      else root.setAttribute('data-vapor-hold', '');
    }
    mirrorChatHold();
  }

  function syncChat() {
    const theme = document.body.dataset.theme || '';
    const room = document.querySelector('#room');
    const on = theme.startsWith('vapor-') && document.body.dataset.chatScene === 'on' && !!room;
    if (!on) {
      if (chat) chat.remove();
      chat = null;
      chatMode = '';
      return;
    }
    if (!chat || !chat.isConnected) {
      chat = document.createElement('div');
      chat.id = 'vapor-chat';
      chat.setAttribute('aria-hidden', 'true');
      chatMode = '';
    }
    if (room.firstElementChild !== chat) room.prepend(chat);
    if (chatMode !== theme) {
      chat.innerHTML = panelSceneMarkup(theme);
      chatMode = theme;
    }
    mirrorChatHold();
    mirrorChatMotion();
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
    // The full-page scene covers the codeword screen only. Once the room is
    // showing, take #vapor away so it cannot sit on the game.
    if (!theme.startsWith('vapor-') || passedDoor()) {
      drop();
      syncChat();
      return;
    }
    if (!root || mode !== theme) build(theme);
    else {
      applyMotion();
      holdSun();
    }
    syncChat();
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
    attributeFilter: ['data-theme', 'data-chat-scene'],
  });

  const door = document.querySelector('#door');
  if (door) {
    new MutationObserver(sync).observe(door, {
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

if (typeof document !== 'undefined') initVapor();

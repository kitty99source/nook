// The Colosseum of Friendship: a little town on Lantern Moon behind the chat.
// Chat rules are untouched. Game state stays in this browser; positions travel as locked parcels.

import { decryptJson, encryptJson } from './e2e.js';
import { popBar, popup } from './popup.js';
import {
  ARENA,
  BAR_SLOTS,
  CATALOG,
  CLICK_BOUNDS,
  CLUES,
  COLOURS,
  DRINK_PRICE,
  EMOTE_REACH,
  FRIEND_STAGES,
  GAME_MS,
  GOODS,
  GORE_LEVELS,
  LOOKS,
  MARKET_PAY,
  MOVE_SPEED,
  PARTS,
  PART_PRICE,
  PLANET_FARE,
  PLAYER_HP,
  SKILLS,
  TYPING_PHRASE,
  WEAPONS,
  WORKS,
  WORK_SECONDS,
  acceptTrade,
  aimAngle,
  applyCatLoot,
  applyHit,
  applyPurse,
  askOut,
  beamRay,
  bindOpenBets,
  buyDrink,
  buyPart,
  buySkill,
  catLoot,
  circleAt,
  clampArena,
  clickWin,
  declineTrade,
  doorAt,
  dropOffer,
  duelOutcome,
  eatSnack,
  emptySave,
  equip,
  fireWeapon,
  friendRecord,
  friendStage,
  getMap,
  giftTo,
  goreBits,
  hitBox,
  launchPlanet,
  mayEnter,
  moveFavourite,
  nearestSpot,
  nextClue,
  nextPatchCost,
  offerTrade,
  orderFavourites,
  pinErrand,
  placeBet,
  planetGate,
  propose,
  purchase,
  rankBoard,
  releaseEscrow,
  releaseOffers,
  resolveShots,
  respawn,
  rollAlien,
  saberBlocks,
  saberSegment,
  saberStrikes,
  sanitiseSave,
  scoreClick,
  segmentHitsRect,
  sellGood,
  setAlly,
  settleBets,
  skillLabel,
  skillStats,
  sparkSide,
  spawnActor,
  stepActor,
  stepAlien,
  stepBeam,
  stepShots,
  tabTarget,
  talkTo,
  tickWorks,
  toggleInvite,
  transferIn,
  transferOut,
  turnInErrand,
  typingWin,
  unlockPatch,
  useClue,
  walkingIntent,
  weaponCooldown,
  withinReach,
} from './colosseum-logic.mjs';
import { WORK_SPOTS, buildingFor } from './colosseum-world.mjs';
import { CLUE_TEXT, NPCS, PLANET_TEXT, VOICES } from './colosseum-story.mjs';
import {
  buildingSprite,
  drawBackdrop,
  drawBeam,
  drawBlockFlash,
  drawCat,
  drawFurniture,
  drawGun,
  drawHpPips,
  drawMachine,
  drawParticles,
  drawProp,
  drawRing,
  drawSaber,
  drawShot,
  drawSwing,
  drawTag,
  groundLayer,
  iconCopy,
  paintFace,
  propGlow,
} from './colosseum-art.js';

const SAVE_KEY = 'nook-colosseum';
const NPC_BY_ID = new Map(NPCS.map((npc) => [npc.id, npc]));
const ITEM_NAMES = new Map([...PARTS, ...GOODS].map((item) => [item.id, item.name]));
const EMOTES = [['Fist bump', '👊'], ['High five', '🙌'], ['Poke', '👉']];

let api = null;
let save = emptySave();
let stats = skillStats([]);
let mounted = false;
let mode = 'chat';
let mapId = 'town';
let mapOwner = '';
let map = getMap('town');
let actor = spawnActor(map);
let aim = 0;
let hp = PLAYER_HP;
let invuln = 0;
let held = {};
let mouse = { x: 0, y: 0, down: false, inside: false };
let slot = 0;
let lastStamp = 0;
let clock = 0;
let scale = 3;
let cam = { x: 0, y: 0 };
let pollTimer = 0;
let pollMs = 250;
let lastGameId = 0;
let gameSeq = 0;
let placeTimer = 0;
let lastPlaceSig = '';
let homeTimer = 0;
let persistTimer = 0;
let catClock = 0;
let cool = 0;
let beam = { energy: 1, locked: false, on: false };
let saber = { guardUntil: 0, swingAt: -1, angle: 0 };
let match = null;
let duel = null;
let clickGame = null;
let typeGame = null;
let offer = null;
let tradeOffer = null;
let talk = null;
let card = null;
let status = '';
let tab = 'games';
let audio = null;
const seenGame = new Set();
const applied = new Set();
const postcards = [];
const others = new Map();
const homes = new Map();
const myShots = [];
const foeShots = [];
const matchShots = [];
const aliens = [];
const particles = [];
const rings = [];
const flashes = [];
const splats = [];
const swings = [];
const emoteBubbles = [];
const npcState = new Map();
const els = {};

// ---- Small helpers -------------------------------------------------------------

function roomOpen() {
  const room = document.querySelector('#room');
  return !!(room && !room.hidden && api);
}

function me() {
  return api ? api.getMemberId() : '';
}

function myName() {
  return (api && api.getName()) || 'Someone';
}

function people() {
  return api && api.people ? api.people() : [];
}

function mapKey() {
  return mapId === 'home' ? `home:${mapOwner}` : mapId;
}

function atHome() {
  return mapId === 'home' && mapOwner === me();
}

function itemName(id) {
  return ITEM_NAMES.get(id) || CATALOG.find((row) => row.id === id)?.name || WEAPONS[id]?.name || id;
}

function say(text) {
  status = text;
  if (els.status) els.status.textContent = text;
  if (els.toast) {
    els.toast.textContent = text;
    els.toast.hidden = !text;
    els.toast.classList.remove('toast-fade');
    void els.toast.offsetWidth;
    els.toast.classList.add('toast-fade');
  }
}

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function button(label, fn, className = '') {
  const node = h('button', className, label);
  node.type = 'button';
  node.addEventListener('click', fn);
  return node;
}

function setSave(next) {
  save = sanitiseSave(next);
  stats = skillStats(save.skills);
  schedulePersist();
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 400);
}

function persist() {
  const place = mapId === 'home' || mapId === 'planet2' && !save.planet
    ? { map: 'town', x: buildingFor('home').spawn.x, y: buildingFor('home').spawn.y }
    : { map: mapId, x: Math.round(actor.x), y: Math.round(actor.y) };
  save = sanitiseSave({ ...save, place });
  const text = JSON.stringify(save);
  try { localStorage.setItem(SAVE_KEY, text); } catch { /* private mode */ }
  if (api && api.writeCopy) api.writeCopy(text).catch(() => {});
}

async function loadSave() {
  let raw = '';
  try { raw = localStorage.getItem(SAVE_KEY) || ''; } catch { raw = ''; }
  if (!raw && api && api.readCopy) {
    try { raw = await api.readCopy(); } catch { raw = ''; }
  }
  try { save = raw ? sanitiseSave(JSON.parse(raw)) : emptySave(); } catch { save = emptySave(); }
  stats = skillStats(save.skills);
}

function beep(kind) {
  try {
    audio = audio || new AudioContext();
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = kind === 'block' ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(kind === 'block' ? 1320 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'block' ? 1980 : 110, now + 0.08);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch { /* no sound is fine */ }
}

// ---- Chat or world -------------------------------------------------------------

function focusSnapshot() {
  const el = document.activeElement;
  if (!roomOpen() || !el || el === document.body || el === document.documentElement) {
    return { inRoom: roomOpen(), mode, field: null };
  }
  const tag = el.tagName;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  const text = tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
    || (tag === 'INPUT' && !['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file'].includes(type));
  return {
    inRoom: true,
    mode,
    field: { text, chat: !!el.closest('#room'), door: !!el.closest('#door') },
  };
}

function setMode(next) {
  if (mode === next) return;
  mode = next;
  held = {};
  mouse.down = false;
  beam.on = false;
  document.body.dataset.mode = next;
  paintHud();
}

function toChat() {
  const room = document.querySelector('#room');
  if (room && room.hidden) return;
  const pop = room?._pop;
  if (pop && !pop.isOpen()) pop.show();
  document.querySelector('#text')?.focus();
  setMode('chat');
}

function toWorld() {
  const el = document.activeElement;
  if (el && el !== document.body) el.blur();
  setMode('world');
}

function keyName(event) {
  const byCode = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  }[event.code];
  return byCode || '';
}

function typingSomewhere() {
  const snap = focusSnapshot();
  return !!(snap.field && snap.field.text);
}

function onKeyDown(event) {
  if (event.key === 'Tab' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
    const target = tabTarget(focusSnapshot());
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (target === 'chat') toChat();
    else toWorld();
    return;
  }
  if (!roomOpen() || mode !== 'world' || typingSomewhere()) return;
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  const name = keyName(event);
  if (name) {
    event.preventDefault();
    held[name] = true;
    return;
  }
  if (event.key === 'e' || event.key === 'E' || event.key === 'Enter') {
    if (event.target && event.target.closest && event.target.closest('button')) return;
    event.preventDefault();
    interact();
    return;
  }
  if (/^[1-5]$/.test(event.key)) {
    event.preventDefault();
    pickSlot(Number(event.key) - 1);
    return;
  }
  if (event.key === 'Escape') {
    closeTalk();
    closeCard();
  }
}

function onKeyUp(event) {
  const name = keyName(event);
  if (name) held[name] = false;
}

function pickSlot(index) {
  const id = save.bar[index];
  if (id === 'snack') {
    const fed = eatSnack(save, hp);
    if (fed.ok) {
      setSave(fed.save);
      hp = fed.hp;
      say('A vat snack. Two hearts back.');
    } else say(fed.reason === 'full' ? 'Already full of beans.' : 'No snacks in the bag.');
    paintBar();
    paintHud();
    return;
  }
  slot = index;
  beam.on = false;
  paintBar();
}

function weapon() {
  const id = save.bar[slot];
  return WEAPONS[id] ? id : '';
}

function bindPointer() {
  const canvas = els.canvas;
  const toWorldPoint = (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  };
  window.addEventListener('pointermove', (event) => {
    toWorldPoint(event);
    mouse.inside = event.target === canvas;
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!roomOpen() || event.button !== 0) return;
    toWorldPoint(event);
    if (mode !== 'world') {
      toWorld();
      return;
    }
    event.preventDefault();
    if (talk) {
      advanceTalk();
      return;
    }
    mouse.down = true;
    pullTrigger(true);
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
    beam.on = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  const room = document.querySelector('#room');
  room.addEventListener('pointerdown', () => setMode('chat'), true);
  room.addEventListener('click', (event) => {
    if (event.target.closest('button, a, input, textarea, select, video, iframe, img, [contenteditable], .pop-bar, .pop-resize, .drawer')) return;
    const picked = window.getSelection && String(window.getSelection() || '');
    if (picked) return;
    document.querySelector('#text')?.focus();
  });
  room.addEventListener('focusin', () => setMode('chat'));
  room.querySelector('.pop-bar [data-role="min"]')?.addEventListener('click', () => setTimeout(toWorld, 0));
}

// ---- Locked parcels for the game --------------------------------------------------

async function publish(kind, body) {
  const key = api && api.getGroupKey();
  const token = api && api.getToken();
  if (!key || !token) return;
  gameSeq += 1;
  try {
    const parcel = await encryptJson(key, { v: 2, kind, from: me(), seq: gameSeq, body });
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-token': token },
      body: JSON.stringify(parcel),
    });
  } catch { /* the room can miss one parcel */ }
}

function rememberCard(cardRow) {
  const idx = postcards.findIndex((item) => item.memberId === cardRow.memberId);
  if (idx >= 0) postcards[idx] = cardRow;
  else postcards.push(cardRow);
}

function ownCard() {
  return { memberId: me() || 'me', name: myName(), coins: save.coins, wins: save.wins, seq: gameSeq };
}

function postcard() {
  publish('postcard', { name: myName(), coins: save.coins, wins: save.wins, losses: save.losses, colour: save.colour });
}

function grant(outcome) {
  const purseNow = applyPurse(save.coins, outcome);
  const next = { ...save, coins: purseNow.coins };
  if (outcome === 'win') next.wins += 1;
  if (outcome === 'loss') next.losses += 1;
  setSave(next);
  postcard();
  const line = outcome === 'win' ? `Won ${purseNow.delta} coins.` : outcome === 'loss' ? 'A small loss.' : 'A draw.';
  say(`${line} Purse ${save.coins}.`);
  paintPanel();
  paintHud();
}

function applyParcel(payload, row) {
  if (!payload || payload.from !== row.memberId) return;
  const key = `${payload.kind}:${payload.from}:${payload.seq}`;
  if (applied.has(key)) return;
  applied.add(key);
  const body = payload.body || {};
  const mine = payload.from === me();
  const kind = payload.kind;
  if (kind === 'postcard') {
    rememberCard({ memberId: payload.from, name: body.name, coins: body.coins, wins: body.wins, seq: payload.seq });
  } else if (kind === 'place') {
    if (mine) return;
    const prev = others.get(payload.from);
    const next = { ...body, id: payload.from, at: Date.now() };
    next.dx = prev && prev.map === body.map ? prev.dx : body.x;
    next.dy = prev && prev.map === body.map ? prev.dy : body.y;
    next.step = prev ? prev.step || 0 : 0;
    others.set(payload.from, next);
  } else if (kind === 'send' && body.to === me()) {
    const got = transferIn(save.coins, body.amount);
    if (got.ok) {
      setSave({ ...save, coins: got.coins });
      say(`Received ${body.amount} coins.`);
    }
  } else if (kind === 'gift' && body.to === me()) {
    offer = { id: key, from: payload.from, name: body.name, amount: body.amount, giftId: body.id };
    say(`${body.name} offered ${body.amount} coins. See Purse.`);
  } else if (kind === 'gift-accept' && body.to === me()) {
    setSave({ ...save, escrow: (save.escrow || []).filter((gift) => gift.id !== body.id) });
  } else if (kind === 'gift-decline' && body.to === me()) {
    const gift = (save.escrow || []).find((item) => item.id === body.id);
    if (gift) {
      setSave({ ...save, coins: transferIn(save.coins, gift.amount).coins, escrow: save.escrow.filter((item) => item.id !== body.id) });
      say('The gift came back.');
    }
  } else if (kind === 'duel') {
    takeDuel(payload.from, body);
  } else if (kind === 'shot') {
    if (!mine && match && match.on && body.matchKey === match.id && !matchShots.some((shot) => shot.id === body.id)) matchShots.push(body);
  } else if (kind === 'hit' && body.to === me()) {
    if (match && match.on && body.matchKey === match.id) takeMatchHit(payload.from, body.damage || 1);
  } else if (kind === 'match-open' && !mine) {
    if (!(match && match.on)) match = { invite: body.matchKey, from: payload.from, fromName: body.name, lives: body.lives };
    say(`${body.name} opened a match at the Colosseum.`);
  } else if (kind === 'match-end') {
    finishMatch(body);
  } else if (kind === 'emote') {
    if (!body.to || body.to === me()) bubble(payload.from, body.icon);
  } else if (kind === 'trade' && body.to === me()) {
    tradeOffer = { id: body.id, from: payload.from, name: body.name, item: body.item, count: body.count };
    say(`${body.name} offered ${itemName(body.item)}. See Bag.`);
  } else if (kind === 'trade-accept' && body.to === me()) {
    setSave(dropOffer(save, body.id));
    say('They took it.');
  } else if (kind === 'trade-decline' && body.to === me()) {
    const back = declineTrade(save, body.id);
    if (back.ok) setSave(back.save);
    say('The offer came back.');
  } else if (kind === 'drink' && body.to === me()) {
    say(`${body.name} bought you a drink.`);
  } else if (kind === 'home' && !mine) {
    if (body.open === false || !mayEnter(body.invites, myName())) {
      homes.delete(payload.from);
      if (mapId === 'home' && mapOwner === payload.from) {
        goTo('town', { spawn: buildingFor('home').spawn });
        say('That door closed.');
      }
    } else {
      homes.set(payload.from, { ...body, id: payload.from, at: Date.now() });
      if (mapId === 'home' && mapOwner === payload.from && body.patches !== map.openPatches) {
        map = getMap('home', { patches: body.patches });
      }
    }
  }
  if (els.pop && !els.pop.hidden && !['place', 'shot', 'emote', 'home'].includes(kind)) paintPanel();
}

async function pollGames() {
  const token = api && api.getToken();
  const key = api && api.getGroupKey();
  if (!token || !key || !roomOpen()) return;
  try {
    const res = await fetch(`/api/game?since=${lastGameId}`, { headers: { 'x-token': token }, cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (Number.isFinite(data.pollMs) && data.pollMs >= 100) pollMs = data.pollMs;
    for (const row of data.parcels || []) {
      if (row.id > lastGameId) lastGameId = row.id;
      if (seenGame.has(row.id)) continue;
      seenGame.add(row.id);
      try {
        applyParcel(await decryptJson(key, row), row);
      } catch { /* a parcel for another key */ }
    }
  } catch { /* the room can miss one tick */ }
}

function schedulePoll() {
  clearTimeout(pollTimer);
  if (!roomOpen()) return;
  pollTimer = setTimeout(async () => {
    await pollGames();
    schedulePoll();
  }, pollMs);
}

function publishPlace(force = false) {
  const body = {
    map: mapKey(),
    x: Math.round(actor.x),
    y: Math.round(actor.y),
    f: actor.facing,
    m: actor.moving ? 1 : 0,
    look: save.look,
    colour: save.colour,
    name: myName(),
    gun: weapon(),
    aim: Math.round(aim * 100) / 100,
    guard: saber.guardUntil > clock ? 1 : 0,
    beam: beam.on ? 1 : 0,
    match: match && match.on ? match.id : '',
  };
  const sig = JSON.stringify(body);
  if (!force && sig === lastPlaceSig) return;
  lastPlaceSig = sig;
  publish('place', body);
}

function publishHome(open = atHome()) {
  publish('home', {
    open: open && save.invites.length > 0,
    invites: save.invites,
    patches: save.patches,
    works: save.works,
    furniture: save.furniture,
    name: myName(),
  });
}

// ---- Moving between places -----------------------------------------------------------

function goTo(id, { spawn = null, owner = '' } = {}) {
  const leavingHome = atHome();
  mapId = id;
  mapOwner = id === 'home' ? owner || me() : '';
  const patches = id === 'home' ? (mapOwner === me() ? save.patches : homes.get(mapOwner)?.patches || 1) : 1;
  map = getMap(id, { patches });
  const at = spawn || map.spawn;
  actor = { ...actor, x: at.x, y: at.y, moving: false, facing: id === 'town' ? 'down' : 'up' };
  aliens.length = 0;
  myShots.length = 0;
  foeShots.length = 0;
  splats.length = 0;
  closeTalk();
  closeCard();
  if (leavingHome && !atHome()) publishHome(false);
  if (atHome()) publishHome(true);
  publishPlace(true);
  schedulePersist();
  paintHud();
}

function enterDoor(door) {
  if (door.to === 'town') {
    const from = mapId === 'home' ? buildingFor('home') : buildingFor(mapId);
    goTo('town', { spawn: from ? from.spawn : null });
    return;
  }
  if (door.to === 'home') {
    openHabCard();
    return;
  }
  goTo(door.to);
}

// ---- Interacting -----------------------------------------------------------------------

function nearbyNpc() {
  let best = null;
  let bestD = 26;
  for (const npc of npcsHere()) {
    const d = Math.hypot(npc.x - actor.x, npc.y - actor.y);
    if (d < bestD) {
      best = npc;
      bestD = d;
    }
  }
  return best;
}

function nearbySpot() {
  return nearestSpot(map.spots || [], actor);
}

function nearbyDoor() {
  for (const door of map.doors || []) {
    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    if (Math.hypot(cx - actor.x, cy - actor.y) < 22) return door;
  }
  return null;
}

function interact() {
  if (talk) {
    advanceTalk();
    return;
  }
  const npc = nearbyNpc();
  if (npc) {
    openTalk(npc.id);
    return;
  }
  const spot = nearbySpot();
  if (spot) {
    useSpot(spot);
    return;
  }
  const door = nearbyDoor();
  if (door) enterDoor(door);
}

function promptText() {
  if (talk || card) return '';
  const npc = nearbyNpc();
  if (npc) return { text: `E · Talk to ${NPC_BY_ID.get(npc.id)?.name || 'them'}`, x: npc.x, y: npc.y - 26 };
  const spot = nearbySpot();
  if (spot) return { text: `E · ${spot.label}`, x: spot.x, y: spot.y - 22 };
  const door = nearbyDoor();
  if (door) return { text: `E · ${door.to === 'town' ? 'Outside' : door.label}`, x: door.x + door.w / 2, y: door.y - 6 };
  return '';
}

// ---- NPCs: local only --------------------------------------------------------------

function npcsHere() {
  const list = [];
  for (const spec of map.npcs || []) {
    let state = npcState.get(spec.id);
    if (!state || state.map !== map.id) {
      state = { id: spec.id, map: map.id, x: spec.x, y: spec.y, homeX: spec.x, homeY: spec.y, wander: spec.wander, facing: 'down', moving: false, step: 0, goal: null, wait: 1 };
      npcState.set(spec.id, state);
    }
    list.push(state);
  }
  return list;
}

function stepNpcs(dt) {
  for (const npc of npcsHere()) {
    if (talk && talk.npc === npc.id) {
      npc.moving = false;
      const dx = actor.x - npc.x;
      const dy = actor.y - npc.y;
      npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      continue;
    }
    if (!npc.wander) continue;
    npc.wait -= dt;
    if (!npc.goal && npc.wait <= 0) {
      const a = Math.random() * Math.PI * 2;
      npc.goal = { x: npc.homeX + Math.cos(a) * npc.wander * Math.random(), y: npc.homeY + Math.sin(a) * npc.wander * Math.random() };
    }
    if (npc.goal) {
      const input = {
        right: npc.goal.x > npc.x + 2, left: npc.goal.x < npc.x - 2,
        down: npc.goal.y > npc.y + 2, up: npc.goal.y < npc.y - 2,
      };
      const moved = stepActor(npc, input, map, dt, { speed: 28 });
      const stuck = Math.abs(moved.x - npc.x) + Math.abs(moved.y - npc.y) < 0.01;
      Object.assign(npc, { x: moved.x, y: moved.y, facing: moved.facing, moving: moved.moving, step: moved.step || npc.step });
      if (stuck || (!input.right && !input.left && !input.up && !input.down)) {
        npc.goal = null;
        npc.moving = false;
        npc.wait = 1.5 + Math.random() * 3;
      }
    }
  }
}

// ---- Combat ------------------------------------------------------------------------------

function chest() {
  return { x: actor.x, y: actor.y - 8 };
}

function covers() {
  return match && match.on ? ARENA.covers : [];
}

function pullTrigger(first) {
  const id = weapon();
  if (!id || talk) return;
  const spec = WEAPONS[id];
  if (spec.trigger === 'tap' && !first) return;
  if (id === 'beam') {
    beam.on = true;
    return;
  }
  if (clock < cool) return;
  cool = clock + weaponCooldown(id, stats.fireRate);
  if (id === 'saber') {
    saber.guardUntil = clock + stats.blockWindow;
    saber.swingAt = clock;
    saber.angle = aim;
    swings.push({ x: actor.x, y: actor.y - 8, angle: aim, life: 0.25 });
    for (const alien of aliens) {
      if (saberStrikes(chest(), aim, { x: alien.x, y: alien.y - 6 })) damageAlien(alien, spec.damage);
    }
    if (match && match.on) {
      for (const other of others.values()) {
        if (other.map !== mapKey() || other.match !== match.id) continue;
        if (saberStrikes(chest(), aim, { x: other.dx, y: other.dy - 6 })) publish('hit', { to: other.id, damage: 1, matchKey: match.id });
      }
    }
    return;
  }
  const shot = fireWeapon(id, chest(), aim, { aim: stats.aim });
  if (!shot) return;
  shot.from = me();
  shot.id = `${me()}-${clock.toFixed(3)}`;
  if (match && match.on) {
    shot.matchKey = match.id;
    matchShots.push(shot);
    publish('shot', shot);
  } else myShots.push(shot);
}

function burst(x, y, colours, n, speed = 60, life = 0.5, size = 1) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      x, y, z: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: 0,
      life: life * (0.6 + Math.random() * 0.6), max: life, colour: colours[i % colours.length], size,
    });
  }
}

function explodeAlien(alien) {
  const bits = goreBits(save.gore);
  rings.push({ x: alien.x, y: alien.y - 6, r0: 2, r1: 16, life: 0.35, max: 0.35, colour: '#ffffff', width: 2 });
  burst(alien.x, alien.y - 6, ['#ffffff', '#d9c4ff', '#ffd6f6'], 10, 50, 0.45);
  for (let i = 0; i < bits; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = 30 + Math.random() * 70;
    particles.push({
      x: alien.x, y: alien.y, z: 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 40 + Math.random() * 60,
      life: 1.4, max: 1.4, colour: ['#7b4bb8', '#4c2a80', '#7dff6a', '#b48ce8', '#3b3550'][i % 5],
      size: 1 + (i % 3 === 0 ? 1 : 0), gravity: true, splat: save.gore >= 2, fade: false,
    });
  }
}

function damageAlien(alien, amount) {
  alien.hp -= amount;
  alien.flash = 0.12;
  if (alien.hp > 0) return;
  const idx = aliens.indexOf(alien);
  if (idx >= 0) aliens.splice(idx, 1);
  explodeAlien(alien);
  const loot = catLoot(Math.random());
  setSave(applyCatLoot(save, loot));
  say(loot.part ? `The alien cat dropped coins and ${itemName(loot.part)}.` : 'The alien cat dropped a few coins.');
  paintHud();
  paintPanel();
}

function hurtMe(amount) {
  if (invuln > 0) return;
  hp = Math.max(0, hp - amount);
  invuln = 0.8;
  burst(actor.x, actor.y - 8, ['#ff5a7a', '#ffffff'], 6, 40, 0.3);
  if (hp <= 0) {
    hp = PLAYER_HP;
    aliens.length = 0;
    foeShots.length = 0;
    goTo('town', { spawn: getMap('town').spawn });
    say('Knocked out. Back on your paws in the plaza.');
  }
  paintHud();
}

function blockEffect(x, y) {
  flashes.push({ x, y, life: 0.3, max: 0.3, spin: Math.random() });
  rings.push({ x, y, r0: 3, r1: 18, life: 0.3, max: 0.3, colour: '#fff3a0', width: 2 });
  burst(x, y, ['#ffffff', '#fff3a0', '#9bf6ff'], 12, 90, 0.35);
  beep('block');
}

function guardUp() {
  return weapon() === 'saber' && saber.guardUntil > clock;
}

function tryBlock(prev, next) {
  if (!guardUp()) return false;
  if (!saberBlocks(chest(), aim, prev, next)) return false;
  const seg = saberSegment(chest(), aim);
  blockEffect((seg.x0 + seg.x1) / 2, (seg.y0 + seg.y1) / 2);
  return true;
}

function stepCombat(dt) {
  if (mouse.down && WEAPONS[weapon()]?.trigger === 'hold') pullTrigger(false);
  // Beam.
  if (weapon() === 'beam') {
    const stepped = stepBeam(beam.energy, { firing: beam.on && mouse.down, locked: beam.locked }, dt);
    beam.energy = stepped.energy;
    beam.locked = stepped.locked;
    beam.firing = stepped.firing;
    if (beam.firing) {
      const seg = beamRay(chest(), aim, WEAPONS.beam.length, covers(), map);
      beam.seg = seg;
      for (const alien of [...aliens]) {
        if (segmentHitsRect(seg, hitBox(alien), 1)) {
          alien.burn = (alien.burn || 0) + WEAPONS.beam.dps * dt;
          if (alien.burn >= 1) {
            alien.burn -= 1;
            damageAlien(alien, 1);
          }
        }
      }
      if (match && match.on && clock > (beam.hitAt || 0)) {
        for (const other of others.values()) {
          if (other.map !== mapKey() || other.match !== match.id) continue;
          if (segmentHitsRect(seg, hitBox({ x: other.dx, y: other.dy }), 1)) {
            publish('hit', { to: other.id, damage: 1, matchKey: match.id });
            beam.hitAt = clock + 0.5;
          }
        }
      }
    }
  } else {
    beam.firing = false;
    beam.energy = Math.min(1, beam.energy + WEAPONS.beam.recharge * dt);
    if (beam.energy >= 1) beam.locked = false;
  }
  // My shots against aliens.
  const mine = stepShots(myShots, map, dt, covers());
  myShots.length = 0;
  for (const shot of mine.shots) {
    const target = aliens.find((alien) => {
      const box = hitBox(alien);
      return shot.x >= box.x - shot.r && shot.x <= box.x + box.w + shot.r && shot.y >= box.y - shot.r && shot.y <= box.y + box.h + shot.r;
    });
    if (target) {
      impact(shot, shot.x, shot.y, target);
      continue;
    }
    myShots.push(shot);
  }
  for (const hit of mine.impacts) impact(hit.shot, hit.x, hit.y, null);
  // Alien shots against me, unless the blade lines up.
  const theirs = stepShots(foeShots, map, dt);
  const alive = [];
  for (const shot of theirs.shots) {
    const from = { x: shot.x - shot.vx * dt, y: shot.y - shot.vy * dt };
    if (tryBlock(from, shot)) continue;
    const box = hitBox(actor);
    if (shot.x >= box.x - 2 && shot.x <= box.x + box.w + 2 && shot.y >= box.y - 2 && shot.y <= box.y + box.h + 2) {
      hurtMe(shot.damage || 1);
      continue;
    }
    alive.push(shot);
  }
  foeShots.length = 0;
  foeShots.push(...alive);
  for (const hit of theirs.impacts) burst(hit.x, hit.y, ['#7dff6a', '#d9ffd0'], 4, 30, 0.25);
}

function impact(shot, x, y, target) {
  if (shot.splash) {
    rings.push({ x, y, r0: 4, r1: shot.splash, life: 0.4, max: 0.4, colour: '#ff8a3d', width: 3 });
    burst(x, y, ['#ff8a3d', '#ffd166', '#8b93a8'], 16, 70, 0.6, 2);
    for (const alien of [...aliens]) {
      if (Math.hypot(alien.x - x, alien.y - 6 - y) <= shot.splash) damageAlien(alien, shot.damage || 1);
    }
    return;
  }
  if (shot.gun === 'fireball') burst(x, y, ['#ff6a2a', '#ffd166', '#ffe28a'], 10, 50, 0.5);
  else burst(x, y, ['#9bf6ff', '#ffffff'], 4, 40, 0.2);
  if (target) damageAlien(target, shot.damage || 1);
}

function stepAliens(dt) {
  const street = mapId === 'town' && !(match && match.on);
  if (!street) {
    aliens.length = 0;
    return;
  }
  catClock += dt;
  if (catClock > 4) {
    catClock = 0;
    const born = rollAlien({ walking: true, indoors: false, count: aliens.length, roll: Math.random(), street: map.street, player: actor });
    if (born) aliens.push(born);
  }
  for (let i = 0; i < aliens.length; i += 1) {
    const { alien, shot } = stepAlien(aliens[i], actor, map, dt);
    alien.flash = Math.max(0, (aliens[i].flash || 0) - dt);
    aliens[i] = alien;
    if (shot) foeShots.push(shot);
  }
}

// ---- Matches in the Colosseum -----------------------------------------------------------

function startMatch(lives) {
  if (mapId !== 'town') return;
  const id = `m-${me()}-${Date.now()}`;
  match = { on: true, id, lives, livesLeft: lives, invuln: 0, paid: false };
  const back = respawn(ARENA.starts[0]);
  actor = { ...actor, ...back };
  publish('match-open', { matchKey: id, lives, name: myName() });
  say(lives === 1 ? 'One life. Aim with the mouse, click to fire.' : 'Three lives. Aim with the mouse, click to fire.');
  closeCard();
  paintHud();
}

function joinMatch() {
  if (!match || !match.invite || mapId !== 'town') return;
  match = { on: true, id: match.invite, lives: match.lives || 3, livesLeft: match.lives || 3, invuln: 0, paid: false, rival: match.from };
  actor = { ...actor, ...respawn(ARENA.starts[1]) };
  closeCard();
  paintHud();
}

function takeMatchHit(from, damage) {
  if (!match || !match.on || match.invuln > 0) return;
  match.livesLeft = applyHit(match.livesLeft, damage);
  match.invuln = 1;
  burst(actor.x, actor.y - 8, ['#ff5a7a', '#ffffff'], 8, 50, 0.3);
  actor = { ...actor, ...respawn(ARENA.starts[match.rival ? 1 : 0]) };
  if (match.livesLeft <= 0) {
    const winner = others.get(from);
    publish('match-end', { matchKey: match.id, winnerId: from, winnerName: winner?.name || '', loserName: myName() });
    match.on = false;
    grant('loss');
  }
  paintHud();
}

function finishMatch(body) {
  const bound = bindOpenBets(save.bets, body.winnerName, body.matchKey);
  const lost = bindOpenBets(bound, body.loserName, body.matchKey);
  const results = [];
  if (body.winnerName) results.push({ ally: body.winnerName, matchKey: body.matchKey, won: true });
  if (body.loserName) results.push({ ally: body.loserName, matchKey: body.matchKey, won: false });
  const settled = settleBets(save.coins, lost, results);
  setSave({ ...save, coins: settled.coins, bets: settled.bets });
  if (match && match.id === body.matchKey && body.winnerId === me() && !match.paid) {
    match.paid = true;
    match.on = false;
    grant('win');
  } else if (match && match.id === body.matchKey) match.on = false;
  paintHud();
}

function stepMatch(dt) {
  if (!match || !match.on) return;
  actor = clampArena(actor);
  match.invuln = Math.max(0, (match.invuln || 0) - dt);
  const bodies = [{ id: me(), invuln: match.invuln, rect: hitBox(actor) }];
  for (const other of others.values()) {
    if (other.map === mapKey() && other.match === match.id) bodies.push({ id: other.id, invuln: 0, rect: hitBox({ x: other.dx, y: other.dy }) });
  }
  const kept = [];
  for (const shot of matchShots) {
    if (shot.from !== me()) {
      const next = { ...shot, x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt };
      if (tryBlock(shot, next)) continue;
    }
    kept.push(shot);
  }
  const resolved = resolveShots(kept, ARENA.covers, bodies, dt);
  matchShots.length = 0;
  matchShots.push(...resolved.shots);
  for (const hit of resolved.hits) if (hit.id === me()) takeMatchHit(hit.from, hit.damage);
}

// ---- Effects -------------------------------------------------------------------------------

function stepEffects(dt) {
  for (const list of [particles, rings, flashes, swings, emoteBubbles]) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const p = list[i];
      p.life -= dt;
      if (list === particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.gravity) {
          p.vz -= 220 * dt;
          p.z = Math.max(0, p.z + p.vz * dt);
          if (p.z === 0 && p.vz < 0) {
            if (p.splat && splats.length < 200) splats.push({ x: p.x, y: p.y, colour: p.colour === '#7dff6a' ? '#4fbf3a' : '#5a3590', life: 8, max: 8, size: p.size + 1 });
            p.vz = -p.vz * 0.3;
            p.vx *= 0.5;
            p.vy *= 0.5;
            if (Math.abs(p.vz) < 10) p.gravity = false;
          }
        }
      }
      if (p.life <= 0) list.splice(i, 1);
    }
  }
  for (let i = splats.length - 1; i >= 0; i -= 1) {
    splats[i].life -= dt;
    if (splats[i].life <= 0) splats.splice(i, 1);
  }
}

function bubble(id, icon) {
  emoteBubbles.push({ id, icon, life: 1.4, max: 1.4 });
}

// ---- The frame ------------------------------------------------------------------------

let worksSig = '';
let worksStamp = 0;
let emoteTick = 0;

function stepWorksTick(dt) {
  const next = tickWorks(save, dt, { open: true, stats });
  const sig = WORKS.map((w) => `${next.works[w.id].loaded}`).join() + GOODS.map((g) => next.bag[g.id]).join() + PARTS.map((p) => next.bag[p.id]).join();
  save = next;
  if (sig !== worksSig) {
    worksSig = sig;
    schedulePersist();
    if (els.pop && !els.pop.hidden && tab === 'bag') paintPanel();
  } else if (clock - worksStamp > 3 && WORKS.some((w) => save.works[w.id].loaded)) {
    worksStamp = clock;
    schedulePersist();
  }
}

function stepOthers(dt) {
  const k = 1 - Math.exp(-dt * 12);
  for (const other of others.values()) {
    other.dx += (other.x - other.dx) * k;
    other.dy += (other.y - other.dy) * k;
    if (other.m) other.step = (other.step || 0) + dt;
  }
}

function updateAim() {
  const wx = cam.x + (mouse.x * devicePixelRatioSafe()) / scale;
  const wy = cam.y + (mouse.y * devicePixelRatioSafe()) / scale;
  aim = aimAngle(chest(), { x: wx, y: wy });
}

function devicePixelRatioSafe() {
  return Math.min(2, window.devicePixelRatio || 1);
}

function step(dt) {
  invuln = Math.max(0, invuln - dt);
  const intent = talk ? {} : walkingIntent(held);
  actor = stepActor(actor, intent, map, dt, { speed: MOVE_SPEED * stats.moveSpeed });
  if (!actor.moving && weapon() && mouse.inside) {
    const a = aim;
    actor.facing = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 'right' : 'left') : (Math.sin(a) > 0 ? 'down' : 'up');
  }
  if (!(match && match.on)) {
    const door = doorAt(map, actor, intent);
    if (door) {
      if (door.to === 'home') actor = { ...actor, y: actor.y + 8 };
      enterDoor(door);
    }
  }
  stepNpcs(dt);
  stepAliens(dt);
  stepCombat(dt);
  stepMatch(dt);
  if (card && card.spot && Math.hypot(card.spot.x - actor.x, card.spot.y - actor.y) > (card.spot.reach || 24) + 24) closeCard();
}

let heartbeat = 0;

function netTick(dt) {
  placeTimer += dt;
  heartbeat += dt;
  if (placeTimer > 0.15) {
    placeTimer = 0;
    const due = heartbeat > 1.5;
    if (due) heartbeat = 0;
    publishPlace(due);
  }
  homeTimer += dt;
  if (atHome() && homeTimer > 1.5) {
    homeTimer = 0;
    publishHome(true);
  }
  emoteTick += dt;
  if (emoteTick > 0.25) {
    emoteTick = 0;
    paintEmotes();
  }
}

function frame(now) {
  const dt = lastStamp ? Math.min(0.05, (now - lastStamp) / 1000) : 0.016;
  lastStamp = now;
  clock += dt;
  const open = roomOpen();
  if (open) {
    updateAim();
    if (mode === 'world') step(dt);
    stepWorksTick(dt);
    stepOthers(dt);
    stepEffects(dt);
    tickGames(now);
    tickTalk(dt);
    netTick(dt);
  }
  draw(open);
  requestAnimationFrame(frame);
}

// ---- Drawing ------------------------------------------------------------------------------

function sizeCanvas() {
  const canvas = els.canvas;
  const dpr = devicePixelRatioSafe();
  const w = Math.max(1, Math.round(window.innerWidth * dpr));
  const h = Math.max(1, Math.round(window.innerHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  scale = Math.max(2, Math.floor(Math.min(w, h) / 330));
  if (!map.outdoor) scale += 1;
  return { w, h, dpr };
}

function placeCamera(w, h, open) {
  const vw = w / scale;
  const vh = h / scale;
  let tx;
  let ty;
  if (!open) {
    tx = 300 + Math.sin(clock * 0.05) * 160;
    ty = 120 + Math.cos(clock * 0.04) * 60;
  } else {
    tx = actor.x - vw / 2;
    ty = actor.y - 10 - vh / 2;
  }
  if (map.w <= vw) tx = (map.w - vw) / 2;
  else tx = Math.max(map.outdoor ? -16 : 0, Math.min(map.w - vw + (map.outdoor ? 16 : 0), tx));
  if (map.h <= vh) ty = (map.h - vh) / 2;
  else ty = Math.max(map.outdoor ? -48 : 0, Math.min(map.h - vh + (map.outdoor ? 16 : 0), ty));
  cam.x = Math.round(tx * scale) / scale;
  cam.y = Math.round(ty * scale) / scale;
}

function screenOf(x, y) {
  return { x: (x - cam.x) * scale, y: (y - cam.y) * scale };
}

function othersHere() {
  const now = Date.now();
  return [...others.values()].filter((o) => o.map === mapKey() && now - o.at < 5000);
}

function draw(open) {
  const ctx = els.ctx;
  if (!ctx) return;
  const { w, h } = sizeCanvas();
  if (!open && map.id !== 'town') map = getMap('town');
  placeCamera(w, h, open);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (map.outdoor) drawBackdrop(ctx, w, h, cam.x * scale, cam.y * scale, clock, { planet: map.id, locked: !save.planet });
  else {
    ctx.fillStyle = '#120c22';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.setTransform(scale, 0, 0, scale, -cam.x * scale, -cam.y * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(groundLayer(map), 0, 0);
  for (const s of splats) {
    ctx.globalAlpha = Math.min(1, s.life / 2);
    ctx.fillStyle = s.colour;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;
  const items = [];
  for (const b of map.buildings || []) {
    const sprite = buildingSprite(b);
    items.push({ y: sprite.sortY, draw: () => ctx.drawImage(sprite.canvas, sprite.x, sprite.y) });
  }
  for (const p of map.props || []) items.push({ y: p.y, draw: () => drawProp(ctx, p) });
  if (map.id === 'home') {
    const shown = mapOwner === me() ? save : homes.get(mapOwner) || {};
    for (const id of ['mine', 'studio', 'vat']) {
      const spec = WORKS.find((wk) => wk.id === id);
      if ((map.openPatches || 1) < spec.patch) continue;
      const at = WORK_SPOTS[id];
      const state = shown.works ? shown.works[id] : { progress: 0, loaded: false };
      items.push({ y: (at.r + 1) * 16, draw: () => drawMachine(ctx, id, at.c * 16 + 8, (at.r + 1) * 16, (state?.progress || 0) / WORK_SECONDS, !!state?.loaded, clock) });
    }
    for (const piece of shown.furniture || []) items.push({ y: piece.y, draw: () => drawFurniture(ctx, piece) });
  }
  if (open) {
    for (const npc of npcsHere()) {
      const spec = NPC_BY_ID.get(npc.id);
      items.push({ y: npc.y, draw: () => drawCat(ctx, npc.x, npc.y, { look: spec?.look || 'suit', coat: spec?.coat, suit: spec?.id === 'mallow' ? '#e8ecf5' : '#7a8bb8', facing: npc.facing, moving: npc.moving, step: npc.step }) });
    }
    for (const o of othersHere()) {
      items.push({ y: o.dy, draw: () => {
        drawCat(ctx, o.dx, o.dy, { look: o.look, suit: o.colour, facing: o.f, moving: !!o.m, step: o.step });
        if (o.gun && o.gun !== 'saber') drawGun(ctx, o.gun, o.dx, o.dy - 8, o.aim || 0);
      } });
    }
    for (const alien of aliens) {
      items.push({ y: alien.y, draw: () => drawCat(ctx, alien.x, alien.y, { enemy: true, facing: alien.facing, moving: alien.moving, step: alien.step, flash: alien.flash > 0 }, alien.kind === 'brute' ? 1.25 : 1) });
    }
    items.push({ y: actor.y, draw: drawMe });
  }
  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.draw();
  if (open) drawEffects(ctx);
  if (map.outdoor) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of map.props || []) {
      const glow = propGlow(p);
      if (!glow) continue;
      const g = ctx.createRadialGradient(p.x + glow.dx, p.y + glow.dy, 1, p.x + glow.dx, p.y + glow.dy, glow.r);
      g.addColorStop(0, glow.colour);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x + glow.dx - glow.r, p.y + glow.dy - glow.r, glow.r * 2, glow.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!open) {
    ctx.fillStyle = 'rgba(11, 8, 32, 0.35)';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  drawLabels(ctx, w, h);
}

function drawMe() {
  const ctx = els.ctx;
  const blink = invuln > 0 && Math.floor(clock * 12) % 2 === 0;
  if (!blink) drawCat(ctx, actor.x, actor.y, { look: save.look, suit: save.colour, facing: actor.facing, moving: actor.moving, step: actor.step });
  const gun = weapon();
  if (gun && gun !== 'saber') drawGun(ctx, gun, actor.x, actor.y - 8, aim);
}

function drawEffects(ctx) {
  for (const shot of myShots) drawShot(ctx, shot, clock);
  for (const shot of foeShots) drawShot(ctx, shot, clock);
  for (const shot of matchShots) drawShot(ctx, shot, clock);
  if (weapon() === 'beam' && beam.firing && beam.seg) drawBeam(ctx, beam.seg, clock);
  for (const o of othersHere()) {
    if (o.beam && o.gun === 'beam') drawBeam(ctx, beamRay({ x: o.dx, y: o.dy - 8 }, o.aim || 0, WEAPONS.beam.length, [], map), clock);
    if (o.gun === 'saber') drawSaber(ctx, saberSegment({ x: o.dx, y: o.dy - 8 }, o.aim || 0), '#9bf6ff', !!o.guard);
  }
  if (weapon() === 'saber') drawSaber(ctx, saberSegment(chest(), aim), save.colour, guardUp());
  for (const s of swings) drawSwing(ctx, s.x, s.y, s.angle, WEAPONS.saber.arc, WEAPONS.saber.length + 4, save.colour, 0.25 - s.life);
  drawParticles(ctx, particles);
  for (const r of rings) drawRing(ctx, r);
  for (const f of flashes) drawBlockFlash(ctx, f);
  if (weapon() === 'beam' && beam.energy < 1) {
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(Math.round(actor.x - 8), Math.round(actor.y + 3), 16, 3);
    ctx.fillStyle = beam.locked ? '#ff5a7a' : '#ff5adc';
    ctx.fillRect(Math.round(actor.x - 7), Math.round(actor.y + 4), Math.round(14 * beam.energy), 1);
  }
  for (const alien of aliens) drawHpPips(ctx, alien.x, alien.y - (alien.kind === 'brute' ? 30 : 25), alien.hp, alien.kind === 'brute' ? 5 : 2);
}

function drawLabels(ctx, w, h) {
  for (const o of othersHere()) {
    const at = screenOf(o.dx, o.dy - 26);
    drawTag(ctx, o.name || 'Someone', at.x, at.y, scale);
  }
  for (const npc of npcsHere()) {
    if (Math.hypot(npc.x - actor.x, npc.y - actor.y) > 70) continue;
    const at = screenOf(npc.x, npc.y - 26);
    drawTag(ctx, NPC_BY_ID.get(npc.id)?.name || '', at.x, at.y, scale, '#ffe9a8');
  }
  for (const b of emoteBubbles) {
    const who = b.id === me() ? actor : others.get(b.id);
    if (!who) continue;
    const at = screenOf(who.dx ?? who.x, (who.dy ?? who.y) - 34);
    ctx.font = `${Math.round(7 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, b.life * 2);
    ctx.fillText(b.icon, at.x, at.y - (1.4 - b.life) * 10 * scale);
    ctx.globalAlpha = 1;
  }
  const prompt = mode === 'world' ? promptText() : '';
  if (prompt) {
    const at = screenOf(prompt.x, prompt.y);
    drawTag(ctx, prompt.text, at.x, at.y, scale, '#9bf6ff');
  }
  if (mode === 'chat') {
    ctx.fillStyle = 'rgba(11, 8, 32, 0.28)';
    ctx.fillRect(0, 0, w, h);
    drawTag(ctx, 'Paused · Tab or click the world to play', w / 2, Math.round(28 * devicePixelRatioSafe()), scale * 1.1, '#fff6e6');
  }
  if (match && match.on) drawTag(ctx, `${match.livesLeft} ${match.livesLeft === 1 ? 'life' : 'lives'} left`, w / 2, h - Math.round(96 * devicePixelRatioSafe()), scale, '#ffd166');
}

// ---- HUD, item bar, emotes ------------------------------------------------------------------

function paintHud() {
  if (!els.hud) return;
  const open = roomOpen();
  els.hud.hidden = !open;
  els.bar.hidden = !open;
  if (!open) return;
  const hearts = '♥'.repeat(hp) + '♡'.repeat(Math.max(0, PLAYER_HP - hp));
  const place = map.id === 'home' ? (atHome() ? 'Home' : `${homes.get(mapOwner)?.name || 'A friend'}'s home`) : map.name;
  els.hudPlace.textContent = place;
  els.hudCoins.textContent = `${save.coins} coins`;
  els.hudHearts.textContent = hearts;
  els.hudMode.textContent = mode === 'world' ? 'WASD walk · mouse aims · click fires · E talk · Tab chat' : 'Typing in the chat · Tab to play';
}

function paintBar() {
  if (!els.bar) return;
  els.bar.replaceChildren();
  save.bar.forEach((id, i) => {
    const cell = button('', () => {
      if (mode !== 'world') toWorld();
      pickSlot(i);
    }, 'bar-slot');
    cell.setAttribute('aria-label', id ? `Slot ${i + 1}: ${itemName(id)}` : `Slot ${i + 1}: empty`);
    cell.setAttribute('aria-pressed', i === slot && WEAPONS[id] ? 'true' : 'false');
    cell.append(h('span', 'bar-key', String(i + 1)));
    if (id) cell.append(iconCopy(id, 32));
    if (id === 'snack') cell.append(h('span', 'bar-count', String(save.bag.snack)));
    els.bar.append(cell);
  });
}

function paintEmotes() {
  if (!els.emotes) return;
  if (!roomOpen() || mode !== 'world') {
    els.emotes.hidden = true;
    return;
  }
  const near = othersHere().find((o) => withinReach(actor, { x: o.dx, y: o.dy }, EMOTE_REACH));
  const sig = near ? near.id : '';
  if (els.emotes.dataset.sig === sig && !els.emotes.hidden === !!near) return;
  els.emotes.dataset.sig = sig;
  els.emotes.hidden = !near;
  els.emotes.replaceChildren();
  if (!near) return;
  els.emotes.append(h('span', 'emote-name', near.name || 'Someone'));
  for (const [label, icon] of EMOTES) {
    els.emotes.append(button(`${icon} ${label}`, () => {
      bubble(me(), icon);
      bubble(near.id, icon);
      publish('emote', { to: near.id, icon, name: label });
    }));
  }
}

// ---- Talking to NPCs ------------------------------------------------------------------------

const storySeen = new Set();

function pick(list) {
  return list && list.length ? list[Math.floor(Math.random() * list.length)] : '';
}

function openTalk(id) {
  const npc = NPC_BY_ID.get(id);
  if (!npc) return;
  closeCard();
  const res = talkTo(save, id, Date.now(), stats);
  setSave(res.save);
  const rec = friendRecord(save, id);
  const stage = friendStage(rec);
  const lines = [pick(npc.greet)];
  const storyKey = `${id}:${stage}`;
  if (npc.storied && npc.story && npc.story[stage] && !storySeen.has(storyKey)) {
    storySeen.add(storyKey);
    lines.push(...npc.story[stage]);
  } else if (rec.married && npc.married) lines.push(pick(npc.married));
  else lines.push(pick(npc.chat));
  if (res.gained > 0) lines.push(`(Friendship +${res.gained} · ${FRIEND_STAGES[friendStage(friendRecord(save, id))].name})`);
  talk = { npc: id, lines, index: 0, shown: 0, choices: false, voice: VOICES[npc.voice] || VOICES.flat };
  paintTalk();
}

function sayLines(lines) {
  if (!talk) return;
  talk.lines = lines.filter(Boolean);
  talk.index = 0;
  talk.shown = 0;
  talk.choices = false;
  paintTalk();
}

function closeTalk() {
  talk = null;
  if (els.talk) els.talk.hidden = true;
}

function advanceTalk() {
  if (!talk) return;
  const line = talk.lines[talk.index] || '';
  if (talk.shown < line.length) {
    talk.shown = line.length;
  } else if (talk.index < talk.lines.length - 1) {
    talk.index += 1;
    talk.shown = 0;
  } else if (!talk.choices) {
    talk.choices = true;
  } else {
    closeTalk();
    return;
  }
  paintTalk();
}

function tickTalk(dt) {
  if (!talk || !els.talkText) return;
  const line = talk.lines[talk.index] || '';
  if (talk.shown >= line.length) return;
  talk.shown = Math.min(line.length, talk.shown + (dt * 1000) / talk.voice.speed);
  els.talkText.textContent = line.slice(0, Math.floor(talk.shown));
  if (talk.shown >= line.length) paintTalk();
}

function paintTalk() {
  if (!els.talk || !talk) return;
  const npc = NPC_BY_ID.get(talk.npc);
  const rec = friendRecord(save, talk.npc);
  const stage = friendStage(rec);
  els.talk.hidden = false;
  els.talk.dataset.voice = npc.voice;
  els.talkFace.replaceChildren(paintFace(npc.id === 'mallow' ? '#e8ecf5' : '#7a8bb8', npc.look));
  els.talkName.textContent = npc.name;
  els.talkMeta.textContent = `${npc.voice} · ${FRIEND_STAGES[stage].name}`;
  const line = talk.lines[talk.index] || '';
  els.talkText.textContent = line.slice(0, Math.floor(talk.shown));
  els.talkChoices.replaceChildren();
  const done = talk.shown >= line.length && talk.index >= talk.lines.length - 1;
  if (!done) {
    els.talkChoices.append(button('Next', advanceTalk));
    return;
  }
  els.talkChoices.append(button('Chat', () => openTalk(talk.npc)));
  const gifts = [...PARTS, ...GOODS].filter((item) => save.bag[item.id] > 0);
  for (const item of gifts.slice(0, 4)) {
    els.talkChoices.append(button(`Give ${item.name}`, () => {
      const res = giftTo(save, talk.npc, item.id, npc.gift || {}, stats);
      if (!res.ok) return;
      setSave(res.save);
      const said = res.kind === 'loved' ? npc.gift.lovedLine : res.kind === 'liked' ? npc.gift.likedLine : npc.gift.meh;
      sayLines([said, `(Friendship +${res.gained})`]);
    }));
  }
  if (npc.romance && stage >= 3 && !rec.romance) {
    els.talkChoices.append(button('Ask her out', () => {
      const res = askOut(save, talk.npc, npc);
      if (res.ok) setSave(res.save);
      sayLines([res.ok ? npc.askOut.yes : npc.askOut.notYet]);
    }));
  }
  if (npc.romance && rec.romance && !rec.married && stage >= 4) {
    els.talkChoices.append(button('Propose', () => {
      const res = propose(save, talk.npc, npc);
      if (res.ok) setSave(res.save);
      sayLines([res.ok ? npc.propose.yes : res.reason === 'noRing' ? npc.propose.noRing : npc.propose.notYet]);
    }));
  }
  els.talkChoices.append(button('Bye', () => {
    const bye = npc.bye;
    closeTalk();
    if (bye) say(`${npc.name}: ${bye}`);
  }));
}

// ---- Action cards for places ------------------------------------------------------------

function closeCard() {
  card = null;
  if (els.card) els.card.hidden = true;
}

function openCard({ title, lines = [], buttons = [], spot = null }) {
  card = { title, spot };
  els.card.hidden = false;
  els.cardTitle.textContent = title;
  els.cardBody.replaceChildren(...lines.map((line) => {
    if (typeof line !== 'string') return line;
    return h('p', '', line);
  }));
  els.cardButtons.replaceChildren(...buttons.map(([label, fn, disabled]) => {
    const b = button(label, fn);
    if (disabled) b.disabled = true;
    return b;
  }), button('Close', closeCard, 'card-close'));
}

function refreshCard() {
  if (card && card.spot) useSpot(card.spot);
}

function useSpot(spot) {
  closeTalk();
  if (spot.kind === 'tavern') return tavernCard(spot);
  if (spot.kind === 'market') return marketCard(spot);
  if (spot.kind === 'clue') return clueCard(spot);
  if (spot.kind === 'rocket') return rocketCard(spot);
  if (spot.kind === 'rocket-home') {
    goTo('town', { spawn: { x: getMap('town').spots.find((s) => s.id === 'rocket').x, y: getMap('town').spots.find((s) => s.id === 'rocket').y + 12 } });
    say('Home to Lantern Moon.');
    return null;
  }
  if (spot.kind === 'arena') return arenaCard(spot);
  if (spot.kind === 'home') return panelCard(spot);
  if (spot.kind === 'work') return workCard(spot);
  const flavour = {
    fountain: 'The fountain hums a tune nobody remembers writing.',
    photo: 'A younger Mallow beside a rocket. Someone drew a tiny heart on the hull.',
  };
  return openCard({ title: spot.label, lines: [flavour[spot.id] || 'Nothing to do here yet.'], spot });
}

function tavernCard(spot) {
  let next = save;
  if (!next.errand) {
    next = pinErrand(next, GOODS[Math.floor(Math.random() * GOODS.length)].id).save;
    setSave(next);
  }
  const asked = GOODS.find((item) => item.id === save.errand);
  const buttons = [[`Drink · ${DRINK_PRICE}`, () => {
    const res = buyDrink(save);
    if (!res.ok) say('The purse cannot cover a drink.');
    else {
      setSave(res.save);
      say('A silly drink. It fizzes in three colours.');
    }
    refreshCard();
  }]];
  for (const friend of people().filter((p) => p.id !== me()).slice(0, 4)) {
    buttons.push([`Drink for ${friend.name}`, () => {
      const res = buyDrink(save);
      if (!res.ok) say('The purse cannot cover a drink.');
      else {
        setSave(res.save);
        publish('drink', { to: friend.id, name: myName() });
        say(`A drink for ${friend.name}.`);
      }
      refreshCard();
    }]);
  }
  buttons.push([asked ? `Bring ${asked.name} (${save.bag[asked.id]})` : 'Errand', () => {
    const res = turnInErrand(save);
    if (!res.ok) say('The bag does not have that yet.');
    else {
      setSave(res.save);
      say(`The tavern paid ${res.paid}.`);
    }
    refreshCard();
  }, !asked || save.bag[asked.id] < 1]);
  openCard({ title: 'The bar', lines: [`Purse ${save.coins}.`, asked ? `Today's errand: one ${asked.name}.` : ''], buttons, spot });
  paintHud();
}

function marketCard(spot) {
  const buttons = [];
  for (const part of PARTS) {
    buttons.push([`${part.name} · ${PART_PRICE}`, () => {
      const res = buyPart(save, part.id);
      if (!res.ok) say('The purse cannot cover that part.');
      else {
        setSave(res.save);
        say(`Bought ${part.name}.`);
      }
      refreshCard();
    }]);
  }
  for (const good of GOODS) {
    if (!save.bag[good.id]) continue;
    buttons.push([`Sell ${good.name} · ${MARKET_PAY}`, () => {
      const res = sellGood(save, good.id);
      if (!res.ok) return;
      setSave(res.save);
      say(`Sold for ${res.paid}.`);
      refreshCard();
    }]);
  }
  const near = othersHere().find((o) => withinReach(actor, { x: o.dx, y: o.dy }, 48));
  if (near) {
    for (const item of [...PARTS, ...GOODS]) {
      if (!save.bag[item.id]) continue;
      buttons.push([`Offer ${item.name} to ${near.name}`, () => {
        const id = `t-${me()}-${Date.now()}`;
        const res = offerTrade(save, item.id, 1, near.name, id);
        if (!res.ok) say('The bag does not have that.');
        else {
          setSave(res.save);
          publish('trade', { id, item: item.id, count: 1, name: myName(), to: near.id });
          say(`Offered ${item.name}. They have to accept.`);
        }
        refreshCard();
      }]);
    }
  }
  const bag = [...PARTS, ...GOODS].map((item) => `${item.name} ${save.bag[item.id]}`).join(' · ');
  openCard({ title: 'Market stall', lines: [`Purse ${save.coins}.`, bag], buttons, spot });
  paintHud();
}

function clueCard(spot) {
  const clue = CLUES.find((c) => c.id === spot.clue);
  const text = CLUE_TEXT[spot.clue] || { title: spot.label, need: '', found: '' };
  if (save.clues.includes(clue.id)) {
    return openCard({ title: text.title, lines: [text.found, `Star chart pieces: ${save.clues.length} of ${CLUES.length}.`], spot });
  }
  const next = nextClue(save);
  if (next.id !== clue.id) {
    return openCard({ title: text.title, lines: ['Something about this is important, but it does not make sense yet. Another piece comes first.'], spot });
  }
  const have = save.bag[clue.item];
  return openCard({
    title: text.title,
    lines: [text.need],
    buttons: [[`Use ${itemName(clue.item)} (${have})`, () => {
      const res = useClue(save, clue.id);
      if (!res.ok) {
        say(`You need ${itemName(clue.item)}. The market sells it, and alien cats drop it.`);
        return;
      }
      setSave(res.save);
      say(`Found a star chart piece. ${save.clues.length} of ${CLUES.length}.`);
      clueCard(spot);
      paintPanel();
    }, have < 1]],
    spot,
  });
}

function rocketCard(spot) {
  const gate = planetGate(save);
  if (save.planet) {
    return openCard({ title: 'Rocket', lines: [PLANET_TEXT.launched], buttons: [['Fly to Velvet Reach', () => goTo('planet2')]], spot });
  }
  const list = h('ul', 'checklist');
  for (const check of gate.checks) {
    const li = h('li', check.ok ? 'done' : 'todo', `${check.ok ? '✓' : '·'} ${check.label}`);
    list.append(li);
  }
  const buttons = gate.ok ? [[`Launch · ${PLANET_FARE} coins and a Moon rock`, () => {
    const res = launchPlanet(save);
    if (!res.ok) return;
    setSave(res.save);
    goTo('planet2');
    say(PLANET_TEXT.launched);
  }]] : [];
  return openCard({ title: 'Rocket to Velvet Reach', lines: [gate.ok ? PLANET_TEXT.ready : PLANET_TEXT.locked, list], buttons, spot });
}

function arenaCard(spot) {
  const buttons = [['One life', () => startMatch(1)], ['Three lives', () => startMatch(3)]];
  if (match && match.invite && !match.on) buttons.push([`Join ${match.fromName || 'the'} match`, joinMatch]);
  if (match && match.on) buttons.push(['Leave the match', () => { match.on = false; closeCard(); paintHud(); }]);
  return openCard({
    title: 'The Colosseum of Friendship',
    lines: ['A fenced ring with cover. Pick a weapon on the item bar, then open a match. Friends can join and bet on their allies.'],
    buttons,
    spot,
  });
}

function openHabCard() {
  const buttons = [['Go home', () => goTo('home', { owner: me() })]];
  for (const [id, home] of homes) {
    if (Date.now() - home.at > 8000 || !mayEnter(home.invites, myName())) continue;
    buttons.push([`Visit ${home.name || 'a friend'}`, () => goTo('home', { owner: id })]);
  }
  openCard({ title: 'Hab block', lines: ['Six little homes in an old station. Yours is the one with the scuffed door.'], buttons, spot: { x: actor.x, y: actor.y, reach: 20 } });
}

function panelCard(spot) {
  if (!atHome()) {
    return openCard({ title: 'Door panel', lines: ['This is not your panel.'], spot });
  }
  const buttons = [];
  const cost = nextPatchCost(save.patches);
  if (cost) {
    buttons.push([`Clear the next patch · ${cost}`, () => {
      const res = unlockPatch(save);
      if (!res.ok) say('The purse cannot clear that patch.');
      else {
        setSave(res.save);
        map = getMap('home', { patches: save.patches });
        publishHome(true);
        say('Another patch of the station is clear.');
      }
      refreshCard();
    }]);
  }
  for (const person of people().filter((p) => p.id !== me())) {
    const invited = save.invites.includes(person.name);
    buttons.push([invited ? `Keep ${person.name} out` : `Invite ${person.name}`, () => {
      setSave({ ...save, invites: toggleInvite(save.invites, person.name) });
      publishHome(true);
      refreshCard();
    }]);
  }
  const lines = [save.invites.length ? `Door open to ${save.invites.join(', ')}.` : 'The door is shut. Nobody else can come in.', `${save.patches} of 4 patches clear.`];
  return openCard({ title: 'Door panel', lines, buttons, spot });
}

function workCard(spot) {
  const spec = WORKS.find((w) => w.id === spot.id);
  const shown = mapOwner === me() ? save : homes.get(mapOwner) || save;
  const state = shown.works ? shown.works[spot.id] : { progress: 0, loaded: false };
  const rate = spot.id === 'mine' ? stats.mineRate : stats.factoryRate;
  const lines = [
    state.loaded ? `Working: ${Math.floor(state.progress)} of ${WORK_SECONDS}s.` : `Waiting for ${itemName(spec.part)}. It loads one by itself from your bag.`,
    `Makes ${itemName(spec.good)}. Runs only while the room is open. Speed ×${rate.toFixed(2)}.`,
  ];
  return openCard({ title: spec.name, lines, spot });
}

// ---- The Colosseum popup -----------------------------------------------------------------

function paintPanel() {
  if (!els.panel || els.pop.hidden) return;
  if (tab === 'games' && (typeGame || clickGame)) return;
  if (tab === 'games' && duel && duel.phase === 'live' && els.spark) return;
  els.panel.replaceChildren();
  const painters = {
    games: paintGames, look: paintLook, bag: paintBag, shop: paintShop, skills: paintSkills,
    friends: paintFriends, board: paintBoard, favourites: paintFavourites, purse: paintPurse,
  };
  (painters[tab] || paintGames)();
  if (els.status) els.status.textContent = status;
}

function paintGames() {
  const frameEl = h('div', 'colo-frame');
  const leftPic = paintFace(save.colour, save.look);
  leftPic.classList.add('colo-corner', 'left');
  const rightPic = paintFace('#b48cff', 'alien');
  rightPic.classList.add('colo-corner', 'right');
  const leftWall = h('div', 'colo-wall left');
  const rightWall = h('div', 'colo-wall right');
  leftWall.style.background = save.colour;
  rightWall.style.background = '#b48cff';
  const stage = h('div', 'colo-stage');
  frameEl.append(leftPic, rightPic, leftWall, rightWall, stage);
  const row = h('div', 'colo-row');
  row.append(button('Typing', () => startTyping(stage)), button('Click', () => startClick(stage)), button('Duel', () => startDuel()));
  els.panel.append(frameEl, row, h('p', 'colo-note', 'Ten seconds each. A win pays coins. Matches with weapons happen at the Colosseum gate in town.'));
  if (duel && duel.phase === 'invited') els.panel.append(button('Accept duel', () => acceptDuel(stage, leftWall, rightWall)));
  if (duel && duel.phase === 'live') readyDuel(stage, leftWall, rightWall);
}

function paintLook() {
  const looks = h('div', 'colo-looks');
  for (const look of LOOKS) {
    const b = button('', () => {
      setSave({ ...save, look: look.id });
      paintPanel();
      publishPlace(true);
    }, 'look-pick');
    b.append(paintFace(save.colour, look.id), h('span', '', look.name));
    b.setAttribute('aria-pressed', save.look === look.id ? 'true' : 'false');
    looks.append(b);
  }
  const colours = h('div', 'colo-colours');
  for (const colour of COLOURS) {
    const swatch = button(colour.id, () => {
      setSave({ ...save, colour: colour.value });
      paintPanel();
      publishPlace(true);
    });
    swatch.style.background = colour.value;
    swatch.setAttribute('aria-pressed', save.colour === colour.value ? 'true' : 'false');
    colours.append(swatch);
  }
  const worn = CATALOG.filter((item) => item.kind === 'wear' && save.owned.includes(item.id));
  const wear = h('div', 'colo-row');
  for (const item of worn) {
    wear.append(button(save.worn === item.id ? `Wearing ${item.name}` : `Wear ${item.name}`, () => {
      setSave({ ...save, worn: save.worn === item.id ? '' : item.id });
      paintPanel();
    }));
  }
  els.panel.append(h('p', 'colo-note', 'Every cat here is a space cat. Pick a look and a suit colour.'), looks, colours, wear);
}

function paintBag() {
  const grid = h('div', 'bag-grid');
  for (const item of [...PARTS, ...GOODS]) {
    const cell = h('div', 'bag-cell');
    cell.append(iconCopy(item.id, 28), h('span', '', `${item.name} ${save.bag[item.id]}`));
    grid.append(cell);
  }
  const barNote = h('p', 'colo-note', 'The item bar holds what you have equipped. Put a weapon or a snack in a slot:');
  const assign = h('div', 'colo-list');
  for (const id of [...save.weapons, 'snack']) {
    const row = h('div', 'colo-row');
    row.append(iconCopy(id, 20), h('span', 'bag-name', itemName(id)));
    for (let i = 0; i < BAR_SLOTS; i += 1) {
      const b = button(String(i + 1), () => {
        const res = equip(save, save.bar[i] === id ? i : i, save.bar[i] === id ? '' : id);
        if (res.ok) setSave(res.save);
        paintBar();
        paintPanel();
      }, 'slot-pick');
      b.setAttribute('aria-pressed', save.bar[i] === id ? 'true' : 'false');
      b.setAttribute('aria-label', `Put ${itemName(id)} in slot ${i + 1}`);
      row.append(b);
    }
    assign.append(row);
  }
  const works = h('div', 'colo-list');
  for (const spec of WORKS) {
    const open = save.patches >= spec.patch;
    const state = save.works[spec.id];
    const note = open ? (state.loaded ? `working ${Math.floor(state.progress)}s` : `needs ${itemName(spec.part)}`) : 'under debris';
    works.append(h('p', '', `${spec.name}: ${note}`));
  }
  els.panel.append(grid, barNote, assign, h('p', 'colo-note', 'Home works tick only while this page is open.'), works);
  if (tradeOffer) {
    const row = h('div', 'colo-row');
    row.append(button(`Accept ${itemName(tradeOffer.item)} from ${tradeOffer.name}`, () => {
      const res = acceptTrade(save, tradeOffer.item, tradeOffer.count);
      if (res.ok) {
        setSave(res.save);
        publish('trade-accept', { id: tradeOffer.id, to: tradeOffer.from });
        tradeOffer = null;
        say('Accepted.');
      }
      paintPanel();
    }), button('No thanks', () => {
      publish('trade-decline', { id: tradeOffer.id, to: tradeOffer.from });
      tradeOffer = null;
      paintPanel();
    }));
    els.panel.append(row);
  }
}

function paintShop() {
  els.panel.append(h('p', 'colo-note', `Purse ${save.coins}. Home patches and invites live on the door panel inside your home.`));
  const list = h('div', 'colo-list');
  for (const item of CATALOG) {
    const owned = save.owned.includes(item.id);
    const row = h('div', 'colo-row');
    if (['weapon', 'gift'].includes(item.kind)) row.append(iconCopy(item.id, 20));
    row.append(h('span', 'bag-name', `${item.name} · ${item.price}`));
    if (!owned) {
      row.append(button('Buy', () => {
        const res = purchase(save, item.id);
        if (!res.ok) say('The purse cannot cover that.');
        else {
          setSave(res.save);
          say(`Bought ${item.name}.`);
          paintBar();
        }
        paintPanel();
        paintHud();
      }));
    } else row.append(h('span', 'colo-owned', 'Yours'));
    list.append(row);
  }
  els.panel.append(list);
}

function paintSkills() {
  const s = stats;
  els.panel.append(h('p', 'colo-note', `Walk ×${s.moveSpeed.toFixed(2)} · Mine ×${s.mineRate.toFixed(2)} · Studio and vat ×${s.factoryRate.toFixed(2)} · Spread ×${s.aim.toFixed(2)} · Fire ×${s.fireRate.toFixed(2)} · Block ${s.blockWindow.toFixed(2)}s · Friendship ×${s.friendGain.toFixed(2)}`));
  const tree = h('div', 'skill-tree');
  for (const branch of ['Explorer', 'Maker', 'Fighter']) {
    const col = h('div', 'skill-branch');
    col.append(h('h3', '', branch));
    for (const node of SKILLS.filter((n) => n.branch === branch)) {
      const owned = save.skills.includes(node.id);
      const ready = !node.needs || save.skills.includes(node.needs);
      const cell = h('div', `skill-node${owned ? ' owned' : ''}${ready ? '' : ' locked'}${node.needs ? ' child' : ''}`);
      cell.append(h('strong', '', node.name), h('span', '', skillLabel(node)));
      if (owned) cell.append(h('span', 'colo-owned', 'Learned'));
      else {
        const b = button(`Learn · ${node.cost}`, () => {
          const res = buySkill(save, node.id);
          if (!res.ok) say(res.reason === 'needs' ? 'Learn the one above first.' : 'The purse cannot cover that.');
          else {
            setSave(res.save);
            say(`Learned ${node.name}.`);
          }
          paintPanel();
          paintHud();
        });
        b.disabled = !ready;
        cell.append(b);
      }
      col.append(cell);
    }
    tree.append(col);
  }
  els.panel.append(tree);
}

function paintFriends() {
  const list = h('div', 'colo-list');
  for (const npc of NPCS) {
    const rec = friendRecord(save, npc.id);
    const stage = friendStage(rec);
    const row = h('div', 'friend-row');
    row.append(paintFace(npc.id === 'mallow' ? '#e8ecf5' : '#7a8bb8', npc.look));
    const text = h('div', 'friend-text');
    text.append(h('strong', '', npc.name), h('span', '', `${FRIEND_STAGES[stage].name} · ${npc.voice}`));
    const meter = h('div', 'friend-meter');
    const fill = h('span', '');
    fill.style.width = `${rec.pts}%`;
    meter.append(fill);
    text.append(meter);
    row.append(text);
    list.append(row);
  }
  const trail = h('ul', 'checklist');
  CLUES.forEach((clue) => {
    const found = save.clues.includes(clue.id);
    const text = CLUE_TEXT[clue.id] || {};
    trail.append(h('li', found ? 'done' : 'todo', found ? `✓ ${text.title}: ${text.found}` : `· ${text.title || 'Unknown'}: ${nextClue(save)?.id === clue.id ? text.need : '???'}`));
  });
  const gate = planetGate(save);
  const planet = h('ul', 'checklist');
  for (const check of gate.checks) planet.append(h('li', check.ok ? 'done' : 'todo', `${check.ok ? '✓' : '·'} ${check.label}`));
  els.panel.append(list, h('h3', 'colo-sub', 'The star chart'), trail, h('h3', 'colo-sub', save.planet ? 'Velvet Reach is open' : 'Velvet Reach'), planet);
}

function paintFavourites() {
  const names = people().filter((person) => person.id !== me());
  const ordered = orderFavourites(names, save.favourites);
  const list = h('div', 'colo-list');
  if (!ordered.length) list.append(h('p', '', 'Nobody else is in the room.'));
  for (const person of ordered) {
    const row = h('div', 'colo-row');
    row.append(h('span', 'bag-name', person.name));
    const starred = save.favourites.includes(person.name);
    row.append(button(starred ? 'Starred' : 'Star', () => {
      setSave({ ...save, favourites: starred ? save.favourites.filter((name) => name !== person.name) : [...save.favourites, person.name] });
      paintPanel();
    }));
    if (starred) {
      row.append(button('Up', () => { setSave({ ...save, favourites: moveFavourite(save.favourites, person.name, -1) }); paintPanel(); }));
      row.append(button('Down', () => { setSave({ ...save, favourites: moveFavourite(save.favourites, person.name, 1) }); paintPanel(); }));
    }
    list.append(row);
  }
  els.panel.append(h('p', 'colo-note', 'Only this browser sees this order.'), list);
}

function paintBoard() {
  const rows = rankBoard([ownCard(), ...postcards]);
  const list = h('ol', 'colo-board');
  for (const row of rows) list.append(h('li', '', `${row.name} · ${row.coins} coins · ${row.wins} wins`));
  if (!rows.length) list.append(h('li', '', 'The board is quiet.'));
  els.panel.append(list);
}

function paintPurse() {
  const amount = document.createElement('input');
  amount.id = 'colo-amount';
  amount.inputMode = 'numeric';
  amount.setAttribute('aria-label', 'Coins');
  amount.value = '1';
  const list = h('div', 'colo-list');
  for (const person of people().filter((item) => item.id !== me())) {
    const row = h('div', 'colo-row');
    row.append(h('span', 'bag-name', person.name));
    row.append(button('Send', () => sendCoins(person, amount.value, 'send')));
    row.append(button('Give', () => sendCoins(person, amount.value, 'gift')));
    const ally = save.allies.includes(person.name);
    row.append(button(ally ? 'Ally' : 'Make ally', () => {
      const res = setAlly(save.allies, person.name, !ally);
      if (!res.ok) say('Two allies is the limit.');
      else setSave({ ...save, allies: res.allies });
      paintPanel();
    }));
    if (ally) {
      row.append(button('Stake', () => {
        const placed = placeBet(save.coins, save.bets, save.allies, { ally: person.name, stake: amount.value, matchKey: '' });
        if (!placed.ok) say('That stake does not fit.');
        else {
          setSave({ ...save, coins: placed.coins, bets: placed.bets });
          say(`Staked on ${person.name}. A win pays double.`);
        }
        paintPanel();
      }));
    }
    list.append(row);
  }
  if (offer) {
    const row = h('div', 'colo-row');
    row.append(button(`Accept ${offer.amount} from ${offer.name}`, () => {
      const got = transferIn(save.coins, offer.amount);
      if (got.ok) {
        setSave({ ...save, coins: got.coins });
        publish('gift-accept', { id: offer.giftId, to: offer.from });
        offer = null;
      }
      paintPanel();
    }), button('No thanks', () => {
      publish('gift-decline', { id: offer.giftId, to: offer.from });
      offer = null;
      paintPanel();
    }));
    list.append(row);
  }
  els.panel.append(h('p', 'colo-note', `Purse ${save.coins}. Allies ${save.allies.join(', ') || 'none'}. Send arrives at once; Give waits for them to accept.`), amount, list);
}

function sendCoins(person, raw, kind) {
  const moved = transferOut(save.coins, raw);
  if (!moved.ok) {
    say('The purse cannot cover that.');
    return;
  }
  if (kind === 'gift') {
    const id = `${me()}:${Date.now()}`;
    setSave({ ...save, coins: moved.coins, escrow: [...(save.escrow || []), { id, amount: moved.sent, to: person.name }] });
    publish('gift', { to: person.id, name: myName(), amount: moved.sent, id });
  } else {
    setSave({ ...save, coins: moved.coins });
    publish('send', { to: person.id, amount: moved.sent });
  }
  paintPanel();
  paintHud();
}

// ---- Ten-second games ---------------------------------------------------------------------

function tickGames(now) {
  if (clickGame && els.click) {
    const ctx = els.click.getContext('2d');
    ctx.clearRect(0, 0, CLICK_BOUNDS.w, CLICK_BOUNDS.h);
    const circle = circleAt(now - clickGame.start, CLICK_BOUNDS);
    ctx.fillStyle = save.colour;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.fill();
    if (now - clickGame.start >= GAME_MS) {
      const won = clickWin(clickGame.hits);
      clickGame = null;
      grant(won ? 'win' : 'loss');
    }
  }
  if (typeGame && now - typeGame.start >= GAME_MS) {
    const won = typingWin(typeGame.value);
    typeGame = null;
    grant(won ? 'win' : 'loss');
  }
  if (duel && duel.phase === 'live') {
    const elapsed = Date.now() - duel.startAt;
    if (els.spark) els.spark.style.left = sparkSide(elapsed) === 'left' ? '18px' : 'calc(100% - 18px)';
    if (elapsed >= GAME_MS) {
      duel.phase = 'done';
      els.spark = null;
      grant(duelOutcome(duel.myScore, duel.theirScore));
    }
  }
}

function takeDuel(from, body) {
  if (body.phase === 'invite' && from !== me()) {
    duel = { phase: 'invited', round: body.round, from, role: 'right', myScore: 0, theirScore: 0, startAt: 0 };
    say('Someone wants a paw-sword duel. See Games.');
  } else if (body.phase === 'accept' && duel && duel.round === body.round) {
    duel.phase = 'live';
    duel.startAt = body.startAt;
    els.spark = null;
  } else if (body.phase === 'score' && duel && duel.round === body.round) {
    duel.theirScore = body.score;
  }
  paintPanel();
}

function readyDuel(stage, leftWall, rightWall) {
  if (!duel || els.spark) return;
  const spark = h('div', 'spark');
  els.spark = spark;
  stage.append(spark);
  const tap = (side) => {
    if (!duel || duel.phase !== 'live') return;
    if (sparkSide(Date.now() - duel.startAt) !== side || duel.role !== side) return;
    duel.myScore += 1;
    publish('duel', { phase: 'score', round: duel.round, score: duel.myScore });
  };
  leftWall.addEventListener('pointerdown', () => tap('left'));
  rightWall.addEventListener('pointerdown', () => tap('right'));
}

function startTyping(stage) {
  clickGame = null;
  typeGame = { start: performance.now(), value: '' };
  stage.replaceChildren();
  const wrap = h('div', 'colo-type');
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Typing line');
  input.addEventListener('input', () => { if (typeGame) typeGame.value = input.value; });
  wrap.append(h('p', '', TYPING_PHRASE), input);
  stage.append(wrap);
  input.focus();
}

function startClick(stage) {
  typeGame = null;
  clickGame = { start: performance.now(), hits: 0 };
  stage.replaceChildren();
  const canvas = document.createElement('canvas');
  canvas.width = CLICK_BOUNDS.w;
  canvas.height = CLICK_BOUNDS.h;
  els.click = canvas;
  canvas.addEventListener('pointerdown', (event) => {
    if (!clickGame) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (CLICK_BOUNDS.w / rect.width);
    const y = (event.clientY - rect.top) * (CLICK_BOUNDS.h / rect.height);
    if (scoreClick(x, y, performance.now() - clickGame.start)) clickGame.hits += 1;
  });
  stage.append(canvas);
}

function startDuel() {
  if (people().filter((person) => person.id !== me()).length < 1) {
    say('The duel needs two people in the room.');
    return;
  }
  const round = `${me()}-${Date.now()}`;
  duel = { phase: 'invite', round, role: 'left', myScore: 0, theirScore: 0, startAt: 0 };
  publish('duel', { phase: 'invite', round });
  say('Waiting for the other person. Tap your wall when the spark is on it.');
}

function acceptDuel(stage, leftWall, rightWall) {
  if (!duel) return;
  const startAt = Date.now() + 600;
  duel.phase = 'live';
  duel.startAt = startAt;
  publish('duel', { phase: 'accept', round: duel.round, startAt });
  readyDuel(stage, leftWall, rightWall);
}

// ---- Building the interface -------------------------------------------------------------------

function buildPop() {
  const pop = h('section', 'colo-pop');
  pop.id = 'colosseum-pop';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'The Colosseum of Friendship');
  const bar = popBar('Colosseum');
  const body = h('div', 'pop-body colo-body');
  const tabs = h('div', 'colo-tabs');
  tabs.setAttribute('role', 'tablist');
  for (const [id, label] of [['games', 'Games'], ['look', 'Look'], ['bag', 'Bag'], ['shop', 'Shop'], ['skills', 'Skills'], ['friends', 'Friends'], ['board', 'Board'], ['favourites', 'Favourites'], ['purse', 'Purse']]) {
    const node = button(label, () => { tab = id; markTabs(); paintPanel(); });
    node.dataset.tab = id;
    node.setAttribute('role', 'tab');
    tabs.append(node);
  }
  const panel = h('div', 'colo-panel');
  const statusLine = h('p', 'colo-status', '');
  statusLine.setAttribute('aria-live', 'polite');
  body.append(tabs, panel, statusLine);
  pop.append(bar, body);
  document.body.append(pop);
  els.pop = pop;
  els.panel = panel;
  els.status = statusLine;
  els.tabs = tabs;
  els.popCtl = popup(pop, {
    id: 'colosseum',
    label: 'Colosseum',
    size: 420,
    min: 260,
    place: 'left',
    onShow: paintPanel,
    onClose: () => document.querySelector('#colosseum-btn')?.setAttribute('aria-expanded', 'false'),
  });
  markTabs();
}

function markTabs() {
  if (!els.tabs) return;
  for (const node of els.tabs.querySelectorAll('button')) node.setAttribute('aria-selected', node.dataset.tab === tab ? 'true' : 'false');
}

function togglePop(force) {
  const open = els.popCtl.toggle(force);
  document.querySelector('#colosseum-btn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) paintPanel();
}

function buildHud() {
  const hud = h('div', 'game-hud');
  hud.hidden = true;
  const top = h('div', 'hud-row');
  els.hudPlace = h('span', 'hud-place');
  els.hudCoins = h('span', 'hud-coins');
  els.hudHearts = h('span', 'hud-hearts');
  top.append(els.hudPlace, els.hudCoins, els.hudHearts, button('Colosseum', () => togglePop()), button('Chat', () => toChat()));
  els.hudMode = h('p', 'hud-mode');
  hud.append(top, els.hudMode);
  const bar = h('div', 'item-bar');
  bar.hidden = true;
  const emotes = h('div', 'emote-bar');
  emotes.hidden = true;
  const toast = h('p', 'game-toast');
  toast.hidden = true;
  toast.setAttribute('aria-live', 'polite');
  const talkBox = h('section', 'talk-box');
  talkBox.hidden = true;
  talkBox.setAttribute('aria-live', 'polite');
  els.talkFace = h('div', 'talk-face');
  const talkMain = h('div', 'talk-main');
  els.talkName = h('strong', 'talk-name');
  els.talkMeta = h('span', 'talk-meta');
  els.talkText = h('p', 'talk-text');
  els.talkChoices = h('div', 'talk-choices');
  const head = h('div', 'talk-head');
  head.append(els.talkName, els.talkMeta);
  talkMain.append(head, els.talkText, els.talkChoices);
  talkBox.append(els.talkFace, talkMain);
  talkBox.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    advanceTalk();
  });
  const cardBox = h('section', 'game-card');
  cardBox.hidden = true;
  els.cardTitle = h('h3', 'card-title');
  els.cardBody = h('div', 'card-body');
  els.cardButtons = h('div', 'card-buttons');
  cardBox.append(els.cardTitle, els.cardBody, els.cardButtons);
  document.body.append(hud, bar, emotes, toast, talkBox, cardBox);
  Object.assign(els, { hud, bar, emotes, toast, talk: talkBox, card: cardBox });
}

function bindSettings() {
  const gauge = document.querySelector('#gore-gauge');
  const label = document.querySelector('#gore-label');
  if (!gauge) return;
  const show = () => {
    gauge.value = String(save.gore);
    if (label) label.textContent = GORE_LEVELS[save.gore];
  };
  gauge.addEventListener('input', () => {
    setSave({ ...save, gore: Number(gauge.value) });
    show();
  });
  els.showGore = show;
  show();
}

function startCanvas() {
  if (els.canvas) return;
  els.canvas = document.querySelector('#world');
  if (!els.canvas) return;
  els.ctx = els.canvas.getContext('2d');
  requestAnimationFrame(frame);
}

export async function mountColosseum(hooks) {
  api = hooks;
  startCanvas();
  if (!mounted) {
    mounted = true;
    buildPop();
    buildHud();
    bindPointer();
    bindSettings();
    document.querySelector('#colosseum-btn')?.addEventListener('click', () => togglePop());
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', () => { held = {}; mouse.down = false; });
  }
  await loadSave();
  els.showGore?.();
  const place = save.place && save.place.map !== 'planet2' ? save.place : save.place && save.planet ? save.place : null;
  mapId = place ? place.map : 'town';
  mapOwner = '';
  map = getMap(mapId);
  actor = spawnActor(map, place);
  hp = PLAYER_HP;
  slot = Math.max(0, save.bar.findIndex((id) => WEAPONS[id]));
  held = {};
  mode = 'world';
  setMode('chat');
  paintBar();
  paintHud();
  schedulePoll();
  postcard();
  publishPlace(true);
}

export function settleColosseum() {
  if (!mounted) return;
  clearTimeout(pollTimer);
  const back = releaseEscrow(save.coins, save.escrow);
  save = releaseOffers(sanitiseSave({ ...save, coins: back.coins, escrow: back.escrow }));
  if (mapId === 'home') {
    mapId = 'town';
    map = getMap('town');
    actor = spawnActor(map, buildingFor('home').spawn);
  }
  match = null;
  duel = null;
  talk = null;
  card = null;
  held = {};
  matchShots.length = 0;
  myShots.length = 0;
  foeShots.length = 0;
  aliens.length = 0;
  others.clear();
  homes.clear();
  closeTalk();
  closeCard();
  persist();
  paintHud();
  if (els.emotes) els.emotes.hidden = true;
  if (els.popCtl) els.popCtl.hide();
}

startCanvas();

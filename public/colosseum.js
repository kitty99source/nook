// The Colosseum of Friendship. Chat stays untouched. Game state stays in this browser.

import { decryptJson, encryptJson } from './e2e.js';
import {
  CATALOG,
  CLICK_BOUNDS,
  COLOURS,
  EMOTE_REACH,
  GAME_MS,
  GUNS,
  TYPING_PHRASE,
  applyHit,
  applyPurse,
  arenaMap,
  bindOpenBets,
  bridgeProgress,
  clampArena,
  duelOutcome,
  emptySave,
  fireGun,
  onBridge,
  orderFavourites,
  placeBet,
  purchase,
  rankBoard,
  releaseEscrow,
  resolveBeam,
  resolveShots,
  respawn,
  sanitiseSave,
  scoreClick,
  setAlly,
  settleBets,
  sparkSide,
  spawnActor,
  stepActor,
  stepBeam,
  tabSwitchesWalking,
  transferIn,
  transferOut,
  typingWin,
  walkingIntent,
  withinReach,
  worldMap,
  circleAt,
  clickWin,
  moveFavourite,
} from './colosseum-logic.mjs';
import {
  layoutView,
  measureReserved,
  paintActor,
  paintBeamLine,
  paintBridge,
  paintFace,
  paintGun,
  paintMargin,
  paintShot,
  worldToLane,
} from './colosseum-art.js';

const SAVE_KEY = 'nook-colosseum';
const world = worldMap();
const fence = arenaMap();
const blankHeld = () => ({ a: false, d: false, w: false, s: false, space: false, shift: false });

let api = null;
let save = emptySave();
let actor = spawnActor(world, save);
let walking = false;
let held = blankHeld();
let raf = 0;
let pollTimer = 0;
let pollMs = 400;
let lastGameId = 0;
let gameSeq = 0;
let lastStamp = 0;
let mounted = false;
const seenGame = new Set();
const applied = new Set();
const postcards = [];
const others = new Map();
const shots = [];
let beam = { energy: 1, locked: false };
let beamOn = false;
let match = null;
let duel = null;
let clickGame = null;
let typeGame = null;
let emote = '';
let emoteUntil = 0;
let status = '';
let tab = 'games';
let offer = null;

const els = {};

function roomOpen() {
  const room = document.querySelector('#room');
  return !!(room && !room.hidden && api);
}

function focusSnapshot() {
  const el = document.activeElement;
  if (!roomOpen() || !el || el === document.body || el === document.documentElement) {
    return { inRoom: roomOpen(), field: null };
  }
  const tag = el.tagName;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  const text = tag === 'TEXTAREA' || el.isContentEditable
    || (tag === 'INPUT' && !['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file'].includes(type));
  return {
    inRoom: true,
    field: {
      id: el.id || '',
      text,
      door: !!el.closest('#door, #door-form'),
      settings: !!el.closest('#settings-panel'),
    },
  };
}

function paintCue() {
  if (!els.cue) return;
  els.cue.hidden = !walking;
}

function enterWalking() {
  const el = document.activeElement;
  if (el && (el.id === 'text' || el.tagName === 'BUTTON')) el.blur();
  walking = true;
  paintCue();
}

function leaveWalking() {
  walking = false;
  held = blankHeld();
  paintCue();
  const box = document.querySelector('#text');
  if (box && roomOpen()) box.focus();
}

function onKeyDown(event) {
  if (event.key === 'Tab' && !event.altKey && !event.metaKey && !event.ctrlKey) {
    if (!tabSwitchesWalking(focusSnapshot())) return;
    event.preventDefault();
    event.stopPropagation();
    if (walking) leaveWalking();
    else enterWalking();
    return;
  }
  if (!walking) return;
  const name = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space', ShiftLeft: 'shift' }[event.code];
  if (!name) return;
  const field = focusSnapshot().field;
  if (field && field.text && field.id !== 'text') return;
  event.preventDefault();
  event.stopPropagation();
  held[name] = true;
}

function onKeyUp(event) {
  const name = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space', ShiftLeft: 'shift' }[event.code];
  if (name) held[name] = false;
}

function persist() {
  const clean = sanitiseSave({ ...save, x: Math.round(actor.x), y: Math.round(actor.y) });
  save = clean;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
  if (api && api.writeCopy) {
    api.writeCopy(JSON.stringify(clean)).catch(() => {});
  }
}

async function loadSave() {
  let raw = '';
  try { raw = localStorage.getItem(SAVE_KEY) || ''; } catch { raw = ''; }
  if (!raw && api && api.readCopy) {
    try { raw = await api.readCopy(); } catch { raw = ''; }
  }
  if (!raw) {
    save = emptySave();
    return;
  }
  try { save = sanitiseSave(JSON.parse(raw)); } catch { save = emptySave(); }
}

function say(text) {
  status = text;
  if (els.status) els.status.textContent = text;
}

function people() {
  return api && api.people ? api.people() : [];
}

function me() {
  return api ? api.getMemberId() : '';
}

function myName() {
  return (api && api.getName()) || 'Someone';
}

async function publish(kind, body) {
  const key = api && api.getGroupKey();
  const token = api && api.getToken();
  if (!key || !token) return;
  gameSeq += 1;
  const parcel = await encryptJson(key, { v: 1, kind, from: me(), seq: gameSeq, body });
  await fetch('/api/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-token': token },
    body: JSON.stringify(parcel),
  });
}

function grant(outcome) {
  const purse = applyPurse(save.coins, outcome);
  save.coins = purse.coins;
  if (outcome === 'win') save.wins += 1;
  if (outcome === 'loss') save.losses += 1;
  persist();
  publish('postcard', { name: myName(), coins: save.coins, wins: save.wins, losses: save.losses, colour: save.colour });
  const line = outcome === 'win' ? `Won ${purse.delta} coins.` : outcome === 'loss' ? 'A small loss.' : 'A draw.';
  say(`${line} Purse ${save.coins}.`);
  paintPanel();
}

function rememberCard(card) {
  const idx = postcards.findIndex((item) => item.memberId === card.memberId);
  if (idx >= 0) postcards[idx] = card;
  else postcards.push(card);
}

function ownCard() {
  return { memberId: me() || 'me', name: myName(), coins: save.coins, wins: save.wins, seq: gameSeq };
}

function applyParcel(payload, row) {
  if (!payload || payload.from !== row.memberId) return;
  const key = `${payload.kind}:${payload.from}:${payload.seq}`;
  if (applied.has(key)) return;
  const body = payload.body || {};
  if (payload.kind === 'postcard') {
    applied.add(key);
    rememberCard({ memberId: payload.from, name: body.name, coins: body.coins, wins: body.wins, seq: payload.seq });
  } else if (payload.kind === 'place') {
    applied.add(key);
    others.set(payload.from, { ...body, id: payload.from, at: Date.now() });
  } else if (payload.kind === 'send' && body.to === me()) {
    applied.add(key);
    const got = transferIn(save.coins, body.amount);
    if (got.ok) {
      save.coins = got.coins;
      persist();
      say(`Received ${body.amount} coins.`);
    }
  } else if (payload.kind === 'gift' && body.to === me()) {
    applied.add(key);
    offer = { id: key, from: payload.from, name: body.name, amount: body.amount };
    say(`${body.name} offered ${body.amount} coins.`);
  } else if (payload.kind === 'gift-accept' && body.to === me()) {
    applied.add(key);
    save.escrow = (save.escrow || []).filter((gift) => gift.id !== body.id);
    persist();
  } else if (payload.kind === 'gift-decline' && body.to === me()) {
    applied.add(key);
    const gift = (save.escrow || []).find((item) => item.id === body.id);
    if (gift) {
      save.coins = transferIn(save.coins, gift.amount).coins;
      save.escrow = save.escrow.filter((item) => item.id !== body.id);
      persist();
      say('The gift came back.');
    }
  } else if (payload.kind === 'duel') {
    applied.add(key);
    takeDuel(payload.from, body);
  } else if (payload.kind === 'shot') {
    applied.add(key);
    if (!shots.some((shot) => shot.id === body.id)) shots.push(body);
  } else if (payload.kind === 'match-open' && payload.from !== me()) {
    applied.add(key);
    offerMatch(payload.from, body);
  } else if (payload.kind === 'match-end') {
    applied.add(key);
    finishMatch(body);
  } else if (payload.kind === 'emote') {
    applied.add(key);
    const who = others.get(payload.from);
    if (who) who.emoteUntil = Date.now() + 1200;
  }
  if (els.pop && !els.pop.hidden && payload.kind !== 'place' && payload.kind !== 'shot' && payload.kind !== 'emote') paintPanel();
}

function offerMatch(from, body) {
  match = match && match.on ? match : { invite: body.matchKey, from, lives: body.lives, gun: 'rifle' };
}

function finishMatch(body) {
  const bound = bindOpenBets(save.bets, body.winnerName, body.matchKey);
  const lost = bindOpenBets(save.bets, body.loserName, body.matchKey);
  const merged = [...bound, ...lost.filter((bet) => !bound.includes(bet))];
  const results = [];
  if (body.winnerName) results.push({ ally: body.winnerName, matchKey: body.matchKey, won: true });
  if (body.loserName) results.push({ ally: body.loserName, matchKey: body.matchKey, won: false });
  const settled = settleBets(save.coins, merged.length ? merged : save.bets, results);
  save.coins = settled.coins;
  save.bets = settled.bets;
  if (match && match.id === body.matchKey && body.winnerId === me() && !match.paid) {
    match.paid = true;
    match.on = false;
    grant('win');
    return;
  }
  persist();
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
        const payload = await decryptJson(key, row);
        applyParcel(payload, row);
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

function viewOf(lane, side) {
  const rect = lane.getBoundingClientRect();
  const reserved = measureReserved(lane, side === 'left' ? '.troupe' : '.affirm-card');
  const region = side === 'left' ? world.left : world.right;
  return { rect, region, view: layoutView(rect, region, world, reserved), reserved };
}

function drawLane(canvas, side) {
  const lane = canvas.parentElement;
  const box = viewOf(lane, side);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, box.rect.width);
  const h = Math.max(1, box.rect.height);
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!save.cityOn) {
    ctx.clearRect(0, 0, w, h);
    return box;
  }
  paintMargin(ctx, w, h, side, world, box.view, box.region, {
    furniture: save.furniture,
    pictures: side === 'left' ? save.pictures : [],
    fence: match && match.on ? fence : null,
    covers: match && match.on ? fence.covers : [],
  });
  const drawOne = (person, colour, worn, gun) => {
    if (onBridge(person, world)) return;
    const local = worldToLane(person.x, person.y, box.view, box.region);
    if (local.x < -40 || local.x > w + 40) return;
    paintActor(ctx, local.x, local.y, person.w * box.view.scale, person.h * box.view.scale, colour, worn, person.facing || 1);
    if (gun) paintGun(ctx, gun, local.x + person.w * box.view.scale * 0.7, local.y + person.h * box.view.scale * 0.45, person.facing || 1, box.view.scale);
  };
  for (const other of others.values()) {
    if (Date.now() - other.at > 4000) continue;
    drawOne({ x: other.x, y: other.y, w: actor.w, h: actor.h, facing: other.facing }, other.colour || '#b48cff', '', other.gun);
  }
  if (!(match && match.on && side === 'left') && !onBridge(actor, world)) {
    const region = box.region;
    const mid = actor.x + actor.w / 2;
    if (mid >= region.x && mid < region.x + region.w) drawOne(actor, save.colour, save.worn, match && match.on ? match.gun : '');
  }
  if (match && match.on && side === 'right') {
    for (const shot of shots) {
      const at = worldToLane(shot.x, shot.y, box.view, box.region);
      paintShot(ctx, at.x, at.y, (shot.r || 3) * box.view.scale, shot.gun);
    }
    if (beamOn && match.gun === 'beam') {
      const from = { x: actor.x + actor.w / 2, y: actor.y + actor.h * 0.45 };
      const segment = resolveBeam(from, actor.facing, GUNS.beam.length, fence.covers, null) || {
        x0: from.x, y: from.y, x1: from.x + actor.facing * GUNS.beam.length, y1: from.y,
      };
      const a = worldToLane(segment.x0, segment.y, box.view, box.region);
      const b = worldToLane(segment.x1, segment.y1, box.view, box.region);
      paintBeamLine(ctx, a.x, a.y, b.x, b.y);
    }
  }
  return box;
}

function placeBridge() {
  if (!els.bridge) return;
  const show = save.cityOn && onBridge(actor, world);
  els.bridge.hidden = !show;
  if (!show) return;
  const left = viewOf(document.querySelector('#lane-left'), 'left');
  const right = viewOf(document.querySelector('#lane-right'), 'right');
  const p = bridgeProgress(actor, world);
  const leftAt = worldToLane(world.left.w - actor.w, actor.y, left.view, left.region);
  const rightAt = worldToLane(world.right.x, actor.y, right.view, right.region);
  const x = left.rect.left + leftAt.x + (right.rect.left + rightAt.x - (left.rect.left + leftAt.x)) * p;
  const y = left.rect.top + leftAt.y + (right.rect.top + rightAt.y - (left.rect.top + leftAt.y)) * p;
  const w = actor.w * ((left.view.scale + right.view.scale) / 2);
  const h = actor.h * ((left.view.scale + right.view.scale) / 2);
  els.bridge.style.left = `${x - 16}px`;
  els.bridge.style.top = `${y}px`;
  els.bridge.style.width = `${Math.max(72, w + 28)}px`;
  els.bridge.style.height = `${h + 18}px`;
  const canvas = els.bridge.querySelector('canvas');
  canvas.width = 88;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  paintBridge(ctx, canvas.width, canvas.height);
  paintActor(ctx, 16, 8, w, h, save.colour, save.worn, actor.facing);
}

function nearestOther() {
  let found = null;
  for (const other of others.values()) {
    const body = { x: other.x, y: other.y, w: actor.w, h: actor.h };
    if (withinReach(actor, body, EMOTE_REACH)) found = other;
  }
  return found;
}

function placeEmotes() {
  const other = !match?.on && save.cityOn ? nearestOther() : null;
  els.emotes.hidden = !other;
  if (!other) return;
  const left = document.querySelector('#lane-left').getBoundingClientRect();
  els.emotes.style.left = `${left.left + 12}px`;
  els.emotes.style.top = `${left.bottom - 78}px`;
}

function stepCity(dt) {
  if (!save.cityOn) return;
  const intent = walking ? walkingIntent(held) : {};
  actor = stepActor(actor, intent, world, dt);
  if (match && match.on) {
    actor = clampArena(actor, fence);
    match.invuln = Math.max(0, (match.invuln || 0) - dt);
    const bodies = [{ id: me(), invuln: match.invuln, rect: { x: actor.x, y: actor.y, w: actor.w, h: actor.h } }];
    for (const other of others.values()) {
      bodies.push({ id: other.id, invuln: 0, rect: { x: other.x, y: other.y, w: actor.w, h: actor.h } });
    }
    const resolved = resolveShots(shots, fence.covers, bodies, dt);
    shots.length = 0;
    shots.push(...resolved.shots);
    for (const hit of resolved.hits) {
      if (hit.id !== me() || match.invuln > 0) continue;
      match.livesLeft = applyHit(match.livesLeft);
      match.invuln = 1;
      const back = respawn(fence.start);
      actor.x = back.x;
      actor.y = back.y;
      actor.vx = 0;
      actor.vy = 0;
      if (match.livesLeft <= 0) {
        const winner = others.get(hit.from);
        publish('match-end', {
          matchKey: match.id,
          winnerId: hit.from,
          winnerName: winner?.name || '',
          loserName: myName(),
        });
        match.on = false;
        grant('loss');
      }
    }
    if (match.on && match.gun === 'beam') {
      const stepped = stepBeam(beam.energy, { firing: beamOn, locked: beam.locked }, dt);
      beam = { energy: stepped.energy, locked: stepped.locked };
      beamOn = stepped.firing && beamOn;
    }
  }
}

let placeTick = 0;
function frame(now) {
  const dt = lastStamp ? Math.min(0.05, (now - lastStamp) / 1000) : 0.016;
  lastStamp = now;
  if (roomOpen()) {
    stepCity(dt);
    if (els.left) drawLane(els.left, 'left');
    if (els.right) drawLane(els.right, 'right');
    placeBridge();
    placeEmotes();
    placeTick += dt;
    if (placeTick > 0.4 && save.cityOn) {
      placeTick = 0;
      publish('place', {
        x: Math.round(actor.x),
        y: Math.round(actor.y),
        facing: actor.facing,
        colour: save.colour,
        name: myName(),
        inMatch: !!(match && match.on),
        gun: match && match.on ? match.gun : '',
      });
    }
    tickGames(now);
  }
  raf = requestAnimationFrame(frame);
}

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
      grant(clickWin(clickGame.hits) ? 'win' : 'loss');
      clickGame = null;
    }
  }
  if (typeGame && now - typeGame.start >= GAME_MS) {
    grant(typingWin(typeGame.value) ? 'win' : 'loss');
    typeGame = null;
  }
  if (duel && duel.phase === 'live') {
    const elapsed = Date.now() - duel.startAt;
    const side = sparkSide(elapsed);
    if (els.spark) {
      els.spark.style.left = side === 'left' ? '18px' : 'calc(100% - 18px)';
    }
    if (elapsed >= GAME_MS) {
      const outcome = duelOutcome(duel.myScore, duel.theirScore);
      duel.phase = 'done';
      grant(outcome);
    }
  }
}

function takeDuel(from, body) {
  if (body.phase === 'invite' && from !== me()) {
    duel = { phase: 'invited', round: body.round, from, role: 'right', myScore: 0, theirScore: 0, startAt: 0 };
    say('Someone wants a duel.');
  } else if (body.phase === 'accept' && duel && duel.round === body.round) {
    duel.phase = 'live';
    duel.startAt = body.startAt;
    duel.peer = from;
    els.spark = null;
  } else if (body.phase === 'score' && duel && duel.round === body.round) {
    duel.theirScore = body.score;
  }
  paintPanel();
}

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function button(label, fn) {
  const node = h('button', '', label);
  node.type = 'button';
  node.addEventListener('click', fn);
  return node;
}

function paintPanel() {
  if (!els.panel) return;
  if (tab === 'games' && (typeGame || clickGame)) return;
  if (tab === 'games' && duel && duel.phase === 'live' && els.spark) return;
  els.panel.replaceChildren();
  if (tab === 'games') paintGames();
  else if (tab === 'favourites') paintFavourites();
  else if (tab === 'board') paintBoard();
  else if (tab === 'shop') paintShop();
  else paintPurse();
}

function paintGames() {
  const frame = h('div', 'colo-frame');
  const leftPic = h('img', 'colo-corner left');
  leftPic.alt = '';
  leftPic.src = paintFace(save.colour);
  const rightPic = h('img', 'colo-corner right');
  rightPic.alt = '';
  rightPic.src = paintFace('#b48cff');
  const leftWall = h('div', 'colo-wall left');
  const rightWall = h('div', 'colo-wall right');
  leftWall.style.background = save.colour;
  rightWall.style.background = '#b48cff';
  const stage = h('div', 'colo-stage');
  frame.append(leftPic, rightPic, leftWall, rightWall, stage);
  const row = h('div', 'colo-row');
  row.append(
    button('Typing', () => startTyping(stage)),
    button('Click', () => startClick(stage)),
    button('Duel', () => startDuel(stage)),
  );
  const cityRow = h('div', 'colo-row');
  cityRow.append(
    button(save.cityOn ? 'City on' : 'City off', () => {
      save.cityOn = !save.cityOn;
      if (!save.cityOn) {
        walking = false;
        held = blankHeld();
        paintCue();
      }
      persist();
      paintPanel();
    }),
    button('One life', () => startMatch(1)),
    button('Three lives', () => startMatch(3)),
  );
  const guns = h('div', 'colo-guns');
  for (const name of ['rifle', 'launcher', 'beam']) {
    const gun = button(name, () => {
      if (!match) match = { gun: name, on: false, livesLeft: 0, id: '' };
      match.gun = name;
      paintPanel();
    });
    gun.setAttribute('aria-pressed', match && match.gun === name ? 'true' : 'false');
    guns.append(gun);
  }
  if (match && match.invite && !match.on) {
    cityRow.append(button('Join match', () => joinMatch()));
  }
  els.panel.append(frame, row, cityRow, guns, h('p', 'colo-note', 'Tab walks. Tab again types. WASD moves, space jumps, left shift climbs.'));
  if (duel && duel.phase === 'invited') {
    els.panel.append(button('Accept duel', () => acceptDuel(stage, leftWall, rightWall)));
  }
  if (duel && duel.phase === 'live') readyDuel(stage, leftWall, rightWall);
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
  const line = h('p', '', TYPING_PHRASE);
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Typing line');
  input.addEventListener('input', () => { typeGame.value = input.value; });
  wrap.append(line, input);
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
  say('Waiting for the other person.');
}

function acceptDuel(stage, leftWall, rightWall) {
  if (!duel) return;
  const startAt = Date.now() + 600;
  duel.phase = 'live';
  duel.startAt = startAt;
  publish('duel', { phase: 'accept', round: duel.round, startAt });
  readyDuel(stage, leftWall, rightWall);
}

function startMatch(lives) {
  const id = `m-${me()}-${Date.now()}`;
  match = { on: true, id, lives, livesLeft: lives, gun: (match && match.gun) || 'rifle', invuln: 0, paid: false };
  const back = respawn(fence.start);
  actor.x = back.x;
  actor.y = back.y;
  beam = { energy: 1, locked: false };
  publish('match-open', { matchKey: id, lives, name: myName() });
  say(lives === 1 ? 'One life. Fire with the button.' : 'Three lives. Fire with the button.');
  paintHud();
}

function joinMatch() {
  if (!match || !match.invite) return;
  match = { on: true, id: match.invite, lives: match.lives || 3, livesLeft: match.lives || 3, gun: match.gun || 'rifle', invuln: 0, paid: false };
  const back = respawn({ x: fence.x + fence.w - actor.w - 24, y: fence.start.y });
  actor.x = back.x;
  actor.y = back.y;
  paintHud();
}

function fireCurrent() {
  if (!match || !match.on || match.gun === 'beam') return;
  const spec = GUNS[match.gun];
  if (match.cool > performance.now()) return;
  match.cool = performance.now() + spec.cooldown * 1000;
  const shot = fireGun(match.gun, { x: actor.x + actor.w / 2, y: actor.y + 28 }, actor.facing);
  if (!shot) return;
  shot.id = `${me()}-${gameSeq + 1}`;
  shot.from = me();
  shots.push(shot);
  publish('shot', shot);
}

function paintHud() {
  els.hud.replaceChildren();
  els.hud.hidden = !(match && match.on);
  if (els.hud.hidden) return;
  els.hud.append(h('span', 'colo-note', `${match.livesLeft} ${match.livesLeft === 1 ? 'life' : 'lives'}`));
  const fire = button('Fire', () => {});
  fire.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (match.gun === 'beam') beamOn = true;
    else fireCurrent();
  });
  fire.addEventListener('pointerup', () => { beamOn = false; });
  fire.addEventListener('pointerleave', () => { beamOn = false; });
  els.hud.append(fire);
}

function paintFavourites() {
  const names = people().filter((person) => person.id !== me());
  const ordered = orderFavourites(names, save.favourites);
  const list = h('div', 'colo-list');
  if (!ordered.length) list.append(h('p', '', 'Nobody else is in the room.'));
  for (const person of ordered) {
    const row = h('div', 'colo-row');
    row.append(h('span', '', person.name));
    const starred = save.favourites.includes(person.name);
    row.append(button(starred ? 'Starred' : 'Star', () => {
      save.favourites = starred
        ? save.favourites.filter((name) => name !== person.name)
        : [...save.favourites, person.name];
      persist();
      paintPanel();
    }));
    if (starred) {
      row.append(button('Up', () => {
        save.favourites = moveFavourite(save.favourites, person.name, -1);
        persist();
        paintPanel();
      }));
      row.append(button('Down', () => {
        save.favourites = moveFavourite(save.favourites, person.name, 1);
        persist();
        paintPanel();
      }));
    }
    list.append(row);
  }
  els.panel.append(h('p', 'colo-note', 'Only this browser sees this order.'), list);
}

function paintBoard() {
  const rows = rankBoard([ownCard(), ...postcards]);
  const list = h('div', 'colo-list');
  rows.forEach((row, index) => {
    list.append(h('p', '', `${index + 1}. ${row.name} · ${row.coins} coins · ${row.wins} wins`));
  });
  if (!rows.length) list.append(h('p', '', 'The board is quiet.'));
  els.panel.append(list);
}

function paintShop() {
  els.panel.append(h('p', 'colo-note', `Purse ${save.coins}.`));
  const list = h('div', 'colo-list');
  for (const item of CATALOG) {
    const owned = save.owned.includes(item.id);
    const row = h('div', 'colo-row');
    row.append(h('span', '', `${item.name} · ${item.price}`));
    if (!owned) {
      row.append(button('Buy', () => {
        const next = purchase(save, item.id);
        if (!next.ok) say('The purse cannot cover that.');
        else {
          save = next.save;
          persist();
          say(`Bought ${item.name}.`);
        }
        paintPanel();
      }));
    } else if (item.kind === 'wear') {
      row.append(button(save.worn === item.id ? 'Wearing' : 'Wear', () => {
        save.worn = save.worn === item.id ? '' : item.id;
        persist();
        paintPanel();
      }));
    } else row.append(h('span', '', 'Yours'));
    list.append(row);
  }
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
    row.append(h('span', '', person.name));
    row.append(button('Send', () => sendCoins(person, amount.value, 'send')));
    row.append(button('Give', () => sendCoins(person, amount.value, 'gift')));
    const ally = save.allies.includes(person.name);
    row.append(button(ally ? 'Ally' : 'Make ally', () => {
      const next = setAlly(save.allies, person.name, !ally);
      if (!next.ok) say('Two allies is the limit.');
      else {
        save.allies = next.allies;
        persist();
      }
      paintPanel();
    }));
    if (ally) {
      row.append(button('Stake', () => {
        const placed = placeBet(save.coins, save.bets, save.allies, { ally: person.name, stake: amount.value, matchKey: '' });
        if (!placed.ok) say('That stake does not fit.');
        else {
          save.coins = placed.coins;
          save.bets = placed.bets;
          persist();
          say(`Staked on ${person.name}.`);
        }
        paintPanel();
      }));
    }
    list.append(row);
  }
  if (offer) {
    list.append(button(`Accept ${offer.amount} from ${offer.name}`, () => {
      const got = transferIn(save.coins, offer.amount);
      if (got.ok) {
        save.coins = got.coins;
        publish('gift-accept', { id: offer.id, to: offer.from });
        offer = null;
        persist();
      }
      paintPanel();
    }));
  }
  els.panel.append(h('p', 'colo-note', `Purse ${save.coins}. Allies ${save.allies.join(', ') || 'none'}.`), amount, list);
}

function sendCoins(person, raw, kind) {
  const moved = transferOut(save.coins, raw);
  if (!moved.ok) {
    say('The purse cannot cover that.');
    return;
  }
  save.coins = moved.coins;
  if (kind === 'gift') {
    const id = `${me()}:${gameSeq + 1}`;
    save.escrow = [...(save.escrow || []), { id, amount: moved.sent, to: person.name }];
    publish('gift', { to: person.id, name: myName(), amount: moved.sent, id });
  } else {
    publish('send', { to: person.id, amount: moved.sent });
  }
  persist();
  paintPanel();
}

function buildPop() {
  const pop = h('section', 'colo-pop');
  pop.id = 'colosseum-pop';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'The Colosseum of Friendship');
  const head = h('div', 'colo-head');
  head.append(h('h2', '', 'The Colosseum of Friendship'));
  head.append(button('Close', () => togglePop(false)));
  const colours = h('div', 'colo-colours');
  for (const colour of COLOURS) {
    const swatch = button(colour.id, () => {
      save.colour = colour.value;
      persist();
      paintPanel();
      colours.querySelectorAll('button').forEach((node) => node.setAttribute('aria-pressed', node === swatch ? 'true' : 'false'));
    });
    swatch.style.background = colour.value;
    swatch.setAttribute('aria-pressed', save.colour === colour.value ? 'true' : 'false');
    colours.append(swatch);
  }
  const tabs = h('div', 'colo-tabs');
  tabs.setAttribute('role', 'tablist');
  for (const [id, label] of [['games', 'Games'], ['favourites', 'Favourites'], ['board', 'Board'], ['shop', 'Shop'], ['purse', 'Purse']]) {
    const node = button(label, () => { tab = id; paintPanel(); markTabs(); });
    node.dataset.tab = id;
    node.setAttribute('role', 'tab');
    tabs.append(node);
  }
  const panel = h('div', '');
  const statusLine = h('p', 'colo-status', '');
  statusLine.setAttribute('aria-live', 'polite');
  pop.append(head, colours, tabs, panel, statusLine);
  els.pop = pop;
  els.panel = panel;
  els.status = statusLine;
  els.tabs = tabs;
  document.body.append(pop);
  markTabs();
}

function markTabs() {
  if (!els.tabs) return;
  for (const node of els.tabs.querySelectorAll('button')) {
    node.setAttribute('aria-selected', node.dataset.tab === tab ? 'true' : 'false');
  }
}

function togglePop(force) {
  const open = typeof force === 'boolean' ? force : els.pop.hidden;
  els.pop.hidden = !open;
  const btn = document.querySelector('#colosseum-btn');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) paintPanel();
}

function buildCity() {
  const leftLane = document.querySelector('#lane-left');
  const rightLane = document.querySelector('#lane-right');
  const left = document.createElement('canvas');
  left.className = 'city-layer';
  left.setAttribute('aria-hidden', 'true');
  const right = document.createElement('canvas');
  right.className = 'city-layer';
  right.setAttribute('aria-hidden', 'true');
  leftLane.append(left);
  rightLane.append(right);
  const cue = h('p', 'walk-cue', 'Walking');
  cue.hidden = true;
  leftLane.append(cue);
  const hud = h('div', 'city-hud');
  hud.hidden = true;
  rightLane.append(hud);
  const emotes = h('div', 'city-emotes');
  emotes.hidden = true;
  for (const name of ['Fist bump', 'High five', 'Poke']) {
    emotes.append(button(name, () => {
      emote = name;
      emoteUntil = performance.now() + 1000;
      publish('emote', { name });
    }));
  }
  document.body.append(emotes);
  const bridge = h('div', 'city-bridge');
  bridge.hidden = true;
  bridge.append(document.createElement('canvas'));
  document.body.append(bridge);
  els.left = left;
  els.right = right;
  els.cue = cue;
  els.hud = hud;
  els.emotes = emotes;
  els.bridge = bridge;
}

export async function mountColosseum(hooks) {
  api = hooks;
  if (!mounted) {
    mounted = true;
    buildPop();
    buildCity();
    document.querySelector('#colosseum-btn')?.addEventListener('click', () => togglePop());
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    raf = requestAnimationFrame(frame);
  }
  await loadSave();
  actor = spawnActor(world, save);
  if (Number.isFinite(save.x)) actor.x = save.x;
  if (Number.isFinite(save.y)) actor.y = save.y;
  walking = false;
  held = blankHeld();
  paintCue();
  schedulePoll();
  publish('postcard', { name: myName(), coins: save.coins, wins: save.wins, losses: save.losses, colour: save.colour });
}

export function settleColosseum() {
  if (!mounted) return;
  clearTimeout(pollTimer);
  const back = releaseEscrow(save.coins, save.escrow);
  save.coins = back.coins;
  save.escrow = back.escrow;
  walking = false;
  held = blankHeld();
  match = null;
  shots.length = 0;
  others.clear();
  paintCue();
  if (els.bridge) els.bridge.hidden = true;
  if (els.hud) els.hud.hidden = true;
  persist();
}

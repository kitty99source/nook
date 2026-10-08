// Coin, ranking, bet, and hit rules for The Colosseum of Friendship.
// No chat, no room word, and nothing that has to be saved on the host.

export const START_COINS = 20;
export const WIN_PAY = 8;
export const LOSS_COST = 3;
export const CLICK_TO_WIN = 6;
export const GAME_MS = 10000;
export const MAX_ALLIES = 2;
export const TYPING_PHRASE = 'bright room';
export const CLICK_BOUNDS = { w: 320, h: 160, r: 16 };
export const GRAVITY = 1400;
export const MOVE_SPEED = 150;
export const JUMP_V = -520;
export const CLIMB_SPEED = 110;
export const EMOTE_REACH = 42;

export const COLOURS = [
  { id: 'cyan', value: '#3ec6c6' },
  { id: 'lilac', value: '#b48cff' },
  { id: 'coral', value: '#ff7a8a' },
  { id: 'gold', value: '#f0c14a' },
  { id: 'mint', value: '#7dcea0' },
];

export const CATALOG = [
  { id: 'visor', kind: 'wear', name: 'Visor', price: 6 },
  { id: 'scarf', kind: 'wear', name: 'Scarf', price: 6 },
  { id: 'antenna', kind: 'wear', name: 'Antenna', price: 8 },
  { id: 'paw-sword', kind: 'wear', name: 'Paw sword', price: 10 },
  { id: 'paw-shield', kind: 'wear', name: 'Paw shield', price: 10 },
  { id: 'crate', kind: 'furniture', name: 'Crate seat', price: 8 },
  { id: 'lamp', kind: 'furniture', name: 'Glow lamp', price: 8 },
  { id: 'pod', kind: 'furniture', name: 'Plant pod', price: 8 },
  { id: 'nebula', kind: 'picture', name: 'Nebula card', price: 5 },
  { id: 'moon', kind: 'picture', name: 'Moon card', price: 5 },
  { id: 'rings', kind: 'picture', name: 'Ringed planet', price: 5 },
];

export const GUNS = {
  rifle: { speed: 460, radius: 3, cooldown: 0.16, life: 1.1 },
  launcher: { speed: 170, radius: 9, cooldown: 0.75, life: 1.5 },
  beam: { length: 168, drain: 0.55, recharge: 0.28 },
};

const CATALOG_IDS = new Set(CATALOG.map((item) => item.id));
const WEAR_IDS = new Set(CATALOG.filter((item) => item.kind === 'wear').map((item) => item.id));
const PICTURE_IDS = new Set(CATALOG.filter((item) => item.kind === 'picture').map((item) => item.id));
const FURNITURE_IDS = new Set(CATALOG.filter((item) => item.kind === 'furniture').map((item) => item.id));

export function purse(coins) {
  const n = Number(coins);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function whole(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function applyPurse(coins, outcome) {
  const current = purse(coins);
  if (outcome === 'win') return { coins: current + WIN_PAY, delta: WIN_PAY };
  if (outcome === 'loss') {
    const next = Math.max(0, current - LOSS_COST);
    return { coins: next, delta: next - current };
  }
  return { coins: current, delta: 0 };
}

export function latestPostcards(list) {
  const map = new Map();
  for (const card of list || []) {
    if (!card || typeof card !== 'object') continue;
    const memberId = String(card.memberId || '');
    if (!memberId) continue;
    const seq = whole(card.seq);
    const prev = map.get(memberId);
    if (!prev || seq >= prev.seq) {
      map.set(memberId, {
        memberId,
        name: String(card.name || '').trim() || 'Someone',
        coins: purse(card.coins),
        wins: whole(card.wins),
        seq,
      });
    }
  }
  return [...map.values()];
}

export function rankBoard(postcards) {
  const rows = latestPostcards(postcards).map((card) => ({
    memberId: card.memberId,
    name: card.name,
    coins: card.coins,
    wins: card.wins,
  }));
  rows.sort((a, b) => b.coins - a.coins || b.wins - a.wins || a.name.localeCompare(b.name));
  return rows;
}

export function orderFavourites(people, favouriteNames) {
  const fav = (favouriteNames || []).map((name) => String(name));
  const rank = new Map(fav.map((name, index) => [name, index]));
  return [...(people || [])].filter((person) => person && person.name).sort((a, b) => {
    const ar = rank.has(a.name) ? rank.get(a.name) : 10000;
    const br = rank.has(b.name) ? rank.get(b.name) : 10000;
    if (ar !== br) return ar - br;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function moveFavourite(names, name, dir) {
  const list = [...(names || [])];
  const index = list.indexOf(name);
  const nextIndex = index + dir;
  if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return list;
  const swapped = [...list];
  const held = swapped[index];
  swapped[index] = swapped[nextIndex];
  swapped[nextIndex] = held;
  return swapped;
}

export function hitCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export function bulletHitsRect(x0, y0, x1, y1, r, rect) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, r || 1)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (circleHitsRect(x0 + dx * t, y0 + dy * t, r, rect)) return true;
  }
  return false;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function typingWin(typed, phrase = TYPING_PHRASE) {
  return String(typed || '') === String(phrase || '');
}

export function circleAt(tMs, bounds = CLICK_BOUNDS) {
  const t = Number(tMs) / 1000;
  const r = bounds.r;
  return {
    x: r + (bounds.w - 2 * r) * (0.5 + 0.5 * Math.sin(t * 2.4)),
    y: r + (bounds.h - 2 * r) * (0.5 + 0.5 * Math.sin(t * 3.7 + 1.2)),
    r,
  };
}

export function scoreClick(px, py, tMs, bounds = CLICK_BOUNDS) {
  const circle = circleAt(tMs, bounds);
  return hitCircle(px, py, circle.x, circle.y, circle.r);
}

export function clickWin(hits) {
  return whole(hits) >= CLICK_TO_WIN;
}

export function duelOutcome(myScore, theirScore) {
  const mine = whole(myScore);
  const theirs = whole(theirScore);
  if (mine === theirs) return 'draw';
  return mine > theirs ? 'win' : 'loss';
}

export function sparkSide(elapsedMs, span = 900) {
  const phase = (Math.max(0, Number(elapsedMs) || 0) % (span * 2)) / span;
  return phase < 1 ? 'left' : 'right';
}

export function canAfford(coins, price) {
  const cost = purse(price);
  return cost > 0 && purse(coins) >= cost;
}

export function buy(coins, price) {
  if (!canAfford(coins, price)) return { ok: false, coins: purse(coins) };
  return { ok: true, coins: purse(coins) - purse(price) };
}

export function transferOut(coins, amount) {
  const n = purse(amount);
  const have = purse(coins);
  if (n < 1 || n > have) return { ok: false, coins: have, sent: 0 };
  return { ok: true, coins: have - n, sent: n };
}

export function transferIn(coins, amount) {
  const n = purse(amount);
  if (n < 1) return { ok: false, coins: purse(coins) };
  return { ok: true, coins: purse(coins) + n };
}

export function releaseEscrow(coins, escrow) {
  let next = purse(coins);
  for (const gift of escrow || []) next += purse(gift.amount);
  return { coins: next, escrow: [] };
}

export function setAlly(allies, name, on) {
  const clean = String(name || '').trim();
  const list = [];
  for (const item of allies || []) {
    const label = String(item || '').trim();
    if (!label || label === clean || list.includes(label)) continue;
    list.push(label);
    if (list.length >= MAX_ALLIES) break;
  }
  if (!on) return { ok: true, allies: list };
  if (!clean) return { ok: false, allies: list, reason: 'name' };
  if (list.length >= MAX_ALLIES) return { ok: false, allies: list, reason: 'full' };
  return { ok: true, allies: [...list, clean] };
}

export function placeBet(coins, bets, allies, { ally, stake, matchKey = '' } = {}) {
  const amount = purse(stake);
  const have = purse(coins);
  const open = (bets || []).filter((bet) => bet && !bet.settled);
  const name = String(ally || '').trim();
  if (!name || !(allies || []).includes(name)) {
    return { ok: false, coins: have, bets: open, reason: 'ally' };
  }
  if (amount < 1) return { ok: false, coins: have, bets: open, reason: 'stake' };
  if (amount > have) return { ok: false, coins: have, bets: open, reason: 'purse' };
  if (open.some((bet) => bet.ally === name && bet.matchKey === String(matchKey || ''))) {
    return { ok: false, coins: have, bets: open, reason: 'already' };
  }
  return {
    ok: true,
    coins: have - amount,
    bets: [...open, { ally: name, stake: amount, matchKey: String(matchKey || ''), settled: false }],
  };
}

export function settleBets(coins, bets, results) {
  let next = purse(coins);
  const left = [];
  for (const bet of bets || []) {
    if (!bet || bet.settled) continue;
    const hit = (results || []).find((row) => row && row.ally === bet.ally && String(row.matchKey || '') === String(bet.matchKey || ''));
    if (!hit) {
      left.push(bet);
      continue;
    }
    if (hit.won) next += purse(bet.stake) * 2;
  }
  return { coins: next, bets: left };
}

export function bindOpenBets(bets, ally, matchKey) {
  const key = String(matchKey || '');
  return (bets || []).map((bet) => {
    if (!bet || bet.settled || bet.ally !== ally || bet.matchKey) return bet;
    return { ...bet, matchKey: key };
  });
}

function stringList(value, limit) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const text = String(item || '').trim().slice(0, 40);
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function emptySave() {
  return sanitiseSave({ coins: START_COINS, cityOn: true });
}

export function sanitiseSave(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const colour = COLOURS.some((item) => item.value === src.colour) ? src.colour : COLOURS[0].value;
  const owned = stringList(src.owned, 24).filter((id) => CATALOG_IDS.has(id));
  const worn = WEAR_IDS.has(src.worn) && owned.includes(src.worn) ? src.worn : '';
  const pictures = stringList(src.pictures, 8).filter((id) => PICTURE_IDS.has(id) && owned.includes(id));
  const furniture = [];
  if (Array.isArray(src.furniture)) {
    for (const item of src.furniture) {
      if (!item || !FURNITURE_IDS.has(item.id) || !owned.includes(item.id)) continue;
      const x = Number(item.x);
      const y = Number(item.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      furniture.push({ id: item.id, x: Math.round(x), y: Math.round(y) });
      if (furniture.length >= 12) break;
    }
  }
  const escrow = [];
  if (Array.isArray(src.escrow)) {
    for (const gift of src.escrow) {
      const amount = purse(gift && gift.amount);
      const id = String(gift && gift.id || '');
      if (!id || amount < 1) continue;
      escrow.push({ id, amount, to: String(gift.to || '').slice(0, 40) });
      if (escrow.length >= 12) break;
    }
  }
  const bets = [];
  if (Array.isArray(src.bets)) {
    for (const bet of src.bets) {
      if (!bet || bet.settled) continue;
      const stake = purse(bet.stake);
      const ally = String(bet.ally || '').trim().slice(0, 40);
      if (!ally || stake < 1) continue;
      bets.push({ ally, stake, matchKey: String(bet.matchKey || '').slice(0, 40), settled: false });
      if (bets.length >= 4) break;
    }
  }
  const x = Number(src.x);
  const y = Number(src.y);
  return {
    coins: src.coins == null ? START_COINS : purse(src.coins),
    wins: whole(src.wins),
    losses: whole(src.losses),
    colour,
    favourites: stringList(src.favourites, 40),
    allies: stringList(src.allies, MAX_ALLIES),
    worn,
    owned,
    pictures,
    furniture,
    cityOn: src.cityOn !== false,
    escrow,
    bets,
    x: Number.isFinite(x) ? Math.round(x) : null,
    y: Number.isFinite(y) ? Math.round(y) : null,
  };
}

export function purchase(save, id) {
  const current = sanitiseSave(save);
  const item = CATALOG.find((row) => row.id === id);
  if (!item) return { ok: false, save: current, reason: 'item' };
  if (current.owned.includes(id)) return { ok: false, save: current, reason: 'owned' };
  const sale = buy(current.coins, item.price);
  if (!sale.ok) return { ok: false, save: current, reason: 'purse' };
  const next = sanitiseSave({
    ...current,
    coins: sale.coins,
    owned: [...current.owned, id],
    worn: item.kind === 'wear' && !current.worn ? id : current.worn,
    pictures: item.kind === 'picture' ? [...current.pictures, id] : current.pictures,
    furniture: item.kind === 'furniture'
      ? [...current.furniture, { id, x: 48 + current.furniture.length * 52, y: 200 }]
      : current.furniture,
  });
  return { ok: true, save: next };
}

export function worldMap() {
  return {
    w: 860,
    h: 340,
    ground: 280,
    left: { x: 0, w: 280 },
    bridge: { x: 280, w: 180 },
    right: { x: 460, w: 400 },
    platforms: [
      { x: 0, y: 148, w: 860, h: 10 },
      { x: 0, y: 214, w: 860, h: 10 },
    ],
    ladders: [
      { x: 36, y: 148, w: 18, h: 132 },
      { x: 560, y: 148, w: 18, h: 132 },
    ],
    walls: [
      { x: 0, y: 0, w: 10, h: 340 },
      { x: 850, y: 0, w: 10, h: 340 },
    ],
  };
}

export function arenaMap() {
  return {
    x: 500,
    y: 78,
    w: 330,
    h: 214,
    start: { x: 524, y: 196 },
    covers: [
      { x: 640, y: 168, w: 36, h: 52 },
      { x: 748, y: 132, w: 30, h: 40 },
    ],
  };
}

export function spawnActor(world = worldMap(), saved = {}) {
  const upper = world.platforms[0];
  const actor = {
    x: 28,
    y: upper.y - 74,
    vx: 0,
    vy: 0,
    w: 56,
    h: 74,
    onGround: true,
    climbing: false,
    facing: 1,
  };
  if (Number.isFinite(saved.x)) actor.x = saved.x;
  if (Number.isFinite(saved.y)) actor.y = saved.y;
  return actor;
}

function bodyOf(actor) {
  return { x: actor.x, y: actor.y, w: actor.w, h: actor.h };
}

export function stepActor(actor, input, world, dt) {
  const seconds = Math.min(0.05, Math.max(0, Number(dt) || 0));
  const prev = {
    x: actor.x, y: actor.y, w: actor.w, h: actor.h, vy: actor.vy || 0,
  };
  const a = {
    x: actor.x,
    y: actor.y,
    vx: 0,
    vy: actor.vy || 0,
    w: actor.w,
    h: actor.h,
    onGround: !!actor.onGround,
    climbing: false,
    facing: actor.facing || 1,
  };
  const keys = input || {};
  const ladder = (world.ladders || []).find((lad) => rectsOverlap(bodyOf(a), lad));
  if (ladder && (keys.climb || keys.up || keys.down)) {
    a.climbing = true;
    a.vy = 0;
    a.onGround = false;
    const downward = !!keys.down && !keys.climb && !keys.up;
    a.y += (downward ? 1 : -1) * CLIMB_SPEED * seconds;
    if (keys.left && !keys.right) {
      a.x -= MOVE_SPEED * seconds;
      a.facing = -1;
    } else if (keys.right && !keys.left) {
      a.x += MOVE_SPEED * seconds;
      a.facing = 1;
    }
    const top = ladder.y - a.h + 10;
    const bottom = ladder.y + ladder.h - a.h;
    if (a.y < top) a.y = top;
    if (a.y > bottom) a.y = bottom;
    if (a.x < 0) a.x = 0;
    if (a.x + a.w > world.w) a.x = world.w - a.w;
    return a;
  }
  if (keys.left && !keys.right) {
    a.vx = -MOVE_SPEED;
    a.facing = -1;
  } else if (keys.right && !keys.left) {
    a.vx = MOVE_SPEED;
    a.facing = 1;
  }
  if (keys.jump && a.onGround) {
    a.vy = JUMP_V;
    a.onGround = false;
  }
  a.vy += GRAVITY * seconds;
  a.x += a.vx * seconds;
  a.y += a.vy * seconds;

  for (const wall of world.walls || []) {
    if (!rectsOverlap(bodyOf(a), wall)) continue;
    if (prev.x + prev.w <= wall.x + 0.5) a.x = wall.x - a.w;
    else if (prev.x >= wall.x + wall.w - 0.5) a.x = wall.x + wall.w;
    a.vx = 0;
  }

  a.onGround = false;
  const feet = a.y + a.h;
  if (a.vy >= 0 && feet >= world.ground) {
    a.y = world.ground - a.h;
    a.vy = 0;
    a.onGround = true;
  }
  if (a.vy >= 0) {
    for (const plat of world.platforms || []) {
      const prevFeet = prev.y + prev.h;
      const over = a.x + a.w > plat.x + 6 && a.x < plat.x + plat.w - 6;
      if (over && prevFeet <= plat.y + 1 && feet >= plat.y) {
        a.y = plat.y - a.h;
        a.vy = 0;
        a.onGround = true;
      }
    }
  }
  if (a.x < 0) a.x = 0;
  if (a.x + a.w > world.w) a.x = world.w - a.w;
  if (a.y < 0) {
    a.y = 0;
    if (a.vy < 0) a.vy = 0;
  }
  return a;
}

export function onBridge(actor, world = worldMap()) {
  const mid = actor.x + actor.w / 2;
  return mid >= world.bridge.x && mid < world.bridge.x + world.bridge.w;
}

export function bridgeProgress(actor, world = worldMap()) {
  const mid = actor.x + actor.w / 2;
  const span = world.bridge.w || 1;
  return Math.min(1, Math.max(0, (mid - world.bridge.x) / span));
}

export function clampArena(actor, fence) {
  const a = { ...actor };
  const minX = fence.x + 8;
  const maxX = fence.x + fence.w - a.w - 8;
  const floor = fence.y + fence.h - 12;
  if (a.x < minX) a.x = minX;
  if (a.x > maxX) a.x = maxX;
  if (a.y < fence.y + 8) {
    a.y = fence.y + 8;
    if (a.vy < 0) a.vy = 0;
  }
  if (a.y + a.h > floor) {
    a.y = floor - a.h;
    a.vy = 0;
    a.onGround = true;
  }
  return a;
}

export function fireGun(gun, from, dir) {
  const spec = GUNS[gun];
  if (!spec || gun === 'beam' || !from) return null;
  const facing = dir < 0 ? -1 : 1;
  return {
    gun,
    x: from.x,
    y: from.y,
    vx: facing * spec.speed,
    vy: 0,
    r: spec.radius,
    life: spec.life,
  };
}

export function stepBullet(bullet, dt) {
  const seconds = Math.max(0, Number(dt) || 0);
  return {
    ...bullet,
    x: bullet.x + bullet.vx * seconds,
    y: bullet.y + bullet.vy * seconds,
    life: bullet.life - seconds,
  };
}

export function beamSegment(origin, dir, length, covers) {
  const facing = dir < 0 ? -1 : 1;
  let end = origin.x + facing * length;
  const y = origin.y;
  for (const cover of covers || []) {
    if (y < cover.y || y > cover.y + cover.h) continue;
    if (facing > 0 && cover.x >= origin.x && cover.x < end) end = cover.x;
    if (facing < 0 && cover.x + cover.w <= origin.x && cover.x + cover.w > end) end = cover.x + cover.w;
  }
  return { x0: origin.x, y, x1: end, y1: y };
}

export function beamHitsBody(segment, body) {
  if (!segment || !body) return false;
  const left = Math.min(segment.x0, segment.x1);
  const right = Math.max(segment.x0, segment.x1);
  return segment.y >= body.y && segment.y <= body.y + body.h && right >= body.x && left <= body.x + body.w;
}

export function resolveBeam(origin, dir, length, covers, body) {
  const segment = beamSegment(origin, dir, length, covers);
  if (!beamHitsBody(segment, body)) return null;
  return segment;
}

export function stepBeam(energy, state, dt) {
  const spec = GUNS.beam;
  const seconds = Math.max(0, Number(dt) || 0);
  let next = Math.max(0, Math.min(1, Number(energy) || 0));
  let locked = !!(state && state.locked);
  const wants = !!(state && state.firing);
  let firing = false;
  if (wants && !locked && next > 0) {
    next = Math.max(0, next - spec.drain * seconds);
    firing = next > 0 || (Number(energy) || 0) > 0;
    if (next <= 0) {
      next = 0;
      locked = true;
      firing = false;
    }
  } else {
    next = Math.min(1, next + spec.recharge * seconds);
    if (locked && next >= 1) {
      next = 1;
      locked = false;
    }
  }
  return { energy: next, locked, firing };
}

export function resolveShots(shots, covers, bodies, dt) {
  const next = [];
  const hits = [];
  for (const shot of shots || []) {
    const moved = stepBullet(shot, dt);
    if (moved.life <= 0) continue;
    const blocked = (covers || []).some((cover) => bulletHitsRect(shot.x, shot.y, moved.x, moved.y, moved.r, cover));
    if (blocked) continue;
    let struck = false;
    for (const body of bodies || []) {
      if (!body || body.id === moved.from || body.invuln > 0) continue;
      if (bulletHitsRect(shot.x, shot.y, moved.x, moved.y, moved.r || 1, body.rect)) {
        hits.push({ id: body.id, shotId: moved.id, from: moved.from });
        struck = true;
        break;
      }
    }
    if (!struck) next.push(moved);
  }
  return { shots: next, hits };
}

export function applyHit(lives) {
  return Math.max(0, whole(lives) - 1);
}

export function respawn(start) {
  return { x: start.x, y: start.y, vx: 0, vy: 0, onGround: true };
}

export function walkingIntent(held) {
  const keys = held || {};
  return {
    left: !!keys.a,
    right: !!keys.d,
    up: !!keys.w,
    down: !!keys.s,
    jump: !!keys.space,
    climb: !!keys.shift,
  };
}

export function tabSwitchesWalking({ inRoom, field } = {}) {
  if (!inRoom) return false;
  if (!field) return true;
  if (field.door) return false;
  if (field.settings && field.text) return false;
  if (field.text && field.id !== 'text') return false;
  return true;
}

export function withinReach(a, b, reach = EMOTE_REACH) {
  if (!a || !b) return false;
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.hypot(ax - bx, ay - by) <= reach;
}

// Coin, ranking, bet, hit, walking, skill and friendship rules for The Colosseum of Friendship.
// No chat, no room word, and nothing that has to be saved on the host.

import {
  ARENA,
  HOME_PATCHES,
  SOLID_TILES,
  TILE,
  getMap,
  homeMap,
  tileAt,
  worldMap,
} from './colosseum-world.mjs';

export { ARENA, HOME_PATCHES, TILE, getMap, homeMap, worldMap };

export const START_COINS = 20;
export const WIN_PAY = 8;
export const LOSS_COST = 3;
export const CLICK_TO_WIN = 6;
export const GAME_MS = 10000;
export const MAX_ALLIES = 2;
export const TYPING_PHRASE = 'bright room';
export const CLICK_BOUNDS = { w: 320, h: 160, r: 16 };
export const MOVE_SPEED = 74;
export const EMOTE_REACH = 30;
export const PLAYER_HP = 5;
export const PLANET_FARE = 60;
export const GORE_LEVELS = ['None', 'A little', 'Some', 'Messy'];

export const LOOKS = [
  { id: 'suit', name: 'Space suit' },
  { id: 'visor', name: 'Visor cat' },
  { id: 'jet', name: 'Jetpack cat' },
  { id: 'alien', name: 'Alien cat' },
];

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
  { id: 'launcher', kind: 'weapon', name: 'Launcher', price: 14 },
  { id: 'beam', kind: 'weapon', name: 'Beam', price: 18 },
  { id: 'fireball', kind: 'weapon', name: 'Fireball', price: 16 },
  { id: 'saber', kind: 'weapon', name: 'Lightsaber', price: 22 },
  { id: 'ring', kind: 'gift', name: 'Star ring', price: 30 },
];

// trigger: hold keeps firing while the button is down; tap fires once per click.
export const WEAPONS = {
  rifle: { name: 'Rifle', trigger: 'hold', speed: 300, radius: 2, cooldown: 0.16, life: 0.9, damage: 1, spread: 0.1 },
  launcher: { name: 'Launcher', trigger: 'tap', speed: 130, radius: 5, cooldown: 0.75, life: 1.4, damage: 3, spread: 0.05, splash: 26 },
  beam: { name: 'Beam', trigger: 'hold', length: 120, drain: 0.55, recharge: 0.28, dps: 4 },
  fireball: { name: 'Fireball', trigger: 'tap', speed: 170, radius: 4, cooldown: 0.5, life: 1.1, damage: 2, spread: 0.06, burn: true },
  saber: { name: 'Lightsaber', trigger: 'tap', length: 22, cooldown: 0.28, damage: 2, arc: 1.1 },
};
export const WEAPON_IDS = Object.keys(WEAPONS);
export const GUNS = WEAPONS;

export const PART_PRICE = 4;
export const MARKET_PAY = 8;
export const ERRAND_PAY = 12;
export const DRINK_PRICE = 3;
export const CAT_COINS = 2;
export const WORK_SECONDS = 8;

export const PARTS = [
  { id: 'dust', name: 'Moon dust' },
  { id: 'reel', name: 'Film reel' },
  { id: 'syrup', name: 'Syrup' },
];

export const GOODS = [
  { id: 'rock', name: 'Moon rock' },
  { id: 'video', name: 'Cat video' },
  { id: 'snack', name: 'Vat snack' },
];

export const WORKS = [
  { id: 'mine', name: 'Moon mine', patch: 2, part: 'dust', good: 'rock' },
  { id: 'studio', name: 'Cat-video studio', patch: 3, part: 'reel', good: 'video' },
  { id: 'vat', name: 'Snack vat', patch: 4, part: 'syrup', good: 'snack' },
];

export const TAVERN = { id: 'tavern', x: 64, w: 56 };
export const MARKET = { id: 'market', x: 540, w: 64 };

const BAG_IDS = new Set([...PARTS, ...GOODS].map((item) => item.id));
const PART_IDS = new Set(PARTS.map((item) => item.id));
const GOOD_IDS = new Set(GOODS.map((item) => item.id));

const CATALOG_IDS = new Set(CATALOG.map((item) => item.id));
const WEAPON_SET = new Set(WEAPON_IDS);
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
export function unlockedSpan(patches) {
  const count = Math.min(HOME_PATCHES.length, Math.max(1, whole(patches) || 1));
  const open = HOME_PATCHES.slice(0, count);
  const x = open[0].x;
  const end = open[open.length - 1].x + open[open.length - 1].wpx;
  return { x, w: end - x, count };
}

export function nextPatchCost(patches) {
  const count = Math.min(HOME_PATCHES.length, Math.max(1, whole(patches) || 1));
  const next = HOME_PATCHES[count];
  return next ? next.cost : 0;
}

export function homeWorld(patches = 1) {
  return homeMap(patches);
}

const FURNITURE_Y = 6 * TILE + 12;

function placedFurniture(save, id) {
  const span = unlockedSpan(save.patches);
  const x = span.x + 40 + save.furniture.length * 22;
  if (x > span.x + span.w - 12) return save.furniture;
  return [...save.furniture, { id, x, y: FURNITURE_Y }];
}

export function placeFurniture(save, id, x) {
  const current = sanitiseSave(save);
  const item = CATALOG.find((row) => row.id === id);
  if (!item || item.kind !== 'furniture' || !current.owned.includes(id)) {
    return { ok: false, save: current, reason: 'owned' };
  }
  const span = unlockedSpan(current.patches);
  const spot = Math.round(Number(x));
  if (!Number.isFinite(spot) || spot < span.x + 8 || spot > span.x + span.w - 8) {
    return { ok: false, save: current, reason: 'locked' };
  }
  const furniture = current.furniture.filter((piece) => piece.id !== id);
  furniture.push({ id, x: spot, y: FURNITURE_Y });
  return { ok: true, save: sanitiseSave({ ...current, furniture }) };
}

export function unlockPatch(save) {
  const current = sanitiseSave(save);
  const cost = nextPatchCost(current.patches);
  if (!cost) return { ok: false, save: current, reason: 'done' };
  const sale = buy(current.coins, cost);
  if (!sale.ok) return { ok: false, save: current, reason: 'purse' };
  return { ok: true, save: sanitiseSave({ ...current, coins: sale.coins, patches: current.patches + 1 }) };
}

export function toggleInvite(invites, name) {
  const clean = String(name || '').trim();
  const list = stringList(invites, 8).filter((item) => item !== clean);
  if (!clean || stringList(invites, 8).includes(clean)) return list;
  return stringList([...list, clean], 8);
}

export function mayEnter(invites, name) {
  return stringList(invites, 8).includes(String(name || '').trim());
}

export function emptySave() {
  return sanitiseSave({ coins: START_COINS });
}

const MAP_IDS = new Set(['town', 'tavern', 'market', 'mallow', 'observatory', 'cinema', 'planet2']);
const FRIEND_ID = /^[a-z0-9-]{1,20}$/;

function readFriends(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  let n = 0;
  for (const [id, row] of Object.entries(raw)) {
    if (!FRIEND_ID.test(id) || !row || typeof row !== 'object') continue;
    const married = row.married === true;
    const romance = married || row.romance === true;
    const cap = married ? 100 : romance ? 99 : ROMANCE_CAP;
    const talkAt = Number(row.talkAt);
    out[id] = {
      pts: Math.min(cap, whole(row.pts)),
      romance,
      married,
      talkAt: Number.isFinite(talkAt) && talkAt > 0 ? Math.floor(talkAt) : 0,
    };
    n += 1;
    if (n >= 12) break;
  }
  return out;
}

function readPlace(raw) {
  if (!raw || typeof raw !== 'object' || !MAP_IDS.has(raw.map)) return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { map: raw.map, x: Math.round(x), y: Math.round(y) };
}

export function sanitiseSave(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const colour = COLOURS.some((item) => item.value === src.colour) ? src.colour : COLOURS[0].value;
  const owned = stringList(src.owned, 32).filter((id) => CATALOG_IDS.has(id));
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
  const weapons = ['rifle', ...owned.filter((id) => WEAPON_SET.has(id))];
  const bag = readBag(src.bag);
  const skills = [];
  for (const id of stringList(src.skills, SKILLS.length)) {
    const node = SKILLS.find((row) => row.id === id);
    if (node && (!node.needs || skills.includes(node.needs))) skills.push(id);
  }
  const clues = [];
  const found = stringList(src.clues, CLUES.length);
  for (const clue of CLUES) {
    if (!found.includes(clue.id)) break;
    clues.push(clue.id);
  }
  const gore = Math.min(GORE_LEVELS.length - 1, whole(src.gore));
  return {
    coins: src.coins == null ? START_COINS : purse(src.coins),
    wins: whole(src.wins),
    losses: whole(src.losses),
    colour,
    look: LOOKS.some((item) => item.id === src.look) ? src.look : LOOKS[0].id,
    favourites: stringList(src.favourites, 40),
    allies: stringList(src.allies, MAX_ALLIES),
    worn,
    owned,
    pictures,
    furniture,
    patches: Math.min(HOME_PATCHES.length, Math.max(1, whole(src.patches) || 1)),
    invites: stringList(src.invites, 8),
    bag,
    works: readWorks(src.works),
    offers: readOffers(src.offers),
    errand: GOOD_IDS.has(src.errand) ? src.errand : '',
    weapons,
    bar: readBar(src.bar, weapons),
    skills,
    friends: readFriends(src.friends),
    clues,
    gore,
    planet: src.planet === true,
    place: readPlace(src.place),
    escrow,
    bets,
  };
}

export function purchase(save, id) {
  const current = sanitiseSave(save);
  const item = CATALOG.find((row) => row.id === id);
  if (!item) return { ok: false, save: current, reason: 'item' };
  if (current.owned.includes(id)) return { ok: false, save: current, reason: 'owned' };
  const sale = buy(current.coins, item.price);
  if (!sale.ok) return { ok: false, save: current, reason: 'purse' };
  let bar = current.bar;
  if (item.kind === 'weapon' && !bar.includes(id)) {
    const free = bar.indexOf('');
    if (free >= 0) bar = bar.map((slot, i) => (i === free ? id : slot));
  }
  const next = sanitiseSave({
    ...current,
    coins: sale.coins,
    owned: [...current.owned, id],
    bar,
    worn: item.kind === 'wear' && !current.worn ? id : current.worn,
    pictures: item.kind === 'picture' ? [...current.pictures, id] : current.pictures,
    furniture: item.kind === 'furniture' ? placedFurniture(current, id) : current.furniture,
  });
  return { ok: true, save: next };
}

function blankBag() {
  const bag = {};
  for (const id of BAG_IDS) bag[id] = 0;
  return bag;
}

function readBag(raw) {
  const bag = blankBag();
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const id of BAG_IDS) bag[id] = Math.min(24, whole(src[id]));
  return bag;
}

function blankWorks() {
  const works = {};
  for (const spec of WORKS) works[spec.id] = { progress: 0, loaded: false };
  return works;
}

function readProgress(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(WORK_SECONDS, n);
}

function readWorks(raw) {
  const works = blankWorks();
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const spec of WORKS) {
    const row = src[spec.id] && typeof src[spec.id] === 'object' ? src[spec.id] : {};
    works[spec.id] = { progress: readProgress(row.progress), loaded: row.loaded === true };
  }
  return works;
}

function readOffers(raw) {
  if (!Array.isArray(raw)) return [];
  const offers = [];
  for (const offer of raw) {
    const item = String(offer && offer.item || '');
    const count = Math.min(8, whole(offer && offer.count));
    const id = String(offer && offer.id || '').slice(0, 40);
    const to = String(offer && offer.to || '').trim().slice(0, 40);
    if (!BAG_IDS.has(item) || count < 1 || !id || !to) continue;
    offers.push({ id, item, count, to });
    if (offers.length >= 8) break;
  }
  return offers;
}

export function giveItem(save, item, count = 1) {
  const current = sanitiseSave(save);
  const n = whole(count);
  if (!BAG_IDS.has(item) || n < 1) return { ok: false, save: current, reason: 'item' };
  const bag = { ...current.bag, [item]: Math.min(24, current.bag[item] + n) };
  return { ok: true, save: sanitiseSave({ ...current, bag }) };
}

export function offerTrade(save, item, count, to, id) {
  const current = sanitiseSave(save);
  const n = Math.min(8, whole(count));
  const cleanTo = String(to || '').trim().slice(0, 40);
  const offerId = String(id || '').slice(0, 40);
  if (!BAG_IDS.has(item) || n < 1 || !cleanTo || !offerId) {
    return { ok: false, save: current, reason: 'item' };
  }
  if (current.bag[item] < n) return { ok: false, save: current, reason: 'bag' };
  const bag = { ...current.bag, [item]: current.bag[item] - n };
  const offers = [...current.offers, { id: offerId, item, count: n, to: cleanTo }];
  return { ok: true, save: sanitiseSave({ ...current, bag, offers }) };
}

export function acceptTrade(save, item, count) {
  return giveItem(save, item, count);
}

export function dropOffer(save, id) {
  const current = sanitiseSave(save);
  return sanitiseSave({ ...current, offers: current.offers.filter((offer) => offer.id !== id) });
}

export function declineTrade(save, id) {
  const current = sanitiseSave(save);
  const offer = current.offers.find((item) => item.id === id);
  if (!offer) return { ok: false, save: current, reason: 'offer' };
  const back = giveItem(current, offer.item, offer.count);
  return {
    ok: true,
    save: sanitiseSave({ ...back.save, offers: current.offers.filter((item) => item.id !== id) }),
  };
}

export function releaseOffers(save) {
  let current = sanitiseSave(save);
  for (const offer of [...current.offers]) current = giveItem(current, offer.item, offer.count).save;
  return sanitiseSave({ ...current, offers: [] });
}

export function buyPart(save, item) {
  const current = sanitiseSave(save);
  if (!PART_IDS.has(item)) return { ok: false, save: current, reason: 'item' };
  const sale = buy(current.coins, PART_PRICE);
  if (!sale.ok) return { ok: false, save: current, reason: 'purse' };
  return giveItem({ ...current, coins: sale.coins }, item, 1);
}

export function sellGood(save, item) {
  const current = sanitiseSave(save);
  if (!GOOD_IDS.has(item)) return { ok: false, save: current, reason: 'good' };
  if (current.bag[item] < 1) return { ok: false, save: current, reason: 'bag' };
  const bag = { ...current.bag, [item]: current.bag[item] - 1 };
  return { ok: true, save: sanitiseSave({ ...current, bag, coins: current.coins + MARKET_PAY }), paid: MARKET_PAY };
}

export function buyDrink(save) {
  const current = sanitiseSave(save);
  const sale = buy(current.coins, DRINK_PRICE);
  if (!sale.ok) return { ok: false, save: current, reason: 'purse' };
  return { ok: true, save: sanitiseSave({ ...current, coins: sale.coins }) };
}

export function pinErrand(save, goodId) {
  const current = sanitiseSave(save);
  if (current.errand) return { ok: true, save: current };
  const good = GOOD_IDS.has(goodId) ? goodId : GOODS[0].id;
  return { ok: true, save: sanitiseSave({ ...current, errand: good }) };
}

export function turnInErrand(save) {
  const current = sanitiseSave(save);
  if (!current.errand) return { ok: false, save: current, reason: 'none' };
  if (current.bag[current.errand] < 1) return { ok: false, save: current, reason: 'bag' };
  const bag = { ...current.bag, [current.errand]: current.bag[current.errand] - 1 };
  return {
    ok: true,
    save: sanitiseSave({ ...current, bag, coins: current.coins + ERRAND_PAY, errand: '' }),
    paid: ERRAND_PAY,
  };
}

export function tickWorks(save, dt, { open = true, stats = BASE_STATS } = {}) {
  const current = sanitiseSave(save);
  if (!open || !(Number(dt) > 0)) return current;
  const bag = { ...current.bag };
  const works = { ...current.works };
  for (const spec of WORKS) {
    const state = { ...works[spec.id] };
    if (current.patches < spec.patch) {
      works[spec.id] = state;
      continue;
    }
    if (!state.loaded) {
      if (bag[spec.part] < 1) {
        works[spec.id] = state;
        continue;
      }
      bag[spec.part] -= 1;
      state.loaded = true;
      state.progress = 0;
    }
    const rate = spec.id === 'mine' ? stats.mineRate : stats.factoryRate;
    state.progress = Math.min(WORK_SECONDS, state.progress + Number(dt) * (Number(rate) > 0 ? rate : 1));
    if (state.progress >= WORK_SECONDS) {
      bag[spec.good] = Math.min(24, bag[spec.good] + 1);
      state.loaded = false;
      state.progress = 0;
    }
    works[spec.id] = state;
  }
  return sanitiseSave({ ...current, bag, works });
}

// ---- Walking on the map -------------------------------------------------

export function distance(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function besidePlace(actor, spot, reach = 24) {
  if (!actor || !spot) return false;
  return distance(actor, spot) <= (spot.reach || reach);
}

export function withinReach(a, b, reach = EMOTE_REACH) {
  return distance(a, b) <= reach;
}

export function bodyRect(actor) {
  return { x: actor.x - 5, y: actor.y - 5, w: 10, h: 6 };
}

export function blocked(map, box, extra = []) {
  const c0 = Math.floor(box.x / TILE);
  const c1 = Math.floor((box.x + box.w - 0.01) / TILE);
  const r0 = Math.floor(box.y / TILE);
  const r1 = Math.floor((box.y + box.h - 0.01) / TILE);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (SOLID_TILES.has(tileAt(map, c * TILE + 1, r * TILE + 1))) return true;
    }
  }
  for (const solid of map.solids || []) if (rectsOverlap(box, solid)) return true;
  for (const solid of extra) if (solid && rectsOverlap(box, solid)) return true;
  return false;
}

export function walkingIntent(held) {
  const keys = held || {};
  return {
    left: !!(keys.a || keys.left),
    right: !!(keys.d || keys.right),
    up: !!(keys.w || keys.up),
    down: !!(keys.s || keys.down),
  };
}

export function spawnActor(map = worldMap(), saved = null) {
  const at = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : map.spawn;
  return { x: at.x, y: at.y, facing: 'down', moving: false, step: 0 };
}

export function stepActor(actor, input, map, dt, { speed = MOVE_SPEED, extra = [] } = {}) {
  const seconds = Math.min(0.05, Math.max(0, Number(dt) || 0));
  const keys = input || {};
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const a = { ...actor, moving: false };
  if (!dx && !dy) return a;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  if (Math.abs(dx) > Math.abs(dy)) a.facing = dx > 0 ? 'right' : 'left';
  else a.facing = dy > 0 ? 'down' : 'up';
  const stepX = dx * speed * seconds;
  const stepY = dy * speed * seconds;
  const tryX = { ...a, x: a.x + stepX };
  if (!blocked(map, bodyRect(tryX), extra)) a.x = tryX.x;
  const tryY = { ...a, y: a.y + stepY };
  if (!blocked(map, bodyRect(tryY), extra)) a.y = tryY.y;
  a.moving = a.x !== actor.x || a.y !== actor.y;
  if (a.moving) a.step = (actor.step || 0) + seconds;
  return a;
}

export function doorAt(map, actor, input = {}) {
  for (const door of map.doors || []) {
    const inside = actor.x >= door.x && actor.x <= door.x + door.w && actor.y >= door.y && actor.y <= door.y + door.h;
    if (!inside) continue;
    if (door.enter === 'up' && !input.up) continue;
    if (door.enter === 'down' && !input.down) continue;
    return door;
  }
  return null;
}

export function nearestSpot(spots, actor, reach = 24) {
  let best = null;
  let bestD = Infinity;
  for (const spot of spots || []) {
    const d = distance(actor, spot);
    if (d <= (spot.reach || reach) && d < bestD) {
      best = spot;
      bestD = d;
    }
  }
  return best;
}

export function clampArena(actor, arena = ARENA) {
  const inner = arena.inner;
  return {
    ...actor,
    x: Math.min(inner.x + inner.w - 6, Math.max(inner.x + 6, actor.x)),
    y: Math.min(inner.y + inner.h - 2, Math.max(inner.y + 8, actor.y)),
  };
}

export function respawn(start) {
  return { x: start.x, y: start.y, facing: 'down', moving: false };
}

export function inArena(actor, arena = ARENA) {
  const r = arena.inner;
  return actor.x >= r.x && actor.x <= r.x + r.w && actor.y >= r.y && actor.y <= r.y + r.h;
}

// ---- Tab: chat or world -------------------------------------------------

export function tabTarget({ inRoom, mode, field } = {}) {
  if (!inRoom) return null;
  if (field && field.door) return null;
  if (field && field.text && !field.chat) return null;
  return mode === 'world' ? 'chat' : 'world';
}

// ---- Weapons ------------------------------------------------------------

export function aimAngle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function weaponCooldown(id, fireRate = 1) {
  const spec = WEAPONS[id];
  if (!spec || !spec.cooldown) return 0;
  return spec.cooldown / (Number(fireRate) > 0 ? fireRate : 1);
}

export function fireWeapon(id, from, angle, { aim = 1, rng = Math.random } = {}) {
  const spec = WEAPONS[id];
  if (!spec || !spec.speed || !from) return null;
  const jitter = (rng() * 2 - 1) * (spec.spread || 0) * aim;
  const a = Number(angle) + jitter;
  return {
    gun: id,
    x: from.x,
    y: from.y,
    vx: Math.cos(a) * spec.speed,
    vy: Math.sin(a) * spec.speed,
    r: spec.radius,
    life: spec.life,
    damage: spec.damage,
    splash: spec.splash || 0,
  };
}

// The old side-on call: fireGun('rifle', from, 1) shoots right, -1 shoots left.
export function fireGun(gun, from, dir) {
  return fireWeapon(gun, from, dir < 0 ? Math.PI : 0, { rng: () => 0.5 });
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

function wallBetween(map, x0, y0, x1, y1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const ch = tileAt(map, x, y);
    if (ch === '#' || ch === '^' || ch === ' ' || ch === 'k' || ch === 'f') return { x, y };
  }
  return null;
}

// Moves shots, stops them on walls and cover, and reports where each stopped.
export function stepShots(shots, map, dt, covers = []) {
  const next = [];
  const impacts = [];
  for (const shot of shots || []) {
    const moved = stepBullet(shot, dt);
    if (moved.life <= 0) {
      if (moved.splash) impacts.push({ x: moved.x, y: moved.y, shot: moved });
      continue;
    }
    const wall = map ? wallBetween(map, shot.x, shot.y, moved.x, moved.y) : null;
    const cover = covers.find((c) => bulletHitsRect(shot.x, shot.y, moved.x, moved.y, moved.r || 1, c));
    if (wall || cover) {
      impacts.push({ x: wall ? wall.x : moved.x, y: wall ? wall.y : moved.y, shot: moved });
      continue;
    }
    next.push(moved);
  }
  return { shots: next, impacts };
}

export function rayBlocked(map, x, y, rects) {
  if (map) {
    const ch = tileAt(map, x, y);
    if (ch === '#' || ch === '^' || ch === ' ' || ch === 'k' || ch === 'f') return true;
  }
  return (rects || []).some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

export function beamRay(origin, angle, length, rects = [], map = null) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let reach = length;
  for (let d = 0; d <= length; d += 1) {
    if (rayBlocked(map, origin.x + dx * d, origin.y + dy * d, rects)) {
      reach = d;
      break;
    }
  }
  return { x0: origin.x, y0: origin.y, x1: origin.x + dx * reach, y1: origin.y + dy * reach };
}

export function segmentHitsRect(seg, rect, r = 0) {
  if (!seg || !rect) return false;
  return bulletHitsRect(seg.x0, seg.y0, seg.x1, seg.y1, Math.max(1, r), rect);
}

export function resolveBeam(origin, angle, length, covers, body, map = null) {
  const seg = beamRay(origin, angle, length, covers, map);
  return segmentHitsRect(seg, body, 1) ? seg : null;
}

export function stepBeam(energy, state, dt) {
  const spec = WEAPONS.beam;
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

export function saberSegment(origin, angle, length = WEAPONS.saber.length) {
  return {
    x0: origin.x + Math.cos(angle) * 4,
    y0: origin.y + Math.sin(angle) * 4,
    x1: origin.x + Math.cos(angle) * (length + 4),
    y1: origin.y + Math.sin(angle) * (length + 4),
  };
}

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function pointSegDist(px, py, s) {
  const vx = s.x1 - s.x0;
  const vy = s.y1 - s.y0;
  const len = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((px - s.x0) * vx + (py - s.y0) * vy) / len));
  return Math.hypot(px - (s.x0 + vx * t), py - (s.y0 + vy * t));
}

export function segmentsCross(a, b, tolerance = 0) {
  const rx = a.x1 - a.x0;
  const ry = a.y1 - a.y0;
  const sx = b.x1 - b.x0;
  const sy = b.y1 - b.y0;
  const denom = cross(rx, ry, sx, sy);
  if (denom !== 0) {
    const t = cross(b.x0 - a.x0, b.y0 - a.y0, sx, sy) / denom;
    const u = cross(b.x0 - a.x0, b.y0 - a.y0, rx, ry) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  if (!tolerance) return false;
  return Math.min(
    pointSegDist(a.x0, a.y0, b), pointSegDist(a.x1, a.y1, b),
    pointSegDist(b.x0, b.y0, a), pointSegDist(b.x1, b.y1, a),
  ) <= tolerance;
}

// A blade only stops a shot whose path crosses the blade itself.
export function saberBlocks(origin, angle, prev, next, { length = WEAPONS.saber.length, tolerance = 2 } = {}) {
  const blade = saberSegment(origin, angle, length);
  const path = { x0: prev.x, y0: prev.y, x1: next.x, y1: next.y };
  return segmentsCross(blade, path, tolerance + (next.r || 0));
}

export function angleGap(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function saberStrikes(origin, angle, target, spec = WEAPONS.saber) {
  const d = distance(origin, target);
  if (d > spec.length + 10) return false;
  return angleGap(aimAngle(origin, target), angle) <= spec.arc / 2 + (d < 8 ? Math.PI : 0);
}

export function splashHits(at, radius, bodies) {
  return (bodies || []).filter((b) => distance(at, b) <= radius);
}

export function resolveShots(shots, covers, bodies, dt) {
  const next = [];
  const hits = [];
  for (const shot of shots || []) {
    const moved = stepBullet(shot, dt);
    if (moved.life <= 0) continue;
    const isBlocked = (covers || []).some((cover) => bulletHitsRect(shot.x, shot.y, moved.x, moved.y, moved.r, cover));
    if (isBlocked) continue;
    let struck = false;
    for (const body of bodies || []) {
      if (!body || body.id === moved.from || body.invuln > 0) continue;
      if (bulletHitsRect(shot.x, shot.y, moved.x, moved.y, moved.r || 1, body.rect)) {
        hits.push({ id: body.id, shotId: moved.id, from: moved.from, damage: moved.damage || 1 });
        struck = true;
        break;
      }
    }
    if (!struck) next.push(moved);
  }
  return { shots: next, hits };
}

export function applyHit(lives, damage = 1) {
  return Math.max(0, whole(lives) - Math.max(1, whole(damage) || 1));
}

export function hitBox(actor) {
  return { x: actor.x - 6, y: actor.y - 14, w: 12, h: 14 };
}

// ---- Alien cats on the street -------------------------------------------

export const ALIENS = {
  grunt: { hp: 2, speed: 34, cool: 1.7, shot: 105 },
  brute: { hp: 5, speed: 24, cool: 2.3, shot: 90 },
};

export function rollAlien({ walking, indoors, count = 0, roll, street, player, max = 3 } = {}) {
  if (!walking || indoors || !street || count >= max) return null;
  const n = Number(roll);
  if (!Number.isFinite(n) || n >= 0.35) return null;
  const kind = n < 0.05 ? 'brute' : 'grunt';
  const left = n < 0.175;
  const px = player ? player.x : street.x + street.w / 2;
  const x = Math.min(street.x + street.w - 12, Math.max(street.x + 12, px + (left ? -150 : 150)));
  const y = street.y + 12 + ((n * 997) % 1) * (street.h - 24);
  return { kind, x, y, hp: ALIENS[kind].hp, cool: ALIENS[kind].cool, facing: left ? 'right' : 'left', moving: false, side: left ? 'left' : 'right' };
}

export function stepAlien(alien, player, map, dt, rng = Math.random) {
  const spec = ALIENS[alien.kind] || ALIENS.grunt;
  const a = { ...alien, cool: alien.cool - dt };
  const d = distance(a, player);
  let shot = null;
  if (d < 190) {
    const toward = d > 70;
    const away = d < 44;
    const input = {
      right: (toward && player.x > a.x + 4) || (away && player.x < a.x),
      left: (toward && player.x < a.x - 4) || (away && player.x > a.x),
      down: (toward && player.y > a.y + 4) || (away && player.y < a.y),
      up: (toward && player.y < a.y - 4) || (away && player.y > a.y),
    };
    const street = map.street;
    const moved = stepActor(a, input, map, dt, { speed: spec.speed });
    if (!street || (moved.x > street.x && moved.x < street.x + street.w && moved.y > street.y && moved.y < street.y + street.h)) {
      Object.assign(a, { x: moved.x, y: moved.y, facing: moved.facing, moving: moved.moving, step: moved.step });
    }
    if (a.cool <= 0 && d < 160) {
      a.cool = spec.cool + rng() * 0.6;
      const ang = aimAngle({ x: a.x, y: a.y - 6 }, { x: player.x, y: player.y - 6 }) + (rng() * 2 - 1) * 0.12;
      shot = { gun: 'goo', from: 'alien', x: a.x, y: a.y - 6, vx: Math.cos(ang) * spec.shot, vy: Math.sin(ang) * spec.shot, r: 3, life: 2, damage: 1 };
    }
  }
  return { alien: a, shot };
}

export function catLoot(roll) {
  const n = Number(roll);
  let part = '';
  if (n < 0.15) part = 'dust';
  else if (n < 0.3) part = 'reel';
  else if (n < 0.45) part = 'syrup';
  return { coins: CAT_COINS, part };
}

export function applyCatLoot(save, loot) {
  const current = sanitiseSave(save);
  const coins = current.coins + purse(loot && loot.coins);
  const next = sanitiseSave({ ...current, coins });
  if (loot && loot.part) return giveItem(next, loot.part, 1).save;
  return next;
}

export function catStruck(cat, shots) {
  if (!cat) return { hit: false, shots: shots || [], damage: 0 };
  const body = hitBox(cat);
  const left = [];
  let hit = false;
  let damage = 0;
  for (const shot of shots || []) {
    if (!hit && circleHitsRect(shot.x, shot.y, shot.r || 3, body)) {
      hit = true;
      damage = shot.damage || 1;
    } else left.push(shot);
  }
  return { hit, shots: left, damage };
}

// ---- Gore ---------------------------------------------------------------

export function goreBits(level) {
  return [0, 6, 14, 28][Math.min(3, whole(level))] || 0;
}

// ---- Skill tree: every node moves a real number ------------------------

export const BASE_STATS = {
  moveSpeed: 1,
  mineRate: 1,
  factoryRate: 1,
  aim: 1,
  fireRate: 1,
  blockWindow: 0.3,
  friendGain: 1,
};

export const SKILLS = [
  { id: 'stride', branch: 'Explorer', name: 'Long stride', stat: 'moveSpeed', add: 0.12, cost: 10, needs: '' },
  { id: 'stride2', branch: 'Explorer', name: 'Moon bounce', stat: 'moveSpeed', add: 0.12, cost: 18, needs: 'stride' },
  { id: 'charm', branch: 'Explorer', name: 'Warm purr', stat: 'friendGain', add: 0.25, cost: 12, needs: 'stride' },
  { id: 'charm2', branch: 'Explorer', name: 'Good listener', stat: 'friendGain', add: 0.25, cost: 20, needs: 'charm' },
  { id: 'drill', branch: 'Maker', name: 'Sharp drill', stat: 'mineRate', add: 0.25, cost: 12, needs: '' },
  { id: 'drill2', branch: 'Maker', name: 'Deep seam', stat: 'mineRate', add: 0.25, cost: 20, needs: 'drill' },
  { id: 'line', branch: 'Maker', name: 'Tidy line', stat: 'factoryRate', add: 0.25, cost: 12, needs: 'drill' },
  { id: 'line2', branch: 'Maker', name: 'Night shift', stat: 'factoryRate', add: 0.25, cost: 20, needs: 'line' },
  { id: 'steady', branch: 'Fighter', name: 'Steady paw', stat: 'aim', add: -0.3, cost: 10, needs: '' },
  { id: 'steady2', branch: 'Fighter', name: 'Whisker sight', stat: 'aim', add: -0.3, cost: 18, needs: 'steady' },
  { id: 'trigger', branch: 'Fighter', name: 'Quick trigger', stat: 'fireRate', add: 0.2, cost: 14, needs: 'steady' },
  { id: 'parry', branch: 'Fighter', name: 'Parry', stat: 'blockWindow', add: 0.12, cost: 14, needs: 'steady' },
  { id: 'parry2', branch: 'Fighter', name: 'Mirror blade', stat: 'blockWindow', add: 0.12, cost: 22, needs: 'parry' },
];

export function skillStats(skills) {
  const stats = { ...BASE_STATS };
  for (const id of skills || []) {
    const node = SKILLS.find((row) => row.id === id);
    if (node) stats[node.stat] += node.add;
  }
  stats.aim = Math.max(0.2, Math.round(stats.aim * 100) / 100);
  for (const key of Object.keys(stats)) stats[key] = Math.round(stats[key] * 1000) / 1000;
  return stats;
}

export function skillLabel(node) {
  if (node.stat === 'aim') return `${Math.round(-node.add * 100)}% less spread`;
  if (node.stat === 'blockWindow') return `+${node.add.toFixed(2)}s block window`;
  const words = { moveSpeed: 'walk speed', mineRate: 'mine rate', factoryRate: 'studio and vat rate', fireRate: 'fire rate', friendGain: 'friendship gain' };
  return `+${Math.round(node.add * 100)}% ${words[node.stat]}`;
}

export function buySkill(save, id) {
  const current = sanitiseSave(save);
  const node = SKILLS.find((row) => row.id === id);
  if (!node) return { ok: false, save: current, reason: 'node' };
  if (current.skills.includes(id)) return { ok: false, save: current, reason: 'owned' };
  if (node.needs && !current.skills.includes(node.needs)) return { ok: false, save: current, reason: 'needs' };
  const sale = buy(current.coins, node.cost);
  if (!sale.ok) return { ok: false, save: current, reason: 'purse' };
  return { ok: true, save: sanitiseSave({ ...current, coins: sale.coins, skills: [...current.skills, id] }) };
}

// ---- Friendship, then romance, then marriage ---------------------------

export const FRIEND_STAGES = [
  { id: 'stranger', name: 'Stranger', at: 0 },
  { id: 'acquaintance', name: 'Acquaintance', at: 10 },
  { id: 'friend', name: 'Friend', at: 25 },
  { id: 'close', name: 'Close friend', at: 45 },
  { id: 'sweetheart', name: 'Sweetheart', at: 70 },
  { id: 'married', name: 'Married', at: 100 },
];
export const TALK_GAIN = 3;
export const TALK_COOLDOWN = 45000;
export const ROMANCE_AT = 55;
export const PROPOSE_AT = 90;
const ROMANCE_CAP = 69;

export function friendRecord(save, id) {
  const rec = save && save.friends && save.friends[id];
  return rec ? { ...rec } : { pts: 0, romance: false, married: false, talkAt: 0 };
}

export function friendStage(rec) {
  if (!rec) return 0;
  if (rec.married) return 5;
  if (rec.romance && rec.pts >= FRIEND_STAGES[4].at) return 4;
  let stage = 0;
  for (let i = 0; i <= 3; i += 1) if (rec.pts >= FRIEND_STAGES[i].at) stage = i;
  return stage;
}

export function gainFriendship(rec, amount, gain = 1) {
  const cap = rec.married ? 100 : rec.romance ? 99 : ROMANCE_CAP;
  const add = Math.max(0, Math.round(Number(amount) * (Number(gain) > 0 ? gain : 1)));
  return { ...rec, pts: Math.min(cap, rec.pts + add) };
}

function withFriend(save, id, rec) {
  return sanitiseSave({ ...save, friends: { ...save.friends, [id]: rec } });
}

export function talkTo(save, id, now, stats = BASE_STATS) {
  const current = sanitiseSave(save);
  const rec = friendRecord(current, id);
  if (now - rec.talkAt < TALK_COOLDOWN) return { ok: true, save: current, gained: 0 };
  const next = gainFriendship({ ...rec, talkAt: now }, TALK_GAIN, stats.friendGain);
  return { ok: true, save: withFriend(current, id, next), gained: next.pts - rec.pts };
}

export function giftTo(save, id, item, prefs = {}, stats = BASE_STATS) {
  const current = sanitiseSave(save);
  if (!BAG_IDS.has(item) || current.bag[item] < 1) return { ok: false, save: current, reason: 'bag' };
  const kind = (prefs.loved || []).includes(item) ? 'loved' : (prefs.liked || []).includes(item) ? 'liked' : 'meh';
  const amount = kind === 'loved' ? 10 : kind === 'liked' ? 6 : 2;
  const rec = friendRecord(current, id);
  const next = gainFriendship(rec, amount, stats.friendGain);
  const bag = { ...current.bag, [item]: current.bag[item] - 1 };
  return { ok: true, save: withFriend({ ...current, bag }, id, next), kind, gained: next.pts - rec.pts };
}

export function askOut(save, id, npc = {}) {
  const current = sanitiseSave(save);
  if (!npc.romance) return { ok: false, save: current, reason: 'no' };
  const rec = friendRecord(current, id);
  if (rec.romance) return { ok: true, save: current };
  if (friendStage(rec) < 3 || rec.pts < ROMANCE_AT) return { ok: false, save: current, reason: 'notYet' };
  return { ok: true, save: withFriend(current, id, { ...rec, romance: true }) };
}

export function propose(save, id, npc = {}) {
  const current = sanitiseSave(save);
  if (!npc.romance) return { ok: false, save: current, reason: 'no' };
  const rec = friendRecord(current, id);
  if (rec.married) return { ok: true, save: current };
  if (friendStage(rec) < 4 || rec.pts < PROPOSE_AT) return { ok: false, save: current, reason: 'notYet' };
  if (!current.owned.includes('ring')) return { ok: false, save: current, reason: 'noRing' };
  const owned = current.owned.filter((item) => item !== 'ring');
  return { ok: true, save: withFriend({ ...current, owned }, id, { ...rec, married: true, romance: true, pts: 100 }) };
}

// ---- The clue trail and the second planet ------------------------------

export const CLUES = [
  { id: 'lens', item: 'dust', spot: 'telescope' },
  { id: 'reel', item: 'reel', spot: 'projector' },
  { id: 'hatch', item: 'syrup', spot: 'crate' },
];

export function nextClue(save) {
  const found = (save && save.clues) || [];
  return CLUES.find((clue) => !found.includes(clue.id)) || null;
}

export function useClue(save, id) {
  const current = sanitiseSave(save);
  const clue = CLUES.find((row) => row.id === id);
  if (!clue) return { ok: false, save: current, reason: 'clue' };
  if (current.clues.includes(id)) return { ok: false, save: current, reason: 'found' };
  if (nextClue(current).id !== id) return { ok: false, save: current, reason: 'order' };
  if (current.bag[clue.item] < 1) return { ok: false, save: current, reason: 'bag' };
  const bag = { ...current.bag, [clue.item]: current.bag[clue.item] - 1 };
  return { ok: true, save: sanitiseSave({ ...current, bag, clues: [...current.clues, id] }) };
}

export const PLANET_FRIEND = 'mallow';
export const PLANET_STAGE = 3;
export const PLANET_GOOD = 'rock';

export function planetGate(save) {
  const current = sanitiseSave(save);
  const checks = [
    { id: 'clues', label: `Star chart pieces ${current.clues.length} of ${CLUES.length}`, ok: current.clues.length >= CLUES.length },
    { id: 'friend', label: 'Mallow trusts you as a close friend', ok: friendStage(friendRecord(current, PLANET_FRIEND)) >= PLANET_STAGE },
    { id: 'good', label: 'A Moon rock from your own mine for the fuel cell', ok: current.bag[PLANET_GOOD] >= 1 },
    { id: 'coins', label: `${PLANET_FARE} coins for the fare`, ok: current.coins >= PLANET_FARE },
  ];
  return { ok: current.planet || checks.every((c) => c.ok), open: current.planet, checks };
}

export function launchPlanet(save) {
  const current = sanitiseSave(save);
  if (current.planet) return { ok: true, save: current };
  const gate = planetGate(current);
  if (!gate.ok) return { ok: false, save: current, reason: 'gate', checks: gate.checks };
  const bag = { ...current.bag, [PLANET_GOOD]: current.bag[PLANET_GOOD] - 1 };
  return { ok: true, save: sanitiseSave({ ...current, bag, coins: current.coins - PLANET_FARE, planet: true }) };
}

// ---- The item bar ------------------------------------------------------

export const BAR_SLOTS = 5;
const BAR_EXTRAS = new Set(['snack']);

function readBar(raw, weapons) {
  const bar = Array(BAR_SLOTS).fill('');
  const used = new Set();
  if (Array.isArray(raw)) {
    raw.slice(0, BAR_SLOTS).forEach((id, i) => {
      const item = String(id || '');
      if (used.has(item)) return;
      if (weapons.includes(item) || BAR_EXTRAS.has(item)) {
        bar[i] = item;
        used.add(item);
      }
    });
  } else bar[0] = 'rifle';
  return bar;
}

export function equip(save, slot, id) {
  const current = sanitiseSave(save);
  const index = whole(slot);
  if (index >= BAR_SLOTS) return { ok: false, save: current, reason: 'slot' };
  const item = String(id || '');
  if (item && !current.weapons.includes(item) && !BAR_EXTRAS.has(item)) return { ok: false, save: current, reason: 'owned' };
  const bar = current.bar.map((held) => (held === item ? '' : held));
  bar[index] = item;
  return { ok: true, save: sanitiseSave({ ...current, bar }) };
}

export function eatSnack(save, hp, max = PLAYER_HP) {
  const current = sanitiseSave(save);
  if (current.bag.snack < 1) return { ok: false, save: current, hp, reason: 'bag' };
  if (hp >= max) return { ok: false, save: current, hp, reason: 'full' };
  const bag = { ...current.bag, snack: current.bag.snack - 1 };
  return { ok: true, save: sanitiseSave({ ...current, bag }), hp: Math.min(max, hp + 2) };
}

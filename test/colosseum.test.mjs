import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA,
  BASE_STATS,
  CAT_COINS,
  CLICK_BOUNDS,
  CLICK_TO_WIN,
  CLUES,
  DRINK_PRICE,
  ERRAND_PAY,
  GORE_LEVELS,
  HOME_PATCHES,
  LOSS_COST,
  MARKET_PAY,
  MOVE_SPEED,
  PART_PRICE,
  PLANET_FARE,
  PLANET_GOOD,
  SKILLS,
  START_COINS,
  TYPING_PHRASE,
  WEAPONS,
  WIN_PAY,
  WORK_SECONDS,
  acceptTrade,
  applyCatLoot,
  applyHit,
  applyPurse,
  askOut,
  beamRay,
  besidePlace,
  bindOpenBets,
  blocked,
  bodyRect,
  buyDrink,
  buyPart,
  buySkill,
  catLoot,
  catStruck,
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
  gainFriendship,
  getMap,
  giftTo,
  giveItem,
  goreBits,
  homeWorld,
  inArena,
  latestPostcards,
  launchPlanet,
  mayEnter,
  moveFavourite,
  nextClue,
  nextPatchCost,
  offerTrade,
  orderFavourites,
  pinErrand,
  placeBet,
  placeFurniture,
  planetGate,
  propose,
  purchase,
  rankBoard,
  releaseEscrow,
  releaseOffers,
  resolveBeam,
  resolveShots,
  respawn,
  rollAlien,
  saberBlocks,
  saberStrikes,
  sanitiseSave,
  scoreClick,
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
  unlockedSpan,
  useClue,
  walkingIntent,
  withinReach,
  worldMap,
} from '../public/colosseum-logic.mjs';

test('a win pays coins and a loss cannot empty the purse below zero', () => {
  const won = applyPurse(START_COINS, 'win');
  assert.equal(won.coins, START_COINS + WIN_PAY);
  assert.equal(won.delta, WIN_PAY);
  const poor = applyPurse(2, 'loss');
  assert.equal(poor.coins, 0);
  assert.equal(poor.delta, -2);
  assert.ok(LOSS_COST > 2);
  const draw = applyPurse(5, 'draw');
  assert.equal(draw.coins, 5);
  assert.equal(draw.delta, 0);
});

test('the board ranks most coins, then most wins', () => {
  const rows = rankBoard([
    { memberId: 'a', name: 'Ada', coins: 10, wins: 4, seq: 1 },
    { memberId: 'b', name: 'Bea', coins: 30, wins: 0, seq: 1 },
    { memberId: 'c', name: 'Cleo', coins: 10, wins: 1, seq: 1 },
    { memberId: 'a', name: 'Ada', coins: 12, wins: 5, seq: 2 },
  ]);
  assert.deepEqual(rows.map((row) => row.name), ['Bea', 'Ada', 'Cleo']);
  assert.equal(rows[1].coins, 12);
  assert.equal(rows[1].wins, 5);
  const favs = orderFavourites(
    [{ name: 'Bea', coins: 30 }, { name: 'Ada', coins: 12 }, { name: 'Cleo', coins: 10 }],
    ['Cleo', 'Ada'],
  );
  assert.deepEqual(favs.map((person) => person.name), ['Cleo', 'Ada', 'Bea']);
  assert.equal(favs[0].coins, 10);
  assert.deepEqual(rankBoard(latestPostcards([
    { memberId: 'a', name: 'Ada', coins: 12, wins: 5, seq: 2 },
    { memberId: 'b', name: 'Bea', coins: 30, wins: 0, seq: 1 },
  ])).map((row) => row.name), ['Bea', 'Ada']);
});

test('favourites can be reordered without becoming a score', () => {
  assert.deepEqual(moveFavourite(['Cleo', 'Ada', 'Bea'], 'Bea', -1), ['Cleo', 'Bea', 'Ada']);
  assert.deepEqual(moveFavourite(['Cleo'], 'Cleo', -1), ['Cleo']);
});

test('typing wins only on the whole line, and the click circle has to move', () => {
  assert.equal(typingWin(TYPING_PHRASE), true);
  assert.equal(typingWin('bright'), false);
  assert.equal(typingWin('bright rooms'), false);
  const start = circleAt(0, CLICK_BOUNDS);
  const later = circleAt(450, CLICK_BOUNDS);
  assert.ok(start.x !== later.x || start.y !== later.y);
  assert.equal(scoreClick(start.x, start.y, 0), true);
  assert.equal(scoreClick(0, 0, 0), false);
  assert.equal(clickWin(CLICK_TO_WIN), true);
  assert.equal(clickWin(CLICK_TO_WIN - 1), false);
});

test('a duel draw pays nothing and the spark changes walls', () => {
  assert.equal(duelOutcome(3, 3), 'draw');
  assert.equal(duelOutcome(4, 2), 'win');
  assert.equal(duelOutcome(1, 5), 'loss');
  assert.equal(sparkSide(100), 'left');
  assert.equal(sparkSide(1000), 'right');
});

test('the beam must recharge after it empties', () => {
  let beam = stepBeam(1, { firing: true, locked: false }, 1);
  assert.ok(beam.energy < 1);
  assert.equal(beam.firing, true);
  beam = stepBeam(0.2, { firing: true, locked: false }, 1);
  assert.equal(beam.energy, 0);
  assert.equal(beam.locked, true);
  assert.equal(beam.firing, false);
  beam = stepBeam(0.5, { firing: true, locked: true }, 1);
  assert.equal(beam.locked, true);
  assert.equal(beam.firing, false);
  assert.ok(beam.energy > 0.5);
  beam = stepBeam(0.9, { firing: true, locked: true }, 1);
  assert.equal(beam.locked, false);
  assert.equal(beam.energy, 1);
});

test('bets need an ally, cannot overdraw, and a win returns double', () => {
  const allies = setAlly([], 'Bea', true);
  assert.deepEqual(allies.allies, ['Bea']);
  const two = setAlly(allies.allies, 'Cleo', true);
  const full = setAlly(two.allies, 'Ada', true);
  assert.equal(full.ok, false);
  assert.deepEqual(full.allies, ['Bea', 'Cleo']);
  const broke = placeBet(5, [], two.allies, { ally: 'Bea', stake: 8 });
  assert.equal(broke.ok, false);
  assert.equal(broke.coins, 5);
  const placed = placeBet(20, [], two.allies, { ally: 'Bea', stake: 6, matchKey: '' });
  assert.equal(placed.ok, true);
  assert.equal(placed.coins, 14);
  const bound = bindOpenBets(placed.bets, 'Bea', 'match-1');
  assert.equal(bound[0].matchKey, 'match-1');
  const won = settleBets(placed.coins, bound, [{ ally: 'Bea', matchKey: 'match-1', won: true }]);
  assert.equal(won.coins, 14 + 12);
  assert.equal(won.bets.length, 0);
  const lost = settleBets(placed.coins, bound, [{ ally: 'Bea', matchKey: 'match-1', won: false }]);
  assert.equal(lost.coins, 14);
  const stranger = placeBet(20, [], two.allies, { ally: 'Noone', stake: 2 });
  assert.equal(stranger.ok, false);
});

test('send and give keep the purse honest, and a closed room returns an unclaimed gift', () => {
  const sent = transferOut(10, 4);
  assert.equal(sent.ok, true);
  assert.equal(sent.coins, 6);
  assert.equal(transferOut(3, 4).ok, false);
  assert.equal(transferIn(6, sent.sent).coins, 10);
  const back = releaseEscrow(6, [{ id: 'g1', amount: 4, to: 'Bea' }]);
  assert.equal(back.coins, 10);
  assert.deepEqual(back.escrow, []);
});

test('the shop refuses a purchase the purse cannot cover', () => {
  const save = emptySave();
  const bought = purchase(save, 'visor');
  assert.equal(bought.ok, true);
  assert.equal(bought.save.coins, START_COINS - 6);
  assert.equal(bought.save.worn, 'visor');
  const again = purchase(bought.save, 'visor');
  assert.equal(again.ok, false);
  const poor = purchase({ ...emptySave(), coins: 2 }, 'paw-sword');
  assert.equal(poor.ok, false);
  assert.equal(poor.save.coins, 2);
});

test('a save keeps coins and drops chat, notes, and the room word', () => {
  const clean = sanitiseSave({
    coins: 9,
    wins: 2,
    favourites: ['Bea'],
    allies: ['Bea', 'Cleo', 'Ada'],
    roomWord: 'should-not-stick',
    messages: [{ text: 'hello' }],
    notes: 'a transcript',
    token: 'abc',
    password: 'nope',
  });
  assert.equal(clean.coins, 9);
  assert.deepEqual(clean.favourites, ['Bea']);
  assert.equal(clean.allies.length, 2);
  assert.equal(clean.gore, 0);
  assert.equal(clean.planet, false);
  assert.equal('roomWord' in clean, false);
  assert.equal('messages' in clean, false);
  assert.equal('notes' in clean, false);
  assert.equal(JSON.stringify(clean).includes('should-not-stick'), false);
  assert.equal(JSON.stringify(clean).includes('hello'), false);
});

test('a trade waits for the other person, and a closed room returns the offer', () => {
  const stocked = giveItem(emptySave(), 'rock', 1).save;
  const offered = offerTrade(stocked, 'rock', 1, 'Bea', 't1');
  assert.equal(offered.ok, true);
  assert.equal(offered.save.bag.rock, 0);
  assert.equal(offered.save.offers.length, 1);
  const theirs = acceptTrade(emptySave(), 'rock', 1).save;
  assert.equal(theirs.bag.rock, 1);
  const kept = dropOffer(offered.save, 't1');
  assert.equal(kept.offers.length, 0);
  assert.equal(kept.bag.rock, 0);
  const returned = releaseOffers(offered.save);
  assert.equal(returned.bag.rock, 1);
  assert.equal(returned.offers.length, 0);
  const declined = declineTrade(offered.save, 't1');
  assert.equal(declined.ok, true);
  assert.equal(declined.save.bag.rock, 1);
  const sold = sellGood(stocked, 'rock');
  assert.equal(sold.ok, true);
  assert.equal(sold.paid, MARKET_PAY);
  assert.equal(sold.save.coins, stocked.coins + MARKET_PAY);
  const part = buyPart({ ...emptySave(), coins: PART_PRICE }, 'dust');
  assert.equal(part.ok, true);
  assert.equal(part.save.bag.dust, 1);
  assert.equal(part.save.coins, 0);
  const stripped = sanitiseSave({ ...sold.save, roomWord: 'nope', messages: [{ text: 'secret' }] });
  assert.equal(JSON.stringify(stripped).includes('nope'), false);
  assert.equal(JSON.stringify(stripped).includes('secret'), false);
});

test('home works pause when the page is closed and need an open patch', () => {
  let save = giveItem({ ...emptySave(), patches: 1, coins: 20 }, 'dust', 1).save;
  const paused = tickWorks(save, WORK_SECONDS, { open: false });
  assert.equal(paused.bag.dust, 1);
  assert.equal(paused.works.mine.loaded, false);
  const locked = tickWorks(save, WORK_SECONDS, { open: true });
  assert.equal(locked.bag.dust, 1);
  assert.equal(locked.bag.rock, 0);
  save = { ...save, patches: 2 };
  const started = tickWorks(save, 1, { open: true });
  assert.equal(started.bag.dust, 0);
  assert.equal(started.works.mine.loaded, true);
  const done = tickWorks(started, WORK_SECONDS, { open: true });
  assert.equal(done.bag.rock, 1);
  assert.equal(done.works.mine.loaded, false);
  assert.equal(done.works.studio.loaded, false);
});

test('the town is one map larger than a window, with rooms behind its doors', () => {
  const town = worldMap();
  assert.ok(town.w >= 900 && town.h >= 600);
  for (const id of ['tavern', 'market', 'home', 'mallow', 'observatory', 'cinema']) {
    const door = town.doors.find((d) => d.to === id);
    assert.ok(door, `a door to ${id}`);
    const inside = getMap(id);
    assert.ok(inside.doors.some((d) => d.to === 'town'), `a way out of ${id}`);
    assert.equal(blocked(inside, bodyRect(inside.spawn)), false, `${id} spawn is clear`);
  }
  assert.equal(blocked(town, bodyRect(town.spawn)), false);
  assert.ok(town.street.w > 400);
});

test('walking moves on both axes, stops at walls, and doors open when walked into', () => {
  const town = worldMap();
  let actor = spawnActor(town);
  const start = { x: actor.x, y: actor.y };
  actor = stepActor(actor, walkingIntent({ d: true }), town, 0.05);
  assert.ok(actor.x > start.x);
  assert.equal(actor.facing, 'right');
  actor = stepActor(actor, walkingIntent({ w: true }), town, 0.05);
  assert.ok(actor.y < start.y);
  assert.equal(actor.facing, 'up');
  const fast = stepActor(spawnActor(town), { right: true }, town, 0.05, { speed: MOVE_SPEED * 1.5 });
  const slow = stepActor(spawnActor(town), { right: true }, town, 0.05);
  assert.ok(fast.x - town.spawn.x > slow.x - town.spawn.x);
  const tavern = town.doors.find((d) => d.to === 'tavern');
  let walker = { ...spawnActor(town), x: tavern.x + 8, y: tavern.y + 24 };
  let door = null;
  for (let i = 0; i < 40 && !door; i += 1) {
    walker = stepActor(walker, { up: true }, town, 0.05);
    door = doorAt(town, walker, { up: true });
  }
  assert.equal(door && door.to, 'tavern');
  let stuck = { ...spawnActor(town), x: tavern.x + 8, y: tavern.y - 20 };
  for (let i = 0; i < 20; i += 1) stuck = stepActor(stuck, { up: true }, town, 0.05);
  assert.ok(stuck.y > TOWN_BUILDING_TOP(town, 'tavern'));
});

function TOWN_BUILDING_TOP(town, id) {
  return town.buildings.find((b) => b.id === id).foot.y;
}

test('tab swaps between the chat and the world, and leaves other text fields alone', () => {
  assert.equal(tabTarget({ inRoom: false, mode: 'world' }), null);
  assert.equal(tabTarget({ inRoom: true, mode: 'world', field: null }), 'chat');
  assert.equal(tabTarget({ inRoom: true, mode: 'chat', field: { text: true, chat: true } }), 'world');
  assert.equal(tabTarget({ inRoom: true, mode: 'chat', field: { text: true, door: true } }), null);
  assert.equal(tabTarget({ inRoom: true, mode: 'world', field: { text: true } }), null);
});

test('home starts as one patch, locked ground refuses furniture, and the door starts shut', () => {
  const save = emptySave();
  assert.equal(save.patches, 1);
  assert.deepEqual(save.invites, []);
  assert.equal(mayEnter(save.invites, 'Bea'), false);
  const bought = purchase({ ...save, coins: 30 }, 'crate');
  assert.equal(bought.ok, true);
  assert.equal(bought.save.furniture.length, 1);
  const span = unlockedSpan(1);
  assert.ok(bought.save.furniture[0].x < span.x + span.w);
  const blocked1 = placeFurniture(bought.save, 'crate', HOME_PATCHES[2].x + 10);
  assert.equal(blocked1.ok, false);
  assert.equal(blocked1.reason, 'locked');
  const poor = unlockPatch({ ...bought.save, coins: 2 });
  assert.equal(poor.ok, false);
  const opened = unlockPatch({ ...bought.save, coins: nextPatchCost(1) });
  assert.equal(opened.ok, true);
  assert.equal(opened.save.patches, 2);
  const invited = toggleInvite(opened.save.invites, 'Bea');
  assert.equal(mayEnter(invited, 'Bea'), true);
  assert.equal(mayEnter(toggleInvite(invited, 'Bea'), 'Bea'), false);
  const station = homeWorld(1);
  let walker = { ...station.spawn, facing: 'down' };
  for (let i = 0; i < 80; i += 1) walker = stepActor(walker, { right: true }, station, 0.05);
  assert.ok(walker.x <= span.x + span.w);
  const wider = homeWorld(2);
  assert.ok(wider.spots.some((s) => s.id === 'mine'));
  assert.equal(station.spots.some((s) => s.id === 'mine'), false);
});

test('shots fly at any angle, walls stop them, and the beam ray stops at cover', () => {
  const up = fireWeapon('rifle', { x: 0, y: 0 }, -Math.PI / 2, { rng: () => 0.5 });
  assert.ok(up.vy < 0 && Math.abs(up.vx) < 1e-6);
  const down = fireWeapon('fireball', { x: 0, y: 0 }, Math.PI / 2, { rng: () => 0.5 });
  assert.ok(down.vy > 0);
  assert.equal(fireWeapon('beam', { x: 0, y: 0 }, 0), null);
  assert.equal(fireWeapon('saber', { x: 0, y: 0 }, 0), null);
  const wild = fireWeapon('rifle', { x: 0, y: 0 }, 0, { rng: () => 1, aim: 1 });
  const steady = fireWeapon('rifle', { x: 0, y: 0 }, 0, { rng: () => 1, aim: skillStats(['steady', 'steady2']).aim });
  assert.ok(Math.abs(Math.atan2(steady.vy, steady.vx)) < Math.abs(Math.atan2(wild.vy, wild.vx)));
  const cover = { x: 40, y: -10, w: 10, h: 20 };
  const ray = beamRay({ x: 0, y: 0 }, 0, WEAPONS.beam.length, [cover]);
  assert.ok(Math.abs(ray.x1 - 40) <= 1);
  const behind = { x: 70, y: -10, w: 10, h: 10 };
  assert.equal(resolveBeam({ x: 0, y: 0 }, 0, WEAPONS.beam.length, [cover], behind), null);
  const below = { x: -5, y: 30, w: 10, h: 10 };
  assert.ok(resolveBeam({ x: 0, y: 0 }, Math.PI / 2, WEAPONS.beam.length, [cover], below));
  const town = worldMap();
  const shot = { ...fireWeapon('rifle', { x: town.spawn.x, y: 60 }, -Math.PI / 2, { rng: () => 0.5 }), life: 5 };
  let flying = [shot];
  let impacts = [];
  for (let i = 0; i < 20 && flying.length; i += 1) ({ shots: flying, impacts } = stepShots(flying, town, 0.05));
  assert.equal(flying.length, 0);
  assert.ok(impacts.length >= 0);
  const body = { id: 'them', invuln: 0, rect: { x: 50, y: 0, w: 20, h: 20 } };
  const self = { id: 'me', invuln: 0, rect: { x: 0, y: 0, w: 20, h: 20 } };
  const bolt = { id: 's1', from: 'me', x: 10, y: 10, vx: 200, vy: 0, r: 3, life: 1 };
  const hit = resolveShots([bolt], [], [self, body], 0.3);
  assert.equal(hit.hits.length, 1);
  assert.equal(hit.hits[0].id, 'them');
  assert.equal(resolveShots([bolt], [{ x: 40, y: 0, w: 10, h: 20 }], [body], 0.3).hits.length, 0);
  assert.equal(applyHit(3), 2);
  assert.equal(applyHit(0), 0);
  assert.equal(applyHit(5, 3), 2);
});

test('a lightsaber blocks only the shots its blade lines up with', () => {
  const me = { x: 0, y: 0 };
  const incoming = { x: 30, y: 0 };
  const next = { x: 10, y: 0, r: 2 };
  assert.equal(saberBlocks(me, 0, incoming, next), true);
  assert.equal(saberBlocks(me, Math.PI / 2, incoming, next), false);
  const fromAbove = { x: 0, y: -30 };
  assert.equal(saberBlocks(me, -Math.PI / 2, fromAbove, { x: 0, y: -12, r: 2 }), true);
  assert.equal(saberBlocks(me, 0, fromAbove, { x: 0, y: -12, r: 2 }), false);
  assert.ok(skillStats(['steady', 'parry']).blockWindow > BASE_STATS.blockWindow);
  assert.equal(saberStrikes(me, 0, { x: 14, y: 0 }), true);
  assert.equal(saberStrikes(me, Math.PI, { x: 14, y: 0 }), false);
});

test('every skill node changes a real number, and nodes need their parent and coins', () => {
  for (const node of SKILLS) {
    const before = skillStats(node.needs ? chain(node) : []);
    const after = skillStats([...(node.needs ? chain(node) : []), node.id]);
    assert.notEqual(after[node.stat], before[node.stat], node.id);
    assert.ok(skillLabel(node).length > 4);
  }
  const stats = new Set(SKILLS.map((n) => n.stat));
  for (const stat of ['moveSpeed', 'mineRate', 'factoryRate', 'aim', 'fireRate', 'blockWindow', 'friendGain']) assert.ok(stats.has(stat), stat);
  const orphan = buySkill({ ...emptySave(), coins: 99 }, 'stride2');
  assert.equal(orphan.reason, 'needs');
  const broke = buySkill({ ...emptySave(), coins: 1 }, 'stride');
  assert.equal(broke.reason, 'purse');
  const ok = buySkill({ ...emptySave(), coins: 99 }, 'drill');
  assert.equal(ok.ok, true);
  assert.equal(ok.save.coins, 99 - SKILLS.find((n) => n.id === 'drill').cost);
  const fast = tickWorks({ ...giveItem(emptySave(), 'dust', 1).save, patches: 2 }, WORK_SECONDS / 2, { open: true, stats: skillStats(['drill', 'drill2']) });
  assert.equal(fast.works.mine.loaded, true);
  const done = tickWorks(fast, WORK_SECONDS / 2, { open: true, stats: skillStats(['drill', 'drill2']) });
  assert.equal(done.bag.rock, 1);
});

function chain(node) {
  const out = [];
  let at = node;
  while (at.needs) {
    at = SKILLS.find((n) => n.id === at.needs);
    out.unshift(at.id);
  }
  return out;
}

test('friendship rises, romance is a later stage, and marriage comes only after it', () => {
  const npc = { romance: true };
  let save = emptySave();
  let talk = talkTo(save, 'mallow', 100000);
  assert.ok(talk.gained > 0);
  const again = talkTo(talk.save, 'mallow', 100500);
  assert.equal(again.gained, 0);
  const charmed = talkTo(save, 'mallow', 100000, skillStats(['stride', 'charm', 'charm2']));
  assert.ok(charmed.gained > talk.gained);
  save = { ...talk.save, friends: { mallow: { pts: 40, romance: false, married: false, talkAt: 0 } } };
  assert.equal(friendStage(friendRecord(save, 'mallow')), 2);
  assert.equal(askOut(save, 'mallow', npc).reason, 'notYet');
  save = { ...save, friends: { mallow: { pts: 200, romance: false, married: false, talkAt: 0 } } };
  save = sanitiseSave(save);
  assert.equal(friendRecord(save, 'mallow').pts, 69);
  assert.equal(friendStage(friendRecord(save, 'mallow')), 3);
  assert.equal(propose(save, 'mallow', npc).reason, 'notYet');
  assert.equal(askOut(save, 'zib', {}).reason, 'no');
  const dating = askOut(save, 'mallow', npc);
  assert.equal(dating.ok, true);
  let rec = gainFriendship(friendRecord(dating.save, 'mallow'), 40);
  assert.equal(rec.pts, 99);
  assert.equal(friendStage(rec), 4);
  const close = sanitiseSave({ ...dating.save, friends: { mallow: rec } });
  assert.equal(propose(close, 'mallow', npc).reason, 'noRing');
  const ringed = purchase({ ...close, coins: 50 }, 'ring').save;
  const wed = propose(ringed, 'mallow', npc);
  assert.equal(wed.ok, true);
  assert.equal(friendStage(friendRecord(wed.save, 'mallow')), 5);
  assert.equal(wed.save.owned.includes('ring'), false);
  const gifted = giftTo(giveItem(emptySave(), 'video', 1).save, 'mallow', 'video', { loved: ['video'] });
  assert.equal(gifted.kind, 'loved');
  assert.equal(gifted.save.bag.video, 0);
});

test('the clue trail runs in order and uses items already in the bag', () => {
  let save = emptySave();
  assert.equal(nextClue(save).id, 'lens');
  assert.equal(useClue(save, 'reel').reason, 'order');
  assert.equal(useClue(save, 'lens').reason, 'bag');
  save = giveItem(save, 'dust', 1).save;
  const lens = useClue(save, 'lens');
  assert.equal(lens.ok, true);
  assert.equal(lens.save.bag.dust, 0);
  assert.deepEqual(lens.save.clues, ['lens']);
  assert.equal(sanitiseSave({ ...emptySave(), clues: ['reel'] }).clues.length, 0);
});

test('the second planet needs the clues, a friend, a made good, and coins, not one purchase', () => {
  const rich = { ...emptySave(), coins: 500 };
  const gate = planetGate(rich);
  assert.equal(gate.ok, false);
  assert.equal(gate.checks.filter((c) => !c.ok).length, 3);
  assert.equal(launchPlanet(rich).ok, false);
  let save = giveItem({ ...rich, clues: CLUES.map((c) => c.id) }, PLANET_GOOD, 1).save;
  assert.equal(planetGate(save).ok, false);
  save = sanitiseSave({ ...save, friends: { mallow: { pts: 45 } } });
  assert.equal(planetGate(save).ok, true);
  assert.equal(planetGate({ ...save, coins: PLANET_FARE - 1 }).ok, false);
  const gone = launchPlanet(save);
  assert.equal(gone.ok, true);
  assert.equal(gone.save.planet, true);
  assert.equal(gone.save.coins, 500 - PLANET_FARE);
  assert.equal(gone.save.bag[PLANET_GOOD], 0);
  assert.ok(getMap('planet2').w > 0);
});

test('the item bar holds what is equipped and the bag holds the rest', () => {
  let save = emptySave();
  assert.deepEqual(save.bar, ['rifle', '', '', '', '']);
  assert.equal(equip(save, 1, 'saber').reason, 'owned');
  save = purchase({ ...save, coins: 99 }, 'saber').save;
  assert.ok(save.bar.includes('saber'));
  const moved = equip(save, 4, 'saber').save;
  assert.equal(moved.bar[4], 'saber');
  assert.equal(moved.bar.filter((id) => id === 'saber').length, 1);
  const snack = equip(moved, 2, 'snack').save;
  assert.equal(snack.bar[2], 'snack');
  const fed = eatSnack(giveItem(snack, 'snack', 1).save, 2);
  assert.equal(fed.ok, true);
  assert.equal(fed.hp, 4);
  assert.equal(eatSnack(snack, 2).ok, false);
  assert.equal(sanitiseSave({ ...save, bar: ['beam'] }).bar[0], '');
});

test('alien cats keep to the street, shoot back, and leave loot; gore stays off by default', () => {
  const town = worldMap();
  const player = { x: town.street.x + 200, y: town.street.y + 40 };
  assert.equal(rollAlien({ walking: true, indoors: true, street: town.street, roll: 0.01, player }), null);
  assert.equal(rollAlien({ walking: true, indoors: false, street: town.street, roll: 0.01, player, count: 3 }), null);
  const alien = rollAlien({ walking: true, indoors: false, street: town.street, roll: 0.1, player });
  assert.equal(alien.side, 'left');
  assert.ok(alien.x >= town.street.x && alien.x <= town.street.x + town.street.w);
  let state = { ...alien, cool: 0 };
  let shot = null;
  for (let i = 0; i < 10 && !shot; i += 1) ({ alien: state, shot } = stepAlien(state, player, town, 0.05, () => 0.5));
  assert.ok(shot);
  assert.ok(Math.sign(shot.vx) === Math.sign(player.x - alien.x));
  const struck = catStruck(alien, [{ x: alien.x, y: alien.y - 6, r: 3, damage: 2 }]);
  assert.equal(struck.hit, true);
  assert.equal(struck.damage, 2);
  assert.equal(catStruck(alien, [{ x: alien.x + 80, y: alien.y, r: 3 }]).hit, false);
  const loot = catLoot(0.01);
  assert.equal(loot.coins, CAT_COINS);
  const rich = applyCatLoot(emptySave(), loot);
  assert.equal(rich.coins, START_COINS + CAT_COINS);
  assert.equal(rich.bag.dust, 1);
  assert.equal(emptySave().gore, 0);
  assert.equal(goreBits(0), 0);
  assert.ok(goreBits(3) > goreBits(1));
  assert.equal(GORE_LEVELS.length, 4);
});

test('the tavern pays more than the market, and a match keeps fighters in the ring', () => {
  const tavern = getMap('tavern');
  const bar = tavern.spots.find((s) => s.id === 'bar');
  assert.equal(besidePlace({ x: bar.x, y: bar.y + 4 }, bar), true);
  assert.equal(besidePlace({ x: bar.x + 100, y: bar.y }, bar), false);
  let save = pinErrand(giveItem(emptySave(), 'snack', 1).save, 'snack').save;
  const paid = turnInErrand(save);
  assert.equal(paid.ok, true);
  assert.equal(paid.paid, ERRAND_PAY);
  assert.ok(ERRAND_PAY > MARKET_PAY);
  const drink = buyDrink({ ...emptySave(), coins: DRINK_PRICE });
  assert.equal(drink.ok, true);
  assert.equal(buyDrink(drink.save).ok, false);
  const held = clampArena({ x: ARENA.inner.x - 50, y: ARENA.inner.y + ARENA.inner.h + 50 });
  assert.equal(inArena(held), true);
  const back = respawn(ARENA.starts[0]);
  assert.equal(back.x, ARENA.starts[0].x);
  assert.ok(ARENA.covers.length >= 2);
  assert.equal(withinReach({ x: 0, y: 0 }, { x: 20, y: 0 }), true);
  assert.equal(withinReach({ x: 0, y: 0 }, { x: 200, y: 0 }), false);
});

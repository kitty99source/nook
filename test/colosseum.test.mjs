import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLICK_BOUNDS,
  CLICK_TO_WIN,
  GUNS,
  LOSS_COST,
  START_COINS,
  TYPING_PHRASE,
  WIN_PAY,
  applyHit,
  applyPurse,
  arenaMap,
  beamSegment,
  clampArena,
  bindOpenBets,
  bulletHitsRect,
  circleAt,
  circleHitsRect,
  clickWin,
  duelOutcome,
  emptySave,
  fireGun,
  hitCircle,
  latestPostcards,
  moveFavourite,
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
  walkingIntent,
  transferIn,
  transferOut,
  typingWin,
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

test('hit tests catch a moving shot and a beam stops at cover', () => {
  assert.equal(hitCircle(0, 0, 3, 4, 5), true);
  assert.equal(hitCircle(0, 0, 3, 4, 4), false);
  const cover = { x: 40, y: 0, w: 10, h: 20 };
  assert.equal(bulletHitsRect(0, 10, 80, 10, 3, cover), true);
  assert.equal(bulletHitsRect(0, 10, 20, 10, 3, cover), false);
  const rifle = fireGun('rifle', { x: 0, y: 10 }, 1);
  const launcher = fireGun('launcher', { x: 0, y: 10 }, 1);
  assert.ok(rifle.vx > launcher.vx);
  assert.ok(launcher.r > rifle.r);
  assert.equal(fireGun('beam', { x: 0, y: 0 }, 1), null);
  const thin = { x: 30, y: 8, w: 4, h: 4 };
  assert.equal(circleHitsRect(rifle.x + 10, 10, rifle.r, thin), false);
  assert.equal(circleHitsRect(28, 10, launcher.r, thin), true);

  const behind = { x: 120, y: 0, w: 20, h: 20 };
  const blocked = beamSegment({ x: 0, y: 10 }, 1, GUNS.beam.length, [cover]);
  assert.equal(blocked.x1, cover.x);
  assert.equal(resolveBeam({ x: 0, y: 10 }, 1, GUNS.beam.length, [cover], behind), null);
  const inFront = { x: 10, y: 0, w: 16, h: 20 };
  assert.ok(resolveBeam({ x: 0, y: 10 }, 1, GUNS.beam.length, [cover], inFront));

  const body = { id: 'them', invuln: 0, rect: { x: 50, y: 0, w: 20, h: 20 } };
  const self = { id: 'me', invuln: 0, rect: { x: 0, y: 0, w: 20, h: 20 } };
  const shot = { id: 's1', from: 'me', x: 10, y: 10, vx: 200, vy: 0, r: 3, life: 1 };
  const hit = resolveShots([shot], [], [self, body], 0.3);
  assert.equal(hit.hits.length, 1);
  assert.equal(hit.hits[0].id, 'them');
  assert.equal(hit.shots.length, 0);
  const stopped = resolveShots([shot], [cover], [body], 0.3);
  assert.equal(stopped.hits.length, 0);
  assert.equal(applyHit(3), 2);
  assert.equal(applyHit(1), 0);
  assert.equal(applyHit(0), 0);
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
    cityOn: false,
  });
  assert.equal(clean.coins, 9);
  assert.deepEqual(clean.favourites, ['Bea']);
  assert.equal(clean.allies.length, 2);
  assert.equal(clean.cityOn, false);
  assert.equal('roomWord' in clean, false);
  assert.equal('messages' in clean, false);
  assert.equal('notes' in clean, false);
  assert.equal(JSON.stringify(clean).includes('should-not-stick'), false);
  assert.equal(JSON.stringify(clean).includes('hello'), false);
});

test('walk, jump, climb, and the bridge use the city map', () => {
  const world = worldMap();
  let actor = spawnActor(world);
  const startX = actor.x;
  actor = stepActor(actor, { right: true }, world, 0.2);
  assert.ok(actor.x > startX);
  actor.onGround = true;
  actor.vy = 0;
  const beforeJump = actor.y;
  actor = stepActor(actor, { jump: true }, world, 0.05);
  assert.ok(actor.y < beforeJump);
  assert.ok(actor.vy < 0);
  const ladder = world.ladders[0];
  let climber = spawnActor(world);
  climber.x = ladder.x - 4;
  climber.y = ladder.y + 10;
  const climbed = stepActor(climber, { up: true }, world, 0.2);
  assert.equal(climbed.climbing, true);
  assert.ok(climbed.y < climber.y);
  let crosser = spawnActor(world);
  crosser.x = world.bridge.x + 20;
  assert.equal(onBridge(crosser, world), true);
  crosser.x = 20;
  assert.equal(onBridge(crosser, world), false);
});

test('left shift climbs only on a ladder, and tab leaves other text fields alone', () => {
  const world = worldMap();
  const ladder = world.ladders[0];
  const climber = spawnActor(world);
  climber.x = ladder.x - 4;
  climber.y = ladder.y + 24;
  const climbed = stepActor(climber, walkingIntent({ shift: true }), world, 0.2);
  assert.equal(climbed.climbing, true);
  assert.ok(climbed.y < climber.y);
  const away = spawnActor(world);
  away.x = 220;
  away.y = world.platforms[0].y - away.h;
  const stayed = stepActor(away, walkingIntent({ shift: true }), world, 0.05);
  assert.equal(stayed.climbing, false);
  const moved = stepActor(away, walkingIntent({ d: true }), world, 0.1);
  assert.ok(moved.x > away.x);
  assert.equal(tabSwitchesWalking({ inRoom: false, field: null }), false);
  assert.equal(tabSwitchesWalking({ inRoom: true, field: null }), true);
  assert.equal(tabSwitchesWalking({ inRoom: true, field: { id: 'text', text: true } }), true);
  assert.equal(tabSwitchesWalking({ inRoom: true, field: { id: 'name', text: true, door: true } }), false);
  assert.equal(tabSwitchesWalking({ inRoom: true, field: { id: 'stake', text: true } }), false);
  assert.equal(tabSwitchesWalking({ inRoom: true, field: { id: 'look', text: true, settings: true } }), false);
});

test('the upper ground continues across the gap between the margins', () => {
  const world = worldMap();
  let actor = spawnActor(world);
  actor.x = world.bridge.x - 10;
  actor.y = world.platforms[0].y - actor.h;
  actor.onGround = true;
  for (let i = 0; i < 30; i += 1) actor = stepActor(actor, { right: true }, world, 0.05);
  assert.ok(actor.x > world.bridge.x);
  assert.ok(Math.abs(actor.y + actor.h - world.platforms[0].y) < 2);
});

test('a fenced match keeps the fighter inside and sends them back to the start line', () => {
  const fence = arenaMap();
  const actor = spawnActor();
  const held = clampArena({
    ...actor,
    x: fence.x - 40,
    y: fence.y + fence.h,
    vy: 40,
    onGround: false,
  }, fence);
  assert.ok(held.x >= fence.x);
  assert.ok(held.x + held.w <= fence.x + fence.w);
  assert.ok(held.y + held.h <= fence.y + fence.h);
  assert.equal(held.onGround, true);
  const back = respawn(fence.start);
  assert.equal(back.x, fence.start.x);
  assert.equal(back.y, fence.start.y);
  assert.ok(fence.covers.length >= 2);
  assert.equal(withinReach({ x: 0, y: 0, w: 20, h: 20 }, { x: 30, y: 0, w: 20, h: 20 }), true);
  assert.equal(withinReach({ x: 0, y: 0, w: 20, h: 20 }, { x: 200, y: 0, w: 20, h: 20 }), false);
});

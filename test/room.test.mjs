import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdentity } from '../public/e2e.js';
import { applyHit, fireWeapon, gameCursor, hitBox, resolveShots } from '../public/colosseum-logic.mjs';
import { createRoom } from '../room.mjs';

function request(room, { method, pathname, token = '', json = null, search = '' }) {
  return room.handle({
    method,
    pathname,
    searchParams: new URLSearchParams(search),
    headers: token ? { 'x-token': token } : {},
    json,
    raw: null,
  });
}

async function enter(room, name, word = 'pspsps') {
  const identity = await createIdentity();
  const res = await request(room, {
    method: 'POST',
    pathname: '/api/join',
    json: { roomWord: word, name, publicKey: identity.publicKey },
  });
  assert.equal(res.status, 200, res.json && res.json.error);
  return { ...res.json, identity };
}

test('the door word is already set, so join is not waiting', async () => {
  const room = createRoom();
  const open = await request(room, { method: 'GET', pathname: '/api/join' });
  assert.equal(open.status, 200);
  assert.equal(open.json.waiting, false);
  assert.equal(open.json.needsWord, true);
  const blank = createRoom({ word: '' });
  const ada = await enter(blank, 'Ada');
  assert.equal(typeof ada.token, 'string');
});

test('a wrong room word does not open the door', async () => {
  const room = createRoom();
  const identity = await createIdentity();
  const bad = await request(room, {
    method: 'POST',
    pathname: '/api/join',
    json: { roomWord: 'nope', name: 'Ada', publicKey: identity.publicKey },
  });
  assert.equal(bad.status, 401);
  assert.equal(bad.json.needsWord, true);
  const still = await request(room, { method: 'GET', pathname: '/api/join' });
  assert.equal(still.json.waiting, false);
});

test('a locked place is not skipped when it does not open', () => {
  const stuck = gameCursor(0, [
    { id: 1, opened: false },
    { id: 2, opened: true },
  ]);
  assert.equal(stuck, 0);
  const moved = gameCursor(0, [
    { id: 1, opened: true },
    { id: 2, opened: true },
    { id: 3, opened: false },
  ]);
  assert.equal(moved, 2);
});

function stand(x, y, extra = {}) {
  return {
    map: 'town',
    x,
    y,
    facing: 'down',
    moving: 0,
    aim: 0,
    weapon: '',
    guard: 0,
    beam: 0,
    ...extra,
  };
}

test('both browsers see each other without reconnecting', async () => {
  const room = createRoom();
  const ada = await enter(room, 'Ada');
  const adaLive = room.openLive(ada.token);
  assert.ok(adaLive);
  const stood = adaLive.send({ type: 'place', place: stand(100, 120) });
  assert.equal(stood.persist, 'later');
  assert.equal(room.exportMeta().games.flat().length, 0);

  const bea = await enter(room, 'Bea');
  const beaLive = room.openLive(bea.token);
  const opening = beaLive.inbox.find((message) => message.type === 'places');
  const adaPlace = opening.places.find((place) => place.memberId === ada.memberId);
  assert.ok(adaPlace, 'B sees A on connect');
  assert.equal(adaPlace.x, 100);
  assert.equal(adaPlace.y, 120);
  assert.equal(adaPlace.map, 'town');
  assert.equal(adaPlace.facing, 'down');
  assert.equal(adaPlace.name, 'Ada');

  const before = beaLive.inbox.length;
  beaLive.send({ type: 'place', place: stand(40, 80, { facing: 'right', weapon: 'rifle' }) });
  assert.equal(beaLive.inbox.length, before, 'a place is not echoed to the sender');
  const seen = adaLive.inbox.filter((message) => message.type === 'place' && message.place.memberId === bea.memberId);
  assert.equal(seen.length, 1, 'A sees B without reconnecting');
  assert.equal(seen[0].place.x, 40);
  assert.equal(seen[0].place.y, 80);
  assert.equal(seen[0].place.weapon, 'rifle');

  beaLive.send({ type: 'place', place: stand(55, 80, { facing: 'right', moving: 1, aim: 0.4, weapon: 'rifle' }) });
  const later = adaLive.inbox.filter((message) => message.type === 'place' && message.place.memberId === bea.memberId);
  assert.equal(later.at(-1).place.x, 55);
  assert.equal(later.at(-1).place.moving, 1);
  assert.equal(later.at(-1).place.aim, 0.4);

  const shot = fireWeapon('rifle', { x: 100, y: 100 }, 0, { rng: () => 0.5 });
  shot.id = 'shot-1';
  shot.map = 'town';
  adaLive.send({ type: 'shot', shot });
  const delivered = beaLive.inbox.find((message) => message.type === 'shot');
  assert.ok(delivered, 'a shot is delivered to the other browser');
  assert.equal(delivered.shot.from, ada.memberId);
  assert.equal(delivered.shot.id, 'shot-1');
  assert.equal(adaLive.inbox.some((message) => message.type === 'shot'), false);
  const resolved = resolveShots([delivered.shot], [], [{ id: bea.memberId, invuln: 0, rect: hitBox({ x: 130, y: 108 }) }], 0.12);
  const hit = resolved.hits.find((item) => item.id === bea.memberId);
  assert.ok(hit, 'the shot still reaches the other cat');
  assert.equal(applyHit(3, hit.damage), 2);

  const view = await request(room, {
    method: 'GET',
    pathname: '/api/game',
    token: bea.token,
    search: 'since=0',
  });
  assert.equal(view.json.parcels.length, 0);
  assert.equal(view.json.places.find((place) => place.memberId === bea.memberId).x, 55);
  const rejected = await request(room, {
    method: 'POST',
    pathname: '/api/game',
    token: ada.token,
    json: { iv: 'aaaaaaaaaaaa', data: 'bbbbbbbbbbbbbbbb', kind: 'place' },
  });
  assert.equal(rejected.status, 400);
  assert.equal(room.exportMeta().games.flat().length, 0);
});

test('a duel ready and a games invite travel without a group key', async () => {
  const room = createRoom();
  const ada = await enter(room, 'Ada');
  const bea = await enter(room, 'Bea');
  const adaLive = room.openLive(ada.token);
  const beaLive = room.openLive(bea.token);
  const readySent = adaLive.send({ type: 'play', play: { kind: 'ready' } });
  assert.equal(readySent.persist, 'no');
  const ready = beaLive.inbox.find((message) => message.type === 'play' && message.play.kind === 'ready');
  assert.ok(ready, 'B hears that A is ready');
  assert.equal(ready.play.from, ada.memberId);
  assert.equal(ready.play.name, 'Ada');
  assert.equal(typeof ready.play.at, 'number');

  const round = `${ada.memberId}-1000`;
  adaLive.send({ type: 'play', play: { kind: 'duel', phase: 'invite', round, to: bea.memberId } });
  const invite = beaLive.inbox.find((message) => message.type === 'play' && message.play.phase === 'invite');
  assert.ok(invite, 'the games invite reaches B');
  assert.equal(invite.play.from, ada.memberId);
  assert.equal(invite.play.to, bea.memberId);
  assert.equal(invite.play.round, round);

  beaLive.send({ type: 'play', play: { kind: 'duel', phase: 'accept', round, startAt: 5000, to: ada.memberId } });
  const accepted = adaLive.inbox.find((message) => message.type === 'play' && message.play.phase === 'accept' && message.play.from === bea.memberId);
  assert.ok(accepted, 'A hears that B accepted');
  assert.equal(accepted.play.round, round);
  assert.equal(accepted.play.startAt, 5000);

  const view = await request(room, { method: 'GET', pathname: '/api/game', token: ada.token, search: 'since=0' });
  assert.equal(view.json.parcels.length, 0);
});

test('a quiet member drops off the live map', async () => {
  let time = 1_000_000;
  const room = createRoom({ now: () => time });
  const ada = await enter(room, 'Ada');
  const adaLive = room.openLive(ada.token);
  adaLive.send({ type: 'place', place: stand(10, 20) });
  time += 16000;
  const bea = await enter(room, 'Bea');
  const beaLive = room.openLive(bea.token);
  const opening = beaLive.inbox.find((message) => message.type === 'places');
  assert.equal(opening.places.some((place) => place.memberId === ada.memberId), false);
  assert.ok(adaLive.inbox.some((message) => message.type === 'gone' && message.memberId === ada.memberId));
});

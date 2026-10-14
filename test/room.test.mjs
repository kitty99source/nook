import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdentity, createGroupKey, decryptJson, encryptJson, unwrapGroupKey, wrapGroupKey } from '../public/e2e.js';
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

test('a late joiner sees someone standing, a move, and a shot that hits', async () => {
  const room = createRoom();
  const pushed = [];
  room.listen((message) => pushed.push(message));
  const ada = await enter(room, 'Ada');
  const bea = await enter(room, 'Bea');
  const group = await createGroupKey();
  for (const person of [ada, bea]) {
    const parcel = await wrapGroupKey(group.raw, person.identity.publicKey);
    const sent = await request(room, {
      method: 'POST',
      pathname: '/api/wrap',
      token: ada.token,
      json: {
        forMemberId: person.memberId,
        recipientPublic: person.identity.publicKey,
        ...parcel,
      },
    });
    assert.equal(sent.status, 200, sent.json && sent.json.error);
  }
  const poll = await request(room, {
    method: 'GET',
    pathname: '/api/poll',
    token: bea.token,
    search: 'since=0',
  });
  const wrap = poll.json.wraps.find((item) => item.forMemberId === bea.memberId);
  const opened = await unwrapGroupKey(bea.identity.privateKey, wrap);
  const key = opened.key;

  async function post(token, kind, body, from, seq) {
    const parcel = await encryptJson(key, { v: 2, kind, from, seq, body });
    const res = await request(room, {
      method: 'POST',
      pathname: '/api/game',
      token,
      json: { ...parcel, kind },
    });
    assert.equal(res.status, 200, res.json && res.json.error);
    return res.json.parcel;
  }

  await post(ada.token, 'place', { map: 'town', x: 100, y: 120, f: 'down', m: 0, name: 'Ada' }, ada.memberId, 1);
  const standing = await request(room, {
    method: 'GET',
    pathname: '/api/game',
    token: bea.token,
    search: 'since=0',
  });
  const first = standing.json.places.find((row) => row.memberId === ada.memberId);
  assert.ok(first, 'the second client can see the first already standing');
  const stood = await decryptJson(key, first);
  assert.equal(stood.kind, 'place');
  assert.equal(stood.body.x, 100);
  assert.equal(stood.body.y, 120);

  await post(ada.token, 'place', { map: 'town', x: 160, y: 120, f: 'right', m: 1, name: 'Ada' }, ada.memberId, 2);
  const moved = await request(room, {
    method: 'GET',
    pathname: '/api/game',
    token: bea.token,
    search: 'since=99',
  });
  assert.equal(moved.json.parcels.length, 0);
  const later = moved.json.places.find((row) => row.memberId === ada.memberId);
  const walked = await decryptJson(key, later);
  assert.equal(walked.body.x, 160);

  const shot = fireWeapon('rifle', { x: 100, y: 100 }, 0, { rng: () => 0.5 });
  shot.from = ada.memberId;
  shot.id = 'shot-1';
  shot.map = 'town';
  await post(ada.token, 'shot', shot, ada.memberId, 3);
  const pushedShot = pushed.find((message) => message.type === 'parcel' && message.parcel.memberId === ada.memberId && message.parcel.id === 3);
  assert.ok(pushedShot, 'the shot is pushed as it arrives');
  const fired = await decryptJson(key, pushedShot.parcel);
  assert.equal(fired.kind, 'shot');
  const defender = { x: 130, y: 108 };
  const resolved = resolveShots([fired.body], [], [{ id: bea.memberId, invuln: 0, rect: hitBox(defender) }], 0.12);
  const hit = resolved.hits.find((item) => item.id === bea.memberId);
  assert.ok(hit, 'the shot reaches the other cat');
  assert.equal(applyHit(3, hit.damage), 2);
});

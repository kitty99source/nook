// The maps for the town game. Pure data and builders, no drawing and no DOM.
// One tile is 16 world pixels. Positions are the feet of whoever stands there.

export const TILE = 16;

// Tiles that nobody walks through.
export const SOLID_TILES = new Set([' ', '^', 'w', 'f', '#', 'c', 'x', 'k', 'b', 't', 'g']);

function grid(cols, rows, ch) {
  return Array.from({ length: rows }, () => Array(cols).fill(ch));
}

function paint(g, c0, r0, c1, r1, ch) {
  for (let r = Math.max(0, r0); r < Math.min(g.length, r1); r += 1) {
    for (let c = Math.max(0, c0); c < Math.min(g[0].length, c1); c += 1) g[r][c] = ch;
  }
}

function rect(c, r, w = 1, h = 1) {
  return { x: c * TILE, y: r * TILE, w: w * TILE, h: h * TILE };
}

function feet(c, r) {
  return { x: c * TILE + TILE / 2, y: r * TILE + TILE - 2 };
}

function prop(kind, c, r, solid = true) {
  const at = feet(c, r);
  const body = solid ? { x: at.x - 6, y: at.y - 6, w: 12, h: 8 } : null;
  return { kind, x: at.x, y: at.y, solid: body };
}

// A building sits on the town ground. Its footprint is solid; the door is a strip under the front wall.
function building(id, kind, label, c, r, w, h, doorCol, to) {
  const foot = rect(c, r, w, h);
  const door = { x: (c + doorCol) * TILE, y: (r + h) * TILE - 2, w: TILE, h: 10 };
  return {
    id,
    kind,
    label,
    foot,
    door,
    to,
    spawn: { x: door.x + TILE / 2, y: door.y + 18 },
  };
}

function finish(map) {
  const rows = map.tiles.map((row) => row.join(''));
  const solids = [];
  for (const b of map.buildings || []) solids.push(b.foot);
  for (const p of map.props || []) if (p.solid) solids.push(p.solid);
  return {
    ...map,
    tiles: rows,
    cols: rows[0].length,
    rows: rows.length,
    w: rows[0].length * TILE,
    h: rows.length * TILE,
    solids: [...solids, ...(map.solids || [])],
    doors: [
      ...(map.doors || []),
      ...(map.buildings || []).map((b) => ({ ...b.door, to: b.to, label: b.label, id: b.id, enter: 'up' })),
    ],
  };
}

// Interior from a picture. D marks the way out.
function room(id, name, picture, extra = {}) {
  const tiles = picture.map((line) => line.split(''));
  const doors = [];
  tiles.forEach((row, r) => row.forEach((ch, c) => {
    if (ch === 'D') doors.push({ ...rect(c, r), to: 'town', label: 'Out', id: `${id}-out`, enter: 'down' });
  }));
  const door = doors[0];
  return finish({
    id,
    name,
    outdoor: false,
    tiles,
    doors,
    spawn: door ? { x: door.x + TILE / 2, y: door.y - 8 } : feet(2, 2),
    ...extra,
  });
}

export const TOWN_BUILDINGS = [
  building('observatory', 'observatory', 'Observatory', 26, 4, 8, 4, 3, 'observatory'),
  building('tavern', 'tavern', 'Tavern', 6, 7, 10, 5, 4, 'tavern'),
  building('market', 'market', 'Market', 40, 7, 10, 5, 5, 'market'),
  building('mallow', 'cottage', "Mallow's house", 4, 22, 7, 4, 3, 'mallow'),
  building('habs', 'habs', 'Hab block', 14, 23, 9, 4, 4, 'home'),
  building('cinema', 'cinema', 'Old cinema', 26, 27, 8, 4, 4, 'cinema'),
];

export const ARENA = {
  fence: rect(38, 22, 17, 13),
  inner: rect(39, 23, 15, 11),
  gate: rect(45, 22, 2, 1),
  starts: [feet(41, 28), feet(51, 28)],
  covers: [
    { x: 44 * TILE + 2, y: 26 * TILE + 4, w: 12, h: 10 },
    { x: 48 * TILE + 2, y: 30 * TILE + 4, w: 12, h: 10 },
    { x: 46 * TILE + 2, y: 28 * TILE + 4, w: 12, h: 10 },
  ],
};

export const STREET = rect(2, 14, 56, 7);

function townMap() {
  const g = grid(60, 40, '.');
  paint(g, 0, 0, 60, 3, ' ');
  paint(g, 0, 3, 60, 4, '^');
  paint(g, 0, 3, 1, 40, '^');
  paint(g, 59, 3, 60, 40, '^');
  paint(g, 0, 39, 60, 40, '^');
  // Moss patches and a crater pond.
  paint(g, 2, 5, 6, 13, ',');
  paint(g, 18, 6, 24, 11, ',');
  paint(g, 36, 5, 39, 13, ',');
  paint(g, 2, 28, 12, 38, ',');
  paint(g, 4, 31, 10, 36, 'w');
  paint(g, 24, 33, 36, 38, ',');
  // The shared street runs the width of town.
  paint(g, 1, 15, 59, 18, '=');
  // Plaza in the middle, walkways to each door.
  paint(g, 23, 12, 37, 23, ':');
  paint(g, 29, 8, 31, 12, ':');
  paint(g, 10, 12, 11, 15, ':');
  paint(g, 45, 12, 46, 15, ':');
  paint(g, 7, 18, 8, 22, ':');
  paint(g, 18, 18, 19, 23, ':');
  paint(g, 29, 23, 31, 27, ':');
  paint(g, 45, 18, 47, 22, ':');
  // Spaceport pad.
  paint(g, 51, 4, 59, 13, 'p');
  paint(g, 50, 12, 51, 15, ':');
  // The colosseum ring.
  const f = ARENA.fence;
  paint(g, f.x / TILE, f.y / TILE, (f.x + f.w) / TILE, (f.y + f.h) / TILE, 'f');
  const inner = ARENA.inner;
  paint(g, inner.x / TILE, inner.y / TILE, (inner.x + inner.w) / TILE, (inner.y + inner.h) / TILE, '_');
  paint(g, 45, 22, 47, 23, '_');

  const props = [
    prop('fountain', 30, 19),
    prop('lamp', 4, 14), prop('lamp', 16, 14), prop('lamp', 22, 18), prop('lamp', 38, 18),
    prop('lamp', 48, 14), prop('lamp', 56, 18),
    prop('crystal', 3, 6), prop('crystal', 20, 7), prop('crystal', 37, 6), prop('crystal', 22, 10),
    prop('crystal', 3, 27), prop('crystal', 12, 29), prop('crystal', 25, 35), prop('crystal', 35, 34),
    prop('crystal', 57, 22), prop('crystal', 56, 33), prop('crystal', 14, 36),
    prop('rock', 17, 9), prop('rock', 35, 9), prop('rock', 12, 33), prop('rock', 22, 31),
    prop('rock', 56, 27), prop('rock', 36, 25),
    prop('bench', 25, 13), prop('bench', 34, 13),
    prop('rocket', 55, 9),
    prop('crate', 52, 12),
    prop('antenna', 57, 5),
    ...ARENA.covers.map((c) => ({ kind: 'pillar', x: c.x + c.w / 2, y: c.y + c.h, solid: c })),
  ];
  // The rocket is big; give it a wider base.
  const rocket = props.find((p) => p.kind === 'rocket');
  rocket.solid = { x: rocket.x - 14, y: rocket.y - 12, w: 28, h: 14 };

  const spots = [
    { id: 'rocket', kind: 'rocket', label: 'Rocket', x: rocket.x, y: rocket.y + 8, reach: 30 },
    { id: 'crate', kind: 'clue', clue: 'hatch', label: 'Stuck crate', x: feet(52, 12).x, y: feet(52, 12).y + 6, reach: 22 },
    { id: 'arena-gate', kind: 'arena', label: 'Colosseum gate', x: ARENA.gate.x + TILE, y: ARENA.gate.y - 4, reach: 28 },
    { id: 'fountain', kind: 'flavour', label: 'Fountain', x: feet(30, 19).x, y: feet(30, 19).y + 6, reach: 22 },
  ];

  return finish({
    id: 'town',
    name: 'Lantern Moon',
    outdoor: true,
    tiles: g,
    buildings: TOWN_BUILDINGS,
    props,
    spots,
    npcs: [{ id: 'pip', x: feet(27, 20).x, y: feet(27, 20).y, wander: 40 }],
    street: STREET,
    arena: ARENA,
    spawn: feet(30, 16),
  });
}

function tavernMap() {
  return room('tavern', 'Tavern', [
    '##############',
    '#kk..rrrr..kk#',
    '#............#',
    '#.cccccccc...#',
    '#...........t#',
    '#.t.s....s..t#',
    '#.t.s..t.....#',
    '#......t..s..#',
    '#............#',
    '######D#######',
  ], {
    spots: [{ id: 'bar', kind: 'tavern', label: 'Bar', x: 6 * TILE, y: 4 * TILE + 10, reach: 30 }],
    npcs: [{ id: 'unit9', x: 6 * TILE, y: 2 * TILE + 12, wander: 0 }],
  });
}

function marketMap() {
  return room('market', 'Market', [
    '##############',
    '#k.k.k..k.k.k#',
    '#............#',
    '#..cccc..cccc#',
    '#............#',
    '#.k..........#',
    '#.k...rrrr...#',
    '#.....rrrr..k#',
    '#............#',
    '######D#######',
  ], {
    spots: [{ id: 'stall', kind: 'market', label: 'Stall', x: 5 * TILE, y: 4 * TILE + 10, reach: 30 }],
    npcs: [{ id: 'zib', x: 5 * TILE, y: 2 * TILE + 12, wander: 20 }],
  });
}

function mallowMap() {
  return room('mallow', "Mallow's house", [
    '############',
    '#bb..kk..kk#',
    '#..........#',
    '#..rrrr....#',
    '#..rrrr..t.#',
    '#........t.#',
    '#k.........#',
    '#..........#',
    '###D########',
  ], {
    spots: [{ id: 'photo', kind: 'flavour', label: 'Old photo', x: 6 * TILE, y: 2 * TILE + 6, reach: 20 }],
    npcs: [{ id: 'mallow', x: 7 * TILE, y: 5 * TILE, wander: 24 }],
  });
}

function observatoryMap() {
  return room('observatory', 'Observatory', [
    '############',
    '#k...gg...k#',
    '#....gg....#',
    '#..........#',
    '#.t......t.#',
    '#..........#',
    '#k........k#',
    '#..........#',
    '#..........#',
    '#####D######',
  ], {
    spots: [{ id: 'telescope', kind: 'clue', clue: 'lens', label: 'Telescope', x: 6 * TILE, y: 3 * TILE + 6, reach: 24 }],
    npcs: [{ id: 'orla', x: 3 * TILE, y: 7 * TILE, wander: 16 }],
  });
}

function cinemaMap() {
  return room('cinema', 'Old cinema', [
    '##############',
    '#kkkkkkkkkkkk#',
    '#............#',
    '#.ss.ss.ss.ss#',
    '#............#',
    '#.ss.ss.ss.ss#',
    '#..........k.#',
    '#..........g.#',
    '######D#######',
  ], {
    spots: [{ id: 'projector', kind: 'clue', clue: 'reel', label: 'Projector', x: 11 * TILE + 8, y: 7 * TILE - 2, reach: 24 }],
  });
}

// Home is an abandoned station. Patch one is clear; the rest stay under debris until bought.
export const HOME_PATCHES = [
  { c: 1, w: 5, cost: 0 },
  { c: 6, w: 5, cost: 10 },
  { c: 11, w: 5, cost: 14 },
  { c: 16, w: 5, cost: 18 },
].map((p) => ({ ...p, x: p.c * TILE, wpx: p.w * TILE }));

export const WORK_SPOTS = {
  mine: { c: 8, r: 2 },
  studio: { c: 13, r: 2 },
  vat: { c: 18, r: 2 },
};

export function homeMap(patches = 1) {
  const open = Math.min(HOME_PATCHES.length, Math.max(1, Math.floor(Number(patches) || 1)));
  const picture = [
    '######################',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '##D###################',
  ].map((line) => line.split(''));
  for (let i = open; i < HOME_PATCHES.length; i += 1) {
    const p = HOME_PATCHES[i];
    paint(picture, p.c, 1, p.c + p.w, 8, 'x');
  }
  const spots = [{ id: 'panel', kind: 'home', label: 'Door panel', x: 3 * TILE, y: 7 * TILE + 10, reach: 22 }];
  const ids = ['mine', 'studio', 'vat'];
  ids.forEach((id, i) => {
    if (open < i + 2) return;
    const at = WORK_SPOTS[id];
    picture[at.r][at.c] = 'k';
    spots.push({ id, kind: 'work', label: id, x: at.c * TILE + 8, y: (at.r + 1) * TILE + 8, reach: 22 });
  });
  const map = room('home', 'Home', picture.map((row) => row.join('')), { spots });
  return { ...map, openPatches: open, openSpan: { x: TILE, w: HOME_PATCHES[open - 1].x + HOME_PATCHES[open - 1].wpx - TILE } };
}

function planetMap() {
  const g = grid(36, 26, '*');
  paint(g, 0, 0, 36, 3, ' ');
  paint(g, 0, 3, 36, 4, '^');
  paint(g, 0, 3, 1, 26, '^');
  paint(g, 35, 3, 36, 26, '^');
  paint(g, 0, 25, 36, 26, '^');
  paint(g, 14, 10, 22, 16, 'p');
  paint(g, 4, 18, 11, 23, 'w');
  const props = [
    prop('rocket', 18, 12),
    prop('crystal', 5, 6), prop('crystal', 9, 8), prop('crystal', 27, 7), prop('crystal', 30, 15),
    prop('crystal', 24, 21), prop('crystal', 13, 21), prop('rock', 6, 13), prop('rock', 29, 20),
  ];
  const rocket = props[0];
  rocket.solid = { x: rocket.x - 14, y: rocket.y - 12, w: 28, h: 14 };
  return finish({
    id: 'planet2',
    name: 'Velvet Reach',
    outdoor: true,
    tiles: g,
    props,
    spots: [{ id: 'rocket-home', kind: 'rocket-home', label: 'Rocket home', x: rocket.x, y: rocket.y + 8, reach: 30 }],
    npcs: [],
    spawn: feet(18, 14),
  });
}

const BUILDERS = {
  town: townMap,
  tavern: tavernMap,
  market: marketMap,
  mallow: mallowMap,
  observatory: observatoryMap,
  cinema: cinemaMap,
  planet2: planetMap,
};

const cache = new Map();

export function getMap(id, opts = {}) {
  if (id === 'home') return homeMap(opts.patches || 1);
  const build = BUILDERS[id] || BUILDERS.town;
  const key = BUILDERS[id] ? id : 'town';
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

export function worldMap() {
  return getMap('town');
}

export function buildingFor(mapId) {
  return TOWN_BUILDINGS.find((b) => b.to === mapId) || null;
}

export function tileAt(map, px, py) {
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  if (r < 0 || r >= map.rows || c < 0 || c >= map.cols) return ' ';
  return map.tiles[r][c];
}

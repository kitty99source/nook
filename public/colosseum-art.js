// Original pixel art for the town game. Everything is drawn in code at one pixel per
// world pixel, cached on small canvases, and scaled up without smoothing.

import { TILE } from './colosseum-world.mjs';

const INK = '#2a2040';

export const COATS = {
  cream: ['#f3dfc1', '#d4b48a', '#fff6e6'],
  grey: ['#aeb0c4', '#7d7f98', '#e8e9f2'],
  ginger: ['#f0a35a', '#c9742f', '#ffe2bd'],
  mint: ['#8fe0b0', '#4fae7f', '#dcfbe8'],
  lilac: ['#c9b2f0', '#9a7fd0', '#f1e9ff'],
  black: ['#4b4560', '#332e47', '#8a84a3'],
  enemy: ['#7b4bb8', '#4c2a80', '#b48ce8'],
};

const LOOK_COAT = { suit: 'cream', visor: 'grey', jet: 'ginger', alien: 'mint' };

function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hexRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex, amount) {
  const [r, g, b] = hexRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function px(g, x, y, colour, w = 1, h = 1) {
  g.fillStyle = colour;
  g.fillRect(x, y, w, h);
}

// ---- Cats -----------------------------------------------------------------
// Templates are 16 wide. o outline, c coat, d coat shade, l light, e eye, w shine,
// n nose, s suit, S suit shade, a accent. Front and back are mirrored from a left half.

const FRONT_HALF = [
  '........',
  '..o.....',
  '..oo....',
  '..ono...',
  '.occoooo',
  '.occcccc',
  '.occwecc',
  '.occeecc',
  '.odcllll',
  '..odclln',
  '...ooooo',
  '..osssaa',
  '.ocosssS',
  '.ocossss',
  '..oosssS',
];

const BACK_HALF = [
  '........',
  '..o.....',
  '..oo....',
  '..odo...',
  '.occoooo',
  '.occcccc',
  '.occcccc',
  '.odcccdc',
  '.odcccdd',
  '..oddddd',
  '...ooooo',
  '..osssss',
  '.ocosssS',
  '.ocossSs',
  '..oossss',
];

const SIDE = [
  '................',
  '......o..o......',
  '......oo.oo.....',
  '.....ocoooco....',
  '.....occccccо...',
  '.....occcccccо..',
  '.....occccccwe..',
  '.....odcccccee..',
  '.....odccclllno.',
  '......oddcllloo.',
  '.......ooooooo..',
  '......osssssa...',
  '......ossSsco...',
  '......ossssco...',
  '.......osssso...',
].map((row) => row.replace(/о/g, 'o'));

function mirror(half) {
  return half.map((row) => row + [...row].reverse().join(''));
}

const FRONT = mirror(FRONT_HALF);
const BACK = mirror(BACK_HALF);

function fixSide(rows) {
  // Make sure the outline closes on the snout side.
  return rows.map((row, i) => {
    const r = row.padEnd(16, '.').slice(0, 16).split('');
    if (i === 4) r[12] = 'o';
    if (i === 5) r[13] = 'o';
    if (i >= 6 && i <= 7) r[14] = 'o';
    return r.join('');
  });
}

const SIDE_FIXED = fixSide(SIDE);

const spriteCache = new Map();

function catColours({ look = 'suit', coat, suit = '#3ec6c6', enemy = false }) {
  const fur = COATS[enemy ? 'enemy' : coat || LOOK_COAT[look] || 'cream'] || COATS.cream;
  const body = enemy ? '#3b3550' : suit;
  return {
    o: INK,
    c: fur[0],
    d: fur[1],
    l: fur[2],
    e: enemy ? '#ff3b4e' : '#1b1530',
    w: enemy ? '#ffd0d6' : '#ffffff',
    n: enemy ? '#2b1640' : '#f28aa5',
    s: body,
    S: shade(body, -0.28),
    a: enemy ? '#7dff6a' : shade(body, 0.45),
  };
}

function drawTemplate(g, rows, colours, ox, oy) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === '.') continue;
      const colour = colours[ch];
      if (colour) px(g, ox + x, oy + y, colour);
    }
  });
}

function drawLegs(g, facing, frame, colours, ox, oy) {
  const boot = colours.S;
  const lift = [0, 1, 0, 2][frame % 4];
  if (facing === 'left' || facing === 'right') {
    const a = frame % 2 === 1 ? -1 : 0;
    const b = frame % 2 === 1 ? 1 : 0;
    px(g, ox + 7 + a, oy + 15, INK, 3, 3);
    px(g, ox + 8 + a, oy + 15, boot, 1, 2);
    px(g, ox + 10 + b, oy + 15, INK, 3, 3);
    px(g, ox + 11 + b, oy + 15, boot, 1, 2);
    return;
  }
  const leftUp = lift === 1 ? 1 : 0;
  const rightUp = lift === 2 ? 1 : 0;
  px(g, ox + 4, oy + 15 - leftUp, INK, 4, 3);
  px(g, ox + 5, oy + 15 - leftUp, boot, 2, 2);
  px(g, ox + 8, oy + 15 - rightUp, INK, 4, 3);
  px(g, ox + 9, oy + 15 - rightUp, boot, 2, 2);
}

function drawTail(g, facing, frame, colours, ox, oy, enemy) {
  const sway = frame % 2;
  const c = colours.c;
  const d = colours.d;
  if (facing === 'up') {
    px(g, ox + 7, oy + 14, INK, 2, 3);
    px(g, ox + 7 + sway, oy + 15, d, 1, 2);
    px(g, ox + 6 + sway * 3, oy + 17, INK, 2, 1);
  } else if (facing === 'down') {
    px(g, ox + 13, oy + 10 - sway, INK, 2, 4);
    px(g, ox + 13, oy + 10 - sway, c, 1, 3);
    px(g, ox + 14, oy + 9 - sway, INK, 1, 1);
  } else {
    px(g, ox + 2, oy + 9 + sway, INK, 2, 1);
    px(g, ox + 3, oy + 10 + sway, INK, 1, 3);
    px(g, ox + 4, oy + 12, INK, 3, 2);
    px(g, ox + 3, oy + 10 + sway, c, 1, 2);
    px(g, ox + 4, oy + 12, d, 2, 1);
    if (enemy) px(g, ox + 1, oy + 8 + sway, '#7dff6a', 1, 1);
  }
}

function drawLook(g, look, facing, colours, ox, oy, frame) {
  const side = facing === 'left' || facing === 'right';
  if (look === 'suit') {
    // Bubble helmet over the head.
    g.fillStyle = 'rgba(190, 240, 255, 0.22)';
    g.beginPath();
    g.ellipse(ox + 8, oy + 6, 7.5, 6.5, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(210, 248, 255, 0.85)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(ox + 8, oy + 6, 7.5, 6.5, 0, 0, Math.PI * 2);
    g.stroke();
    px(g, ox + (side ? 9 : 4), oy + 2, '#ffffff', 2, 1);
    px(g, ox + (side ? 11 : 3), oy + 3, '#ffffff', 1, 1);
    px(g, ox + 3, oy + 11, colours.a, 10, 1);
  } else if (look === 'visor') {
    if (facing === 'up') {
      px(g, ox + 2, oy + 6, colours.a, 12, 1);
    } else if (side) {
      px(g, ox + 9, oy + 6, INK, 6, 2);
      px(g, ox + 10, oy + 6, colours.a, 5, 1);
      px(g, ox + 13, oy + 7, '#ffffff', 1, 1);
    } else {
      px(g, ox + 2, oy + 6, INK, 12, 2);
      px(g, ox + 3, oy + 6, colours.a, 10, 1);
      px(g, ox + 4, oy + 6, '#ffffff', 2, 1);
    }
  } else if (look === 'jet') {
    const pack = '#8b93a8';
    if (facing === 'up') {
      px(g, ox + 4, oy + 10, INK, 8, 6);
      px(g, ox + 5, oy + 11, pack, 6, 4);
      px(g, ox + 5, oy + 11, '#c4cbdc', 6, 1);
      px(g, ox + 6, oy + 16, frame % 2 ? '#ffd166' : '#ff8a3d', 1, 2);
      px(g, ox + 9, oy + 16, frame % 2 ? '#ff8a3d' : '#ffd166', 1, 2);
    } else if (side) {
      px(g, ox + 4, oy + 10, INK, 3, 5);
      px(g, ox + 5, oy + 11, pack, 1, 3);
    } else {
      px(g, ox + 4, oy + 11, '#5b6378', 1, 3);
      px(g, ox + 11, oy + 11, '#5b6378', 1, 3);
    }
    // Goggles on the forehead.
    if (facing !== 'up') {
      if (side) px(g, ox + 9, oy + 4, '#ffd166', 3, 1);
      else {
        px(g, ox + 4, oy + 4, '#ffd166', 3, 1);
        px(g, ox + 9, oy + 4, '#ffd166', 3, 1);
      }
    }
  } else if (look === 'alien') {
    px(g, ox + 7, oy - 2, INK, 2, 4);
    px(g, ox + 7, oy - 3, colours.a, 2, 2);
    if (facing === 'down') {
      px(g, ox + 7, oy + 4, INK, 2, 2);
      px(g, ox + 7, oy + 4, '#1b1530', 2, 1);
      px(g, ox + 8, oy + 4, '#ffffff', 1, 1);
    } else if (side) {
      px(g, ox + 11, oy + 4, '#1b1530', 1, 1);
    }
  }
}

function drawEnemyExtras(g, facing, ox, oy) {
  const glow = '#ff3b4e';
  // Spiked ears and a third red eye.
  if (facing === 'down' || facing === 'up') {
    px(g, ox + 1, oy + 1, INK, 2, 2);
    px(g, ox + 13, oy + 1, INK, 2, 2);
  } else {
    px(g, ox + 5, oy + 1, INK, 1, 2);
  }
  if (facing === 'down') {
    px(g, ox + 7, oy + 4, INK, 2, 2);
    px(g, ox + 7, oy + 4, glow, 2, 1);
  } else if (facing !== 'up') {
    px(g, ox + 11, oy + 4, glow, 1, 1);
  }
  px(g, ox + 4, oy + 12, '#7dff6a', 1, 1);
  px(g, ox + 11, oy + 12, '#7dff6a', 1, 1);
}

export const SPRITE_W = 20;
export const SPRITE_H = 24;
const ORIGIN_X = 2;
const ORIGIN_Y = 4;

export function catSprite({ look = 'suit', coat = '', suit = '#3ec6c6', facing = 'down', frame = 0, enemy = false, flash = false }) {
  const f = facing === 'left' ? 'right' : facing;
  const key = `${look}|${coat}|${suit}|${f}|${frame % 4}|${enemy ? 1 : 0}|${flash ? 1 : 0}`;
  const hit = spriteCache.get(key);
  if (hit) return { canvas: hit, flip: facing === 'left' };
  const [canvas, g] = makeCanvas(SPRITE_W, SPRITE_H);
  const colours = catColours({ look, coat, suit, enemy });
  const rows = f === 'up' ? BACK : f === 'down' ? FRONT : SIDE_FIXED;
  if (f === 'up' || f === 'right') drawTail(g, f, frame, colours, ORIGIN_X, ORIGIN_Y, enemy);
  if (look === 'jet' && f === 'right' && !enemy) drawLook(g, 'jet', f, colours, ORIGIN_X, ORIGIN_Y, frame);
  drawLegs(g, f, frame, colours, ORIGIN_X, ORIGIN_Y);
  drawTemplate(g, rows, colours, ORIGIN_X, ORIGIN_Y);
  if (f === 'down') drawTail(g, f, frame, colours, ORIGIN_X, ORIGIN_Y, enemy);
  if (enemy) drawEnemyExtras(g, f, ORIGIN_X, ORIGIN_Y);
  else if (!(look === 'jet' && f === 'right')) drawLook(g, look, f, colours, ORIGIN_X, ORIGIN_Y, frame);
  if (flash) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    g.globalCompositeOperation = 'source-over';
  }
  spriteCache.set(key, canvas);
  return { canvas, flip: facing === 'left' };
}

// Draws a cat with its feet at (x, y) in world pixels.
export function drawCat(ctx, x, y, opts, scale = 1) {
  const frame = opts.moving ? Math.floor((opts.step || 0) * 8) % 4 : 0;
  const sprite = catSprite({ ...opts, frame });
  const w = SPRITE_W * scale;
  const h = SPRITE_H * scale;
  const bob = opts.moving && frame % 2 ? -1 : 0;
  ctx.fillStyle = 'rgba(20, 10, 40, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 6 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  const left = Math.round(x - (ORIGIN_X + 8) * scale);
  const top = Math.round(y - (ORIGIN_Y + 18) * scale + bob);
  if (sprite.flip) {
    ctx.save();
    ctx.translate(left + w, top);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite.canvas, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(sprite.canvas, left, top, w, h);
  }
}

// A face for the menus.
export function paintFace(colour, look = 'suit') {
  const [canvas, g] = makeCanvas(SPRITE_W, SPRITE_H);
  g.drawImage(catSprite({ look, suit: colour, facing: 'down' }).canvas, 0, 0);
  canvas.className = 'pixel-face';
  return canvas;
}

// ---- Ground tiles ------------------------------------------------------------

const FLOORS = {
  wood: ['#b98a5e', '#a5774d', '#c99a6c'],
  metal: ['#8d97b0', '#78819b', '#a2abc2'],
  carpet: ['#7a4a6a', '#6a3d5c', '#8b5679'],
  cinema: ['#6b2f3f', '#5a2635', '#7d3a4c'],
};

const MAP_FLOOR = {
  tavern: 'wood',
  market: 'metal',
  mallow: 'wood',
  observatory: 'metal',
  cinema: 'cinema',
  home: 'metal',
};

function speckle(g, x0, y0, colours, n, seed) {
  for (let i = 0; i < n; i += 1) {
    const x = Math.floor(hash(x0 + i, y0, seed) * 16);
    const y = Math.floor(hash(x0, y0 + i, seed + 3) * 16);
    px(g, x0 + x, y0 + y, colours[i % colours.length]);
  }
}

function drawTile(g, map, tileChar, c, r) {
  let ch = tileChar;
  const x = c * TILE;
  const y = r * TILE;
  const below = r + 1 < map.rows ? map.tiles[r + 1][c] : ' ';
  const above = r > 0 ? map.tiles[r - 1][c] : ' ';
  const h = (i) => hash(c, r, i);
  if (!map.outdoor && ch === '.') ch = 'floor';
  switch (ch) {
    case ' ':
      return;
    case '^': {
      px(g, x, y, '#3a3556', 16, 16);
      px(g, x, y + 12, '#2a2540', 16, 4);
      px(g, x, y + 3, '#c9d3e8', 16, 2);
      px(g, x, y + 5, '#6e7896', 16, 1);
      if (c % 2 === 0) px(g, x + 2, y + 3, '#9aa6c4', 2, 9);
      if (above === ' ' || r === 0) px(g, x, y, '#1e1a33', 16, 2);
      return;
    }
    case ',':
    case '.':
    case '_':
    case '*': {
      const base = ch === '_' ? ['#ead39c', '#d8bd80', '#f5e3b6']
        : ch === '*' ? ['#6b4a9a', '#583c82', '#7f5cb0']
          : ['#e6c09a', '#d6aa82', '#f2d4b4'];
      px(g, x, y, base[0], 16, 16);
      speckle(g, x, y, [base[1], base[2]], 10, ch.charCodeAt(0));
      if (h(1) < 0.18) {
        const rx = x + 3 + Math.floor(h(2) * 9);
        const ry = y + 3 + Math.floor(h(3) * 9);
        px(g, rx, ry, base[1], 3, 2);
        px(g, rx, ry, base[2], 2, 1);
      }
      if (ch === '_' && r % 2 === 0) px(g, x, y + 7, '#dcc48a', 16, 1);
      if (ch === '*' && h(4) < 0.2) {
        const cx = x + 4 + Math.floor(h(5) * 8);
        const cy = y + 4 + Math.floor(h(6) * 8);
        px(g, cx, cy, '#ff9de2', 1, 2);
        px(g, cx + 1, cy + 1, '#ffd1f2', 1, 1);
      }
      if (ch === ',') {
        for (let i = 0; i < 5; i += 1) {
          const tx = x + Math.floor(h(10 + i) * 14);
          const ty = y + 2 + Math.floor(h(20 + i) * 12);
          px(g, tx, ty, '#3f8f80', 1, 2);
          px(g, tx + 1, ty - 1, '#5fc4a6', 1, 3);
          px(g, tx + 2, ty, '#3f8f80', 1, 2);
        }
      }
      return;
    }
    case '=': {
      px(g, x, y, '#4e4c6c', 16, 16);
      speckle(g, x, y, ['#5a5878', '#45435f'], 8, 7);
      if (above !== '=') px(g, x, y, '#8f8cb0', 16, 2);
      if (below !== '=') px(g, x, y + 14, '#36344d', 16, 2);
      if (above === '=' && below === '=' && c % 2 === 0) px(g, x + 3, y + 7, '#f5d76e', 9, 2);
      return;
    }
    case ':':
    case 'p': {
      const pad = ch === 'p';
      px(g, x, y, pad ? '#5a6079' : '#a3b4c9', 16, 16);
      px(g, x, y, pad ? '#4a4f66' : '#8597ae', 16, 1);
      px(g, x, y, pad ? '#4a4f66' : '#8597ae', 1, 16);
      px(g, x + 2, y + 2, pad ? '#6c7290' : '#c3d0df', 1, 1);
      px(g, x + 13, y + 13, pad ? '#6c7290' : '#c3d0df', 1, 1);
      if (pad && (above !== 'p' || below !== 'p')) {
        for (let i = 0; i < 16; i += 4) px(g, x + i, above !== 'p' ? y : y + 14, (i / 4 + c) % 2 ? '#f5c542' : '#22202e', 4, 2);
      }
      return;
    }
    case 'w': {
      px(g, x, y, '#2fb59a', 16, 16);
      px(g, x + 1, y + 1, '#55e6c0', 14, 13);
      speckle(g, x, y, ['#9cffe4', '#3fcfa9'], 6, 11);
      if (above !== 'w') px(g, x, y, '#1f7d6c', 16, 3);
      return;
    }
    case 'f': {
      px(g, x, y, '#e6c09a', 16, 16);
      speckle(g, x, y, ['#d6aa82'], 6, 4);
      const vertical = above === 'f' || below === 'f';
      const horizontal = (c > 0 && map.tiles[r][c - 1] === 'f') || (c + 1 < map.cols && map.tiles[r][c + 1] === 'f');
      if (horizontal) {
        px(g, x, y + 6, '#6e5a8a', 16, 2);
        px(g, x, y + 10, '#6e5a8a', 16, 1);
      }
      if (vertical) px(g, x + 7, y, '#6e5a8a', 2, 16);
      px(g, x + 6, y + 3, INK, 4, 10);
      px(g, x + 7, y + 3, '#f2a541', 2, 9);
      return;
    }
    default:
      break;
  }
  // Interior tiles.
  const floor = FLOORS[MAP_FLOOR[map.id] || 'wood'];
  const drawFloor = () => {
    px(g, x, y, floor[0], 16, 16);
    if (floor === FLOORS.wood) {
      px(g, x, y + 7, floor[1], 16, 1);
      px(g, x, y + 15, floor[1], 16, 1);
      px(g, x + ((r % 2) ? 5 : 11), y, floor[1], 1, 7);
      px(g, x + ((r % 2) ? 11 : 4), y + 8, floor[1], 1, 7);
    } else {
      px(g, x, y, floor[1], 16, 1);
      px(g, x, y, floor[1], 1, 16);
      px(g, x + 1, y + 1, floor[2], 1, 1);
    }
  };
  switch (ch) {
    case '#': {
      const face = below !== '#' && below !== 'D' && r + 1 < map.rows;
      if (face) {
        px(g, x, y, '#4f4170', 16, 16);
        px(g, x, y, '#2e2448', 16, 3);
        px(g, x, y + 3, '#6a5a92', 16, 1);
        px(g, x, y + 13, '#3b3058', 16, 3);
        if (c % 3 === 0) px(g, x + 7, y + 5, '#5d4e84', 2, 7);
        if (map.id === 'home' && c % 4 === 1) px(g, x + 3, y + 6, '#7de3ff', 4, 3);
        if ((map.id === 'tavern' || map.id === 'mallow') && c % 5 === 2) {
          px(g, x + 3, y + 5, INK, 10, 7);
          px(g, x + 4, y + 6, '#1c1a3a', 8, 5);
          px(g, x + 5, y + 7, '#ffffff', 1, 1);
          px(g, x + 10, y + 9, '#ffd166', 1, 1);
        }
      } else {
        px(g, x, y, '#2e2448', 16, 16);
        px(g, x + 1, y + 1, '#382c55', 14, 14);
      }
      return;
    }
    case 'r': {
      drawFloor();
      px(g, x, y + 1, '#9b3d5c', 16, 14);
      px(g, x, y + 3, '#d9a04a', 16, 1);
      px(g, x, y + 12, '#d9a04a', 16, 1);
      if ((c + r) % 2 === 0) px(g, x + 6, y + 6, '#d9a04a', 4, 4);
      return;
    }
    case 'c': {
      drawFloor();
      px(g, x, y + 2, INK, 16, 13);
      px(g, x, y + 3, '#c98a4b', 16, 4);
      px(g, x, y + 3, '#e0a868', 16, 1);
      px(g, x, y + 7, '#7b4a2a', 16, 7);
      px(g, x + 3, y + 9, '#5f3820', 2, 3);
      if (map.id === 'market' && c % 2) {
        px(g, x + 4, y, '#ff7a8a', 3, 3);
        px(g, x + 9, y + 1, '#f0c14a', 3, 2);
      }
      if (map.id === 'tavern' && c % 3 === 0) {
        px(g, x + 5, y - 1, INK, 4, 4);
        px(g, x + 6, y, '#ffd166', 2, 2);
      }
      return;
    }
    case 't': {
      drawFloor();
      px(g, x + 2, y + 2, INK, 12, 10);
      px(g, x + 3, y + 3, '#b0703f', 10, 5);
      px(g, x + 3, y + 3, '#d08b52', 10, 1);
      px(g, x + 3, y + 8, '#7b4a2a', 10, 3);
      px(g, x + 6, y + 12, INK, 4, 3);
      px(g, x + 7, y + 4, '#9bf6ff', 2, 2);
      return;
    }
    case 's': {
      drawFloor();
      px(g, x + 4, y + 5, INK, 8, 8);
      px(g, x + 5, y + 6, map.id === 'cinema' ? '#c0394f' : '#8a5a36', 6, 5);
      px(g, x + 5, y + 6, map.id === 'cinema' ? '#e05a6d' : '#a8713f', 6, 1);
      return;
    }
    case 'k': {
      drawFloor();
      px(g, x + 1, y, INK, 14, 15);
      px(g, x + 2, y + 1, '#6a4a7a', 12, 13);
      px(g, x + 2, y + 6, INK, 12, 1);
      px(g, x + 3, y + 2, '#9bf6ff', 2, 3);
      px(g, x + 7, y + 3, '#ffd166', 2, 2);
      px(g, x + 10, y + 2, '#ff7a8a', 2, 3);
      px(g, x + 4, y + 8, '#f0c14a', 3, 4);
      px(g, x + 9, y + 9, '#7dcea0', 3, 3);
      return;
    }
    case 'b': {
      drawFloor();
      px(g, x, y + 1, INK, 16, 14);
      px(g, x + 1, y + 2, '#e8e2f5', 14, 4);
      px(g, x + 1, y + 6, '#6a7fd0', 14, 8);
      px(g, x + 1, y + 6, '#8a9fe8', 14, 1);
      return;
    }
    case 'g': {
      drawFloor();
      px(g, x + 1, y + 4, INK, 14, 11);
      px(g, x + 2, y + 5, '#5a6481', 12, 9);
      px(g, x + 3, y + 6, '#9bf6ff', 3, 2);
      return;
    }
    case 'x': {
      px(g, x, y, '#1d1830', 16, 16);
      speckle(g, x, y, ['#2b2442', '#3a3156', '#4a3f6a'], 18, 9);
      if (h(1) < 0.4) {
        px(g, x + 2, y + 4 + Math.floor(h(2) * 6), '#5d5478', 12, 2);
      }
      if (h(3) < 0.25) px(g, x + 5, y + 5, '#f5c542', 6, 1);
      return;
    }
    case 'D': {
      drawFloor();
      px(g, x + 2, y + 2, '#3a7d6a', 12, 12);
      px(g, x + 6, y + 6, '#bff5e0', 4, 1);
      px(g, x + 7, y + 7, '#bff5e0', 2, 3);
      return;
    }
    default:
      drawFloor();
  }
}

const groundCache = new Map();

export function groundLayer(map) {
  const key = `${map.id}:${map.tiles.join('')}`;
  if (groundCache.has(key)) return groundCache.get(key);
  const [canvas, g] = makeCanvas(map.w, map.h);
  for (let r = 0; r < map.rows; r += 1) {
    for (let c = 0; c < map.cols; c += 1) drawTile(g, map, map.tiles[r][c], c, r);
  }
  // Rocket pad ring.
  if (map.outdoor) {
    const pads = [];
    map.tiles.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'p') pads.push([c, r]); }));
    if (pads.length) {
      const xs = pads.map((p) => p[0]);
      const ys = pads.map((p) => p[1]);
      const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * TILE;
      const cy = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * TILE;
      g.strokeStyle = '#f5c542';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(cx, cy + 6, 34, 22, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  if (groundCache.size > 12) groundCache.clear();
  groundCache.set(key, canvas);
  return canvas;
}

// ---- Buildings and props -------------------------------------------------------

const BUILDING_STYLE = {
  tavern: { wall: '#b06a3c', trim: '#7a4423', roof: '#d9643a', roofDark: '#a8452a', glow: '#ffd166' },
  market: { wall: '#3f8f9a', trim: '#2a616a', roof: '#4a5b8a', roofDark: '#36446a', glow: '#9bf6ff' },
  observatory: { wall: '#d8dde8', trim: '#9aa3b8', roof: '#eef1f7', roofDark: '#b9c1d3', glow: '#9bf6ff' },
  cottage: { wall: '#5a7fc4', trim: '#3c5a98', roof: '#7a5ab0', roofDark: '#5a3f88', glow: '#ffd166' },
  habs: { wall: '#8b93a8', trim: '#5f667c', roof: '#5f667c', roofDark: '#474d60', glow: '#7de3ff' },
  cinema: { wall: '#8a2f45', trim: '#5e1e30', roof: '#3b2a4a', roofDark: '#2a1e36', glow: '#ffd166' },
};

const buildingCache = new Map();
const ROOF_RISE = 22;

function drawWindow(g, x, y, glow, w = 8, h = 6) {
  px(g, x - 1, y - 1, INK, w + 2, h + 2);
  px(g, x, y, glow, w, h);
  px(g, x, y, '#ffffff', 2, 1);
  px(g, x, y + Math.floor(h / 2), shade(glow, -0.25), w, 1);
}

export function buildingSprite(b) {
  if (buildingCache.has(b.id)) return buildingCache.get(b.id);
  const s = BUILDING_STYLE[b.kind] || BUILDING_STYLE.habs;
  const w = b.foot.w;
  const h = b.foot.h + ROOF_RISE;
  const [canvas, g] = makeCanvas(w, h);
  const wallH = 26;
  const wallY = h - wallH;
  // Front wall.
  px(g, 0, wallY, INK, w, wallH);
  px(g, 1, wallY + 1, s.wall, w - 2, wallH - 2);
  px(g, 1, wallY + 1, shade(s.wall, 0.18), w - 2, 2);
  px(g, 1, h - 4, s.trim, w - 2, 3);
  for (let x = 8; x < w - 4; x += 16) px(g, x, wallY + 3, shade(s.wall, -0.12), 1, wallH - 7);
  // Roof.
  const roofH = wallY;
  if (b.kind === 'observatory') {
    px(g, 2, roofH - 10, INK, w - 4, 12);
    px(g, 3, roofH - 9, s.trim, w - 6, 10);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(w / 2, roofH - 8, w / 2 - 6, roofH - 8, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = s.roof;
    g.beginPath();
    g.ellipse(w / 2, roofH - 8, w / 2 - 7, roofH - 9, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = s.roofDark;
    g.beginPath();
    g.ellipse(w / 2 + 6, roofH - 8, w / 2 - 18, roofH - 12, 0, Math.PI, 0);
    g.fill();
    px(g, w / 2 - 3, 6, INK, 6, roofH - 12);
    px(g, w / 2 - 2, 7, '#1c1a3a', 4, roofH - 14);
    px(g, w / 2 - 1, 9, '#ffffff', 1, 1);
  } else {
    px(g, 0, 0, INK, w, roofH + 1);
    px(g, 1, 1, s.roof, w - 2, roofH - 1);
    for (let y = 4; y < roofH; y += 5) {
      px(g, 1, y, s.roofDark, w - 2, 1);
      for (let x = (y % 10 ? 4 : 10); x < w - 2; x += 12) px(g, x, y - 4, s.roofDark, 1, 4);
    }
    px(g, 1, roofH - 3, shade(s.roofDark, -0.2), w - 2, 3);
    px(g, 1, 1, shade(s.roof, 0.2), w - 2, 1);
    if (b.kind === 'habs') {
      for (let x = 6; x < w - 22; x += 30) {
        px(g, x, 5, INK, 22, 12);
        px(g, x + 1, 6, '#2c4a8a', 20, 10);
        for (let k = 0; k < 20; k += 5) px(g, x + 1 + k, 6, '#4f7fd0', 1, 10);
      }
    }
    if (b.kind === 'tavern') {
      px(g, w - 22, -2 + 6, INK, 8, 12);
      px(g, w - 21, 7, '#8a8a9a', 6, 10);
      px(g, w - 20, 2, 'rgba(230,230,240,0.5)', 4, 3);
    }
    if (b.kind === 'cinema') {
      for (let x = 4; x < w - 4; x += 6) px(g, x, roofH - 6, (x / 6) % 2 ? '#ffd166' : '#fff3c4', 2, 2);
      px(g, 8, 4, INK, w - 16, roofH - 14);
      px(g, 9, 5, '#2a1e36', w - 18, roofH - 16);
      for (let x = 12; x < w - 12; x += 7) px(g, x, 7, '#ff9de2', 4, roofH - 20);
    }
  }
  // Door.
  const doorX = b.door.x - b.foot.x;
  px(g, doorX + 1, h - 20, INK, 14, 20);
  px(g, doorX + 2, h - 19, '#2e2448', 12, 19);
  px(g, doorX + 3, h - 18, '#4a3a6e', 10, 17);
  px(g, doorX + 11, h - 10, s.glow, 1, 2);
  px(g, doorX + 1, h - 22, s.trim, 14, 2);
  // Windows.
  for (let x = 6; x < w - 10; x += 22) {
    if (Math.abs(x - doorX) < 18) continue;
    drawWindow(g, x, wallY + 6, s.glow, b.kind === 'cottage' ? 6 : 9, 7);
  }
  // Signs and dressing.
  if (b.kind === 'market') {
    for (let x = 1; x < w - 1; x += 6) {
      px(g, x, wallY - 3, (x / 6) % 2 ? '#ff7a8a' : '#fff6e6', 6, 6);
      px(g, x, wallY + 3, (x / 6) % 2 ? '#d85a6a' : '#e8dccc', 6, 1);
    }
  }
  if (b.kind === 'tavern') {
    px(g, doorX + 16, wallY + 2, INK, 10, 9);
    px(g, doorX + 17, wallY + 3, '#ffd166', 8, 7);
    px(g, doorX + 19, wallY + 4, '#fff3c4', 3, 4);
  }
  if (b.kind === 'cottage') {
    px(g, 4, wallY + 2, '#ff9de2', 2, 2);
    px(g, w - 6, wallY + 2, '#9bf6ff', 2, 2);
  }
  const sprite = { canvas, x: b.foot.x, y: b.foot.y + b.foot.h - h, w, h, sortY: b.foot.y + b.foot.h };
  buildingCache.set(b.id, sprite);
  return sprite;
}

const propCache = new Map();

function propCanvas(kind) {
  if (propCache.has(kind)) return propCache.get(kind);
  let out;
  if (kind === 'crystal') {
    const [c, g] = makeCanvas(16, 28);
    const shards = [[3, 12, 4, 14, '#7de3ff'], [7, 4, 5, 22, '#b48cff'], [11, 10, 4, 16, '#ff9de2']];
    for (const [x, y, w, h, col] of shards) {
      px(g, x - 1, y, INK, w + 2, h);
      px(g, x, y + 1, col, w, h - 2);
      px(g, x, y + 1, shade(col, 0.4), 1, h - 4);
      px(g, x + w - 1, y + 2, shade(col, -0.25), 1, h - 4);
      px(g, x, y - 1, INK, w, 2);
    }
    px(g, 2, 25, '#d6aa82', 12, 2);
    out = { canvas: c, ax: 8, ay: 27 };
  } else if (kind === 'rock') {
    const [c, g] = makeCanvas(16, 12);
    px(g, 2, 2, INK, 12, 9);
    px(g, 3, 3, '#a58a7a', 10, 7);
    px(g, 3, 3, '#c4a898', 6, 2);
    px(g, 8, 7, '#86685a', 5, 3);
    out = { canvas: c, ax: 8, ay: 11 };
  } else if (kind === 'lamp') {
    const [c, g] = makeCanvas(10, 30);
    px(g, 4, 6, INK, 3, 22);
    px(g, 5, 6, '#9aa6c4', 1, 22);
    px(g, 2, 26, INK, 7, 4);
    px(g, 1, 1, INK, 9, 7);
    px(g, 2, 2, '#ffe9a8', 7, 5);
    px(g, 3, 3, '#ffffff', 2, 2);
    out = { canvas: c, ax: 5, ay: 29, glow: { dx: 0, dy: -25, r: 16, colour: 'rgba(255, 220, 140, 0.22)' } };
  } else if (kind === 'fountain') {
    const [c, g] = makeCanvas(32, 26);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(16, 18, 15, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#a3b4c9';
    g.beginPath();
    g.ellipse(16, 17, 14, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#55e6c0';
    g.beginPath();
    g.ellipse(16, 16, 11, 4, 0, 0, Math.PI * 2);
    g.fill();
    px(g, 14, 4, INK, 4, 12);
    px(g, 15, 5, '#c3d0df', 2, 11);
    px(g, 12, 2, '#9cffe4', 8, 3);
    px(g, 10, 5, '#9cffe4', 2, 6);
    px(g, 20, 5, '#9cffe4', 2, 6);
    out = { canvas: c, ax: 16, ay: 24 };
  } else if (kind === 'bench') {
    const [c, g] = makeCanvas(20, 12);
    px(g, 1, 2, INK, 18, 8);
    px(g, 2, 3, '#b0703f', 16, 3);
    px(g, 2, 6, '#7b4a2a', 16, 2);
    px(g, 3, 8, INK, 2, 4);
    px(g, 15, 8, INK, 2, 4);
    out = { canvas: c, ax: 10, ay: 11 };
  } else if (kind === 'crate') {
    const [c, g] = makeCanvas(16, 16);
    px(g, 1, 2, INK, 14, 13);
    px(g, 2, 3, '#c98a4b', 12, 11);
    px(g, 2, 3, '#e0a868', 12, 2);
    px(g, 2, 8, '#8a5a36', 12, 1);
    px(g, 7, 3, '#8a5a36', 1, 11);
    px(g, 5, 10, '#f5c542', 6, 2);
    out = { canvas: c, ax: 8, ay: 15 };
  } else if (kind === 'antenna') {
    const [c, g] = makeCanvas(20, 30);
    px(g, 9, 10, INK, 3, 18);
    px(g, 10, 10, '#9aa6c4', 1, 18);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(10, 9, 9, 6, -0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d8dde8';
    g.beginPath();
    g.ellipse(10, 9, 8, 5, -0.4, 0, Math.PI * 2);
    g.fill();
    px(g, 10, 6, '#ff3b4e', 2, 2);
    out = { canvas: c, ax: 10, ay: 29 };
  } else if (kind === 'pillar') {
    const [c, g] = makeCanvas(14, 24);
    px(g, 1, 2, INK, 12, 21);
    px(g, 2, 3, '#d8c08a', 10, 19);
    px(g, 2, 3, '#f0dcae', 3, 19);
    px(g, 0, 0, INK, 14, 4);
    px(g, 1, 1, '#f0dcae', 12, 2);
    out = { canvas: c, ax: 7, ay: 23 };
  } else if (kind === 'rocket') {
    const [c, g] = makeCanvas(36, 64);
    px(g, 4, 46, INK, 8, 16);
    px(g, 24, 46, INK, 8, 16);
    px(g, 5, 47, '#ff7a8a', 6, 14);
    px(g, 25, 47, '#ff7a8a', 6, 14);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(18, 34, 11, 28, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8ecf5';
    g.beginPath();
    g.ellipse(18, 34, 10, 27, 0, 0, Math.PI * 2);
    g.fill();
    px(g, 22, 14, '#c4cbdc', 4, 40);
    px(g, 8, 30, '#ff7a8a', 20, 3);
    px(g, 13, 20, INK, 10, 10);
    px(g, 14, 21, '#7de3ff', 8, 8);
    px(g, 15, 22, '#ffffff', 2, 2);
    px(g, 14, 56, INK, 8, 6);
    px(g, 15, 57, '#5a6079', 6, 4);
    px(g, 6, 40, '#a8452a', 3, 3);
    px(g, 25, 44, '#a8452a', 2, 2);
    out = { canvas: c, ax: 18, ay: 62 };
  } else {
    const [c] = makeCanvas(1, 1);
    out = { canvas: c, ax: 0, ay: 0 };
  }
  propCache.set(kind, out);
  return out;
}

export function drawProp(ctx, p) {
  const art = propCanvas(p.kind);
  ctx.drawImage(art.canvas, Math.round(p.x - art.ax), Math.round(p.y - art.ay));
}

export function propGlow(p) {
  return propCanvas(p.kind).glow || null;
}

// Machines inside the home.
export function drawMachine(ctx, id, x, y, progress, loaded, t) {
  const colours = { mine: '#b48cff', studio: '#ff9de2', vat: '#7dcea0' };
  const col = colours[id] || '#9bf6ff';
  ctx.fillStyle = INK;
  ctx.fillRect(x - 9, y - 22, 18, 22);
  ctx.fillStyle = '#5a6481';
  ctx.fillRect(x - 8, y - 21, 16, 20);
  ctx.fillStyle = col;
  ctx.fillRect(x - 6, y - 19, 12, 6);
  if (id === 'mine') {
    ctx.fillStyle = '#c4cbdc';
    ctx.fillRect(x - 1, y - 12 + (loaded ? Math.round(Math.sin(t * 20)) : 0), 2, 8);
  } else if (id === 'studio') {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 5, y - 11, 10, 7);
    ctx.fillStyle = loaded && Math.floor(t * 4) % 2 ? '#ffd166' : '#9bf6ff';
    ctx.fillRect(x - 4, y - 10, 8, 5);
  } else {
    ctx.fillStyle = '#7dcea0';
    ctx.fillRect(x - 5, y - 10, 10, 6);
    if (loaded) {
      ctx.fillStyle = '#dcfbe8';
      ctx.fillRect(x - 3 + Math.round(Math.sin(t * 6) * 2), y - 9, 2, 2);
    }
  }
  ctx.fillStyle = INK;
  ctx.fillRect(x - 9, y + 2, 18, 4);
  ctx.fillStyle = loaded ? '#7dff6a' : '#3a3556';
  ctx.fillRect(x - 8, y + 3, Math.round(16 * Math.max(0, Math.min(1, progress))), 2);
}

export function drawFurniture(ctx, piece) {
  const x = Math.round(piece.x);
  const y = Math.round(piece.y);
  ctx.fillStyle = INK;
  if (piece.id === 'crate') {
    ctx.fillRect(x - 7, y - 10, 14, 11);
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(x - 6, y - 9, 12, 9);
    ctx.fillStyle = '#e0a868';
    ctx.fillRect(x - 6, y - 9, 12, 2);
  } else if (piece.id === 'lamp') {
    ctx.fillRect(x - 1, y - 14, 3, 14);
    ctx.fillRect(x - 5, y - 20, 10, 7);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(x - 4, y - 19, 8, 5);
  } else {
    ctx.fillRect(x - 5, y - 8, 10, 8);
    ctx.fillStyle = '#c0394f';
    ctx.fillRect(x - 4, y - 7, 8, 6);
    ctx.fillStyle = '#7dcea0';
    ctx.fillRect(x - 4, y - 15, 3, 8);
    ctx.fillRect(x + 1, y - 13, 3, 6);
  }
}

// ---- Sky and station backdrop ----------------------------------------------------

let starLayer = null;
let planetArt = null;

function stars() {
  if (starLayer) return starLayer;
  const [c, g] = makeCanvas(512, 512);
  for (let i = 0; i < 260; i += 1) {
    const x = Math.floor(hash(i, 1, 9) * 512);
    const y = Math.floor(hash(i, 2, 9) * 512);
    const big = hash(i, 3, 9) < 0.08;
    const col = ['#ffffff', '#cfe8ff', '#ffe0f4', '#fff3c4'][i % 4];
    px(g, x, y, col, big ? 2 : 1, big ? 2 : 1);
    if (big && hash(i, 4, 9) < 0.5) {
      px(g, x - 1, y, 'rgba(255,255,255,0.4)', 1, 1);
      px(g, x + 2, y, 'rgba(255,255,255,0.4)', 1, 1);
    }
  }
  starLayer = c;
  return c;
}

function planets() {
  if (planetArt) return planetArt;
  const [ring, g] = makeCanvas(120, 70);
  g.fillStyle = '#e8a35a';
  g.beginPath();
  g.arc(60, 35, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c9742f';
  for (let y = 18; y < 56; y += 7) g.fillRect(34, y, 52, 2);
  g.globalCompositeOperation = 'destination-in';
  g.beginPath();
  g.arc(60, 35, 26, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#f5d7a8';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(60, 37, 52, 11, -0.18, 0.1, Math.PI - 0.1, true);
  g.stroke();
  const [velvet, v] = makeCanvas(48, 48);
  v.fillStyle = 'rgba(255, 140, 220, 0.18)';
  v.beginPath();
  v.arc(24, 24, 23, 0, Math.PI * 2);
  v.fill();
  v.fillStyle = '#9a5ad0';
  v.beginPath();
  v.arc(24, 24, 16, 0, Math.PI * 2);
  v.fill();
  v.fillStyle = '#ff9de2';
  v.beginPath();
  v.arc(19, 20, 9, 0, Math.PI * 2);
  v.fill();
  v.fillStyle = '#c47ae8';
  v.fillRect(10, 26, 26, 3);
  planetArt = { ring, velvet };
  return planetArt;
}

// Paints the whole window: the sky, the far planets and the station haze.
export function drawBackdrop(ctx, w, h, camX, camY, t, { planet = 'town', locked = true } = {}) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (planet === 'planet2') {
    sky.addColorStop(0, '#1a0b2e');
    sky.addColorStop(1, '#4a1d5e');
  } else {
    sky.addColorStop(0, '#0b0820');
    sky.addColorStop(0.6, '#1d1240');
    sky.addColorStop(1, '#2e1a52');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const layer = stars();
  const ox = -((camX * 0.08) % 512) - 512;
  const oy = -((camY * 0.08) % 512) - 512;
  ctx.globalAlpha = 0.85;
  for (let y = oy; y < h; y += 512) for (let x = ox; x < w; x += 512) ctx.drawImage(layer, Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
  const art = planets();
  const s = Math.max(2, Math.round(h / 300));
  ctx.imageSmoothingEnabled = false;
  if (planet === 'planet2') {
    ctx.drawImage(art.ring, Math.round(w * 0.12 - camX * 0.03), Math.round(h * 0.06 - camY * 0.02), 120 * s * 0.6, 70 * s * 0.6);
  } else {
    ctx.drawImage(art.ring, Math.round(w * 0.08 - camX * 0.03), Math.round(h * 0.05 - camY * 0.02), 120 * s, 70 * s);
    const vx = Math.round(w * 0.72 - camX * 0.05);
    const vy = Math.round(h * 0.08 - camY * 0.03);
    const pulse = 0.8 + Math.sin(t * 2) * 0.2;
    ctx.globalAlpha = locked ? 0.75 + pulse * 0.2 : 1;
    ctx.drawImage(art.velvet, vx, vy, 48 * s * 0.8, 48 * s * 0.8);
    ctx.globalAlpha = 1;
    if (locked) {
      ctx.strokeStyle = `rgba(255, 157, 226, ${0.25 + pulse * 0.2})`;
      ctx.lineWidth = Math.max(1, s / 2);
      ctx.setLineDash([4 * s / 2, 4 * s / 2]);
      ctx.beginPath();
      ctx.arc(vx + 24 * s * 0.4, vy + 24 * s * 0.4, 22 * s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ---- Effects ---------------------------------------------------------------------

const SHOT_COLOURS = {
  rifle: ['#9bf6ff', '#ffffff'],
  launcher: ['#ff8a3d', '#ffd166'],
  fireball: ['#ff6a2a', '#ffe28a'],
  goo: ['#7dff6a', '#d9ffd0'],
};

export function drawShot(ctx, shot, t) {
  const [outer, inner] = SHOT_COLOURS[shot.gun] || SHOT_COLOURS.rifle;
  const r = shot.r || 2;
  if (shot.gun === 'rifle') {
    const len = Math.hypot(shot.vx, shot.vy) || 1;
    const tx = (shot.vx / len) * 6;
    const ty = (shot.vy / len) * 6;
    ctx.strokeStyle = outer;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shot.x - tx, shot.y - ty);
    ctx.lineTo(shot.x, shot.y);
    ctx.stroke();
    ctx.fillStyle = inner;
    ctx.fillRect(Math.round(shot.x) - 1, Math.round(shot.y) - 1, 2, 2);
    return;
  }
  if (shot.gun === 'fireball') {
    for (let i = 1; i < 4; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(255, 106, 42, 0.5)' : 'rgba(255, 209, 102, 0.45)';
      const k = i * 0.018;
      ctx.fillRect(Math.round(shot.x - shot.vx * k) - 1, Math.round(shot.y - shot.vy * k + Math.sin(t * 30 + i) * 1.5) - 1, 3, 3);
    }
  }
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, r + (shot.gun === 'fireball' ? Math.sin(t * 40) * 0.6 : 0), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = inner;
  ctx.fillRect(Math.round(shot.x - r / 2), Math.round(shot.y - r / 2), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)));
}

export function drawBeam(ctx, seg, t) {
  const flick = 0.75 + Math.sin(t * 60) * 0.25;
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255, 90, 220, ${0.45 * flick})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(seg.x0, seg.y0);
  ctx.lineTo(seg.x1, seg.y1);
  ctx.stroke();
  ctx.strokeStyle = '#ffd6f6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(seg.x1) - 2, Math.round(seg.y1) - 2, 4, 4);
}

export function drawSaber(ctx, seg, colour, guard) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = guard ? shade(colour, 0.2) : colour;
  ctx.globalAlpha = guard ? 0.55 : 0.35;
  ctx.lineWidth = guard ? 6 : 5;
  ctx.beginPath();
  ctx.moveTo(seg.x0, seg.y0);
  ctx.lineTo(seg.x1, seg.y1);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#c4cbdc';
  ctx.fillRect(Math.round(seg.x0) - 1, Math.round(seg.y0) - 1, 3, 3);
}

export function drawSwing(ctx, x, y, angle, arc, length, colour, age) {
  ctx.strokeStyle = colour;
  ctx.globalAlpha = Math.max(0, 0.6 - age * 3);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, length, angle - arc / 2, angle + arc / 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawGun(ctx, gun, x, y, angle) {
  if (!gun || gun === 'saber') return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  const colour = { rifle: '#c4cbdc', launcher: '#ff8a3d', beam: '#ff5adc', fireball: '#ffd166' }[gun] || '#c4cbdc';
  ctx.fillStyle = INK;
  ctx.fillRect(1, -2, gun === 'launcher' ? 11 : 9, 4);
  ctx.fillStyle = colour;
  ctx.fillRect(2, -1, gun === 'launcher' ? 9 : 7, 2);
  ctx.restore();
}

// Particles: sparks, smoke, poofs and stylised pixel bits.
export function drawParticles(ctx, parts) {
  for (const p of parts) {
    const a = Math.max(0, Math.min(1, p.life / p.max));
    ctx.globalAlpha = p.fade === false ? 1 : a;
    ctx.fillStyle = p.colour;
    const size = p.size || 1;
    ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - (p.z || 0) - size / 2), size, size);
  }
  ctx.globalAlpha = 1;
}

export function drawRing(ctx, ring) {
  const k = 1 - ring.life / ring.max;
  ctx.strokeStyle = ring.colour;
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.lineWidth = ring.width || 2;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r0 + (ring.r1 - ring.r0) * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawBlockFlash(ctx, flash) {
  const k = 1 - flash.life / flash.max;
  const r = 4 + k * 14;
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + flash.spin;
    const len = i % 2 ? r : r * 0.6;
    ctx.save();
    ctx.translate(flash.x, flash.y);
    ctx.rotate(a);
    ctx.fillRect(0, -1, len, 2);
    ctx.restore();
  }
  ctx.fillStyle = '#fff3a0';
  ctx.fillRect(Math.round(flash.x) - 3, Math.round(flash.y) - 3, 6, 6);
  ctx.globalAlpha = 1;
}

export function drawTag(ctx, text, x, y, scale, colour = '#fff6e6') {
  const size = Math.max(11, Math.round(4.5 * scale));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `600 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 10;
  const sx = Math.round(x);
  const sy = Math.round(y);
  ctx.fillStyle = 'rgba(22, 14, 40, 0.78)';
  ctx.beginPath();
  ctx.roundRect(sx - w / 2, sy - size - 4, w, size + 7, 6);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.fillText(text, sx, sy);
  ctx.restore();
}

export function drawHpPips(ctx, x, y, hp, max) {
  for (let i = 0; i < max; i += 1) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x - max * 2 + i * 4), Math.round(y), 3, 3);
    ctx.fillStyle = i < hp ? '#ff5a7a' : '#3a3556';
    ctx.fillRect(Math.round(x - max * 2 + i * 4), Math.round(y), 2, 2);
  }
}

// ---- Small icons for the item bar and bag --------------------------------------

const iconCache = new Map();

export function itemIcon(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const [c, g] = makeCanvas(16, 16);
  const box = (x, y, w, h, col) => { px(g, x - 1, y - 1, INK, w + 2, h + 2); px(g, x, y, col, w, h); };
  switch (id) {
    case 'rifle': box(2, 7, 12, 3, '#c4cbdc'); box(4, 10, 3, 3, '#5a6481'); px(g, 12, 7, '#9bf6ff', 2, 1); break;
    case 'launcher': box(2, 6, 12, 5, '#ff8a3d'); box(5, 11, 3, 3, '#5a6481'); px(g, 13, 7, '#ffd166', 1, 3); break;
    case 'beam': box(3, 6, 9, 4, '#5a6481'); px(g, 12, 7, '#ff5adc', 3, 2); box(5, 10, 3, 3, '#5a6481'); break;
    case 'fireball': g.fillStyle = INK; g.beginPath(); g.arc(8, 9, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff6a2a'; g.beginPath(); g.arc(8, 9, 5, 0, Math.PI * 2); g.fill(); px(g, 6, 7, '#ffe28a', 3, 3); px(g, 9, 2, '#ff6a2a', 2, 3); break;
    case 'saber': px(g, 7, 1, 'rgba(155,246,255,0.6)', 3, 9); px(g, 8, 1, '#ffffff', 1, 9); box(7, 10, 3, 5, '#c4cbdc'); break;
    case 'snack': box(3, 8, 10, 5, '#7dcea0'); px(g, 5, 6, '#dcfbe8', 2, 2); px(g, 9, 5, '#dcfbe8', 2, 3); break;
    case 'dust': box(4, 6, 8, 8, '#c4cbdc'); px(g, 6, 8, '#ffffff', 1, 1); px(g, 9, 10, '#ffffff', 1, 1); break;
    case 'reel': g.fillStyle = INK; g.beginPath(); g.arc(8, 8, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a6481'; g.beginPath(); g.arc(8, 8, 5, 0, Math.PI * 2); g.fill(); px(g, 7, 7, INK, 2, 2); px(g, 5, 5, '#9bf6ff', 1, 1); px(g, 10, 10, '#9bf6ff', 1, 1); break;
    case 'syrup': box(5, 4, 6, 10, '#f0a35a'); px(g, 6, 2, '#7b4a2a', 4, 2); px(g, 6, 6, '#ffe2bd', 1, 4); break;
    case 'rock': box(3, 6, 10, 7, '#b48cff'); px(g, 4, 7, '#d9c4ff', 3, 2); break;
    case 'video': box(2, 4, 12, 9, '#1c1a3a'); px(g, 4, 6, '#ff9de2', 8, 5); px(g, 7, 7, '#ffffff', 2, 3); break;
    case 'ring': g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(8, 10, 4, 0, Math.PI * 2); g.stroke(); g.strokeStyle = '#f0c14a'; g.lineWidth = 1.5; g.stroke(); px(g, 7, 3, '#9bf6ff', 3, 3); break;
    default: box(4, 4, 8, 8, '#9aa6c4');
  }
  c.className = 'pixel-icon';
  iconCache.set(id, c);
  return c;
}

export function iconCopy(id, size = 32) {
  const [c, g] = makeCanvas(size, size);
  g.drawImage(itemIcon(id), 0, 0, size, size);
  c.className = 'pixel-icon';
  return c;
}

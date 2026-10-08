// Original pixel art for the side margins. Nothing here is traced from a film or another game.

export function measureReserved(lane, selector) {
  if (!lane) return 0;
  const card = lane.querySelector(selector);
  if (!card || card.hidden) return 0;
  const laneRect = lane.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  const bottom = rect.bottom - laneRect.top;
  if (bottom <= 8) return 0;
  return Math.min(Math.max(0, laneRect.height - 140), bottom + 12);
}

export function layoutView(laneRect, region, world, reserved) {
  const usableH = Math.max(120, laneRect.height - reserved - 8);
  const scale = Math.min(laneRect.width / region.w, usableH / world.h, 64 / 56);
  const viewW = region.w * scale;
  const viewH = world.h * scale;
  const slack = Math.max(0, usableH - viewH);
  const offsetX = region.x === 0 ? Math.max(0, laneRect.width - viewW) : 0;
  const offsetY = reserved > 0 ? reserved + 4 : slack / 2;
  return { scale, offsetX, offsetY, viewW, viewH };
}

export function worldToLane(x, y, view, region) {
  return {
    x: view.offsetX + (x - region.x) * view.scale,
    y: view.offsetY + y * view.scale,
  };
}

function block(ctx, x, y, w, h, face, side) {
  ctx.fillStyle = side;
  ctx.fillRect(x + 7, y + 7, w, h);
  ctx.fillStyle = face;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 4, y + 4, Math.max(4, w * 0.35), 3);
}

export function paintMargin(ctx, width, height, side, world, view, region, extras) {
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  const sky = worldToLane(region.x, 18, view, region);
  const nebulaW = Math.min(view.viewW * 0.46, 120);
  const nebulaH = Math.min(72, view.viewH * 0.22);
  const nebulaX = side === 'left' ? sky.x + 8 : sky.x + view.viewW - nebulaW - 8;
  ctx.fillStyle = '#24143d';
  ctx.fillRect(nebulaX, sky.y, nebulaW, nebulaH);
  ctx.fillStyle = '#6a4cff';
  ctx.beginPath();
  ctx.arc(nebulaX + nebulaW * 0.35, sky.y + nebulaH * 0.45, nebulaH * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8ec8';
  ctx.beginPath();
  ctx.arc(nebulaX + nebulaW * 0.68, sky.y + nebulaH * 0.4, nebulaH * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9ad7e6';
  ctx.strokeRect(nebulaX + 0.5, sky.y + 0.5, nebulaW - 1, nebulaH - 1);

  const buildings = side === 'left'
    ? [[8, 78, 46, 64], [168, 96, 54, 46]]
    : [[18, 88, 50, 54], [250, 70, 42, 70]];
  for (const [bx, by, bw, bh] of buildings) {
    const origin = worldToLane(region.x + bx, by, view, region);
    block(ctx, origin.x, origin.y, bw * view.scale, bh * view.scale, '#31405f', '#1a2030');
    ctx.fillStyle = '#f0c14a';
    ctx.fillRect(origin.x + 8, origin.y + 12, 6, 6);
    ctx.fillStyle = '#7dcea0';
    ctx.fillRect(origin.x + 18, origin.y + 12, 6, 6);
  }

  const lines = [...world.platforms.map((plat) => plat.y), world.ground];
  lines.forEach((lineY, index) => {
    const start = worldToLane(region.x + 8, lineY, view, region);
    const end = worldToLane(region.x + region.w - 8, lineY, view, region);
    ctx.fillStyle = index === lines.length - 1 ? '#d5e6ea' : '#8fd0d4';
    ctx.fillRect(start.x, start.y, Math.max(8, end.x - start.x), Math.max(3, 4 * view.scale));
    ctx.fillStyle = '#243044';
    ctx.fillRect(start.x, start.y + 4 * view.scale, Math.max(8, end.x - start.x), 2);
    if (side === 'left' && index === 0) {
      ctx.fillStyle = '#8fd0d4';
      ctx.fillRect(start.x, start.y - 28 * view.scale, Math.max(3, 4 * view.scale), 28 * view.scale);
    }
  });

  for (const ladder of world.ladders) {
    if (ladder.x < region.x || ladder.x > region.x + region.w) continue;
    const top = worldToLane(ladder.x, ladder.y, view, region);
    const railH = ladder.h * view.scale;
    ctx.fillStyle = '#c8d4ea';
    ctx.fillRect(top.x, top.y, 3, railH);
    ctx.fillRect(top.x + ladder.w * view.scale - 3, top.y, 3, railH);
    for (let step = 8; step < ladder.h; step += 14) {
      const rung = worldToLane(ladder.x, ladder.y + step, view, region);
      ctx.fillRect(rung.x, rung.y, ladder.w * view.scale, 2);
    }
  }

  for (const piece of extras.furniture || []) {
    if (piece.x < region.x || piece.x > region.x + region.w) continue;
    const at = worldToLane(piece.x, piece.y, view, region);
    paintProp(ctx, piece.id, at.x, at.y, view.scale);
  }
  let frame = 0;
  for (const id of extras.pictures || []) {
    const at = worldToLane(region.x + 18 + frame * 28, 58, view, region);
    paintPicture(ctx, id, at.x, at.y, view.scale);
    frame += 1;
    if (frame > 2) break;
  }

  if (extras.fence && side === 'right') {
    const box = extras.fence;
    const a = worldToLane(box.x, box.y, view, region);
    const b = worldToLane(box.x + box.w, box.y + box.h, view, region);
    ctx.strokeStyle = '#f0c14a';
    ctx.lineWidth = 3;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.lineWidth = 1;
    for (const cover of extras.covers || []) {
      const c = worldToLane(cover.x, cover.y, view, region);
      block(ctx, c.x, c.y, cover.w * view.scale, cover.h * view.scale, '#6d7c99', '#3d4a63');
    }
  }
}

function paintProp(ctx, id, x, y, scale) {
  const s = Math.max(2, 4 * scale);
  if (id === 'lamp') {
    ctx.fillStyle = '#9ad7e6';
    ctx.fillRect(x, y - s * 3, s, s * 3);
    ctx.fillStyle = '#f7e7a2';
    ctx.fillRect(x - s, y - s * 5, s * 3, s * 2);
    return;
  }
  if (id === 'pod') {
    ctx.fillStyle = '#35543f';
    ctx.fillRect(x, y - s * 2, s * 3, s * 2);
    ctx.fillStyle = '#7dcea0';
    ctx.fillRect(x + s, y - s * 4, s, s * 2);
    return;
  }
  ctx.fillStyle = '#8d6a45';
  ctx.fillRect(x, y - s * 2, s * 4, s * 2);
}

function paintPicture(ctx, id, x, y, scale) {
  const w = 22 * scale;
  const h = 16 * scale;
  ctx.fillStyle = '#1b2438';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d5e6ea';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = id === 'moon' ? '#f4f0e6' : id === 'rings' ? '#f0c14a' : '#b48cff';
  ctx.beginPath();
  ctx.arc(x + w * 0.45, y + h * 0.5, Math.min(w, h) * 0.22, 0, Math.PI * 2);
  ctx.fill();
  if (id === 'rings') {
    ctx.strokeStyle = '#f0c14a';
    ctx.strokeRect(x + 3, y + h * 0.45, w - 6, 2);
  }
}

const ACTOR = [
  '..kkkkkkkkkk....',
  '.kcccccccccck...',
  '.kcceeeceecck...',
  '.kceeeeceeeeck..',
  '.kcekeekekeeck..',
  '.kceeeeceeeeck..',
  '.kccccmmccccck..',
  '.kkccccccccckk..',
  '..kccccccccck...',
  '..kccckkkcccck..',
  '..kccckkkcccck..',
  '..kccccccccck...',
  '..kccckkkcccck..',
  '..kccck..kccck..',
  '..kkkk....kkkk..',
  '....k......k....',
];

const PAW = [
  '......',
  '..p...',
  '.ppp..',
  'ppkpp.',
  '.pppp.',
  '..ww..',
  '...w..',
  '......',
];

export function paintActor(ctx, x, y, w, h, colour, worn, facing = 1) {
  const palette = {
    k: '#241c18',
    c: colour || '#3ec6c6',
    e: '#fffaf3',
    m: '#ff8b7a',
    '.': '',
  };
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x + (facing < 0 ? w : 0), y);
  if (facing < 0) ctx.scale(-1, 1);
  const sw = w / ACTOR[0].length;
  const sh = h / ACTOR.length;
  for (let row = 0; row < ACTOR.length; row += 1) {
    for (let col = 0; col < ACTOR[row].length; col += 1) {
      const key = ACTOR[row][col];
      if (!palette[key]) continue;
      ctx.fillStyle = palette[key];
      ctx.fillRect(col * sw, row * sh, Math.ceil(sw), Math.ceil(sh));
    }
  }
  if (worn === 'visor') {
    ctx.fillStyle = '#9ad7ff';
    ctx.fillRect(2 * sw, 2 * sh, 10 * sw, 2 * sh);
  } else if (worn === 'scarf') {
    ctx.fillStyle = '#ff7a8a';
    ctx.fillRect(3 * sw, 7 * sh, 8 * sw, 2 * sh);
  } else if (worn === 'antenna') {
    ctx.fillStyle = '#f0c14a';
    ctx.fillRect(7 * sw, -2 * sh, sw, 2 * sh);
    ctx.fillRect(6 * sw, -3 * sh, 3 * sw, sh);
  } else if (worn === 'paw-sword' || worn === 'paw-shield') {
    paintPaw(ctx, worn, 12 * sw, 8 * sh, sw);
  }
  ctx.restore();
}

function paintPaw(ctx, kind, x, y, s) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#d7c4b8';
  ctx.fillRect(x - s, y + s, s, s * 2);
  ctx.restore();
  const paw = { p: '#f3d2c8', k: '#5a3b2e', w: '#efe4dc', '.': '' };
  for (let row = 0; row < PAW.length; row += 1) {
    for (let col = 0; col < PAW[row].length; col += 1) {
      const key = PAW[row][col];
      if (!paw[key]) continue;
      ctx.fillStyle = paw[key];
      ctx.fillRect(x + col * s, y + row * s, Math.ceil(s), Math.ceil(s));
    }
  }
  if (kind === 'paw-sword') {
    ctx.fillStyle = '#d5e6ea';
    ctx.fillRect(x + 5 * s, y - s, s, s * 5);
  } else {
    ctx.fillStyle = '#7eb6d8';
    ctx.fillRect(x + 5 * s, y, s * 3, s * 4);
    ctx.strokeStyle = '#243044';
    ctx.strokeRect(x + 5 * s, y, s * 3, s * 4);
  }
}

export function paintGun(ctx, gun, x, y, facing, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing < 0 ? -1 : 1, 1);
  const s = Math.max(2, 3 * scale);
  if (gun === 'launcher') {
    ctx.fillStyle = '#c47b4a';
    ctx.fillRect(0, 0, s * 5, s * 3);
    ctx.fillStyle = '#f0c14a';
    ctx.fillRect(s * 4, s, s * 2, s);
  } else if (gun === 'beam') {
    ctx.fillStyle = '#b48cff';
    ctx.beginPath();
    ctx.moveTo(s * 2, 0);
    ctx.lineTo(s * 4, s * 2);
    ctx.lineTo(s * 2, s * 4);
    ctx.lineTo(0, s * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3ec6c6';
    ctx.fillRect(0, s, s * 7, s);
    ctx.fillStyle = '#243044';
    ctx.fillRect(0, s * 2, s * 2, s);
  }
  ctx.restore();
}

export function paintBridge(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  const y = height - 14;
  ctx.fillStyle = '#8fd0d4';
  ctx.fillRect(4, y, width - 8, 6);
  ctx.fillStyle = '#243044';
  ctx.fillRect(4, y + 6, width - 8, 3);
  for (let x = 8; x < width - 8; x += 10) {
    ctx.fillStyle = '#d5e6ea';
    ctx.fillRect(x, y + 1, 6, 4);
  }
}

export function paintFace(colour) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colour || '#3ec6c6';
  ctx.fillRect(8, 6, 32, 36);
  ctx.fillStyle = '#241c18';
  ctx.fillRect(8, 6, 32, 2);
  ctx.fillRect(8, 6, 2, 36);
  ctx.fillRect(38, 6, 2, 36);
  ctx.fillRect(8, 40, 32, 2);
  ctx.fillStyle = '#fffaf3';
  ctx.fillRect(14, 16, 8, 8);
  ctx.fillRect(26, 16, 8, 8);
  ctx.fillStyle = '#241c18';
  ctx.fillRect(17, 19, 3, 3);
  ctx.fillRect(29, 19, 3, 3);
  ctx.fillStyle = '#ff8b7a';
  ctx.fillRect(20, 30, 8, 3);
  return canvas.toDataURL();
}

export function paintShot(ctx, x, y, r, gun) {
  ctx.fillStyle = gun === 'launcher' ? '#f0c14a' : '#9ad7ff';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, r), 0, Math.PI * 2);
  ctx.fill();
}

export function paintBeamLine(ctx, x0, y0, x1, y1) {
  ctx.strokeStyle = '#d7c4ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.lineWidth = 1;
}

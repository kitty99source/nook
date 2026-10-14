// Vaporwave scene art for the vapor-* themes. Every function returns a plain
// HTML/SVG string. No external URLs, no scripts, no inline style attributes
// (the page CSP is style-src 'self'); all colour comes from the --vw-* tokens
// in vapor.css through class names.

export const VAPOR_MODES = ['neon', 'sunset', 'pastel'];

// Ratio between neighbouring floor rows. vapor.css keyframes vapor-floor and
// vapor-floor-checker scale by exactly this (and its square), so the loop is
// seamless. Change both together.
export const FLOOR_RATIO = 1.3;

let uid = 0;
const nextId = (prefix) => `vw-${prefix}-${(uid += 1).toString(36)}`;

const f = (v) => Number(v.toFixed(2));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normaliseMode(mode) {
  const m = String(mode || '').replace(/^vapor-/, '');
  return VAPOR_MODES.includes(m) ? m : 'neon';
}

const svgOpen = (cls, viewBox, extra = '') =>
  `<svg class="${cls}" viewBox="${viewBox}" focusable="false" aria-hidden="true"${extra}>`;

function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

// ---------------------------------------------------------------- sun / moon

function sunSlats(count, from, to, minH, maxH) {
  let rects = '';
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 1 : i / (count - 1);
    const y = from + (to - from) * t;
    const h = minH + (maxH - minH) * t;
    rects += `<rect x="0" y="${f(y)}" width="200" height="${f(h)}" fill="#000"/>`;
  }
  return rects;
}

function fineLines() {
  let d = '';
  for (let y = 3; y < 200; y += 5) d += `M0 ${f(y)}H200`;
  return `<path class="vw-sun-fine" d="${d}"/>`;
}

/**
 * @param {'stripe'|'soft'|'moon'} variant
 *   stripe: striped sun (neon, sunset). soft: pale sun with a few thin slats
 *   (pastel). moon: lilac crescent (pastel).
 */
export function sunSvg(variant = 'stripe') {
  const id = nextId('sun');
  if (variant === 'moon') {
    return `${svgOpen('vapor-moon-svg', '0 0 100 100')}<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#000"/><circle cx="50" cy="50" r="40" fill="#fff"/><circle cx="66" cy="38" r="34" fill="#000"/></mask></defs><circle class="vw-moon-body" cx="50" cy="50" r="40" mask="url(#${id}-m)"/></svg>`;
  }
  const soft = variant === 'soft';
  const slats = soft ? sunSlats(4, 98, 138, 1.4, 3.8) : sunSlats(9, 92, 190, 1.4, 8.5);
  return `${svgOpen(`vapor-sun-svg vapor-sun-svg--${soft ? 'soft' : 'stripe'}`, '0 0 200 200')}<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="vw-stop-sun-a"/><stop offset="1" class="vw-stop-sun-b"/></linearGradient><mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#fff"/>${slats}</mask></defs><g mask="url(#${id}-m)"><circle class="vw-sun-body" cx="100" cy="100" r="100" fill="url(#${id}-g)"/>${soft ? '' : fineLines()}</g></svg>`;
}

// ----------------------------------------------------------------- mountains

function mountainMesh(seed, mirror) {
  const R = rng(seed);
  const C = 12;
  const ROWS = 5;
  const W = 600;
  const H = 300;
  const grid = [];
  for (let i = 0; i <= C; i += 1) {
    const t = i / C;
    const edge = i === 0 || i === C;
    const ridge = i === C ? 4 : H * 0.94 * Math.pow(1 - t, 1.15) * (0.78 + 0.34 * R());
    const col = [];
    for (let j = 0; j <= ROWS; j += 1) {
      const u = j / ROWS;
      const jx = edge ? 0 : (R() - 0.5) * (W / C) * 0.7;
      const x = i * (W / C) + jx;
      const y = j === 0 ? H : H - ridge * u * (j === ROWS ? 1 : 0.86 + 0.24 * R());
      col.push([mirror ? W - x : x, y]);
    }
    grid.push(col);
  }
  let polys = '';
  const tri = (a, b, c, cls) => {
    polys += `<polygon class="${cls}" points="${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(c[0])},${f(c[1])}"/>`;
  };
  for (let i = 0; i < C; i += 1) {
    for (let j = 0; j < ROWS; j += 1) {
      const a = grid[i][j];
      const b = grid[i + 1][j];
      const c = grid[i + 1][j + 1];
      const d = grid[i][j + 1];
      const hot = j === 0 ? ' vw-hot' : '';
      const s1 = `vw-f${1 + Math.floor(R() * 3)}${hot}`;
      const s2 = `vw-f${1 + Math.floor(R() * 3)}${hot}`;
      if (R() > 0.5) {
        tri(a, b, c, s1);
        tri(a, c, d, s2);
      } else {
        tri(a, b, d, s1);
        tri(b, c, d, s2);
      }
    }
  }
  return polys;
}

/** Low-poly wireframe mountains, one block on each side of the horizon. */
export function mountainsSvg() {
  return (
    `${svgOpen('vapor-mtn vapor-mtn--left', '0 0 600 300', ' preserveAspectRatio="xMinYMax meet"')}${mountainMesh(7, false)}</svg>` +
    `${svgOpen('vapor-mtn vapor-mtn--right', '0 0 600 300', ' preserveAspectRatio="xMaxYMax meet"')}${mountainMesh(23, true)}</svg>`
  );
}

// -------------------------------------------------------------------- clouds

const CLOUD_PATHS = [
  'M12 54C4 54 2 42 12 39C10 28 24 22 32 29C36 14 58 10 66 24C74 14 92 16 94 30C104 26 116 34 112 44C124 44 126 54 116 54Z',
  'M10 46C2 46 2 36 12 34C14 24 28 22 34 30C42 18 62 20 64 32C74 28 84 36 80 46Z',
  'M14 50C4 50 4 40 14 38C14 26 32 20 40 30C46 16 70 14 76 30C82 22 98 26 96 38C108 36 112 50 100 50Z',
];

/** Three flat pastel clouds with flat bottoms. */
export function cloudsSvg() {
  return CLOUD_PATHS.map(
    (d, i) => `${svgOpen(`vapor-cloud vapor-cloud--${i + 1}`, '0 0 128 60')}<path class="vw-cloud-body" d="${d}"/></svg>`,
  ).join('');
}

// --------------------------------------------------------------------- blobs

function blobPoints(n) {
  const pts = [];
  const STEPS = 28;
  for (let i = 0; i < STEPS; i += 1) {
    const a = (i / STEPS) * Math.PI * 2;
    if (n === 2) {
      const rx = 112 * (1 + 0.06 * Math.cos(a));
      const ry = (52 + 34 * Math.cos(2 * a)) * (1 + 0.16 * Math.cos(a)) + 14;
      pts.push([140 + rx * Math.cos(a), 90 + ry * Math.sin(a)]);
    } else {
      const r = 64 + 27 * Math.cos(4 * a + 0.35) + 9 * Math.cos(a + 1.1) + 5 * Math.cos(3 * a - 0.4);
      pts.push([120 + r * Math.cos(a), 120 + r * Math.sin(a)]);
    }
  }
  return pts;
}

/**
 * Liquid chrome blob. n = 1 (four-lobed splat) or 2 (long peanut).
 * Holographic 3-stop gradient (--vw-chrome-1/2/3), shading rim and highlights.
 */
export function blobSvg(n = 1) {
  const k = n === 2 ? 2 : 1;
  const id = nextId('blob');
  const d = smoothClosed(blobPoints(k));
  const vb = k === 2 ? '0 0 280 180' : '0 0 240 240';
  const hi =
    k === 2
      ? '<ellipse class="vw-blob-hi" cx="72" cy="64" rx="26" ry="9" transform="rotate(-16 72 64)" fill="url(#ID-h)"/><ellipse class="vw-blob-hi" cx="214" cy="58" rx="22" ry="8" transform="rotate(-12 214 58)" fill="url(#ID-h)"/><ellipse class="vw-blob-spec" cx="204" cy="56" rx="7" ry="3.5" transform="rotate(-12 204 56)"/><ellipse class="vw-blob-spec" cx="146" cy="112" rx="12" ry="2.5"/>'
      : '<ellipse class="vw-blob-hi" cx="106" cy="58" rx="8" ry="24" transform="rotate(12 106 58)" fill="url(#ID-h)"/><ellipse class="vw-blob-hi" cx="66" cy="108" rx="20" ry="7" transform="rotate(-8 66 108)" fill="url(#ID-h)"/><ellipse class="vw-blob-spec" cx="194" cy="108" rx="8" ry="4" transform="rotate(-20 194 108)"/><ellipse class="vw-blob-spec" cx="128" cy="180" rx="10" ry="3"/>';
  return `${svgOpen(`vapor-blob-svg vapor-blob-svg--${k}`, vb)}<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="vw-stop-chrome-1"/><stop offset="0.5" class="vw-stop-chrome-2"/><stop offset="1" class="vw-stop-chrome-3"/></linearGradient><radialGradient id="${id}-s" cx="0.42" cy="0.38" r="0.62"><stop offset="0.55" class="vw-stop-shade-0"/><stop offset="1" class="vw-stop-shade-1"/></radialGradient><radialGradient id="${id}-h"><stop offset="0" class="vw-stop-hi-0"/><stop offset="1" class="vw-stop-hi-1"/></radialGradient></defs><path class="vw-blob-body" d="${d}" fill="url(#${id}-g)"/><path class="vw-blob-shade" d="${d}" fill="url(#${id}-s)"/>${hi.replaceAll('ID', id)}</svg>`;
}

// --------------------------------------------------------------------- floor

const VB_W = 1000;
const VB_H = 400;
const VP_X = VB_W / 2;

function floorRows(minY) {
  const ys = [];
  for (let y = VB_H; y > minY; y /= FLOOR_RATIO) ys.push(y);
  return ys;
}

function rayEnds() {
  const ends = [];
  const D = 68;
  for (let j = -92; j <= 92; j += 1) ends.push(VP_X + j * D);
  return ends;
}

function gridFloor() {
  const startY = 5;
  let rays = '';
  for (const x of rayEnds()) {
    const x0 = VP_X + (x - VP_X) * (startY / VB_H);
    rays += `M${f(x0)} ${startY}L${f(x)} ${VB_H}`;
  }
  // Nearer lines are thicker by FLOOR_RATIO per row, so scaling the layer by
  // FLOOR_RATIO lands every line exactly on its neighbour's place and width.
  let lines = '';
  floorRows(0.6).forEach((y, k) => {
    const w = 2.4 / Math.pow(FLOOR_RATIO, k);
    if (w < 0.3) return;
    lines += `<path d="M-2000 ${f(y)}H3000" stroke-width="${f(w)}" vector-effect="non-scaling-stroke"/>`;
  });
  return (
    `${svgOpen('vapor-floor-rays', `0 0 ${VB_W} ${VB_H}`, ' preserveAspectRatio="none"')}<path d="${rays}" vector-effect="non-scaling-stroke"/></svg>` +
    `<div class="vapor-floor-move">${svgOpen('vapor-floor-lines', `0 0 ${VB_W} ${VB_H}`, ' preserveAspectRatio="none"')}${lines}</svg></div>`
  );
}

function checkerFloor() {
  // Checkerboard = (alternate wedges from the vanishing point) XOR (alternate
  // row bands), drawn as one even-odd path. Scaling the whole layer about the
  // vanishing point by FLOOR_RATIO^2 maps the board onto itself.
  let d = '';
  const ends = rayEnds();
  for (let j = 0; j < ends.length - 1; j += 2) {
    d += `M${VP_X} 0L${f(ends[j])} ${VB_H}L${f(ends[j + 1])} ${VB_H}Z`;
  }
  const ys = floorRows(0.4);
  for (let k = 0; k < ys.length - 1; k += 2) {
    const yNear = ys[k];
    const yFar = ys[k + 1];
    d += `M-8000 ${f(yFar)}H9000V${f(yNear)}H-8000Z`;
  }
  return `<div class="vapor-floor-move">${svgOpen('vapor-floor-checker', `0 0 ${VB_W} ${VB_H}`, ' preserveAspectRatio="none"')}<path class="vw-checker" fill-rule="evenodd" d="${d}"/></svg></div>`;
}

/** Perspective floor: cyan/white line grid (neon, pastel) or checkerboard (sunset). */
export function floorMarkup(mode) {
  const m = normaliseMode(mode);
  const checker = m === 'sunset';
  return `<div class="vapor-floor vapor-floor--${checker ? 'checker' : 'grid'}">${checker ? checkerFloor() : gridFloor()}<div class="vapor-floor-haze"></div></div>`;
}

// ----------------------------------------------------------------------- sky

/** Sky gradient, the faint flat grid over the whole screen, and mode extras. */
export function skyMarkup(mode) {
  const m = normaliseMode(mode);
  const holo = m === 'sunset' ? '<div class="vapor-holo"></div>' : '';
  return `<div class="vapor-sky"></div>${holo}<div class="vapor-flatgrid"></div>`;
}

/** Star dots in three twinkle groups plus a few four-point sparkles. */
export function starsMarkup() {
  const R = rng(99);
  const groups = ['', '', ''];
  for (let i = 0; i < 42; i += 1) {
    const x = f(R() * 1000);
    const y = f(R() * 380);
    const r = f(0.8 + R() * 1.6);
    groups[i % 3] += `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  }
  let sparkles = '';
  for (let i = 0; i < 7; i += 1) {
    const x = f(40 + R() * 920);
    const y = f(20 + R() * 300);
    const s = f(5 + R() * 6);
    sparkles += `<path d="M${x} ${f(y - s)}Q${x} ${y} ${f(x + s)} ${y}Q${x} ${y} ${x} ${f(y + s)}Q${x} ${y} ${f(x - s)} ${y}Q${x} ${y} ${x} ${f(y - s)}Z"/>`;
  }
  const g = groups.map((c, i) => `<g class="vapor-star-g vapor-star-g${i + 1}">${c}</g>`).join('');
  return `${svgOpen('vapor-stars', '0 0 1000 600', ' preserveAspectRatio="xMidYMin slice"')}${g}<g class="vapor-star-g vapor-sparkles">${sparkles}</g></svg>`;
}

/** Faint CRT scanlines (styled for neon only). */
export function scanlineMarkup() {
  return '<div class="vapor-scanlines"></div>';
}

// ------------------------------------------------------------- composition

/**
 * Rising sun group: rise wrapper (vapor-rise), bob wrapper (vapor-bob),
 * glow, the sun, and the cyan + pink glitch copies (vapor-glitch).
 */
export function sunMarkup(mode) {
  const m = normaliseMode(mode);
  const v = m === 'pastel' ? 'soft' : 'stripe';
  return `<div class="vapor-sun-rise"><div class="vapor-sun-bob"><div class="vapor-sun-glow"></div><div class="vapor-sun">${sunSvg(v)}</div><div class="vapor-sun-ghost vapor-sun-ghost--a">${sunSvg(v)}</div><div class="vapor-sun-ghost vapor-sun-ghost--b">${sunSvg(v)}</div></div></div>`;
}

/**
 * The whole scene for one mode, in back-to-front order. Put it inside
 * <div id="vapor" aria-hidden="true"> while body[data-theme="vapor-<mode>"].
 */
export function sceneMarkup(mode) {
  const m = normaliseMode(mode);
  const parts = [skyMarkup(m)];
  if (m !== 'pastel') parts.push(starsMarkup());
  else parts.push(starsMarkup(), `<div class="vapor-moon">${sunSvg('moon')}</div>`);
  parts.push(sunMarkup(m));
  if (m === 'neon') parts.push(mountainsSvg());
  if (m === 'pastel') parts.push(`<div class="vapor-clouds">${cloudsSvg()}</div>`);
  parts.push(floorMarkup(m));
  if (m === 'sunset') {
    parts.push(`<div class="vapor-blob vapor-blob--1">${blobSvg(1)}</div>`, `<div class="vapor-blob vapor-blob--2">${blobSvg(2)}</div>`);
  }
  if (m === 'neon') parts.push(scanlineMarkup());
  return parts.join('');
}

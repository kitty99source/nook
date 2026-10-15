import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { townRevealed } from '../public/vapor.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const VAPOR = ['vapor-pastel', 'vapor-sunset', 'vapor-neon'];

function reducedMotionBlock(css) {
  const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(start >= 0, 'reduced-motion block');
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error('unclosed reduced-motion block');
}

test('the town is revealed when the door shuts, even if chat stays hidden', () => {
  assert.equal(townRevealed(true), true);
  assert.equal(townRevealed(false), false);
  const css = read('public/app.css');
  assert.match(css, /:not\(:has\(#door\[hidden\]\)\) #world/);
  assert.match(css, /:has\(#door\[hidden\]\) #vapor/);
  assert.doesNotMatch(css, /:has\(#room\[hidden\]\) #world/);
  const vapor = read('public/vapor.js');
  assert.match(vapor, /querySelector\('#door'\)/);
});

test('THEMES in whimsy.js include the three vapor themes', () => {
  const src = read('public/whimsy.js');
  const found = src.match(/const THEMES = \[([^\]]+)\]/);
  assert.ok(found, 'THEMES array');
  const themes = [...found[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
  for (const name of VAPOR) assert.ok(themes.includes(name), name);
});

test('index.html has a radio for each vapor theme', () => {
  const html = read('public/index.html');
  const labels = {
    'vapor-pastel': 'Vapor pastel',
    'vapor-sunset': 'Vapor sunset',
    'vapor-neon': 'Vapor neon',
  };
  for (const [theme, label] of Object.entries(labels)) {
    assert.match(html, new RegExp(`role="radio"[^>]*data-theme="${theme}"[^>]*>${label}<`));
  }
});

test('app.css defines tokens for each vapor theme', () => {
  const css = read('public/app.css');
  const tokens = ['--ink:', '--muted:', '--lilac:', '--paper:', '--desk:', '--line:', '--warn:', '--bubble:', '--input:', '--say:'];
  for (const theme of VAPOR) {
    const at = css.indexOf(`body[data-theme="${theme}"]`);
    assert.ok(at >= 0, theme);
    const chunk = css.slice(at, at + 700);
    for (const token of tokens) assert.ok(chunk.includes(token), `${theme} ${token}`);
  }
});

test('reduced-motion block mentions vapor classes', () => {
  const block = reducedMotionBlock(read('public/app.css'));
  for (const theme of VAPOR) assert.match(block, new RegExp(theme));
  assert.match(block, /msg-glitch/);
  assert.match(block, /vapor-blob/);
});

test('server.mjs serves the vapor files', () => {
  const src = read('server.mjs');
  for (const name of ['vapor.js', 'vapor-art.js', 'vapor.css']) {
    assert.match(src, new RegExp(`\\['/${name}', '${name}'\\]`));
  }
});

test('vapor.js has no external URLs', () => {
  const src = read('public/vapor.js');
  assert.equal(/https?:\/\//.test(src), false);
  assert.equal(/url\s*\(/.test(src), false);
  assert.match(src, /export function initVapor/);
  assert.match(src, /sceneMarkup/);
  assert.match(src, /panelSceneMarkup/);
  assert.match(src, /data-vapor-hold/);
  assert.match(src, /visibilitychange/);
});

test('whimsy.js source defines WINDOW_STYLES', () => {
  const src = read('public/whimsy.js');
  assert.match(src, /\bWINDOW_STYLES\b/);
  assert.match(src, /'classic'/);
  assert.match(src, /'retro90'/);
});

test('index.html has chat scene and window style controls', () => {
  const html = read('public/index.html');
  assert.match(html, /id="chat-scene-btn"/);
  assert.match(html, /data-window="classic"[^>]*>Current look</);
  assert.match(html, /data-window="retro90"[^>]*>Retro 90s</);
});

test('app.css retro90 rules cover send, pop-bar, and pop-btn', () => {
  const css = read('public/app.css');
  const at = css.indexOf('[data-window="retro90"]');
  assert.ok(at >= 0, 'retro90 rules');
  const chunk = css.slice(at);
  assert.match(chunk, /#send/);
  assert.match(chunk, /\.pop-bar/);
  assert.match(chunk, /\.pop-btn/);
});

test('sequin cloth draws above the chat scene', () => {
  const css = read('public/app.css');
  const rule = css.match(/\.sequin-cloth\s*\{[^}]+\}/);
  assert.ok(rule, 'sequin-cloth rule');
  assert.match(rule[0], /z-index:\s*1/);
});

test('vapor-art.js exports panelSceneMarkup', () => {
  const src = read('public/vapor-art.js');
  assert.match(src, /export function panelSceneMarkup/);
});

function hexChannels(hex) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLinear(value) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(a, b) {
  const lum = (hex) => {
    const [r, g, bch] = hexChannels(hex).map(channelLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bch;
  };
  const lighter = Math.max(lum(a), lum(b));
  const darker = Math.min(lum(a), lum(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function retroToken(css, name) {
  const at = css.indexOf('[data-window="retro90"]');
  assert.ok(at >= 0, 'retro90 block');
  const chunk = css.slice(at, at + 900);
  const found = chunk.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  assert.ok(found, name);
  return found[1];
}

test('retro90 text and bubble colours reach 4.5 contrast', () => {
  const css = read('public/app.css');
  const ink = retroToken(css, '--ink');
  const paper = retroToken(css, '--paper');
  const bubble = retroToken(css, '--bubble');
  const warn = retroToken(css, '--warn');
  assert.ok(contrastRatio(ink, paper) >= 4.5, `ink on paper ${ink} ${paper}`);
  assert.ok(contrastRatio(ink, bubble) >= 4.5, `ink on bubble ${ink} ${bubble}`);
  assert.ok(contrastRatio(warn, paper) >= 4.5, `warn on paper ${warn} ${paper}`);
});

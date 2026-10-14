import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  assert.match(src, /data-vapor-hold/);
  assert.match(src, /visibilitychange/);
});

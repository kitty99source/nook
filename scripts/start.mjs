// Starts The Nook on this laptop and, when cloudflared is installed, a public link.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.NOOK_DATA || path.join(root, 'data'));

let port = 0;
let shuttingDown = false;
let announced = false;
let cloudflaredBin = '';
const children = [];

export function localRoomUrl(portNumber, hostToken) {
  const base = `http://127.0.0.1:${portNumber}/`;
  if (!hostToken) return base;
  return `${base}#h=${encodeURIComponent(hostToken)}`;
}

export function browserOpenArgs(url) {
  if (process.platform === 'win32') return ['cmd', ['/c', 'start', '', url]];
  if (process.platform === 'darwin') return ['open', [url]];
  return ['xdg-open', [url]];
}

function openRoomInBrowser(url) {
  if (process.env.NOOK_SKIP_OPEN === '1') {
    console.log(`Would open the room in your browser: ${url.split('#')[0]}`);
    return;
  }
  const [command, args] = browserOpenArgs(url);
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
  console.log('Opened the room in your browser.');
}

function oneLine(value) {
  return String(value || '').replace(/[\r\n]/g, ' ').trim().slice(0, 80);
}

function isMailSecret(key) {
  return /password|passwd|secret|smtp/i.test(key) || /^gmail/i.test(key) || key.toLowerCase() === 'pass';
}

function hadRoster(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (Array.isArray(raw.roster)) return raw.roster.length > 0;
  return typeof raw.roster === 'string' && raw.roster.trim().length > 0;
}

function normalise(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return { hostName: oneLine(source.hostName) };
}

function hostLabel(config) {
  return oneLine(config.hostName)
    || oneLine(process.env.NOOK_HOST_NAME)
    || oneLine(os.userInfo().username)
    || 'Someone';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeConfig(file, config) {
  const stored = {};
  if (config.hostName) stored.hostName = config.hostName;
  delete stored.roomWord;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch { /* best effort */ }
}

async function loadConfig() {
  const file = path.join(dataDir, 'config.json');
  let config = normalise({});
  if (!fs.existsSync(file)) return config;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const removed = raw && typeof raw === 'object'
      ? Object.keys(raw).filter((key) => isMailSecret(key))
      : [];
    const emails = hadRoster(raw);
    config = normalise(raw);
    if (removed.length || emails) {
      writeConfig(file, config);
      if (removed.length) console.log('Removed stored mailbox details from data/config.json.');
      if (emails) console.log('Stored colleague addresses are not used. Anyone with the link can open the room.');
    }
  } catch {
    console.log('Could not read data/config.json. Starting anyway.');
    config = normalise({});
  }
  return config;
}

function commandFor(pid) {
  try {
    if (process.platform === 'win32') {
      return execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
    }
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function sweepStale(name) {
  const file = path.join(dataDir, `${name}.pid`);
  if (!fs.existsSync(file)) return;
  const pid = Number(fs.readFileSync(file, 'utf8').trim());
  const command = pid ? commandFor(pid) : '';
  const match = process.platform === 'win32'
    ? (name === 'tunnel' ? /cloudflared/i : /node/i)
    : (name === 'tunnel' ? /cloudflared/ : /server\.mjs/);
  if (pid && command && match.test(command)) {
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
  }
  fs.rmSync(file, { force: true });
}

function track(child, name) {
  children.push(child);
  const file = path.join(dataDir, `${name}.pid`);
  if (child.pid) fs.writeFileSync(file, String(child.pid));
  child.on('exit', () => {
    try {
      if (fs.readFileSync(file, 'utf8').trim() === String(child.pid)) fs.rmSync(file, { force: true });
    } catch { /* already gone */ }
  });
}

function stopChild(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* already gone */ }
      finish();
    }, 1500);
    child.once('exit', finish);
    try { child.kill('SIGTERM'); } catch { finish(); }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (announced) console.log('\nClosing the room. You opened it, so this closes it for everyone.');
  for (const child of children) {
    try { if (child.exitCode === null) child.kill('SIGTERM'); } catch { /* already gone */ }
  }
  setTimeout(() => {
    for (const child of children) {
      try { if (child.exitCode === null) child.kill('SIGKILL'); } catch { /* already gone */ }
    }
    process.exit(code);
  }, 800);
}

function registerSignals() {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    try { process.on(signal, () => shutdown(0)); } catch { /* not used on this system */ }
  }
  process.on('exit', () => {
    for (const child of children) {
      try { if (child.exitCode === null && child.pid) child.kill('SIGKILL'); } catch { /* already gone */ }
    }
  });
}

function portFree(candidate) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(candidate, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

async function choosePort() {
  if (process.env.NOOK_PORT) {
    const chosen = Number(process.env.NOOK_PORT);
    if (!Number.isInteger(chosen) || chosen < 1 || chosen > 65535) {
      throw new Error('NOOK_PORT is not a usable port.');
    }
    return chosen;
  }
  for (let candidate = 8787; candidate < 8899; candidate += 1) {
    if (await portFree(candidate)) return candidate;
  }
  throw new Error('No free port found.');
}

function findCloudflared() {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(cmd, ['cloudflared'], { encoding: 'utf8' });
  const found = result.status === 0
    ? (result.stdout || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean)
    : '';
  if (found) return found;
  const extras = process.platform === 'win32'
    ? []
    : ['/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared'];
  return extras.find((file) => fs.existsSync(file)) || '';
}

async function waitUntilUp(child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('The room stopped while starting.');
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/join`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await delay(80);
  }
  throw new Error('The room did not start.');
}

function watchServer(child) {
  child.on('exit', (code) => {
    if (shuttingDown || child.replacing) return;
    console.log('The room stopped.');
    shutdown(code || 0);
  });
}

async function bootServer(hostToken, linkToken) {
  const previous = children.filter((child) => child.kind === 'server' && child.exitCode === null);
  for (const child of previous) {
    child.replacing = true;
    await stopChild(child);
  }
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const child = spawn(process.execPath, [path.join(root, 'server.mjs')], {
      cwd: root,
      env: {
        ...process.env,
        NOOK_PORT: String(port),
        NOOK_DATA: dataDir,
        NOOK_HOST_TOKEN: hostToken,
        NOOK_LINK_TOKEN: linkToken,
        NOOK_ROOM_WORD: '',
        NOOK_QUIET: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.kind = 'server';
    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    track(child, 'server');
    watchServer(child);
    try {
      await waitUntilUp(child);
      return child;
    } catch (error) {
      lastError = error;
      child.replacing = true;
      await stopChild(child);
      await delay(200);
    }
  }
  throw lastError || new Error('The room did not start.');
}

function openTunnel() {
  return new Promise((resolve) => {
    const args = ['tunnel', '--url', `http://127.0.0.1:${port}`];
    const child = spawn(cloudflaredBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.kind = 'tunnel';
    track(child, 'tunnel');
    let log = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.replacing = true;
      try { child.kill('SIGTERM'); } catch { /* already gone */ }
      finish({ url: '', flagFailed: false, child });
    }, 40000);
    const onData = (chunk) => {
      log += chunk.toString('utf8').replace(/\u001b\[[0-9;]*m/g, '');
      if (log.length > 20000) log = log.slice(-20000);
      const match = log.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/i);
      if (!match) return;
      child.gotUrl = true;
      finish({ url: match[0], flagFailed: false, child });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', () => finish({ url: '', flagFailed: false, child }));
    child.on('exit', () => {
      const flagFailed = false;
      if (!shuttingDown && !child.replacing && child.gotUrl) {
        console.log('\nThe public link has stopped. This laptop still has the room.');
        console.log(`Local link: http://127.0.0.1:${port}`);
      }
      finish({ url: '', flagFailed, child });
    });
  });
}

async function main() {
  registerSignals();
  fs.mkdirSync(dataDir, { recursive: true });
  try { fs.chmodSync(dataDir, 0o700); } catch { /* best effort */ }
  sweepStale('server');
  sweepStale('tunnel');
  const config = await loadConfig();
  const name = hostLabel(config);
  port = await choosePort();
  cloudflaredBin = findCloudflared();
  const hostToken = crypto.randomBytes(24).toString('hex');
  const linkToken = crypto.randomBytes(24).toString('hex');
  await bootServer(hostToken, linkToken);

  announced = true;
  console.log('');
  console.log('The Nook is open.');
  console.log(`${name} opened this room. You are the one who closes it.`);
  console.log('Close this window, or press Ctrl+C, and the room stops for everyone.');
  console.log('');
  console.log(`Local link: http://127.0.0.1:${port}`);

  let publicUrl = '';

  openRoomInBrowser(localRoomUrl(port, hostToken));

  async function publishLink(url, failed = false) {
    try {
      await fetch(`http://127.0.0.1:${port}/api/public-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: linkToken, url, failed }),
      });
    } catch {
      // The page keeps saying the link is on its way.
    }
  }

  if (!cloudflaredBin) {
    console.log('');
    console.log('cloudflared is not installed, so there is no public link yet.');
    console.log('Install it with: brew install cloudflared');
    console.log('The room is open on this laptop.');
    await publishLink('', true);
  } else {
    console.log('');
    console.log('Opening a public link…');
    const result = await openTunnel();
    if (result.url) {
      publicUrl = result.url;
      await publishLink(publicUrl);
    } else {
      console.log('Could not open a public link. The room is still open on this laptop.');
      await publishLink('', true);
    }
  }

  if (publicUrl) {
    console.log(`Public link: ${publicUrl}`);
    console.log('Anyone with this link can open the room in a browser. Nothing to install.');
  }

  const shareUrl = publicUrl || `http://127.0.0.1:${port}`;
  console.log(`Link: ${shareUrl}`);
  console.log('Tell a colleague: Open this link. Nothing to install.');
  await new Promise(() => {});
}

function startedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (startedDirectly()) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : 'The Nook could not start.');
    shutdown(1);
  });
}

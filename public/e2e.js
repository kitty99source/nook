// Browser locks. Private keys and the group key stay in memory.

const SALT = new TextEncoder().encode('nook-salt-v1');
const WRAP_INFO = new TextEncoder().encode('nook-wrap-v1');

export function bytesToB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function b64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function createIdentity() {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
  const publicKey = bytesToB64(new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey)));
  return { privateKey: pair.privateKey, publicKey };
}

export async function createGroupKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  return { key, raw };
}

export async function fingerprint(raw) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  const hex = [...digest.slice(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{4}/g).join(' ');
}

async function wrappingKey(privateKey, publicSpki, usage) {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    b64ToBytes(publicSpki),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
  const base = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: SALT, info: WRAP_INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

export async function wrapGroupKey(raw, recipientPublicKey) {
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const key = await wrappingKey(ephemeral.privateKey, recipientPublicKey, 'encrypt');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, raw));
  const ephemeralPublic = bytesToB64(new Uint8Array(await crypto.subtle.exportKey('spki', ephemeral.publicKey)));
  return { ephemeralPublic, iv: bytesToB64(iv), data: bytesToB64(data) };
}

export async function unwrapGroupKey(privateKey, parcel) {
  const key = await wrappingKey(privateKey, parcel.ephemeralPublic, 'decrypt');
  const raw = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(parcel.iv) },
    key,
    b64ToBytes(parcel.data),
  ));
  const groupKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  return { key: groupKey, raw };
}

export async function encryptJson(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  ));
  return { iv: bytesToB64(iv), data: bytesToB64(data) };
}

export async function decryptJson(key, parcel) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(parcel.iv) },
    key,
    b64ToBytes(parcel.data),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function encryptBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(iv.length + data.length);
  out.set(iv, 0);
  out.set(data, iv.length);
  return out;
}

export async function decryptBytes(key, packed) {
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
}

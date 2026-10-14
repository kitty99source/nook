// A small WebSocket writer for the local Node room. The browser sends places and hears the others.
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export function acceptKey(key) {
  return createHash('sha1').update(String(key) + GUID).digest('base64');
}

export function writeFrame(socket, opcode, payload = Buffer.alloc(0)) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

function readFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    const big = buf.readBigUInt64BE(2);
    if (big > BigInt(1024 * 1024)) return { opcode: 0x8, payload: Buffer.alloc(0), end: buf.length };
    len = Number(big);
    offset = 10;
  }
  const maskLen = masked ? 4 : 0;
  if (buf.length < offset + maskLen + len) return null;
  const raw = buf.subarray(offset + maskLen, offset + maskLen + len);
  let payload;
  if (masked) {
    const mask = buf.subarray(offset, offset + 4);
    payload = Buffer.alloc(raw.length);
    for (let i = 0; i < raw.length; i += 1) payload[i] = raw[i] ^ mask[i % 4];
  } else payload = Buffer.from(raw);
  return { opcode, payload, end: offset + maskLen + len };
}

export function attachSocket(socket, onClose, onMessage) {
  let buf = Buffer.alloc(0);
  let dead = false;
  const close = () => {
    if (dead) return;
    dead = true;
    onClose();
  };
  socket.on('data', (chunk) => {
    if (dead) return;
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > 1024 * 1024) {
      socket.destroy();
      close();
      return;
    }
    while (!dead) {
      const frame = readFrame(buf);
      if (!frame) break;
      buf = buf.subarray(frame.end);
      if (frame.opcode === 0x8) {
        try { writeFrame(socket, 0x8); } catch { /* already gone */ }
        socket.end();
        close();
        return;
      }
      if (frame.opcode === 0x1) {
        if (frame.payload.length <= 8192 && onMessage) {
          try { onMessage(frame.payload.toString('utf8')); } catch { /* one bad message */ }
        }
        continue;
      }
      if (frame.opcode === 0x9) {
        try { writeFrame(socket, 0xA, frame.payload); } catch { close(); }
      }
    }
  });
  socket.on('close', close);
  socket.on('error', close);
  return {
    send(text) {
      if (dead) return;
      try { writeFrame(socket, 0x1, Buffer.from(String(text))); }
      catch { close(); }
    },
  };
}

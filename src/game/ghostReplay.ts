import { GhostFrame, GhostReplayRecord } from './types';

export const GHOST_SAMPLE_HZ = 10;
export const GHOST_SAMPLE_DT = 1 / GHOST_SAMPLE_HZ;
export const GHOST_BYTES_PER_FRAME = 10;
export const GHOST_MAX_FRAMES = 2800; // 280s max => 28,000 bytes => ~37.3 KB base64 (< 40 KB)
export const GHOST_MAX_BASE64_LEN = 40960;

function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToUint8(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function clampInt16(val: number): number {
  return Math.max(-32767, Math.min(32767, Math.round(val)));
}

export function encodeGhostFrames(frames: GhostFrame[]): string {
  const count = Math.min(frames.length, GHOST_MAX_FRAMES);
  const buf = new ArrayBuffer(count * GHOST_BYTES_PER_FRAME);
  const view = new DataView(buf);

  for (let i = 0; i < count; i++) {
    const f = frames[i];
    const off = i * GHOST_BYTES_PER_FRAME;
    view.setInt16(off, clampInt16(f.x * 100), true);
    view.setInt16(off + 2, clampInt16(f.y * 100), true);
    view.setInt16(off + 4, clampInt16(f.z * 100), true);
    view.setInt16(off + 6, clampInt16(f.yaw * 1000), true);
    const flags = (f.pulsed ? 1 : 0) | (f.crouching ? 2 : 0);
    view.setUint8(off + 8, flags);
    view.setUint8(off + 9, 0);
  }

  return uint8ToBase64(new Uint8Array(buf));
}

export function decodeGhostFrames(base64: string): GhostFrame[] {
  if (!base64 || base64.length > GHOST_MAX_BASE64_LEN) return [];
  try {
    const bytes = base64ToUint8(base64);
    if (bytes.byteLength < GHOST_BYTES_PER_FRAME || bytes.byteLength % GHOST_BYTES_PER_FRAME !== 0) {
      return [];
    }
    const count = bytes.byteLength / GHOST_BYTES_PER_FRAME;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const frames: GhostFrame[] = [];
    for (let i = 0; i < count; i++) {
      const off = i * GHOST_BYTES_PER_FRAME;
      frames.push({
        x: view.getInt16(off, true) / 100,
        y: view.getInt16(off + 2, true) / 100,
        z: view.getInt16(off + 4, true) / 100,
        yaw: view.getInt16(off + 6, true) / 1000,
        pulsed: (view.getUint8(off + 8) & 1) !== 0,
        crouching: (view.getUint8(off + 8) & 2) !== 0,
      });
    }
    return frames;
  } catch {
    return [];
  }
}

const LOCAL_GHOST_PREFIX = 'echoes3d_pb_ghost_v1_';

export function loadLocalBestGhost(levelNumber: number): GhostReplayRecord | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_GHOST_PREFIX}${levelNumber}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GhostReplayRecord;
    if (parsed && typeof parsed.data === 'string' && typeof parsed.timeSeconds === 'number') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveLocalBestGhostIfFaster(record: GhostReplayRecord): boolean {
  try {
    const existing = loadLocalBestGhost(record.levelNumber);
    if (!existing || record.timeSeconds < existing.timeSeconds) {
      localStorage.setItem(`${LOCAL_GHOST_PREFIX}${record.levelNumber}`, JSON.stringify(record));
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

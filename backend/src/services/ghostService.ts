const BYTES_PER_FRAME = 10;
const MAX_BASE64_LENGTH = 40960;
const MAX_FRAMES = 2800;

export interface GhostValidationResult {
  valid: boolean;
  frameCount: number;
  reason?: string;
}

export function validateGhostReplayData(
  timeSeconds: number,
  base64Data: string
): GhostValidationResult {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 6 || timeSeconds > 86400) {
    return { valid: false, frameCount: 0, reason: 'Invalid completion timeSeconds' };
  }
  if (typeof base64Data !== 'string' || base64Data.length === 0 || base64Data.length > MAX_BASE64_LENGTH) {
    return { valid: false, frameCount: 0, reason: 'Ghost replay exceeds 40 KB limit or is empty' };
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)) {
    return { valid: false, frameCount: 0, reason: 'Malformed base64 ghost payload' };
  }

  const buf = Buffer.from(base64Data, 'base64');
  if (buf.byteLength < BYTES_PER_FRAME * 30 || buf.byteLength % BYTES_PER_FRAME !== 0) {
    return { valid: false, frameCount: 0, reason: 'Corrupt or too-short ghost frame buffer' };
  }

  const frameCount = buf.byteLength / BYTES_PER_FRAME;
  if (frameCount > MAX_FRAMES) {
    return { valid: false, frameCount, reason: 'Ghost replay exceeds maximum frame cap' };
  }

  // Verify frame count matches 10 Hz sampling rate within reasonable tolerances
  const maxExpectedFrames = Math.ceil(timeSeconds * 11) + 20;
  if (frameCount > maxExpectedFrames) {
    return { valid: false, frameCount, reason: 'Frame count exceeds reported run duration' };
  }

  // Walk consecutive frames to catch teleportation exploits (allow rare checkpoint respawns <= 4%)
  let teleportCount = 0;
  let prevX = buf.readInt16LE(0) / 100;
  let prevZ = buf.readInt16LE(4) / 100;

  for (let i = 1; i < frameCount; i++) {
    const off = i * BYTES_PER_FRAME;
    const x = buf.readInt16LE(off) / 100;
    const z = buf.readInt16LE(off + 4) / 100;
    const horizDist = Math.hypot(x - prevX, z - prevZ);
    if (horizDist > 2.6) {
      teleportCount += 1;
    }
    prevX = x;
    prevZ = z;
  }

  if (teleportCount > Math.max(3, Math.floor(frameCount * 0.04))) {
    return { valid: false, frameCount, reason: 'Ghost velocity exceeds physical bounds' };
  }

  return { valid: true, frameCount };
}

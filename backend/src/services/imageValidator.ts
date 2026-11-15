import crypto from 'node:crypto';

export type AllowedImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export const MAX_TRIAL_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIMES = new Set<AllowedImageMime>(['image/png', 'image/jpeg', 'image/webp']);

export function detectImageMimeFromMagic(buf: Buffer): AllowedImageMime | null {
  if (buf.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export interface ValidatedTrialImage {
  buffer: Buffer;
  base64: string;
  mimeType: AllowedImageMime;
  seed: number;
}

export function validateBase64TrialImage(
  rawBase64: unknown,
  declaredMime: unknown
): { ok: true; data: ValidatedTrialImage } | { ok: false; error: string } {
  if (typeof rawBase64 !== 'string' || !rawBase64.trim()) {
    return { ok: false, error: 'Image payload is required.' };
  }

  let clean = rawBase64.trim();
  const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(clean);
  let effectiveDeclared = typeof declaredMime === 'string' ? declaredMime.trim().toLowerCase() : '';
  if (dataUrlMatch) {
    if (!effectiveDeclared) effectiveDeclared = dataUrlMatch[1].toLowerCase();
    clean = dataUrlMatch[2];
  }
  clean = clean.replace(/\s+/g, '');

  if (effectiveDeclared === 'image/jpg') effectiveDeclared = 'image/jpeg';

  if (effectiveDeclared && !ALLOWED_MIMES.has(effectiveDeclared as AllowedImageMime)) {
    return { ok: false, error: 'Only PNG, JPEG, and WebP images are supported.' };
  }

  if (clean.length > Math.ceil(MAX_TRIAL_IMAGE_BYTES * 1.4)) {
    return { ok: false, error: 'Image exceeds the 2 MB maximum size.' };
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(clean)) {
    return { ok: false, error: 'Invalid base64 image encoding.' };
  }

  const buffer = Buffer.from(clean, 'base64');
  if (buffer.length < 16) {
    return { ok: false, error: 'Image file is empty or corrupted.' };
  }
  if (buffer.length > MAX_TRIAL_IMAGE_BYTES) {
    return { ok: false, error: 'Image exceeds the 2 MB maximum size.' };
  }

  const detectedMime = detectImageMimeFromMagic(buffer);
  if (!detectedMime) {
    return { ok: false, error: 'Invalid image header. Please upload a valid PNG, JPEG, or WebP file.' };
  }

  if (effectiveDeclared && effectiveDeclared !== detectedMime) {
    return { ok: false, error: 'Uploaded file contents do not match its declared image type.' };
  }

  const hash = crypto.createHash('sha256').update(buffer).digest();
  const seed = hash.readUInt32BE(0) || 104729;

  return {
    ok: true,
    data: {
      buffer,
      base64: buffer.toString('base64'),
      mimeType: detectedMime,
      seed,
    },
  };
}

/**
 * Re-encode a hike photo before it is stored or uploaded.
 * ImagePicker's `exif: false` only hides the metadata object; the file keeps it.
 * Saving a new JPEG through expo-image-manipulator drops EXIF, including GPS.
 */

export const PHOTO_LONG_EDGE = 2048;
export const PHOTO_JPEG_QUALITY = 0.8;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export interface EncodedPhoto {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

export interface PhotoSaveOptions {
  compress: number;
  format: 'jpeg';
  base64: true;
}

export type PhotoManipulator = (
  uri: string,
  actions: { resize: { width: number; height: number } }[],
  options: PhotoSaveOptions,
) => Promise<{ uri: string; base64?: string; width: number; height: number }>;

export const photoSaveOptions: PhotoSaveOptions = {
  compress: PHOTO_JPEG_QUALITY,
  format: 'jpeg',
  base64: true,
};

/** Fit inside a square of `longEdge` px. Already-small images are not resized. */
export function resizeAction(
  width: number,
  height: number,
  longEdge = PHOTO_LONG_EDGE,
): { resize: { width: number; height: number } } | null {
  if (width < 1 || height < 1) return null;
  const long = Math.max(width, height);
  if (long <= longEdge) return null;
  const scale = longEdge / long;
  return {
    resize: {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    },
  };
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const padding = clean.length % 4 === 0 ? 0 : 4 - (clean.length % 4);
  const padded = clean + '='.repeat(padding);
  const bytes = new Uint8Array(
    (padded.length / 4) * 3 - (padded.endsWith('==') ? 2 : padded.endsWith('=') ? 1 : 0),
  );
  let offset = 0;
  for (let i = 0; i < padded.length; i += 4) {
    const a = B64.indexOf(padded[i] ?? 'A');
    const b = B64.indexOf(padded[i + 1] ?? 'A');
    const c = padded[i + 2] === '=' ? 0 : B64.indexOf(padded[i + 2] ?? 'A');
    const d = padded[i + 3] === '=' ? 0 : B64.indexOf(padded[i + 3] ?? 'A');
    bytes[offset++] = (a << 2) | (b >> 4);
    if (padded[i + 2] !== '=') bytes[offset++] = ((b & 15) << 4) | (c >> 2);
    if (padded[i + 3] !== '=') bytes[offset++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

function asciiIncludes(payload: Uint8Array, needle: string): boolean {
  const n = needle.length;
  if (n === 0 || payload.length < n) return false;
  for (let i = 0; i <= payload.length - n; i++) {
    let match = true;
    for (let j = 0; j < n; j++) {
      if (payload[i + j] !== needle.charCodeAt(j)) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * True when a JPEG still carries an EXIF APP1 segment or a GPS tag.
 * A re-encoded JPEG has neither.
 */
export function jpegHasExifOrGps(bytes: Uint8Array): boolean {
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1] ?? 0;
    if (marker === 0xd8) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return false;
    const length = ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
    if (length < 2 || i + 2 + length > bytes.length) return false;
    const payload = bytes.subarray(i + 4, i + 2 + length);
    if (marker === 0xe1) {
      const isExif =
        payload.length >= 6 &&
        payload[0] === 0x45 &&
        payload[1] === 0x78 &&
        payload[2] === 0x69 &&
        payload[3] === 0x66 &&
        payload[4] === 0 &&
        payload[5] === 0;
      if (isExif) return true;
      if (asciiIncludes(payload, 'GPSLatitude') || asciiIncludes(payload, 'GPSLongitude')) {
        return true;
      }
    }
    i += 2 + length;
  }
  return false;
}

/** Bytes that are safe to upload. Throws while EXIF or GPS is still present. */
export function photoBodyFromBase64(base64: string): ArrayBuffer {
  const body = base64ToArrayBuffer(base64);
  if (jpegHasExifOrGps(new Uint8Array(body))) {
    throw new Error('Photo still has EXIF or GPS metadata.');
  }
  return body;
}

async function defaultManipulate(
  uri: string,
  actions: { resize: { width: number; height: number } }[],
  options: PhotoSaveOptions,
) {
  const ImageManipulator = await import('expo-image-manipulator');
  return ImageManipulator.manipulateAsync(uri, actions, {
    compress: options.compress,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
}

/**
 * New JPEG, long edge at most 2048px, quality about 0.8.
 * The returned base64 is the file that may leave the device.
 */
export async function reencodePhoto(
  uri: string,
  width: number,
  height: number,
  manipulate: PhotoManipulator = defaultManipulate,
): Promise<EncodedPhoto> {
  const first = resizeAction(width, height);
  let result = await manipulate(uri, first ? [first] : [], photoSaveOptions);
  if (!result.base64) throw new Error('Re-encoded photo had no bytes.');
  const second = resizeAction(result.width, result.height);
  if (second) {
    result = await manipulate(result.uri, [second], photoSaveOptions);
    if (!result.base64) throw new Error('Re-encoded photo had no bytes.');
  }
  return {
    uri: result.uri,
    base64: result.base64,
    width: result.width,
    height: result.height,
  };
}

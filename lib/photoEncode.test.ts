import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  PHOTO_JPEG_QUALITY,
  PHOTO_LONG_EDGE,
  jpegHasExifOrGps,
  photoBodyFromBase64,
  reencodePhoto,
  resizeAction,
  type PhotoManipulator,
} from './photoEncode.ts';

function jpegWithGpsExif(): Buffer {
  const exif = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49,
    0x2a, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x25, 0x88,
    0x04, 0x00,
    0x01, 0x00, 0x00, 0x00,
    0x1a, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x02, 0x00,
    0x05, 0x00,
    0x03, 0x00, 0x00, 0x00,
    0x2c, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x25, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
  ]);
  const length = exif.length + 2;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1, (length >> 8) & 0xff, length & 0xff]),
    exif,
    Buffer.from([0xff, 0xd9]),
  ]);
}

/** JFIF only. No EXIF APP1 and no GPS tags. */
function jpegWithoutMetadata(): Buffer {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01,
    0x00, 0x00,
    0xff, 0xd9,
  ]);
}

describe('hike photo re-encode', () => {
  it('caps the long edge at 2048', () => {
    assert.deepEqual(resizeAction(4000, 3000), { resize: { width: 2048, height: 1536 } });
    assert.deepEqual(resizeAction(1200, 4000), { resize: { width: 614, height: 2048 } });
    assert.equal(resizeAction(800, 600), null);
    assert.equal(PHOTO_LONG_EDGE, 2048);
    assert.equal(PHOTO_JPEG_QUALITY, 0.8);
  });

  it('uploads a file with no GPS or EXIF tags', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'apex-photo-'));
    const source = join(dir, 'from-camera.jpg');
    const dirty = jpegWithGpsExif();
    await writeFile(source, dirty);
    assert.equal(jpegHasExifOrGps(dirty), true);
    assert.ok(dirty.includes(Buffer.from([0x25, 0x88])), 'fixture keeps the GPS IFD tag');

    const clean = jpegWithoutMetadata();
    const calls: { actions: unknown; options: unknown }[] = [];
    const manipulate: PhotoManipulator = async (_uri, actions, options) => {
      calls.push({ actions, options });
      assert.equal(options.format, 'jpeg');
      assert.equal(options.compress, 0.8);
      assert.equal(options.base64, true);
      return {
        uri: join(dir, 'stripped.jpg'),
        base64: clean.toString('base64'),
        width: 2048,
        height: 1536,
      };
    };

    const prepared = await reencodePhoto(source, 4000, 3000, manipulate);
    const body = photoBodyFromBase64(prepared.base64);
    const uploaded = join(dir, 'uploaded.jpg');
    await writeFile(uploaded, Buffer.from(body));
    const stored = new Uint8Array(await readFile(uploaded));

    assert.equal(jpegHasExifOrGps(stored), false);
    assert.equal(stored.includes(0x25) && stored[stored.indexOf(0x25) + 1] === 0x88, false);
    assert.deepEqual(calls[0]?.actions, [{ resize: { width: 2048, height: 1536 } }]);
    assert.equal(prepared.uri.endsWith('stripped.jpg'), true);
    assert.equal(prepared.uri.startsWith('data:'), false);
  });

  it('refuses to upload a file that still has EXIF', () => {
    const dirty = jpegWithGpsExif().toString('base64');
    assert.throws(() => photoBodyFromBase64(dirty), /EXIF or GPS/);
  });
});

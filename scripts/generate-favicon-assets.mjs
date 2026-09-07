import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const publicDir = new URL('../public/', import.meta.url);
const source = await readFile(new URL('favicon.svg', publicDir));

const sizes = [16, 32, 48, 180, 192, 512];
const pngs = new Map();

for (const size of sizes) {
  const png = await sharp(source)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toBuffer();
  pngs.set(size, png);
}

await mkdir(publicDir, { recursive: true });
await writeFile(new URL('favicon-16x16.png', publicDir), pngs.get(16));
await writeFile(new URL('favicon-32x32.png', publicDir), pngs.get(32));
await writeFile(new URL('favicon-48x48.png', publicDir), pngs.get(48));
await writeFile(new URL('apple-touch-icon.png', publicDir), pngs.get(180));
await writeFile(new URL('icon-192.png', publicDir), pngs.get(192));
await writeFile(new URL('icon-512.png', publicDir), pngs.get(512));

// PNG-compressed ICO frames keep the legacy /favicon.ico fallback on the same mark.
const frames = [16, 32, 48].map((size) => ({ size, data: pngs.get(size) }));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);

let offset = 6 + (frames.length * 16);
const entries = [];
for (const frame of frames) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(frame.size === 256 ? 0 : frame.size, 0);
  entry.writeUInt8(frame.size === 256 ? 0 : frame.size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(frame.data.length, 8);
  entry.writeUInt32LE(offset, 12);
  entries.push(entry);
  offset += frame.data.length;
}

await writeFile(new URL('favicon.ico', publicDir), Buffer.concat([header, ...entries, ...frames.map(({ data }) => data)]));

console.log(`Generated FDS favicon assets at ${sizes.join('px, ')}px plus 3-frame favicon.ico`);

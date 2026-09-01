import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const readDist = (path) => readFile(new URL(path, `file://${dist}`), 'utf8');

const manifest = JSON.parse(await readDist('manifest.webmanifest'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, manifest.scope, 'manifest start URL and scope must match');
assert.ok(manifest.start_url.endsWith('/'), 'manifest must start at an application root');

const expectedIcons = [
  ['icon-192.png', '192x192', 'any'],
  ['icon-512.png', '512x512', 'any'],
  ['icon-maskable-512.png', '512x512', 'maskable'],
];
for (const [src, sizes, purpose] of expectedIcons) {
  assert.ok(
    manifest.icons.some((icon) => icon.src === src && icon.sizes === sizes && icon.purpose === purpose),
    `manifest is missing ${src} (${purpose})`,
  );
  await access(new URL(src, `file://${dist}`));
}

const themeFiles = [
  'themes/lofi-rain.webp',
  'themes/forest-zen.webp',
  'themes/deep-focus.webp',
  'themes/coffee-shop.webp',
];
const serviceWorker = await readDist('sw.js');
for (const path of ['index.html', ...themeFiles]) {
  assert.ok(serviceWorker.includes(path), `${path} is not in the service worker precache`);
}
for (const path of themeFiles) {
  const asset = await stat(new URL(path, `file://${dist}`));
  assert.ok(asset.size <= 2 * 1024 * 1024, `${path} exceeds Workbox's default precache limit`);
}

const html = await readDist('index.html');
assert.equal((html.match(/rel="manifest"/g) ?? []).length, 1, 'app shell must contain one manifest link');
assert.match(html, /registerSW\.js/, 'app shell must register the service worker');

console.log(`Verified offline PWA shell with ${themeFiles.length} local themes.`);

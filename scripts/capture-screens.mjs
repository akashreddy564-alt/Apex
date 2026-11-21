// Captures every route of the web build at 390x844 @2x, in dark and light, into docs/screens/.
// Also writes docs/screens/index.html, a contact sheet of every image.
//
// Needs the Expo web server running (default http://localhost:8096) and a Chromium.
// playwright-core is not a project dependency. Run it without installing:
//
//   npx -y -p playwright-core@1.56.1 node scripts/capture-screens.mjs [baseUrl]
//
// Or point PLAYWRIGHT_CORE at an existing playwright-core folder.
//
// Env:
//   BASE_URL         base url (or first argument), default http://localhost:8096
//   CHROME_PATH      Chromium executable, default the Playwright cache path
//   PLAYWRIGHT_CORE  path to a playwright-core install, optional
//
// Flags:
//   --reduced        Reduce Motion run: Trail detail, Log and Goal into docs/screens/reduced-motion/
//                    (leaves the main capture alone), with a stillness check per screen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const reduced = args.includes('--reduced');
const BASE = (args.find((a) => /^https?:/.test(a)) ?? process.env.BASE_URL ?? 'http://localhost:8096').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH ??
  path.join(
    os.homedir(),
    'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  );

async function loadPlaywright() {
  if (process.env.PLAYWRIGHT_CORE) {
    return createRequire(path.join(process.env.PLAYWRIGHT_CORE, 'x.js'))(process.env.PLAYWRIGHT_CORE);
  }
  try {
    return await import('playwright-core');
  } catch {
    console.error('playwright-core not found. Run: npx -y -p playwright-core@1.56.1 node scripts/capture-screens.mjs');
    process.exit(1);
  }
}
const pw = await loadPlaywright();
const chromium = pw.chromium ?? pw.default?.chromium;

const ANGELS = '63cfe6e0-2d47-4a81-b087-a146d1fd9a4f';
const COLCHUCK = '79f6296e-bccc-4b95-ba71-13d0bba7f9af';
const ROUTES = [
  ['01', 'home', '/'],
  ['02', 'social', '/social'],
  ['03', 'log', '/log'],
  ['04', 'trails', '/trails'],
  ['05', 'rankings', '/rankings'],
  ['06', 'goal', '/goal'],
  ['07', 'account', '/account'],
  ['08', 'username', '/username'],
  ['09', 'add-friends', '/add-friends'],
  ['10', 'friend-requests', '/friend-requests'],
  ['11', 'notifications', '/notifications'],
  ['12', 'create-group', '/create-group'],
  ['13', 'join-group', '/join-group'],
  ['14', 'group', '/group/demo'],
  ['15', 'friend', '/friend/demo'],
  ['16', 'post', '/post/demo'],
  ['17', 'blocked', '/blocked'],
  ['18', 'report', '/report'],
  ['19', 'delete-account', '/delete-account'],
  ['20', 'credits', '/credits'],
  ['21', 'not-found', '/does-not-exist'],
  ['22', 'trail-angels-landing', `/trail/${ANGELS}`],
  ['23', 'trail-colchuck-lake', `/trail/${COLCHUCK}`],
];
const REDUCED_ROUTES = [
  ['22', 'trail-angels-landing', `/trail/${ANGELS}`],
  ['03', 'log', '/log'],
  ['06', 'goal', '/goal'],
];

const OUT = path.join(root, 'docs/screens', reduced ? 'reduced-motion' : '');
const routes = reduced ? REDUCED_ROUTES : ROUTES;
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png') || f === 'index.html') fs.rmSync(path.join(OUT, f));

const browser = await chromium.launch({ executablePath: CHROME });
const shots = []; // { file, route, appearance, full }
const errors = {}; // key -> messages
const still = {}; // key -> whether two later frames match

for (const appearance of ['dark', 'light']) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: appearance,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  // The persisted settings store (AsyncStorage is localStorage on web).
  await ctx.addInitScript((a) => {
    try {
      localStorage.setItem('apex-settings', JSON.stringify({ state: { appearance: a, scoreStyle: 'number' }, version: 1 }));
    } catch {}
  }, appearance);
  const page = await ctx.newPage();
  let cur = 'boot';
  const note = (m) => (errors[`${cur}-${appearance}`] ??= []).push(m.slice(0, 200));
  page.on('console', (m) => m.type() === 'error' && note(m.text()));
  page.on('pageerror', (e) => note('PAGEERROR ' + e.message));

  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(9000); // the opening screen

  for (const [nn, slug, route] of routes) {
    cur = slug;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => note('goto ' + e.message));
    await page.waitForTimeout(slug === 'home' ? 9000 : reduced ? 6000 : 3500);
    const base = `${nn}-${slug}-${appearance}`;
    await page.screenshot({ path: path.join(OUT, `${base}.png`) });
    shots.push({ file: `${base}.png`, route, appearance, full: false });
    if (reduced) {
      // Frames 2 and 3, a second apart. The first capture can nudge the page, so it is not compared.
      const b = await page.screenshot();
      await page.waitForTimeout(1000);
      const c = await page.screenshot();
      still[`${slug}-${appearance}`] = b.equals(c);
    }
    const h = await page.evaluate(() =>
      Math.max(
        document.body.scrollHeight,
        ...[...document.querySelectorAll('*')].map((e) =>
          e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY) ? e.scrollHeight : 0,
        ),
      ),
    );
    if (h > 900) {
      await page.setViewportSize({ width: 390, height: Math.min(h + 120, 4000) });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${base}-full.png`) });
      shots.push({ file: `${base}-full.png`, route, appearance, full: true });
    }
    console.log(base, 'h=' + h);
  }
  await ctx.close();
}
await browser.close();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cards = shots
  .map(
    (s) =>
      `<figure><a href="${s.file}"><img loading="lazy" src="${s.file}" alt="${esc(s.route)}"></a><figcaption><b>${esc(s.route)}</b><br>${s.appearance}${s.full ? ', full height' : ''}</figcaption></figure>`,
  )
  .join('\n');
fs.writeFileSync(
  path.join(OUT, 'index.html'),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apex screens${reduced ? ' (reduced motion)' : ''}</title>
<style>body{margin:0;padding:24px;background:#111;color:#ddd;font:14px/1.4 system-ui}h1{font-size:18px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;align-items:start}
figure{margin:0}img{width:100%;border:1px solid #333;border-radius:8px;display:block}figcaption{margin-top:6px;font-size:12px;color:#999}b{color:#eee}</style>
<h1>Apex screens${reduced ? ' (reduced motion)' : ''}, 390x844 at 2x, ${shots.length} images, ${new Date().toISOString().slice(0, 10)}</h1><main>
${cards}
</main>`,
);

console.log('ERRORS', JSON.stringify(errors, null, 1));
if (reduced) console.log('STILL (two frames 1 s apart identical)', JSON.stringify(still, null, 1));

// 「くわしく読む」をすべて開いた状態で、文字と背景の差（WCAG 2.2 AA）・押す所の大きさ・横のはみ出しを数える。
// Lighthouse は閉じた全文の中を見ないので、色を変えたらこちらも回す。
// 使い方: 先に npm run build と npx astro preview を動かしてから
//   npm run check:contrast [-- <URL>]   既定は http://localhost:4321/tsukutta-2026/
// Chrome の場所は CHROME_PATH で上書きできる。
// 背景は要素の背景色を親へたどって重ねて求める。背景画像・グラデーションは見ない（このページには無い）。
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4321/tsukutta-2026/';
const widths = [1280, 375, 320];
const port = 9300 + Math.floor(Math.random() * 600);

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chromePath = candidates.find((p) => existsSync(p));
if (!chromePath) {
  console.error('Chrome が見つからない。CHROME_PATH に場所を入れて実行する');
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), 'check-contrast-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cleanup = () => {
  chrome.kill();
  // Chrome が閉じきる前は消せないことがあるので、失敗しても止めない
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
};

// ページの中で動かす検査。結果を JSON の文字列で返す
const audit = `(() => {
  document.querySelectorAll('details').forEach((d) => (d.open = true));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  // oklch などどんな書き方の色でも、canvas に塗って RGBA を読み取る
  const parse = (s) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = 'rgba(0,0,0,0)';
    cx.fillStyle = s;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.a > 0) stack.push(c);
      if (c.a === 1) break;
    }
    let b = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of stack.reverse()) b = over(c, b);
    return b;
  };
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };

  const bad = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    const text = walker.currentNode.textContent.trim();
    if (!text || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    // 回る数字の帯の途中の桁と、使えないボタン（WCAG の対象外）は数えない
    if (el.closest('.counter__digit') || el.closest('button:disabled')) continue;
    const bg = bgOf(el);
    const fgRaw = parse(cs.color);
    const fg = over({ ...fgRaw, a: fgRaw.a * opacityOf(el) }, bg);
    const x = lum(fg), y = lum(bg);
    const ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) bad.push(ratio.toFixed(2) + ' ' + px + 'px .' + el.className + ' 「' + text.slice(0, 20) + '」');
  }

  // 押す所は 24px 四方以上（WCAG 2.5.8）。label の中のチェックは label 全体で押せるので除く
  const small = [...document.querySelectorAll('a, button, summary, input, label')]
    .filter((e) => !(e.tagName === 'INPUT' && e.closest('label')))
    .map((e) => [e, e.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && (r.width < 24 || r.height < 24))
    .map(([e, r]) => e.tagName.toLowerCase() + '.' + e.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));

  return JSON.stringify({ checked: seen.size, bad, small, overflow: document.documentElement.scrollWidth > innerWidth });
})()`;

let failed = false;
try {
  let list;
  for (let i = 0; i < 40 && !list; i += 1) {
    await sleep(250);
    list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => undefined);
  }
  if (!list) throw new Error('Chrome に接続できなかった');
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); waiting.get(d.id)?.(d); waiting.delete(d.id); };
  const send = (method, params = {}) => new Promise((r) => { id += 1; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });

  await send('Page.enable');
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    const nav = await send('Page.navigate', { url });
    if (nav.result?.errorText) throw new Error(`${url} を開けなかった（${nav.result.errorText}）。先に preview を動かす`);
    await sleep(3000);
    const res = await send('Runtime.evaluate', { expression: audit, returnByValue: true });
    if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? '検査が止まった');
    const r = JSON.parse(res.result.result.value);
    const ok = r.bad.length === 0 && r.small.length === 0 && !r.overflow;
    if (!ok) failed = true;
    console.log(`${ok ? 'OK' : 'NG'} 幅${width}px: 文字${r.checked}か所のうち基準割れ ${r.bad.length}件／小さい押す所 ${r.small.length}件／横はみ出し ${r.overflow ? 'あり' : 'なし'}`);
    for (const line of [...r.bad, ...r.small]) console.log('   ' + line);
  }
  ws.close();
} catch (e) {
  console.error(e.message);
  failed = true;
} finally {
  cleanup();
}
process.exit(failed ? 1 : 0);

// ページに出てくる字だけを入れた日本語フォント（src/assets/fonts/page-jp.woff2）を作る・確かめる。
//   node scripts/page-font.mjs          … ビルドして字を集め、フォントを作り直す（npm run font）
//   node scripts/page-font.mjs --check  … ビルド結果の字がフォントに全部入っているか確かめる（npm run build の後半）
// くわしい経緯は docs/decisions/019_page-font.md
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const fontFile = join(root, 'src/assets/fonts/page-jp.woff2');
const listFile = join(root, 'src/assets/fonts/page-jp.json');

// 元にするフォント。google/fonts のコミットを固定し、取ってきたファイルは SHA-256 で照らす
const SOURCE = {
  url: 'https://raw.githubusercontent.com/google/fonts/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf',
  sha256: 'c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f',
  cache: join(root, '.cache/fonts/NotoSansJP-wght.ttf'),
};

// 横書きで効く機能だけ残す。縦書き用や旧字体への置き換えを残すと、その字形まで連れてきて1.7倍の大きさになる
const FEATURES = ['ccmp', 'locl', 'mark', 'kern', 'palt', 'halt'];

// ページに無くても入れておく字。入力欄に打たれやすい英数字・かな・約物
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i)).join('');
const ALWAYS = range(0x20, 0x7e) + range(0x3041, 0x3096) + range(0x30a1, 0x30fc) + '　、。々〜「」『』（）！？：';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** ビルド結果の HTML・JS・CSS に出てくる字を集める。\uXXXX と &#x…; は元の字に戻してから数える */
const collect = () => {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html がありません。先に astro build を実行してください');
  const assets = join(dist, '_astro');
  const files = [join(dist, 'index.html'), ...readdirSync(assets).filter((f) => /\.(js|css)$/.test(f)).map((f) => join(assets, f))];
  const point = (hex, radix) => {
    const n = parseInt(hex, radix);
    return n <= 0x10ffff ? String.fromCodePoint(n) : '';
  };
  const chars = new Set(ALWAYS);
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => point(h, 16))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => point(h, 16))
      .replace(/&#(\d+);/g, (_, d) => point(d, 10));
    for (const ch of text) if (ch.codePointAt(0) >= 0x20) chars.add(ch);
  }
  // 片方だけ残ったサロゲートは字ではないので捨てる
  return [...chars].filter((ch) => !/^[\ud800-\udfff]$/.test(ch)).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
};

const loadSource = async () => {
  if (!existsSync(SOURCE.cache)) {
    console.log(`元のフォントを取ってきます（約10MB）: ${SOURCE.url}`);
    const res = await fetch(SOURCE.url);
    if (!res.ok) throw new Error(`元のフォントを取れませんでした（${res.status}）`);
    mkdirSync(dirname(SOURCE.cache), { recursive: true });
    writeFileSync(SOURCE.cache, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(SOURCE.cache);
  if (sha256(buf) !== SOURCE.sha256) throw new Error(`元のフォントの中身が想定と違います。${SOURCE.cache} を消してやり直してください`);
  return buf;
};

const check = () => {
  if (!existsSync(fontFile) || !existsSync(listFile)) {
    console.error('ページ専用のフォントがありません。npm run font を実行してください');
    process.exit(1);
  }
  const list = JSON.parse(readFileSync(listFile, 'utf8'));
  if (sha256(readFileSync(fontFile)) !== list.font) {
    console.error('page-jp.woff2 と page-jp.json が同じときに作られたものではありません。npm run font を実行して両方コミットしてください');
    process.exit(1);
  }
  const have = new Set(list.chars);
  const missing = collect().filter((ch) => !have.has(ch));
  if (missing.length) {
    console.error(`ページ専用のフォントに入っていない字が ${missing.length} 字あります: ${missing.join('')}`);
    console.error('npm run font を実行し、src/assets/fonts/ の2ファイルをコミットしてください');
    process.exit(1);
  }
  console.log(`ページ専用のフォント: ビルド結果の字はすべて入っています（${list.chars.length} 字）`);
};

const generate = async () => {
  // ページがこのファイルを読み込んでいるので、無いとビルドそのものが止まる
  if (!existsSync(fontFile)) throw new Error('src/assets/fonts/page-jp.woff2 がありません。git restore で戻してから実行してください');
  const build = () => execSync('npx astro build', { cwd: root, stdio: 'inherit' });
  build();
  const chars = collect();
  const { default: subsetFont } = await import('subset-font');
  // ライセンスの表記（name の 13・14）は既定では落ちるので残す
  const font = await subsetFont(await loadSource(), chars.join(''), { targetFormat: 'woff2', keepFeatures: FEATURES, preserveNameIds: [13, 14] });
  mkdirSync(dirname(fontFile), { recursive: true });
  writeFileSync(fontFile, font);
  writeFileSync(listFile, `${JSON.stringify({ source: SOURCE.sha256, font: sha256(font), chars: chars.join('') }, null, 2)}\n`);
  console.log(`page-jp.woff2 を作りました: ${chars.length} 字・${Math.round(font.length / 1024)}KB`);
  // 作り直したフォントをビルド結果に入れる
  build();
  check();
};

if (process.argv.includes('--check')) check();
else await generate();

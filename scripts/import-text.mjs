// 原稿の Markdown（note-articles の essay/今年つくったもの.md）を src/data/timeline.json に変換する。
// 使い方: npm run import [-- 原稿のパス]
// 原稿は削られていく前提なので、extras.json との対応が外れたら止めて知らせる。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(process.argv[2] ?? resolve(root, '../note-articles/essay/今年つくったもの.md'));
const extras = JSON.parse(readFileSync(resolve(root, 'src/data/extras.json'), 'utf8'));

const errors = [];
const warnings = [];
const lines = readFileSync(src, 'utf8').replace(/\r\n/g, '\n').split('\n');

let title = '';
const sections = [];
let section = { type: 'text', heading: '', paragraphs: [], hasImage: false };
let entry = null;
sections.push(section);

for (const [i, raw] of lines.entries()) {
  const line = raw.trim();
  const at = `${i + 1}行目`;
  if (!line) continue;

  if (line.startsWith('# ')) {
    title = line.slice(2).trim();
    continue;
  }
  if (line.startsWith('## ')) {
    const heading = line.slice(3).trim();
    const month = heading.match(/^(\d{1,2})月$/);
    section = month
      ? { type: 'month', heading, month: Number(month[1]), entries: [] }
      : { type: 'text', heading, paragraphs: [], hasImage: false };
    sections.push(section);
    entry = null;
    continue;
  }
  if (line.startsWith('### ')) {
    if (section.type !== 'month') {
      errors.push(`${at}: 月の節の外に ### がある（${line}）`);
      continue;
    }
    // 「4月11日　クイズ得点板」の形。日付と名前は全角または半角の空白で区切る
    const m = line.slice(4).trim().match(/^(\d{1,2})月(\d{1,2})日[\s　]+(.+)$/);
    if (!m) {
      errors.push(`${at}: 見出しが「○月○日　名前」の形になっていない（${line}）`);
      continue;
    }
    if (Number(m[1]) !== section.month) {
      errors.push(`${at}: ${section.month}月の節に${m[1]}月の見出しがある`);
    }
    entry = { date: `${m[1]}月${m[2]}日`, month: Number(m[1]), day: Number(m[2]), title: m[3].trim(), paragraphs: [], hasImage: false, tools: [] };
    section.entries.push(entry);
    continue;
  }
  if (line.startsWith('#')) {
    errors.push(`${at}: 想定していない見出しの深さ（${line}）`);
    continue;
  }

  // 【画像】行は撮影の指示なので文は捨て、画像枠を置く印だけ残す
  const target = entry ?? (section.type === 'text' ? section : null);
  if (!target) {
    errors.push(`${at}: 月の見出しと項目の見出しの間に本文がある`);
    continue;
  }
  if (line.startsWith('【画像】')) {
    target.hasImage = true;
    continue;
  }
  target.paragraphs.push(line);
}

const entries = sections.filter((s) => s.type === 'month').flatMap((s) => s.entries);

// extras の各ツールを見出しに結び付ける。1つの見出しに複数のツールがあってよい
for (const tool of extras) {
  const hits = entries.filter((e) => e.title.includes(tool.match));
  if (hits.length === 0) {
    errors.push(`extras の「${tool.match}」（${tool.id}）に当たる見出しが原稿に無い。原稿から消したなら extras からも消す`);
    continue;
  }
  if (hits.length > 1) {
    errors.push(`extras の「${tool.match}」が複数の見出しに当たる: ${hits.map((e) => e.title).join(' / ')}`);
    continue;
  }
  hits[0].tools.push(tool.id);
  if (tool.counter) {
    const text = hits[0].paragraphs.join('');
    if (!text.includes(tool.counter.value)) {
      warnings.push(`「${tool.match}」の回す数字 ${tool.counter.value} が本文に無い。どちらかが古い`);
    }
  }
}
for (const e of entries) {
  if (e.tools.length === 0) errors.push(`見出し「${e.date}　${e.title}」に当たる extras が無い`);
}
if (!title) errors.push('# のタイトルが無い');

for (const w of warnings) console.warn(`警告: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`止めた: ${e}`);
  process.exit(1);
}

const out = resolve(root, 'src/data/timeline.json');
writeFileSync(out, `${JSON.stringify({ source: src.replace(/\\/g, '/').split('/').slice(-2).join('/'), title, sections }, null, 2)}\n`);
const months = sections.filter((s) => s.type === 'month').length;
console.log(`取り込んだ: 見出し${entries.length}件・ツール${extras.length}件・月${months}つ → src/data/timeline.json`);

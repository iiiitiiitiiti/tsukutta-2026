# 今年つくったもの年表

2026-12-22 担当のアドベントカレンダーに出す、今年作ったアプリ・ページ18件の年表ページ。手帳・紙もの風の1ページで、月のツメ・回る数字・小さな実物（得点板・暗記カード・かいもの）が動く。

- 公開予定: https://iiiitiiitiiti.github.io/tsukutta-2026/ （まだ private。公開日に public へ切り替えて Pages を有効にする）
- プラン: [docs/plan.md](docs/plan.md)

## 本文の直し方

本文の正本は note-articles の `essay/今年つくったもの.md`。記事レビュー帳で削ったら、ここで取り込み直す。

```sh
npm run import            # ../note-articles/essay/今年つくったもの.md を読む
npm run import -- <パス>  # 別の場所の原稿を読む
```

`src/data/timeline.json` が書き換わる。JSON はコミットする（CI は note-articles を読めない）。

取り込みは次のときに止まる。原稿を削って項目を消したら、`src/data/extras.json` からもそのツールを消す。

- extras の `match` に当たる見出しが原稿に無い／複数ある
- 見出しに当たる extras が無い
- 見出しが「○月○日　名前」の形でない、または月の節の外にある

回す数字（extras の `counter`）が本文に同じ形で無いときは警告だけ出す。

## スクショ

`public/shots/<extras の id>.webp`（あれば同名の `.avif` も）を置くと、準備中の枠が写真に替わる。冒頭の棚の画像は `tana-overview`。

## 開発

```sh
npm ci
npm run dev      # http://localhost:4321/tsukutta-2026/
npm run check
npm run build
```

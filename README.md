# 今年つくったもの年表

2026-12-22 担当のアドベントカレンダーに出す、今年作ったアプリ・ページ18件の年表ページ。縦の線に日付を置いて左右交互に並べる1ページ。上に固定した月の色帯・回る数字・小さな実物（得点板・暗記カード・かいもの。本物の見た目と動きを写した小型版）が動く。表紙は作った18件が落ちてきて月ごとの棒グラフに積み上がる。年表の項目はスクロールに合わせて下から現れ、一言だけを見せる。「くわしく読む」で原稿の全文が伸びて開く。最後は黒い画面いっぱいに作った物とクレジットを流すエンドロールで締める。その下にアドベントカレンダーの前の日と次の日の記事へのリンクを置く（中身は `src/data/advent.json` に書く。空のうちは「準備中」と出る）。一番下に「上に戻る」ボタンがある。

- 公開中: https://iiiitiiitiiti.github.io/tsukutta-2026/ （2026-11-05 にリポを public にして Pages を有効にした。アドベントカレンダーの公開日 12/22 までは調整中の版）
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

`public/shots/<extras の id>.webp`（あれば同名の `.avif` も）を置くと、全文の中の準備中の枠が写真に替わる。年表の丸い小窓はアイコンのまま。冒頭の棚の画像は `tana-overview`。

## 開発

```sh
npm ci
npm run dev      # http://localhost:4321/tsukutta-2026/
npm run check
npm run build
```

## アクセシビリティの検査

文字は WCAG 2.2 の AA（文字と背景の差4.5:1以上）に合わせている（[docs/decisions/003](docs/decisions/003_wcag-aa-contrast.md)）。色や文字の大きさを変えたら、build したものを preview で動かして検査する。Chrome が要る。

```sh
npx astro preview                                  # http://localhost:4321/tsukutta-2026/
npm run check:contrast                             # 別のターミナルで
npm run check:contrast -- <URL>                    # 別のポートで動かしているとき
```

「くわしく読む」をすべて開いた状態で、幅1280・375・320px の文字の差・押す所の大きさ（24px 以上）・横のはみ出しを数える。Lighthouse は閉じた全文の中を見ないので、こちらで補う。開いてから1.5秒待って測る（中の見本の出だしの動きが終わるのを待つ）。透明で見えていない文字と、読み上げ専用の見えないラベルは数えない。

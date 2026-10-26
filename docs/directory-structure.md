# ディレクトリ構成

次の構成は、リニューアル後の配置方針。
現在の掲載内容と公開 URL を引き継ぎ、Astro、TypeScript、SCSS で組み直す。

```text
src/
├─ pages/                  Astro のページ。ファイルのパスで URL を決める
│  ├─ index.astro          トップページ
│  ├─ 404.astro            404 ページ
│  └─ works/[slug].astro   プロジェクト詳細
├─ layouts/                共通の文書構造とメタ情報（base-layout.astro）
├─ components/
│  ├─ layout/              l- の部品
│  ├─ module/              m- の部品
│  └─ page/                同じ型のページで使う部品
├─ data/                   掲載内容とサイト共通のデータ（TypeScript）
├─ scripts/
│  ├─ main.ts              共通の初期化
│  ├─ module/              特定の Block 用の TypeScript
│  └─ feature/             Block に属さない機能
└─ styles/
   ├─ main.scss            各層を順に読み込む
   ├─ function/            rem() などの値変換
   ├─ mixin/               mq() などの共通宣言
   ├─ reset/               既定スタイルの打ち消し
   ├─ base/                デザイントークンと基本スタイル
   ├─ layout/              l- のスタイル
   ├─ module/              m- のスタイル
   ├─ page/                ページごとのスタイル
   └─ utility/             u- のスタイル
public/
└─ assets/
   ├─ img/                 加工せず配信する画像
   └─ font/                自前で配信する場合のフォントとライセンス
docs/                      コーディング規約と配置方針
```

必要になったディレクトリから作り、空のディレクトリや未使用の共通処理を先に用意しない。
生成物の `dist/` は Git 管理せず、直接編集しない。

## 追加先

| 追加するもの           | 配置                                                                         | あわせて行うこと                                                 |
| ---------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| ページ                 | `src/pages/{パス}/index.astro`                                               | 共通レイアウトにメタ情報を渡す                                   |
| 部品                   | `src/components/module/m-{名前}.astro` と `src/styles/module/_m-{名前}.scss` | `main.scss` に `@use` を足す                                     |
| レイアウト部品         | `src/components/layout/l-{名前}.astro` と `src/styles/layout/_l-{名前}.scss` | 共通レイアウトから呼び出す                                       |
| ページ共通の組み方     | `src/components/page/p-{名前}.astro`                                         | データを props で受け取り、各ページから呼び出す                  |
| 掲載データ             | `src/data/{名前}.ts`                                                         | データの形に型を付ける                                           |
| ページ固有のスタイル   | `src/styles/page/_p-{名前}.scss`                                             | `p-{ページ名}-{部分}` の Block で組む                            |
| 部品の処理             | `src/scripts/module/{接頭辞を除いた Block 名}.ts`                            | `main.ts` で対象要素を取得して初期化する                         |
| 部品に属さない処理     | `src/scripts/feature/{機能名}.ts`                                            | 共通処理は `main.ts`、ページ固有の処理は該当ページから読み込む   |
| Sass function と mixin | `src/styles/function/` または `src/styles/mixin/`                            | 1ファイル1つとし、`_index.scss` に `@forward` を足す             |
| 画像                   | `public/assets/img/`                                                         | [画像の命名規則](naming.md#画像) に従う                          |
| フォント               | `public/assets/font/`                                                        | 配布元の名前とライセンスを維持し、必要な `@font-face` を定義する |

## 現在の実装からの移行

上記はリニューアル後の構成で、現在の実装とは一部異なる。
ディレクトリ、共通処理、Stylelint の移植は、対象と範囲をユーザーに確認してから進める。
文書に登場する未実装の mixin、トークン、共通部品を、そのまま既存コードから呼び出さない。

- `src/data/works.ts` と `src/data/career.ts`、ページと部品にある掲載文、関連画像を引き継ぐ。
- 現行の `src/components/{部品名}/`、`src/styles/pages/`、`src/styles/tools/` と `public/images/` は、移行対象として確認するまで維持する。
- 現行の `BaseLayout.astro` など、命名規則と異なるファイルも、参照箇所と一緒に移行する。
- `rem()` と `mq()` は、配置を変える際に定義と参照を揃える。
  ブレークポイントとデザイン値は別途確認する。
- EditorConfig、Prettier、ESLint の共通設定は整備済みとする。
  Stylelint の新しい規約と独自ルールは、サイト再構築と同時に移植する。
- 既存パッケージの継続と削除、新しいパッケージの追加は別途確認する。
- 新しいデザインやリニューアル本体の実装は、対象と範囲を都度確認して進める。

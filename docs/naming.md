# 命名規則

## 略語

自分で付けるクラス名、ファイル名、変数名、関数名、カスタムプロパティには完全な単語を使う。
`btn` は `button`、`arr` は `array`、`el` は `element`、`e` は `event` にする。
略語は次の許可リストにあるものだけ使ってよい。

| 種類                       | 許可する略語                                                                      |
| -------------------------- | --------------------------------------------------------------------------------- |
| 頭字語                     | `HTML`、`CSS`、`JS`、`TS`、`JSON`、`URL`、`ID`、`API`、`FAQ`、`OGP`、`SVG`、`BEM` |
| HTML 標準の要素名と属性名  | `nav`、`img`、`src`、`href`、`alt` など                                           |
| CSS の単位                 | `rem`、`px`、`em`、`vw`、`vh` など                                                |
| プロジェクトで決めた接頭辞 | クラスの `l-`、`m-`、`p-`、`u-`、`js-` と、画像の `bg_`                           |
| プロジェクトで定めた名前   | `props`、`mq()`、`dist`、PC を表す `pc`、SP を表す `sp`                           |

Node.js やライブラリの API 名（`fs`、Swiper の `prevEl` など）は、そのまま使う。
Astro の `Props`、`getStaticPaths`、`[slug].astro` などの規約上の名前も維持する。
許可リストに追加する場合は、この文書を更新する。

## ファイル

- ディレクトリとファイルはケバブケースにする（`m-button.astro`、`header.ts`）。
  SCSS のパーシャルは先頭に `_` を付ける。
- `components/`、`scripts/`、`styles/` の中で用途を分けるディレクトリ名は単数形にする（`components/module/`、`scripts/feature/`）。
- Astro コンポーネントを import するときの名前と、TypeScript のクラス名は PascalCase にする（`Button`、`Header`）。
- ページは `src/pages/{URLのパス}/index.astro` を基本にする。
  トップ、404、動的ルートは Astro のルーティングに合わせる。
- 部品の Astro と SCSS は、同じ層に Block 名をファイル名として置く（`components/module/m-button.astro` と `styles/module/_m-button.scss`）。
- 設定ファイルは、利用するツールが定めた名前を使う。

具体的な配置は [ディレクトリ構成](directory-structure.md) に従う。
既存ファイルの改名と移動は、移行範囲の確認後に行う。

## URL

- 簡潔な英語の名詞にする。
  固有名称を除き、ローマ字にしない。
- 複数単語は半角ハイフンで区切る（`/privacy-policy/`）。
- 末尾スラッシュのディレクトリ形式にする（`/works/example/`）。
- 既存ページの URL は引き継ぐ。
  変更が必要な場合は、転送を含めてユーザーに確認する。

## CSS クラス

`[接頭辞]-[block]__[element]--[modifier]` にする。
2語以上はケバブケースでつなぐ（`m-footer-nav__link-text`）。

| 接頭辞 | 用途                                         |
| ------ | -------------------------------------------- |
| `l-`   | レイアウト                                   |
| `m-`   | 再利用する部品                               |
| `p-`   | 特定ページだけのスタイル                     |
| `u-`   | 単機能の補助クラス                           |
| `js-`  | DOM 操作で取得する要素。スタイルは指定しない |

状態は Modifier で表す（`l-header__nav-link--current`）。
`is-active` などの状態クラスは使わない。

`p-` の Block は `p-{ページ名}-{名前}` にする。
`p-{ページ名}` を Block にしない。
詳しくは [ページの Block](coding-rules/scss.md#ページの-block) を参照する。

## デザイントークン

`src/styles/base/_tokens.scss` のカスタムプロパティは `--{分類}-{役割や色の名前や数値}` で名付ける。

| 分類                   | 名付け方                                         | 例                                                               |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| 色                     | 役割か色の名前。HEX は名前に入れない             | `--color-text`、`--color-primary`、`--color-background-beige`    |
| 文字サイズ、余白、角丸 | px 相当の数値。`XS`、`SM` などの段階名は使わない | `--font-size-18`、`--space-16`、`--radius-8`                     |
| 太さ、行間、影など     | 役割や段階                                       | `--font-weight-bold`、`--line-height-heading`、`--shadow-medium` |

役割の後ろに付ける語は `secondary`、`light`、`hover`、`muted` などにする。
文字の組み合わせは [文字スタイル](coding-rules/scss.md#文字スタイル) の mixin で管理する。
具体的な値はリニューアルのデザインに合わせて定義する。

## 画像

- ファイル名はスネークケースにし、`icon_`、`logo_`、`bg_`、`img_` の接頭辞を付ける。
- ロゴ、アイコン、図版は SVG、写真は WebP を基本にする。
  WebP を使えない写真は JPG、透過が必要な場合は PNG にする。
- イラストはベクターがあれば SVG にする。
  容量や描画に問題がある場合は WebP にする。
- ラスター画像は表示サイズの2倍を基本にする。
- 加工せず配信する画像は `public/assets/img/` に置く。
  公開パスは `/assets/img/` になる。
- favicon や配布元から取得したファイルなど、用途やライセンス上の名前があるものはその名前を維持する。
- 既存の画像パスは、参照箇所を含めた移行範囲の確認後に変更する。

## TypeScript

変数と関数は camelCase、クラスと型は PascalCase、定数は UPPER_SNAKE_CASE にする。
真偽値は `is` で始める。
ファイル名とクラス構成は [TypeScript の規約](coding-rules/javascript.md) に従う。

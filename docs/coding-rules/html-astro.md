# HTML と Astro

リニューアル後の配置は [ディレクトリ構成](../directory-structure.md) に従う。
Astro のフロントマターには TypeScript を使う。

## HTML

- `header`、`nav`、`main`、`section`、`article`、`footer` で構造を示す。
  見出しレベルは飛ばさず、文書構造で選ぶ。
  h1 は1つにする。
- `main` は1つで `id="main"` にする。
  スキップリンクの移動先として使う。
- `img` には `alt` を付ける。
  装飾画像と、前後に同じ説明がある画像は `alt=""` にする。
- `img` には可能な限り `width` と `height` を指定する。
  ファーストビュー外は `loading="lazy" decoding="async"` にする。
- 画面幅で画像を出し分けるときに `picture` を使う。
- インラインスタイル、廃止された要素と属性を使わない。
  `user-scalable="no"` などで拡大を禁止しない。
- モーダルは `dialog`、アコーディオンは `details` と `summary` を使う。
- CSS クラスと DOM 操作のフックは [命名規則](../naming.md#css-クラス) に従う。

## ページと共通レイアウト

ページは `src/pages/` に置く。
共通レイアウトは `src/layouts/` に置き、title、meta description、OGP、canonical を出力する。
ページのメタ情報は型を付けた props でレイアウトに渡す。

```astro
---
import BaseLayout from '../layouts/base-layout.astro';

const page = {
  title: 'プロフィール',
  description: '経歴とフロントエンド開発での取り組みを紹介します。',
};
---

<BaseLayout title={page.title} description={page.description}>
  <section class="p-profile-intro">
    <h1 class="p-profile-intro__heading">プロフィール</h1>
  </section>
</BaseLayout>
```

`main` は共通レイアウトが持つ。
ページと部品で重ねて出力しない。
タイトルはページごとに内容が分かる名前を付け、サイト内で重複させない。

## フロントマターとマークアップ

フロントマターには、import、props の型と受け取り、データの選択や計算を置く。
固定の文字列や HTML は、使う場所に直接書く。
2回以上使う値や、条件分岐で変わる値を変数にする。

HTML を返す独自のテンプレート関数を作らず、Astro コンポーネントと `<slot />` で組む。
掲載データは `src/data/` に置き、同じ型の詳細ページはデータと共通のコンポーネントで出力する。

## 部品

- 1ファイル1部品とし、ファイル名は Block 名にする。
- `Props` に受け取る値の型を定義し、`Astro.props` から分割代入で受け取る。
- 出し分けは props（`variant`、`size`、`level` など）で Modifier や要素を切り替える。
- 呼び出し側のレイアウト調整には `className` でクラスを足す。
  部品の内部要素を外から直接指定しない。
- クラスの組み立てには Astro の `class:list` を使う。
- 入れ子のマークアップは `<slot />` で受け取る。
  複数の差し込み先が必要な場合は名前付き slot を使う。
- SP の値を既定とし、PC だけ変える props は `pcPadding`、`pcImage` のように `pc` を付ける。
- テキストは式の展開で出力する。
  入力値を `set:html` で展開しない。
- ブラウザで複製する部品は `<template>` で出力する。

```astro
---
type Props = {
  href: string;
  className?: string;
};

const { href, className } = Astro.props;
---

<a href={href} class:list={['m-button', className]}>
  <slot />
</a>
```

props、slot、フロントマターの構文は、[Astro 公式のコンポーネントの説明](https://docs.astro.build/en/basics/astro-components/)を参照する。

## ヘッダーとフッター

ヘッダーとフッターは Astro コンポーネントとして共通レイアウトから出力する。
枠、ロゴ、コピーライト、メニュー、ナビゲーションを初期 HTML に含める。
現在地の表示も、ページから渡したパスなどを使ってビルド時に決める。

ブラウザの TypeScript は、メニューの開閉などの操作を担当する。
主要導線を JavaScript の読み込み成功に依存させない。

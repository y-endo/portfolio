# TypeScript

ブラウザで動く処理は TypeScript で書く。
DOM 操作とクラスの構成は、移植元の JavaScript の書き方を引き継ぐ。

## DOM 操作

- DOM 操作用のフレームワークやライブラリを追加せず、標準の DOM API を使う。
- Windows、macOS、Android、iOS の各最新ブラウザで使える構文と API を選ぶ。
- JavaScript が無効なときや初期化に失敗したときも、主要コンテンツと主要導線に到達できるようにする。
- DOM の取得には `js-` クラスを使い、そのクラスにスタイルを指定しない。
- 見た目の状態は BEM の Modifier と WAI-ARIA 属性（`aria-current`、`aria-expanded` など）で表す。
- HTML 文字列を組み立てて `innerHTML` に入れない。
  Astro で出力した `<template>` を複製し、`textContent` で値を入れる。
- `fetch` の失敗時は利用者にメッセージを表示する。
- タブは標準 DOM API と WAI-ARIA（`tablist`、`tab`、`tabpanel`）で実装する。
- カルーセルを自動再生する場合は停止ボタンを付ける。
  `prefers-reduced-motion` のときは自動再生しない。

## 構成

リニューアル後の配置は [ディレクトリ構成](../directory-structure.md) に従う。

| 配置                   | 置くもの                    | ファイル名                                          |
| ---------------------- | --------------------------- | --------------------------------------------------- |
| `src/scripts/main.ts`  | 共通の初期化                | `main.ts`                                           |
| `src/scripts/module/`  | 特定の Block に使う処理     | 接頭辞を除いた Block 名（`l-header` → `header.ts`） |
| `src/scripts/feature/` | 特定の Block に属さない機能 | 機能名                                              |

- `module/` の処理は、対象 Block のルートに付けた `js-{接頭辞を除いた Block 名}` を使う（`l-header` → `js-header`）。
- 接頭辞を除くと `l-` と `m-` で同じ名前になる Block は作らない。
- 要素ごとに動く部品はクラスにして `export default` する。
  ページ全体で1回だけ動く処理は関数にして、名前付きで export する。
- `main.ts` で対象の要素を探し、要素ごとにインスタンス化する。
  要素がないページでは何もしない。
- `main.ts` は共通レイアウトの `<script>` から読み込む。
  Astro のフロントマターでは DOM に触れない。
- ページ固有の重い機能は、そのページから読み込む。
  共通の初期化と二重に登録しない。
- 出力ファイルの結合と分割は Astro のビルドに任せる。

```ts
import Tab from './module/tab';

function init() {
  document.querySelectorAll<HTMLElement>('.js-tab').forEach((element) => {
    new Tab(element);
  });
}

init();
```

## クラスの書き方

- コンストラクタでルート要素を受け取り、`this.root` と、使う子要素をプロパティに持つ。
  最後に `this.initialize()` を呼ぶ。
- イベントの登録は `attachEvent()` にまとめ、`initialize()` から呼ぶ。
- `attachEvent()` を作るときは、登録したイベントをすべて外す `detachEvent()` もセットで作る。
- イベントハンドラーは `handle` + 対象 + イベント名で名付ける（`handleButtonClick`）。
- イベントハンドラーはアロー関数のプロパティとして定義し、登録と解除で同じ関数を渡す。
- `#` のプライベートフィールドとプライベートメソッドは使わない。

次は、要素の取得とイベント管理の構成例。
タブの切り替え処理は省略している。

```ts
export default class Tab {
  root: HTMLElement;
  buttons: HTMLButtonElement[];

  constructor(root: HTMLElement) {
    this.root = root;
    this.buttons = [...root.querySelectorAll<HTMLButtonElement>('.js-tab-button')];
    this.initialize();
  }

  initialize() {
    this.attachEvent();
  }

  attachEvent() {
    this.buttons.forEach((button) => button.addEventListener('click', this.handleButtonClick));
  }

  detachEvent() {
    this.buttons.forEach((button) => button.removeEventListener('click', this.handleButtonClick));
  }

  handleButtonClick = (event: MouseEvent) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;

    // 対応するパネルを表示し、選択状態と WAI-ARIA 属性を更新する。
  };
}
```

## 型と書き方

- 現行の `astro/tsconfigs/strict` を継続する。
  クラスのプロパティと引数、共有データの形には型を付ける。
- 戻り値やローカル変数の型は、推論で分かる場合は省略する。
- DOM の取得結果が `null` になる場合と、イベントの対象が想定した要素でない場合を扱う。
  `any` や非 null アサーションで確認を省かない。
- 型だけを読み込むときは `import type` を使う。
- 非同期処理は `async` / `await` を原則とし、必要に応じて `then` を使う。
- カスタムイベント名は `{部品名}:{出来事}` にする（`tab:change`）。
- 真偽値の変数とプロパティは `is` で始める（`isOpen`）。
- 値がないかもしれないときは `?.` と `??` を使う。
- 自分で付ける名前の略語は [命名規則](../naming.md#略語) に従う。
- コメントは、処理の理由や、コードだけでは分かりにくいことを書く。
  Figma との対応や違いはコメントに書かない。

Astro での読み込み方は、[公式のスクリプトの説明](https://docs.astro.build/en/guides/client-side-scripts/)と[TypeScript の説明](https://docs.astro.build/en/guides/typescript/)を参照する。

# Yuki Endo Portfolio

フロントエンドエンジニア、遠藤勇気のポートフォリオサイトです。

これまでの経歴、担当したプロジェクト、フロントエンド開発で重視している設計と品質への取り組みを掲載しています。

[公開サイトを見る](https://endoyuki.jp)

## サイト構成

- **トップページ**：プロフィール、経歴、代表的なプロジェクト、お問い合わせ先を掲載しています。
- **プロジェクト詳細**：背景、担当範囲、技術的な判断、実装内容、成果をプロジェクトごとに紹介しています。
- **404ページ**：存在しないURLへアクセスした場合の案内を表示します。

## 実装上の特徴

- Astroによる完全な静的サイトとして構築しています。
- TypeScriptでコンポーネントと掲載データを型付けしています。
- SCSSとBEMを使用し、コンポーネント単位でスタイルを管理しています。
- Three.jsで生成したローポリの家を、書斎・踊り場・階段・リビング・キッチン・玄関の順に巡ります。
- 停留点ではカメラがモニター、額縁、階段の年号、テレビに寄り、そこに経歴や作品を映して見せます。
- Swiperを使用し、プロジェクト詳細の画像をカルーセルで表示します。
- ESLint、Stylelint、markdownlint、Prettierでコードと文書の品質を確認します。

## 技術構成

| 分類                 | 使用技術                                  |
| -------------------- | ----------------------------------------- |
| サイトジェネレーター | Astro                                     |
| 言語                 | TypeScript                                |
| スタイル             | SCSS                                      |
| 3D表現               | Three.js、WebGL                           |
| カルーセル           | Swiper                                    |
| アイコン             | Lucide                                    |
| コード品質           | ESLint、Stylelint、markdownlint、Prettier |
| 開発環境             | Node.js 24、pnpm 11、mise                 |

## セットアップ

Node.js 24.22.1以降の24系とpnpm 11が必要です。

miseを使用する場合は、リポジトリに定義されたバージョンをインストールできます。

```sh
mise install
pnpm install
```

開発サーバーを起動します。

```sh
pnpm dev
```

起動後、`http://localhost:4321` をブラウザで開きます。

## コマンド

```sh
pnpm dev          # 開発サーバーを起動
pnpm build        # 型チェックと静的ビルドを実行
pnpm preview      # ビルド結果をローカルで確認
pnpm check        # Lint、整形検査、型チェック、静的ビルドを実行
pnpm lint         # ESLint、Stylelint、markdownlint、整形検査を実行
pnpm format       # Lintの自動修正とPrettierによる整形を実行
pnpm format:check # Prettierによる整形漏れを確認
```

`.editorconfig` で改行を LF、インデントをスペース2個に揃えます。
Prettier は120文字幅とシングルクォートを基本にし、Astro の構文にも対応しています。
追加する依存パッケージは `pnpm-workspace.yaml` の `saveExact: true` により固定バージョンで保存します。

## ディレクトリ構成

```text
.
├── public/assets/   # 画像、アイコン、favicon、OG画像、フォント、3Dモデル
├── src/
│   ├── components/  # Astroコンポーネント
│   ├── data/        # 経歴とプロジェクトの掲載データ
│   ├── layouts/     # 共通レイアウト
│   ├── pages/       # ページとルーティング
│   ├── scripts/     # WebGLと画面操作のクライアントスクリプト
│   └── styles/      # 共通スタイル、ページスタイル、Sassツール
├── astro.config.mjs
└── package.json
```

## 共通部品とサイト設定

ヘッダー、スマートフォンメニュー、3D画面の章ナビゲーションは `src/data/chapters.ts` の項目を使います。
ProfileとWorksのアコーディオンは `src/components/module/m-accordion.astro` にまとめています。
Profileでは見出しを含むため、`headingTag="h3"` を指定します。

title、description、OGP、Xのカード情報は `src/layouts/BaseLayout.astro` で出力します。
canonicalと共有用のURLは、開発サーバーのURLではなく `astro.config.mjs` の `site` を基準にします。
404ページには `noindex, follow` を指定しています。

GA4の測定IDは `G-V8C2P15644` です。
本番ビルドを `site` と同じホスト名で開いたときだけGoogleタグを読み込み、開発サーバーとローカルプレビューでは計測しません。
ページビューは[Googleタグの標準動作](https://developers.google.com/analytics/devguides/collection/ga4/views)に任せ、手動送信による重複を避けています。
GA管理画面での受信状況は、公開後に対象プロパティのリアルタイムレポートで確認します。

## ビルド

次のコマンドで静的ファイルを生成します。

```sh
pnpm build
```

生成物は `dist/` に出力され、静的ファイルを配信できるホスティング環境へデプロイできます。
画像などは `dist/assets/`、ビルドで生成するJS・CSSなどは `dist/assets/bundle/` にまとまります。

## アニメーション無効時と代替表示の確認

ChromeのDevToolsでコマンドメニュー（macOSでは `Command + Shift + P`）を開き、`Show Rendering` を選びます。
`Emulate CSS media feature prefers-reduced-motion` を `prefers-reduced-motion: reduce` にして再読み込みすると、3Dが静止し、本文が通常の縦並びになります。
元に戻すときは `No emulation` を選び、再読み込みします。
[Chrome公式の説明](https://developer.chrome.com/docs/devtools/rendering/emulate-css)も参照してください。

画像を使う代替表示は別の状態です。
DevToolsのコマンドメニューで `Disable JavaScript` を選び、再読み込みすると確認できます。
確認後は `Enable JavaScript` で戻します。
TOPの `assets/img/img_hero_avatar.webp` は、この状態と3D初期化失敗時に使う静止画像です。

## 制作ツールと素材

`tools/` には、3Dモデルの加工やフォントの字形変換に使用するツールがあります。
通常の開発・ビルドでは、`public/assets/` にある加工済みのファイルを使用します。
ツールで再生成する場合は、利用許諾のある入力素材を別途用意してください。
Blenderの編集原本と家具の元データを置く `tools/blender/source/`、作業用の出力先 `output/` は公開対象に含めません。

`/sitemap.xml` と `/robots.txt` は、掲載作品と本番 URL からビルド時に生成します。

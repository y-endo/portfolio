# Yuki Endo Portfolio

フロントエンドエンジニア、遠藤勇気のポートフォリオサイトです。

これまでの経歴、担当したプロジェクト、フロントエンド開発で重視している設計と品質への取り組みを掲載しています。

[公開サイトを見る](https://endoyuki.jp)

## サイト構成

- **トップページ**：プロフィール、経歴、代表的なプロジェクト、お問い合わせ先を掲載しています。
- **プロジェクト詳細**：背景、担当範囲、技術的な判断、実装内容、成果をプロジェクトごとに紹介しています。

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

export type WorkImage = { src: string; width: number; height: number; alt: string };

export type Work = {
  slug: string;
  number: string;
  year: string;
  category: string;
  title: string;
  summary: string;
  challenge: string;
  role: string;
  scope: string;
  outcome: string;
  url?: string;
  scale?: string;
  team: string;
  technologyGroups: Array<{ label: string; items: string[] }>;
  cover: WorkImage;
  detailImages: WorkImage[];
  sections: Array<{
    title: string;
    lead: string;
    paragraphs: string[];
    points?: string[];
  }>;
};

export const works: Work[] = [
  {
    slug: 'endo-journal',
    number: '01',
    year: '2026',
    category: '個人開発の技術ブログ',
    title: 'ENDO JOURNAL',
    summary:
      'Web開発やAIの活用、個人で作ったサービスについて書いている技術ブログです。デザインの検討から実装までCodexと進め、私は方針の決定や修正指示、動作確認を担当しました。',
    challenge: 'コードや画像を含む技術記事を読みやすく表示し、原稿を追加するだけで記事を増やせるようにすること。',
    role: '企画、設計、AIへの実装指示、動作確認、運用',
    scope: '画面設計、記事テンプレート、記事管理、サイト内検索、公開作業の自動化、アクセス解析',
    outcome:
      'ブログを公開し、開発の記録を更新しています。記事はMDXで管理し、GitHub Actionsから公開できるようにしました。',
    url: 'https://blog.endoyuki.jp/',
    team: '個人開発',
    technologyGroups: [
      { label: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'SCSS'] },
      { label: 'Content', items: ['MDX', 'Shiki'] },
      { label: 'Platform', items: ['Amazon S3', 'Amazon CloudFront', 'GitHub Actions'] },
      { label: 'Analytics', items: ['Google Analytics 4', 'GA4 Data API'] },
      { label: 'AI', items: ['Codex'] },
    ],
    cover: {
      src: '/assets/img/img_work_endo_journal_top.webp',
      width: 1600,
      height: 1000,
      alt: 'ENDO JOURNALのトップページ。注目記事のカルーセルとカテゴリ、新着記事を表示。',
    },
    detailImages: [
      {
        src: '/assets/img/img_work_endo_journal_top.webp',
        width: 1600,
        height: 1000,
        alt: 'ENDO JOURNALのトップページ。注目記事のカルーセルとカテゴリ、新着記事を表示。',
      },
      {
        src: '/assets/img/img_work_endo_journal_article.webp',
        width: 1600,
        height: 1000,
        alt: 'ENDO JOURNALの記事ページ。ブログをAIエージェントと制作した過程を紹介。',
      },
    ],
    sections: [
      {
        title: 'ブログの画面構成',
        lead: '記事を探すトップページと、本文を読む記事ページを分けてデザインしました。',
        paragraphs: [
          'トップページには注目記事のカルーセルと記事一覧を配置しました。白い背景をベースに、日本語の本文が読みやすい文字サイズや余白を調整しています。',
          'デザイン案はHTMLで作成し、ブラウザーで見比べながら選びました。配色やカードの形など、気になる箇所をCodexに伝え、修正を重ねています。',
        ],
      },
      {
        title: 'Codexとの役割分担',
        lead: 'コードはCodexに書いてもらい、実装後の画面を自分で操作して確認しました。',
        paragraphs: [
          '開発を始める前に、ファイルの配置や命名、Next.js、React、SCSSの書き方を決めました。Codexにはその規約に沿って実装を依頼しています。',
          '動作確認では、ボタンを連打すると、操作をやめた後もカルーセルが動き続ける不具合などを見つけました。再現手順を伝えて修正を依頼し、Playwrightでも同じ操作を確認させています。',
        ],
      },
      {
        title: '記事の管理と検索',
        lead: '記事はMDXで管理し、本文と一緒にタイトルや公開日、カテゴリを記録しています。',
        paragraphs: [
          '記事ごとにページを実装する必要はなく、原稿と画像を追加すれば一覧にも反映されます。コードの色分けや画像表示には共通のコンポーネントを使っています。',
          'カテゴリやタグ、サイト内検索から記事を探せます。人気記事の一覧には、Google Analytics 4の閲覧データを使っています。',
        ],
      },
      {
        title: '記事を公開する仕組み',
        lead: 'Next.jsで生成したHTMLを、Amazon S3とCloudFrontで配信しています。',
        paragraphs: [
          '公開時にはGitHub Actionsで記事情報を検証し、ビルドとアップロードを行います。下書きの記事は公開対象から除外します。',
          'あらかじめ生成したファイルを配信するため、閲覧のたびにNext.jsのサーバーでページを生成する必要はありません。',
        ],
      },
    ],
  },
  {
    slug: 'mononoyorimichi',
    number: '02',
    year: '2026',
    category: '個人開発の雑貨メディア',
    title: 'もののよりみち',
    summary:
      '文房具やミニチュア、暮らしの小物などを紹介する雑貨メディアです。企画からデザイン、開発、運用まで個人で担当しています。コアリクイのキャラクターやイラストを使い、親しみやすい雰囲気にしました。',
    challenge: '写真やイラストを多く使いながら画像の容量を抑え、記事と商品情報を更新しやすくすること。',
    role: '企画、デザイン、開発、運用',
    scope: '画面設計、記事管理、画像の最適化、サイト内検索、商品情報の取得、公開作業の自動化、アクセス解析',
    outcome:
      'サイトを公開し、雑貨の紹介記事を更新しています。画像の変換や記事情報のチェックは、公開時に自動で行うようにしました。',
    url: 'https://mononoyorimichi.jp/',
    team: '個人開発',
    technologyGroups: [
      { label: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'SCSS'] },
      { label: 'Content', items: ['MDX', 'Sharp'] },
      { label: 'Platform', items: ['Amazon S3', 'Amazon CloudFront', 'GitHub Actions'] },
      { label: 'Data', items: ['楽天API', 'Google Analytics 4', 'GA4 Data API'] },
    ],
    cover: {
      src: '/assets/img/img_work_mononoyorimichi_top.webp',
      width: 1600,
      height: 1000,
      alt: 'もののよりみちのトップページ。コアリクイのキャラクターと、カテゴリやテーマごとの記事一覧。',
    },
    detailImages: [
      {
        src: '/assets/img/img_work_mononoyorimichi_top.webp',
        width: 1600,
        height: 1000,
        alt: 'もののよりみちのトップページ。コアリクイのキャラクターと、カテゴリやテーマごとの記事一覧。',
      },
      {
        src: '/assets/img/img_work_mononoyorimichi_list.webp',
        width: 1600,
        height: 1000,
        alt: 'もののよりみちの記事一覧。雑貨の写真とカテゴリ、テーマを並べたカード。',
      },
      {
        src: '/assets/img/img_work_mononoyorimichi_article.webp',
        width: 1600,
        height: 1000,
        alt: 'もののよりみちの記事詳細。Drumstick Pencilsの紹介記事のタイトル、導入文、商品写真。',
      },
    ],
    sections: [
      {
        title: '雑貨を探す画面のデザイン',
        lead: '商品の種類に加えて、見た目や特徴からも記事を探せるようにしました。',
        paragraphs: [
          '文房具などの商品カテゴリとは別に、「食べ物そっくり」「小さいのに細かい」といったテーマで記事を分類しています。商品名を知らなくても、気になるテーマから雑貨を探せます。',
          '配色はクリーム色と淡い黄色を中心に、丸みのある書体を合わせました。カテゴリのイラストや案内役のコアリクイも、サイトの雰囲気に合わせて制作しています。',
        ],
      },
      {
        title: '記事と商品情報の管理',
        lead: 'ENDO JOURNALの仕組みをもとに、雑貨の紹介に必要な機能を追加しました。',
        paragraphs: [
          '記事はMDXで管理し、商品情報やキャラクターのコメントを本文に挿入できるようにしました。公開した記事をもとに、カテゴリ別の一覧やサイト内検索のデータも生成します。',
          '商品の情報は記事本文とは別に管理しています。楽天APIから取得した情報を使い、商品画像や購入先へのリンクを表示します。',
        ],
      },
      {
        title: '表示サイズに合わせた画像の生成',
        lead: 'サイトで使う写真やイラストは、表示する大きさに合わせて変換しています。',
        paragraphs: [
          '元画像は残したまま、Sharpで複数サイズのWebP画像を生成します。画面幅に合う画像をブラウザーが選ぶため、小さな画像の表示に必要以上に大きなファイルを読み込まずに済みます。',
          '元画像や変換の設定が変わっていなければ、生成済みの画像を再利用します。楽天APIの商品画像は変換せず、提供されたURLから表示しています。',
        ],
      },
      {
        title: '記事の公開とアクセス解析',
        lead: '公開前のチェックからアップロードまで、GitHub Actionsで実行しています。',
        paragraphs: [
          '記事情報や画像の参照先をチェックしてから、画像とHTMLを生成します。アップロード先はAmazon S3で、画像などを先に配置してからHTMLを更新します。配信にはCloudFrontを使っています。',
          'Google Analytics 4で閲覧数を計測し、そのデータをもとに人気記事を表示しています。集計結果は、サイトの公開処理を実行するたびに反映されます。',
        ],
      },
    ],
  },
  {
    slug: 'manga-recommendation',
    number: '03',
    year: '2026',
    category: '個人開発のWebアプリケーション',
    title: 'マンガPick（停止中）',
    summary:
      '漫画を探し、読書状況を記録し、作品を評価した履歴をもとに、次に読む一冊を提案するレコメンデーションサービス。AIバイブコーディングを取り入れ、企画から本番運用までを個人で担っています。',
    challenge:
      '検索、記録、推薦をつなぐ利用体験と、信頼できる作品データ、安全な認証、継続運用できる基盤を、AIエージェントとともに構築すること。',
    role: '企画、要件定義、技術判断、運用',
    scope: 'UI/UX設計、フルスタック開発、AI推薦、認証、データ運用、アクセス解析、インフラ運用',
    outcome:
      '漫画の検索、評価、読書記録、パーソナライズ推薦を備えたサービスを公開しました。コード作成の大部分をAIエージェントに任せ、私は要件整理、判断、検証に集中しました。',
    scale: '漫画800作品以上',
    team: '個人開発',
    technologyGroups: [
      {
        label: 'Frontend',
        items: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS'],
      },
      {
        label: 'Data',
        items: ['Drizzle ORM', 'PostgreSQL', 'pgvector', 'Neon'],
      },
      {
        label: 'Platform',
        items: ['Upstash', 'Vercel', 'AWS SES', 'Sentry'],
      },
      {
        label: 'Quality',
        items: ['Vitest', 'Playwright'],
      },
      {
        label: 'AI',
        items: ['Codex', 'Claude Code', 'OpenAI API'],
      },
    ],
    cover: {
      src: '/assets/img/img_work_mangapick_top.webp',
      width: 2400,
      height: 1500,
      alt: 'マンガPickのトップページ。サービス紹介と漫画作品を並べたメインビジュアル。',
    },
    detailImages: [
      {
        src: '/assets/img/img_work_mangapick_top.webp',
        width: 2400,
        height: 1500,
        alt: 'マンガPickのトップページ。サービス紹介と漫画作品を並べたメインビジュアル。',
      },
      {
        src: '/assets/img/img_work_mangapick_gallery_01.webp',
        width: 1800,
        height: 1200,
        alt: 'マンガPickの漫画一覧ページ。検索条件と作品カードが並んでいる。',
      },
      {
        src: '/assets/img/img_work_mangapick_gallery_02.webp',
        width: 1800,
        height: 1200,
        alt: 'マンガPickの漫画詳細ページ。作品情報、読書ステータス、評価、レビューを表示している。',
      },
      {
        src: '/assets/img/img_work_mangapick_gallery_03.webp',
        width: 1800,
        height: 1200,
        alt: 'マンガPickのマイページ。おすすめ作品と利用状況を確認できるダッシュボード。',
      },
      {
        src: '/assets/img/img_work_mangapick_gallery_04.webp',
        width: 1800,
        height: 1200,
        alt: 'マンガPickのレビュー一覧ページ。作品への評価と投稿されたレビューを表示している。',
      },
    ],
    sections: [
      {
        title: '背景と課題',
        lead: '推薦機能だけを試すデモではなく、作品探しから読書記録まで継続して使えるサービスを目指しました。',
        paragraphs: [
          '漫画を推薦するには、ユーザーの好みを捉える仕組みに加えて、検索対象となる作品データ、正確な書誌情報、評価や読書記録を残せる導線、推薦理由の表示が必要です。',
          'フロントエンドだけでなく、データベース、推薦ロジック、認証、監視、デプロイまでを含むWebサービスとして設計しました。',
          '個人開発でこの範囲を継続するため、コードを直接書く作業にはAIエージェントを活用し、私は要件整理と判断を担う開発方法を採用しました。',
        ],
        points: [
          '検索、読書記録、評価、推薦を一つにつなぐ利用体験',
          '推薦の根拠となる作品データの正確性と出典管理',
          '認証を伴うパーソナライズと安全な本番運用',
          'AIエージェントを前提とした個人開発の進め方',
        ],
      },
      {
        title: '作ったサービス',
        lead: '漫画を探し、作品を知り、読書体験を記録し、次の一冊を見つける機能を一つにまとめました。',
        paragraphs: [
          '漫画一覧では、キーワード、作者、ジャンル、タグ、年代、読書ステータスを組み合わせて検索できます。',
          '作品詳細では、書誌情報、あらすじ、評価、レビュー、読書ステータス、購入先を確認できます。',
          'マイページでは、いいねした作品、投稿したレビュー、読書状況に加え、それらを反映したおすすめ作品をまとめて表示します。',
        ],
        points: [
          '通常検索とAIテーマ検索、複数条件の絞り込み',
          '作品詳細、評価、レビュー、読書ステータス、購入導線',
          'いいねと読書履歴を反映するパーソナライズ推薦',
          'メール確認、パスワード再設定、セッション管理を含む認証',
        ],
      },
      {
        title: 'AIバイブコーディングでの役割分担',
        lead: 'コードを直接書く作業の大部分をAIエージェントに任せ、私は要件整理、優先順位付け、採否判断に集中しました。',
        paragraphs: [
          '実装に入る前に、解決したい課題、受け入れ条件、非対象範囲、本番反映前に停止する条件をGitHub Issueへ整理します。',
          'AIエージェントは、既存コードの調査、実装方法の比較、コーディング、テスト、データ監査を担当します。',
          '実装担当とは別のAIエージェントに批判レビューを依頼し、指摘を反映してからStagingで検証します。',
          'AIエージェントの出力を無条件で採用する方法ではありません。AIエージェントに差分、テスト結果、Preview、本番ログを確認させ、その結果をもとに採否と本番反映を判断します。',
        ],
        points: [
          '人間による課題設定、要件定義、優先順位付け',
          'AIエージェントによる調査、実装、テスト',
          '実装担当とは別のAIによる批判レビュー',
          '検証結果に基づく人間の採否判断と本番承認',
        ],
      },
      {
        title: '検索と推薦の設計',
        lead: '生成AIの応答を検索結果や推薦結果としてそのまま表示せず、登録済みの作品データに結び付け、結果と理由を確認できる仕組みを実装しました。',
        paragraphs: [
          'AIテーマ検索では、ユーザーが入力した文章を埋め込みベクトルへ変換し、pgvectorによる類似度検索を行います。',
          '利用上限または外部APIの障害が発生した場合は、切り替えの理由を表示し、通常検索へ切り替えます。',
          'パーソナライズ推薦では、いいね、評価、読書ステータスと、作品のジャンル、タグ、埋め込みベクトル、人気度を組み合わせます。',
          '推薦理由は大規模言語モデルに生成させるのではなく、スコアの内訳から規則に沿って生成するため、同じ入力から結果と理由を再現できます。',
        ],
        points: [
          '自然な文章で探せるAIテーマ検索',
          '障害時も通常検索を使えるフォールバック',
          'ユーザー行動と作品データを組み合わせた推薦',
          '同じ入力から再現できる推薦結果と推薦理由',
        ],
      },
      {
        title: '公開後の改善',
        lead: '公開後に見つかった使いにくさや性能上の問題を課題ごとにIssueへ整理し、実画面とログを確認しながら改善しました。',
        paragraphs: [
          '漫画一覧は、検索、絞り込み、並び替えを一画面で扱える構成へ刷新し、作者名検索にも対応しました。狭い画面でも操作しやすいUIへ調整しました。',
          'データベースの応答を待つ間に長く表示されていたスケルトンは、Server Componentを分割し、データ取得が完了した領域から順に表示する構成へ変更しました。',
          'マイページの推薦は、複数回に分かれていたデータベースへの問い合わせを集約し、結果を待つ間も処理中であることが分かる表示へ改めました。',
          '認証機能は、ユーザー名とパスワードによる登録に加え、メール確認、パスワード再設定、既存セッションの失効まで扱える構成へ拡張しました。',
        ],
        points: [
          'スマートフォンで操作しやすい漫画検索',
          'Suspenseとストリーミングによる段階表示',
          '推薦処理の問い合わせ集約と待機表示',
          'メール確認と安全なアカウント復旧',
        ],
      },
      {
        title: 'データ品質と安全な運用',
        lead: '作品データを検証し、確認済みの変更だけを本番データベースへ反映する仕組みを整えました。',
        paragraphs: [
          '書誌情報は、楽天、openBD、国立国会図書館、Wikipediaなど複数の情報源を突き合わせ、出典、取得結果、判断根拠を成果物として保存します。',
          '本番データは、スキーマ検証、dry-run、差分確認を経て単一のトランザクションで反映しています。',
        ],
        points: [
          '複数の情報源と判断根拠を追跡できる成果物',
          '検証と差分確認を必須とする本番更新',
          '全作品、全項目を対象にした独立監査',
        ],
      },
      {
        title: '振り返り',
        lead: 'AIバイブコーディングでは、コードを書く量よりも、何を作るか、どの結果を採用するかという判断の質が問われました。',
        paragraphs: [
          'AIエージェントは短時間で多くの実装案を出せますが、解くべき課題、受け入れ条件、運用上の制約までは自動的に決まりません。',
          '人間が要件と停止条件を定め、AIエージェントが実装と検証を進め、その結果を人間が確認して判断する流れで開発しました。',
          'この方法により、コードを直接書く作業をほぼAIエージェントに任せながら、検索、推薦、認証、データ運用を備えたサービスを継続して改善しています。',
        ],
      },
    ],
  },
];

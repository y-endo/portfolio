export type WorkImage = { src: string; width: number; height: number; alt: string };

export type Work = {
  slug: string;
  number: string;
  year?: string;
  status: string;
  category: string;
  title: string;
  summary: string;
  challenge: string;
  role: string;
  scope: string;
  outcome: string;
  url?: string;
  articleUrl?: string;
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
    slug: 'headless-cms-migration',
    number: '01',
    year: '2025–2026',
    status: '2026年リリース・担当は移行開発とリリース後1か月の運用支援',
    category: '実務のケーススタディ',
    title: '数万ページ規模のCMS移行をリード',
    summary:
      '数万ページ規模の公共系サイトを静的CMSからヘッドレスCMSへ移行する案件で、フロントエンド5名のチームでリードを務めました。Astroの基盤とAPIの構成を設計し、移行前後のコンテンツを自動チェックと表示確認で検証して、予定どおりリリースしました。',
    challenge:
      '現行サイトの運用を続けながら配信速度などの課題を解消し、約2,000ページのコンテンツを同じ内容のまま移行すること。',
    role: 'フロントエンドリード（設計・実装・レビュー、移行の検証、メンバーの開発支援）',
    scope:
      'ヘッドレスCMSのAPI構成の設計、Astroのテンプレート基盤、CMSの仕様確認、手順書とコーディング規約の整備、開発環境の導入支援、タスクの割り振り、進行管理',
    outcome:
      '予定どおりリリースし、CMS運用におけるビルド時間は移行前の2倍以上速くなりました。リリース後1か月のハイパーケアでは、CMS製品の不具合の修正をベンダーと協力して進めました。',
    scale: 'サイト全体で数万ページ・テンプレート約30種類・移行コンテンツ約2,000ページ',
    team: 'フロントエンド5名（リードとして4名を支援）・インフラ、バックエンド、ディレクターと連携',
    technologyGroups: [
      { label: 'Frontend', items: ['Astro', 'TypeScript', 'JavaScript', 'HTML', 'CSS'] },
      { label: 'Content', items: ['ヘッドレスCMS', 'CMS API'] },
      { label: 'Quality', items: ['Vitest', 'Playwright', 'axe-core'] },
      { label: 'Development', items: ['GitHub Copilot'] },
    ],
    cover: {
      src: '/assets/img/img_work_headless_cms_migration.webp',
      width: 1586,
      height: 992,
      alt: '公共系サイトのCMS移行を表すイメージ画像。建物とWebコンテンツを淡い青とクリーム色の3Dで表現。',
    },
    detailImages: [
      {
        src: '/assets/img/img_work_headless_cms_migration.webp',
        width: 1586,
        height: 992,
        alt: '公共系サイトのCMS移行を表すイメージ画像。実際の建物や顧客サイトを再現したものではありません。',
      },
      {
        src: '/assets/img/img_work_headless_cms_migration.svg',
        width: 1600,
        height: 1000,
        alt: '実画面ではなく担当範囲の説明図。CMSの仕様確認、Astro基盤の開発、移行直後1か月の運用支援。',
      },
    ],
    sections: [
      {
        title: '移行の目的と規模',
        lead: '配信速度などの性能と使い勝手を改善するため、公共系サイトを静的CMSからヘッドレスCMSへ移行しました。',
        paragraphs: [
          'サイト全体は数万ページ規模で、テンプレートは約30種類あります。このうち約2,000ページのコンテンツを移行しました。現行サイトの運用を続けながら、移行先の開発を進めました。',
          'フロントエンドエンジニアは私を含めて5名で、私はリードとして、設計、実装、レビューと4名のメンバーの開発支援を担当しました。インフラ・バックエンドの担当者やディレクターと課題を共有し、チーム内で解決できないCMSの仕様や不具合はベンダーへ直接問い合わせました。',
          '顧客を特定する情報は伏せています。冒頭の画像はCMS移行を表すイメージ画像で、実際の建物や顧客サイトを再現したものではありません。',
        ],
      },
      {
        title: 'APIの構成とテンプレート基盤の設計',
        lead: 'CMSが生成するAPIの構成と使い方を決め、各テンプレートに展開する基盤を作りました。',
        paragraphs: [
          'API本体はCMSが生成するため、私が設計したのはエンドポイントの構成です。どのようなエンドポイントをいくつ用意するか、どのデータをどのエンドポイントから取得するか、どのページでどのAPIを使うかを決めました。',
          'コンポーネントは、HTMLモックとテンプレートを見比べて共通化できる部分を選定し、分割しました。APIから取得したデータの扱いとあわせて基盤を設計し、各テンプレートへ展開しました。',
          'Astroは上位のエンジニアの提案をもとにチームで採用を決めました。私はこのプロジェクトで初めてAstroを使用し、公式ドキュメントやAIによる実装補助を活用しながら実装しました。',
        ],
      },
      {
        title: '移行前後のコンテンツの検証',
        lead: '数件のページで試した移行テストで、WYSIWYGエディターの自動修正の挙動差を見つけました。',
        paragraphs: [
          '現行の運用ルールを関係者へ共有し、既存の仕様と移行先の仕様を照らし合わせて、新しい構成へ変更する部分と引き継ぐ部分を確認しました。',
          '数件のページで移行テストを実施した際に、WYSIWYGエディターによるHTMLの自動修正の挙動が、現行と移行先で異なることに気づきました。放置すると移行前後でコンテンツに差分が生じ、書き換わっていないことを確認する移行手順で異常として検知されます。そこで自動修正を無効にするなどの対応を行いました。',
          '移行後は、自動チェックツールに加えて、PlaywrightのE2Eテストでスクリーンショットを撮影し、人が表示を確認しました。',
        ],
      },
      {
        title: '4名のメンバーと進めるための準備',
        lead: 'テンプレートの雛形と規約を用意し、メンバーが多言語展開を分担できるようにしました。',
        paragraphs: [
          'メンバーはアナリスト2名、シニアアナリスト2名の計4名です。開発環境の導入、実装のサポート、タスクの割り振り、進行管理、コードレビューを担当しました。',
          '手順書はWikiに、コーディング規約はMarkdownにまとめました。Astroの雛形は私がすべて作成し、メンバーには多言語展開を分担してもらいました。',
          'レビューでは、構造や変更箇所を把握しやすく、運用時に管理しやすい形になっているかを確認しました。修正を依頼する際は、修正理由やAstroの設計意図も説明しました。',
        ],
      },
      {
        title: '自動テストの導入とAIによる実装補助',
        lead: 'APIのデータを整形する処理の単体テストと、アクセシビリティの自動チェックを導入しました。',
        paragraphs: [
          '単体テストにはVitestを使い、APIから取得した日付データのフォーマットなどのユーティリティを対象にしました。アクセシビリティの自動テストにはaxe-coreとPlaywrightを使用しました。テストケースの作成にはGitHub Copilotを活用しました。',
          'HTMLモックからAstroファイルを作成する際は、Copilotに初稿を生成させ、自分の実装を補助する形で利用しました。生成されたコードをレビューし、必要な修正を依頼しました。',
        ],
      },
      {
        title: 'リリースとその後の対応',
        lead: '予定どおりリリースし、CMS運用におけるビルド時間を短縮しました。',
        paragraphs: [
          'プロジェクトは2026年に予定どおりリリースしました。CMS運用におけるビルド時間は、移行前の2倍以上速くなりました。',
          'リリース後は1か月のハイパーケア（移行直後の運用支援）を担当し、CMS製品自体の不具合の修正をベンダーと協力して進めました。私の担当はここまでで、その後の継続運用には参画していません。',
        ],
      },
    ],
  },
  {
    slug: 'recruit-site-api-integration',
    number: '02',
    year: '2024',
    status: '実務案件・顧客情報と実画面は非掲載',
    category: '実務のケーススタディ',
    title: '採用サイトのAPI連携とVue実装',
    summary:
      '大手企業の採用サイトの実装を、開発担当1名としてVue 2ですべて担当しました。デザインとAPI仕様書を照らし合わせて不足するデータを洗い出し、ディレクターと連携してAPIの修正を依頼しました。API側の修正が難しいものは、JavaScriptで対応しました。',
    challenge: 'デザインとAPIをそれぞれ別の担当先が用意する体制で、画面に必要なデータをそろえて実装すること。',
    role: 'フロントエンド実装の全般（開発担当1名）、API仕様の確認と調整',
    scope: 'Vue 2による画面実装、デザインとAPI仕様書の突き合わせ、不足データの連携、API修正の依頼、JavaScriptでの対応',
    outcome: '画面に必要なデータをAPIの修正とJavaScriptでの対応で補い、サイト全体の実装を一人で担当しました。',
    team: '開発1名（実装をすべて担当）・ディレクター1名（顧客対応を担当）',
    technologyGroups: [
      { label: 'Frontend', items: ['Vue 2', 'JavaScript', 'HTML', 'CSS'] },
      { label: 'Integration', items: ['API連携'] },
    ],
    cover: {
      src: '/assets/img/img_work_recruit_site_api.svg',
      width: 1600,
      height: 1000,
      alt: '実画面ではなく担当範囲の説明図。デザインとAPI仕様書を突き合わせ、APIの修正またはJavaScriptでの対応を経てVue 2で実装する流れ。',
    },
    detailImages: [
      {
        src: '/assets/img/img_work_recruit_site_api.svg',
        width: 1600,
        height: 1000,
        alt: '実画面ではなく担当範囲の説明図。デザインとAPI仕様書を突き合わせ、APIの修正またはJavaScriptでの対応を経てVue 2で実装する流れ。',
      },
    ],
    sections: [
      {
        title: '案件の体制と担当',
        lead: 'デザインとAPIが別々に用意される案件で、開発を一人で担当しました。',
        paragraphs: [
          '大手企業の採用サイトをVue 2で実装した案件です。デザインは別の会社が制作し、APIは顧客側が用意しました。',
          '体制はディレクター1名と開発の私1名です。顧客対応はディレクターが担当し、実装はすべて私が担当しました。',
          '顧客を特定する情報は伏せています。画像は担当範囲の説明図で、実際の画面ではありません。',
        ],
      },
      {
        title: 'デザインとAPI仕様書の突き合わせ',
        lead: '画面に必要なデータとAPIから取得できるデータを照らし合わせ、不足を洗い出しました。',
        paragraphs: [
          'サイトの構成とデザインから実装する内容を整理し、API仕様書と照らし合わせました。画面に必要なデータが不足している場合は、ディレクターと連携してAPIの修正を依頼しました。',
        ],
      },
      {
        title: 'APIの修正とJavaScriptでの対応の判断',
        lead: 'API側の修正が難しいものは、フロントエンドのJavaScriptで対応しました。',
        paragraphs: [
          '不足するデータのすべてをAPIの修正で解決するのではなく、API側の修正の大きさを踏まえて対応先を分けました。修正が難しいものはJavaScriptで対応し、デザインどおりの画面を実装しました。',
        ],
      },
    ],
  },
  {
    slug: 'shared-household-budget',
    number: '03',
    year: '2026',
    status: '夫婦2人で利用中・アプリとコードは非公開',
    category: '個人開発のWebアプリケーション',
    title: '共有家計簿',
    summary:
      '夫婦で収支を共有する家計簿です。レシートや明細から登録候補を読み取り、確認・補正して保存できます。利用開始後には、家賃などを毎回手入力する手間を減らすテンプレート機能を追加しました。',
    challenge: '2人分の収支を共有しながら、日々の記録にかかる入力の手間を減らすこと。',
    role: '企画、要件整理、仕様の検討、AIへの実装依頼、動作確認、運用',
    scope: '共有する収支の管理、OCRの補正画面、テンプレート、CSV取り込み、運用構成の検討',
    outcome:
      '夫婦で継続して利用しています。レシートを見ながら入力する作業を、候補を確認・補正する作業に変更。家賃などの繰り返す入力は、テンプレートから登録できるようにしました。',
    articleUrl: 'https://blog.endoyuki.jp/posts/building-kakeibo/',
    scale: '利用者2名',
    team: '個人開発',
    technologyGroups: [
      { label: 'Frontend', items: ['React', 'Vite'] },
      {
        label: 'Platform',
        items: ['Amazon S3', 'Amazon CloudFront', 'AWS Lambda', 'Amazon API Gateway', 'Amazon Cognito'],
      },
      { label: 'OCR', items: ['OpenAI API', 'Zod'] },
      { label: 'Development', items: ['Codex'] },
    ],
    cover: {
      src: '/assets/img/img_work_shared_household_budget_dashboard.webp',
      width: 1600,
      height: 719,
      alt: '共有家計簿のダッシュボード。今月の支出、収入、貯蓄、収支と明細登録への導線。',
    },
    detailImages: [
      {
        src: '/assets/img/img_work_shared_household_budget_dashboard.webp',
        width: 1600,
        height: 719,
        alt: '共有家計簿のステージング環境のダッシュボード。撮影時の今月の明細は未登録。',
      },
      {
        src: '/assets/img/img_work_shared_household_budget.svg',
        width: 1600,
        height: 1000,
        alt: '実画面ではなく登録フローの説明図。OCRの候補を人が確認・補正してから家計簿へ登録する。',
      },
    ],
    sections: [
      {
        title: '2人で記録を続けるための家計簿',
        lead: '収支を共有することと、入力の手間を減らすことを目的に作りました。',
        paragraphs: [
          '夫婦それぞれの収入と支出を一緒に確認でき、相手の明細を代理で登録できるアプリです。2026年6月に開発を始め、現在も2人で利用しています。',
          '私は目的や必要な機能、運用コストの条件を整理し、実装はCodexに依頼しました。開発中に想定した使い方と、実際に使って分かった不便さの両方から機能を見直しています。',
          'アプリとリポジトリは非公開です。このページではステージング環境の画面と、登録の流れを示す説明図を掲載しています。',
        ],
      },
      {
        title: 'OCRの候補を確認してから登録',
        lead: '読み取り結果をそのまま保存せず、人が確認・補正する画面を挟みました。',
        paragraphs: [
          'レシート画像や明細PDFから、日付、店舗名、金額、商品、カテゴリなどの登録候補を抽出します。返却形式はスキーマで定義していますが、形式が合っていても読み取り内容が正しいとは限りません。',
          '補正画面では内容を確認し、不要な行を外してから登録できます。読み取りの誤りを修正できることを、登録までの操作に組み込みました。',
          '初期の実装はレシートの合計を1件の支出にしていました。食料品と日用品などが混在するため、商品ごとにカテゴリを補正し、カテゴリ別または商品別に登録できる形へ変更しました。',
          '元画像は後から金額やカテゴリを確認するために保存し、ログイン済みの利用者が有効期限付きのURLから参照できる構成にしています。',
        ],
      },
      {
        title: '利用後に追加した入力テンプレート',
        lead: '家賃などを毎回手入力する手間を、テンプレートからの登録で減らしました。',
        paragraphs: [
          '利用を続けるなかで、家賃などのよく使う項目を繰り返し入力することが不便だと感じました。そこで、登録内容をテンプレートとして用意し、呼び出して入力できる機能を追加しました。',
          'OCRだけでは扱いにくい取引履歴には、PayPayとVisa（Vpass）のCSV取り込みも用意しました。登録前に一覧で確認・補正し、重複の可能性がある明細には警告を表示します。',
          'CSVの取り込み時に直した内容は取引先ごとの補正ルールとして保存し、次回の推定に使います。この推定にはOpenAI APIを呼び出していません。',
        ],
      },
      {
        title: '利用者2人に合わせた運用構成',
        lead: '月別のJSONをS3に保存し、同時更新の競合検出と過去データの復旧に備えました。',
        paragraphs: [
          'ReactとViteで作った画面をS3とCloudFrontで配信し、APIにはAPI GatewayとLambda、認証にはCognitoを利用しています。',
          'データはデータベースを使わず、月ごとのJSONとしてS3へ保存します。ETagで更新の競合を検出し、S3 Versioningで過去の状態を残す構成です。',
          '画像やPDFは署名付きURLでブラウザーからS3へ直接アップロードし、ファイルをAPI Gateway経由で転送しない構成にしました。OCRのためのOpenAI API呼び出しはLambda側で行います。',
          '月額300円程度を目標に構成を検討しました。この金額は設計時の目標であり、実測した運用費ではありません。利用者やデータ量が増える場合には、現在の構成の見直しが必要です。',
        ],
      },
    ],
  },
  {
    slug: 'mononoyorimichi',
    number: '04',
    year: '2026',
    status: '公開・更新中',
    category: '個人開発の雑貨メディア',
    title: 'もののよりみち',
    summary:
      '収益化を目標に、平均1日2時間で運営している雑貨メディアです。公開後にGA4とSearch Consoleで流入を計測し、扱うジャンルとXの運用方針を見直しました。運営を時間内に収めるため、X投稿の予約・送信と数値の取得を自動化しています。',
    challenge: '限られた運営時間の中で外部からの流入を増やし、収益化につながる集客の仕組みを作ること。',
    role: '企画、運営方針の決定、技術選定、AIへの実装依頼、動作確認、運用',
    scope: '競合調査、画面設計の決定、記事と商品情報の管理、画像の最適化、X投稿の自動化、アクセス解析と振り返り',
    outcome:
      '2026年9月にサイトを公開し、約40日の計測結果をもとにジャンルとXの運用方針を見直しました。現在は毎週の数値を記録しながら更新を続けています。',
    url: 'https://mononoyorimichi.jp/',
    team: '個人開発',
    technologyGroups: [
      { label: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'SCSS'] },
      { label: 'Content', items: ['MDX', 'Sharp'] },
      { label: 'Platform', items: ['Amazon S3', 'Amazon CloudFront', 'GitHub Actions'] },
      { label: 'Data', items: ['Google Analytics 4', 'GA4 Data API', 'Search Console', '楽天API', 'X API'] },
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
        title: '運営の目標と企画',
        lead: '収益化を目標に、平均1日2時間で運営できる雑貨メディアとして企画しました。',
        paragraphs: [
          '収益はGoogle AdSenseと、Amazon・楽天のアフィリエイトを想定しています。企画の段階では、雑貨を扱う6媒体の編集内容と購入先への導線を調査しました。',
          '文房具などの商品カテゴリとは別に、「食べ物そっくり」「小さいのに細かい」といったテーマで記事を分類しています。商品名を知らなくても、気になるテーマから雑貨を探せます。配色、ロゴ、案内役のコアリクイも、サイトの雰囲気に合わせて決めました。',
        ],
      },
      {
        title: '公開後の計測と方針の見直し',
        lead: '公開から約40日の計測で外部からの流入が少なかったため、原因を整理して方針を変えました。',
        paragraphs: [
          'GA4とSearch Consoleで流入元と検索での表示を確認したところ、外部から読まれている量はまだ少なく、Xのフォロワーも増えていませんでした。',
          'AIと原因を整理し、商品名で探す人向けの記事が検索の需要と合っていないこと、Xが記事の告知だけの場になっていることなどを課題にしました。',
          'そのうえで、扱うジャンルを「妙・そっくり・小さい」雑貨に絞り、まとめ・特集と新商品の記事を増やす方針に変えました。Xは案内役のキャラクターとして話すアカウントに切り替えています。現在は外部からの流入、検索での表示回数、Xのフォロワーを毎週記録し、効果を確認しています。',
        ],
      },
      {
        title: 'X投稿の自動化',
        lead: '1日2時間の運営に収めるため、X投稿の予約から送信、数値の取得までを自動化しました。',
        paragraphs: [
          'AIが作成した投稿を予約ファイルに登録し、GitHub Actionsが30分ごとに予定時刻を過ぎた投稿を送信します。送信済みの投稿を記録して二重投稿を防ぎ、予定から6時間を過ぎた投稿は送らずに飛ばします。',
          'Xの数値とフォロワー数は毎週自動で取得し、振り返りに使っています。いいねや返信は規約上自動化できないため、私が手動で行っています。',
        ],
      },
      {
        title: '記事・商品情報・画像の管理',
        lead: 'ENDO JOURNALの構成をもとに、雑貨の紹介に必要な商品情報と画像の処理を追加しました。',
        paragraphs: [
          '記事はMDXで管理し、商品情報は記事本文とは別に管理しています。楽天APIから取得した情報を使い、商品画像や購入先へのリンクを表示します。',
          'サイトで使う写真やイラストは、Sharpで表示サイズごとのWebP画像に変換します。公開時にはGitHub Actionsで記事情報と画像の参照先を検証してから、Amazon S3へアップロードし、CloudFrontで配信します。',
          '実装はAIエージェントに依頼し、私は技術構成の決定、画面と動作の確認を担当しました。',
        ],
      },
    ],
  },
  {
    slug: 'endo-journal',
    number: '05',
    year: '2026',
    status: '公開・更新中',
    category: '個人開発の技術ブログ',
    title: 'ENDO JOURNAL',
    summary:
      'Web開発や個人開発の記録を発信する技術ブログです。実装前にディレクトリ構成、命名、React・Next.js・SCSSの規約を定め、AIが生成するコードの書き方をそろえました。配信はS3とCloudFrontの静的構成にし、フレームワークはAIと相談してNext.jsを選びました。',
    challenge: 'AIエージェントに実装を任せながら、ページが増えてもファイルの配置や書き方がぶれない状態を保つこと。',
    role: '企画、技術選定、規約の策定、デザイン案の選定、AIへの実装依頼、動作確認、運用',
    scope: '技術構成、コーディング規約、画面設計の決定、記事管理、サイト内検索、公開作業の自動化、アクセス解析',
    outcome:
      'ブログを公開し、開発の記録を更新しています。規約の作成やデザインの検討に使ったAI向けのスキルは、GitHubで公開しています。',
    url: 'https://blog.endoyuki.jp/',
    team: '個人開発',
    technologyGroups: [
      { label: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'SCSS'] },
      { label: 'Content', items: ['MDX', 'Shiki'] },
      { label: 'Platform', items: ['Amazon S3', 'Amazon CloudFront', 'GitHub Actions'] },
      { label: 'Analytics', items: ['Google Analytics 4', 'GA4 Data API'] },
      { label: 'Quality', items: ['Playwright'] },
      { label: 'AI', items: ['Codex', '自作のAI向けスキル'] },
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
        title: '技術構成の決定',
        lead: '配信の構成とスタイルの書き方は自分で決め、フレームワークはAIと相談して選びました。',
        paragraphs: [
          '配信は、Amazon S3とCloudFrontによる静的な構成にすると最初に決めていました。あらかじめ生成したファイルを配信するため、閲覧のたびにサーバーでページを生成する必要はありません。',
          'JavaScriptのフレームワークはAIと比較・相談したうえでNext.jsを選びました。スタイルはTailwind CSSを使わず、SCSSで書くことにしました。',
        ],
      },
      {
        title: '実装前に決めたコーディング規約',
        lead: '画面を作り始める前に、ディレクトリ構成、命名、React、Next.js、SCSSの規約をAIと整理しました。',
        paragraphs: [
          '先に規約を決めたのは、ページが増えるたびにファイルの置き場所や書き方が変わる状態を避けるためです。規約の作成には、自作のAI向けスキルを使いました。',
          '実装はCodexに依頼し、私は技術構成とデザイン案の決定、修正指示、画面の動作確認を担当しました。',
        ],
      },
      {
        title: 'デザイン案の比較と決定',
        lead: 'AIがHTMLで出したデザイン案を比較し、採用する案を決めました。',
        paragraphs: [
          '白い背景、日本語が読みやすい文字サイズ、大きなカルーセル、グリッドの記事一覧という方向性を伝え、複数のデザイン案を出してもらいました。',
          '気になる箇所は、配色、余白、角丸などの候補から原因を絞り込み、それぞれの案の良いところを取り入れて決めました。デザインの方向性づくりにも、自作のAI向けスキルを使っています。',
        ],
      },
      {
        title: '動作確認と記事の公開',
        lead: '画面を操作して不具合を見つけ、記事の公開はGitHub Actionsで自動化しました。',
        paragraphs: [
          '動作確認では、カルーセルのボタンを連打すると移動が溜まる不具合や、追従するヘッダーがメニューを閉じた後に消えなくなる不具合を見つけ、修正を依頼しました。修正後はPlaywrightで同じ操作を確認させています。',
          '記事はMDXで管理し、原稿と画像を追加すれば一覧とサイト内検索に反映されます。公開時にはGitHub Actionsで記事情報を検証してから、ビルドとアップロードを行います。人気記事の一覧には、Google Analytics 4の閲覧データを使っています。',
        ],
      },
    ],
  },
];

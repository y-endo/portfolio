export type CareerEntry = {
  period: string;
  role: string;
  organization: string;
  title: string;
  summary: string;
  workUrl?: string;
};

export const career: CareerEntry[] = [
  {
    period: '2020–Present',
    role: 'Frontend Engineer / Associate Manager',
    organization: 'アクセンチュア株式会社',
    title: '2020年にアクセンチュア株式会社へ中途入社',
    summary:
      '大規模Webサイトの構築・運用・CMS移行に従事。2025年に始まったCMS移行では、フロントエンド5名のチームでリードを務め、Astroのテンプレート基盤とヘッドレスCMSのAPI構成の設計、実装、レビューを担当しました。2026年のリリース後は、1か月のハイパーケア（移行直後の運用支援）まで対応しました。',
    workUrl: '/works/headless-cms-migration/',
  },
  {
    period: '2018–2020',
    role: 'Frontend Engineer',
    organization: '株式会社アイ・エム・ジェイ',
    title: '2018年に株式会社アイ・エム・ジェイに中途入社',
    summary:
      '大手企業のWebサイト構築・運用プロジェクトに参画。コンポーネント設計、制作ルールの整備、品質の均一化、長期運用を前提としたフロントエンド実装を経験しました。',
  },
  {
    period: '2014–2018',
    role: 'Frontend Engineer',
    organization: '株式会社ユーティックス',
    title: '2014年に株式会社ユーティックスに新卒入社',
    summary:
      'コーポレートサイトやブランドサイトの構築・運用を通じて、HTML、CSS、JavaScript、レスポンシブデザインなど、Web制作とフロントエンド開発の基礎を身につけました。',
  },
];

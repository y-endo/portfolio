export type CareerEntry = {
  period: string;
  role: string;
  organization: string;
  summary: string;
};

export const career: CareerEntry[] = [
  {
    period: "2020 — Present",
    role: "Frontend Engineer / Associate Manager",
    organization: "アクセンチュア株式会社",
    summary:
      "官公庁の大規模Webサイト構築、リニューアル、CMS移行、運用と改善に従事。AIを活用した要件整理、開発、テスト、コードレビューによる生産性の向上。最大4名のフロントエンドチームで、技術選定、開発環境の構築、UI設計・ベース実装、コードレビュー、メンバーの開発支援、進捗管理を担当しています。",
  },
  {
    period: "2018 — 2020",
    role: "Frontend Engineer",
    organization: "株式会社アイ・エム・ジェイ",
    summary:
      "大手企業のWebサイト構築・運用プロジェクトに参画。コンポーネント設計、制作ルールの整備、品質の均一化、長期運用を前提としたフロントエンド実装を経験しました。",
  },
  {
    period: "2014 — 2018",
    role: "Frontend Engineer",
    organization: "株式会社ユーティックス",
    summary:
      "コーポレートサイトやブランドサイトの構築・運用を通じて、HTML、CSS、JavaScript、レスポンシブデザインなど、Web制作とフロントエンド開発の基礎を身につけました。",
  },
];

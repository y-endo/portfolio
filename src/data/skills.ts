export type SkillTier = {
  label: string;
  description: string;
  items: string[];
};

export const skillTiers: SkillTier[] = [
  {
    label: '実務での設計・実装',
    description: 'Webサイトの構築・運用、CMSテンプレートの設計・実装。Astroでは共通基盤の作成とレビューを担当。',
    items: ['HTML', 'CSS / SCSS', 'JavaScript', 'TypeScript', 'Astro', 'Vue', 'React', 'CMS'],
  },
  {
    label: '実務での品質・開発支援',
    description:
      '単体テストとアクセシビリティ自動テストを導入。Claude Codeは日常的に使い、繰り返す作業のスキル化とハーネスの調整まで担当。',
    items: ['Vitest', 'Playwright / axe-core', 'Claude Code', 'GitHub Copilot'],
  },
  {
    label: '個人開発での利用・運用',
    description: 'Next.jsのメディアをS3・CloudFrontで配信。共有家計簿ではLambda・CognitoとOCRを利用。',
    items: ['Next.js / React', 'AWS', 'OpenAI API', 'Codex / Claude Code'],
  },
];

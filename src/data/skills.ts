export type SkillTier = {
  /** Shown as the tier heading under its number. */
  label: string;
  items: string[];
};

/** Ordered from the strongest tier. The first one is featured. */
export const skillTiers: SkillTier[] = [
  {
    label: '得意分野',
    items: [
      'HTML',
      'CSS / SCSS',
      'JavaScript',
      'TypeScript',
      'React',
      'Vue',
      'CMS',
      'Claude',
      'Codex',
      'GitHub Copilot',
    ],
  },
  {
    label: '実務で対応可能',
    items: ['Next.js', 'PHP'],
  },
  {
    label: '学習中',
    items: ['AWS'],
  },
];

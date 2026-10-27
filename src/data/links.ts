export type ExternalLink = {
  label: string;
  /** What the visitor finds there, shown beside the name. */
  detail: string;
  href: string;
};

export const links: ExternalLink[] = [
  { label: 'Blog', detail: 'blog.endoyuki.jp', href: 'https://blog.endoyuki.jp/' },
  { label: 'X', detail: '@allAttackDamage', href: 'https://x.com/allAttackDamage' },
  { label: 'GitHub', detail: 'y-endo', href: 'https://github.com/y-endo' },
];

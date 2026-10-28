export const chapters = [
  { id: 'top', label: 'Top' },
  { id: 'profile', label: 'Profile' },
  { id: 'career', label: 'Career' },
  { id: 'works', label: 'Works' },
  { id: 'links', label: 'Links' },
  { id: 'contact', label: 'Contact' },
] as const;

export type ChapterId = (typeof chapters)[number]['id'];

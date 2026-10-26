export async function initHeroScene() {
  const root = document.querySelector<HTMLElement>('.js-hero-scene');
  if (!root) return;

  try {
    const { default: HeroAvatar } = await import('./hero-three-runtime');
    new HeroAvatar(root);
  } catch (error) {
    console.warn('Hero の3D表示を初期化できませんでした。', error);
    root.classList.add('m-hero-scene--fallback');
    document.querySelector('.js-site-header')?.classList.remove('site-header--intro');
    const status = root.querySelector<HTMLElement>('.js-hero-status');
    if (status) status.textContent = '3Dモデルを表示できませんでした。';
  }
}

export async function initHeroScene() {
  const root = document.querySelector<HTMLElement>('.js-hero-scene');
  if (!root) return;
  const loader = root.querySelector<HTMLElement>('.js-hero-loader');
  if (loader) {
    const controller = new AbortController();
    const handleLoadingScroll = (event: Event) => {
      if (getComputedStyle(loader).visibility === 'hidden') {
        controller.abort();
        return;
      }
      if (
        event instanceof KeyboardEvent &&
        !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
      )
        return;
      event.preventDefault();
      // Lenis must not accumulate wheel input behind the loading screen.
      event.stopImmediatePropagation();
    };
    for (const type of ['wheel', 'touchmove', 'keydown']) {
      window.addEventListener(type, handleLoadingScroll, {
        capture: true,
        passive: false,
        signal: controller.signal,
      });
    }
  }
  if (!window.location.hash) {
    window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  try {
    const { default: HeroAvatar } = await import('./hero-three-runtime');
    new HeroAvatar(root);
  } catch (error) {
    console.warn('Hero の3D表示を初期化できませんでした。', error);
    root.classList.remove('m-hero-scene--loading');
    root.classList.add('m-hero-scene--fallback');
    document.querySelector('.js-site-header')?.classList.remove('site-header--intro');
    const status = root.querySelector<HTMLElement>('.js-hero-status');
    if (status) status.textContent = '3Dモデルを表示できませんでした。';
  }
}

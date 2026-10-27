/** How long the veil takes to cover the page before the next page loads, matching `l-page-veil`. */
const LEAVE_MILLISECONDS = 350;

/** Covers the page with the white veil, then opens `url`. Without the veil, or with less motion, it goes at once. */
export function leavePage(url: string) {
  const veil = document.querySelector<HTMLElement>('.js-page-veil');
  if (!veil || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.location.assign(url);
    return;
  }
  veil.classList.add('l-page-veil--leaving');
  window.setTimeout(() => window.location.assign(url), LEAVE_MILLISECONDS);
}

/**
 * Links to another page of the site pass through the veil. Links within the page, to other sites, opened in a
 * new tab or with a modifier key keep the browser's own behaviour.
 */
export function initPageVeil() {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link || link.target || link.hasAttribute('download')) return;
    if (link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
    event.preventDefault();
    leavePage(link.href);
  });
  // A page restored by the back button would otherwise still be covered.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) document.querySelector('.js-page-veil')?.classList.remove('l-page-veil--leaving');
  });
}

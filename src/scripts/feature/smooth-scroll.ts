import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Gives wheel scrolling an inertial glide across the site, so the scroll-driven scenes move smoothly.
 * Touch keeps the device's own scrolling. In-page links keep the browser's smooth scroll, which Lenis follows;
 * its own anchor handling would run alongside the browser's jump. With reduced motion the page scrolls natively.
 */
export function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  return new Lenis({ autoRaf: true, lerp: 0.09 });
}

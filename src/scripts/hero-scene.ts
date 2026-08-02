const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const narrowScreen = window.matchMedia("(max-width: 48rem)");

const canUseWebGL = () => {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2"));
  } catch {
    return false;
  }
};

export const initHeroScene = () => {
  const root = document.querySelector<HTMLElement>("[data-hero]");
  const canvas = root?.querySelector<HTMLCanvasElement>("[data-hero-canvas]");

  if (
    !root ||
    !canvas ||
    reduceMotion.matches ||
    !canUseWebGL() ||
    root.dataset.heroInitialized === "true"
  )
    return;

  root.dataset.heroInitialized = "true";
  const compact = narrowScreen.matches;
  const loadRuntime = () => {
    void import("./hero-three-runtime")
      .then(({ startHeroThreeRuntime }) =>
        startHeroThreeRuntime(root, canvas, { compact }),
      )
      .catch(() => {
        root.dataset.webglReady = "false";
        root.classList.remove("hero-scene--ready");
      });
  };

  if (compact) window.requestAnimationFrame(loadRuntime);
  else loadRuntime();
};

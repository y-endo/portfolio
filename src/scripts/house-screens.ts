import * as THREE from 'three';

/** Canvas drawings shown on the study monitor, the television and the stair wall. */

const INK = '#0d1424';
const ACCENT = '#304df0';
const ACCENT_LIGHT = '#8fa2ff';
const PAPER = '#f4f1e9';

const fontFamily = () => getComputedStyle(document.body).fontFamily || 'sans-serif';

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d') };
}

export function createCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.drawImage(image, x + (w - width) / 2, y, width, height);
  context.restore();
}

export function drawMonitorScreen() {
  const { canvas, context } = createCanvas(640, 355);
  if (!context) return canvas;
  context.fillStyle = INK;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '500 22px ' + 'SFMono-Regular, consolas, monospace';
  const lines: [string, string][][] = [
    [['#7f8aa3', '// portfolio.ts']],
    [
      [ACCENT_LIGHT, 'const '],
      [PAPER, 'engineer = {'],
    ],
    [
      [PAPER, '  name: '],
      ['#c3e88d', "'Yuki Endo',"],
    ],
    [
      [PAPER, '  role: '],
      ['#c3e88d', "'Frontend Engineer',"],
    ],
    [
      [PAPER, '  since: '],
      ['#f78c6c', '2014'],
      [PAPER, ','],
    ],
    [
      [PAPER, '  focus: ['],
      ['#c3e88d', "'design'"],
      [PAPER, ', '],
      ['#c3e88d', "'quality'"],
      [PAPER, '],'],
    ],
    [[PAPER, '};']],
  ];
  lines.forEach((parts, row) => {
    let x = 34;
    for (const [color, text] of parts) {
      context.fillStyle = color;
      context.fillText(text, x, 58 + row * 40);
      x += context.measureText(text).width;
    }
  });
  context.fillStyle = ACCENT_LIGHT;
  context.fillRect(34, 58 + 7 * 40 - 20, 12, 26);
  return canvas;
}

export function drawStandbyScreen() {
  const { canvas, context } = createCanvas(1280, 704);
  if (!context) return canvas;
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#16224a');
  gradient.addColorStop(1, INK);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.fillStyle = '#ffffff';
  context.font = '700 150px ' + fontFamily();
  context.fillText('WORKS', canvas.width / 2, 360);
  context.fillStyle = ACCENT_LIGHT;
  context.font = '500 40px ' + fontFamily();
  context.fillText('Selected projects', canvas.width / 2, 440);
  context.fillStyle = PAPER;
  context.font = '500 28px SFMono-Regular, consolas, monospace';
  context.fillText('▶  PRESS START', canvas.width / 2, 590);
  return canvas;
}

/**
 * The project's cover image on the television; the panel beside it carries the words. As on a real set, the
 * picture sits inside a black border, so the thin bezel of the model reads as a frame round a lit screen rather
 * than the image covering the whole front.
 */
export function drawWorkScreen(image: HTMLImageElement | null) {
  // 1280 x 716 matches the screen's 1.77 x 0.99 m, so the 36 px border is 5 cm wide all round.
  const { canvas, context } = createCanvas(1280, 716);
  if (!context) return canvas;
  const border = 36;
  context.fillStyle = '#050608';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = INK;
  context.fillRect(border, border, canvas.width - border * 2, canvas.height - border * 2);
  if (image) drawCover(context, image, border, border, canvas.width - border * 2, canvas.height - border * 2);
  return canvas;
}

/** The sign carries the year, the company, the period and the role, so the panel beside it keeps the story. */
export function drawYearSign(period: string, organization: string, role: string) {
  const { canvas, context } = createCanvas(1024, 512);
  if (!context) return canvas;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const [from] = period.split(' ');
  context.fillStyle = ACCENT;
  context.font = '700 210px ' + fontFamily();
  context.fillText(from, 40, 222);
  context.fillStyle = '#121620';
  context.font = '600 64px ' + fontFamily();
  context.fillText(organization, 48, 322);
  context.fillStyle = '#626d80';
  context.font = '500 36px ' + fontFamily();
  context.fillText(period, 48, 402);
  context.fillText(role, 48, 456);
  return canvas;
}

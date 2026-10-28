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
      [PAPER, '  focus: '],
      ['#c3e88d', "'AI'"],
      [PAPER, ','],
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
  const { canvas, context } = createCanvas(1280, 716);
  if (!context) return canvas;
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Open the picture from a luminous centre line without changing the television's physical screen or bezel. */
export function createTelevisionPower(material: THREE.MeshBasicMaterial) {
  const uniforms = { power: { value: 0 }, channel: { value: 1 }, switching: { value: 0 }, time: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.screenPower = uniforms.power;
    shader.uniforms.screenChannel = uniforms.channel;
    shader.uniforms.screenSwitch = uniforms.switching;
    shader.uniforms.screenTime = uniforms.time;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float screenPower;
        uniform float screenChannel;
        uniform float screenSwitch;
        uniform float screenTime;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 screenUv = vMapUv;
        float band = floor(screenUv.y * 18.0);
        screenUv.x = clamp(screenUv.x + sin(band * 31.7 + floor(screenTime * 60.0)) * 0.025 * screenSwitch, 0.001, 0.999);
        ${THREE.ShaderChunk.map_fragment.replaceAll('vMapUv', 'screenUv')}
        if (screenSwitch > 0.001) {
          float split = 0.008 * screenSwitch;
          vec3 colour = vec3(texture2D(map, screenUv + vec2(split, 0.0)).r, diffuseColor.g, texture2D(map, screenUv - vec2(split, 0.0)).b);
          float noise = fract(sin(dot(floor(vMapUv * vec2(640.0, 360.0)), vec2(12.9898, 78.233)) + floor(screenTime * 48.0)) * 43758.5453);
          float tear = step(0.82, fract(vMapUv.y * 11.0 - screenTime * 6.0));
          diffuseColor.rgb = mix(colour, vec3(noise), screenSwitch * 0.65) * (1.0 - screenSwitch * tear * 0.55);
        }
        vec2 centre = abs(vMapUv - 0.5);
        float awake = smoothstep(0.0, 0.035, screenPower);
        float width = 0.5 * smoothstep(0.0, 0.2, screenPower);
        float height = mix(0.002, 0.52, smoothstep(0.2, 0.78, screenPower));
        float aperture = (1.0 - smoothstep(width, width + 0.008, centre.x))
          * (1.0 - smoothstep(height, height + 0.012, centre.y));
        float fade = smoothstep(0.32, 0.92, screenPower);
        float flash = 1.0 - smoothstep(0.55, 0.82, screenPower);
        float line = exp(-centre.y * 220.0) * (1.0 - smoothstep(width, width + 0.03, centre.x));
        float glow = exp(-centre.y * 35.0) * (1.0 - smoothstep(width, width + 0.12, centre.x));
        vec3 picture = mix(vec3(0.72, 0.84, 1.0), diffuseColor.rgb, fade);
        float scan = 1.0 - 0.04 * sin(vMapUv.y * 700.0 + screenPower * 80.0) * (1.0 - fade);
        diffuseColor.rgb = awake * screenChannel * (
          picture * aperture * scan + vec3(0.55, 0.72, 1.0) * (line + glow * 0.45) * flash
        );`,
      );
  };
  material.customProgramCacheKey = () => 'portfolio-television-power-and-channel';
  return uniforms;
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

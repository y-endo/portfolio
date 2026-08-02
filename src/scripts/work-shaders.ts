const TRACE_COUNT = 8;
const TRACE_DURATION = 0.9;
const TRACE_INTERVAL = 40;
const TRACE_DISTANCE = 0.022;
const GRID_COLUMNS = 18;
const GRID_ROWS = 11;

type TraceState = {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  startedAt: number;
  active: boolean;
};

type ShaderItem = {
  root: HTMLElement;
  media: HTMLElement;
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  vertexCount: number;
  originsUniform: WebGLUniformLocation | null;
  directionsUniform: WebGLUniformLocation | null;
  strengthsUniform: WebGLUniformLocation | null;
  aspectUniform: WebGLUniformLocation | null;
  pointerUniform: WebGLUniformLocation | null;
  pointerDirectionUniform: WebGLUniformLocation | null;
  hoverUniform: WebGLUniformLocation | null;
  shadowPassUniform: WebGLUniformLocation | null;
  traces: TraceState[];
  originsData: Float32Array;
  directionsData: Float32Array;
  strengthsData: Float32Array;
  nextTrace: number;
  pointerX: number;
  pointerY: number;
  pointerDirectionX: number;
  pointerDirectionY: number;
  lastTraceX: number;
  lastTraceY: number;
  pointerKnown: boolean;
  pointerInside: boolean;
  lastEmissionAt: number;
  emissionCount: number;
  hover: number;
  hoverTarget: number;
  lastFrameAt: number;
  bounds: DOMRectReadOnly | null;
  needsDraw: boolean;
  resizeObserver: ResizeObserver;
};

let initialized = false;

const vertexShaderSource = `
  attribute vec2 aPosition;
  attribute vec2 aUv;
  attribute vec2 aCentroid;
  attribute vec3 aBarycentric;
  uniform vec2 uOrigins[${TRACE_COUNT}];
  uniform vec2 uDirections[${TRACE_COUNT}];
  uniform vec2 uAspect;
  uniform vec2 uPointer;
  uniform vec2 uPointerDirection;
  uniform float uStrengths[${TRACE_COUNT}];
  uniform float uHover;
  uniform float uShadowPass;
  varying vec2 vUv;
  varying vec3 vBarycentric;
  varying float vFracture;
  varying float vFacetLight;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vUv = aUv;
    vBarycentric = aBarycentric;

    float triangleNoise = hash(aCentroid * 173.17);
    float secondaryNoise = hash(aCentroid * 279.31 + vec2(6.17, 9.23));
    float hover = smoothstep(0.0, 1.0, uHover);
    float field = 0.0;
    vec2 flow = vec2(0.0);

    for (int index = 0; index < ${TRACE_COUNT}; index++) {
      float strength = uStrengths[index];
      vec2 delta = (aCentroid - uOrigins[index]) * uAspect;
      float influence = exp(-dot(delta, delta) * 22.0) * strength;
      float relayBias = 0.76 + 0.24 * smoothstep(
        -0.16,
        0.18,
        -dot(delta, uDirections[index])
      );
      field = max(field, influence * relayBias);
      flow += uDirections[index] * influence;
    }

    vec2 pointerDelta = (aCentroid - uPointer) * uAspect;
    float liveField = exp(-dot(pointerDelta, pointerDelta) * 26.0) * hover;
    field = max(field, liveField);
    flow += uPointerDirection * liveField;

    float fracture = smoothstep(
      0.14 + triangleNoise * 0.05,
      0.6 + triangleNoise * 0.07,
      field
    );
    float flowLength = length(flow);
    vec2 travelDirection = flowLength > 0.001
      ? flow / flowLength
      : uPointerDirection;
    vec2 randomDirection = normalize(
      vec2(triangleNoise - 0.5, secondaryNoise - 0.5) + vec2(0.001)
    );
    vec2 scatterDirection = normalize(
      travelDirection * 0.62 + randomDirection * 0.38
    );

    vec2 centroidPosition = aCentroid * 2.0 - 1.0;
    vec2 localPosition = aPosition - centroidPosition;
    float rotation = (secondaryNoise - 0.5) * fracture * 0.1;
    float cosine = cos(rotation);
    float sine = sin(rotation);
    vec2 rotatedPosition = mat2(cosine, -sine, sine, cosine) * localPosition;
    vec2 tiltAxis = randomDirection;
    vec2 tiltNormal = vec2(-tiltAxis.y, tiltAxis.x);
    float tilt = (secondaryNoise - 0.5) * 2.0 * fracture;
    float alongTilt = dot(rotatedPosition, tiltAxis);
    float acrossTilt = dot(rotatedPosition, tiltNormal);
    vec2 tiltedPosition =
      tiltAxis * alongTilt * (1.0 - abs(tilt) * 0.14)
      + tiltNormal * (acrossTilt + alongTilt * tilt * 0.09);
    float displacement = fracture * mix(0.006, 0.016, triangleNoise);
    float lift = fracture * mix(0.003, 0.008, secondaryNoise);
    vec2 shadowOffset = uShadowPass > 0.5
      ? vec2(0.004, -0.007) * fracture
      : vec2(0.0);
    vec2 displacedPosition = centroidPosition
      + tiltedPosition
      + scatterDirection * displacement * 2.0;
    displacedPosition += vec2(0.0, lift * 2.0) + shadowOffset;

    vFracture = fracture;
    vFacetLight = tilt * 0.075 + (triangleNoise - 0.5) * fracture * 0.035;
    gl_Position = vec4(displacedPosition, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vBarycentric;
  varying float vFracture;
  varying float vFacetLight;
  uniform sampler2D uTexture;
  uniform float uShadowPass;

  void main() {
    if (uShadowPass > 0.5) {
      gl_FragColor = vec4(vec3(0.055, 0.075, 0.07), vFracture * 0.22);
      return;
    }

    vec4 color = texture2D(uTexture, vUv);
    float edgeDistance = min(
      vBarycentric.x,
      min(vBarycentric.y, vBarycentric.z)
    );
    float seam = (1.0 - smoothstep(0.0, 0.055, edgeDistance)) * vFracture;
    color.rgb += vFacetLight;
    color.rgb = mix(
      color.rgb,
      vec3(0.08, 0.28, 0.31),
      seam * 0.42
    );
    color.rgb = clamp(color.rgb, 0.0, 1.0);
    gl_FragColor = vec4(color.rgb, 1.0);
  }
`;

const createTriangleMesh = () => {
  const values: number[] = [];

  const pushTriangle = (
    points: readonly [number, number][],
    barycentrics: readonly (readonly [number, number, number])[],
  ) => {
    const centroidX = (points[0][0] + points[1][0] + points[2][0]) / 3;
    const centroidY = (points[0][1] + points[1][1] + points[2][1]) / 3;

    points.forEach(([x, y], index) => {
      values.push(
        x * 2 - 1,
        y * 2 - 1,
        x,
        y,
        centroidX,
        centroidY,
        ...barycentrics[index],
      );
    });
  };

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const x0 = column / GRID_COLUMNS;
      const x1 = (column + 1) / GRID_COLUMNS;
      const y0 = row / GRID_ROWS;
      const y1 = (row + 1) / GRID_ROWS;
      const barycentrics = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as const;

      if ((column + row) % 2 === 0) {
        pushTriangle(
          [
            [x0, y0],
            [x1, y0],
            [x1, y1],
          ],
          barycentrics,
        );
        pushTriangle(
          [
            [x0, y0],
            [x1, y1],
            [x0, y1],
          ],
          barycentrics,
        );
      } else {
        pushTriangle(
          [
            [x0, y0],
            [x1, y0],
            [x0, y1],
          ],
          barycentrics,
        );
        pushTriangle(
          [
            [x1, y0],
            [x1, y1],
            [x0, y1],
          ],
          barycentrics,
        );
      }
    }
  }

  return new Float32Array(values);
};

const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Program link failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
};

export const initWorkShaders = () => {
  if (initialized) return;
  initialized = true;

  const precisePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (min-width: 48.01rem)",
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!precisePointer.matches || reducedMotion.matches) return;

  const roots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-work-shader]"),
  );
  const items: ShaderItem[] = [];
  let frame = 0;
  let running = false;
  let disposed = false;

  function requestRender() {
    if (running || disposed || document.hidden) return;
    running = true;
    frame = window.requestAnimationFrame(render);
  }

  function drawItem(item: ShaderItem, time: number) {
    const { gl } = item;
    const deltaSeconds = item.lastFrameAt
      ? Math.min((time - item.lastFrameAt) / 1000, 0.05)
      : 1 / 60;
    item.lastFrameAt = time;
    const response = item.hoverTarget > item.hover ? 9 : 6.5;
    item.hover +=
      (item.hoverTarget - item.hover) * Math.min(1, deltaSeconds * response);
    if (Math.abs(item.hoverTarget - item.hover) < 0.01) {
      item.hover = item.hoverTarget;
    }

    let hasActiveTrace = false;
    item.originsData.fill(0);
    item.directionsData.fill(0);
    item.strengthsData.fill(0);
    item.traces.forEach((trace, index) => {
      if (!trace.active) return;
      const age = Math.max(0, (time - trace.startedAt) / 1000);
      const progress = Math.min(age / TRACE_DURATION, 1);
      if (progress >= 1) {
        trace.active = false;
        return;
      }

      hasActiveTrace = true;
      item.originsData[index * 2] = trace.x;
      item.originsData[index * 2 + 1] = trace.y;
      item.directionsData[index * 2] = trace.directionX;
      item.directionsData[index * 2 + 1] = trace.directionY;
      item.strengthsData[index] = Math.pow(1 - progress, 0.78);
    });

    gl.useProgram(item.program);
    gl.uniform2fv(item.originsUniform, item.originsData);
    gl.uniform2fv(item.directionsUniform, item.directionsData);
    gl.uniform1fv(item.strengthsUniform, item.strengthsData);
    gl.uniform2f(item.pointerUniform, item.pointerX, item.pointerY);
    gl.uniform2f(
      item.pointerDirectionUniform,
      item.pointerDirectionX,
      item.pointerDirectionY,
    );
    gl.uniform1f(item.hoverUniform, item.hover);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(item.shadowPassUniform, 1);
    gl.drawArrays(gl.TRIANGLES, 0, item.vertexCount);
    gl.uniform1f(item.shadowPassUniform, 0);
    gl.drawArrays(gl.TRIANGLES, 0, item.vertexCount);
    item.needsDraw = false;

    const easing = item.hoverTarget !== item.hover;
    const continueRendering = hasActiveTrace || easing;
    if (!continueRendering) {
      item.hover = item.hoverTarget;
      if (!item.pointerInside) {
        delete item.root.dataset.shaderActive;
      }
    }
    return continueRendering;
  }

  function render(time: number) {
    let continueRendering = false;
    for (const item of items) {
      const hasActiveTrace = item.traces.some((trace) => trace.active);
      const easing = item.hoverTarget !== item.hover;
      const shouldDraw = item.needsDraw || hasActiveTrace || easing;
      if (!shouldDraw) continue;
      continueRendering = drawItem(item, time) || continueRendering;
    }
    if (continueRendering) {
      frame = window.requestAnimationFrame(render);
    } else {
      running = false;
    }
  }

  const createItem = async (root: HTMLElement) => {
    const media = root.querySelector<HTMLElement>("[data-shader-media]");
    const canvas = root.querySelector<HTMLCanvasElement>(
      "[data-shader-canvas]",
    );
    const source = root.querySelector<HTMLImageElement>("[data-shader-source]");
    if (!media || !canvas || !source) return;

    try {
      await source.decode();
    } catch {
      if (!source.complete) return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    let program: WebGLProgram;
    try {
      program = createProgram(gl);
    } catch {
      return;
    }

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture) {
      gl.deleteProgram(program);
      return;
    }

    const vertices = createTriangleMesh();
    gl.useProgram(program);
    gl.clearColor(223 / 255, 228 / 255, 225 / 255, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    const uv = gl.getAttribLocation(program, "aUv");
    const centroid = gl.getAttribLocation(program, "aCentroid");
    const barycentric = gl.getAttribLocation(program, "aBarycentric");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 36, 8);
    gl.enableVertexAttribArray(centroid);
    gl.vertexAttribPointer(centroid, 2, gl.FLOAT, false, 36, 16);
    gl.enableVertexAttribArray(barycentric);
    gl.vertexAttribPointer(barycentric, 3, gl.FLOAT, false, 36, 24);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

    const item: ShaderItem = {
      root,
      media,
      canvas,
      gl,
      program,
      buffer,
      texture,
      vertexCount: vertices.length / 9,
      originsUniform: gl.getUniformLocation(program, "uOrigins[0]"),
      directionsUniform: gl.getUniformLocation(program, "uDirections[0]"),
      strengthsUniform: gl.getUniformLocation(program, "uStrengths[0]"),
      aspectUniform: gl.getUniformLocation(program, "uAspect"),
      pointerUniform: gl.getUniformLocation(program, "uPointer"),
      pointerDirectionUniform: gl.getUniformLocation(
        program,
        "uPointerDirection",
      ),
      hoverUniform: gl.getUniformLocation(program, "uHover"),
      shadowPassUniform: gl.getUniformLocation(program, "uShadowPass"),
      traces: Array.from({ length: TRACE_COUNT }, () => ({
        x: 0,
        y: 0,
        directionX: 1,
        directionY: 0,
        startedAt: -1,
        active: false,
      })),
      originsData: new Float32Array(TRACE_COUNT * 2),
      directionsData: new Float32Array(TRACE_COUNT * 2),
      strengthsData: new Float32Array(TRACE_COUNT),
      nextTrace: 0,
      pointerX: 0.5,
      pointerY: 0.5,
      pointerDirectionX: 1,
      pointerDirectionY: 0,
      lastTraceX: 0.5,
      lastTraceY: 0.5,
      pointerKnown: false,
      pointerInside: false,
      lastEmissionAt: 0,
      emissionCount: 0,
      hover: 0,
      hoverTarget: 0,
      lastFrameAt: 0,
      bounds: null,
      needsDraw: true,
      resizeObserver: new ResizeObserver(() => undefined),
    };

    const resize = () => {
      const bounds = media.getBoundingClientRect();
      const { width, height } = bounds;
      if (width === 0 || height === 0) return;
      item.bounds = bounds;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const aspect = width / height;
      gl.useProgram(program);
      gl.uniform2f(
        item.aspectUniform,
        aspect >= 1 ? aspect : 1,
        aspect >= 1 ? 1 : 1 / aspect,
      );
      item.needsDraw = true;
      requestRender();
    };
    item.resizeObserver.disconnect();
    item.resizeObserver = new ResizeObserver(resize);
    item.resizeObserver.observe(media);

    const syncInteraction = () => {
      item.hoverTarget = item.pointerInside ? 1 : 0;
      if (item.pointerInside) root.dataset.shaderActive = "pointer";
      requestRender();
    };

    const emitTrace = (
      originX: number,
      originY: number,
      directionX = item.pointerDirectionX,
      directionY = item.pointerDirectionY,
      startedAt = performance.now(),
    ) => {
      const trace = item.traces[item.nextTrace];
      trace.x = originX;
      trace.y = originY;
      trace.directionX = directionX;
      trace.directionY = directionY;
      trace.startedAt = startedAt;
      trace.active = true;
      item.nextTrace = (item.nextTrace + 1) % TRACE_COUNT;
      item.emissionCount += 1;
      root.dataset.shaderTraceCount = String(item.emissionCount);
      requestRender();
    };

    media.addEventListener("pointerenter", (event) => {
      item.bounds = media.getBoundingClientRect();
      const bounds = item.bounds;
      item.pointerX = (event.clientX - bounds.left) / bounds.width;
      item.pointerY = 1 - (event.clientY - bounds.top) / bounds.height;
      item.lastTraceX = item.pointerX;
      item.lastTraceY = item.pointerY;
      item.pointerKnown = true;
      item.pointerInside = true;
      item.lastEmissionAt = performance.now();
      syncInteraction();
    });
    media.addEventListener("pointermove", (event) => {
      const bounds = item.bounds ?? media.getBoundingClientRect();
      const pointerX = (event.clientX - bounds.left) / bounds.width;
      const pointerY = 1 - (event.clientY - bounds.top) / bounds.height;
      item.pointerX = pointerX;
      item.pointerY = pointerY;
      if (!item.pointerKnown) {
        item.lastTraceX = pointerX;
        item.lastTraceY = pointerY;
        item.pointerKnown = true;
        return;
      }

      const distance = Math.hypot(
        pointerX - item.lastTraceX,
        pointerY - item.lastTraceY,
      );
      if (distance > 0.001) {
        item.pointerDirectionX = (pointerX - item.lastTraceX) / distance;
        item.pointerDirectionY = (pointerY - item.lastTraceY) / distance;
      }
      const now = performance.now();
      if (
        distance < TRACE_DISTANCE ||
        now - item.lastEmissionAt < TRACE_INTERVAL
      )
        return;

      const steps = Math.min(3, Math.max(1, Math.floor(distance / 0.065)));
      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        emitTrace(
          item.lastTraceX + (pointerX - item.lastTraceX) * progress,
          item.lastTraceY + (pointerY - item.lastTraceY) * progress,
          item.pointerDirectionX,
          item.pointerDirectionY,
          now - (steps - step) * 24,
        );
      }
      item.lastTraceX = pointerX;
      item.lastTraceY = pointerY;
      item.lastEmissionAt = now;
    });
    media.addEventListener("pointerleave", () => {
      item.pointerKnown = false;
      item.pointerInside = false;
      syncInteraction();
    });
    canvas.addEventListener("webglcontextlost", () => {
      root.dataset.shaderReady = "false";
      root.classList.remove("work-feature--shader-ready");
    });

    items.push(item);
    resize();
    root.dataset.shaderReady = "true";
    root.classList.add("work-feature--shader-ready");
    root.dataset.shaderEffect = "restrained-floating-fracture";
    root.dataset.shaderTextureMotion = "bounded-fragment-displacement";
    root.dataset.shaderDepthCue = "tilt-shadow";
    root.dataset.shaderIntensity = "medium";
    requestRender();
  };

  const entryObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const root = entry.target as HTMLElement;
        entryObserver.unobserve(root);
        void createItem(root);
      }
    },
    { rootMargin: "25% 0px" },
  );
  roots.forEach((root) => entryObserver.observe(root));

  const handleVisibilityChange = () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      running = false;
      return;
    }
    if (
      items.some(
        (item) =>
          item.needsDraw ||
          item.hoverTarget !== item.hover ||
          item.traces.some((trace) => trace.active),
      )
    ) {
      requestRender();
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  const suspend = () => {
    window.cancelAnimationFrame(frame);
    running = false;
    for (const item of items) item.lastFrameAt = 0;
  };

  const resume = () => {
    if (disposed) return;
    for (const item of items) {
      item.lastFrameAt = 0;
      item.needsDraw = true;
    }
    requestRender();
  };

  const handlePageHide = (event: PageTransitionEvent) => {
    if (event.persisted) {
      suspend();
      return;
    }
    dispose();
  };

  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) resume();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(frame);
    entryObserver.disconnect();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handlePageShow);
    for (const item of items) {
      item.resizeObserver.disconnect();
      item.gl.deleteTexture(item.texture);
      item.gl.deleteBuffer(item.buffer);
      item.gl.deleteProgram(item.program);
    }
  };
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
};

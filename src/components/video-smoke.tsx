"use client";

import { useEffect, useRef } from "react";
import styles from "./video-smoke.module.css";

const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;

  varying vec2 v_uv;
  uniform float u_time;
  uniform float u_aspect;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
    float result = noise(p) * 0.66;
    p = turn * p * 2.07 + 8.6;
    result += noise(p) * 0.34;
    return result;
  }

  void main() {
    // The canvas is 136% by 210% of its video frame. Keep the source
    // attached to those edges even while the containing frame expands.
    vec2 p = (v_uv - 0.5) * vec2(1.36 * u_aspect, 2.1);
    vec2 edge = abs(p) - vec2(0.5 * u_aspect, 0.5);
    float distanceFromFrame = length(max(edge, 0.0))
      + min(max(edge.x, edge.y), 0.0);

    // Keep the video perimeter in darkness before smoke blooms outward.
    if (distanceFromFrame <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }

    float t = u_time;
    vec2 drift = p * vec2(2.4, 3.3) - vec2(t * 0.045, t * 0.24);
    vec2 curl = vec2(
      fbm(drift * 0.72 + vec2(0.0, t * 0.035)),
      fbm(drift * 0.67 + vec2(7.2, -t * 0.025))
    );
    vec2 folded = drift + (curl - 0.5) * 2.9;
    float body = fbm(folded);
    float detail = fbm(folded * 1.85 + vec2(1.7, t * 0.055));

    // Narrow, irregular density ridges produce curled, translucent
    // strands instead of the smooth gradient clouds used in the hero.
    float filaments = 1.0 - smoothstep(0.025, 0.23, abs(detail - 0.53));
    float billows = smoothstep(0.27, 0.75, body);
    float density = billows * 0.51 + filaments * billows * 0.69;
    float outward = max(distanceFromFrame, 0.0);
    float envelope = exp(-outward * 3.9)
      * (1.0 - smoothstep(0.18, 0.66, outward));
    float darkCollar = smoothstep(0.0, 0.14, outward);
    float rising = mix(0.52, 1.0, smoothstep(-0.65, 0.65, p.y));

    vec2 feather = smoothstep(vec2(0.0), vec2(0.12), v_uv)
      * smoothstep(vec2(0.0), vec2(0.12), 1.0 - v_uv);
    float alpha = density * envelope * darkCollar * rising * feather.x * feather.y * 0.56;

    float warmth = clamp((0.5 - v_uv.x) * 0.55 + curl.y * 0.22, 0.0, 0.32);
    vec3 stageLight = mix(vec3(0.42, 0.58, 0.63), vec3(0.69, 0.43, 0.29), warmth);
    alpha = min(alpha, 0.48);
    gl_FragColor = vec4(stageLight * alpha, alpha);
  }
`;

type SmokeRenderer = {
  render: (time: number) => void;
  resize: () => void;
  dispose: () => void;
};

function createRenderer(canvas: HTMLCanvasElement): SmokeRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;

  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    dispose();
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }

  buffer = gl.createBuffer();
  if (!buffer) {
    dispose();
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const timeUniform = gl.getUniformLocation(program, "u_time");
  const aspectUniform = gl.getUniformLocation(program, "u_aspect");

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const scale = Math.min(1, (mobile ? 220 : 460) / width, (mobile ? 190 : 300) / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(aspectUniform, (width / height) * (2.1 / 1.36));
  };

  return {
    resize,
    render(time) {
      gl.uniform1f(timeUniform, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose,
  };
}

/** Decorative stage haze. Its parent must be the exact size of the video. */
export function VideoSmoke({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !active) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");
    let renderer: SmokeRenderer | null = null;
    let frame = 0;
    let previousTime = 0;
    let previousDraw = 0;
    let contextLost = false;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      previousDraw = 0;
    };

    const draw = (now: number) => {
      if (!renderer || document.hidden || motion.matches || contextLost) {
        stop();
        return;
      }
      if (previousTime) elapsed.current += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      const interval = 1000 / (mobile.matches ? 12 : 18);
      if (now - previousDraw >= interval) {
        renderer.render(elapsed.current);
        previousDraw = now;
      }
      frame = requestAnimationFrame(draw);
    };

    const sync = () => {
      stop();
      if (motion.matches || contextLost) {
        renderer?.dispose();
        renderer = null;
        return;
      }
      if (document.hidden) return;
      if (!renderer) {
        renderer = createRenderer(surface);
        renderer?.resize();
      }
      if (renderer) frame = requestAnimationFrame(draw);
    };

    const resize = new ResizeObserver(() => renderer?.resize());
    resize.observe(surface);
    const loseContext = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      renderer?.dispose();
      renderer = null;
    };
    const restoreContext = () => {
      contextLost = false;
      sync();
    };

    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    surface.addEventListener("webglcontextlost", loseContext);
    surface.addEventListener("webglcontextrestored", restoreContext);
    sync();

    return () => {
      stop();
      resize.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      surface.removeEventListener("webglcontextlost", loseContext);
      surface.removeEventListener("webglcontextrestored", restoreContext);
      renderer?.dispose();
    };
  }, [active]);

  return (
    <div className={styles.smoke} data-active={active} aria-hidden="true">
      <canvas ref={canvas} className={styles.canvas} />
    </div>
  );
}

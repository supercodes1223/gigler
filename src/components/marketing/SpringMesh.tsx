"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

// Custom spring-pastel mesh shader. Exists because off-the-shelf mesh
// gradients have no pointer uniform: here the cursor is a real uniform, so
// the field bends around it per-pixel — smooth by construction, no parameter
// jumps. Edge definition comes from inverse-distance color weights plus
// domain-warped noise.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_ptr;    // canvas px, y-down
uniform float u_bend;  // 0..1 cursor presence
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = gl_FragCoord.xy / u_res;
  p.x *= aspect;
  vec2 ptr = vec2(u_ptr.x / u_res.x * aspect, 1.0 - u_ptr.y / u_res.y);

  // Bend the field around the cursor: a soft lens. Displacement scales with
  // d itself (not its normalized direction), so it falls to zero at the
  // cursor center — a smooth bulge with no singularity/starburst.
  vec2 d = p - ptr;
  float r = length(d);
  float lens = exp(-r * r * 9.0) * u_bend;
  p += d * lens * 1.1;

  float t = u_time * 0.10;

  // Organic domain warp — gives the blobs their wavy, drifting edges.
  vec2 q = p * 1.7;
  vec2 warp = vec2(
    noise(q + vec2(0.0, t * 2.1)),
    noise(q + vec2(5.2, -t * 1.7))
  );
  vec2 pw = p + (warp - 0.5) * 0.5;

  // Five drifting color spots (white keeps the canvas airy).
  vec2 c0 = vec2(0.50 * aspect, 0.55) + 0.20 * vec2(sin(t * 0.7), cos(t * 0.9));
  vec2 c1 = vec2(0.15 * aspect, 0.80) + 0.18 * vec2(sin(t * 1.1 + 1.7), cos(t * 0.8 + 0.4));
  vec2 c2 = vec2(0.85 * aspect, 0.75) + 0.20 * vec2(sin(t * 0.9 + 3.1), cos(t * 1.2 + 2.0));
  vec2 c3 = vec2(0.25 * aspect, 0.20) + 0.18 * vec2(sin(t * 1.3 + 4.2), cos(t * 0.7 + 1.1));
  vec2 c4 = vec2(0.80 * aspect, 0.18) + 0.20 * vec2(sin(t * 0.8 + 5.5), cos(t * 1.0 + 3.6));

  // Inverse-distance weights with a power for defined (but soft) wave edges.
  float e = 1.55;
  float w0 = pow(1.0 / (dot(pw - c0, pw - c0) + 0.012), e) * 1.35; // white slightly dominant
  float w1 = pow(1.0 / (dot(pw - c1, pw - c1) + 0.012), e);
  float w2 = pow(1.0 / (dot(pw - c2, pw - c2) + 0.012), e);
  float w3 = pow(1.0 / (dot(pw - c3, pw - c3) + 0.012), e);
  float w4 = pow(1.0 / (dot(pw - c4, pw - c4) + 0.012), e);

  vec3 col = (w0 * u_c0 + w1 * u_c1 + w2 * u_c2 + w3 * u_c3 + w4 * u_c4)
           / (w0 + w1 + w2 + w3 + w4);

  // Fine grain, keeps it organic on the light canvas.
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.016;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type SpringMeshProps = {
  colors: [string, string, string, string, string];
  className?: string;
};

export function SpringMesh({ colors, className }: SpringMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Fullscreen triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPtr = gl.getUniformLocation(program, "u_ptr");
    const uBend = gl.getUniformLocation(program, "u_bend");
    colors.forEach((hex, i) => {
      gl.uniform3fv(gl.getUniformLocation(program, `u_c${i}`), hexToRgb(hex));
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer state: eased position + presence, both passed as uniforms.
    const ptr = { x: -9999, y: -9999 };
    const ptrTarget = { x: -9999, y: -9999 };
    let bend = 0;
    let bendTarget = 0;
    let seen = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      ptrTarget.x = (e.clientX - rect.left) * dpr;
      ptrTarget.y = (e.clientY - rect.top) * dpr;
      bendTarget = inside ? 1 : 0;
      if (!seen && inside) {
        seen = true;
        ptr.x = ptrTarget.x;
        ptr.y = ptrTarget.y;
      }
    };
    window.addEventListener("pointermove", onMove);

    const start = performance.now();
    let raf = 0;
    let running = true;

    const frame = () => {
      if (!running) return;
      resize();
      ptr.x += (ptrTarget.x - ptr.x) * 0.1;
      ptr.y += (ptrTarget.y - ptr.y) * 0.1;
      bend += (bendTarget - bend) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reducedMotion ? 30 : (performance.now() - start) / 1000);
      gl.uniform2f(uPtr, ptr.x, ptr.y);
      gl.uniform1f(uBend, reducedMotion ? 0 : bend);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) raf = requestAnimationFrame(frame);
    };

    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [colors, reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}

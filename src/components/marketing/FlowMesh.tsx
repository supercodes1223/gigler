"use client";

import { useEffect, useRef } from "react";
import { meshGradientFragmentShader } from "@paper-design/shaders";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

// Paper Shaders' mesh gradient, self-rendered with a flowmap warp injected.
//
// Why this exists: the <MeshGradient> component gives no pointer access, and
// live-changing its props makes the pattern jump. Paper Shaders exports its
// fragment shader source (PolyForm Shield license — modification for
// non-competing use is permitted), so we compile the exact same wave code in
// our own WebGL2 context and inject a 3-line UV warp driven by a cursor
// flowmap: a 128² ping-pong texture where each frame fades (dissipation) and
// the cursor stamps its smoothed velocity (soft falloff). Waves bend locally
// where the cursor moves, then relax. The mesh algorithm itself is untouched.

// ── Shader sources ──────────────────────────────────────────────────────────

// Minimal vertex shader reproducing ShaderMount's `v_objectUV` for default
// object sizing (fit: contain, scale 1, no rotation/offset, origin center).
const MESH_VERT = `#version 300 es
precision mediump float;
layout(location = 0) in vec4 a_position;
uniform vec2 u_res;
out vec2 v_objectUV;
void main() {
  gl_Position = a_position;
  v_objectUV = (a_position.xy * 0.5) * u_res / min(u_res.x, u_res.y);
}`;

// Inject the flowmap warp right where the fragment shader picks up its UV.
const UV_MARKER = "vec2 uv = v_objectUV;";
const UNIFORM_MARKER = "uniform float u_time;";

function buildMeshFrag(): string {
  const src = meshGradientFragmentShader;
  if (!src.includes(UV_MARKER) || !src.includes(UNIFORM_MARKER)) {
    throw new Error(
      "FlowMesh: @paper-design/shaders fragment source changed; flowmap injection markers not found. Re-verify after upgrading the package."
    );
  }
  return src
    .replace(
      UNIFORM_MARKER,
      `${UNIFORM_MARKER}
uniform sampler2D u_flowmap;
uniform vec2 u_res;
uniform float u_flowStrength;`
    )
    .replace(
      UV_MARKER,
      `${UV_MARKER}
  vec2 flow = texture(u_flowmap, gl_FragCoord.xy / u_res).rg - 0.5;
  uv += flow * u_flowStrength;`
    );
}

const FLOW_VERT = `#version 300 es
layout(location = 0) in vec4 a_position;
out vec2 v_uv;
void main() {
  gl_Position = a_position;
  v_uv = a_position.xy * 0.5 + 0.5;
}`;

// Flowmap update pass (OGL Flowmap-style): fade previous frame, stamp the
// cursor's smoothed velocity with a soft falloff. Values stored offset by 0.5.
// u_deadband forces fully-faded trails to exact zero on 8-bit targets, where
// pure multiplicative decay would otherwise stall and leave ghost trails.
const FLOW_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_prev;
uniform vec2 u_mouse;
uniform vec2 u_velocity;
uniform float u_aspect;
uniform float u_falloff;
uniform float u_dissipation;
uniform float u_deadband;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 flow = texture(u_prev, v_uv).rg - 0.5;
  flow *= u_dissipation;
  flow -= sign(flow) * min(abs(flow), u_deadband);
  vec2 cursor = v_uv - u_mouse;
  cursor.x *= u_aspect;
  float stamp = smoothstep(u_falloff, 0.0, length(cursor));
  flow += stamp * clamp(u_velocity, vec2(-1.0), vec2(1.0)) * 0.5;
  flow = clamp(flow, vec2(-0.5), vec2(0.5));
  fragColor = vec4(flow + 0.5, 0.0, 1.0);
}`;

// ── Feel knobs ──────────────────────────────────────────────────────────────

const FLOWMAP_SIZE = 128;
const FALLOFF = 0.25; // stamp radius, uv units
const DISSIPATION = 0.97; // per-frame trail fade (~0.5s relax at 60fps)
const FLOW_STRENGTH = 0.12; // max uv displacement of the waves
const VELOCITY_GAIN = 9; // pointer delta (uv/frame) -> stamp intensity
const SPEED = 0.4; // mesh animation speed, matches previous hero

const MESH_PARAMS = {
  distortion: 0.85,
  swirl: 0.6,
  grainMixer: 0.16,
  grainOverlay: 0,
};

function hexToVec4(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

function compileProgram(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(`FlowMesh shader compile: ${gl.getShaderInfoLog(s)}`);
    }
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vert));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`FlowMesh program link: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

type FlowMeshProps = {
  colors: string[]; // up to 10
  className?: string;
};

export function FlowMesh({ colors, className }: FlowMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true });
    if (!gl) return; // no WebGL2: section bg stays the plain light canvas

    let meshProgram: WebGLProgram;
    let flowProgram: WebGLProgram;
    try {
      meshProgram = compileProgram(gl, MESH_VERT, buildMeshFrag());
      flowProgram = compileProgram(gl, FLOW_VERT, FLOW_FRAG);
    } catch (err) {
      console.error(err);
      return;
    }

    // Fullscreen triangle shared by both passes
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Flowmap ping-pong targets. RG16F when renderable, else RGBA8 + deadband.
    const floatRenderable = !!gl.getExtension("EXT_color_buffer_float");
    const makeTarget = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (floatRenderable) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, FLOWMAP_SIZE, FLOWMAP_SIZE, 0, gl.RG, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FLOWMAP_SIZE, FLOWMAP_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      // Initialize to "no flow" (0.5-encoded zero)
      gl.clearColor(0.5, 0.5, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fbo };
    };
    let read = makeTarget();
    let write = makeTarget();

    const u = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);

    // Static mesh uniforms
    gl.useProgram(meshProgram);
    const colorArray = new Float32Array(40);
    colors.slice(0, 10).forEach((hex, i) => colorArray.set(hexToVec4(hex), i * 4));
    gl.uniform4fv(u(meshProgram, "u_colors"), colorArray);
    gl.uniform1f(u(meshProgram, "u_colorsCount"), Math.min(colors.length, 10));
    gl.uniform1f(u(meshProgram, "u_distortion"), MESH_PARAMS.distortion);
    gl.uniform1f(u(meshProgram, "u_swirl"), MESH_PARAMS.swirl);
    gl.uniform1f(u(meshProgram, "u_grainMixer"), MESH_PARAMS.grainMixer);
    gl.uniform1f(u(meshProgram, "u_grainOverlay"), MESH_PARAMS.grainOverlay);
    gl.uniform1f(u(meshProgram, "u_flowStrength"), FLOW_STRENGTH);
    gl.uniform1i(u(meshProgram, "u_flowmap"), 0);
    const uMeshRes = u(meshProgram, "u_res");
    const uTime = u(meshProgram, "u_time");

    gl.useProgram(flowProgram);
    gl.uniform1i(u(flowProgram, "u_prev"), 0);
    gl.uniform1f(u(flowProgram, "u_falloff"), FALLOFF);
    gl.uniform1f(u(flowProgram, "u_dissipation"), DISSIPATION);
    gl.uniform1f(u(flowProgram, "u_deadband"), floatRenderable ? 0 : 0.004);
    const uMouse = u(flowProgram, "u_mouse");
    const uVelocity = u(flowProgram, "u_velocity");
    const uAspect = u(flowProgram, "u_aspect");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer state in flowmap UV space (GL orientation: y up)
    const mouse = { x: -1, y: -1 };
    const mouseTarget = { x: -1, y: -1 };
    const velocity = { x: 0, y: 0 };
    let hasPointer = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      mouseTarget.x = (e.clientX - rect.left) / rect.width;
      mouseTarget.y = 1 - (e.clientY - rect.top) / rect.height;
      if (!hasPointer) {
        hasPointer = true;
        mouse.x = mouseTarget.x;
        mouse.y = mouseTarget.y;
      }
    };
    window.addEventListener("pointermove", onMove);

    let time = 0;
    let lastT = performance.now();
    let raf = 0;
    let running = true;

    const frame = (now: number) => {
      if (!running) return;
      resize();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      time += dt * SPEED;

      // Smooth pointer + derive velocity from the smoothed motion
      const px = mouse.x;
      const py = mouse.y;
      mouse.x += (mouseTarget.x - mouse.x) * 0.15;
      mouse.y += (mouseTarget.y - mouse.y) * 0.15;
      velocity.x += ((mouse.x - px) * VELOCITY_GAIN - velocity.x) * 0.12;
      velocity.y += ((mouse.y - py) * VELOCITY_GAIN - velocity.y) * 0.12;

      // Pass 1: update flowmap (read -> write, swap)
      gl.useProgram(flowProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo);
      gl.viewport(0, 0, FLOWMAP_SIZE, FLOWMAP_SIZE);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.tex);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform2f(uVelocity, hasPointer ? velocity.x : 0, hasPointer ? velocity.y : 0);
      gl.uniform1f(uAspect, canvas.width / Math.max(canvas.height, 1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const tmp = read;
      read = write;
      write = tmp;

      // Pass 2: draw the mesh, warped by the flowmap
      gl.useProgram(meshProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.tex);
      gl.uniform2f(uMeshRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(frame);
    };

    if (reducedMotion) {
      // Single static frame: fixed time, empty flowmap, no loop.
      gl.useProgram(meshProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.tex);
      gl.uniform2f(uMeshRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, 30);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (reducedMotion) return;
      running = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(canvas);

    return () => {
      running = false;
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [colors, reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}

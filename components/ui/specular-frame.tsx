"use client";

import { useEffect, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";

const PAD = 16;

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uCenter, uHalfSize;
uniform float uRadius, uAngle, uPx, uIntensity, uThickness;
uniform vec3 uLineColor, uBaseColor;
out vec4 fragColor;
float roundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedRect(p, uHalfSize, uRadius);
  vec2 light = vec2(cos(uAngle), sin(uAngle));
  vec2 normal = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float facing = pow(max(abs(dot(normal, light)), 0.0), 18.0);
  float edge = 1.0 - smoothstep(0.5 * uPx, 2.8 * uPx, abs(d));
  float base = (1.0 - smoothstep(0.0, 1.4 * uPx, abs(d))) * 0.42;
  float highlight = edge * facing * uIntensity * exp(-pow(d / max(uThickness, 0.001), 2.0));
  vec3 color = uBaseColor * base + uLineColor * highlight;
  fragColor = vec4(color, clamp(base + highlight, 0.0, 1.0));
}`;

type SpecularFrameProps = {
  radius?: number;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  followMouse?: boolean;
};

/** WebGL edge highlight from React Bits, kept as a decoration so button semantics stay native. */
export function SpecularFrame({
  radius = 12,
  lineColor = "#ffffff",
  baseColor = "#5b456f",
  intensity = 1,
  followMouse = true,
}: SpecularFrameProps) {
  const mountRef = useRef<HTMLSpanElement>(null);
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const host = hostRef.current?.parentElement;
    if (!mount || !host) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: { value: [1, 1] }, uHalfSize: { value: [1, 1] }, uRadius: { value: 0 },
        uAngle: { value: 2.4 }, uPx: { value: dpr }, uLineColor: { value: [1, 1, 1] },
        uBaseColor: { value: [0.35, 0.27, 0.43] }, uIntensity: { value: 0 }, uThickness: { value: dpr },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    mount.appendChild(gl.canvas);
    const size = { width: 1, height: 1 };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      size.width = rect.width; size.height = rect.height;
      renderer.setSize(rect.width + PAD * 2, rect.height + PAD * 2);
      program.uniforms.uCenter.value = [(PAD + rect.width / 2) * dpr, (PAD + rect.height / 2) * dpr];
      program.uniforms.uHalfSize.value = [(rect.width / 2) * dpr, (rect.height / 2) * dpr];
      program.uniforms.uRadius.value = Math.min(radius, rect.width / 2, rect.height / 2) * dpr;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const line = new Color(lineColor);
    const base = new Color(baseColor);
    let targetAngle = 2.4;
    let angle = targetAngle;
    let glow = 0;
    let last = performance.now();
    const pointer = (event: PointerEvent) => {
      if (!followMouse) return;
      const rect = host.getBoundingClientRect();
      const x = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
      const y = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
      const distance = Math.hypot(x, y);
      targetAngle = Math.atan2(rect.top + rect.height / 2 - event.clientY, event.clientX - (rect.left + rect.width / 2));
      glow = Math.max(0, 1 - distance / 220);
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    let animation = 0;
    const render = (now: number) => {
      animation = requestAnimationFrame(render);
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const difference = ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += difference * (1 - Math.exp(-dt * 8));
      glow += (0 - glow) * (1 - Math.exp(-dt * 1.4));
      program.uniforms.uAngle.value = angle;
      program.uniforms.uLineColor.value = [line.r, line.g, line.b];
      program.uniforms.uBaseColor.value = [base.r, base.g, base.b];
      program.uniforms.uIntensity.value = intensity * (0.18 + glow * 0.82);
      renderer.render({ scene: mesh });
    };
    animation = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animation); observer.disconnect(); window.removeEventListener("pointermove", pointer);
      gl.canvas.remove(); gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [baseColor, followMouse, intensity, lineColor, radius]);

  return <span ref={hostRef} className="specular-frame" aria-hidden="true"><span ref={mountRef} /></span>;
}

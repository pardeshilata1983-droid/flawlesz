import { useEffect, useRef, useState, type CSSProperties } from 'react';

// Live Sky canvas with real-time volumetric billowing clouds.
// Uses isotropic coordinates and 2D/3D Simplex noise with domain warping
// to guarantee natural puffy clouds with zero rectangular grid artifacts on all screens.
export const NAME = "Blue sky";
export const STOPS = ["#E6F2FF", "#B3D9FF", "#80B3FF", "#6699E6"];
export const TONES = {
  main: [0.7019607843137254, 0.8509803921568627, 1.0],
  low: [0.38, 0.58, 0.92],
  mid: [0.5019607843137255, 0.7019607843137254, 1.0],
  high: [0.94, 0.97, 1.0],
};

const VERTEX_SHADER = `attribute vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_main;
uniform vec3 u_low;
uniform vec3 u_mid;
uniform vec3 u_high;
uniform float u_wind;
uniform float u_warp;
uniform float u_nscale;

const float GRAIN_STRENGTH = 0.012;

// -------------------------------------------------------------
// Simplex 2D & 3D Noise (Stefan Gustavson)
// Non-grid-aligned, 6-fold symmetry, zero rectangular artifacts
// -------------------------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Rotated multi-octave FBM: 37.5 degree rotation avoids all collinear/axial bias
const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

float fbm2D(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(37.2, 19.4);
  for (int i = 0; i < 4; i++) {
    v += a * (snoise(p) * 0.5 + 0.5);
    p = ROT * p * 2.05 + shift;
    a *= 0.5;
  }
  return v;
}

// Procedural multi-scale volumetric cloud density field
// Uses isotropic coordinates and evolving 3D billows for realistic cumulus clouds
float cloudDensity(vec2 p, float time, float warp) {
  // Steady horizontal drift across the sky with natural gentle vertical heave
  vec2 drift = vec2(time * 0.14, time * 0.035);
  vec2 coord = p * 1.55 * u_nscale + drift;

  // Domain warping: large atmospheric winds stretch and curl the cloud edges
  vec2 warp1 = vec2(
    fbm2D(coord),
    fbm2D(coord + vec2(4.3, 1.7))
  );

  vec2 warp2 = vec2(
    fbm2D(coord + 2.0 * warp1 + vec2(2.1, 7.8) + drift * 0.4),
    fbm2D(coord + 2.0 * warp1 + vec2(8.5, 3.2) + drift * 0.4)
  );

  vec2 warpedP = coord + warp * (warp2 - 0.5) * 1.35;

  // 3D Simplex billow noise for cumulus cauliflower puffs that boil and evolve over time
  // Using 1.0 - abs(noise) produces rounded puffy domes with natural crevices
  vec3 p3 = vec3(warpedP * 1.1, time * 0.045);
  float billows = 1.0 - abs(snoise(p3));

  // Secondary FBM layer adds wispy feathered edge detail
  float microPuffs = fbm2D(warpedP * 2.4 - drift * 0.35);

  // Combine macro cumulus body with micro billowing detail
  float d = billows * 0.60 + microPuffs * 0.40;

  // Shape density: distinct puffy bodies, feathered fringes, open blue sky gaps
  return smoothstep(0.26, 0.72, d);
}

// Film grain for analog finish
float rand2(vec2 n){
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

void main() {
  // Isotropic coordinate system:
  // Using min(u_res.x, u_res.y) ensures 1 coordinate unit has identical pixel length on both X and Y.
  // This completely eliminates rectangular stretching on mobile phones and portrait screens.
  float minDim = min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / minDim;

  float cloudTime = u_t * u_wind;

  // Base cloud density at current pixel
  float density = cloudDensity(p, cloudTime, u_warp);

  // Directional sun vector (radiant light from high upper-left)
  vec2 sunDir = normalize(vec2(-0.48, 0.72));
  float sunStep = 0.052;

  // Sample density toward sun for volumetric self-shadowing & light absorption
  float densitySun = cloudDensity(p + sunDir * sunStep, cloudTime, u_warp);

  // Light attenuation: deeper interior regions facing away from sun are shaded
  float absorption = clamp((densitySun - density * 0.3) * 2.2, 0.0, 1.0);
  float directLight = clamp(1.0 - absorption * 1.3, 0.28, 1.0);

  // Silver lining rim highlight along translucent outer cloud edges
  float rim = pow(clamp(1.0 - abs(density - 0.48) * 2.2, 0.0, 1.0), 2.2);

  // Dynamic sky background gradient:
  // Horizon (bottom) -> Mid-altitude blue -> High zenith (top)
  float normY = clamp(gl_FragCoord.y / u_res.y, 0.0, 1.0);
  vec3 sky = mix(u_main, u_mid, smoothstep(0.0, 0.55, normY));
  sky = mix(sky, u_low, smoothstep(0.40, 1.0, normY));

  // High-altitude wispy cirrus layer (drifting slowly in deep background)
  vec2 cirrusP = p * 2.6 + vec2(cloudTime * 0.22, cloudTime * 0.05);
  float cirrus = smoothstep(0.48, 0.82, fbm2D(cirrusP));
  vec3 skyWithCirrus = mix(sky, mix(u_mid, u_high, 0.55), cirrus * 0.34);

  // -------------------------------------------------------------
  // Volumetric Cloud Shading & Coloring
  // -------------------------------------------------------------
  // Deep underside cloud tone (soft ambient blue-grey with atmospheric tint)
  vec3 cloudUnderside = mix(u_mid * 0.88, vec3(0.68, 0.78, 0.90), 0.55);
  // Lit cloud surface: brilliant, radiant white cumulus
  vec3 cloudSunlit = mix(u_high, vec3(1.0, 1.0, 1.0), 0.82);
  // Specular silver rim
  vec3 silverRim = vec3(1.0, 1.0, 1.0);

  // Interpolate cloud volume color based on direct light
  vec3 cloudColor = mix(cloudUnderside, cloudSunlit, directLight);
  // Add luminous silver rim on translucent contours
  cloudColor = mix(cloudColor, silverRim, rim * 0.45);

  // Optical thickness / Alpha blend (strong presence, soft edge falloff)
  float cloudAlpha = smoothstep(0.02, 0.70, density) * 0.95;

  // Composite volumetric clouds over background sky
  vec3 finalColor = mix(skyWithCirrus, cloudColor, cloudAlpha);

  // Subtle film grain
  float grain = (rand2(gl_FragCoord.xy + fract(u_t)) - 0.5) * GRAIN_STRENGTH;
  finalColor += grain;

  gl_FragColor = vec4(finalColor, 1.0);
}`;

export interface SkyGradientProps {
  className?: string;
  style?: CSSProperties;
  wind?: number;
  warp?: number;
  nscale?: number;
}

export function SkyGradient({
  className = '',
  style,
  wind = 0.45,
  warp = 0.95,
  nscale = 1.0,
}: SkyGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power' }) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      setWebglFailed(true);
      return;
    }

    const compileShader = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[SkyGradient] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vs || !fs) {
      setWebglFailed(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setWebglFailed(true);
      return;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[SkyGradient] Program link error:', gl.getProgramInfoLog(program));
      setWebglFailed(true);
      return;
    }

    gl.useProgram(program);

    // Fullscreen quad buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResLoc = gl.getUniformLocation(program, 'u_res');
    const uTLoc = gl.getUniformLocation(program, 'u_t');
    const uMainLoc = gl.getUniformLocation(program, 'u_main');
    const uLowLoc = gl.getUniformLocation(program, 'u_low');
    const uMidLoc = gl.getUniformLocation(program, 'u_mid');
    const uHighLoc = gl.getUniformLocation(program, 'u_high');
    const uWindLoc = gl.getUniformLocation(program, 'u_wind');
    const uWarpLoc = gl.getUniformLocation(program, 'u_warp');
    const uNscaleLoc = gl.getUniformLocation(program, 'u_nscale');

    if (uMainLoc) gl.uniform3fv(uMainLoc, TONES.main);
    if (uLowLoc) gl.uniform3fv(uLowLoc, TONES.low);
    if (uMidLoc) gl.uniform3fv(uMidLoc, TONES.mid);
    if (uHighLoc) gl.uniform3fv(uHighLoc, TONES.high);
    if (uWindLoc) gl.uniform1f(uWindLoc, wind);
    if (uWarpLoc) gl.uniform1f(uWarpLoc, warp);
    if (uNscaleLoc) gl.uniform1f(uNscaleLoc, nscale);

    let animationFrameId: number;
    let startTime = performance.now();
    let isVisible = true;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        if (uResLoc) {
          gl.uniform2f(uResLoc, canvas.width, canvas.height);
        }
      }
    };

    resize();

    // Use ResizeObserver for responsive dimension tracking across devices & orientation changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(canvas);
    }
    window.addEventListener('resize', resize);

    // Pause animation when page or canvas is hidden to conserve mobile battery
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = (time: number) => {
      if (isVisible) {
        const elapsedSeconds = (time - startTime) * 0.001;
        gl.useProgram(program);
        if (uTLoc) {
          gl.uniform1f(uTLoc, elapsedSeconds);
        }
        // Ensure u_res is always in sync with canvas size
        if (uResLoc && canvas.width > 0 && canvas.height > 0) {
          gl.uniform2f(uResLoc, canvas.width, canvas.height);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [wind, warp, nscale]);

  if (webglFailed) {
    return (
      <div
        className={`w-full h-full ${className}`}
        style={{
          background: 'linear-gradient(180deg, #6699E6 0%, #80B3FF 35%, #B3D9FF 70%, #E6F2FF 100%)',
          ...style,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full pointer-events-none select-none ${className}`}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  );
}

export default SkyGradient;

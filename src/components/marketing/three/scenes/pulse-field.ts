import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { SceneFactory } from '../scene-types';

/**
 * "Pulse field" — a dark terrain of points with heartbeat (ECG) waves
 * travelling across it: the brand line "Her yorum bir nabız" as a living
 * surface. Decorative only (CLAUDE.md §50); used behind the marketing
 * footer's top band.
 *
 * Cost: one draw call, a few thousand points, all motion in the vertex
 * shader (no per-frame CPU work besides uniforms). The GLSL `ecg()` mirrors
 * `ecgPulse()` in three-support.ts.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uWavelength;
  uniform float uSpeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uHalfWidth;
  attribute float aRow;
  varying float vHeight;
  varying float vFade;

  float g(float p, float c, float w) { float d = p - c; return exp(-(d * d) / (2.0 * w * w)); }
  float ecg(float p) {
    p = fract(p);
    return 0.12 * g(p, 0.10, 0.025) - 0.15 * g(p, 0.20, 0.008) + g(p, 0.22, 0.012)
      - 0.30 * g(p, 0.245, 0.010) + 0.25 * g(p, 0.40, 0.040);
  }

  void main() {
    vec3 pos = position;
    // Rows further back lag behind: the beat sweeps the field diagonally.
    float phase = pos.x / uWavelength - uTime * uSpeed + aRow * 0.55;
    float depthEnvelope = mix(1.0, 0.28, aRow);
    float beat = ecg(phase);
    float swell = 0.07 * sin(pos.x * 0.55 + uTime * 0.45 + aRow * 3.1);
    float h = beat * uAmp * depthEnvelope + swell;
    pos.y += h;
    vHeight = clamp(beat * depthEnvelope, 0.0, 1.0);
    float edge = 1.0 - smoothstep(uHalfWidth * 0.62, uHalfWidth, abs(pos.x));
    vFade = pow(1.0 - aRow, 0.75) * edge;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 + vHeight * 1.6) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uLime;
  varying float vHeight;
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, d);
    float lit = smoothstep(0.06, 0.55, vHeight);
    vec3 color = mix(uBase, uLime, lit);
    float alpha = soft * vFade * mix(0.5, 1.0, lit);
    // Straight (non-premultiplied) color: additive blending applies alpha.
    gl_FragColor = vec4(color, alpha);
  }
`;

const LOOK_AT = new Vector3(0, 0.15, -3.2);

export const createScene: SceneFactory = ({ canvas, width, height, pixelRatio, mode }) => {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
    premultipliedAlpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, width / height, 0.1, 60);
  const baseCamera = new Vector3(0, 2.15, 6.4);
  camera.position.copy(baseCamera);
  camera.lookAt(LOOK_AT);

  const compact = width < 720;
  const cols = compact ? 120 : 190;
  const rows = compact ? 30 : 44;
  const halfWidth = compact ? 7.5 : 11;
  const depth = 12;

  const positions = new Float32Array(cols * rows * 3);
  const rowAttr = new Float32Array(cols * rows);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const rowT = r / (rows - 1);
    // Rows get sparser with depth so the far field does not turn into a wall.
    const z = -Math.pow(rowT, 1.35) * depth + 1.2;
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1)) * 2 * halfWidth - halfWidth;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = z;
      rowAttr[i] = rowT;
      i++;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aRow', new BufferAttribute(rowAttr, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: compact ? 0.85 : 1.05 },
      uWavelength: { value: compact ? 5.2 : 7.4 },
      uSpeed: { value: 0.3 },
      uSize: { value: compact ? 26 : 30 },
      uPixelRatio: { value: pixelRatio },
      uHalfWidth: { value: halfWidth },
      uBase: { value: new Color('#7d7d7d') },
      uLime: { value: new Color('#C6F24E') },
    },
  });

  const points = new Points(geometry, material);
  scene.add(points);

  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };

  return {
    render(time) {
      material.uniforms.uTime.value = time;
      if (mode === 'animate') {
        eased.x += (pointer.x - eased.x) * 0.04;
        eased.y += (pointer.y - eased.y) * 0.04;
        camera.position.set(baseCamera.x + eased.x * 0.7, baseCamera.y - eased.y * 0.25, baseCamera.z);
        camera.lookAt(LOOK_AT);
      }
      renderer.render(scene, camera);
    },
    resize(w, h, pr) {
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      material.uniforms.uPixelRatio.value = pr;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

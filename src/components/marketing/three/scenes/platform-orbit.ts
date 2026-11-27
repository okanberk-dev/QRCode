import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { SceneFactory } from '../scene-types';

/**
 * "Platform orbit" — the ten public review platforms whose links Buaze
 * manages circle one core (the business's Buaze page). Every few seconds a
 * pulse travels from the core out to one platform: the customer is sent on
 * to that platform's review page. Decorative only (CLAUDE.md §50): no logos,
 * counters or text in the scene — the platform names stay in the page's
 * HTML next to it, and nothing here implies an API connection or review
 * import (§19.4).
 *
 * Node colors are the platforms' own brand colors (§11 keeps those hexes;
 * Booking uses its lighter #0A5CC2 so it stays visible on dark).
 */

const PLATFORM_COLORS = [
  '#4285F4', // Google
  '#FA0050', // Yemeksepeti
  '#5D3EBC', // Getir
  '#F27A1A', // Trendyol GO
  '#34E0A1', // Tripadvisor
  '#FF5A5F', // Airbnb
  '#0A5CC2', // Booking.com
  '#FC3F1D', // Yandex
  '#D32323', // Yelp
  '#F94877', // Foursquare
];

/** Ring tilt is measured from the horizontal plane (radians). */
const RINGS = [
  { radius: 2.1, tiltX: 0.42, tiltZ: 0.26, speed: 0.14 },
  { radius: 2.8, tiltX: 0.62, tiltZ: -0.34, speed: -0.1 },
  { radius: 3.45, tiltX: 0.3, tiltZ: 0.5, speed: 0.075 },
];

const FOV = 36;
const HALF_FOV_TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** Camera distance that keeps the outer ring inside any container shape. */
function cameraDistance(aspect: number): number {
  return Math.max(9.4, 3.8 / (HALF_FOV_TAN * Math.max(aspect, 0.4)));
}

/** Seconds between two pulses, and one pulse's travel time. */
const SIGNAL_EVERY = 1.15;
const SIGNAL_TRAVEL = 1.25;

/** World-unit diameters of the glow sprites. */
const HALO_SIZE = 2.6;
const SIGNAL_SIZE = 0.62;

// Point sizes are in world units: uScale = drawing-buffer height / (2·tan(fov/2)).
const GLOW_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * vAlpha);
    #include <colorspace_fragment>
  }
`;

function ringPoint(radius: number, angle: number, tiltX: number, tiltZ: number, out: Vector3) {
  // Horizontal circle (XZ plane), tilted around X, then around Z.
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y1 = -z * Math.sin(tiltX);
  const z1 = z * Math.cos(tiltX);
  out.set(x * Math.cos(tiltZ) - y1 * Math.sin(tiltZ), x * Math.sin(tiltZ) + y1 * Math.cos(tiltZ), z1);
  return out;
}

function glowMaterial(color: Color, scale: number, dark: boolean, depthTest: boolean) {
  return new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest,
    blending: dark ? AdditiveBlending : NormalBlending,
    uniforms: { uColor: { value: color }, uScale: { value: scale } },
  });
}

export const createScene: SceneFactory = ({ canvas, gl, width, height, pixelRatio, mode, theme }) => {
  const dark = theme === 'dark';
  // ThreeStage created the WebGL2 context (see SCENE_CONTEXT_ATTRIBUTES).
  const renderer = new WebGLRenderer({
    canvas,
    context: gl,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
    premultipliedAlpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, width / height, 0.1, 80);
  const placeCamera = (aspect: number) => {
    camera.aspect = aspect;
    camera.position.set(0, 1.1, cameraDistance(aspect));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  placeCamera(width / height);

  const pointScale = () => (height * pixelRatio) / (2 * HALF_FOV_TAN);

  const world = new Group();
  scene.add(world);

  // Brand purple: lighter tone on dark so the glow stays visible on graphite.
  const brand = new Color(dark ? '#8C6CF0' : '#5D3EBC');
  const ink = new Color(dark ? '#FFFFFF' : '#0A0A0A');

  // Halo: a soft brand disc sitting just behind the core, outside the
  // rotating group so it always faces the camera from behind the heart.
  const haloGeometry = new BufferGeometry();
  haloGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  haloGeometry.setAttribute('aSize', new BufferAttribute(new Float32Array([HALO_SIZE]), 1));
  const haloAlpha = new Float32Array([dark ? 0.6 : 0.55]);
  haloGeometry.setAttribute('aAlpha', new BufferAttribute(haloAlpha, 1));
  const haloMaterial = glowMaterial(brand, pointScale(), dark, true);
  const halo = new Points(haloGeometry, haloMaterial);
  halo.renderOrder = -1;
  scene.add(halo);
  const placeHalo = () => {
    // 0.9 units behind the origin, along the view direction.
    const behind = camera.position.clone().normalize().multiplyScalar(-0.9);
    halo.position.copy(behind);
  };
  placeHalo();

  // Core: a slowly turning wireframe icosahedron with a solid heart.
  const coreGeometry = new IcosahedronGeometry(0.78, 1);
  const coreMaterial = new MeshBasicMaterial({
    color: dark ? brand : new Color('#0A0A0A'),
    wireframe: true,
    transparent: true,
    opacity: dark ? 0.85 : 0.7,
  });
  const coreWire = new Mesh(coreGeometry, coreMaterial);
  const heartGeometry = new SphereGeometry(0.34, 24, 16);
  const heartMaterial = new MeshBasicMaterial({ color: brand });
  const heart = new Mesh(heartGeometry, heartMaterial);
  world.add(coreWire, heart);

  // Rings.
  const ringMaterial = new LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.16 : 0.14 });
  const ringGeometries: BufferGeometry[] = [];
  const tmp = new Vector3();
  for (const ring of RINGS) {
    const segments = 160;
    const pts = new Float32Array(segments * 3);
    for (let s = 0; s < segments; s++) {
      ringPoint(ring.radius, (s / segments) * Math.PI * 2, ring.tiltX, ring.tiltZ, tmp);
      pts[s * 3] = tmp.x;
      pts[s * 3 + 1] = tmp.y;
      pts[s * 3 + 2] = tmp.z;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pts, 3));
    ringGeometries.push(g);
    world.add(new LineLoop(g, ringMaterial));
  }

  // Platform nodes: 3 + 4 + 3, evenly spaced on their ring, each ring
  // phase-shifted so no two nodes start stacked.
  const nodeGeometry = new SphereGeometry(0.13, 20, 14);
  const nodeMaterials = PLATFORM_COLORS.map((hex) => new MeshBasicMaterial({ color: new Color(hex) }));
  const perRing = [3, 4, 3];
  const nodes = PLATFORM_COLORS.map((_, index) => {
    const mesh = new Mesh(nodeGeometry, nodeMaterials[index]);
    world.add(mesh);
    const ringIndex = index < 3 ? 0 : index < 7 ? 1 : 2;
    const slot = index - (ringIndex === 0 ? 0 : ringIndex === 1 ? 3 : 7);
    const offset = (slot / perRing[ringIndex]) * Math.PI * 2 + ringIndex * 0.9;
    return { mesh, ring: RINGS[ringIndex], offset };
  });

  // Spokes: core → node, faint.
  const spokePositions = new Float32Array(PLATFORM_COLORS.length * 2 * 3);
  const spokeGeometry = new BufferGeometry();
  spokeGeometry.setAttribute('position', new BufferAttribute(spokePositions, 3));
  const spokeMaterial = new LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.09 : 0.08 });
  world.add(new LineSegments(spokeGeometry, spokeMaterial));

  // Pulses: one travelling sprite per platform (core → platform).
  const signalPositions = new Float32Array(PLATFORM_COLORS.length * 3);
  const signalSizes = new Float32Array(PLATFORM_COLORS.length);
  const signalAlphas = new Float32Array(PLATFORM_COLORS.length);
  const signalGeometry = new BufferGeometry();
  signalGeometry.setAttribute('position', new BufferAttribute(signalPositions, 3));
  signalGeometry.setAttribute('aSize', new BufferAttribute(signalSizes, 1));
  signalGeometry.setAttribute('aAlpha', new BufferAttribute(signalAlphas, 1));
  const signalMaterial = glowMaterial(brand, pointScale(), dark, false);
  world.add(new Points(signalGeometry, signalMaterial));

  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  const nodePos = new Vector3();

  const draw = (time: number) => {
    nodes.forEach((node, index) => {
      ringPoint(node.ring.radius, node.offset + time * node.ring.speed, node.ring.tiltX, node.ring.tiltZ, nodePos);
      node.mesh.position.copy(nodePos);
      spokePositions.set([0, 0, 0, nodePos.x, nodePos.y, nodePos.z], index * 6);
    });
    spokeGeometry.attributes.position.needsUpdate = true;

    // Core breathing + a small flash when a pulse leaves the core.
    const cycle = time / SIGNAL_EVERY;
    const sinceLaunch = ((time % SIGNAL_EVERY) + SIGNAL_EVERY) % SIGNAL_EVERY;
    const flash = Math.exp(-sinceLaunch * 5);
    coreWire.scale.setScalar(1 + 0.035 * Math.sin(time * 1.6) + flash * 0.1);
    heart.scale.setScalar(1 + flash * 0.2);
    coreWire.rotation.set(time * 0.12, time * 0.19, 0);
    haloAlpha[0] = (dark ? 0.55 : 0.5) + flash * 0.25;
    haloGeometry.attributes.aAlpha.needsUpdate = true;

    // Platform k receives a pulse at k·SIGNAL_EVERY, then every N cycles.
    for (let k = 0; k < PLATFORM_COLORS.length; k++) {
      const launchedAt = Math.floor((cycle - k) / PLATFORM_COLORS.length) * PLATFORM_COLORS.length + k;
      const age = time - launchedAt * SIGNAL_EVERY;
      const node = nodes[k].mesh.position;
      if (age >= 0 && age <= SIGNAL_TRAVEL) {
        const t = age / SIGNAL_TRAVEL;
        const ease = t * t * (3 - 2 * t);
        signalPositions.set([node.x * ease, node.y * ease, node.z * ease], k * 3);
        signalSizes[k] = SIGNAL_SIZE;
        signalAlphas[k] = Math.sin(Math.PI * t) * 0.95;
      } else {
        signalPositions.set([node.x, node.y, node.z], k * 3);
        signalSizes[k] = 0;
        signalAlphas[k] = 0;
      }
    }
    signalGeometry.attributes.position.needsUpdate = true;
    signalGeometry.attributes.aSize.needsUpdate = true;
    signalGeometry.attributes.aAlpha.needsUpdate = true;

    if (mode === 'animate') {
      eased.x += (pointer.x - eased.x) * 0.035;
      eased.y += (pointer.y - eased.y) * 0.035;
    }
    world.rotation.set(-0.12 + eased.y * 0.12, time * 0.045 + eased.x * 0.35, 0);
    renderer.render(scene, camera);
  };

  return {
    async prepare() {
      // Parallel compile where the driver supports it; otherwise a plain
      // compile (compileAsync would only log a warning and fall back).
      if (renderer.extensions.has('KHR_parallel_shader_compile')) {
        await renderer.compileAsync(scene, camera);
      } else {
        renderer.compile(scene, camera);
      }
    },
    render(time) {
      draw(time);
    },
    resize(w, h, pr) {
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      const scale = (h * pr) / (2 * HALF_FOV_TAN);
      haloMaterial.uniforms.uScale.value = scale;
      signalMaterial.uniforms.uScale.value = scale;
      placeCamera(w / h);
      placeHalo();
    },
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    dispose() {
      coreGeometry.dispose();
      heartGeometry.dispose();
      nodeGeometry.dispose();
      spokeGeometry.dispose();
      signalGeometry.dispose();
      haloGeometry.dispose();
      ringGeometries.forEach((g) => g.dispose());
      nodeMaterials.forEach((m) => m.dispose());
      coreMaterial.dispose();
      heartMaterial.dispose();
      ringMaterial.dispose();
      spokeMaterial.dispose();
      signalMaterial.dispose();
      haloMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

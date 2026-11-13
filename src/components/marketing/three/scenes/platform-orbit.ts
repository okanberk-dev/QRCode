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
 * "Platform orbit" — the ten review platforms Buaze links to circle one
 * core (the Buaze panel). Every few seconds a signal travels from a platform
 * node into the core: one place for every review. Decorative only
 * (CLAUDE.md §50); the platform names stay in the page's HTML next to it.
 *
 * Node colors are the platforms' own brand colors (§11 keeps those hexes).
 */

const PLATFORM_COLORS = [
  '#4285F4', // Google
  '#FA0050', // Yemeksepeti
  '#5D3EBC', // Getir
  '#F27A1A', // Trendyol GO
  '#34E0A1', // Tripadvisor
  '#FF5A5F', // Airbnb
  '#0A5CC2', // Booking
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

/** Seconds between two signals, and one signal's travel time. */
const SIGNAL_EVERY = 1.15;
const SIGNAL_TRAVEL = 1.25;

const GLOW_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio / -mv.z;
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

export const createScene: SceneFactory = ({ canvas, width, height, pixelRatio, mode, theme }) => {
  const dark = theme === 'dark';
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, width / height, 0.1, 80);
  camera.position.set(0, 1.1, cameraDistance(width / height));
  camera.lookAt(0, 0, 0);

  const world = new Group();
  scene.add(world);

  const lime = new Color('#C6F24E');
  const ink = new Color(dark ? '#FFFFFF' : '#0A0A0A');

  // Core: a slowly turning wireframe icosahedron with a solid heart.
  const coreGeometry = new IcosahedronGeometry(0.78, 1);
  const coreWire = new Mesh(
    coreGeometry,
    new MeshBasicMaterial({ color: dark ? lime : new Color('#0A0A0A'), wireframe: true, transparent: true, opacity: dark ? 0.85 : 0.7 }),
  );
  const heartGeometry = new SphereGeometry(0.34, 24, 16);
  const heart = new Mesh(heartGeometry, new MeshBasicMaterial({ color: lime }));
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

  // Platform nodes: spread over the rings.
  const nodeGeometry = new SphereGeometry(0.13, 20, 14);
  const nodeMaterials = PLATFORM_COLORS.map((hex) => new MeshBasicMaterial({ color: new Color(hex) }));
  // 3 + 4 + 3 nodes, evenly spaced on their ring, each ring phase-shifted.
  const perRing = [3, 4, 3];
  const nodes = PLATFORM_COLORS.map((_, index) => {
    const mesh = new Mesh(nodeGeometry, nodeMaterials[index]);
    world.add(mesh);
    const ringIndex = index < 3 ? 0 : index < 7 ? 1 : 2;
    const slot = index - (ringIndex === 0 ? 0 : ringIndex === 1 ? 3 : 7);
    const offset = (slot / perRing[ringIndex]) * Math.PI * 2 + ringIndex * 0.9;
    return { mesh, ring: RINGS[ringIndex], offset };
  });

  // Spokes: node → core, faint.
  const spokePositions = new Float32Array(PLATFORM_COLORS.length * 2 * 3);
  const spokeGeometry = new BufferGeometry();
  spokeGeometry.setAttribute('position', new BufferAttribute(spokePositions, 3));
  const spokeMaterial = new LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.09 : 0.08 });
  world.add(new LineSegments(spokeGeometry, spokeMaterial));

  // Glows: one around the core + one travelling signal per platform.
  const glowCount = 1 + PLATFORM_COLORS.length;
  const glowPositions = new Float32Array(glowCount * 3);
  const glowSizes = new Float32Array(glowCount);
  const glowAlphas = new Float32Array(glowCount);
  const glowGeometry = new BufferGeometry();
  glowGeometry.setAttribute('position', new BufferAttribute(glowPositions, 3));
  glowGeometry.setAttribute('aSize', new BufferAttribute(glowSizes, 1));
  glowGeometry.setAttribute('aAlpha', new BufferAttribute(glowAlphas, 1));
  const glowMaterial = new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: dark ? AdditiveBlending : NormalBlending,
    uniforms: { uColor: { value: lime }, uPixelRatio: { value: pixelRatio } },
  });
  world.add(new Points(glowGeometry, glowMaterial));

  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  const nodePos = new Vector3();

  const draw = (time: number) => {
    // Nodes and spokes.
    nodes.forEach((node, index) => {
      ringPoint(node.ring.radius, node.offset + time * node.ring.speed, node.ring.tiltX, node.ring.tiltZ, nodePos);
      node.mesh.position.copy(nodePos);
      spokePositions.set([nodePos.x, nodePos.y, nodePos.z, 0, 0, 0], index * 6);
    });
    spokeGeometry.attributes.position.needsUpdate = true;

    // Core breathing + a brighter flash when a signal lands.
    const cycle = time / SIGNAL_EVERY;
    const sinceLanding = ((time - SIGNAL_TRAVEL) % SIGNAL_EVERY + SIGNAL_EVERY) % SIGNAL_EVERY;
    const flash = time > SIGNAL_TRAVEL ? Math.exp(-sinceLanding * 5) : 0;
    const coreScale = 1 + 0.035 * Math.sin(time * 1.6) + flash * 0.12;
    coreWire.scale.setScalar(coreScale);
    heart.scale.setScalar(1 + flash * 0.25);
    coreWire.rotation.set(time * 0.12, time * 0.19, 0);

    glowPositions.set([0, 0, 0], 0);
    glowSizes[0] = (dark ? 420 : 320) * (1 + flash * 0.5);
    glowAlphas[0] = dark ? 0.55 + flash * 0.35 : 0.6 + flash * 0.3;

    // Signals: platform k emits at k * SIGNAL_EVERY (+ every N cycles).
    for (let k = 0; k < PLATFORM_COLORS.length; k++) {
      const slot = 1 + k;
      const emittedAt = Math.floor((cycle - k) / PLATFORM_COLORS.length) * PLATFORM_COLORS.length + k;
      const age = time - emittedAt * SIGNAL_EVERY;
      const node = nodes[k].mesh.position;
      if (age >= 0 && age <= SIGNAL_TRAVEL) {
        const t = age / SIGNAL_TRAVEL;
        const ease = t * t * (3 - 2 * t);
        glowPositions.set([node.x * (1 - ease), node.y * (1 - ease), node.z * (1 - ease)], slot * 3);
        glowSizes[slot] = 120;
        glowAlphas[slot] = Math.sin(Math.PI * t) * 0.95;
      } else {
        glowPositions.set([node.x, node.y, node.z], slot * 3);
        glowSizes[slot] = 0;
        glowAlphas[slot] = 0;
      }
    }
    glowGeometry.attributes.position.needsUpdate = true;
    glowGeometry.attributes.aSize.needsUpdate = true;
    glowGeometry.attributes.aAlpha.needsUpdate = true;

    if (mode === 'animate') {
      eased.x += (pointer.x - eased.x) * 0.035;
      eased.y += (pointer.y - eased.y) * 0.035;
    }
    world.rotation.set(-0.12 + eased.y * 0.12, time * 0.045 + eased.x * 0.35, 0);
    renderer.render(scene, camera);
  };

  return {
    render(time) {
      draw(time);
    },
    resize(w, h, pr) {
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      glowMaterial.uniforms.uPixelRatio.value = pr;
      camera.aspect = w / h;
      camera.position.set(0, 1.1, cameraDistance(w / h));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
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
      glowGeometry.dispose();
      ringGeometries.forEach((g) => g.dispose());
      nodeMaterials.forEach((m) => m.dispose());
      (coreWire.material as MeshBasicMaterial).dispose();
      (heart.material as MeshBasicMaterial).dispose();
      ringMaterial.dispose();
      spokeMaterial.dispose();
      glowMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

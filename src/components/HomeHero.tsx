import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';
import { Language } from '../lib/i18n';

/**
 * The home page's first section: NOVAIQ's claim over a 3D neural web.
 *
 * ## Why this owns its own screen
 *
 * It is the FIRST section of the home page, and the rule the home page is being rebuilt under is
 * that the first section fills the viewport on its own — nothing from the section below may show
 * until the visitor scrolls. That is the `min-h` below, and it subtracts the floating navbar's
 * measured height so "one screen" means one screen rather than one screen plus the header's band.
 *
 * Everything about this section's size lives in this file: its own <section>, its own
 * `.nq-container`, its own padding. No ancestor spaces it against its neighbours.
 *
 * ## The artwork
 *
 * A fractal web — a root that branches outward five times, plus short cross-links between nodes
 * that ended up near each other, which is what turns a tree into something that reads as a network.
 * Nodes are one THREE.Points draw and every connection is one THREE.LineSegments draw, so the whole
 * thing is two draw calls no matter how many branches it grows.
 *
 * The glow is additive blending in the fragment shaders, not a bloom pass. An UnrealBloomPass means
 * an EffectComposer, a second render target and a multi-pass blur every frame — real cost on a
 * phone, for a look that a soft radial falloff drawn additively gets to on its own here, because
 * every lit thing in the scene is a small bright dot on black, which is exactly the case bloom is
 * imitating.
 *
 * Tapping or clicking sends a ripple through it: the click is raycast against an invisible plane at
 * the origin, and that point goes into the shaders as a wave centre. Three can be in flight at once.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose — they are template
 * literals, and one backtick closes the string mid-shader and compiles to a GLSL syntax error that
 * shows up as the artwork silently not drawing.
 */

/* ── Palette ──────────────────────────────────────────────────────────────────────────────── */

/** Indigo core → violet edge, the two ends of the template's accent ramp. Deep nodes take the
    violet, so the web reads as receding rather than as one flat colour at every depth. */
const NODE_CORE = new THREE.Color('#8ea2ff');
const NODE_EDGE = new THREE.Color('#764ba2');
/** What a node flashes to as a ripple passes through it. Near-white so the wave front is legible
    against the glow of the nodes it is travelling over. */
const NODE_FLASH = new THREE.Color('#e8ecff');
const LINK_COLOR = new THREE.Color('#667eea');

/* ── The web ──────────────────────────────────────────────────────────────────────────────── */

/** Deterministic PRNG. The web is generated once at mount, and a Math.random() version would be a
    different shape on every reload — including between a screenshot and the fix for it. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Web {
  nodes: THREE.Vector3[];
  depths: number[];
  edges: [number, number][];
}

/**
 * Grow the web.
 *
 * `maxDepth` is the one performance dial: each level multiplies the node count by roughly 2.4, so 5
 * is about 350 nodes and 4 is about 145. Phones get 4 — the silhouette is the same and the node
 * count is what a coarse-pointer device pays for in overdraw, since every node is a translucent
 * additive sprite.
 */
function buildWeb(maxDepth: number): Web {
  const rand = mulberry32(0x4e4f5641); // "NOVA"
  const nodes: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
  const depths: number[] = [0];
  const edges: [number, number][] = [];

  const BASE_LEN = 1.7;
  /** Each generation is shorter than its parent, which is what makes the outside of the web denser
      than the middle instead of it growing into an even lattice. */
  const DECAY = 0.76;

  const grow = (parent: number, dir: THREE.Vector3, depth: number) => {
    if (depth >= maxDepth) return;
    const children = depth === 0 ? 6 : rand() < 0.55 ? 2 : 3;
    for (let i = 0; i < children; i++) {
      // Spread widens with depth: tight near the root so the trunks read as separate arms, loose at
      // the tips so the outer shell fills in rather than growing six thin spikes.
      const spread = 0.55 + depth * 0.22;
      const next = dir
        .clone()
        .add(
          new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
            .normalize()
            .multiplyScalar(spread),
        )
        .normalize();
      const len = BASE_LEN * Math.pow(DECAY, depth) * (0.7 + rand() * 0.6);
      const pos = nodes[parent].clone().addScaledVector(next, len);
      nodes.push(pos);
      depths.push(depth + 1);
      edges.push([parent, nodes.length - 1]);
      grow(nodes.length - 1, next, depth + 1);
    }
  };

  // Six roots on the axes, jittered. A sphere of random directions leaves bald patches at this
  // count; the axes guarantee the web reaches every side of the frame.
  const seeds = [
    new THREE.Vector3(1, 0.35, 0),
    new THREE.Vector3(-1, 0.2, 0.3),
    new THREE.Vector3(0.2, 1, -0.2),
    new THREE.Vector3(-0.3, -1, 0.2),
    new THREE.Vector3(0.3, 0.1, 1),
    new THREE.Vector3(-0.2, -0.2, -1),
  ];
  for (const s of seeds) grow(0, s.normalize(), 0);

  // Cross-links. Without these it is a tree — every path between two tips runs back through the
  // root, and it looks like a firework rather than a network. One extra link per eighth node, to
  // the nearest node that is not already its parent, keeps the count low and the reading right.
  const LINK_RANGE = 1.5;
  for (let i = 1; i < nodes.length; i += 8) {
    let best = -1;
    let bestD = LINK_RANGE;
    for (let j = 1; j < nodes.length; j++) {
      if (j === i) continue;
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best !== -1) edges.push([i, best]);
  }

  return { nodes, depths, edges };
}

/* ── Shaders ──────────────────────────────────────────────────────────────────────────────── */

/** How many ripples can be in flight at once, and how long each one lives. Both are baked into the
    GLSL loop bound, which has to be a compile-time constant in GLSL ES 1.0. */
const PULSE_SLOTS = 3;
const PULSE_LIFE = 2.4;
/** Units per second the ring travels. The web is about 5.5 units across, so this crosses it in a
    little over a second — fast enough to read as a signal rather than as a growing bubble. */
const PULSE_SPEED = 4.0;

/** Shared by both shaders: the travelling-ring term, and the slow idle drift that keeps the web
    alive while nothing is being clicked. */
const PULSE_GLSL = `
  uniform float uTime;
  uniform vec3 uPulsePos[${PULSE_SLOTS}];
  uniform float uPulseTime[${PULSE_SLOTS}];

  vec3 drift(vec3 p, float seed, float depth) {
    float amp = 0.05 * (1.0 + depth * 0.35);
    p.x += sin(uTime * 0.55 + seed * 6.28) * amp;
    p.y += cos(uTime * 0.47 + seed * 4.10) * amp;
    p.z += sin(uTime * 0.39 + seed * 5.30) * amp;
    return p;
  }

  float pulseAt(vec3 p) {
    float acc = 0.0;
    for (int i = 0; i < ${PULSE_SLOTS}; i++) {
      float age = uTime - uPulseTime[i];
      if (age > 0.0 && age < ${PULSE_LIFE.toFixed(1)}) {
        float ring = 1.0 - abs(distance(p, uPulsePos[i]) - age * ${PULSE_SPEED.toFixed(1)});
        acc = max(acc, smoothstep(0.0, 1.0, ring) * (1.0 - age / ${PULSE_LIFE.toFixed(1)}));
      }
    }
    return acc;
  }
`;

const NODE_VERT = `
  ${PULSE_GLSL}
  uniform float uSize;
  attribute float aDepth;
  attribute float aSeed;
  varying float vDepth;
  varying float vPulse;

  void main() {
    vec3 pos = drift(position, aSeed, aDepth);
    vPulse = pulseAt(pos);
    vDepth = aDepth;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    // Size falls off with distance the way a real point light would, so the far side of the web
    // reads as far rather than as the same web drawn smaller.
    //
    // uSize is in WORLD units, not pixels — the 300 turns it into pixels at this depth, so the
    // numbers here are small: at the camera's 9.5 units back, 0.22 lands a node at about 7px. A
    // pixel value put in here directly is what turned the first draft into one purple cloud, since
    // 5.5 came out the far side as 174px and every node overlapped every other one.
    //
    // Clamped at the top because a node drifting close to the camera would otherwise blow up into
    // a screen-filling sprite, and at the bottom because a sub-pixel additive dot flickers as it
    // crosses the sample grid.
    gl_PointSize = clamp(uSize * (1.0 + vPulse * 2.4) * (300.0 / -mv.z), 1.0, 18.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const NODE_FRAG = `
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform vec3 uFlash;
  uniform float uMaxDepth;
  varying float vDepth;
  varying float vPulse;

  void main() {
    // A square sprite carved into a disc. Everything outside the circle is thrown away rather than
    // drawn at zero alpha, which keeps the additive pass from stacking invisible quads on itself.
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float glow = pow(1.0 - d, 2.2);
    vec3 col = mix(uCore, uEdge, clamp(vDepth / uMaxDepth, 0.0, 1.0));
    col = mix(col, uFlash, vPulse);
    gl_FragColor = vec4(col, glow * (0.72 + vPulse * 0.28));
  }
`;

const LINK_VERT = `
  ${PULSE_GLSL}
  attribute float aDepth;
  attribute float aSeed;
  varying float vDepth;
  varying float vPulse;

  void main() {
    vec3 pos = drift(position, aSeed, aDepth);
    vPulse = pulseAt(pos);
    vDepth = aDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const LINK_FRAG = `
  uniform vec3 uColor;
  uniform vec3 uFlash;
  uniform float uMaxDepth;
  varying float vDepth;
  varying float vPulse;

  void main() {
    // Outer links fade out. They are the densest part of the web and at full strength they close
    // into a solid shell that hides everything inside it.
    float fade = 1.0 - clamp(vDepth / uMaxDepth, 0.0, 1.0) * 0.65;
    vec3 col = mix(uColor, uFlash, vPulse);
    gl_FragColor = vec4(col, fade * (0.34 + vPulse * 0.6));
  }
`;

/* ── The scene ────────────────────────────────────────────────────────────────────────────── */

const NeuralWeb: React.FC<{ maxDepth: number; still: boolean }> = ({ maxDepth, still }) => {
  const group = useRef<THREE.Group>(null);
  const nodeMat = useRef<THREE.ShaderMaterial>(null);
  const linkMat = useRef<THREE.ShaderMaterial>(null);
  /** Write cursor into the ring of pulse slots. The oldest in-flight ripple is the one a fourth
      click overwrites, which is the one closest to having faded out anyway. */
  const slot = useRef(0);

  const { nodeGeom, linkGeom } = useMemo(() => {
    const web = buildWeb(maxDepth);
    const rand = mulberry32(0x51554e54); // "QUNT"

    const nodeGeom = new THREE.BufferGeometry();
    const nPos = new Float32Array(web.nodes.length * 3);
    const nDepth = new Float32Array(web.nodes.length);
    const nSeed = new Float32Array(web.nodes.length);
    web.nodes.forEach((v, i) => {
      nPos[i * 3] = v.x;
      nPos[i * 3 + 1] = v.y;
      nPos[i * 3 + 2] = v.z;
      nDepth[i] = web.depths[i];
      nSeed[i] = rand();
    });
    nodeGeom.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    nodeGeom.setAttribute('aDepth', new THREE.BufferAttribute(nDepth, 1));
    nodeGeom.setAttribute('aSeed', new THREE.BufferAttribute(nSeed, 1));

    // Line endpoints carry the SAME seed and depth as the node they sit on, so a link's ends drift
    // with the nodes they connect instead of tearing away from them.
    const linkGeom = new THREE.BufferGeometry();
    const lPos = new Float32Array(web.edges.length * 6);
    const lDepth = new Float32Array(web.edges.length * 2);
    const lSeed = new Float32Array(web.edges.length * 2);
    web.edges.forEach(([a, b], i) => {
      const va = web.nodes[a];
      const vb = web.nodes[b];
      lPos.set([va.x, va.y, va.z, vb.x, vb.y, vb.z], i * 6);
      lDepth[i * 2] = web.depths[a];
      lDepth[i * 2 + 1] = web.depths[b];
      lSeed[i * 2] = nSeed[a];
      lSeed[i * 2 + 1] = nSeed[b];
    });
    linkGeom.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    linkGeom.setAttribute('aDepth', new THREE.BufferAttribute(lDepth, 1));
    linkGeom.setAttribute('aSeed', new THREE.BufferAttribute(lSeed, 1));

    return { nodeGeom, linkGeom };
  }, [maxDepth]);

  // R3F disposes geometry it created from JSX, but these two are built here, so they are ours to
  // release — a rebuild (which only a maxDepth change causes) would otherwise leak both buffers.
  useEffect(() => () => {
    nodeGeom.dispose();
    linkGeom.dispose();
  }, [nodeGeom, linkGeom]);

  const uniforms = useMemo(() => {
    const shared = {
      uTime: { value: 0 },
      uPulsePos: { value: Array.from({ length: PULSE_SLOTS }, () => new THREE.Vector3()) },
      // Far enough in the past that every slot starts expired rather than firing on the first frame.
      uPulseTime: { value: Array.from({ length: PULSE_SLOTS }, () => -100) },
      uMaxDepth: { value: maxDepth },
      uFlash: { value: NODE_FLASH },
    };
    return {
      node: {
        ...shared,
        uSize: { value: 0.3 },
        uCore: { value: NODE_CORE },
        uEdge: { value: NODE_EDGE },
      },
      link: { ...shared, uColor: { value: LINK_COLOR } },
    };
  }, [maxDepth]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (nodeMat.current) nodeMat.current.uniforms.uTime.value = t;
    if (linkMat.current) linkMat.current.uniforms.uTime.value = t;
    // Turning the group rather than orbiting the camera: the copy is centred over this, and a
    // moving camera would slide the web out from under it.
    if (group.current && !still) {
      group.current.rotation.y += delta * 0.05;
      group.current.rotation.x = Math.sin(t * 0.08) * 0.08;
    }
  });

  const fire = (point: THREE.Vector3) => {
    const i = slot.current;
    slot.current = (i + 1) % PULSE_SLOTS;
    // The click lands in world space; the web is inside a rotating group, so it has to come back
    // into the group's own space or the ripple starts wherever the web was pointing at t=0.
    const local = group.current ? group.current.worldToLocal(point.clone()) : point;
    for (const mat of [nodeMat.current, linkMat.current]) {
      if (!mat) continue;
      mat.uniforms.uPulsePos.value[i].copy(local);
      mat.uniforms.uPulseTime.value[i] = mat.uniforms.uTime.value;
    }
  };

  return (
    <>
      <group ref={group}>
        <points geometry={nodeGeom}>
          <shaderMaterial
            ref={nodeMat}
            uniforms={uniforms.node}
            vertexShader={NODE_VERT}
            fragmentShader={NODE_FRAG}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
        <lineSegments geometry={linkGeom}>
          <shaderMaterial
            ref={linkMat}
            uniforms={uniforms.link}
            vertexShader={LINK_VERT}
            fragmentShader={LINK_FRAG}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>
      <PulsePlane onFire={fire} />
    </>
  );
};

/**
 * What the click is actually raycast against.
 *
 * The nodes themselves are a poor target — they are a Points cloud, so hitting one means landing
 * within a few pixels of a dot, and most of the section is the gaps between them. A plane through
 * the origin facing the camera turns every click anywhere in the section into a point in the web's
 * own space, which is what the ripple needs.
 *
 * Invisible via a zero-opacity material rather than `visible={false}`: three skips invisible objects
 * when raycasting, so the flag would switch the target off along with the drawing.
 */
const PulsePlane: React.FC<{ onFire: (p: THREE.Vector3) => void }> = ({ onFire }) => {
  const { camera } = useThree();
  return (
    <mesh
      quaternion={camera.quaternion}
      onPointerDown={(e) => {
        e.stopPropagation();
        onFire(e.point);
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

/* ── The section ──────────────────────────────────────────────────────────────────────────── */

interface HomeHeroProps {
  language?: Language;
  /** Into the template gallery — the lighter of the two ways in. */
  onStart?: () => void;
  /** Straight to the contract form, for someone who already knows they want something built. */
  onRequestProject?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  language = 'ar',
  onStart,
  onRequestProject,
}) => {
  const isAr = language === 'ar';
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [maxDepth, setMaxDepth] = useState(5);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    setMaxDepth(window.matchMedia('(pointer: coarse)').matches ? 4 : 5);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Kept mounted and parked at frameloop="never" once it leaves the screen, rather than unmounted:
  // tearing the canvas down destroys the GL context, and rebuilding it costs a fresh context, a
  // shader recompile and a scene rebuild on the main thread every time the hero scrolls back.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="home-hero"
      // One full screen, less the floating navbar's measured height and the gap <main> already put
      // under it — otherwise "100vh" means one screen PLUS that band, and the fold lands inside the
      // next section. `svh` rather than `vh` so a phone's collapsing address bar does not make this
      // taller than the screen it is supposed to match.
      className="relative flex items-center overflow-hidden py-16 sm:py-24 min-h-[calc(100svh-var(--nav-bottom,74px)-var(--content-gap))]"
    >
      <div ref={hostRef} className="absolute inset-0 z-0" aria-hidden="true">
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={[1, MAX_DPR]}
          camera={{ position: [0, 1.2, 9.5], fov: 55 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          <NeuralWeb maxDepth={maxDepth} still={reduced} />
        </Canvas>
      </div>

      {/* Legibility, not decoration: the web is at its densest and brightest through the middle of
          the frame, which is exactly where the headline sits. The scrim is heaviest at the centre
          and clears at the edges, so the copy keeps its contrast while the web stays visible around
          it. `pointer-events-none` because a full-bleed layer over the canvas would otherwise eat
          every click before the ripple ever saw it. */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_50%_36%_at_50%_50%,rgba(5,5,8,0.9)_0%,rgba(5,5,8,0.55)_58%,transparent_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 nq-container text-center">
        <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-[#667eea]/10 border border-[#667eea]/30 text-[#a5b4fc] text-xs font-semibold tracking-wider uppercase">
          {isAr ? 'مواقع • تطبيقات • أنظمة' : 'Web • Apps • Systems'}
        </span>

        {/* One line, two tones — the site's own headline treatment, with the quiet half taken up to
            the template's indigo instead of grey. `text-balance` covers the narrow screens where it
            genuinely cannot fit, splitting it evenly instead of orphaning one word. */}
        <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl lg:text-[4.4rem] font-extrabold tracking-tight leading-[1.1] font-['Cairo'] text-balance bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-[#a5b4fc] drop-shadow-lg">
          {isAr ? 'بناء مواقع وتطبيقات' : 'Web & App Development'}
        </h1>

        <p className="mt-6 mx-auto max-w-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {isAr
            ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
            : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
        </p>

        {/* `.filter-pill-btn` is the site's button with the motion — the swell on hover, the press,
            and the conic ring rolling round the outline — and it is what ProjectCtaButton and the
            templates toolbar already wear. `relative` is not decoration: the class brings
            `isolation: isolate` but not a position, and the beam is `position: absolute; inset: 0`,
            so without it the ring hangs off the nearest positioned ancestor instead of the button. */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onRequestProject}
            className="filter-pill-btn relative px-8 py-3.5 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="filter-pill-beam" aria-hidden="true" />
            <span>{isAr ? 'ابدأ معنا' : 'Get started'}</span>
          </button>

          <button
            type="button"
            onClick={onStart}
            className="filter-pill-btn filter-pill-btn--ghost relative px-8 py-3.5 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="filter-pill-beam" aria-hidden="true" />
            <span>{isAr ? 'شاهد القوالب' : 'View templates'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

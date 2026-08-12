import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { templatesData } from '../data/templatesData';

const CARDS = templatesData.slice(0, 6);

interface Pose {
  x: number;
  y: number;
  z: number;
  rotY: number;
  rotZ: number;
  phase: number;
}

// Anchor points the scatter is built from — three columns, two rows, covering the frame.
// Positions are not drawn freely at random: pure random placement clumps and overlaps
// often enough to look like a bug rather than a composition. Each card claims one anchor
// and is then jittered well inside it, which keeps every arrangement both different and
// legible.
const ANCHORS: [number, number][] = [
  [-1.85, 1.1],
  [0, 1.1],
  [1.85, 1.1],
  [-1.85, -1.1],
  [0, -1.1],
  [1.85, -1.1],
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Fisher-Yates on a copy — never in place, since the caller's array is shared module data.
function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// A fresh scatter: which anchor each card lands on, how far it drifts inside it, its
// depth, both tilt angles and its float phase are all redrawn every time.
function buildScatter(): Pose[] {
  return shuffled(ANCHORS).map(([ax, ay]) => ({
    x: ax + rand(-0.32, 0.32),
    y: ay + rand(-0.42, 0.42),
    z: rand(-0.8, 0.6),
    rotY: rand(0.18, 0.45),
    rotZ: rand(-0.12, 0.12),
    phase: rand(0, Math.PI * 2),
  }));
}

const CARD_W = 1.15;
const CARD_H = 1.55;
const CARD_D = 0.07;
// Where a picked card lands: centred and pulled well clear of the others.
const FOCUS_Z = 2.3;

interface CardProps {
  url: string;
  pose: Pose;
  isActive: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}

const Card: React.FC<CardProps> = ({ url, pose, isActive, isDimmed, onSelect }) => {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const sharp = useTexture(url);

  useMemo(() => {
    sharp.colorSpace = THREE.SRGBColorSpace;
    // Without anisotropy a texture on a card turned away from the camera smears badly —
    // this is what keeps the picked card crisp rather than merely un-blurred.
    sharp.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    sharp.needsUpdate = true;
  }, [sharp, gl]);

  // The unfocused look is a genuinely low-resolution copy of the image, magnified back up
  // by the GPU's own linear filter. That is a real blur, but it costs one texture fetch —
  // where the depth-of-field pass this replaces cost a full extra screen pass every frame
  // AND softened the focused card along with everything else, which was the actual bug.
  const blurred = useMemo(() => {
    const src = sharp.image as CanvasImageSource | undefined;
    if (!src) return sharp;
    const canvas = document.createElement('canvas');
    canvas.width = 26;
    canvas.height = 34;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sharp;
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [sharp]);

  useEffect(() => () => {
    if (blurred !== sharp) blurred.dispose();
  }, [blurred, sharp]);

  // Eased every frame rather than snapped, and framerate-independent, so picking a card
  // reads as it swinging forward through space at the same speed on a 60Hz and a 144Hz
  // screen. All of this is transform work on the GPU — nothing here touches layout.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 0.6 + pose.phase) * 0.1;
    const sway = Math.cos(t * 0.45 + pose.phase) * 0.05;

    const targetX = isActive ? 0 : pose.x;
    const targetY = (isActive ? 0 : pose.y) + bob;
    const targetZ = isActive ? FOCUS_Z : isDimmed ? pose.z - 1.1 : pose.z;
    const targetRotY = isActive ? 0 : pose.rotY + sway;
    const targetRotZ = isActive ? 0 : pose.rotZ;
    const targetScale = isActive ? 1.45 : 1;

    const k = 5;
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, k, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, k, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, k, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, k, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, targetRotZ, k, delta);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, targetScale, k, delta));
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group
      ref={group}
      position={[pose.x, pose.y, pose.z]}
      rotation={[0, pose.rotY, pose.rotZ]}
      onClick={handleClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* Card body — real geometry with thickness, so the lit edge is what sells it as a
          solid object rather than a picture that happens to be rotated. Lambert rather than
          Standard: no roughness/metalness PBR pass, just diffuse response to the lights below
          — cheaper per fragment across 6 cards × 2 meshes, at the cost of the specular
          highlight (the surface reads matte instead of glossy). */}
      <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={0.055} smoothness={2}>
        <meshLambertMaterial color="#18181b" />
      </RoundedBox>

      {/* Preview image inlaid on the front face. `color` doubles as the dimmer: it
          multiplies the map, so one value darkens the receded cards without a second
          material or any transparency sorting. */}
      <mesh position={[0, 0, CARD_D / 2 + 0.001]}>
        <planeGeometry args={[CARD_W - 0.08, CARD_H - 0.08]} />
        <meshLambertMaterial
          map={isDimmed ? blurred : sharp}
          color={isDimmed ? '#6b6b72' : '#ffffff'}
        />
      </mesh>
    </group>
  );
};

interface SceneProps {
  active: number | null;
  setActive: (i: number | null) => void;
  scatter: Pose[];
}

const Scene: React.FC<SceneProps> = ({ active, setActive, scatter }) => (
  <>
    {/* Key + rim. The key light is what produces the moving light/shadow across each card
        as it drifts; the rim separates the dark card bodies from the dark page behind. The
        third light that used to fill from below is gone on purpose — one fewer light means
        one fewer lighting pass per fragment on every card, traded for a flatter underside. */}
    <ambientLight intensity={0.9} />
    <directionalLight position={[4, 5, 6]} intensity={2.4} />
    <directionalLight position={[-6, 2, 4]} intensity={0.9} color="#a1a1aa" />

    {CARDS.map((tpl, i) => (
      <Card
        key={tpl.id}
        url={tpl.previewImage}
        pose={scatter[i]}
        isActive={active === i}
        isDimmed={active !== null && active !== i}
        onSelect={() => setActive(active === i ? null : i)}
      />
    ))}

    {/* Drops render resolution automatically if the GPU starts missing frames, so a weak
        device degrades sharpness instead of stuttering. */}
    <AdaptiveDpr pixelated />
  </>
);

/**
 * Renders the scene at a fixed, modest frame rate instead of as fast as the device can manage.
 *
 * This is the difference between a decoration and a space heater. R3F's default is to redraw
 * every frame the display offers — 60 a second, 120 on a modern phone — and it will do that for
 * as long as the scene is on screen, because the cards are always drifting and a drifting card
 * always needs a new frame. Six textured, lit, damped meshes redrawn 120 times a second, with
 * no pause, is genuinely the workload of a small game, and a phone answers it the way it
 * answers a game: by running the GPU flat out and getting hot.
 *
 * Nothing about the scene needs that rate. The motion is a slow float — a sine wave over
 * several seconds — and at 30fps it is indistinguishable from 120, because there is nothing
 * fast enough happening for the extra frames to describe. Halving or quartering the frame rate
 * cuts GPU time by the same proportion, and the picture is unchanged.
 *
 * Implemented as `frameloop="demand"` plus this: the canvas draws only when asked, and this
 * asks on a timer. The rAF that drives it does nothing but compare two numbers on the frames it
 * skips, and browsers stop calling it entirely in a background tab, so a hidden page costs
 * nothing at all. Interaction still invalidates on its own, so a click responds immediately
 * rather than waiting for the next tick.
 */
const FrameLimiter: React.FC<{ fps: number }> = ({ fps }) => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < interval) return;
      last = t;
      invalidate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fps, invalidate]);
  return null;
};

export const TemplateCards3D: React.FC = () => {
  const [active, setActive] = useState<number | null>(null);

  // A phone renders this scene onto a far denser display than a laptop does, and pixel count is
  // the single biggest term in what a GPU is asked to do. Capped harder there, and the drop is
  // invisible on a screen held at arm's length — where it is very much not invisible is in how
  // warm the device gets. Read once at mount: this decides how many pixels the renderer is
  // built for, and re-creating the renderer mid-visit to chase a window resize would cost more
  // than it saves.
  const [dprCap] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 1.1 : 1.5,
  );

  // Redrawn per mount. The home page unmounts when the visitor navigates away, so leaving
  // and coming back genuinely lays the cards out afresh rather than restoring the same
  // picture. The templates shown stay the same six — only where they hang changes.
  const scatter = useMemo(() => buildScatter(), []);

  // A WebGL canvas does not stop when it scrolls out of view. R3F's default frameloop is
  // "always", so this scene was re-rendering six textured, damped cards every single frame
  // for as long as the home page stayed mounted — including the entire time the visitor was
  // reading the roadmap or the About section far below it, competing for the main thread and
  // the GPU with whatever they were actually looking at. That is the single largest thing
  // this page asks of a device, spent almost entirely on pixels nobody is looking at.
  //
  // Gated on visibility instead: "always" while the stage is near the viewport, "never" once
  // it isn't. The margin starts it a little before it scrolls in, so it is already running by
  // the time it is on screen rather than waking up visibly.
  const holder = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={holder} className="w-full h-full">
      <Canvas
        // "demand", never "always". See FrameLimiter above for what drives it and why: "always"
        // is what made this scene run the GPU flat out for as long as it was on screen.
        frameloop={onScreen ? 'demand' : 'never'}
        camera={{ position: [0, 0, 6], fov: 46 }}
        dpr={[1, dprCap]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        // Clicking empty space drops the current pick, so there is always a way back out
        // without having to find the same card again.
        onPointerMissed={() => setActive(null)}
        onContextMenu={(e) => e.preventDefault()}
        // Survive a lost GPU context instead of going permanently blank.
        //
        // A browser drops a WebGL context when the GPU is under pressure — a long main-thread
        // stall, another heavy tab, a driver reset. Three's default reaction is to log
        // "THREE.WebGLRenderer: Context Lost" and stop, and because the default `contextlost`
        // event is not cancelled the browser never offers the context back, so the hero stays
        // an empty rectangle until a full page reload. Calling preventDefault is what opts
        // into restoration; the restore handler then asks for a frame so the scene repaints
        // itself the moment the GPU is available again.
        //
        // The listeners live on the canvas element, which React destroys along with this
        // component, so they need no explicit teardown.
        onCreated={({ gl, invalidate }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
          gl.domElement.addEventListener('webglcontextrestored', () => invalidate());
        }}
        style={{ touchAction: 'pan-y' }}
      >
        <Suspense fallback={null}>
          {/* Only while the scene is actually on screen — off screen the canvas is on
              `frameloop="never"` and an invalidate would be a request nobody answers. */}
          {onScreen && <FrameLimiter fps={30} />}
          <Scene active={active} setActive={setActive} scatter={scatter} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TemplateCards3D;

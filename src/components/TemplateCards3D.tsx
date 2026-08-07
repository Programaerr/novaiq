import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { templatesData } from '../data/templatesData';

const CARD_COUNT = 6;

// Fisher-Yates on a copy. Copying matters: templatesData is a shared module-level import
// that the templates page renders from too, so shuffling it in place would silently
// reorder that page as a side effect of visiting the home page.
function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Scattered on purpose — no row, no grid. Each card gets its own spot, depth, angle and
// float phase so the group reads as loose pieces drifting in space rather than a lineup.
const POSES = [
  { x: -2.15, y: 1.05, z: -0.35, rotY: 0.36, rotZ: -0.09, phase: 0 },
  { x: -0.55, y: -0.35, z: 0.45, rotY: 0.2, rotZ: 0.06, phase: 1.7 },
  { x: 1.15, y: 1.25, z: -0.7, rotY: 0.42, rotZ: 0.04, phase: 3.1 },
  { x: 2.35, y: -0.25, z: -0.15, rotY: 0.28, rotZ: -0.11, phase: 4.6 },
  { x: -1.75, y: -1.55, z: 0.2, rotY: 0.33, rotZ: 0.08, phase: 2.4 },
  { x: 1.0, y: -1.85, z: -0.5, rotY: 0.24, rotZ: -0.05, phase: 5.5 },
];

const CARD_W = 1.15;
const CARD_H = 1.55;
const CARD_D = 0.07;
// Where a picked card lands: centred and pulled well clear of the others.
const FOCUS_Z = 2.3;

interface CardProps {
  url: string;
  pose: (typeof POSES)[number];
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
    sharp.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
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
          solid object rather than a picture that happens to be rotated. */}
      <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={0.055} smoothness={3}>
        <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.35} />
      </RoundedBox>

      {/* Preview image inlaid on the front face. `color` doubles as the dimmer: it
          multiplies the map, so one value darkens the receded cards without a second
          material or any transparency sorting. */}
      <mesh position={[0, 0, CARD_D / 2 + 0.001]}>
        <planeGeometry args={[CARD_W - 0.08, CARD_H - 0.08]} />
        <meshStandardMaterial
          map={isDimmed ? blurred : sharp}
          color={isDimmed ? '#6b6b72' : '#ffffff'}
          roughness={0.32}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
};

interface SceneProps {
  active: number | null;
  setActive: (i: number | null) => void;
  deck: { id: string; url: string; pose: (typeof POSES)[number] }[];
}

const Scene: React.FC<SceneProps> = ({ active, setActive, deck }) => (
  <>
    {/* Key + rim + fill. The key light is what produces the moving sheen across each card
        as it drifts; the rim separates the dark card bodies from the dark page behind. */}
    <ambientLight intensity={0.9} />
    <directionalLight position={[4, 5, 6]} intensity={2.4} />
    <directionalLight position={[-6, 2, 4]} intensity={0.9} color="#a1a1aa" />
    <pointLight position={[0, -3, 5]} intensity={20} distance={16} color="#ffffff" />

    {deck.map((card, i) => (
      <Card
        key={card.id}
        url={card.url}
        pose={card.pose}
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

export const TemplateCards3D: React.FC = () => {
  const [active, setActive] = useState<number | null>(null);

  // Reshuffled per mount — which six of the ten templates appear, and which scattered spot
  // each one takes. The home page unmounts when the visitor navigates away, so leaving and
  // coming back genuinely deals a new arrangement rather than the same picture every time.
  const deck = useMemo(() => {
    const picks = shuffled(templatesData).slice(0, CARD_COUNT);
    const spots = shuffled(POSES);
    return picks.map((tpl, i) => ({ id: tpl.id, url: tpl.previewImage, pose: spots[i] }));
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 46 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // Clicking empty space drops the current pick, so there is always a way back out
      // without having to find the same card again.
      onPointerMissed={() => setActive(null)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'pan-y' }}
    >
      <Suspense fallback={null}>
        <Scene active={active} setActive={setActive} deck={deck} />
      </Suspense>
    </Canvas>
  );
};

export default TemplateCards3D;

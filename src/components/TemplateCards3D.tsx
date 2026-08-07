import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox, useTexture } from '@react-three/drei';
import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { templatesData } from '../data/templatesData';

const CARDS = templatesData.slice(0, 3);

// Resting pose per card. Nothing is uniform on purpose — matching angles and a shared
// float phase would make three cards read as one rigid object rather than three separate
// things hanging in space.
const POSES = [
  { x: -1.75, y: 0.28, rotY: 0.34, rotZ: -0.07, phase: 0 },
  { x: 0.05, y: -0.22, rotY: 0.22, rotZ: 0.05, phase: 2.1 },
  { x: 1.85, y: 0.12, rotY: 0.4, rotZ: -0.03, phase: 4.2 },
];

const CARD_W = 1.5;
const CARD_H = 2.0;
const CARD_D = 0.09;
// Where a card lands when picked: pulled toward the camera and centered.
const FOCUS_POS = new THREE.Vector3(0, 0, 1.7);

interface CardProps {
  url: string;
  pose: (typeof POSES)[number];
  isActive: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}

const Card: React.FC<CardProps> = ({ url, pose, isActive, isDimmed, onSelect }) => {
  const group = useRef<THREE.Group>(null);
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;

  // Everything is eased frame-by-frame with MathUtils.damp rather than snapped, so picking
  // a card reads as it swinging forward through space instead of teleporting. damp is
  // framerate-independent, so the motion is identical at 60Hz and 144Hz.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 0.7 + pose.phase) * 0.09;
    const sway = Math.cos(t * 0.5 + pose.phase) * 0.04;

    const targetX = isActive ? FOCUS_POS.x : pose.x;
    const targetY = (isActive ? FOCUS_POS.y : pose.y) + bob;
    const targetZ = isActive ? FOCUS_POS.z : isDimmed ? -0.9 : 0;
    const targetRotY = isActive ? 0 : pose.rotY + sway;
    const targetRotZ = isActive ? 0 : pose.rotZ;
    const targetScale = isActive ? 1.18 : 1;

    const k = 5;
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, k, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, k, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, k, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, k, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, targetRotZ, k, delta);
    const s = THREE.MathUtils.damp(g.scale.x, targetScale, k, delta);
    g.scale.setScalar(s);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group
      ref={group}
      position={[pose.x, pose.y, 0]}
      rotation={[0, pose.rotY, pose.rotZ]}
      onClick={handleClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* Card body — real geometry with thickness, so the lit edge is what sells it as a
          solid object rather than a picture that happens to be rotated. */}
      <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={0.07} smoothness={4}>
        <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.35} />
      </RoundedBox>

      {/* Preview image inlaid on the front face. */}
      <mesh position={[0, 0, CARD_D / 2 + 0.001]}>
        <planeGeometry args={[CARD_W - 0.1, CARD_H - 0.1]} />
        <meshStandardMaterial map={texture} roughness={0.32} metalness={0.15} />
      </mesh>
    </group>
  );
};

const Scene: React.FC<{ active: number | null; setActive: (i: number | null) => void }> = ({
  active,
  setActive,
}) => (
  <>
    {/* Key + rim + fill. The key light is what produces the moving sheen across each card
        as it drifts; the rim separates the dark card bodies from the dark page behind. */}
    <ambientLight intensity={0.85} />
    <directionalLight position={[4, 5, 6]} intensity={2.4} />
    <directionalLight position={[-6, 2, 4]} intensity={0.9} color="#a1a1aa" />
    <pointLight position={[0, -3, 4]} intensity={18} distance={14} color="#ffffff" />

    {CARDS.map((tpl, i) => (
      <Card
        key={tpl.id}
        url={tpl.previewImage}
        pose={POSES[i]}
        isActive={active === i}
        isDimmed={active !== null && active !== i}
        onSelect={() => setActive(active === i ? null : i)}
      />
    ))}

    {/* Depth of field is mounted only while a card is picked. It is the one genuinely
        expensive thing here (an extra full-screen pass), and it has nothing to do while
        every card sits on the same plane — so the idle scene pays nothing for it. */}
    {active !== null && (
      <EffectComposer>
        <DepthOfField target={[0, 0, FOCUS_POS.z]} focalLength={0.06} bokehScale={7} />
      </EffectComposer>
    )}
  </>
);

export const TemplateCards3D: React.FC = () => {
  const [active, setActive] = useState<number | null>(null);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // Clicking empty space drops the current pick, so there is always a way back out
      // without having to find the same card again.
      onPointerMissed={() => setActive(null)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'pan-y' }}
    >
      <Suspense fallback={null}>
        <Scene active={active} setActive={setActive} />
      </Suspense>
    </Canvas>
  );
};

export default TemplateCards3D;

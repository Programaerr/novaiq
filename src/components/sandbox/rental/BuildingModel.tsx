import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TOWER_FLOORS } from '../../../data/rentalDemoData';

/**
 * The building, in three dimensions, as the way you pick a floor.
 *
 * ## Why this is 3D and not a photograph
 *
 * Every rental site on earth opens with a photograph of a building and a list underneath it. The
 * photograph is decoration: it tells you nothing you can act on, and the one question a renter
 * actually arrives with — *which floor is free, and how high up is it* — is answered nowhere on
 * the page. A model answers it structurally. Vacant floors are lit, taken floors are dark, the
 * twelfth really is at the top, and clicking one filters the list below to exactly its units.
 *
 * That is the whole justification for the canvas. If the building were spinning for atmosphere it
 * would not be worth the WebGL context; it is spinning because it is the filter control.
 *
 * ## What it costs
 *
 * Twelve slabs, one instanced mesh holding every window in the building, and a ground disc —
 * fifteen draw calls, no textures, no shadow map, no post-processing. The instance matrices are
 * written once at mount and never rewritten; per frame the CPU touches twelve y-positions and one
 * rotation. It parks itself at `frameloop='demand'` whenever the tab is backgrounded (`data-idle`
 * on `<html>`) or the visitor asked for reduced motion, at which point it draws only when
 * something is actually clicked.
 */

/** Slab size, in world units. Depth is deliberately less than width — a residential block is a
 *  slab, not a cube, and a cube reads as an office tower. */
const FLOOR_W = 2.3;
const FLOOR_D = 1.55;
const FLOOR_H = 0.3;
/** Gap between slabs. It is what makes the stack read as *floors* rather than as one extrusion. */
const FLOOR_GAP = 0.09;
const FLOOR_PITCH = FLOOR_H + FLOOR_GAP;

/** Windows per slab: five across the long face, three down the short one. Both visible faces get
 *  them, because the model is seen from a three-quarter angle and a blank return face is the tell
 *  that a "building" is really one decorated rectangle. */
const WIN_FRONT = 5;
const WIN_SIDE = 3;
const WIN_PER_FLOOR = (WIN_FRONT + WIN_SIDE) * 2;
const WIN_COUNT = WIN_PER_FLOOR * TOWER_FLOORS;

const WIN_W = 0.2;
const WIN_H = 0.13;
const WIN_T = 0.03;

/** How far a floor slides out of the stack when it is picked. Small on purpose: this is a drawer
 *  opening, and a floor that flies out of the building stops looking like part of it. */
const PICK_OFFSET = 0.34;

const SLAB_COLOR = new THREE.Color('#e8e6e1');
const SLAB_EDGE = new THREE.Color('#b9b6ae');
const WIN_DARK = new THREE.Color('#2b3240');
const GROUND = new THREE.Color('#0e1420');

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

interface SceneProps {
  accent: THREE.Color;
  selectedFloor: number | null;
  hoverFloor: number | null;
  vacancy: boolean[];
  reduced: boolean;
  onPick: (floor: number) => void;
  onHover: (floor: number | null) => void;
  /** Set while a finger/mouse is dragging the model round, which suspends the idle spin. */
  dragRef: React.MutableRefObject<{ active: boolean; last: number; spin: number; velocity: number }>;
}

/**
 * Frames the building for whatever box the canvas ended up in.
 *
 * The stack's height is fixed by the floor count, so the only variable is how much width the host
 * gave us. A phone-shaped canvas needs the camera further back or the top two floors leave the
 * frame — and cropping the *top* of a building is the one crop that makes it unreadable, because
 * the top floor is the one the renter is looking for.
 */
const Rig: React.FC = () => {
  const { camera, size } = useThree();
  const stackH = TOWER_FLOORS * FLOOR_PITCH;

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    // Below 1:1 the limiting dimension is width, so back off in proportion to how narrow it is.
    const pull = aspect < 1 ? 1 + (1 - aspect) * 0.85 : 1;
    const dist = 8.4 * pull;
    const yaw = Math.PI * 0.24;
    cam.position.set(Math.sin(yaw) * dist, stackH * 0.62, Math.cos(yaw) * dist);
    cam.lookAt(0, stackH * 0.46, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, stackH]);

  return null;
};

const Building: React.FC<SceneProps> = ({
  accent,
  selectedFloor,
  hoverFloor,
  vacancy,
  reduced,
  onPick,
  onHover,
  dragRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const slabRefs = useRef<Array<THREE.Mesh | null>>([]);
  const windowsRef = useRef<THREE.InstancedMesh>(null);

  // Each floor's current slide-out, eased toward its target. Kept in a ref because it is
  // per-frame motion and nothing outside the canvas needs to read it.
  const offsets = useRef<number[]>(new Array(TOWER_FLOORS).fill(0));

  /** Instance matrices. Written once — a window never moves relative to its own slab, and the
   *  slab moves as a whole, so re-writing 168 matrices every frame would buy nothing. Instead
   *  each floor's windows are children of that floor's own group. */
  const winGeom = useMemo(() => new THREE.BoxGeometry(WIN_W, WIN_H, WIN_T), []);
  const slabGeom = useMemo(() => new THREE.BoxGeometry(FLOOR_W, FLOOR_H, FLOOR_D), []);

  useEffect(() => () => {
    winGeom.dispose();
    slabGeom.dispose();
  }, [winGeom, slabGeom]);

  // Lay every window in the building out once, in the *group's* space, and remember which floor
  // each instance belongs to so the colour pass and the slide-out can find them again.
  const winFloorOf = useMemo(() => {
    const arr = new Int16Array(WIN_COUNT);
    let i = 0;
    for (let f = 0; f < TOWER_FLOORS; f++) {
      for (let k = 0; k < WIN_PER_FLOOR; k++) arr[i++] = f;
    }
    return arr;
  }, []);

  const winLocal = useMemo(() => {
    // [x, y, z, rotY] per instance, relative to its own floor's centre.
    const out: Array<[number, number, number, number]> = [];
    const spanF = FLOOR_W * 0.74;
    const spanS = FLOOR_D * 0.62;
    for (let f = 0; f < TOWER_FLOORS; f++) {
      for (let s = 0; s < WIN_FRONT; s++) {
        const x = (s / (WIN_FRONT - 1) - 0.5) * spanF;
        out.push([x, 0, FLOOR_D / 2 + WIN_T / 2, 0]);
        out.push([x, 0, -FLOOR_D / 2 - WIN_T / 2, 0]);
      }
      for (let s = 0; s < WIN_SIDE; s++) {
        const z = (s / (WIN_SIDE - 1) - 0.5) * spanS;
        out.push([FLOOR_W / 2 + WIN_T / 2, 0, z, Math.PI / 2]);
        out.push([-FLOOR_W / 2 - WIN_T / 2, 0, z, Math.PI / 2]);
      }
    }
    return out;
  }, []);

  const floorY = (f: number) => f * FLOOR_PITCH + FLOOR_H / 2;

  // Position every instance once at mount. From here on only the per-floor x-offset changes, and
  // that is applied by rewriting just the instances of the floors that moved.
  useEffect(() => {
    const mesh = windowsRef.current;
    if (!mesh) return;
    for (let i = 0; i < WIN_COUNT; i++) {
      const f = winFloorOf[i];
      const [x, y, z, rotY] = winLocal[i];
      tmpObj.position.set(x, floorY(f) + y, z);
      tmpObj.rotation.set(0, rotY, 0);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [winFloorOf, winLocal]);

  // Colour is the actual information channel: a lit window means a unit you can rent tonight.
  // Recomputed only when the answer changes, never per frame.
  useEffect(() => {
    const mesh = windowsRef.current;
    if (!mesh) return;
    for (let i = 0; i < WIN_COUNT; i++) {
      const f = winFloorOf[i];
      const free = vacancy[f];
      const picked = selectedFloor === f + 1;
      if (!free) {
        tmpColor.copy(WIN_DARK);
      } else if (picked) {
        // Picked floors read as *brighter*, not as a different hue — a hue change would say
        // "this floor is a different kind of thing", when all it is is the one you chose.
        tmpColor.copy(accent).lerp(new THREE.Color('#ffffff'), 0.55);
      } else {
        tmpColor.copy(accent);
        // A little scatter so the facade looks inhabited instead of switched on by one relay.
        const jitter = ((i * 2654435761) % 100) / 100;
        tmpColor.multiplyScalar(0.72 + jitter * 0.36);
      }
      mesh.setColorAt(i, tmpColor);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [accent, vacancy, selectedFloor, winFloorOf]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const drag = dragRef.current;

    // Idle spin, unless a finger is on it or the visitor asked for less motion. The velocity
    // carried out of a drag bleeds off rather than stopping dead, which is the difference
    // between turning a model and scrubbing a slider.
    if (drag.active) {
      // Driven entirely by pointer deltas while held.
    } else if (Math.abs(drag.velocity) > 0.0005) {
      drag.spin += drag.velocity * delta;
      drag.velocity *= Math.pow(0.02, delta);
    } else if (!reduced) {
      drag.spin += delta * 0.14;
    }
    g.rotation.y = drag.spin;

    // Slide the picked floor out, ease the rest home.
    const k = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    for (let f = 0; f < TOWER_FLOORS; f++) {
      const wanted =
        selectedFloor === f + 1 ? PICK_OFFSET : hoverFloor === f + 1 && vacancy[f] ? PICK_OFFSET * 0.42 : 0;
      const next = offsets.current[f] + (wanted - offsets.current[f]) * k;
      if (Math.abs(next - offsets.current[f]) < 0.0002 && Math.abs(next - wanted) < 0.0002) continue;
      offsets.current[f] = next;

      const slab = slabRefs.current[f];
      if (slab) slab.position.x = next;

      const mesh = windowsRef.current;
      if (mesh) {
        const base = f * WIN_PER_FLOOR;
        for (let j = 0; j < WIN_PER_FLOOR; j++) {
          const i = base + j;
          const [x, y, z, rotY] = winLocal[i];
          tmpObj.position.set(x + next, floorY(f) + y, z);
          tmpObj.rotation.set(0, rotY, 0);
          tmpObj.updateMatrix();
          mesh.setMatrixAt(i, tmpObj.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  const stackH = TOWER_FLOORS * FLOOR_PITCH;

  return (
    <group ref={groupRef}>
      {/* The ground the building stands on. Flat, dark, and slightly wider than the footprint —
          without it the stack floats and the bottom floor reads as another gap. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshBasicMaterial color={GROUND} transparent opacity={0.85} />
      </mesh>

      {/* The core the slabs are threaded onto — a lift shaft, visually, and the thing that keeps
          the stack reading as one building while individual floors slide out of it. */}
      <mesh position={[0, stackH / 2, 0]}>
        <boxGeometry args={[FLOOR_W * 0.26, stackH + FLOOR_H, FLOOR_D * 0.42]} />
        <meshStandardMaterial color={SLAB_EDGE} roughness={0.85} metalness={0.05} />
      </mesh>

      {Array.from({ length: TOWER_FLOORS }, (_, f) => {
        const free = vacancy[f];
        const picked = selectedFloor === f + 1;
        return (
          <mesh
            key={f}
            ref={(el) => {
              slabRefs.current[f] = el;
            }}
            geometry={slabGeom}
            position={[0, floorY(f), 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(f + 1);
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onPick(f + 1);
            }}
          >
            <meshStandardMaterial
              color={picked ? accent : free ? SLAB_COLOR : SLAB_EDGE}
              roughness={0.72}
              metalness={0.04}
            />
          </mesh>
        );
      })}

      <instancedMesh ref={windowsRef} args={[winGeom, undefined, WIN_COUNT]} frustumCulled={false}>
        {/* Basic, not standard: these are lights, and a lit window that dims when it turns away
            from the sun is a mirror, not a window. */}
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Roof cap — a plain lid, so the top floor terminates instead of being cut off. */}
      <mesh position={[0, stackH + FLOOR_H * 0.35, 0]}>
        <boxGeometry args={[FLOOR_W * 0.92, FLOOR_H * 0.5, FLOOR_D * 0.92]} />
        <meshStandardMaterial color={SLAB_EDGE} roughness={0.9} />
      </mesh>
    </group>
  );
};

export interface BuildingModelProps {
  /** Hex from the customer's chosen palette — the lit windows are painted in it. */
  accent: string;
  selectedFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
  /** `vacancy[i]` is floor `i + 1`. Passed in rather than imported so the model shows the state
   *  of the list the visitor is actually looking at, filters included. */
  vacancy: boolean[];
  className?: string;
}

export const BuildingModel: React.FC<BuildingModelProps> = ({
  accent,
  selectedFloor,
  onSelectFloor,
  vacancy,
  className,
}) => {
  const [hoverFloor, setHoverFloor] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [idle, setIdle] = useState(false);
  const dragRef = useRef({ active: false, last: 0, spin: 0, velocity: 0 });
  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  // `data-idle` is set on <html> when the tab is backgrounded. A spinning building nobody is
  // looking at is the clearest possible waste of a GPU.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current.active = true;
    dragRef.current.last = e.clientX;
    dragRef.current.velocity = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.last;
    d.last = e.clientX;
    // RTL or LTR, dragging right should turn the near face right. Screen pixels to radians at a
    // rate that puts a full turn at roughly the width of a phone.
    d.spin += dx * 0.012;
    d.velocity = dx * 0.35;
  };
  const endDrag = (e: React.PointerEvent) => {
    dragRef.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const label = hoverFloor ?? selectedFloor;

  return (
    <div
      className={`relative ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // Vertical gestures still scroll the page; only horizontal ones turn the building.
      style={{ touchAction: 'pan-y' }}
    >
      <Canvas
        frameloop={reduced || idle ? 'demand' : 'always'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ fov: 38, near: 0.1, far: 100 }}
      >
        <Rig />
        <ambientLight intensity={1.05} />
        <directionalLight position={[4, 7, 5]} intensity={1.15} />
        <directionalLight position={[-5, 3, -4]} intensity={0.35} />
        <Building
          accent={accentColor}
          selectedFloor={selectedFloor}
          hoverFloor={hoverFloor}
          vacancy={vacancy}
          reduced={reduced}
          onPick={(f) => onSelectFloor(selectedFloor === f ? null : f)}
          onHover={setHoverFloor}
          dragRef={dragRef}
        />
      </Canvas>

      {/* The floor's name, in the DOM rather than in the scene. Text drawn into a WebGL canvas is
          text a screen reader cannot reach and a browser cannot scale with the page. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="rounded-lg bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white/85 backdrop-blur-sm">
          اسحب لتدوير البناية · اضغط الطابق
        </span>
        {label !== null && (
          <span
            className="rounded-lg px-2.5 py-1 text-[10px] font-black text-black"
            style={{ background: accent }}
          >
            الطابق {label}
            {vacancy[label - 1] ? '' : ' — مؤجّر بالكامل'}
          </span>
        )}
      </div>
    </div>
  );
};

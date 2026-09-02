import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The active nav pill, crossing to its new item as a swarm of cubes.
 *
 * ## Why this exists at all
 *
 * The three nav items are three separate elements, so `transition-all` on the pill could never
 * animate anything: the white fill simply vanished from one `<a>` and appeared on another in the
 * same frame. There was no shared object to move, which is the thing a tab indicator is FOR —
 * it is the only part of a navbar that tells you the two states are the same control in two
 * places rather than two unrelated highlights.
 *
 * ## Why it is cubes
 *
 * Because the site is made of them. TileField's swell, CardField's drift and ButtonTiles' press
 * are the same grid at three scales, and an indicator that travels as cubes reads as the page
 * carrying the highlight across rather than as a widget sliding over it.
 *
 * ## Why the canvas is mounted only while it flies
 *
 * ButtonTiles states the rule this file has to obey, and states it as a hard limit rather than a
 * preference: "A WebGL context is a scarce, browser-wide resource — around sixteen of them, after
 * which the oldest is killed out from under whoever owned it." Its own answer is that a pointer
 * can only be in one place, so at most a couple of button fields exist at once.
 *
 * A navbar is worse than a button for this, because the navbar is on EVERY page and never
 * unmounts. A canvas living here permanently would be a context held for the entire session to
 * pay for four hundred milliseconds of motion, and it would be the context that pushes the
 * templates page over the edge and takes the hero's field down.
 *
 * So the flight is an event, not a layer: Navbar mounts this when the page changes, it runs once,
 * calls `onDone`, and unmounts. At rest the navbar holds no context at all and the pill is the
 * plain DOM element it always was.
 *
 * ## Why the tilt is per-cube and not on a group
 *
 * TileField and ButtonTiles tilt the whole field, because there the grid IS the picture and where
 * any individual cube lands does not matter. Here it does: these cubes have to start exactly on
 * one pill and finish exactly on another, and tilting the group rotates the plane they travel in,
 * which slides every position off its target by a few pixels. The same 3/4 view is applied to
 * each cube's own rotation instead — every cube is seen from the site's angle, and every cube is
 * still exactly where it was put.
 */

/* ── Matched to TileField and ButtonTiles, so these are the same objects as the rest of the site
      seen from the same angle. Changing them here alone would make the navbar's cubes a
      different material from every other cube on the page. ─────────────────────────────────── */
const TILT_X = 0.42;
const TILT_Y = -0.3;
/** Pixels per world unit, matching both fields, so a size written in px means the same thing. */
const ZOOM = 100;

/** The cube grid, in CSS pixels. ~8px is ButtonTiles' pitch at a button's height, and a nav pill
    is a button's height, so the grain matches what a press already shows. */
const CELL = 8;

/**
 * How long the whole crossing takes, and how much of that is spent staggering.
 *
 * 0.42s is over the 150–300ms a simple state change should take, and deliberately: this is not a
 * state change, it is one object travelling a distance the eye has to be able to follow. The
 * STAGGER is what buys that — the leading column arrives at 0.27s, well inside the range, and the
 * tail is what makes the shape read as a swarm rather than a sliding rectangle.
 */
const DURATION = 0.42;
const STAGGER = 0.35;

/** How far a cube rises out of the bar mid-flight, in px. Enough to read as passing OVER the
    labels between the two pills rather than through them. */
const LIFT = 26;

export interface FlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface NavCubeFlightProps {
  from: FlightRect;
  to: FlightRect;
  /** Called once the last cube has landed, so the caller can unmount the canvas and restore the
      real pill. */
  onDone: () => void;
}

/** CSS pixels (from the strip's top-left) to world units (centred, y up). */
function toWorld(px: number, py: number, w: number, h: number): [number, number] {
  return [(px - w / 2) / ZOOM, (h / 2 - py) / ZOOM];
}

/** The site's own ease — the same cubic-bezier(0.16, 1, 0.3, 1) feel `.nq-rise` uses, as a
    closed form so it can be evaluated per cube per frame without a curve object. */
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

const Swarm: React.FC<NavCubeFlightProps & { width: number; height: number }> = ({
  from,
  to,
  onDone,
  width,
  height,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);
  const done = useRef(false);

  /* One cube per cell of the SOURCE pill. The destination pill is a different width, so the same
     cube count is spread over a different area — which is what makes the swarm compress or fan
     out as it lands, instead of translating rigidly. */
  const cubes = useMemo(() => {
    const cols = Math.max(2, Math.round(from.w / CELL));
    const rows = Math.max(2, Math.round(from.h / CELL));
    const out: { sx: number; sy: number; ex: number; ey: number; s0: number; s1: number; u: number }[] = [];
    /* The stagger runs along the direction of travel, so the column nearest the destination
       leaves first and the crossing reads as a wave with a direction rather than a block that
       dissolves. RTL and LTR both work without a branch: the sign falls out of the two rects. */
    const rightward = to.x >= from.x;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fx = (c + 0.5) / cols;
        const fy = (r + 0.5) / rows;
        out.push({
          sx: from.x + fx * from.w,
          sy: from.y + fy * from.h,
          ex: to.x + fx * to.w,
          ey: to.y + fy * to.h,
          s0: Math.min(from.w / cols, from.h / rows),
          s1: Math.min(to.w / cols, to.h / rows),
          u: rightward ? fx : 1 - fx,
        });
      }
    }
    return out;
  }, [from, to]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || done.current) return;
    clock.current += Math.min(delta, 0.05);
    const t = Math.min(1, clock.current / DURATION);

    for (let i = 0; i < cubes.length; i++) {
      const q = cubes[i];
      /* Each cube runs the full 0→1 inside its own slice of the timeline. Clamped at both ends so
         a cube that has not left yet sits exactly on the source pill and one that has arrived
         sits exactly on the destination — no cube is ever mid-air when the flight ends. */
      const local = Math.min(1, Math.max(0, (t - q.u * STAGGER) / (1 - STAGGER)));
      const e = ease(local);

      const px = q.sx + (q.ex - q.sx) * e;
      const py = q.sy + (q.ey - q.sy) * e;
      const [wx, wy] = toWorld(px, py, width, height);
      /* A half-sine, so the lift is zero at both ends and the cube is only off the bar while it
         is actually travelling. */
      const lift = Math.sin(Math.PI * e) * (LIFT / ZOOM);

      dummy.position.set(wx, wy + lift * 0.35, lift);
      /* A quarter turn across the crossing, on top of the site's fixed 3/4 view. Without it the
         swarm is squares sliding; with it they are cubes tumbling, which is the difference the
         whole effect is for. */
      dummy.rotation.set(TILT_X + e * Math.PI * 0.5, TILT_Y + e * Math.PI * 0.5, 0);
      const s = (q.s0 + (q.s1 - q.s0) * e) / ZOOM;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (t >= 1) {
      done.current = true;
      onDone();
    }
  });

  return (
    <>
      {/* Lambert rather than the shader ButtonTiles uses: that shader's whole job is deriving a
          cube's colour from its height in a swell, and there is no swell here — every cube is the
          same white the pill is. Lights give the three-face read on their own.

          Since three r155 lights are physical and a Lambert surface divides irradiance by PI, so
          these numbers are the ones that "look right" times pi. Tuned so a face square to the
          light clips to the pill's own #FFFFFF and the two visible sides fall to about 0.8 of it
          — the cube has to LAND as the same white it started as, or the swap back to the DOM pill
          shows as a flash. */}
      <ambientLight intensity={2.1} />
      <directionalLight position={[-0.42, 0.5, 0.76]} intensity={2.4} />
      <instancedMesh ref={meshRef} args={[undefined, undefined, cubes.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#FFFFFF" />
      </instancedMesh>
    </>
  );
};

/**
 * The canvas, sized to the nav strip it covers.
 *
 * `pointer-events-none` throughout: the links underneath stay clickable during the crossing, so a
 * fast second click is never eaten by the animation of the first.
 */
export const NavCubeFlight: React.FC<NavCubeFlightProps & { width: number; height: number }> = (props) => (
  <span aria-hidden="true" className="absolute inset-0 block pointer-events-none z-20">
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ zoom: ZOOM, position: [0, 0, 60], near: 0.1, far: 200 }}
      // Alpha, so the bar and the labels show between and behind the cubes.
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <Swarm {...props} />
    </Canvas>
  </span>
);

export default NavCubeFlight;

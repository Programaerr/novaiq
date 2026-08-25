import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
 * ## Why it is built the way it is
 *
 * The first version was twelve slabs floating one above another with a visible gap between each,
 * and windows glued to the outside as flat glowing rectangles. It read as a stack of circuit
 * boards, not a building — and the reason is worth writing down, because it is not "not enough
 * detail". Three things make a mass read as architecture:
 *
 * 1. **It is one object.** Floors are lines in a facade, not layers in a stack. A gap between
 *    storeys says the parts are separate; a recessed shadow line says they are one wall. Every
 *    storey here is flush against the one below and the seam is a real reveal cut by the
 *    spandrel sitting proud of the glazing.
 * 2. **Vertical rhythm, not just horizontal.** The old model had twelve horizontal bands and
 *    nothing crossing them, which is what made it read as a stack. Corner piers run the full
 *    storey height and mullions divide every window, so the eye gets a grid instead of stripes.
 * 3. **It meets the ground and it stops at the top.** A real building has a taller ground floor
 *    with a way in, and a roof with the machinery a building needs: a lift overrun, tanks, a
 *    parapet. The old one was the same slab twelve times, top and bottom identical, which is
 *    the tell of an extrusion rather than a building.
 *
 * Balconies do the rest, and they do it through the shadow map rather than through their own
 * shape: a slab projecting 0.24 casts a hard line across the spandrel under it, and self-shadowing
 * is the difference between a lit box and a thing standing in a place.
 *
 * ## What it costs
 *
 * Two instanced meshes carry all twelve storeys — one for the concrete (spandrel, head band, four
 * piers, mullions, two balconies with their balustrades, merged into a single geometry) and one
 * for the glazing. The podium, the roof and the ground are single static meshes. Eight draw calls
 * for the whole building, where the version this replaces used fifteen for far less.
 *
 * Instance matrices are written once at mount. A pick rewrites two matrices, not twenty-eight.
 * The environment is built from Lightformers rather than an HDR file, so the glass has something
 * to reflect without a network request. It parks itself at `frameloop='demand'` whenever the tab
 * is backgrounded (`data-idle` on `<html>`) or the visitor asked for reduced motion.
 */

/* ── Dimensions, in world units ────────────────────────────────────────────────────────────
   Depth is deliberately less than width: a residential block is a slab, and a cube reads as an
   office tower. Everything else is derived from a storey height of 0.44 so the proportions hold
   if the floor count ever changes. */
const FLOOR_W = 3.0;
const FLOOR_D = 2.05;
const FLOOR_H = 0.44;

/** No gap. The storeys are flush and the floor line is a REVEAL — the glazing sits back from the
 *  pier face, so the shadow does the work a gap used to do badly. */
const PIER = 0.17;
const SPANDREL_H = 0.15;
const HEAD_H = 0.07;
const GLASS_H = FLOOR_H - SPANDREL_H - HEAD_H;
const GLASS_CY = -FLOOR_H / 2 + SPANDREL_H + GLASS_H / 2;
/** How far the glazing sits behind the pier face. This single number is what makes a window read
 *  as an opening rather than as a sticker: it is the depth the shadow falls into. */
const RECESS = 0.08;

const BALCONY_W = FLOOR_W * 0.56;
const BALCONY_OUT = 0.24;
const BALCONY_T = 0.045;
const RAIL_H = 0.15;
const RAIL_T = 0.026;

const MULLIONS_FRONT = 7;
const MULLIONS_SIDE = 4;
const MULLION_T = 0.045;

/** The ground floor. Taller than the ones above it, because it is a lobby and not a flat, and
 *  because a building whose bottom storey matches its twelfth has no base. */
const PLINTH_H = 0.09;
const PODIUM_H = 0.68;

const PARAPET_H = 0.17;
const PARAPET_T = 0.1;

/** The way in. `DOOR_WALL_T` is the thickness of the podium's outer wall, and it is also the
 *  depth the glazing sits behind it — the reveal that turns a rectangle into an opening. */
const DOOR_W = FLOOR_W * 0.44;
const DOOR_H = PODIUM_H * 0.7;
const DOOR_WALL_T = 0.1;

const STACK_BASE = PLINTH_H + PODIUM_H;
const STACK_H = TOWER_FLOORS * FLOOR_H;
const ROOF_Y = STACK_BASE + STACK_H;
const TOTAL_H = ROOF_Y + PARAPET_H + 0.34;

/** How far a storey slides out when it is picked. Smaller than it was, and it has to be: the
 *  whole point of the rebuild is that the tower is one mass, and a floor that flies out of it
 *  goes straight back to reading as a tray. This is a drawer opening a little way. */
const PICK_OFFSET = 0.3;

/* A building at night. A pale mass under flat ambient light has no silhouette against a dark
   page, so the eye is left with nothing but the horizontal seams — which is the failure the
   first version shipped. Dark warm concrete, lit windows, and a key light low enough to throw
   the balconies across the wall. */
const CONCRETE = '#6b7385';
const CONCRETE_DARK = '#414857';
const GROUND = '#080c14';
const WIN_DARK = new THREE.Color('#171d29');

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
const WHITE = new THREE.Color('#ffffff');

/** A box, already moved into place — the unit every merged piece below is made of. */
function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/**
 * One storey of concrete, as a single geometry.
 *
 * Origin at the storey's own centre, so an instance matrix is just `y = floorY(f)`. Merging
 * rather than nesting is what keeps the whole facade at one draw call: twelve storeys of
 * spandrel, head band, four piers, sixteen mullions and two balconies is 264 boxes, and as
 * separate meshes it would be 264 draw calls.
 */
function makeStoreyGeometry() {
  const parts: THREE.BufferGeometry[] = [];

  // The solid band under the windows, and the thinner one above. Together they are the wall;
  // the strip between them is the opening.
  parts.push(box(FLOOR_W, SPANDREL_H, FLOOR_D, 0, -FLOOR_H / 2 + SPANDREL_H / 2, 0));
  parts.push(box(FLOOR_W, HEAD_H, FLOOR_D, 0, FLOOR_H / 2 - HEAD_H / 2, 0));

  // Corner piers, full storey height. These are the vertical rhythm, and they are also what
  // stops the ribbon window running off the corner — which is the detail that reads as "cheap
  // render" more than any other.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(
        box(PIER, FLOOR_H, PIER, sx * (FLOOR_W / 2 - PIER / 2), 0, sz * (FLOOR_D / 2 - PIER / 2)),
      );
    }
  }

  // Mullions: the bars that divide each window. They sit slightly proud of the glazing so they
  // catch the key light and cast their own thin shadows into the reveal.
  const frontSpan = FLOOR_W - PIER * 2;
  for (let i = 1; i <= MULLIONS_FRONT; i++) {
    const x = (i / (MULLIONS_FRONT + 1) - 0.5) * frontSpan;
    for (const sz of [-1, 1]) {
      parts.push(box(MULLION_T, GLASS_H, MULLION_T, x, GLASS_CY, sz * (FLOOR_D / 2 - RECESS + 0.02)));
    }
  }
  const sideSpan = FLOOR_D - PIER * 2;
  for (let i = 1; i <= MULLIONS_SIDE; i++) {
    const z = (i / (MULLIONS_SIDE + 1) - 0.5) * sideSpan;
    for (const sx of [-1, 1]) {
      parts.push(box(MULLION_T, GLASS_H, MULLION_T, sx * (FLOOR_W / 2 - RECESS + 0.02), GLASS_CY, z));
    }
  }

  // Balconies, on both long faces. The model is seen from every angle as it turns, and a
  // building with a decorated front and a blank back is a stage flat.
  for (const sz of [-1, 1]) {
    const zEdge = sz * (FLOOR_D / 2 + BALCONY_OUT / 2);
    const slabY = -FLOOR_H / 2 + BALCONY_T / 2;
    parts.push(box(BALCONY_W, BALCONY_T, BALCONY_OUT, 0, slabY, zEdge));
    // Balustrade: the outer panel plus two returns, so it reads as an enclosure rather than a
    // fin. Solid rather than railed — at this size individual balusters turn into moire.
    const railY = -FLOOR_H / 2 + BALCONY_T + RAIL_H / 2;
    parts.push(
      box(BALCONY_W, RAIL_H, RAIL_T, 0, railY, sz * (FLOOR_D / 2 + BALCONY_OUT - RAIL_T / 2)),
    );
    for (const sx of [-1, 1]) {
      parts.push(
        box(RAIL_T, RAIL_H, BALCONY_OUT, sx * (BALCONY_W / 2 - RAIL_T / 2), railY, zEdge),
      );
    }
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * The glazing for one storey: individual panes between the mullions, on all four faces.
 *
 * Panes, not one ribbon per face, and each pane carries its own brightness baked in as a VERTEX
 * colour. That matters because there is only one instance per storey now, so `instanceColor` can
 * say "this floor is vacant" but cannot say anything about a single window — and a floor whose
 * twelve windows are all the identical green is a floor lit by one relay, not by twelve
 * households. three multiplies the two together (`vColor *= instanceColor` then
 * `vColor *= color`), so the per-storey state and the per-window scatter compose for free.
 */
function makeGlassGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const t = 0.03;
  let seed = 0;

  /** A pane, tinted. The jitter is deterministic so a rebuild does not reshuffle the facade. */
  const pane = (w: number, h: number, dd: number, x: number, y: number, z: number) => {
    const g = box(w, h, dd, x, y, z);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const r = (seed % 1000) / 1000;
    // About one pane in five is dark. A floor whose every window is lit is a floor with the
    // hall lights on, not a floor people live on — and the unlit ones are what make the lit
    // ones read as rooms rather than as a strip light behind a grille.
    const v = r < 0.19 ? 0.06 : 0.6 + r * 0.55;
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = v;
      col[i * 3 + 1] = v;
      col[i * 3 + 2] = v;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  };

  // Front and back: the piers bound the opening, the mullions divide it.
  const frontSpan = FLOOR_W - PIER * 2;
  const frontPaneW = frontSpan / (MULLIONS_FRONT + 1) - MULLION_T;
  for (let i = 0; i <= MULLIONS_FRONT; i++) {
    const x = ((i + 0.5) / (MULLIONS_FRONT + 1) - 0.5) * frontSpan;
    for (const sz of [-1, 1]) pane(frontPaneW, GLASS_H, t, x, GLASS_CY, sz * (FLOOR_D / 2 - RECESS));
  }

  const sideSpan = FLOOR_D - PIER * 2;
  const sidePaneW = sideSpan / (MULLIONS_SIDE + 1) - MULLION_T;
  for (let i = 0; i <= MULLIONS_SIDE; i++) {
    const z = ((i + 0.5) / (MULLIONS_SIDE + 1) - 0.5) * sideSpan;
    for (const sx of [-1, 1]) pane(t, GLASS_H, sidePaneW, sx * (FLOOR_W / 2 - RECESS), GLASS_CY, z);
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Plinth, ground-floor mass, entrance surround and canopy, merged.
 *
 * The entrance is a HOLE, not a panel stuck on the wall. The first pass put a beige rectangle at
 * `z = D/2 + 0.012` — twelve thousandths PROUD of the facade — and it read exactly like what it
 * was: a sticker. Boolean subtraction is not worth a CSG library for one opening, so the wall is
 * built as four pieces around the void instead: a jamb either side, a lintel over the top and the
 * band under the sill. The glass then sits BEHIND that plane, and the depth between the two is
 * what makes it a doorway.
 */
function makePodiumGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const top = PLINTH_H + PODIUM_H;

  parts.push(box(FLOOR_W + 0.2, PLINTH_H, FLOOR_D + 0.2, 0, PLINTH_H / 2, 0));

  // Three of the four walls are solid.
  parts.push(box(FLOOR_W, PODIUM_H, DOOR_WALL_T, 0, PLINTH_H + PODIUM_H / 2, -(FLOOR_D - DOOR_WALL_T) / 2));
  for (const sx of [-1, 1]) {
    parts.push(
      box(DOOR_WALL_T, PODIUM_H, FLOOR_D, sx * (FLOOR_W - DOOR_WALL_T) / 2, PLINTH_H + PODIUM_H / 2, 0),
    );
  }
  // The core behind the lobby, so the mass is not hollow when the model turns past the opening.
  parts.push(
    box(FLOOR_W - DOOR_WALL_T * 2, PODIUM_H, FLOOR_D * 0.45, 0, PLINTH_H + PODIUM_H / 2, -FLOOR_D * 0.22),
  );

  // The entrance wall, built AROUND the opening: two jambs, a lintel, and the sill band.
  const jambW = (FLOOR_W - DOOR_W) / 2;
  for (const sx of [-1, 1]) {
    parts.push(
      box(jambW, PODIUM_H, DOOR_WALL_T, sx * (FLOOR_W - jambW) / 2, PLINTH_H + PODIUM_H / 2, (FLOOR_D - DOOR_WALL_T) / 2),
    );
  }
  parts.push(
    box(DOOR_W, PODIUM_H - DOOR_H, DOOR_WALL_T, 0, PLINTH_H + DOOR_H + (PODIUM_H - DOOR_H) / 2, (FLOOR_D - DOOR_WALL_T) / 2),
  );

  // A step up to the door, and the canopy over it. A building you cannot find the door of is a
  // render of a building.
  parts.push(box(DOOR_W + 0.3, PLINTH_H * 0.6, 0.26, 0, PLINTH_H * 0.3, FLOOR_D / 2 + 0.13));
  parts.push(box(FLOOR_W * 0.52, 0.055, 0.4, 0, top - 0.09, FLOOR_D / 2 + 0.2));
  // Two slim props under the canopy's outer edge.
  for (const sx of [-1, 1]) {
    parts.push(
      box(0.045, PODIUM_H - 0.14, 0.045, sx * FLOOR_W * 0.24, PLINTH_H + (PODIUM_H - 0.14) / 2, FLOOR_D / 2 + 0.36),
    );
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/** The door leaves and their frame, sitting in the opening the podium leaves for them. */
function makeDoorGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const z = FLOOR_D / 2 - DOOR_WALL_T * 0.55;
  const leafW = DOOR_W * 0.3;
  const doorH = DOOR_H * 0.82;
  for (const sx of [-1, 1]) {
    parts.push(box(leafW, doorH, 0.03, sx * leafW * 0.55, PLINTH_H + doorH / 2, z));
  }
  // Mullion between the leaves, and a transom over them.
  parts.push(box(0.03, doorH, 0.035, 0, PLINTH_H + doorH / 2, z));
  parts.push(box(DOOR_W - 0.04, 0.035, 0.035, 0, PLINTH_H + doorH, z));
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Parapet, lift overrun and water tanks, merged. The roof is what stops a tower looking like a
 *  length of extrusion someone cut. */
function makeRoofGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const y = ROOF_Y + PARAPET_H / 2;
  for (const sz of [-1, 1]) {
    parts.push(box(FLOOR_W, PARAPET_H, PARAPET_T, 0, y, sz * (FLOOR_D / 2 - PARAPET_T / 2)));
  }
  for (const sx of [-1, 1]) {
    parts.push(
      box(PARAPET_T, PARAPET_H, FLOOR_D - PARAPET_T * 2, sx * (FLOOR_W / 2 - PARAPET_T / 2), y, 0),
    );
  }
  // The roof deck itself, just inside the parapet.
  parts.push(box(FLOOR_W - PARAPET_T, 0.04, FLOOR_D - PARAPET_T, 0, ROOF_Y + 0.02, 0));
  // Lift overrun and stair head — the tall box every residential tower has on one side.
  parts.push(
    box(FLOOR_W * 0.3, 0.32, FLOOR_D * 0.4, -FLOOR_W * 0.24, ROOF_Y + 0.16, 0),
  );
  // Water tanks.
  for (const sx of [0, 1]) {
    const g = new THREE.CylinderGeometry(0.11, 0.11, 0.17, 12);
    g.translate(FLOOR_W * 0.18 + sx * 0.27, ROOF_Y + 0.085, -FLOOR_D * 0.16);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

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

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);

    // Fit the model's bounding SPHERE, not its box.
    //
    // Two earlier versions fitted a box — a hand-tuned distance with a narrow-screen fudge, then
    // a proper width/height solve — and both still cut the base off. A box fit is only correct
    // when the camera looks along an axis of it; this camera is above the building and off to
    // one side, so the box's near-bottom corner projects lower on screen than the box's height
    // says it should, and it lands under the frame. A sphere has no corners to be surprised by:
    // if the camera is `r / sin(halfFov)` from its centre it is inside the frustum from every
    // direction, at every angle the model turns through.
    const groundR = 2.0;
    const centre = new THREE.Vector3(0, TOTAL_H / 2, 0);
    const radius = Math.hypot(
      TOTAL_H / 2,
      Math.max(Math.hypot(FLOOR_W, FLOOR_D + BALCONY_OUT * 2) / 2 + PICK_OFFSET, groundR),
    );

    const vFov = (cam.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    // The binding axis is whichever half-angle is smaller — on a wide box that is the vertical
    // one, on a phone-shaped one the horizontal.
    const dist = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.02;

    const yaw = Math.PI * 0.24;
    const pitch = 0.16;
    cam.position.set(
      centre.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      centre.y + Math.sin(pitch) * dist,
      centre.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    cam.lookAt(centre);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
};

/**
 * The key light, and the object it is aimed at.
 *
 * Its own component at module scope, which matters for more than tidiness: written inline in
 * `BuildingModel` the target was a new component type on every render, so React threw the
 * `<object3D>` away and rebuilt it every time a hover changed state — and for the frame in
 * between, the light's target was an object no longer in the scene.
 *
 * The aiming is the part worth keeping. A directionalLight's target defaults to the world
 * origin, so the shadow camera centres on the ground UNDER the building rather than on the
 * building: a mass 6.7 units tall ends up almost entirely outside a frustum measured from y=0,
 * and what falls outside on the wrong side comes back shadowed. The first render of this rebuild
 * had a facade lit by nothing but the fill — not too dark, but ENTIRELY in its own shadow. With
 * the target at mid-height the frustum can be symmetric, which is the only arrangement that
 * stays correct at every angle the model turns through.
 */
const KeyLight: React.FC = () => {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (sunRef.current && targetRef.current) sunRef.current.target = targetRef.current;
  }, []);
  return (
    <>
      <object3D ref={targetRef} position={[0, TOTAL_H * 0.46, 0]} />
      {/* Low and to one side. Low on purpose: a light overhead lands on the balcony slabs and
          nowhere else, and it is the shadow a balcony throws DOWN the wall that makes the facade
          read as having depth. Off the camera's own axis too, so the two faces you can see are
          never the same brightness — a mass lit head-on has no form.

          The frustum is sized from the bounding sphere, same as the camera fit: radius ~3.9 at
          the widest, so +/-4.4 has margin for the balconies and a slid-out storey without
          wasting texels. 1024 is enough for a model that occupies about a third of a 580px
          canvas. */}
      <directionalLight
        ref={sunRef}
        position={[7.4, 6.6, 2.0]}
        intensity={2.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.015}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-camera-left={-4.4}
        shadow-camera-right={4.4}
        shadow-camera-top={4.4}
        shadow-camera-bottom={-4.4}
      />
    </>
  );
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
  const facadeRef = useRef<THREE.InstancedMesh>(null);
  const glassRef = useRef<THREE.InstancedMesh>(null);

  // Each floor's current slide-out, eased toward its target. Kept in a ref because it is
  // per-frame motion and nothing outside the canvas needs to read it.
  const offsets = useRef<number[]>(new Array(TOWER_FLOORS).fill(0));

  const storeyGeom = useMemo(makeStoreyGeometry, []);
  const glassGeom = useMemo(makeGlassGeometry, []);
  const podiumGeom = useMemo(makePodiumGeometry, []);
  const doorGeom = useMemo(makeDoorGeometry, []);
  const roofGeom = useMemo(makeRoofGeometry, []);

  useEffect(
    () => () => {
      storeyGeom.dispose();
      glassGeom.dispose();
      podiumGeom.dispose();
      doorGeom.dispose();
      roofGeom.dispose();
    },
    [storeyGeom, glassGeom, podiumGeom, doorGeom, roofGeom],
  );

  /* One material per look, shared by every mesh that wears it. Building them per-mesh — which is
     what a `<meshStandardMaterial>` written inside a `.map()` does — compiles and uploads a
     separate GPU program and uniform block for objects that are visually identical. */
  const concreteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CONCRETE,
        roughness: 0.88,
        metalness: 0.04,
        envMapIntensity: 0.5,
      }),
    [],
  );
  const darkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CONCRETE_DARK,
        roughness: 0.82,
        metalness: 0.06,
        envMapIntensity: 0.6,
      }),
    [],
  );
  useEffect(
    () => () => {
      concreteMat.dispose();
      darkMat.dispose();
    },
    [concreteMat, darkMat],
  );

  const floorY = (f: number) => STACK_BASE + f * FLOOR_H + FLOOR_H / 2;

  // Position both instanced meshes once. From here on only the per-floor x-offset changes.
  useEffect(() => {
    const facade = facadeRef.current;
    const glass = glassRef.current;
    if (!facade || !glass) return;
    for (let f = 0; f < TOWER_FLOORS; f++) {
      tmpObj.position.set(0, floorY(f), 0);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      facade.setMatrixAt(f, tmpObj.matrix);
      glass.setMatrixAt(f, tmpObj.matrix);
    }
    facade.instanceMatrix.needsUpdate = true;
    glass.instanceMatrix.needsUpdate = true;
  }, []);

  // Colour is the actual information channel: a lit window means a unit you can rent tonight.
  // Recomputed only when the answer changes, never per frame.
  useEffect(() => {
    const glass = glassRef.current;
    const facade = facadeRef.current;
    if (!glass || !facade) return;
    for (let f = 0; f < TOWER_FLOORS; f++) {
      const free = vacancy[f];
      const picked = selectedFloor === f + 1;
      if (!free) {
        tmpColor.copy(WIN_DARK);
      } else if (picked) {
        // Picked floors read as *brighter*, not as a different hue — a hue change would say
        // "this floor is a different kind of thing", when all it is is the one you chose.
        tmpColor.copy(accent).lerp(WHITE, 0.55);
      } else {
        // Flat here on purpose. The scatter that makes the facade look inhabited is baked into
        // the panes themselves (see makeGlassGeometry) and multiplies through this.
        tmpColor.copy(accent);
      }
      glass.setColorAt(f, tmpColor);

      // The concrete takes a hint of the same light back, the way a wall beside a lit window
      // does. White for the picked floor so the storey itself, not only its glass, is the one
      // you chose.
      if (picked) tmpColor.copy(WHITE).multiplyScalar(1.35);
      else if (free) tmpColor.setRGB(1, 1, 1);
      else tmpColor.setRGB(0.72, 0.74, 0.8);
      facade.setColorAt(f, tmpColor);
    }
    if (glass.instanceColor) glass.instanceColor.needsUpdate = true;
    if (facade.instanceColor) facade.instanceColor.needsUpdate = true;
  }, [accent, vacancy, selectedFloor]);

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

    // Slide the picked storey out, ease the rest home. Two matrices per moving floor, where the
    // old model rewrote fourteen.
    const k = reduced ? 1 : 1 - Math.pow(0.0008, delta);
    const facade = facadeRef.current;
    const glass = glassRef.current;
    if (!facade || !glass) return;
    let touched = false;
    for (let f = 0; f < TOWER_FLOORS; f++) {
      const wanted =
        selectedFloor === f + 1
          ? PICK_OFFSET
          : hoverFloor === f + 1 && vacancy[f]
            ? PICK_OFFSET * 0.34
            : 0;
      const cur = offsets.current[f];
      if (Math.abs(cur - wanted) < 0.0002) continue;
      const next = cur + (wanted - cur) * k;
      offsets.current[f] = next;
      tmpObj.position.set(next, floorY(f), 0);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      facade.setMatrixAt(f, tmpObj.matrix);
      glass.setMatrixAt(f, tmpObj.matrix);
      touched = true;
    }
    if (touched) {
      facade.instanceMatrix.needsUpdate = true;
      glass.instanceMatrix.needsUpdate = true;
    }
  });

  const pickFrom = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    typeof e.instanceId === 'number' ? e.instanceId + 1 : null;

  return (
    <group ref={groupRef}>
      {/* The ground. It receives the key light's shadow, which is most of what tells you the
          building is standing on something rather than floating in front of it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[2.6, 56]} />
        <meshStandardMaterial color={GROUND} roughness={0.95} metalness={0} />
      </mesh>

      {/* Ground floor: plinth, lobby mass, entrance piers and canopy. */}
      <mesh geometry={podiumGeom} material={darkMat} castShadow receiveShadow />
      {/* The lobby seen through the opening — warm, and deliberately a different temperature
          from the flats above, because a lobby is lit by a different kind of light than a living
          room. Set back by the wall's own thickness, so the jambs throw a shadow across it. */}
      <mesh position={[0, PLINTH_H + DOOR_H / 2, FLOOR_D / 2 - DOOR_WALL_T - 0.01]}>
        <boxGeometry args={[DOOR_W - 0.02, DOOR_H - 0.02, 0.02]} />
        <meshBasicMaterial color="#f2dcae" toneMapped={false} />
      </mesh>
      {/* The door itself: two leaves and the frame between them, dark against the lit lobby. */}
      <mesh geometry={doorGeom} material={darkMat} castShadow />

      {/* The twelve storeys, as one draw call. */}
      <instancedMesh
        ref={facadeRef}
        args={[storeyGeom, concreteMat, TOWER_FLOORS]}
        castShadow
        receiveShadow
        frustumCulled={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(pickFrom(e));
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const f = pickFrom(e);
          if (f !== null) onPick(f);
        }}
      />

      {/* The glazing, as the second. Basic and untonemapped: these are lights, and a lit window
          that dims when it turns away from the sun is a mirror, not a window. */}
      <instancedMesh ref={glassRef} args={[glassGeom, undefined, TOWER_FLOORS]} frustumCulled={false}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      {/* Parapet, roof deck, lift overrun, water tanks. */}
      <mesh geometry={roofGeom} material={darkMat} castShadow receiveShadow />
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
        shadows="soft"
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ fov: 36, near: 0.1, far: 100 }}
      >
        <Rig />

        <KeyLight />
        {/* Cool fill from the opposite side, so the shadowed face is dark but not black. A face
            in true black has no silhouette against a near-black page. */}
        <directionalLight position={[-4.4, 4.6, -3.4]} intensity={0.45} color="#7f9dd6" />
        {/* Low. Ambient is the enemy of a shadow: every point it adds is a point the balconies
            cannot take away, and the balcony shadows are the whole reason this reads as built
            rather than printed. */}
        <ambientLight intensity={0.22} />

        {/* Built from Lightformers rather than an HDR file: an environment map is what gives the
            glass and the wet concrete something to reflect, and this one costs no request, no
            decode and no CDN. Rendered once into a 128px cube, not per frame. */}
        <Environment resolution={128} frames={1}>
          <color attach="background" args={['#05070c']} />
          {/* Sky band — the cool wash down the top of the mass. */}
          <Lightformer intensity={1.2} color="#8fa8dc" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
          {/* Street glow — warm, low, and on the side away from the key, so the building picks
              up a little of the city it is meant to be standing in. */}
          <Lightformer intensity={0.9} color="#e8b27a" position={[-5, 0.6, -3]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.6} color="#6d86c4" position={[5, 2, 3]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} />
        </Environment>

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

        {/* Drops the render resolution if the frame rate falls, and puts it back when it
            recovers — the model is on a page that also runs a phone mockup and a card grid. */}
        <AdaptiveDpr pixelated={false} />
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

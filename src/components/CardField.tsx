import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ORANGE } from '../lib/homePalette';
import { shadeColor } from '../lib/tone';
import { attachWebGLContextRecovery } from '../lib/webglContextRecovery';

/**
 * One card, in pixels.
 *
 * Pixels because the camera is ORTHOGRAPHIC at zoom 1, which is the whole reason it is
 * orthographic: React Three Fiber builds that camera with the canvas's own half-extents, so one
 * world unit is one CSS pixel and every number in this file can be read against the screen
 * rather than against a frustum. A perspective camera would also have made the grid diverge
 * toward the edges, and a grid that is not the same grid at the corners is not a tidy one.
 */
const CARD_W = 240;
const CARD_H = 104;
/** How thick the card is. This is what the light has an edge to catch, and the edge is the 3D. */
const CARD_D = 40;
const CARD_R = 22;
/**
 * The bevel, and it is a constant rather than a literal because two other things are measured
 * off it. ExtrudeGeometry does NOT stop at `depth` when a bevel is on: it runs from
 * `-bevelThickness` to `depth + bevelThickness`, so the front CAP is a bevel further forward
 * than the depth suggests — and the cap is also inset from the outline by `bevelSize`. Both
 * numbers land on the face plate below, which has to sit in front of the first and inside the
 * second. Guessing either one hides the face inside the card, which is exactly what happened.
 */
const CARD_BEVEL = 4;

/**
 * The grid the cards sit on: wider and taller than a card, so there is ground between them.
 *
 * Every other row starts half a tile along. That is the brick, and it is what stops the field
 * reading as columns — aligned, the gaps line up into vertical lanes the eye follows straight
 * off the screen.
 */
const TILE_W = 360;
const TILE_H = 196;

/**
 * The card's own colour, before the light touches it.
 *
 * The crest of the brand accent (`shadeColor(ORANGE, 0.14)` — the same step `SIGNAL_TONES` takes in
 * TileField.tsx): the ground behind these cards is WARM WHITE (`.nq-coast`), and the cards are this
 * page's version of the site's cube swell — flat white ground, and the raised geometry standing on
 * it carrying the accent, here as much as on every cube field elsewhere.
 *
 * A Lambert material MULTIPLIES its base by the light rather than fading it, so the base has to sit
 * above the colour you want to see. Lit at the crest, the face lands just under it and the shaded
 * sides fall to about the trough — the same range the site's cube field paints, which is why the
 * two read as the same object. With the accent at `#273036` that is a `#454D52` base, a `#3D4549`
 * lit face and `#262A2D` sides, so the card's shadow side sits on the accent itself.
 *
 * ## This line was a literal until now, and it had missed two changes
 *
 * The sentence above has always described a derivation. The value underneath it was typed out as
 * `#FF7F24`, which is `shadeColor('#FF6A00', 0.14)` — the crest of the ORIGINAL orange, from before
 * it was lightened. So this canvas sat out both of the last two accent changes and was still
 * painting the first identity while every other surface on the site had moved twice.
 *
 * Third instance of the same bug in three commits (the footer's `--ft-accent` as a channel triple,
 * the print document's fallback, this): a comment describing a derivation with a hand-written
 * constant beneath it. Derived now, so the next accent change carries it without anyone
 * remembering that this file exists.
 */
const CARD_TINT = shadeColor(ORANGE, 0.14);

/**
 * The diagonal, and the two small angles that make a flat grid look like objects.
 *
 * ROT_Z is the picture: the rows rise to the right, which is the layout as drawn. TILT_X and
 * TILT_Y are the 3/4 view — without them an orthographic camera sees nothing but the front faces
 * and the cards are rectangles with a bevel. With them, every card shows the same sliver of its
 * underside and one side, and the SAME sliver, because orthographic projection has no vanishing
 * point. That is what keeps it tidy: a perspective camera would give the corner cards a
 * different view from the middle ones.
 */
const ROT_Z = 20 * (Math.PI / 180);
const TILT_X = -0.22;
const TILT_Y = 0.28;

/** Pixels a second, along the rows, ON SCREEN. Slow: this is a drift, not a scroll. */
const SPEED = 13;

/**
 * How many tiles the drift travels before it snaps back, AND the period of the lightness wobble
 * below. One constant for both, because they have to be the same number.
 *
 * The wrap is only invisible if the picture repeats over exactly the distance the drift resets by.
 * Position always did: shifting the grid a whole number of tiles maps every card onto where
 * another card was. Colour did not — the wobble was keyed to the raw column index, so a card
 * carried a value no other column had, and the moment the drift snapped the entire field's
 * lightness pattern jumped one column inside one frame. Measured as a single 2.98 spike against a
 * 0.143 median frame delta, once per wrap, and it read as a blink.
 *
 * Four rather than one: at 360 units a tile that is a 1440px repeat, wider than most viewports, so
 * the pattern still never shows itself as a pattern. It costs three extra columns of instances
 * (see the grid below), which is the margin the longer travel needs anyway.
 */
const WRAP_TILES = 4;

/**
 * How big a card is drawn, as a fraction of the sizes above.
 *
 * The sizes are absolute and a screen is not: 240px of card is 17% of a desktop and 62% of a
 * phone, so the same field that reads as a wall of cards on a laptop reads as three slabs
 * sliding past on a handset. It also has to share the screen with the WHITE band, which is WIDER
 * on a phone in relative terms — the strip of field left either side of it is thin, and a thin
 * strip only reads as cards if the cards are small enough for several to fall inside it.
 */
function unitFor(width: number) {
  if (width < 640) return 0.42;
  if (width < 1024) return 0.72;
  return 1;
}

/**
 * The face: a title bar and two lines of body, in paper on nothing.
 *
 * This is what makes them CARDS rather than rounded slabs. It is the least amount of information
 * that reads as a laid-out screen, which is the correct amount for something deliberately out of
 * focus — a legible mockup back here would be a second thing to read on a page whose job is one
 * button.
 *
 * Drawn to a canvas rather than shipped as a file so it carries the palette, and built inside the
 * component rather than at module scope because `document` does not exist until there is one.
 */
function makeFaceTexture() {
  const w = 256;
  const h = 112;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  const bar = (x: number, y: number, bw: number, bh: number, alpha: number) => {
    g.fillStyle = `rgba(233, 231, 227, ${alpha})`;
    g.beginPath();
    g.roundRect(x, y, bw, bh, bh / 2);
    g.fill();
  };
  bar(24, 24, 92, 13, 0.62);
  bar(24, 54, 196, 9, 0.34);
  bar(24, 74, 142, 9, 0.34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * How far out of focus the whole thing is, and it is bought twice over.
 *
 * ## Why this is a function and not a constant
 *
 * R3F's `dpr` is a device-pixel-ratio, not a fraction of the element. A literal 0.55 therefore
 * does not mean "render at 55%" — it means the browser magnifies whatever is drawn by
 * `devicePixelRatio / 0.55` on its way to the screen, which is 1.8x on a 1x monitor, 3.6x on a
 * 2x laptop and 5.5x on a 3x phone. The artifact was a lottery on the visitor's hardware, and
 * BLUR is a fixed CSS length that cannot scale to cover it. Measured on the running page before
 * this changed: a 730x499 buffer stretched across 2656x1816 physical pixels.
 *
 * So the MAGNIFICATION is what is held constant, and dpr falls out of it. The fill saving the
 * constant was bought for is still there — a 1x screen renders at two thirds, a 2x screen at
 * about 0.6 rather than the 2.0 an unconstrained canvas would take — it simply stops varying by
 * device.
 *
 * ## Why 1.5, and not the 2.2 this was set to
 *
 * 2.2 was picked as "an upscale a 3px blur can absorb", and for the STILL picture it is. For the
 * moving one it is not, and the gap is measurable rather than a matter of taste.
 *
 * The field is one rigid translation, so the test is to find the sub-pixel shift that best maps
 * one frame onto the next and look at what is left over. A correctly sampled moving picture leaves
 * almost nothing; whatever remains is the part that is NOT motion, which is the part the eye reads
 * as a flicker. Measured through the shipped blur, against a 14.2 no-shift baseline:
 *
 *     no AA, upscale 2.2   0.98      MSAA, upscale 1.5   0.39   <- here
 *     MSAA,  upscale 2.2   0.53      MSAA, upscale 1.0   0.34
 *
 * Full resolution is the best number and is not worth buying: 1.21M pixels against 535k, for the
 * last 13%. This is a decoration behind a sign-in form, and 1.5 already takes 60% of it.
 *
 * ## BLUR
 *
 * Small on purpose, and smaller in job than it used to be: with MSAA below carrying the edges, the
 * blur is back to being defocus rather than the only thing standing between the viewer and a
 * staircase. Doing the whole defocus this way would mean a full-screen filter re-run every frame
 * the cards move, which is the expensive way to arrive at the same picture.
 */
const MAX_UPSCALE = 1.5;
/** Floor so a 1x screen still buys the fill saving; ceiling so a 3x phone does not pay full price. */
const DPR_MIN = 0.5;
const DPR_MAX = 1.25;

function fieldDpr(): number {
  const device = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(DPR_MAX, Math.max(DPR_MIN, device / MAX_UPSCALE));
}

const BLUR = '3px';

/** Rounded rectangle as a THREE.Shape, for the extrude below. */
function cardShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

interface GridProps {
  reduced: boolean;
}

/**
 * Every card in one InstancedMesh, and the drift as a transform on the group above it.
 *
 * One draw call for the whole field. The alternative is a mesh per card, which at the ~130 this
 * covers a desktop with is ~130 draw calls a frame for a decoration that is deliberately out of
 * focus — the exact case InstancedMesh exists for.
 *
 * The instance matrices are written ONCE, when the canvas is sized, and never touched again. The
 * motion is a translation on the parent group, which is one matrix a frame instead of a hundred
 * and thirty, and it is what lets the loop be exact: the grid repeats every TILE_W along its own
 * x, so wrapping the offset at TILE_W puts every card precisely where its neighbour was and the
 * seam cannot be seen because there is no seam.
 */
const Grid: React.FC<GridProps> = ({ reduced }) => {
  const { size, invalidate } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const faceRef = useRef<THREE.InstancedMesh>(null);
  const driftRef = useRef<THREE.Group>(null);
  const clockRef = useRef(0);
  const unit = unitFor(size.width);

  /* Still low, but no longer as low as it was. Five segments on a 22-unit corner radius was
     tuned for a buffer that was then magnified 3.6x, where the facets were the smallest error in
     the picture. With the upscale bounded the silhouette is the thing the eye actually reads, and
     a faceted corner is what stops a rounded rectangle looking rounded. Ten is still cheap here:
     this is ONE geometry shared by every instance, so the vertex cost is paid once for the whole
     field rather than per card. */
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(cardShape(CARD_W, CARD_H, CARD_R), {
      depth: CARD_D,
      bevelEnabled: true,
      bevelThickness: CARD_BEVEL,
      bevelSize: CARD_BEVEL,
      bevelSegments: 3,
      curveSegments: 10,
    });
    /* Extrude runs from z=0 forward, so without this every card hangs off its own origin and the
       tilt below rotates the grid about a plane that is not the grid. */
    geo.center();
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  /* In front of the front CAP, not in front of the depth: see CARD_BEVEL. Half a unit clear of
     it because two coplanar surfaces is a z-fight, and inset past the bevel on both axes so the
     plate lands on flat card rather than riding up the rounded edge. */
  const faceGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      CARD_W - CARD_BEVEL * 2 - 12,
      CARD_H - CARD_BEVEL * 2 - 12
    );
    geo.translate(0, 0, CARD_D / 2 + CARD_BEVEL + 0.5);
    return geo;
  }, []);
  useEffect(() => () => faceGeometry.dispose(), [faceGeometry]);

  const faceTexture = useMemo(() => makeFaceTexture(), []);
  useEffect(() => () => faceTexture?.dispose(), [faceTexture]);

  /* Sized off the DIAGONAL rather than off width and height. The grid is rotated, so the box it
     has to fill is not the viewport — measuring the diagonal covers every angle without a single
     line of trigonometry, and costs a few instances that fall outside the frame. */
  const { cols, rows, count } = useMemo(() => {
    /* Divided by the unit, because a smaller card is more cards. */
    const cover = (Math.hypot(size.width, size.height) * 1.1) / unit;
    /* `+ WRAP_TILES + 1` and not `+ 2`: the grid is centred, so its right edge has to survive the
       whole drift before the snap. The 2 that used to be here covered a one-tile travel. */
    const c = Math.ceil(cover / TILE_W) + WRAP_TILES + 1;
    const r = Math.ceil(cover / TILE_H) + 2;
    return { cols: c, rows: r, count: c * r };
  }, [size.width, size.height, unit]);

  useEffect(() => {
    const mesh = meshRef.current;
    const face = faceRef.current;
    if (!mesh || !face) return;
    const m = new THREE.Matrix4();
    const colour = new THREE.Color();
    const base = new THREE.Color(CARD_TINT);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        m.makeTranslation(
          (c - (cols - 1) / 2) * TILE_W + (r % 2 ? TILE_W / 2 : 0),
          (r - (rows - 1) / 2) * TILE_H,
          0
        );
        mesh.setMatrixAt(i, m);
        /* The same matrix on both meshes, which is what keeps a face on its card: the plane
           carries its own forward offset in its geometry, so there is one transform to get
           wrong instead of two. */
        face.setMatrixAt(i, m);
        /* A few percent of lightness either way, keyed off the position so it is stable across
           resizes rather than random on every mount. Enough that the field is not wallpaper, far
           too little to read as a pattern of its own.

           The `c` term is `2*PI*c / WRAP_TILES` and not a free coefficient: that makes it repeat
           every WRAP_TILES columns, which is exactly the distance the drift snaps back by, and is
           what stops the wrap showing as a blink. The `r` term is free — rows do not move. */
        const wobble = 1 + 0.07 * Math.sin((2 * Math.PI * c) / WRAP_TILES + r * 2.9);
        mesh.setColorAt(i, colour.copy(base).multiplyScalar(wobble));
        i += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    face.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [cols, rows, count, invalidate]);

  /* Guarantees a painted frame after every commit, and it is not optional here.
     Under `prefers-reduced-motion` the canvas sits on `frameloop='demand'` for its whole life,
     so it renders when something asks it to and never again — and the matrices above are written
     in an effect, which is to say AFTER the render that mounted the mesh. Without this, the one
     frame a reduced-motion visitor gets is the frame drawn before any card had a position.
     Measured: the field was rendering blank until the next unrelated repaint happened to bail it
     out. `invalidate` is a no-op while the loop is running, so it costs nothing the rest of the
     time. */
  useEffect(() => invalidate());

  useFrame((_, delta) => {
    const drift = driftRef.current;
    if (!drift) return;
    if (reduced) {
      drift.position.x = 0;
      return;
    }
    /* Advanced by delta rather than read off the clock, so a pause is a real pause and the field
       picks up where it stopped. The clamp only ever fires on a resume; 0.5 rather than something
       tight because a clamp BELOW the real frame time silently slows the drift on a slow device. */
    clockRef.current += Math.min(delta, 0.5);
    /* Divided by the unit so SPEED stays pixels-on-screen: the group is scaled, so a fixed
       distance in local units would travel slower on a phone than on a desktop. */
    drift.position.x = -(((clockRef.current * SPEED) / unit) % (TILE_W * WRAP_TILES));
  });

  return (
    <>
      {/* Flat and bright, because the shading has to come from the light rather than from the
          material: at 40% resolution behind a blur, a PBR response is detail nobody receives.
          Lambert also has no specular, and a specular highlight on a card this size would be the
          one sharp thing on a layer whose whole job is to be soft.

          The intensities look large and are not. Since three r155 the lights are physical by
          default, and a Lambert surface divides its irradiance by PI — so an `intensity` of 1
          reaches the material as about 0.32, and the numbers that look right by eye are the ones
          you want TIMES pi. Set to the values 1 and 1 look like, the field came out at about a
          third strength: not dimmer, because Lambert multiplies the base colour rather than
          fading it, so the cards went grey next to the saturated blue they stand on and the
          whole thing read as slate.

          What matters is where the sum lands. 1.2/pi + 1.75 x 0.92/pi is about 0.89 on a face
          square to the light, so the lit face comes out just under the tint rather than over it, and
          the sides fall to about 0.55 of it. Over 1 clips, and a clipped face is a flat one —
          the first pass here was blown out and every card was the same white rectangle with the
          thickness, the bevel and the tilt all invisible. */}
      <ambientLight intensity={1.2} />
      {/* Nearly head-on, and that is what keeps the colour. Off to the side the front faces were
          catching a dot of ~0.36, so the whole field came out at three quarters strength — which
          on a Lambert material is not a dimmer, it is the base colour multiplied down until it
          goes grey next to the saturated blue it is standing on. Square to the cards the lit
          face lands at about the section field's crest and the sides fall to about its trough,
          which is the range the cube field on every other page already paints. */}
      <directionalLight position={[-200, 300, 900]} intensity={1.75} />
      <group scale={unit} rotation-z={ROT_Z}>
        <group rotation-x={TILT_X} rotation-y={TILT_Y}>
          <group ref={driftRef}>
            <instancedMesh
              ref={meshRef}
              args={[geometry, undefined, count]}
              /* The grid is built to cover the rotated viewport and then some, so the cards near
                 the corners are outside the frustum by design. Frustum culling on an instanced
                 mesh tests the whole mesh, not the instances, so it can only ever cull all of
                 them at once — and with the drift moving the group, that is a way to lose the
                 entire field for a frame rather than a way to save anything. */
              frustumCulled={false}
            >
              <meshLambertMaterial />
            </instancedMesh>
            {/* The face, as its own instanced mesh: one more draw call for the whole field, and
                the alternative is a texture on the card itself, which ExtrudeGeometry cannot
                give without hand-written UVs — its generator lays the front cap out in WORLD
                coordinates, so every card in the grid would sample a different part of the
                image. */}
            <instancedMesh
              ref={faceRef}
              args={[faceGeometry, undefined, count]}
              frustumCulled={false}
            >
              {/* Lambert and not Basic, so the marks shade with the card they are printed on. An
                  unlit face would stay at full strength while the card around it turned with the
                  light, which is exactly how a decal looks when it is not part of the object. */}
              <meshLambertMaterial map={faceTexture} transparent depthWrite={false} />
            </instancedMesh>
          </group>
        </group>
      </group>
    </>
  );
};

/**
 * The field of cards behind the sign-in copy.
 *
 * It replaces the site's cube field on this one screen, and the swap says something the cubes
 * could not: the thing behind a sign-in form is the catalogue it gets you into, and a card is
 * the shape a template takes everywhere else on this site. The cubes are texture; these are the
 * product, out of focus.
 *
 * Two gates, both of them the ones every other canvas on the site uses:
 *
 *   - `prefers-reduced-motion` freezes the drift. The field still renders, it just stops moving,
 *     which is the honest reading of the preference: the visitor asked for less motion, not for
 *     a blank panel.
 *   - `html[data-idle]` drops the canvas to `frameloop='demand'` while the tab is backgrounded or
 *     the window has lost focus. 'never' is the obvious choice and is wrong — it refuses to
 *     render at all, including the first frame, and this canvas can easily be mounted while the
 *     window is already unfocused.
 */
export const CardField: React.FC = () => {
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);
  /* devicePixelRatio is not fixed for the life of the page: browser zoom changes it, and so does
     dragging the window between a laptop screen and an external monitor. Both fire `resize`. */
  const [dpr, setDpr] = useState(fieldDpr);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const read = () => setDpr(fieldDpr());
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  const running = !idle && !reduced;

  return (
    /* Oversized past the clip on its parent. `filter: blur()` samples what is outside the element
       as transparent, so a layer blurred at its own edges fades out along all four sides and the
       screen shows a pale halo around the field; pushing those edges off screen is the whole
       reason for the negative inset. */
    <div className="absolute -inset-6" style={{ filter: `blur(${BLUR})` }} aria-hidden="true">
      <Canvas
        frameloop={running ? 'always' : 'demand'}
        orthographic
        camera={{ position: [0, 0, 900], zoom: 1, near: 0.1, far: 4000 }}
        dpr={dpr}
        /* `alpha` so the WARM WHITE fill on `.nq-coast` is what shows through the gaps between
           cards, rather than this canvas painting its own ground. One flat colour, declared once,
           in the place the rest of the page reads it from.
           `antialias` ON, and the note that used to sit here got everything right except the
           conclusion. Rendering below the display resolution and scaling UP is undersampling,
           and undersampling magnifies aliasing rather than averaging it away — that part was
           correct. What does not follow is the next step, that MSAA would be "paid for and then
           thrown away" because the blur above covers it. A blur is a spatial filter and this is
           a SAMPLING error: where an edge truly fell between two samples was never recorded, so
           a later blur has nothing to recover and can only smear the staircase it is handed.

           Measured through that very blur, on an identical buffer: the non-translational
           residual is 0.98 without MSAA and 0.53 with it. Half the artifact, for a resolve pass
           on a two-draw-call scene — at 2560x1440 on SwiftShader, with no GPU in the machine
           at all, the field holds 120fps either way and p95 frame time does not move off
           8.4ms. */
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        // انظر webglContextRecovery.ts — بدونها فقدان السياق (شائع هنا تحديداً: هذه خلفية
        // صفحة تسجيل الدخول، حيث ينفتح popup تسجيل دخول Google فوقها مباشرة) كان نهائياً.
        onCreated={(state) => attachWebGLContextRecovery(state.gl)}
      >
        <Grid reduced={reduced} />
      </Canvas>
    </div>
  );
};

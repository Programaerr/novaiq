import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface BookFoldProps {
  /**
   * Slack around the page, in pixels: how much wider and taller the canvas is than the page it
   * draws. The page bows toward the viewer as it turns, and under perspective a bow toward the
   * viewer is magnification — so a canvas cut to the page's exact size would clip the bulge off at
   * the very moment the bulge is the whole point.
   *
   * Everything else about where the page goes is derived from the canvas's own measured size. The
   * first version of this took the hinge and the page size as pixel coordinates in the row's space
   * and converted them into the canvas's; the conversion was wrong by exactly the height of the
   * card's header, and the page spent the whole fold covering the photograph instead of the panel
   * below it. There is no conversion left to be wrong: the caller positions this box over the area
   * the page belongs in, and the page fills it.
   */
  margin?: number;
  /**
   * 0 shut, 1 open. A ref rather than a prop, and that is deliberate — see the note on the host
   * below for why the DOM owns this number and the canvas only follows it.
   */
  progressRef: React.MutableRefObject<number>;
  /**
   * Handed the canvas's `invalidate` once it exists, so the host can ask for a frame.
   *
   * Not optional in practice, and the reason is the whole design. This canvas runs on `demand`,
   * which means it draws when something asks it to — and the only thing that changes here is a ref,
   * which by definition does not re-render anything. Without this the canvas drew its first frame
   * and then never again: the page rotated, bowed and shaded perfectly in a buffer nobody asked to
   * see, and the fold looked like a plain white panel appearing.
   *
   * The host is already running the loop that eases the fold. It calls this on every step, which is
   * exactly as many frames as there are to draw and not one more.
   */
  onReady?: (invalidate: () => void) => void;
}

/**
 * How far the page bows out of flat at the half-way point, as a fraction of its own length.
 *
 * Kept small, and the limit is perspective rather than taste: bowing toward the viewer is moving
 * toward the camera, and moving toward the camera is magnification. At 0.19 the middle of the page
 * came out about eight per cent oversized and visibly overhung the card on both sides — paper
 * lifting off a book rather than paper landing in one. 0.13 is about five per cent, which reads as
 * a page with some spring in it and stays inside the card it belongs to.
 */
const CURL = 0.13;

/** Where the light is, in the page's own space. Up, and a little toward the viewer. */
const LIGHT = new THREE.Vector3(-0.25, 0.72, 0.65).normalize();

function makePageMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uCurl: { value: 0 },
      uFade: { value: 0 },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: `
      uniform float uCurl;
      varying float vShade;

      void main() {
        // The geometry is a unit plane whose pivot has been moved to its top edge, so y runs
        // 0 at the hinge to -1 at the free edge. v is the distance down the page from the hinge.
        float v = -position.y;

        // The bow. Zero at both ends and greatest in the middle — a page held at one edge is
        // straight when it is shut, straight again when it has landed, and at its most curved
        // half way between. sin() over the length gives that for free, and it also pins both the
        // hinge and the free edge to the plane, which is what stops the page tearing away from
        // its own binding at the top.
        float bow = sin(v * 3.14159265) * uCurl;

        vec3 p = vec3(position.x, position.y, bow);

        // The normal, analytically. The surface is z = uCurl * sin(pi*v), so its slope down the
        // page is the derivative of that, and the normal is perpendicular to it in the yz plane.
        // Computed rather than supplied, because the geometry's own normals describe the FLAT
        // plane this started as and would light a bent page as though it were still flat — which
        // is the thing that makes a CSS fold read as a rigid flap rather than as paper.
        float slope = uCurl * 3.14159265 * cos(v * 3.14159265);
        vec3 n = normalize(vec3(0.0, slope, 1.0));

        vec3 worldN = normalize(normalMatrix * n);
        // Half-lambert. A page turning through a right angle spends part of its travel facing away
        // from every light in the room, and true lambert would take it to black there — paper does
        // not go black, it goes grey, because the room is lit and so is its other side.
        //
        // The floor was 0.55 first, which is a range of 0.55..1.0, and against a white DOM panel
        // and a white card that came out as a flat white rectangle: the whole bow was there in the
        // geometry and none of it was visible. Shading is the only thing that makes a curved
        // surface look curved, so the range has to be wide enough to see.
        vShade = 0.34 + 0.66 * (dot(worldN, normalize(vec3(-0.25, 0.72, 0.65))) * 0.5 + 0.5);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform float uFade;
      varying float vShade;

      void main() {
        // Paper: one white, shaded by which way the surface is facing. No texture and no printing
        // on it, because there is nothing to print — the side of a page you see while it is
        // turning is its back, and the front only becomes readable once it has landed, which is
        // exactly when this hands over to the real DOM panel underneath.
        vec3 paper = vec3(0.99, 0.985, 0.975) * vShade;
        gl_FragColor = vec4(paper, uFade);

        #include <colorspace_fragment>
      }
    `,
  });
}

const Page: React.FC<BookFoldProps & { margin: number }> = ({ margin, progressRef, onReady }) => {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useRef<THREE.Mesh>(null);

  const material = useMemo(() => makePageMaterial(), []);
  const geometry = useMemo(() => {
    // Segmented down its length only. The bow runs one way, so segments across the page would be
    // vertices that never move — 40 rows is a smooth curve, 40x40 is 1600 vertices to do the work
    // of 82.
    const g = new THREE.PlaneGeometry(1, 1, 1, 40);
    // Pivot to the top edge, so rotating the mesh about X swings it from its binding rather than
    // about its own middle.
    g.translate(0, -0.5, 0);
    return g;
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  /* One world unit to one CSS pixel at z = 0.
     Perspective and not the orthographic camera the glow field uses, and this is the one place on
     the page that genuinely needs it: a page turning toward the viewer is a plane rotating about a
     horizontal axis, and under an orthographic camera that is indistinguishable from the same page
     rotating away. Perspective is what says which way it is coming. */
  useLayoutEffect(() => {
    const fov = 30;
    camera.fov = fov;
    camera.position.set(0, 0, size.height / (2 * Math.tan((fov * Math.PI) / 360)));
    camera.near = 1;
    camera.far = size.height * 8;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  useEffect(() => {
    onReady?.(invalidate);
  }, [onReady, invalidate]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const p = progressRef.current;

    // Nothing to draw at either end of the travel: shut, the page is edge-on and has no area;
    // open, the real panel underneath is showing through and the page has already faded out.
    const live = p > 0.002 && p < 0.999;
    m.visible = live;
    if (!live) return;

    // The angle the page still has to fall through. cos() of it is exactly the fraction of the
    // page's length that is currently projected onto the screen — which is the same number the
    // card's own height is computed from on the DOM side, and why the page never overshoots the
    // card it is falling into.
    const a = (1 - p) * (Math.PI / 2);
    // POSITIVE, so the free edge swings away from the camera and comes down onto the card rather
    // than out over the front of it.
    //
    // Negated first, on the reasoning that a book cover opens toward you. Under perspective that is
    // a page whose lower edge is a couple of hundred pixels nearer the lens than its hinge, and it
    // projects accordingly: half way through the fall it was a quarter wider than the card and hung
    // out over both its neighbours. Turned the other way the same tilt reads as the page settling
    // down onto the ones under it — which is what a page in a book you are reading actually does —
    // and it can never reach past the card, because everything about it is going backwards.
    m.rotation.x = a;
    // The hinge is the top edge of the box, centred, inset by the slack. Nothing here is passed in
    // and nothing is converted between coordinate systems: this canvas is positioned over the area
    // the page occupies, so the page is simply the canvas, less its margin.
    m.position.set(0, size.height / 2 - margin, 1);
    // Z scaled with the page's own length, NOT left at 1.
    //
    // The bow is written in the vertex shader as a fraction of the unit plane, so it comes out of
    // there as at most 0.19 — and 0.19 of an unscaled z axis is 0.19 of a PIXEL. The page bent by
    // a fifth of a pixel, the analytic normals stayed flat because they were derived from a surface
    // that was, and the whole thing rendered as a plain white rectangle: every part of the curl was
    // present and correct and none of it had any size. Scaling z by the page's height puts the bow
    // in the same units as the thing it is bending.
    const pageH = size.height - margin * 2;
    m.scale.set(size.width - margin * 2, pageH, pageH);

    material.uniforms.uCurl.value = Math.sin((1 - p) * Math.PI) * CURL;
    // Held fully opaque until the page has all but landed, then handed over across the last of
    // the travel. Any earlier and the two are both half-visible at once, which reads as a double
    // exposure rather than as one thing becoming another.
    material.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(p, 0.9, 1);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
};

/**
 * The page that falls open when a card is expanded.
 *
 * ## Why this is worth a canvas
 *
 * A CSS `rotateX` under a perspective can swing a panel down from a hinge, and for a rigid flap
 * that is the right tool. This is not a rigid flap: a page bows as it turns, most in the middle of
 * its travel, and the light running across that bow is the entire reason the motion reads as paper
 * rather than as a door. CSS transforms are affine — every point of a plane stays on that plane,
 * by definition — so a bent page is not something they can express at all, at any cost.
 *
 * ## Why the DOM, not this, owns the progress
 *
 * The card's height is driven off the same number this page is, and the card has to open whether or
 * not there is a working GL context behind it. So the easing lives in an ordinary rAF loop in the
 * host, writes a custom property the card's height reads, and hands this component a ref to follow.
 * If WebGL is unavailable or the tab is throttled, the card still opens correctly and simply opens
 * without the paper.
 */
export const BookFold: React.FC<BookFoldProps> = ({ margin = 56, progressRef, onReady }) => {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        frameloop={idle ? 'never' : 'demand'}
        dpr={[1, 1.5]}
        camera={{ fov: 30, position: [0, 0, 800] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Page margin={margin} progressRef={progressRef} onReady={onReady} />
      </Canvas>
    </div>
  );
};

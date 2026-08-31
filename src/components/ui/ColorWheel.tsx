import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The mark on a colour field: a hue wheel, drawn in WebGL, whose colours turn while the pointer
 * is over the control it belongs to.
 *
 * ## Why a shader and not the conic-gradient this replaced
 *
 * The gradient version was a still picture. What was asked for is a wheel whose colours MOVE under
 * the cursor, before the click that opens the browser's colour dialog — an invitation to press it.
 * A shader gives that for the cost of one uniform: the hue is a function of the angle, so turning
 * the whole wheel is adding a number to it, and nothing is re-laid-out, re-painted or re-composited
 * to do it.
 *
 * It is also more correct as a picture. A conic gradient interpolates between a handful of stops in
 * RGB, which bends the hues between them and mutes the halfway points; this evaluates the hue at
 * every pixel, so the sweep is even the whole way round.
 *
 * ## What this costs, measured before it was written
 *
 * One WebGL context each, and this site has exactly one already (TileField, deliberately shared
 * across every page — see the note in webglContextRecovery.ts, which exists because context loss
 * has been a real problem here). Counted on the running site: home, templates and sign-in each hold
 * a single context, and the contract builder holds none of its own. Three of these takes the page
 * to four, which is far below where a browser starts dropping the oldest.
 *
 * They are also 28 CSS pixels square. At dpr 2 that is a 56x56 buffer running one full-screen
 * triangle's worth of arithmetic, and only while the pointer is actually on it: `frameloop` is
 * 'demand' at rest, so a wheel nobody is touching costs nothing per frame.
 */

/** Turns of hue a second at full hover. Slow enough to read as a colour shift, not a spinner. */
const SPIN = 0.22;
/** How fast hover eases in and out. Higher is snappier; this lands at about a fifth of a second. */
const EASE = 8;

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  uniform float uSpin;
  uniform float uHover;
  varying vec2 vUv;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    /* Polar coordinates about the middle of the quad. Angle carries the hue, radius carries the
       saturation — which is what a colour wheel IS, rather than a decoration that resembles one. */
    vec2 q = vUv * 2.0 - 1.0;
    float r = length(q);
    float a = atan(q.y, q.x);

    /* +0.25 of a turn puts magenta at twelve o'clock, matching the reference this was drawn from.
       uSpin is added, not multiplied, so the wheel turns without the hues bunching up. */
    float hue = fract(a / 6.28318530718 + 0.25 + uSpin);

    /* White at the centre falling to full saturation at the rim. Every colour wheel is drawn this
       way, and it is what stops the mark reading as a pie chart. The rim reaches FULL saturation:
       the previous version washed the outer edge out, which is the thing that had to go. */
    float sat = smoothstep(0.0, 0.96, r);

    /* Hover lifts the saturation a little as well as turning it, so the change is visible even on
       the frames where the rotation has barely moved. */
    vec3 col = hsv2rgb(vec3(hue, sat * (1.0 + 0.12 * uHover), 1.0));

    /* An antialiased disc. fwidth() is the radius' rate of change across one pixel, so the edge is
       one pixel wide whatever the size or the device pixel ratio — no ring, no jaggies, and no
       border element needed to hide either. */
    float aa = fwidth(r);
    float mask = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    if (mask <= 0.0) discard;
    gl_FragColor = vec4(col, mask);
  }
`;

const Wheel: React.FC<{ active: boolean; reduced: boolean; size: number }> = ({
  active,
  reduced,
  size,
}) => {
  const { invalidate } = useThree();
  const hover = useRef(0);
  const spin = useRef(0);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uSpin: { value: 0 }, uHover: { value: 0 } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);

  /* One painted frame after every commit. Under `frameloop='demand'` the canvas renders when
     something asks it to and never again, and the ask has to come from AFTER the mesh mounted —
     the same lesson CardField records: without this, the one frame a resting wheel gets is the
     frame drawn before it existed. */
  useEffect(() => invalidate());

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const target = active && !reduced ? 1 : 0;
    /* Eased rather than switched, so leaving is a wind-down and not a stop mid-turn. */
    hover.current += (target - hover.current) * Math.min(1, d * EASE);
    /* Accumulated, not read off the clock: the wheel picks up from where it stopped instead of
       jumping to wherever a free-running clock had got to since. */
    spin.current += d * SPIN * hover.current;
    material.uniforms.uHover.value = hover.current;
    material.uniforms.uSpin.value = spin.current;
  });

  return (
    <mesh material={material}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

interface ColorWheelProps {
  /** Drawn square, in CSS pixels. */
  size?: number;
  /** True while the pointer is over the control this marks. Drives the turn. */
  active?: boolean;
  className?: string;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({ size = 28, active = false, className = '' }) => {
  const [reduced, setReduced] = useState(false);
  /* Kept alive a beat past the pointer leaving, so the ease-out above has frames to run in.
     Switching straight to 'demand' would freeze it mid-turn at whatever hue it happened to hold. */
  const [live, setLive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    if (active) {
      setLive(true);
      return;
    }
    const t = setTimeout(() => setLive(false), 700);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Canvas
        /* Orthographic at zoom 1 so one world unit is one CSS pixel and the plane above can be
           sized in the same numbers as the element. */
        orthographic
        camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
        dpr={Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)}
        frameloop={live && !reduced ? 'always' : 'demand'}
        /* `antialias` off because the disc antialiases itself in the fragment shader, which is
           exact at any size; MSAA would only smooth a quad whose own edges are transparent.
           LinearSRGBColorSpace so the values the shader computes reach the screen unaltered —
           hsv2rgb already returns display-referred colour, and letting the renderer convert it
           again is what washes a wheel like this out. */
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        }}
        style={{ width: size, height: size, display: 'block' }}
      >
        <Wheel active={active} reduced={reduced} size={size} />
      </Canvas>
    </div>
  );
};

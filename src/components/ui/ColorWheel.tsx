import React, { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The mark on an EMPTY colour field: a hue wheel, drawn in WebGL, holding still.
 *
 * ## Why it holds still, and why it is only the empty state
 *
 * It turned under the pointer for one revision and the owner took that out. Both halves of that
 * change point the same way: this circle is a sign that says "nothing chosen here yet", and the
 * moment a colour IS chosen the tile renders the colour instead and this component is gone. A
 * mark that animated on hover and then disappeared as soon as you used the control it marked was
 * motion with nothing to report.
 *
 * ## Why a shader, with nothing moving
 *
 * The edge. A conic-gradient version of this was rejected for reading white-rimmed, and the two
 * causes were a `border` ring and a gradient whose outer stop fell short of full saturation.
 * This saturates to the rim and antialiases the disc in the fragment shader, where fwidth() makes
 * that edge exactly one pixel at any size and any device pixel ratio — so there is no ring needed
 * to tidy it up, and therefore no ring to read as white.
 *
 * It is a truer picture as well. A conic gradient interpolates between a handful of stops in RGB,
 * which bends the hues between them and mutes the halfway points; this evaluates the hue per
 * pixel, so the sweep is even the whole way round.
 *
 * ## What it costs
 *
 * One WebGL context per EMPTY tile, and the site holds exactly one already (TileField, shared
 * across every page on purpose — see webglContextRecovery.ts, which exists because context loss
 * has been a real problem here). Three empty tiles take the page to four, far below where a
 * browser starts dropping the oldest, and every colour the customer picks hands one back.
 *
 * `frameloop` is 'demand' and nothing invalidates after the first paint, so each wheel is one
 * 56x56 draw (28 CSS pixels at dpr 2) and then silence — no per-frame cost at all.
 */

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  precision highp float;
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

    /* +0.25 of a turn puts magenta at twelve o'clock, matching the reference this was drawn from. */
    float hue = fract(a / 6.28318530718 + 0.25);

    /* White at the centre falling to full saturation at the rim. Every colour wheel is drawn this
       way, and it is what stops the mark reading as a pie chart. The rim reaches FULL saturation:
       an outer stop short of it is what made the gradient version look white-edged. */
    float sat = smoothstep(0.0, 0.96, r);
    vec3 col = hsv2rgb(vec3(hue, sat, 1.0));

    /* An antialiased disc. fwidth() is the radius' rate of change across one pixel, so the edge is
       one pixel wide whatever the size or the device pixel ratio — no ring, no jaggies, and no
       border element needed to hide either. */
    float aa = fwidth(r);
    float mask = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    if (mask <= 0.0) discard;
    gl_FragColor = vec4(col, mask);
  }
`;

const Wheel: React.FC<{ size: number }> = ({ size }) => {
  const { invalidate } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);

  /* The one frame this canvas ever draws. Under `frameloop='demand'` it renders when something
     asks it to and never again, and the ask has to come from AFTER the mesh mounted — the same
     lesson CardField records: without this, the single frame a resting canvas gets is the frame
     drawn before the mesh existed, which is empty. */
  useEffect(() => invalidate());

  return (
    <mesh material={material}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

interface ColorWheelProps {
  /** Drawn square, in CSS pixels. */
  size?: number;
  className?: string;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({ size = 28, className = '' }) => (
  <div className={`shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    <Canvas
      /* Orthographic at zoom 1 so one world unit is one CSS pixel and the plane above can be
         sized in the same numbers as the element. */
      orthographic
      camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
      dpr={Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)}
      frameloop="demand"
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
      <Wheel size={size} />
    </Canvas>
  </div>
);

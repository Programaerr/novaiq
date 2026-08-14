import React from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The one WebGL context on the site.
 *
 * ## The problem this exists to end
 *
 * Every `<Canvas>` is a WebGL context, and a context is not a cheap object: it carries its own GL
 * state machine, its own buffers and its own compositing surface, and the browser holds only a
 * small number of them before it starts destroying the oldest. This page reached three — the hero
 * mark, the credential card and the stat card's liquid — and the result was measurable rather than
 * theoretical: `THREE.WebGLRenderer: Context Lost` in the console, and rAF handlers of 84-203ms
 * where a lost context had to be rebuilt mid-scroll.
 *
 * The liquid stopped being WebGL at all (it is transforms now — see LiquidWave.tsx). The other two
 * genuinely need geometry, so they share this.
 *
 * ## How one canvas draws things in different places on the page
 *
 * `View` from drei. Each `<View>` renders a real DOM element wherever it is placed in the layout,
 * and this canvas — stretched across the viewport, behind everything, deaf to the pointer — draws
 * that view's scene into the rectangle that element happens to occupy, using the GL scissor. So a
 * scene can sit inside a card, in a column, halfway down the page, without a context of its own.
 *
 * Adding a fourth or a fifth 3D thing later costs nothing structural now: it is another `<View>`,
 * not another context. That is the whole point of paying for this indirection once.
 *
 * ## Why `frameloop="always"`
 *
 * One canvas has one loop, and the hero mark turns continuously, so the loop runs. The credential
 * card used to be `demand` and idle at zero frames; sharing means it is redrawn alongside the mark.
 * That is a textured mesh with three lights — far less than the second context it replaces cost
 * merely by existing. Each `<View>` is skipped entirely while its own element is off screen, so
 * scrolling past a scene still stops paying for it.
 */
export const GLStage: React.FC = () => (
  <Canvas
    className="gl-stage"
    // The pointer belongs to the page, not to this canvas. Both scenes handle their own input
    // through ordinary DOM elements (the card has a hit area of its own), and a fixed full-screen
    // canvas that swallowed clicks would make the entire site unusable.
    eventSource={typeof document !== 'undefined' ? document.body : undefined}
    frameloop="always"
    dpr={[1, MAX_DPR]}
    gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
  >
    <View.Port />
  </Canvas>
);

export default GLStage;

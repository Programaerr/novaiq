# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# react-three-fiber
The hero renders a real WebGL scene (`src/components/TemplateCards3D.tsx`, lazy-loaded behind
`FloatingTemplateCards.tsx`), and `@react-three/fiber`, `@react-three/drei` and `three` are
production dependencies. So R3F work here is live-site code, not a sandbox.

**Load the matching `r3f-*` skill before writing or editing any R3F code — not after something
misbehaves.** They are installed under `.claude/skills/`, so a `git pull` gives every
collaborator the same set:

| skill | reach for it when |
| --- | --- |
| `r3f-fundamentals` | Canvas setup, `useFrame`/`useThree`, JSX elements, refs, events |
| `r3f-animation` | per-frame motion, damping/springs, GLTF animation clips |
| `r3f-geometry` | built-in shapes, BufferGeometry, instancing |
| `r3f-materials` | PBR + Drei materials, material properties |
| `r3f-textures` | `useTexture`, PBR texture sets, cubemaps, HDR |
| `r3f-lighting` | light types, shadows, `Environment`/IBL |
| `r3f-loaders` | `useGLTF`/`useLoader`, Suspense, preloading |
| `r3f-interaction` | pointer events, controls, gestures, selection |
| `r3f-shaders` | GLSL, `shaderMaterial`, uniforms |
| `r3f-postprocessing` | bloom, DOF, screen-space effects |
| `r3f-physics` | Rapier rigid bodies, colliders, joints |

Two constraints the existing scene already respects and new work should keep:
- Anything that runs every frame stays on the GPU as transform/material work. Nothing in a
  `useFrame` should touch React state or trigger layout.
- Keep the mobile budget intact: the scene is `lazy()`-imported, capped with `dpr={[1, 1.75]}`,
  and uses `<AdaptiveDpr pixelated />` so a weak GPU loses sharpness instead of framerate.

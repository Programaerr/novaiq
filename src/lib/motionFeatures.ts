/**
 * The DOM animation feature set, in its own module so it can be code-split.
 *
 * `motion/react`'s default `motion.*` components carry every feature the library has —
 * drag, layout projection, scroll, SVG path morphing — whether a component uses them or
 * not, which is how one dropdown ended up costing ~120 kB. The library's answer is
 * `LazyMotion` + `m.*`: `m` is the same component with no features attached, and the
 * features arrive separately.
 *
 * That split only actually happens across a dynamic `import()` boundary, and a dynamic
 * import of `motion/react` itself would resolve to the module the page already imports
 * statically — same chunk, nothing deferred. Re-exporting through this file gives the
 * bundler a real boundary to split on, so `domAnimation` lands in its own chunk and is
 * fetched the first time something animates rather than during first paint.
 */
export { domAnimation as default } from 'motion/react';

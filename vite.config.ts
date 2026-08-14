import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // السماح بالاتصالات الخارجية وفك حجب النطاقات لتشغيل Cloudflare Tunnel و LocalTunnel
      host: true,
      allowedHosts: true,
    },
    build: {
      modulePreload: {
        // Vite's default preloads every dependency of every lazy route up front to avoid
        // request waterfalls once a dynamic import fires — but that silently forces heavy,
        // rarely-needed libraries (jsPDF here, ~340KB) to download on every single page
        // view. Excluding it keeps the true "only pay for it when you click into a
        // contract PDF" behavior that React.lazy() is supposed to provide.
        resolveDependencies: (_filename, deps) =>
          deps.filter((dep) => !dep.includes('vendor-pdf') && !dep.includes('vendor-three')),
      },
      rollupOptions: {
        output: {
          // Group third-party code by library so the browser can cache these large,
          // rarely-changing chunks independently of frequently-changing app code.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // three.js and its R3F ecosystem power one optional hero decoration and
            // nothing else. Without its own bucket the whole ~1MB stack falls through to
            // the eager `vendor` chunk below and every visitor downloads a 3D engine
            // before the page can paint, which is exactly what lazy-loading the scene
            // component was meant to prevent. Matched on the node_modules path segment so
            // a bare substring like "three" can't catch unrelated package names.
            // three itself is only half of it: @react-three/fiber pulls its-fine, zustand and
            // suspend-react along with it, and none of those are imported anywhere in src/.
            // Left unmatched they fall through to the eager `vendor` bucket below and ship on
            // every page view to support a scene that is lazy-loaded and may never be reached.
            // Matched on the node_modules path segment so a bare substring like "three" can't
            // catch an unrelated package name.
            if (/node_modules\/(three|three-stdlib|three-mesh-bvh|@react-three|its-fine|zustand|suspend-react|tunnel-rat|@use-gesture|camera-controls|troika-[^/]+|meshline|stats\.js|detect-gpu|hls\.js|potpack|bidi-js|@monogrid|glsl-noise|maath)\//.test(id)) {
              return 'vendor-three';
            }
            if (id.includes('firebase')) return 'vendor-firebase';
            // React and the icon set are both eager and both almost never change, while the
            // rest of `vendor` does. Splitting them off means a dependency bump elsewhere no
            // longer invalidates ~200 kB of framework the browser already had cached. It also
            // makes the eager payload legible in the build output instead of one opaque lump.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            // jsPDF itself carries the ORIGINAL html2canvas as a transitive dependency
            // (for its optional .html() method, which we never call) — matching only
            // "html2canvas-pro" missed that plain "html2canvas" package entirely, so it
            // was silently landing in the generic eager `vendor` bucket below, undoing
            // the whole point of deferring PDF generation until it's actually used.
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            // Animation library, reachable only from the lazily-loaded template grid. It has
            // to keep a bucket of its own: dropped into the generic `vendor` chunk below it
            // becomes part of first paint for every visitor, including the ones who never
            // open the filter panel it exists for. Matched on the node_modules path segment
            // rather than on the bare substring "motion", which would also swallow the app's
            // own src/lib/motionFeatures.ts and defeat the point of splitting it out.
            if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) {
              return 'vendor-motion';
            }
            return 'vendor';
          },
        },
      },
    },
  };
});
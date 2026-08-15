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
          deps.filter((dep) => !dep.includes('vendor-pdf')),
      },
      rollupOptions: {
        output: {
          // Group third-party code by library so the browser can cache these large,
          // rarely-changing chunks independently of frequently-changing app code.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // No 3D scene renders in the browser any more — three.js is a devDependency now,
            // used only by tools/export-card-model.mjs to build the printable credential-card
            // mesh offline in Node (see that file). It is never imported from src/, so it never
            // reaches this function or the client bundle at all; there is nothing here to chunk.
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
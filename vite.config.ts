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
            if (/node_modules\/(three|three-stdlib|three-mesh-bvh|@react-three|postprocessing|maath)\//.test(id)) {
              return 'vendor-three';
            }
            if (id.includes('firebase')) return 'vendor-firebase';
            // jsPDF itself carries the ORIGINAL html2canvas as a transitive dependency
            // (for its optional .html() method, which we never call) — matching only
            // "html2canvas-pro" missed that plain "html2canvas" package entirely, so it
            // was silently landing in the generic eager `vendor` bucket below, undoing
            // the whole point of deferring PDF generation until it's actually used.
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('motion')) return 'vendor-motion';
            return 'vendor';
          },
        },
      },
    },
  };
});
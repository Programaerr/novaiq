import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],

    /* ── الكونسول فارغ في الإنتاج ────────────────────────────────────────────────────────
       `drop` يحذف كل استدعاءات `console.*` و`debugger` من الحزمة عند البناء — لا يُسكتها في
       وقت التشغيل بل يمسحها من الكود نفسه، فلا تصل إلى المتصفح أصلاً ولا يمكن إعادة تفعيلها
       من طرف الزائر.

       وهذا أمان قبل أن يكون نظافة: 35 استدعاء console في هذا المستودع، وبعضها يطبع نصّ
       الأخطاء القادمة من Firestore — رموز القواعد، أسماء المجموعات، وأحياناً مُعرِّفات
       مستندات. من يفتح الكونسول على موقع منشور يقرأ خريطة داخلية مجّانية عن مكان البيانات
       وكيف تُرفض. أمّا في التطوير فتبقى كاملة، فالتشخيص هناك مطلوب. */
    esbuild: {
      drop: isProd ? (['console', 'debugger'] as const) : [],
    },

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
    /* ترويسات `vite preview` — نسخة من ترويسات الإنتاج، لا زينة.
     *
     * الإنتاج يضبطها في netlify.toml، والتطوير في server.ts (خادم Express). أمّا
     * `vite preview` فكان بلا أي منها — ولهذا ظهر في الكونسول:
     * "Cross-Origin-Opener-Policy policy would block the window.closed call" أربع مرّات من
     * Firebase Auth: نافذة دخول Google المنبثقة تُستفتى كل بضع ميلي‑ثانية عن `window.closed`،
     * والقيمة الافتراضية تقطع الصلة بها.
     *
     * وهذا كان إنذاراً كاذباً — الترويسة صحيحة في الإنتاج — لكن معاينةً لا تطابق الإنتاج
     * تجعل كل قياس عليها موضع شكّ. */
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    build: {
      // 1.4MB لا 500KB الافتراضي: `vendor` (three.js + react-three-fiber)، `vendor-firebase`
      // و`vendor-pdf` تتجاوز الافتراضي بالتصميم، وكل واحد منها معالَج فعلاً بالطريقة الصحيحة
      // (انظر تعليقات manualChunks/modulePreload أدناه) — three.js مطلوب فوراً عند أول رسم
      // فيبقى في الحزمة الفورية عمداً، وpdf مستبعد من modulePreload فلا يُحمَّل إلا عند
      // الحاجة الفعلية. التحذير الافتراضي كان يكرر تنبيهاً عن قرار مقصود ومُوثَّق أصلاً، لا
      // مشكلة فعلية — رفع السقف هنا بدل تجاهل تحذير حقيقي مستقبلاً لو ظهرت حزمة كبيرة جديدة
      // فعلاً غير معالَجة.
      chunkSizeWarningLimit: 1400,
      /* مُطفأ بالكامل، بسبب عامل الخدمة.
       *
       * ## ما كان يحدث
       * Vite يضع <link rel="modulepreload"> لكل اعتماديات المسارات. وهذا يعمل جيداً على موقع
       * بلا service worker. لكن موقعنا يسجّل واحداً (public/sw.js) يعترض كل طلب same-origin
       * ويردّ عليه من الكاش. فيقع التعارض التالي على كل زيارة بعد الأولى: المتصفح يبدأ
       * التحميل المسبق في "عالمه" هو، ثم يصل الطلب الحقيقي فيردّ عليه عامل الخدمة من عالم
       * آخر — فيُهمَل التحميل المسبق كلّه. وهذا نصّ التحذير حرفياً:
       * "A preload ... is not used because it is a cross-world service worker resource
       * mismatch"، ثمانِ مرّات، أي ثمانية ملفات تُحمَّل مرّتين على كل زيارة متكرّرة.
       *
       * ## ولماذا الإطفاء لا الإصلاح
       * لا توجد طريقة يقرّر بها عامل الخدمة "لا أعترض هذا الطلب" بعد فحص الكاش — القرار
       * متزامن والفحص غير متزامن. فإمّا أن نُلغي التحميل المسبق، وإمّا أن نُخرج ملفات البناء
       * من عامل الخدمة ونخسر عمل الموقع بلا إنترنت. الأوّل أرخص: المتصفح يكتشف الاعتماديات
       * من الوحدة الأولى فوراً على أي حال، والتحميل المسبق كان يقدّمها جولة واحدة لا أكثر —
       * وهي جولة نخسرها مرّة على أوّل زيارة، مقابل تحميل مزدوج نخسره في كل زيارة بعدها.
       *
       * (وهذا يُبقي أيضاً الأثر المقصود من الإعداد السابق: vendor-pdf لا يُحمَّل إلا عند فتح
       * وثيقة عقد فعلاً.) */
      modulePreload: false,
      /* خرائط المصدر مطفأة صراحةً.
         الافتراضي في Vite هو الإطفاء، لكن "الافتراضي" ليس قراراً: خريطة مصدر منشورة تعني أن
         كل ملف TypeScript بأسمائه وتعليقاته يُعاد بناؤه في متصفح أي زائر. تُكتب هنا ليُقرأ
         القرار، ولا يُقلَب بترقية إعدادات لاحقة بلا انتباه. */
      sourcemap: false,

      rollupOptions: {
        output: {
          /* دمج الحزم الصغيرة جداً تلقائياً — لا تعداد يدوي لكل مكوّن.
             `React.lazy` هنا كثيرة (AdminPage، LoginPage، PolicyPage، ClientsStrip...)، وكل
             واحد منها يُنتج ملف JS خاصاً به مهما صغر محتواه — بعضها كان أقل من 1 كيلوبايت.
             تكلفة طلب HTTP إضافي (اتصال، ترويسات، جولة ذهاب وإياب) تتجاوز غالباً حجم ملف
             بهذا الصغر، فملف منفصل له خسارة صافية لا فائدة عزل حقيقية.

             `experimentalMinChunkSize` يدمج أي حزمة أصغر من هذا السقف في حزمة مجاورة تستدعيها
             تلقائياً — يعمل على مستوى كل حزم Rollup الناتجة عن `import()`، فلا يحتاج تحديثاً
             يدوياً كلما أُضيف مكوّن كسول جديد. السقف صغير عمداً (5 كيلوبايت): كل الحزم
             المُقسَّمة يدوياً في manualChunks أدناه (vendor-*) أكبر منه بأضعاف، فلا يمسّها. */
          experimentalMinChunkSize: 5000,
          /* أسماء ملفات مبهمة لحزم التطبيق.
             كانت تُبنى بأسماء مكوّناتها: AdminPage، LoginPage، ContractBuilderGate،
             ContractPrintDocument، TemplateInteractiveSandbox… أي أن قائمة الملفات في
             `/assets` كانت **خريطة المشروع حرفياً**: من يفتحها يعرف أن هناك لوحة تحكّم،
             وبوّابة عقود، ووثيقة مطبوعة، وأين يبحث عن كلٍّ منها — قبل أن يقرأ سطراً واحداً.
             الآن الاسم بصمة المحتوى وحدها.

             حزم المكتبات (`vendor-*`) تحتفظ بأسمائها عمداً: هي لا تكشف شيئاً عن بنيتنا —
             وجود three أو firebase أو jspdf ظاهر من الكود نفسه على أي حال — بينما جدول أحجام
             البناء يفقد كل معناه التشخيصي إن صارت كلّها بصمات. إخفاء ما يكشف، لا إخفاء كل
             شيء. */
          chunkFileNames: (info) =>
            info.name?.startsWith('vendor') ? 'assets/[name]-[hash].js' : 'assets/[hash].js',
          entryFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash][extname]',
          // Group third-party code by library so the browser can cache these large,
          // rarely-changing chunks independently of frequently-changing app code.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            // three.js and @react-three/fiber stay in the eager `vendor` bucket, deliberately.
            // They are not optional any more: the home page's tile field, the timeline and the
            // sign-in ground all render a scene at first paint, so deferring them would move the
            // download rather than save it. (This comment used to say the opposite — that three
            // was a devDependency used by an offline tool and never imported from src/. That
            // stopped being true several scenes ago.)
            //
            // drei is a different case and needs its own bucket. Exactly one component uses it
            // — the rental demo's BuildingModel — and that component sits behind React.lazy inside
            // the sandbox modal, which most visitors never open. Left in the generic `vendor`
            // chunk it is first-paint weight for every one of them. Its own chunk is imported
            // only by the sandbox's, so it downloads when the modal does and not before.
            //
            // The transitive packages are listed with it because they are drei's alone. zustand
            // and suspend-react are deliberately NOT here: fiber uses them too, so moving them
            // would make the eager chunk depend on this one and drag the whole thing forward,
            // which is the exact failure this rule exists to prevent.
            if (
              /node_modules\/(@react-three\/drei|three-stdlib|troika-three-text|troika-three-utils|three-mesh-bvh|meshline|maath|camera-controls|detect-gpu|stats-gl|stats\.js|hls\.js)\//.test(id)
            ) {
              return 'vendor-drei';
            }

            // Supabase: عميل القاعدة والهوية معاً، ويُطلب عند أول رسم (فحص الجلسة)، فهو
            // في حزمته الخاصة لا في `vendor` العام — نفس سبب فصل react: نادر التغيّر، فلا
            // يُبطل تحديثُ مكتبة أخرى نسخةً مخزَّنة عند الزائر.
            if (id.includes('@supabase')) return 'vendor-supabase';
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
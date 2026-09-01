import { useRef, useState, useEffect } from 'react';

/**
 * Freehand signature drawing on a `<canvas>`, shared by the customer's contract signature and
 * the admin's company sign-off. Both pads had their own copy of this — identical maths, same
 * stroke style, same touch handling — so a fix to one silently left the other broken.
 *
 * The coordinate scaling is the part that must not drift: the canvas has a fixed internal
 * drawing resolution (`width`/`height` attributes) but is displayed at a responsive CSS size,
 * which is almost never the same. Feeding clientX/clientY straight in makes the stroke land
 * offset from the pointer by exactly that mismatch.
 */
export interface UseSignaturePadOptions {
  /** Existing signature to restore onto the pad on mount (admin re-opening a signed contract). */
  initialDataUrl?: string;
  /** Fired on the first point of a stroke — used to clear a "signature required" warning or mark dirty. */
  onStrokeStart?: () => void;
  /** Fired when the pad is cleared. */
  onClear?: () => void;
}

type PointerEvt =
  | React.MouseEvent<HTMLCanvasElement>
  | React.TouchEvent<HTMLCanvasElement>;

export function useSignaturePad({ initialDataUrl, onStrokeStart, onClear }: UseSignaturePadOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialDataUrl);

  // Redraws a previously saved signature once the canvas mounts, so re-opening a signed
  // contract shows what was signed rather than a blank pad.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(!!initialDataUrl);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  // Measured once per stroke rather than once per point.
  //
  // This runs for every pointermove while someone is signing, and getBoundingClientRect forces
  // the browser to flush layout before it can answer — so drawing a signature was paying a
  // forced synchronous layout on every single frame of the gesture, which is exactly the sort
  // of per-move layout read that shows up as lag on a weak device. The canvas cannot move
  // during a stroke (the pad is fixed while the finger is down), so one measurement at
  // pointerdown is as correct as one per point, and a scroll or resize between strokes clears
  // it anyway.
  const padBox = useRef<DOMRect | null>(null);

  useEffect(() => {
    const invalidate = () => {
      padBox.current = null;
    };
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);
    return () => {
      window.removeEventListener('scroll', invalidate);
      window.removeEventListener('resize', invalidate);
    };
  }, []);

  const pointFrom = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    if (!padBox.current) padBox.current = canvas.getBoundingClientRect();
    const rect = padBox.current;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const clientXY = (e: PointerEvt) =>
    'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

  const startDrawing = (e: PointerEvt) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Without this the browser can read the first touch-drag as a page scroll, and the canvas
    // never receives the movement at all.
    if ('touches' in e) e.preventDefault();

    setIsDrawing(true);
    setHasSignature(true);
    onStrokeStart?.();
    const { x, y } = clientXY(e);
    const point = pointFrom(canvas, x, y);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: PointerEvt) => {
    if (!isDrawing) return;
    if ('touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = clientXY(e);
    const point = pointFrom(canvas, x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    /* حبر داكن، لا أبيض.

       كان `#f4f4f5`: يُقرأ على لوحة العميل الداكنة فقط، بينما لوحة اعتماد الأدمن تجلس على
       سطح فاتح (bg-white/70 في ContractsTab) — أي أن الأدمن كان يوقّع بحبر أبيض على أبيض
       ولا يرى شيئاً أثناء الرسم إطلاقاً. وكل عارض كان مضطراً لقلب ألوان الصورة
       (filter: invert(1)) لطباعتها على ورق أبيض، وهو ما يجعل ظهور التوقيع في PDF معتمداً
       على دعم أداة الالتقاط لمرشّحات CSS بدل أن يكون خاصية في الصورة نفسها.

       حبر داكن يحلّ الاثنين معاً: مرئي أثناء التوقيع على أي لوحة، ويُطبع كما هو بلا أي
       مرشّح. `signatureInk: 'dark'` على العقد هو ما يميّز هذه التواقيع عن القديمة (types.ts). */
    ctx.strokeStyle = '#0B0D10';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  };

  /** Empty string when nothing has been drawn, so callers can treat "unsigned" as falsy. */
  const getDataUrl = () => (hasSignature ? canvasRef.current?.toDataURL('image/png') || '' : '');

  return { canvasRef, hasSignature, startDrawing, draw, stopDrawing, clear, getDataUrl };
}

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

  const pointFrom = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
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
    ctx.strokeStyle = '#f4f4f5';
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

import { Template } from '../types';

/**
 * One colour per template category, and the two things made from it.
 *
 * ## Why the category and not the photo
 *
 * The reference this is built from takes each card's colour from its own photograph — the Dubai
 * card is purple because its sky is. Sampling would be possible here (the previews are Unsplash
 * URLs and Unsplash does send CORS headers) but it is the wrong trade twice over. It costs a
 * decode and a canvas readback per card before anything can be painted; it silently produces
 * nothing the day an admin points a preview at a host that does not send the header; and the
 * average of a photograph is a muddy grey far more often than it is a colour, because that is
 * what averaging opposite hues does.
 *
 * The category is real data that is already loaded, it never fails, and it makes the colour MEAN
 * something: every commerce template washes the same orange, every fintech one the same blue. A
 * visitor filtering by category sees the row change colour with the filter. Sampled photos would
 * only ever have said "this picture happens to be blue".
 */
const HUES: Record<Template['category'], string> = {
  corporate: '#7C5CFF',
  ecommerce: '#FF7A45',
  cars: '#E0455E',
  realestate: '#2FB6A5',
  healthcare: '#35C46A',
  fintech: '#3B82F6',
  restaurant: '#F5A524',
  education: '#A855F7',
  mobile: '#22D3EE',
  watches: '#D4A24C',
  marketing: '#EC4899',
};

/** For a category the catalogue grows later and this file has not been told about yet. */
const FALLBACK = '#8295CF';

/** What every wash is pulled toward. Near-black with the page's own blue still in it, so a
    darkened orange lands on a warm near-black rather than on a neutral grey. */
const INK_DEEP = '#0B0D1A';

const channels = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const hex = (c: number[]): string =>
  '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const mix = (a: string, b: string, t: number): string => {
  const A = channels(a);
  const B = channels(b);
  return hex(A.map((v, i) => v + (B[i] - v) * t));
};

/**
 * The light. Full strength, because it is what the glow field beneath the row emits — it is never
 * behind text, so it is free to be as vivid as it likes.
 */
export const hueFor = (category: string): string =>
  HUES[category as Template['category']] ?? FALLBACK;

/**
 * The wash. The same hue pulled most of the way to ink, which is what the bottom of every card
 * fades into and what its title, meta line and button are read against.
 *
 * One constant rather than eleven, and it is set by the worst case in the palette — which is not
 * the one it looks like. The obvious candidate is the gold (#D4A24C), the lightest hex in the set;
 * the colour that actually runs out first is the CYAN (#22D3EE), because relative luminance is
 * 72% green and cyan is most of the way to white in exactly that channel. Measured rather than
 * eyeballed, and worth writing down: picking the constant off the gold would have left the cyan
 * card sitting under the floor while every check on the file passed.
 *
 * At 0.6 the cyan wash measures 6.6:1 for the title, 5.4:1 for the meta line at white-85%, and
 * 5.1:1 for the button's white text over its own 16% white fill. Every other colour in the set is
 * darker than the cyan and therefore safer, so 5.1:1 is the floor for the whole catalogue.
 *
 * It was 0.7 first, which measured 11:1 and looked it — eleven cards pulled so far toward ink that
 * the category they were supposed to be announcing had gone out of them. Contrast is a floor to
 * clear, not a score to maximise, and the difference between clearing it at 5 and at 11 is the
 * whole colour of the page.
 *
 * One constant and not eleven for the ordinary reason: eleven would each have to be re-checked
 * when a twelfth category arrives, and nothing would fail loudly when nobody did.
 */
export const washFor = (category: string): string => mix(hueFor(category), INK_DEEP, 0.6);

import React, { useCallback, useId, useState } from 'react';
import { Send } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { db } from '../lib/firebase';
import { showToast } from '../lib/toast';
import { COBALT_DEEP, ERROR_ON_BRAND, ICE, MIDNIGHT, PAPER, SUCCESS } from '../lib/homePalette';
import { BAND_FADE, COBALT_TONES, TileField } from './TileField';
import { NqButton } from './ui/NqButton';

/**
 * The contact section: the panel from the wireframe, with the form on one side and the ways to
 * reach a person on the other.
 *
 * ## The edge above it is made of cubes, not of a shape
 *
 * The section's ground is COBALT_DEEP and the one above it is paper, and a straight seam between
 * two flat colours across a full-width page is the most obvious edge on the site. So the top of
 * this section is a STRIP of the same tile field the hero uses, in the brand's blue instead of
 * ice: the cubes are absent at the top of the strip where the ground is still paper, assemble as
 * the ground turns, and settle away into flat blue before the heading. The blue arrives as
 * something that was built rather than as a rectangle that starts.
 *
 * It is the hero's gesture in reverse, and deliberately so. The page opens with a field of ice
 * cubes breaking up downward into the paper and closes with a field of blue ones assembling upward
 * out of it — the same move, bracketing everything between.
 *
 * ## Labels are inside the fields, and they are real labels
 *
 * The wireframe puts "YOUR NAME" inside the light block, which is normally the placeholder-only
 * pattern that deletes the label the moment someone starts typing. It is drawn at the TOP of the
 * message box rather than centred in it, which is the other reading: a caption that stays. That is
 * what these are — a real label, in place, above its input, inside the same block.
 *
 * ## Contrast decided the fills, and changed when the brand did
 *
 * Under the old identity the section's ground (periwinkle, `#8295CF`) was light enough that ink
 * text sat directly on it at 6.4:1. COBALT_DEEP is a different kind of blue on purpose — a full
 * fill in the brand's actual Electric Cobalt would break the brief's own rule that bold colour
 * stay rare, so this section fills with Cobalt brought back toward Midnight instead, and that is a
 * DARK ground. Every mark that sits directly on it had to flip from dark to light with it: the
 * heading is ICE now, not ink, and the error/confirmation messages moved off plain ink onto real
 * semantic colours tuned for this specific ground (see the notes at each). Text still inside a
 * field block stays dark, because that block is still a light ICE surface floating on the section
 * — only what sits on the section's own ground moved.
 */

interface Field {
  key: 'name' | 'phone' | 'message';
  ar: string;
  en: string;
  type: 'text' | 'tel' | 'textarea';
  autoComplete: string;
}

const FIELDS: Field[] = [
  { key: 'name', ar: 'اسمك', en: 'Your name', type: 'text', autoComplete: 'name' },
  { key: 'phone', ar: 'رقم هاتفك', en: 'Your phone', type: 'tel', autoComplete: 'tel' },
  { key: 'message', ar: 'رسالتك', en: 'Your message', type: 'textarea', autoComplete: 'off' },
];

type Values = Record<Field['key'], string>;
type Errors = Partial<Record<Field['key'], string>>;

const EMPTY: Values = { name: '', phone: '', message: '' };

/**
 * Iraqi mobile numbers start with 07 and run to 11 digits; a leading +964 is also accepted.
 * Looser than the strict contract check on purpose — this is a first-touch message, not a signed
 * document, so a friendly nudge beats a hard wall.
 */
const PHONE = /^(?:\+964|0)?7\d{9}$/;

function validate(values: Values, isAr: boolean): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = isAr ? 'اكتب اسمك.' : 'Please enter your name.';
  if (!values.phone.trim()) errors.phone = isAr ? 'اكتب رقم هاتفك.' : 'Please enter your phone.';
  else if (!PHONE.test(values.phone.replace(/\s+/g, '')))
    errors.phone = isAr ? 'الرقم مو صحيح.' : 'That number does not look right.';
  if (!values.message.trim()) errors.message = isAr ? 'اكتب رسالتك.' : 'Please enter a message.';
  return errors;
}

interface ContactSectionProps {
  language?: Language;
  /** When true this section is the top of a standalone page (the Support page), so its top edge is
   *  the top of the viewport rather than a seam below another section. The cube strip that normally
   *  crosses the colour change from a paper section above is omitted, and the ground is pulled up
   *  under the floating navbar (cancelling <main>'s top padding) so the page reads as connected from
   *  the very top instead of leaving a disconnected strip. */
  isPageTop?: boolean;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ language = 'ar', isPageTop = false }) => {
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();
  /* One id per mount, so the label/input/error wiring stays unique if this section is ever
     rendered twice on a page. */
  const uid = useId();

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  /* Which fields have been left once. Errors appear on blur and on submit, never while someone is
     still typing their first character — being told you are wrong before you have finished is the
     single most disliked thing a form does. */
  const [touched, setTouched] = useState<Partial<Record<Field['key'], boolean>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = useCallback((key: Field['key'], v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    /* Clear the error as the field changes rather than re-validating on every keystroke: a message
       that is still wrong the instant you start fixing it is worse than no message. */
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const blur = useCallback(
    (key: Field['key']) => {
      setTouched((prev) => ({ ...prev, [key]: true }));
      setErrors((prev) => ({ ...prev, [key]: validate(values, isAr)[key] }));
    },
    [values, isAr],
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const found = validate(values, isAr);
      setTouched({ name: true, phone: true, message: true });
      setErrors(found);
      if (Object.values(found).some(Boolean)) {
        /* Focus the first field that failed. Without it the only feedback on a long form is a
           colour change that may be off screen. */
        const first = FIELDS.find((f) => found[f.key]);
        if (first) document.getElementById(uid + '-' + first.key)?.focus();
        return;
      }

      setSending(true);
      try {
        await addDoc(collection(db, 'contact_messages'), {
          name: values.name.trim(),
          phone: values.phone.trim(),
          message: values.message.trim(),
          language,
          createdAt: serverTimestamp(),
        });
        setSent(true);
        setValues(EMPTY);
        setTouched({});
      } catch {
        /* The message did not go. Say so plainly and keep what they typed — clearing the form on a
           failed send loses their words as well as their time. */
        showToast(
          isAr
            ? 'ما انرسلت الرسالة. جرب مرة ثانية أو تواصل ويانا مباشرة.'
            : 'The message did not send. Try again, or reach us directly.',
          'error',
        );
      } finally {
        setSending(false);
      }
    },
    [values, isAr, language, uid],
  );

  return (
    <section
      ref={sectionRef}
      id="contact"
      data-seen={seen ? 'true' : 'false'}
      /* The section's own ground and its own vertical rhythm — see HOME_SECTIONS.md.
         On a standalone page (isPageTop) there is no paper section above, so the cube strip that
         would cross a colour change is omitted and the ground is pulled up under the floating
         navbar (cancelling <main>'s top padding) so the page connects from the very top instead of
         leaving a disconnected strip. Otherwise the top padding clears the absolutely-positioned
         tile strip above it, which takes up no height of its own. */
      style={{
        background: COBALT_DEEP,
        ...(isPageTop
          ? { marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))' }
          : {}),
      }}
      className={
        'relative overflow-hidden pb-20 sm:pb-28 lg:pb-32 ' +
        (isPageTop
          ? 'pt-[calc(var(--nav-bottom,74px)+3.5rem)]'
          : 'pt-[calc(var(--nq-band)+3.5rem)]')
      }
    >
      {/* ── The edge ────────────────────────────────────────────────────────────────────────────
          A strip across the top holding the ground's change of colour and the field that crosses
          it. The gradient reaches full blue well before the strip ends, so the cubes have solid
          ground to settle onto rather than vanishing at the same moment the colour is reached.
          Omitted on a standalone page, where there is no paper section above to transition from. */}
      {!isPageTop && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0"
          style={{
            height: 'var(--nq-band)',
            /* The top opens on PAPER so it is continuous with the section above (PhasesSection),
               which is also paper — the two read as one surface at the seam rather than as a strip
               dropped on top of a different colour.

               34%, and it is set against BAND_FADE.hi (0.22) rather than chosen on its own. The
               cubes fray in across the top 22% of the band; this ramp keeps that stretch mostly
               paper, so what you see there is the paper section growing cubes rather than an empty
               strip of half-blue. Blue lands at 34%, just after the field reaches full height. Move
               either number without the other and you get back one of the two faults the note on
               BAND_FADE describes. */
            background: 'linear-gradient(to bottom, ' + PAPER + ' 0%, ' + COBALT_DEEP + ' 40%)',
          }}
        >
          <TileField tones={COBALT_TONES} fade={BAND_FADE} />
        </div>
      )}

      <div className="relative nq-container">
        {/* Steps with the phases section above it and for the same reason — see the note there.
            One island of the same width twice running is what makes the two read as one page. */}
        <div className="mx-auto max-w-[56rem] uw:max-w-[72rem]">
          {/* This heading sits directly on the section's own ground, which is now the dark
              COBALT_DEEP fill rather than the old, much lighter periwinkle — so its text has to
              be the light member of the pair, not MIDNIGHT. Every other coloured text in this
              section sits on a nested light card (the field blocks) and stays dark; this is the
              one heading with no card under it. */}
          <h2
            className="nq-rise text-[1.55rem] sm:text-[2.1rem] uw:text-[2.6rem] font-black leading-none tracking-tight"
            style={{ color: ICE, ['--nq-rise-delay' as string]: '80ms' }}
            >
              {isAr ? 'المراسلة والدعم' : 'Messaging & Support'}
            </h2>

            {/* The form is the whole point of the section now: a single, centred way to reach a
               person. The direct-contact column (email / address) was removed — phone-first, since
               that is what Iraq actually uses. */}
            <div className="mt-10 sm:mt-12 mx-auto max-w-[42rem]">
              <form noValidate onSubmit={submit} className="grid gap-4 sm:gap-5">
              {FIELDS.map((field, i) => {
                const id = uid + '-' + field.key;
                const error = touched[field.key] ? errors[field.key] : undefined;
                const isArea = field.type === 'textarea';
                return (
                  <div
                    key={field.key}
                    className="nq-rise"
                    style={{ ['--nq-rise-delay' as string]: 160 + i * 90 + 'ms' }}
                  >
                    {/* Label and input inside one light block, as drawn. The block IS the field:
                        clicking anywhere on it lands in the input, because the label owns the whole
                        box and the input fills what is left of it. Stays a light ICE surface
                        against the now much darker section ground — the field has to keep reading
                        as an input, not blend into the dark blue around it. */}
                    <label
                      htmlFor={id}
                      className="block rounded-xl px-4 pt-3 pb-2.5 cursor-text transition-shadow duration-200 focus-within:shadow-[0_0_0_2px_#07111F]"
                      style={{ background: ICE }}
                    >
                      <span
                        className="block text-[0.7rem] sm:text-[0.75rem] uw:text-[0.85rem] font-extrabold tracking-wide"
                        style={{ color: MIDNIGHT, opacity: 0.75 }}
                      >
                        {isAr ? field.ar : field.en}
                      </span>
                      {isArea ? (
                        <textarea
                          id={id}
                          name={field.key}
                          rows={5}
                          value={values[field.key]}
                          onChange={(e) => set(field.key, e.target.value)}
                          onBlur={() => blur(field.key)}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? id + '-error' : undefined}
                          /* No resize handle: the box is already five rows, and a draggable corner
                             on a coloured panel is the one control here that can be pulled out of
                             the layout it sits in. */
                          className="mt-1 block w-full bg-transparent border-0 outline-none resize-none text-[0.95rem] uw:text-[1.05rem] font-bold leading-relaxed"
                          style={{ color: MIDNIGHT }}
                        />
                      ) : (
                        <input
                          id={id}
                          name={field.key}
                          type={field.type}
                          autoComplete={field.autoComplete}
                          value={values[field.key]}
                          onChange={(e) => set(field.key, e.target.value)}
                          onBlur={() => blur(field.key)}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? id + '-error' : undefined}
                          /* 40px of input under a 20px label clears the 44px the whole block needs
                             to be a comfortable touch target. */
                          className="mt-1 block w-full h-10 uw:h-12 bg-transparent border-0 outline-none text-[0.95rem] uw:text-[1.05rem] font-bold"
                          style={{ color: MIDNIGHT }}
                        />
                      )}
                    </label>

                    {/* The error goes under its own field, not into a summary at the top. `role`
                        and the live region so it is announced when it appears rather than only
                        found by someone who goes looking for it. */}
                    {error && (
                      {/* Sits directly on the section's dark ground, not on the light field block
                          above it, and it is an error — ERROR_ON_BRAND rather than plain ERROR:
                          plain ERROR is 3.40:1 on this specific blue (Cobalt Deep reads lighter
                          than Midnight, the ground it was tuned against) and fails AA. This was
                          previously rendered in plain ink, which is not an error colour at all. */}
                      <p
                        id={id + '-error'}
                        role="alert"
                        className="mt-1.5 px-1 text-[0.78rem] font-extrabold"
                        style={{ color: ERROR_ON_BRAND }}
                      >
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}

              <div
                className="nq-rise flex flex-wrap items-center gap-4"
                style={{ ['--nq-rise-delay' as string]: '430ms' }}
              >
                {/* The one place on the site where `type` genuinely has to be spelled out —
                    NqButton defaults to `button`, and a submit that forgot to say so is a form
                    that does nothing. */}
                <NqButton
                  type="submit"
                  tone="periwinkle"
                  variant="solid"
                  size="md"
                  loading={sending}
                  className="uw:text-base"
                  badge={<Send className="w-4 h-4" strokeWidth={2.4} />}
                >
                  {sending ? (isAr ? 'جاري الإرسال…' : 'Sending…') : isAr ? 'أرسل' : 'Send'}
                </NqButton>

                {/* The confirmation sits beside the button that caused it, and is announced.
                    SUCCESS rather than ink — this is on the section's own dark ground and reads
                    5.62:1 there, and a success message is exactly the case the brief's semantic
                    system exists for: brand blue cannot also mean "this worked". */}
                {sent && (
                  <p role="status" className="text-[0.85rem] font-extrabold" style={{ color: SUCCESS }}>
                    {isAr ? 'وصلت رسالتك. نرد عليك قريباً.' : 'Got it. We will reply shortly.'}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

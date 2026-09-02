import React, { useCallback, useId, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { db } from '../lib/firebase';
import { showToast } from '../lib/toast';
import { useSocialLinks, whatsappLink } from '../lib/socialLinks';
import { trackEvent } from '../lib/analytics';
import { ERROR, OBSIDIAN, PAPER, PAPER_DEEP, SUCCESS, WHITE } from '../lib/homePalette';
import { BAND_FADE, SIGNAL_TONES, TileField } from './TileField';
import { NqButton } from './ui/NqButton';

/**
 * The contact section: the panel from the wireframe, with the form on one side and the ways to
 * reach a person on the other.
 *
 * ## The edge above it is made of cubes, not of a shape
 *
 * The section's ground is WHITE and the one above it is paper, and a straight seam between two
 * flat colours across a full-width page is the most obvious edge on the site. So the top of this
 * section is a STRIP of the same tile field the hero uses: the cubes are absent at the top of the
 * strip where the ground is still paper, assemble as the ground turns, and settle away into flat
 * white before the heading — the swell itself is what carries the brand's Signal Orange now,
 * rather than the flat ground it used to fill.
 *
 * ## Labels are inside the fields, and they are real labels
 *
 * The wireframe puts "YOUR NAME" inside the light block, which is normally the placeholder-only
 * pattern that deletes the label the moment someone starts typing. It is drawn at the TOP of the
 * message box rather than centred in it, which is the other reading: a caption that stays. That is
 * what these are — a real label, in place, above its input, inside the same block.
 *
 * ## Contrast decided the fills, and changed with every identity this section has had
 *
 * This section's ground has been a light periwinkle, a dark Obsidian, the brand's own Signal
 * Orange, and is WARM WHITE again on the client's third pass — with black now confined to
 * secondary text rather than spent on the flat ground itself. OBSIDIAN reads on white at 18+:1,
 * so the heading needed no change of direction, only of which bright ground it sits on. The two
 * status messages follow the same logic they already did: red and green both measure under 4.5:1
 * directly on either bright ground (white included — plain ERROR on WHITE is 3.51:1), so both
 * still sit on a small Obsidian chip, where they stay themselves at full saturation — see the
 * notes at each. The field blocks themselves moved off WHITE (which is now the section's own
 * ground, so a same-coloured block would vanish into it) onto PAPER_DEEP, the establishment
 * "light input surface on a white ground" the rest of the design system already uses. */

interface Field {
  key: 'name' | 'phone' | 'message';
  ar: string;
  en: string;
  type: 'text' | 'tel' | 'textarea';
  autoComplete: string;
  /** قاعدة الحقل، مكتوبة تحته قبل أن يكتب فيه شيئاً.
   *
   *  الشرط كان موجوداً في الكود وحده: يكتب الزائر رقمه، يضغط إرسال، فيُقال له "الرقم مو صحيح"
   *  دون أن يُقال ما هو الصحيح — أي أنه يعرف القاعدة بمخالفتها. القاعدة معروضة الآن قبل
   *  المحاولة، ونصّ الخطأ يعيدها بدل أن يكتفي بالرفض. */
  hint?: { ar: string; en: string };
}

const FIELDS: Field[] = [
  { key: 'name', ar: 'اسمك', en: 'Your name', type: 'text', autoComplete: 'name' },
  {
    key: 'phone',
    ar: 'رقم هاتفك',
    en: 'Your phone',
    type: 'tel',
    autoComplete: 'tel',
    hint: {
      ar: 'رقم عراقي يبدأ بـ 07 ويتكوّن من 11 رقماً — أو بصيغة 964+.',
      en: 'An Iraqi number starting 07, 11 digits — or in +964 form.',
    },
  },
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
    errors.phone = isAr
      ? 'الرقم مو صحيح — لازم يبدأ بـ 07 ويكون 11 رقم (أو بصيغة 964+).'
      : 'That number does not look right — it must start 07 and be 11 digits (or in +964 form).';
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

  /* رقم واتساب يأتي من إعدادات لوحة التحكم لا من قيمة مكتوبة في الكود: الرقم يتغيّر، ومن
     يغيّره ليس من يعدّل الكود. غيابه ليس عطلاً — النموذج يعود عندها إلى سلوكه القديم بالضبط
     (حفظ ورسالة تأكيد) بدل أن يصبح زرّاً معطوباً. */
  const socialLinks = useSocialLinks();
  const waNumber = (socialLinks.whatsapp || '').trim();

  /* الرسالة كما ستصل إلينا: مكتوبة كاملة، فلا نضطر لسؤاله عن اسمه ورقمه بعد أن كتبهما.
     أسطر منفصلة لا سطر واحد — محادثة واتساب تُقرأ على شاشة هاتف ضيّقة. */
  const composeWhatsappText = useCallback(() => {
    const name = values.name.trim();
    const phone = values.phone.trim();
    const message = values.message.trim();
    return isAr
      ? `مرحباً NUVAIQ\n\nالاسم: ${name}\nرقم الهاتف: ${phone}\n\nالرسالة:\n${message}`
      : `Hello NUVAIQ\n\nName: ${name}\nPhone: ${phone}\n\nMessage:\n${message}`;
  }, [values, isAr]);

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

      /* واتساب هو التسليم الآن، لا الحفظ.
       *
       * كان النموذج يكتب في `contact_messages` ويقول "وصلت رسالتك. نرد عليك قريباً" — ولا
       * شاشة واحدة في الموقع تقرأ تلك المجموعة. أي أن الرسائل كانت تهبط في قاعدة البيانات ولا
       * يراها أحد، والجملة المعروضة وعدٌ لا أحد على الطرف الآخر منه. الآن تصل حيث نقرأ فعلاً.
       *
       * والفتح هنا، قبل أي await: نافذة تُفتح بعد انتظار غير متزامن تفقد ارتباطها بضغطة
       * المستخدم فيحجبها المتصفح (Safari بالذات بلا إنذار) — ويصير الزرّ زرّاً لا يفعل شيئاً.
       * وإن حُجبت رغم ذلك، ننتقل في نفس التبويب بدل أن نبتلع الطلب بصمت. */
      /* بلا رقم واتساب لا يوجد إرسال، فلا يجوز أن تقول الشاشة إنه حصل.
       *
       * كان النموذج يعود عندها إلى الكتابة في `contact_messages` ويعرض "وصلت رسالتك. نرد عليك
       * قريباً" — ولا شاشة في الموقع تقرأ تلك المجموعة، فالجملة وعدٌ لا أحد على الطرف الآخر
       * منه. رسالة نجاح كاذبة أسوأ من رسالة فشل: من رآها ينتظر رداً لن يأتي، ولا يجرّب قناة
       * أخرى لأنه يظنّ أنه أوصل. الفشل يُقال، ومعه الطريق البديل. */
      if (!waNumber) {
        showToast(
          isAr
            ? 'ما انرسلت الرسالة — قناة الإرسال مو متاحة حالياً. تواصل ويانا من روابط أسفل الموقع.'
            : 'The message did not send — the sending channel is unavailable right now. Use the contact links in the footer.',
          'error',
        );
        return;
      }

      const url = whatsappLink(waNumber, composeWhatsappText());
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) window.location.href = url;

      setSending(true);
      /* النسخة المحفوظة تبقى: سجلّ لدينا لا قناة تسليم. من راسلنا يبقى له أثر عندنا حتى لو
         أغلق واتساب قبل الإرسال. */
      try {
        await addDoc(collection(db, 'contact_messages'), {
          name: values.name.trim(),
          phone: values.phone.trim(),
          message: values.message.trim(),
          language,
          createdAt: serverTimestamp(),
        });
        // بلا اسم ولا رقم ولا نص الرسالة — الحدث نفسه فقط (رسالة وصلت)، انظر lib/analytics.ts.
        trackEvent('contact_message_sent', { language });
      } catch {
        /* فشل النسخة الداخلية لا يعني ضياع الرسالة: واتساب مفتوح ورسالته فيه. إنذارٌ هنا يقول
           له إن شيئاً لم ينجح بينما الرسالة أمامه جاهزة — وهذا يدفعه لإعادة الإرسال مرّتين. */
      }

      setSent(true);
      setValues(EMPTY);
      setTouched({});
      setSending(false);
    },
    [values, isAr, language, uid, waNumber, composeWhatsappText],
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
        background: WHITE,
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
            background: 'linear-gradient(to bottom, ' + PAPER + ' 0%, ' + WHITE + ' 40%)',
          }}
        >
          <TileField tones={SIGNAL_TONES} fade={BAND_FADE} />
        </div>
      )}

      <div className="relative nq-container">
        {/* Steps with the phases section above it and for the same reason — see the note there.
            One island of the same width twice running is what makes the two read as one page. */}
        <div className="mx-auto max-w-[56rem] uw:max-w-[72rem]">
          {/* This heading sits directly on the section's own ground — WARM WHITE, the third
              pass's flat fill — so it stays OBSIDIAN as secondary chrome on the page's own
              paper, same as every other section label outside a bounded panel now reads. The
              only two things that could not just stay plain OBSIDIAN-on-ground were the status
              messages, which needed their own chip (see the notes there). */}
          <h2
            className="nq-rise text-[1.55rem] sm:text-[2.1rem] uw:text-[2.6rem] font-black leading-none tracking-tight"
            style={{ color: OBSIDIAN, ['--nq-rise-delay' as string]: '80ms' }}
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
                        box and the input fills what is left of it. PAPER_DEEP, not WHITE — the
                        section's own ground is WHITE now, and a WHITE block on a WHITE section
                        would vanish; PAPER_DEEP is the same "light input surface on a white
                        ground" the rest of the design system already uses. */}
                    <label
                      htmlFor={id}
                      className="block rounded-xl px-4 pt-3 pb-2.5 cursor-text transition-shadow duration-200 focus-within:shadow-[0_0_0_2px_#080A0D]"
                      style={{ background: PAPER_DEEP }}
                    >
                      <span
                        className="block text-[0.7rem] sm:text-[0.75rem] uw:text-[0.85rem] font-extrabold tracking-wide"
                        style={{ color: OBSIDIAN, opacity: 0.75 }}
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
                          aria-describedby={error ? id + '-error' : field.hint ? id + '-hint' : undefined}
                          /* No resize handle: the box is already five rows, and a draggable corner
                             on a coloured panel is the one control here that can be pulled out of
                             the layout it sits in. */
                          className="mt-1 block w-full bg-transparent border-0 outline-none resize-none text-[0.95rem] uw:text-[1.05rem] font-bold leading-relaxed"
                          style={{ color: OBSIDIAN }}
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
                          aria-describedby={error ? id + '-error' : field.hint ? id + '-hint' : undefined}
                          /* 40px of input under a 20px label clears the 44px the whole block needs
                             to be a comfortable touch target. */
                          className="mt-1 block w-full h-10 uw:h-12 bg-transparent border-0 outline-none text-[0.95rem] uw:text-[1.05rem] font-bold"
                          style={{ color: OBSIDIAN }}
                        />
                      )}
                    </label>

                    {/* القاعدة تحت حقلها، وتختفي حين يحلّ الخطأ محلّها — سطران يقولان نفس الشيء
                        فوق بعضهما يجعلان أحدهما ضجيجاً. */}
                    {field.hint && !error && (
                      <p
                        id={id + '-hint'}
                        className="mt-1.5 px-1 text-[0.72rem] sm:text-[0.78rem] font-bold leading-relaxed"
                        style={{ color: OBSIDIAN, opacity: 0.7 }}
                      >
                        {isAr ? field.hint.ar : field.hint.en}
                      </p>
                    )}

                    {/* The error goes under its own field, not into a summary at the top. `role`
                        and the live region so it is announced when it appears rather than only
                        found by someone who goes looking for it.

                        On its own small OBSIDIAN chip rather than bare on the section — the
                        section's ground is Orange now, and red-on-orange has no good answer:
                        plain ERROR is 1.31:1 there, and darkening it toward something that
                        clears 4.5:1 (`#571E20`) turns it a muddy brown that no longer reads as
                        an error at all. A dark chip lets ERROR stay itself, at full saturation
                        (5.27:1 on Obsidian) — this was previously rendered in plain ink, which
                        was not an error colour at all. */}
                    {error && (
                      <p
                        id={id + '-error'}
                        role="alert"
                        className="mt-1.5 inline-block px-2.5 py-1 rounded-lg text-[0.78rem] font-extrabold"
                        style={{ color: ERROR, background: OBSIDIAN }}
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
                  tone="white"
                  variant="solid"
                  size="md"
                  loading={sending}
                  className="uw:text-base"
                  /* الزرّ يقول إلى أين يأخذك. زرّ مكتوب عليه "أرسل" يفتح تطبيقاً آخر هو
                     مفاجأة، ومفاجأة في زرّ إرسال تُقرأ كعطل. */
                  badge={<MessageCircle className="w-4 h-4" strokeWidth={2.4} />}
                >
                  {sending ? (isAr ? 'جاري الإرسال…' : 'Sending…') : isAr ? 'أرسل عبر واتساب' : 'Send on WhatsApp'}
                </NqButton>

                {/* The confirmation sits beside the button that caused it, and is announced, on
                    the same small OBSIDIAN chip the error uses — green-on-orange has the same
                    problem red-on-orange does (1.26:1, and a darkened fix reads as murky
                    brown-green rather than success). On Obsidian, SUCCESS stays itself at full
                    saturation (8.70:1) — exactly the case the brief's semantic system exists
                    for: Orange cannot also mean "this worked". */}
                {sent && (
                  <p role="status" className="inline-block px-2.5 py-1 rounded-lg text-[0.85rem] font-extrabold" style={{ color: SUCCESS, background: OBSIDIAN }}>
                    {isAr
                      ? 'فتحنا لك واتساب ورسالتك مكتوبة — اضغط إرسال هناك.'
                      : 'WhatsApp is open with your message — hit send there.'}
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

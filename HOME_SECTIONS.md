# نظام بناء قسم الرئيسية (Home Sections Architecture)

## المبدأ الأساسي

كل قسم بصفحة الرئيسية يكون **component مستقل تماماً** — يمتلك `<section>` خاصة، عرض خاص، مسافات خاصة. ما فيش "wrapper مشترك" يحكم الفواصل بين الأقسام.

## القاعدة الثابتة

### 1. كل قسم = ملف component

ملف جديد: `src/components/<SectionName>.tsx`

```tsx
import React from 'react';
import { Language } from '../lib/i18n';

interface SectionNameProps {
  language?: Language;
}

export const SectionName: React.FC<SectionNameProps> = ({ language = 'ar' }) => {
  return (
    <section id="section-name-section" className="relative py-20 sm:py-32">
      <div className="nq-container">
        {/* محتوى القسم */}
      </div>
    </section>
  );
};
```

### 2. كل قسم يملك:

- **`<section>`** — لازم موجودة، مو بديل عنها
- **`.nq-container`** — العرض المشترك بالموقع (`max-width: min(100vw, 80rem)`)
  - لو تريد عرض مختلف: انحراف **داخل الـ component نفسه**، ما تسرب لـ `App.tsx`
- **`py-*`** — مسافة عمودية خاصة على الـ `<section>` (مثال: `py-20 sm:py-32`)
  - هذا القيمة تنحدد وقت تصميم كل قسم — ما فيش رقم موحد

### 3. استيراد في App.tsx

أضفها **static import** (مثل `AboutSection` و `MilestoneTimeline` الموجودة):

```tsx
import { SectionName } from './components/SectionName';
```

ثم استخدمها بـ `home` branch:

```tsx
{activePage === 'home' && (
  <div className="page-in">
    <SectionName language={language} />
    {/* قسم ثاني هنا ... */}
  </div>
)}
```

## المسافات بين الأقسام

**ما فيش class تحكم الفواصل من برا** — كل فاصل = `py` السفلي للقسم + `py` العلوي للقسم اللي بعده.

مثال:
- قسم 1: `py-20 sm:py-32`
- قسم 2: `py-16 sm:py-28`
- الفاصل بينهم = 32px + 28px (mobile) أو أكثر (tablet/desktop)

إذا تريد تعديل الفاصل: عدّل `py-*` على القسم الواحد بس.

## القسم الأول: `min-h-screen`

**أول قسم بالصفحة الرئيسية لازم يملأ الشاشة كاملة:**

```tsx
<section id="hero-section" className="relative py-20 sm:py-32 lg:min-h-screen lg:flex lg:items-center">
```

هذا بزيادة على الـ `py-*` (ما بديل عنها). النتيجة: أول شاشة يشوفها الزائر تكون هذا القسم لحاله، والقسم اللي بعده ما يبين إلا بعد scroll.

## ما تنسخوا

- التعليقات القديمة اللي تقول "بدون padding، الأب يحدد المسافة" — هذا نظام قديم انحذفنا منه
- `space-y-*` أو `gap-y-*` على wrapper الخارجي — هذا الفخ اللي نتجنبه

## مثال فعلي

قسم "من نحن" (موجود بالفعل):

```tsx
// src/components/AboutSection.tsx
export const AboutSection: React.FC<AboutSectionProps> = ({ language = 'ar' }) => {
  return (
    <section className="relative py-24 sm:py-40">
      <div className="nq-container">
        {/* محتوى من نحن */}
      </div>
    </section>
  );
};
```

في `App.tsx`:

```tsx
{activePage === 'home' && (
  <div className="page-in">
    <AboutSection language={language} />
  </div>
)}
```

---

**آخر تحديث:** 15 أغسطس 2026

**متطلب من:** إعادة هيكلة الصفحة الرئيسية لفصل الأقسام بشكل مستقل

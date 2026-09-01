import React from 'react';
import { PageLoader } from './PageLoader';
import { useDelayedVisible } from '../lib/useDelayedVisible';

/**
 * شاشة التحميل، لكن فقط إن استحقّت الظهور.
 *
 * تُركَّب في فرع "ما زلنا ننتظر" فتبقى صامتة تماماً طوال العتبة الأولى؛ إن حُسم الانتظار قبلها
 * (وهو الحال الغالب: جلسة مستعادة من الجهاز، أو قراءة واحدة من Firestore) لا يرى المستخدم شيئاً
 * ولا يشعر بأن هناك تحميلاً أصلاً. وإن طال، تظهر لتقول إن العمل جارٍ لا معطَّل.
 */
export const DeferredPageLoader: React.FC<{ delayMs?: number }> = ({ delayMs }) => {
  const visible = useDelayedVisible(true, delayMs);
  return visible ? <PageLoader /> : null;
};

import React, { useEffect, useState } from 'react';
import { subscribeLoads } from '../lib/loadTracker';
import { PageLoader } from './PageLoader';
import { useDelayedVisible } from '../lib/useDelayedVisible';

/**
 * The one smart loader the whole app uses.
 *
 * It renders the full-screen PageLoader only while the shared counter (loadTracker) is non-zero —
 * that is, only while a lazy chunk is genuinely being downloaded. When every pending import has
 * resolved the counter returns to zero and this renders nothing, so a cached page (one whose
 * chunks were fetched before) never flashes a loader at all.
 *
 * وفوق ذلك عتبة زمنية: حتى حين ينزل جزء فعلاً، إن انتهى تنزيله بسرعة (اتصال جيد، ملف صغير،
 * أو تحميل مسبق في وقت الخمول) لا تظهر أي شاشة. الدوّارة لا تُعرَض إلا لانتظار يستحق أن
 * يُقال للمستخدم عنه شيء — انظر useDelayedVisible.
 */
export const SmartPageLoader: React.FC = () => {
  const [pending, setPending] = useState(0);

  useEffect(() => subscribeLoads(setPending), []);

  const visible = useDelayedVisible(pending > 0);

  if (!visible) return null;

  return <PageLoader />;
};
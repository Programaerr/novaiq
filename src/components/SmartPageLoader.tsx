import React, { useEffect, useState } from 'react';
import { subscribeLoads } from '../lib/loadTracker';
import { PageLoader } from './PageLoader';

/**
 * The one smart loader the whole app uses.
 *
 * It renders the full-screen PageLoader only while the shared counter (loadTracker) is non-zero —
 * that is, only while a lazy chunk is genuinely being downloaded. When every pending import has
 * resolved the counter returns to zero and this renders nothing, so a cached page (one whose
 * chunks were fetched before) never flashes a loader at all. "Needed" is decided by the network,
 * not by a timer.
 */
export const SmartPageLoader: React.FC = () => {
  const [pending, setPending] = useState(0);

  useEffect(() => subscribeLoads(setPending), []);

  if (pending <= 0) return null;

  return <PageLoader />;
};
import { useEffect } from 'react';

/**
 * Declares `<html data-{flag}>` for exactly as long as the calling component is mounted, and
 * removes it on unmount.
 *
 * The point is to let a *page* switch off site-wide chrome it is covering anyway. That chrome
 * (the cosmic background above all) is mounted once in App.tsx for the whole session and knows
 * nothing about which page is on top of it, so it cannot decide on its own to stop — but a
 * page that fills the viewport with its own opaque surface can say so, and one CSS rule keyed
 * on the flag then takes the hidden layers out of rendering entirely. See `html[data-demo]`
 * and `html[data-flat]` in index.css.
 *
 * Set from the component that *is* the page rather than from its call site: a page reached
 * from more than one route (a template demo is both a `?preview=` page and a modal) would
 * otherwise need the same declaration repeated at each entry point, where it can fall out of
 * step. Declared here, it cannot.
 */
export function useDocumentFlag(flag: string): void {
  useEffect(() => {
    document.documentElement.dataset[flag] = 'true';
    return () => {
      delete document.documentElement.dataset[flag];
    };
  }, [flag]);
}

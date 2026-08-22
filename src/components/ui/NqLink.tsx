import React from 'react';
import {
  NqContent,
  useNqSurface,
  type NqRadius,
  type NqSize,
  type NqTone,
  type NqVariant,
} from './nqSurface';

/**
 * The site's button, as a link.
 *
 * Identical to NqButton in every visible respect — same tones, same sizes, same cube field on the
 * same pointer — and a different element, which is the whole reason it exists. A thing that takes
 * you somewhere has to be an `<a href>`: it is announced as a link, it opens in a new tab on
 * middle-click or ⌘-click, and the browser shows the destination on hover. A `<button>` styled to
 * look like it does none of that.
 *
 * So the choice between the two is never about appearance. If pressing it changes the URL, it is
 * this one.
 */

type Native = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'className' | 'style' | 'children'
>;

export interface NqLinkProps extends Native {
  children: React.ReactNode;
  href: string;
  tone?: NqTone;
  variant?: NqVariant;
  size?: NqSize;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  block?: boolean;
  /** Pill by default; `xl` for a row of buttons inside a rounded card. */
  radius?: NqRadius;
  /** Layout and spacing only — a background here fights the tone. */
  className?: string;
  /** Renders as a link that goes nowhere: greyed, not focusable, and the press is swallowed.
      `<a>` has no `disabled`, so it is spelled with aria and a guard rather than pretended. */
  disabled?: boolean;
  tileSurface?: string;
  tiles?: boolean;
}

export const NqLink = React.forwardRef<HTMLAnchorElement, NqLinkProps>(function NqLink(
  {
    children,
    href,
    tone = 'chrome',
    variant = 'solid',
    size = 'md',
    icon,
    badge,
    trailing,
    block = false,
    radius = 'full',
    className = '',
    disabled = false,
    tileSurface,
    tiles = true,
    onClick,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onFocus,
    onBlur,
    ...rest
  },
  forwardedRef,
) {
  const surface = useNqSurface(
    {
      tone,
      variant,
      size,
      tiles,
      tileSurface,
      block,
      radius,
      inert: disabled,
      loading: false,
      hasBadge: Boolean(badge),
      className,
    },
    forwardedRef as never,
  );

  const h = surface.handlers;

  return (
    <a
      ref={h.ref as React.Ref<HTMLAnchorElement>}
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      // Out of the tab order when disabled. Without this a link with no href is still focusable
      // and still announced, which is a control that takes focus and then does nothing.
      tabIndex={disabled ? -1 : undefined}
      data-tone={tone}
      data-variant={variant}
      className={surface.className}
      style={surface.style}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      onPointerEnter={(e) => { onPointerEnter?.(e); h.onPointerEnter(e); }}
      onPointerMove={(e) => { onPointerMove?.(e); h.onPointerMove(e); }}
      onPointerLeave={(e) => { onPointerLeave?.(e); h.onPointerLeave(e); }}
      onPointerDown={(e) => { onPointerDown?.(e); h.onPointerDown(e); }}
      onPointerUp={(e) => { onPointerUp?.(e); h.onPointerUp(e); }}
      onPointerCancel={(e) => { onPointerCancel?.(e); h.onPointerCancel(e); }}
      onFocus={(e) => { onFocus?.(e); h.onFocus(e); }}
      onBlur={(e) => { onBlur?.(e); h.onBlur(e); }}
      {...rest}
    >
      {surface.tiles}
      <NqContent surface={surface} icon={icon} trailing={trailing} badge={badge}>
        {children}
      </NqContent>
    </a>
  );
});

export default NqLink;

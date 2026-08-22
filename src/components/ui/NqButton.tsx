import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  NqContent,
  useNqSurface,
  type NqRadius,
  type NqSize,
  type NqTone,
  type NqVariant,
} from './nqSurface';

export type { NqRadius, NqSize, NqTone, NqVariant } from './nqSurface';

/**
 * The site's button.
 *
 * Everything visual lives in `useNqSurface`, which NqLink shares — see the note there for the
 * three button systems this replaces and what they disagreed about. What is left here is the part
 * that is specific to a `<button>`: `type`, `disabled`, and the busy state.
 *
 * Use this for anything that ACTS. For anything that NAVIGATES, use NqLink.
 */

type Native = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style' | 'type' | 'children'
>;

export interface NqButtonProps extends Native {
  children: React.ReactNode;
  /** Which of the site's grounds this button is standing on. */
  tone?: NqTone;
  /** How much of the screen's attention it is asking for. */
  variant?: NqVariant;
  size?: NqSize;
  /** A leading icon, before the label in reading order — whichever direction that is. */
  icon?: React.ReactNode;
  /** A trailing glyph in a filled circle: the site's existing "action" affordance, on the hero,
      the contact form and the templates grid. */
  badge?: React.ReactNode;
  /** A plain trailing icon, no circle. */
  trailing?: React.ReactNode;
  /** Swaps `icon` for a spinner, sets `aria-busy`, and blocks the press. */
  loading?: boolean;
  block?: boolean;
  /** Pill by default; `xl` for a row of buttons inside a rounded card. */
  radius?: NqRadius;
  /** Layout and spacing only — a background here fights the tone. */
  className?: string;
  /**
   * Defaults to `button`. Spelled out because the HTML default is `submit`, so a button inside a
   * form that nobody gave a type to is a form that submits when you press "cancel" — which was
   * true of seventeen buttons in this codebase before this component existed.
   */
  type?: 'button' | 'submit' | 'reset';
  tileSurface?: string;
  tiles?: boolean;
}

export const NqButton = React.forwardRef<HTMLButtonElement, NqButtonProps>(function NqButton(
  {
    children,
    tone = 'chrome',
    variant = 'solid',
    size = 'md',
    icon,
    badge,
    trailing,
    loading = false,
    block = false,
    radius = 'full',
    className = '',
    type = 'button',
    tileSurface,
    tiles = true,
    disabled,
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
  const inert = Boolean(disabled) || loading;

  const surface = useNqSurface(
    {
      tone,
      variant,
      size,
      tiles,
      tileSurface,
      block,
      radius,
      inert,
      loading,
      hasBadge: Boolean(badge),
      className,
    },
    forwardedRef as never,
  );

  const h = surface.handlers;

  return (
    <button
      ref={h.ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={inert}
      aria-busy={loading || undefined}
      data-tone={tone}
      data-variant={variant}
      className={surface.className}
      style={surface.style}
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
      <NqContent
        surface={surface}
        loading={loading}
        icon={icon}
        trailing={trailing}
        badge={badge}
        spinner={
          <Loader2 className={`${surface.size.icon} animate-spin shrink-0`} aria-hidden="true" />
        }
      >
        {children}
      </NqContent>
    </button>
  );
});

export default NqButton;

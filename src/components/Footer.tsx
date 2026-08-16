import React from 'react';
import { Language } from '../lib/i18n';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
}

// Emptied deliberately: the brand column, link lists, feature bullets and bottom bar that used
// to fill this (logo, social icons, privacy/terms buttons) are gone. `onNavigate` stays in the
// props even though nothing here calls it — App.tsx still passes it in, and dropping the prop
// would be a second, unrelated change to that call site for no benefit while the tag is empty.
export const Footer: React.FC<FooterProps> = ({ language: _language, onNavigate: _onNavigate }) => {
  return <footer className="relative mt-24 sm:mt-40 pb-10 text-xs text-zinc-400 z-20" />;
};

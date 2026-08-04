import React from 'react';

interface PriceInputProps {
  value: string;
  onChange: (rawDigits: string) => void;
  className?: string;
  placeholder?: string;
}

// A price field a human types into needs live thousand-separator commas to be readable —
// type="number" can't display commas at all (the browser strips anything non-numeric).
// Keeps the underlying value as plain digits (what callers already expect, e.g.
// Number(value)) and only formats what's shown in the box.
export const PriceInput: React.FC<PriceInputProps> = ({ value, onChange, className, placeholder }) => {
  const displayValue = value ? Number(value.replace(/\D/g, '')).toLocaleString() : '';
  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      className={className}
      placeholder={placeholder}
      dir="ltr"
    />
  );
};

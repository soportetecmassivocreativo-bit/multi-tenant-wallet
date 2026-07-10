"use client";

import { useEffect, useState } from "react";

/** Deja solo dígitos y un punto decimal. */
function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/**
 * Campo numérico que evita el "0" pegado adelante (0 se muestra vacío) y
 * admite decimales sin romper el tipeo (ej. "0.5"). Emite el número por onValueChange.
 */
export function MoneyInput({
  value,
  onValueChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: number;
  onValueChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(() => (value ? String(value) : ""));

  // Sincroniza cuando el valor externo cambia por otra razón (reset o editar),
  // no mientras el usuario escribe (ahí `value` ya coincide con el texto).
  useEffect(() => {
    if (Number(text || 0) !== value) setText(value ? String(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const t = sanitize(e.target.value);
        setText(t);
        onValueChange(Number(t) || 0);
      }}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
    />
  );
}

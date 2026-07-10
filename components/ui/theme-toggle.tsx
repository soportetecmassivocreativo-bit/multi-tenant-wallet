"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@/components/ui/icons";

/** Botón que alterna entre modo claro y oscuro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const base =
    "grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition active:scale-95";

  if (!mounted) {
    // Evita el desajuste de hidratación mostrando un contenedor neutro.
    return <span className={`${base} ${className ?? ""}`} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`${base} ${className ?? ""}`}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}

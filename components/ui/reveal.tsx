"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Anima la entrada de sus hijos directos con un stagger fluido (GSAP).
 * Uso: <Reveal>{items.map(...)}</Reveal>
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 14,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.from(Array.from(el.children), {
        y,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.07,
        delay,
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

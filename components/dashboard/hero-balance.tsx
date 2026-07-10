"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/lib/currency";

/** Saldo héroe con animación de conteo (count-up) al montar. */
export function HeroBalance({
  value,
  currency = "USD",
}: {
  value: number;
  currency?: CurrencyCode;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;
      const counter = { v: 0 };
      gsap.to(counter, {
        v: value,
        duration: 1.2,
        ease: "power3.out",
        onUpdate: () => {
          node.textContent = formatMoney(counter.v, currency);
        },
      });
    },
    { dependencies: [value, currency] },
  );

  return (
    <p
      ref={ref}
      className="tnum mt-1 text-[38px] font-medium leading-none tracking-tight"
    >
      {formatMoney(0, currency)}
    </p>
  );
}

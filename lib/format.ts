import { formatCurrency, type CurrencyCode } from "@/lib/currency";

/** Monto con símbolo, sin decimales (para dashboard y listas). "$284.750" */
export function formatMoney(value: number, code: CurrencyCode = "USD"): string {
  return formatCurrency(value, code, 0);
}

const nf = new Intl.NumberFormat("es-VE");

/** Delta con signo unicode: 18500 → "+18.500", -2400 → "−2.400". */
export function formatSigned(value?: number | null): string {
  const safe = typeof value === "number" && !isNaN(value) ? value : 0;
  const sign = safe < 0 ? "−" : "+";
  return `${sign}${nf.format(Math.abs(Math.round(safe)))}`;
}

/** Número plano con separadores de miles. */
export function formatNumber(value?: number | null): string {
  const safe = typeof value === "number" && !isNaN(value) ? value : 0;
  return nf.format(Math.round(safe));
}

/** Fecha ISO (yyyy-mm-dd o timestamp ISO) → "22/09/2026" (DD/MM/YYYY) */
export function formatDate(iso?: string | null): string {
  if (!iso || typeof iso !== "string") return "";
  try {
    const clean = iso.trim().split("T")[0].split(" ")[0];
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [y, m, d] = parts;
      const dd = String(d).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const yyyy = String(y);
      return `${dd}/${mm}/${yyyy}`;
    }
    const fallbackDate = new Date(iso);
    if (!isNaN(fallbackDate.getTime())) {
      const dd = String(fallbackDate.getDate()).padStart(2, "0");
      const mm = String(fallbackDate.getMonth() + 1).padStart(2, "0");
      const yyyy = String(fallbackDate.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    }
    return clean || iso;
  } catch {
    return iso || "";
  }
}

/**
 * Extrae y limpia el concepto general / título del proyecto y las notas adicionales,
 * eliminando cualquier repetición de corchetes anidados o duplicados.
 */
export function cleanConceptAndNotes(raw?: string | null): {
  title: string;
  notes: string;
  cleanText: string;
} {
  if (!raw || typeof raw !== "string") {
    return { title: "", notes: "", cleanText: "" };
  }

  // 1. Quitar metadatos de cuentas
  let text = raw
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/\[Cuenta Prevista:.*?\]/gi, "")
    .replace(/\[Cuenta:.*?\]/gi, "")
    .trim();

  // 2. Extraer todos los fragmentos entre corchetes
  const bracketMatches = Array.from(text.matchAll(/\[(.*?)\]/g))
    .map((m) => m[1].replace(/[\[\]]/g, "").trim())
    .filter(Boolean);

  // 3. Obtener el texto base sin corchetes
  const cleanBase = text
    .replace(/\[.*?\]/g, "")
    .replace(/[\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 4. Deduplicar los bloques
  const uniqueBrackets = Array.from(new Set(bracketMatches));

  let title = "";
  let extraNotes = "";

  if (uniqueBrackets.length > 0) {
    title = uniqueBrackets[0];
    if (uniqueBrackets.length > 1) {
      extraNotes = uniqueBrackets.slice(1).join("\n");
    }
  } else if (cleanBase) {
    const lines = cleanBase.split("\n").map((l) => l.trim()).filter(Boolean);
    title = lines[0] || "";
    if (lines.length > 1) {
      extraNotes = lines.slice(1).join("\n");
    }
  }

  return {
    title: title.replace(/[\[\]]/g, "").trim(),
    notes: extraNotes.replace(/[\[\]]/g, "").trim(),
    cleanText: cleanBase || title,
  };
}

/**
 * Limpia la descripción de un ítem removiendo cualquier corchete o metadato anidado.
 */
export function cleanItemDescription(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/\[Cuenta Prevista:.*?\]/gi, "")
    .replace(/\[Cuenta:.*?\]/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


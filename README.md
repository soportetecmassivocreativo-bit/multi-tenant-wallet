# 💳 M-Wallet

Web app **móvil-first** de finanzas, cobros, facturación y nómina.
Aesthetic: *Editorial Minimal Fintech* — ver [`docs/M-Wallet-Diseno.md`](docs/M-Wallet-Diseno.md).

## Stack
- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de diseño en `app/globals.css`)
- **GSAP 3** + `@gsap/react` (animaciones fluidas)
- Datos: **Supabase** (Fase 1 — hoy con datos mock en `lib/mock-data.ts`)

## Arrancar
```bash
npm install
npm run dev
```
Abre http://localhost:3000 → redirige a `/dashboard`.

## Estructura (scaffold actual)
```
app/
  layout.tsx            # fuentes (Instrument Serif + Geist) + metadata PWA
  page.tsx              # → redirige a /dashboard
  globals.css           # Tailwind v4 + tokens de color/tipografía
  (app)/
    layout.tsx          # app shell móvil (columna centrada + nav flotante)
    template.tsx        # transición de página (fade GSAP)
    dashboard/          # 📊 inicio: saldo, gráfico, movimientos (animado)
    cobros/ buscar/ mas/ # stubs con estilo
components/
  layout/               # bottom-nav (barra flotante + botón ＋ animado)
  dashboard/            # hero-balance (count-up), mini-line-chart (draw-in), etc.
  ui/                   # icons (línea fina), reveal (stagger GSAP)
lib/                    # mock-data, format, nav
```

## Documentación
- [`docs/M-Wallet-Concepto.md`](docs/M-Wallet-Concepto.md) — visión, módulos, roadmap.
- [`docs/M-Wallet-Diseno.md`](docs/M-Wallet-Diseno.md) — sistema de diseño y tokens.

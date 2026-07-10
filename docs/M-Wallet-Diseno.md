# 🎨 M-Wallet — Sistema de Diseño

> Dirección visual del producto, derivada de las referencias aprobadas por el usuario.
> **Aesthetic:** *Editorial Minimal Fintech* — monocromo + un acento, números héroe, serif editorial, navegación flotante.
> **Fecha:** 2026-07-10 · Basado en las skills `design-taste-frontend` + `high-end-visual-design`.

---

## 1. Design Read (de las referencias)

**"App de finanzas premium consumer, con lenguaje editorial-minimalista (Linear/Apple + tipografía de revista), monocroma con un solo acento, apoyada en números gigantes y navegación flotante."**

**ADN extraído de las 4 referencias:**
1. Base **monocroma** + **un solo color de acento**.
2. **Número héroe gigante** = el dato principal manda en cada pantalla.
3. **Serif editorial** en títulos/etiquetas + **grotesca** en cifras y UI.
4. **Densidad baja** (galería): mucho aire, tarjetas suaves, sin bordes duros.
5. **Navegación flotante** con botón central **＋**.
6. **Gráficos mínimos**: líneas finas, sin ruido.

### Dials (design-taste-frontend)
```
DESIGN_VARIANCE:  5   (simetría calmada, no caótica)
MOTION_INTENSITY: 4   (sutil, preciso, con física)
VISUAL_DENSITY:   3   (aireado, tipo galería)
```

---

## 2. Color

Base **monocroma cálida** + acento **azul índigo**. Todo debe funcionar en claro y oscuro.

### Neutros (cálidos)
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--ink` | `#14151A` | `#F4F4F2` | Texto principal |
| `--muted` | `#6B6C70` | `#A0A0A5` | Texto secundario |
| `--hint` | `#9A9B9F` | `#6E6F74` | Captions, placeholders |
| `--page` | `#FAFAF8` | `#0B0B0C` | Fondo de página (off-white cálido) |
| `--card` | `#FFFFFF` | `#17181B` | Tarjetas / superficies |
| `--soft` | `#F2F1EC` | `#202124` | Relleno suave (chips, mini-cards) |
| `--line` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.10)` | Hairlines |

### Acento — Azul índigo
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--accent` | `#3B5BDB` | `#5B78E8` | Botón ＋, estados activos, línea del chart |
| `--accent-strong` | `#2F49B0` | `#3B5BDB` | Hover / pressed |
| `--accent-bg` | `#EBEEFB` | `#1C2440` | Fondo de pills/badges de acento |
| `--accent-text` | `#24379A` | `#B9C6F5` | Texto sobre `--accent-bg` |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | Texto/icono sobre `--accent` |

### Semánticos (uso mínimo, solo para estado)
| Rol | Color | Uso |
|---|---|---|
| Ingreso / pagado | `#1D9E75` | Montos cobrados (verde sobrio) |
| Pendiente / por vencer | `#BA7517` | Ámbar, avisos de vencimiento |
| Vencido / gasto | `#D8402F` | Rojo sobrio, solo para alertas reales |

> Regla: el color se usa con **cuentagotas**. El 90% de la UI es tinta sobre papel; el índigo y los semánticos aparecen solo donde aportan significado.

---

## 3. Tipografía

Emparejamiento **serif editorial + grotesca**. **Prohibidos:** Inter, Roboto, Arial, Helvetica, Open Sans.

| Rol | Fuente | Notas |
|---|---|---|
| **Display / Serif** | **Instrument Serif** (alt: Fraunces) | Títulos de sección, etiquetas ("Saldo · julio", "Hoy"). Elegante, alto contraste, editorial. |
| **UI / Grotesca** | **Geist** (alt: Plus Jakarta Sans) | Botones, listas, navegación, formularios. |
| **Cifras** | **Geist** con `font-variant-numeric: tabular-nums` | Montos alineados en columnas. **Obligatorio** en tablas y listas de dinero. |

Escala (móvil): número héroe 34–40px/500 · H-serif 15–18px · cuerpo 13–14px/400 · caption 11–12px. Todo en **sentence case**, nunca TODO MAYÚSCULAS (salvo micro-eyebrows con `tracking` amplio).

---

## 4. Componentes clave

- **Número héroe:** el dato principal (saldo, total) es lo más grande de la pantalla. `letter-spacing: -1.5px`, tabular-nums.
- **Tarjetas suaves:** fondo `--card` o `--soft`, radio **20–24px**, sin borde duro ni sombra pesada; a lo sumo hairline `--line`. Opción "doble bisel" para tarjetas premium (contenedor + núcleo con radios concéntricos).
- **Pills / tags:** `border-radius: 999px`, `padding: 4px 11px`, texto 11px. Acento = `--accent-bg` + `--accent-text`; neutro = hairline.
- **Barra de navegación flotante:** píldora **desprendida** del borde (`left/right: 18px; bottom: 16px`), `border-radius: 999px`, sombra difusa suave, con **botón central ＋** en `--accent` (menú rápido: nueva factura · cobro · gasto · cliente).
- **Iconografía:** línea ultra-fina (**Phosphor Light** / Remix Line). Nada de Lucide/Material grueso.
- **Gráficos:** líneas de 2–2.5px, baseline punteada, marcador vertical discontinuo; una línea neutra + una en `--accent`. Sin rejillas ni ruido.

---

## 5. Motion

- Curva estándar: `cubic-bezier(0.32, 0.72, 0, 1)`. **Nunca** `linear` ni `ease-in-out` por defecto.
- Duraciones: 200ms (micro), 400–700ms (transiciones de vista/sheets).
- El botón ＋ y los *bottom sheets* abren con física de resorte; hamburguesa/acciones con morph fluido.
- Respetar `prefers-reduced-motion`.

---

## 6. Reglas móviles (universales)

- Alturas de sección con `min-h-[100dvh]` (evita salto de Safari iOS).
- Bajo `768px`: todo colapsa a `w-full`, sin rotaciones ni solapamientos que rompan objetivos táctiles (≥44px).
- Montos con teclado numérico; gestos (deslizar factura → cobrar/anular, pull-to-refresh).

---

## 7. Anti-patrones (rechazo automático)

- ❌ Gradientes morados de IA, glassmorphism en todo, mesh de fondo.
- ❌ Inter/Roboto; iconos gruesos; bordes 1px gris genérico; sombras duras (`shadow-md`, `rgba(0,0,0,.3)`).
- ❌ 3 tarjetas iguales, navbar pegado edge-to-edge, transiciones instantáneas.
- ❌ Uso decorativo del color: el acento **solo** donde significa algo.

---

## 8. Traducción a Tailwind (referencia para Fase 1)

```js
// tailwind.config — extend.colors
ink:    { DEFAULT: '#14151A', muted: '#6B6C70', hint: '#9A9B9F' },
paper:  { DEFAULT: '#FAFAF8', card: '#FFFFFF', soft: '#F2F1EC' },
accent: { DEFAULT: '#3B5BDB', strong: '#2F49B0', bg: '#EBEEFB', text: '#24379A' },
// fontFamily
serif:  ['"Instrument Serif"', 'serif'],
sans:   ['Geist', 'system-ui', 'sans-serif'],
```
Fuentes vía Google Fonts: `Instrument Serif`, `Geist` (y `Fraunces` como alterna).

---

*Documento vivo. Estos tokens alimentan el scaffold de la Fase 1.*

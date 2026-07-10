# 💳 M-Wallet — Documento de Concepto

> Sistema web app de gestión financiera **móvil-first** (sin limitar el uso en tablet/PC).
> **Estado:** Fase 0 — Concepto e idea del proyecto.
> **Fecha:** 2026-07-10 · **Autor:** Massivo Creativo

---

## 1. Visión

**M-Wallet** es el centro de operaciones financieras de un negocio en la palma de la mano. Reúne en un solo lugar lo que hoy vive disperso entre Excel, apps de banco, WhatsApp y libretas: **cobrar, facturar, pagar nómina, controlar clientes y empresas, y encontrar cualquier movimiento de dinero en segundos.**

**Frase de producto:**
> *"Factura, cobra y paga desde el teléfono. M-Wallet piensa el cobro por ti."*

### Problema que resuelve
- Facturas hechas a mano, con errores de impuestos y totales.
- No saber **cuánto te deben**, **quién está en mora** ni **cuándo te van a pagar**.
- Cálculos de cobro (impuestos, descuentos, recargos, moneda) lentos y propensos a error.
- Nómina calculada aparte, sin conexión con las finanzas del negocio.
- Imposible buscar "¿cuánto gasté/cobré en X?" sin revisar todo a mano.

### Diferenciador
El **cálculo de cobro inteligente** y el **buscador global**: no es solo un registro contable, es un asistente que sugiere precios, calcula todo automáticamente y predice el comportamiento de pago del cliente.

---

## 2. Usuarios y roles

| Rol | Qué hace en M-Wallet |
|---|---|
| **Dueño / Administrador** | Ve todo, crea empresas, configura impuestos, aprueba nómina. |
| **Cobrador / Vendedor** | Crea facturas y registra cobros desde el móvil en la calle. |
| **Contador / Finanzas** | Concilia pagos, revisa reportes, exporta para el fisco. |
| **Empleado** | Consulta su recibo de nómina (solo lectura de lo suyo). |

> Multi-empresa + multi-usuario desde el diseño (Supabase Auth + Row Level Security).

---

## 3. Módulos del sistema

```
┌──────────────────────────────────────────────────────────────┐
│                         M-WALLET                              │
├───────────────┬───────────────┬──────────────┬───────────────┤
│  📊 Finanzas   │  🧾 Cobros     │  👥 Clientes  │  🏢 Empresas   │
│  (Dashboard)   │  (Facturación) │              │               │
├───────────────┼───────────────┼──────────────┼───────────────┤
│  💸 Gastos     │  👔 Nómina     │  🧠 Cobro     │  🔎 Buscador   │
│               │               │  Inteligente  │   Global       │
└───────────────┴───────────────┴──────────────┴───────────────┘
```

### 3.1 📊 Finanzas (Dashboard)
Pantalla de inicio. Saldo, cuentas por cobrar, flujo de caja, ingresos vs. gastos del mes, próximos vencimientos, top clientes/deudores.

### 3.2 🧾 Cobros — Creación de factura
- Crear factura en segundos: cliente → productos/servicios → impuestos y totales automáticos.
- Estados: **borrador · enviada · pagada · parcial · vencida · anulada**.
- Envío por WhatsApp / email / PDF / enlace de pago.
- Registro de cobros (pagos totales o parciales) contra cada factura.

### 3.3 👔 Nómina
- Empleados con salario, deducciones y bonos.
- Cálculo automático del período (semanal/quincenal/mensual).
- Generación de recibos (payslips) y registro del gasto de nómina en Finanzas.

### 3.4 👥 Clientes
Ficha del cliente: datos fiscales, historial de facturas y pagos, saldo pendiente, **score de comportamiento de pago**, términos de crédito.

### 3.5 🏢 Empresas
Datos del emisor (multi-empresa): logo, identidad fiscal, impuestos por defecto, moneda, numeración de facturas, términos de crédito.

### 3.6 🧠 Cálculo de cobro inteligente
El motor que hace único a M-Wallet. Ver **Sección 6**.

### 3.7 🔎 Buscador global
Una sola búsqueda sobre **gastos y cobros** (y clientes, facturas, empresas). Ver **Sección 7**.

---

## 4. Enfoque móvil-first (responsive real)

El diseño parte del teléfono y **escala hacia arriba**, nunca al revés.

| Viewport | Layout |
|---|---|
| **Móvil (< 768px)** | Navegación inferior fija (bottom-nav) de 5 destinos + botón central "＋" para crear. Una columna, gestos, tarjetas apiladas. |
| **Tablet (768–1024px)** | Panel lateral colapsable + contenido en 2 columnas. |
| **PC (> 1024px)** | Sidebar completo + dashboard multi-columna tipo bento. |

**Navegación inferior (móvil):**
```
┌───────────────────────────────────────────┐
│                                           │
│              (contenido)                  │
│                                           │
├─────────┬─────────┬────┬────────┬─────────┤
│ 📊 Inicio│🧾 Cobros│ ＋ │🔎 Buscar│ ⋯ Más   │
└─────────┴─────────┴────┴────────┴─────────┘
```
El botón central **＋** abre un menú rápido: *Nueva factura · Registrar cobro · Nuevo gasto · Nuevo cliente*.

**Detalles técnicos móvil:**
- **PWA instalable** (se agrega a la pantalla de inicio, funciona a pantalla completa).
- Alturas con `min-h-[100dvh]` (evita el salto de la barra de Safari en iOS).
- Objetivos táctiles ≥ 44px, formularios con teclado numérico para montos.
- Gestos: deslizar factura para *cobrar / anular*, tirar para refrescar.
- Preparado para **offline** (lectura y borradores; sincroniza al reconectar) — Fase 3.

---

## 5. Arquitectura técnica

**Stack elegido:**
- **Frontend:** Next.js (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui**
- **PWA:** manifest + service worker
- **Backend/Datos:** **Supabase** (Postgres + Auth + Storage + Realtime + RLS)
- **Estado/datos:** TanStack Query (React Query) + Server Actions
- **Validación:** Zod · **Formularios:** React Hook Form
- **PDF/facturas:** generación de PDF y enlaces de pago

### Estructura de carpetas propuesta
```
finanzas-massivo/
├── app/
│   ├── (auth)/                 # login, registro, recuperar
│   ├── (app)/
│   │   ├── dashboard/          # 📊 Finanzas
│   │   ├── cobros/             # 🧾 facturas + pagos
│   │   ├── gastos/             # 💸
│   │   ├── clientes/           # 👥
│   │   ├── empresas/           # 🏢
│   │   ├── nomina/             # 👔
│   │   └── buscar/             # 🔎 buscador global
│   └── api/
├── components/
│   ├── ui/                     # shadcn
│   └── layout/                 # app-shell, bottom-nav
├── lib/
│   ├── supabase/               # cliente + queries + RLS helpers
│   ├── calc/                   # 🧠 motor de cálculo inteligente
│   └── search/                 # motor del buscador global
├── docs/                       # este documento
└── .claude/skills/             # skills de diseño instaladas
```

### Diagrama de arquitectura
```
  [ Móvil / Tablet / PC ]
           │  (PWA)
           ▼
  ┌─────────────────────┐        ┌──────────────────────┐
  │  Next.js (App Router)│ ─────▶ │  Supabase            │
  │  · UI shadcn/Tailwind│        │  · Postgres + RLS    │
  │  · Server Actions    │ ◀───── │  · Auth              │
  │  · lib/calc  lib/search│      │  · Storage (PDFs)    │
  └─────────────────────┘        │  · Realtime          │
                                 └──────────────────────┘
```

---

## 6. 🧠 Cálculo de cobro inteligente (el corazón)

No es solo "sumar productos". El motor (`lib/calc/`) calcula y sugiere:

| Función | Qué hace |
|---|---|
| **Impuestos automáticos** | IVA / ITBIS / impuestos configurables por empresa, cliente o producto. |
| **Descuentos** | Por línea, por total, o por *pronto pago* (ej. 5% si paga antes de X días). |
| **Recargos por mora** | Interés diario/mensual sobre el saldo vencido, aplicado automáticamente. |
| **Términos de crédito** | Contado / Net 15 / 30 / 60 → calcula la **fecha de vencimiento**. |
| **Multi-moneda (BCV)** | Facturar en US$ o € y convertir a **Bolívares** a la tasa **BCV** del día (referencia dólar o euro), editable. Muestra total en divisa + su conversión a Bs. |
| **Redondeo inteligente** | Redondeo configurable para evitar centavos incómodos. |
| **Sugerencia de precio** | Propone precio según el histórico del producto y el tipo de cliente. |
| **Predicción de pago** | *Score* del cliente → estima la **fecha probable de cobro** según su comportamiento histórico. |
| **Comisiones** | Comisión del vendedor/cobrador sobre lo cobrado. |

**Ejemplo de flujo:** eliges cliente y productos → el motor aplica su impuesto, su descuento de pronto pago y sus términos de crédito → muestra total, fecha de vencimiento y *"probable pago: ~12 días"*.

---

## 7. 🔎 Buscador global

Un solo campo (⌘K en PC / botón flotante en móvil) que busca en **todo el dinero del negocio**:

- **Fuentes:** facturas, cobros/pagos, **gastos**, clientes, empresas, nómina.
- **Filtros:** rango de fechas, estado (pagado/pendiente/vencido), monto (mín–máx), cliente, categoría, moneda, etiquetas.
- **Búsqueda difusa** (tolera errores de tipeo) y por etiquetas/notas.
- **Resultados agrupados** por tipo, con totales: *"Gastos de 'combustible' en junio: RD$ 12,400 en 8 movimientos."*
- **Acciones rápidas** desde el resultado: abrir, cobrar, exportar.

---

## 8. 🎨 Sistema de diseño

**Dirección aprobada:** *Editorial Minimal Fintech* — monocromo cálido + acento **azul índigo `#3B5BDB`**, números héroe, serif editorial (**Instrument Serif**) + grotesca (**Geist**), navegación flotante con botón central **＋**, densidad baja.

📄 **El sistema completo (tokens de color, tipografía, componentes, motion) vive en → [`M-Wallet-Diseno.md`](./M-Wallet-Diseno.md).**

> Derivado de las referencias del usuario con las skills `design-taste-frontend` + `high-end-visual-design`. La skill `imagegen-frontend-mobile` se usará para conceptos de pantalla y `brandkit` para el logo.

---

## 9. 🗺️ Roadmap por fases

| Fase | Entregable | Módulos |
|---|---|---|
| **0 — Concepto** ✅ | Este documento + skills de diseño instaladas | — |
| **1 — MVP** | Login, empresa + clientes, **facturación básica**, dashboard | 🏢 👥 🧾 📊 |
| **2 — Cobros y control** | Registro de pagos, **gastos**, **buscador global**, cálculo inteligente básico | 💸 🔎 🧠 |
| **3 — Nómina y offline** | Nómina + recibos, PWA offline, predicción de pago, reportes | 👔 📊 |
| **4 — Escala** | Multi-empresa avanzado, roles/permisos finos, exportación fiscal, enlaces de pago | 🔐 📤 |

---

## 10. ▶️ Próximos pasos sugeridos

1. **Definir identidad de marca** de M-Wallet (logo, color, tipografía) con la skill `brandkit`.
2. **Diseñar las pantallas móviles clave** (dashboard, nueva factura, buscador) con `imagegen-frontend-mobile`.
3. **Validar el modelo de datos** (Sección — ver `M-Wallet-Modelo-Datos.md`, se creará en Fase 1).
4. **Scaffold del proyecto** Next.js + Tailwind + shadcn/ui + Supabase (Fase 1).

---

*Documento vivo. Se actualizará conforme avance el proyecto.*

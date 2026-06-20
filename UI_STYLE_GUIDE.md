# UI/UX Style Guide & Roadmap — Ecommerce Nepal

Status: **proposal for review** (no code changed yet — see [[project-ecommerce-nepal-status]] in memory for build history).

## 0. Why this doc exists

The app today (30+ page/component files, audited 2026-06-20) works well functionally but was built page-by-page across many sessions, so visual details drifted:

- Card radius varies: `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl` used interchangeably for the same kind of element (compare `ProductsPage` cards = `rounded-lg` vs `AdminOrdersPage` table wrapper = `rounded-xl`).
- A shared `client/src/utils/ui.js` (`INPUT_CLASS`, `LABEL_CLASS`, `BUTTON_CLASS`) exists but is only used by the auth pages (`LoginPage`, `SignupPage`, etc.). `ProductsPage`, admin pages, `CheckoutPage`, `AddressesPage` all hand-roll the *same* input/button styling inline instead of importing it.
- Status badge colors (`STATUS_COLORS`, `PAYMENT_COLORS`) are redefined per-file (`AdminOrdersPage`, `AdminOrderDetailPage`, `AdminReturnsPage` each have their own copy) — easy for them to drift apart.
- Page heading style varies: `text-2xl font-bold`, `text-2xl font-semibold`, `text-xl font-bold` all appear for what is conceptually the same "page title" element.
- The storefront is light (`bg-gray-50`, white cards), but `AdminLayout` is a dark (`bg-gray-900`) sidebar — a deliberate split today, but worth a conscious decision rather than an accident, since the ask is consistency across **all** pages.
- No design tokens exist anywhere (no `tailwind.config.js` — this project uses Tailwind v4's CSS-first `@import "tailwindcss"` in `client/src/index.css` with zero customization), so every color/spacing value is a raw Tailwind utility chosen ad hoc per page.

None of this is broken — it's the natural result of "ship one module at a time." This doc defines the target system and the order to retrofit it in.

## 1. Design principles

1. **Light, airy, professional** — white/`gray-50` surfaces, dark-gray text (never pure black), one confident accent color, generous whitespace. No dark admin theme — admin gets the same light system, distinguished by layout (sidebar nav) not by color inversion.
2. **One accent, used sparingly** — Blue is the only brand color. It marks the single primary action per screen and active/selected states. Everything else is neutral gray + semantic state colors (success/warning/error/info).
3. **Consistency over novelty** — a button, input, card, or badge looks the same wherever it appears. New UI should reuse an existing primitive before inventing a new style.
4. **Quiet by default, clear when it matters** — low-emphasis chrome (borders, labels, helper text) so that prices, primary actions, and error/success states are what actually draws the eye.
5. **Accessible & responsive by default** — sufficient contrast, visible focus rings, 44px-ish tap targets on mobile, every page already has a mobile layout — this work should not regress that.

## 2. Design tokens

Tailwind v4 reads custom tokens from a CSS `@theme` block. Proposal: define them once in `client/src/index.css`, so every page that uses standard Tailwind color/spacing/radius utilities automatically inherits the system (no per-component imports needed for the raw values; components/constants still live in `utils/ui.js` for combined class strings).

### 2.1 Color

| Token | Hex | Use |
|---|---|---|
| `brand-50` | `#eff6ff` | subtle tinted backgrounds (selected filter chip, info banner) |
| `brand-100` | `#dbeafe` | hover backgrounds on light surfaces |
| `brand-500` | `#3b82f6` | secondary accent / icons |
| `brand-600` | `#2563eb` | **primary** — buttons, active nav, links, focus ring |
| `brand-700` | `#1d4ed8` | hover/active state of primary |
| `gray-50` … `gray-900` | Tailwind default gray scale | surfaces (`50`), borders (`200`), muted text (`400`/`500`), body text (`700`), headings (`900`) |
| `success-*` | green-50/100/600/700 | DELIVERED, PAID, in-stock, confirmation banners |
| `warning-*` | amber-50/100/600/700 | PENDING, low-stock, "action needed" |
| `danger-*` | red-50/100/600/700 | CANCELLED, FAILED, destructive actions, validation errors |
| `info-*` | indigo-50/100/600/700 | SHIPPED-in-transit type states, neutral informational badges |

This is already ~90% what the codebase does today (blue-600 primary, semantic reds/greens/ambers in the status maps) — the change is *naming it once* and using **one** consistent mapping everywhere instead of each page picking its own (e.g. today CONFIRMED is blue in one map and might not match elsewhere; PACKED is purple, SHIPPED is indigo — two different "in progress" colors for adjacent states with no rule for which is which).

Recommended consolidated status→color mapping (single source of truth, replacing every per-file `STATUS_COLORS`/`PAYMENT_COLORS` object):

- `PENDING` → warning · `CONFIRMED` → info · `PACKED` → info · `SHIPPED` → brand · `DELIVERED` → success · `CANCELLED` → danger
- Payment: `PENDING` → gray · `PAID` → success · `FAILED` → danger · `REFUNDED` → warning

### 2.2 Typography

Single font stack — keep the system default (`font-sans`, no webfont download needed, fastest for a Nepal-wide audience on mixed connection quality). One scale, reused everywhere:

| Role | Class | Where |
|---|---|---|
| Page title (H1) | `text-2xl font-bold text-gray-900` | one per page, top of content area |
| Section heading (H2) | `text-lg font-semibold text-gray-900` | card/section headers within a page |
| Card/Item title (H3) | `text-sm font-medium text-gray-900` | product card name, list row title |
| Body | `text-sm text-gray-700` | default paragraph/content text |
| Muted/helper | `text-xs text-gray-500` | timestamps, helper text, counts |
| Label | `text-sm font-medium text-gray-700 mb-1` | form field labels (already in `ui.js`) |
| Price | `text-sm font-semibold text-gray-900` (list) / `text-2xl font-bold text-gray-900` (detail page) | money is always semibold+, never the muted color |

### 2.3 Spacing & layout

- Page container: `px-4 sm:px-8 py-6` (already used in `ProductsPage`/admin pages) — adopt as the standard for every top-level page, instead of the current mix of `px-4 py-10`, `p-4 sm:p-8`, `max-w-md mx-auto px-4 py-10`.
- Narrow content (forms, auth): `max-w-md mx-auto` wrapper *inside* the standard page padding.
- Wide content (product grid, tables): full width up to a `max-w-7xl mx-auto` cap so it doesn't stretch unbounded on ultra-wide monitors (currently unbounded — `ProductsPage` grid runs edge-to-edge on a 4K screen).
- Vertical rhythm: `mb-6` between major page sections, `mb-4` between a heading and its content, `space-y-4` inside forms (already consistent).

### 2.4 Radius, borders, shadows

Pick one radius per element *category*, not per page:

| Element | Radius |
|---|---|
| Buttons, inputs, selects | `rounded-md` |
| Cards, panels, table wrappers | `rounded-lg` |
| Badges/pills/avatars | `rounded-full` |
| Modals | `rounded-xl` (slightly larger, reserved for overlays so they read as "elevated") |

Borders: `border border-gray-200` for resting cards, `border-gray-300` for interactive inputs (matches current convention — keep it). Shadows: reserve `shadow-sm`/`shadow-md` for hover states and modals only — flat by default, elevation only on interaction, which is already the instinct in `ProductCard`'s `hover:shadow-md`.

## 3. Core components (single source of truth)

Expand `client/src/utils/ui.js` from 3 constants into the full set below, and **migrate every page to import from it instead of inlining the same strings.** Where a component needs variants (not just a fixed class string), promote it to a tiny real component instead of a string constant — but keep it a thin wrapper, not a new abstraction layer (matches this codebase's existing low-abstraction style).

| Primitive | Today | Target |
|---|---|---|
| `Button` | inline classes per page, 3+ slightly different blue button strings, no shared danger/secondary variant | `<Button variant="primary\|secondary\|danger\|ghost" size="sm\|md">` or exported class constants `BUTTON_PRIMARY`, `BUTTON_SECONDARY`, `BUTTON_DANGER`, `BUTTON_GHOST` |
| `Input` / `Select` / `Textarea` | `INPUT_CLASS` exists, underused | keep, enforce usage everywhere (search box, price filters, checkout form, admin forms) |
| `Badge` (status pill) | redefined per admin page | one `<Badge status={...} kind="order\|payment\|return" />` reading the consolidated map in §2.1 |
| `Card` | ad hoc `bg-white border border-gray-200 rounded-lg` repeated everywhere | `CARD_CLASS` constant, or `<Card>` wrapper for padding+border+radius |
| `Pagination` | re-implemented per page (`ProductsPage`, `AdminOrdersPage` both hand-roll near-identical page-number buttons) | one `<Pagination page={} pages={} onChange={} />` |
| `FilterPill` / `FilterTab` | `CategoryPill` (ProductsPage) and `FilterTab` (AdminOrdersPage) are the same concept, different code | one shared pill component, two color variants (brand for storefront, neutral-dark for admin tabs) |
| Empty state | text-only, inconsistent copy/spacing (`text-center py-20 text-gray-400`) | one `<EmptyState icon? title message action? />` |
| Loading skeleton | only `ProductsPage` has a real skeleton; most pages show a bare "Loading…" string | extend skeleton pattern to: product detail, orders list, admin tables |
| Error banner | `FormError` exists for forms; list/table pages mix inline `<p className="text-red-600...">` text | keep `FormError`-style banner, reuse on every page (ties into your existing [[feedback-visible-error-states-ux]] preference — always show the failure state, never swallow it) |
| Modal/Dialog | `InventoryPage` has a one-off stock-adjustment modal | generalize into a reusable `<Modal>` if a second modal use case appears (returns approval, product delete confirm) |

## 4. Layout decision: Admin theme

Recommendation: **convert `AdminLayout`'s sidebar from dark (`bg-gray-900`) to light**, to satisfy "consistent in the whole project." Keep admin visually distinct via:
- A `bg-white border-r border-gray-200` sidebar instead of dark
- Brand-blue active nav item (same `brand-600` as the rest of the app) instead of the current generic blue
- A small "Admin" label/badge in the header area, not a color inversion, to signal "you're in the admin area"

This removes the only major theme fork in the app and means every page — storefront and admin — shares one palette.

## 5. Page-by-page audit (what changes, roughly)

| Page | Main inconsistency found | Fix |
|---|---|---|
| `Navbar` | Already fairly clean | Apply heading/link tokens, no structural change |
| `ProductsPage` | Own input/select styling instead of `INPUT_CLASS`; unbounded grid width; own pagination | Use shared `Input`, cap width, swap in shared `Pagination` |
| `ProductDetailPage` | Not yet audited line-by-line | Apply typography scale to price/title, shared Button for Add-to-Cart |
| `CartPage` / `CheckoutPage` | Own button/input styling | Migrate to shared primitives |
| `LoginPage`/`SignupPage`/etc. | Already uses `ui.js` — closest to target already | Minor: add `Button` variant for the "Continue with Google" secondary action instead of one-off classes |
| `AddressesPage` | 12 separate radius/color utility hits in one file — likely several one-off styles | Needs a pass once primitives exist |
| `AdminOrdersPage` / `AdminOrderDetailPage` / `AdminReturnsPage` | Each redefines `STATUS_COLORS`/`PAYMENT_COLORS` and its own `FilterTab` | Consolidate into shared `Badge` + status map + shared filter pill |
| `AdminLayout` | Dark theme, sole fork from the rest of the app | Re-theme per §4 |
| `admin/ProductFormPage`, `admin/CategoriesPage`, `admin/CouponsPage` | Heaviest single-page class counts (18, 19, 14 hits) — likely the most drifted from any shared baseline | Biggest visual-QA effort in Phase 3 |

## 6. Roadmap (phased — test each phase before moving on, same discipline as the rest of this build)

**Phase 1 — Foundation (no visual change yet, just plumbing)**
1. Add `@theme` token block to `client/src/index.css` (brand scale, semantic colors).
2. Expand `client/src/utils/ui.js`: button variants, card class, badge status-color map, shared `Pagination`, `EmptyState`, `FilterPill` components.
3. Verify: `npm run build` + `npm run lint` clean, no visual regression (these are additive, nothing migrated yet).

**Phase 2 — Storefront pages** (highest traffic, do first)
4. `Navbar` / `Layout` → token typography, confirm max-width container.
5. `ProductsPage`, `ProductDetailPage` → shared Input/Select/Pagination/Badge, capped grid width.
6. `CartPage`, `WishlistPage`, `CheckoutPage` → shared Button/Input, consistent card styling for line items.
7. `AddressesPage`, `OrdersPage`, `OrderSuccessPage` → shared primitives, consistent status badges using the new map.
8. Auth pages (`LoginPage`, `SignupPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `OtpLoginPage`, `VerifyEmailPage`) → light touch-up only, already closest to target.

**Phase 3 — Admin section**
9. `AdminLayout` re-theme to light per §4.
10. `admin/DashboardPage` → consistent stat-card style.
11. `admin/ProductsPage`, `ProductFormPage`, `CategoriesPage`, `InventoryPage`, `CouponsPage` → shared form/table primitives (these are the most class-heavy files, expect the most diff).
12. `AdminOrdersPage`, `AdminOrderDetailPage`, `AdminReturnsPage`, `AdminReturnDetailPage` → consolidated `Badge`, shared `FilterTab`/`Pagination`.

**Phase 4 — Polish pass (whole app)**
13. Empty states, loading skeletons, and error banners brought to parity everywhere (today only `ProductsPage` has a real skeleton).
14. Focus-ring / keyboard-nav audit, mobile tap-target sizing pass.
15. Final visual QA across every route at 375px / 768px / 1280px widths.

## 7. Working agreement

- Build/verify one phase at a time, same as the rest of this project's history — don't touch Phase 3 files while Phase 2 is still in flight.
- Every new or touched page must use the shared primitives from §3 — no new inline button/input/badge styling after Phase 1 lands.
- This file is the reference for "does this match the system" going forward; update it if a token or primitive changes, so it doesn't go stale the way the per-page status-color maps did.

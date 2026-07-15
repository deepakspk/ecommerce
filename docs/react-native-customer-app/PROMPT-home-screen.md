# Prompt — Mobile App Home Screen (Ecommerce Nepal Customer App)

> Copy everything below this line into your AI coding agent (or hand it to a developer)
> to build the Home screen of the React Native customer app.

---

## Role

You are a senior React Native (Expo) developer. Build the **Home screen** of a customer-facing
ecommerce mobile app for **Ecommerce Nepal** — an existing store with a live Node/Express +
MongoDB backend. The Home screen must feel like Daraz/Shopee-class marketplace apps: an
edge-to-edge hero banner with a floating header, capsule category chips, campaign flash-sale
sections with live countdowns, feature-type product rails interleaved with promotional banners,
a "For You" product grid, and an informational footer.

Do not invent your own backend. Consume the existing REST API exactly as documented in the
**API Contract** section — every response shape listed there is real and already live.

## Tech Stack (fixed — do not substitute)

- **Expo (React Native)**, functional components + hooks only
- **React Navigation** (this screen sits in a bottom-tab navigator as the "Home" tab)
- **Context API** for global state (auth, cart, wishlist) — no Redux
- `expo-secure-store` for the auth token (guests can browse the Home screen without a token)
- `axios` client with `baseURL = <API_HOST>/api`
- `react-native-safe-area-context` for safe-area insets
- `expo-linear-gradient` for the header scrim over the banner
- Images: plain `<Image>` or `expo-image`; all product/banner images are **Cloudinary URLs**

### Cloudinary image sizing (important for performance)

Every image URL that contains `/upload/` is a Cloudinary delivery URL. Before rendering,
insert a width transform so devices never download full-size originals:

```js
// "/upload/" -> "/upload/f_auto,q_auto,w_<width>/"  — no-op for non-Cloudinary URLs
export function cloudinaryUrl(url, width) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
```

Use ~`w_800` for full-width banners, `w_400` for product cards, `w_120` for category chips
and campaign action icons.

---

## API Contract (all endpoints are public GET, no auth required)

Base path: `<API_HOST>/api`

| # | Endpoint | Used for |
|---|----------|----------|
| 1 | `GET /banners` | Hero banner carousel |
| 2 | `GET /categories/root` | Category capsule chips |
| 3 | `GET /campaigns/home` | Campaign (flash-sale) sections with countdown |
| 4 | `GET /feature-types` | Feature rails (Best Seller, New Arrival, …) |
| 5 | `GET /products?featureType=<slug>&limit=10` | Products for one feature rail |
| 6 | `GET /promotions` | Promotional banner images (+ optional popup) |
| 7 | `GET /products?limit=10&sort=newest` | "For You" grid (10 products) |
| 8 | `GET /settings/company` | Logo, contact info, social links (header + footer) |
| 9 | `GET /settings/theme` | Brand color tokens |

### Response shapes

**1. Banners** — already filtered to active, already sorted by `sortOrder`:

```json
{ "banners": [ { "_id": "…", "imageUrl": "https://res.cloudinary.com/…", "mobileImageUrl": "https://res.cloudinary.com/…", "link": "", "sortOrder": 0 } ] }
```

`mobileImageUrl` is a mobile-optimized 800×400 (2:1) image and may be an empty string —
on mobile always prefer `mobileImageUrl`, falling back to `imageUrl` when it is empty.

`link` may be empty, an in-app path (e.g. `/products?category=shoes`), or an external
`https://` URL — route in-app paths through navigation, open external ones in the browser.

**2. Categories** (`/categories/root` returns top-level; each node may carry children):

```json
{ "categories": [ { "id": "…", "name": "Shoes", "slug": "shoes", "image": "https://…", "children": [] } ] }
```

**3. Home campaigns** — only *running*, storefront-visible campaigns, in admin sort order;
campaigns with zero sellable products are already excluded; each carries its **first 10
products** plus the total `productCount`:

```json
{
  "campaigns": [ {
    "_id": "…", "name": "Flash Sale", "slug": "flash-sale",
    "description": "Up to 50% off", "startDate": "…", "endDate": "2026-07-20T18:00:00.000Z",
    "status": "running",
    "desktopBannerUrl": "…", "mobileBannerUrl": "…",
    "actionImageUrl": "https://…", "buttonLabel": "Shop Now", "themeColor": "#dc2626",
    "products": [ /* up to 10 product objects, see Product shape */ ],
    "productCount": 23
  } ]
}
```

**4. Feature types** — active only, sorted:

```json
{ "featureTypes": [ { "_id": "…", "name": "Best Seller", "slug": "best-seller", "sortOrder": 0 } ] }
```

**5 / 7. Product list:**

```json
{ "products": [ /* Product objects */ ], "total": 42, "page": 1, "pages": 5 }
```

**Product object** (card-ready — server pre-computes pricing and ratings):

```json
{
  "_id": "…", "name": "Leather Court Sneakers", "slug": "leather-court-sneakers",
  "images": [ { "url": "https://res.cloudinary.com/…", "altText": "" } ],
  "basePrice": 4500,
  "campaignPrice": 3200,
  "finalPrice": 3200, "hasDiscount": true, "discountPercent": 29,
  "averageRating": 4.5, "reviewCount": 12,
  "variantCount": 3
}
```

- `finalPrice` / `hasDiscount` / `discountPercent` are authoritative — never recompute.
- `variantCount > 1` means the card's button must read **"Select Options"** and navigate to
  the product detail screen instead of adding to cart directly.

**6. Promotions** — active within their visibility window, newest first:

```json
{
  "promotions": [ {
    "_id": "…", "title": "Dashain Offer",
    "webBannerUrl": "https://…", "mobileBannerUrl": "https://…",
    "webPopupUrl": "", "mobilePopupUrl": ""
  } ]
}
```

On mobile always prefer `mobileBannerUrl`, falling back to `webBannerUrl` (and
`mobilePopupUrl` falling back to `webPopupUrl`).

**8. Company settings:**

```json
{ "company": { "companyName": "…", "logoUrl": "https://…", "description": "…",
  "address": "…", "phone": "…", "email": "…",
  "social": { "facebook": "…", "instagram": "…", "tiktok": "…", "whatsapp": "…" } } }
```

**9. Theme settings** — brand color tokens; use the brand/primary color for CTAs, badges,
prices. Fallback brand color if the call fails: `#dc2626` family (red-600).

---

## Screen Layout — exact section order, top to bottom

The whole screen is ONE vertical scroll (a `FlatList` with section items or a `ScrollView`
with virtualized horizontal rails inside — prefer `FlatList` of heterogeneous section rows
for memory). Order:

### 1. Hero banner carousel — edge-to-edge, drawn from the very top

- The banner image starts at **y = 0 of the physical screen** — it draws **behind the status
  bar** (translucent status bar, light content). Do **not** pad it below the notch; the image
  itself owns the safe zone. Use `<StatusBar translucent backgroundColor="transparent" />`.
- Image source: `mobileImageUrl || imageUrl` (the mobile image is 800×400), through
  `cloudinaryUrl(src, 800)`.
- Full-width, aspect ratio **2:1** (`height = width / 2`, matching the 800×400 mobile
  image; `resizeMode="cover"` handles web-only fallbacks), no border radius at the top
  (it's flush with the screen edges); content below scrolls over normally.
- Horizontally swipeable, **auto-advances every 5 seconds**, pauses while the user is
  touching/dragging, loops infinitely.
- **Dot indicators** centered near the bottom of the banner: active dot is a wider "pill"
  (~24×8), inactive dots small circles (~8×8), white with slight transparency.
- Tapping a banner follows its `link` (in-app route vs external URL as described above).
- While loading: full-width gray shimmer block of the same aspect ratio.
- If the banners array is empty, still render a brand-colored gradient block of the same
  height so the overlay header (section 2) always has a background.

### 2. Floating header OVER the banner (overlay, respects the safe area)

Absolutely positioned on top of the banner carousel, padded down by the safe-area top inset,
laid out in one row:

- **Left — logo:** `company.logoUrl` (height ≈ 32, width auto). Fallback: `companyName` text.
- **Middle — long search bar:** takes all remaining width. Pill-shaped (full radius),
  white/95% opacity background, subtle shadow, magnifier icon + placeholder
  `"Search for products…"`. It is a **button, not an input** — tapping it navigates to the
  Search screen. This is the primary header element; keep it visually dominant ("long").
- **Right — notification bell icon** in a circular white/90% chip, with a small brand-colored
  unread badge dot. Navigates to the Notifications screen (stub the screen if it doesn't
  exist yet).
- Add a **top-down dark gradient scrim** (`rgba(0,0,0,0.35)` → transparent, ~90px tall)
  between the banner and the header row so the logo/icons stay legible on bright images.
- Optional polish: once the user scrolls past the banner, pin the same header as a solid
  white bar (animated interpolation of background opacity on scroll offset).

### 3. Category capsules

- Horizontal scrollable row (single line, `FlatList horizontal`,
  `showsHorizontalScrollIndicator={false}`) of **capsule/pill buttons**, one per root category.
- Each capsule: small **circular category image** (~28–32px, `cloudinaryUrl(image, 120)`,
  fallback = first letter of the name in a gray circle) on the left + **category name**
  (13–14px, medium weight, single line) on the right. Pill background white, 1px light-gray
  border, full corner radius, comfortable horizontal padding, gap ~8–10 between capsules.
- Tap → Category/Product-list screen filtered by that category `slug`.
- Loading state: 6 shimmer capsules.
- Section starts right below the banner with a small overlap allowed (e.g. `marginTop: 12`).

### 4. Info cards — shipping / discount / payment (trust strip)

A static row of **3 compact info cards** (equal width, side by side; or one horizontal
scroll row if text doesn't fit small screens):

| Icon | Title | Subtitle |
|------|-------|----------|
| 🚚 truck | Nationwide Delivery | Fast shipping across Nepal |
| 🏷️ tag / percent | Daily Deals & Discounts | Save more with campaign offers |
| 🛡️ shield / wallet | Secure Payments | COD · eSewa · Khalti |

Style: white card, rounded-xl (~12), light border or soft shadow, brand-tinted icon in a
small rounded square tile, title 13px semibold, subtitle 11px gray. This section is
hard-coded (no API call).

### 5. Campaign section — card with countdown + product rail (first campaign)

For the **first** campaign from `GET /campaigns/home`, render a full-width section card:

- **Card background:** the campaign's `themeColor` at ~5% opacity (append alpha byte `0d`
  to the hex, e.g. `#dc26260d`); corner radius 16; padding 16.
- **Header row:**
  - Left: a 48×48 rounded-2xl tile — `actionImageUrl` if present (image, `w_120`), else a
    clock icon tinted `themeColor` on `themeColor` @ 10% background.
  - Next to it: campaign **name** (20–22px extrabold) with a small yellow **"HOT"** badge
    (uppercase, 10px bold, dark text on `#facc15`), and the `description` under it
    (12–13px gray, single line).
- **Countdown row** (below the header on mobile): tiny label **"ENDS IN"** (10px bold,
  letter-spaced gray), then boxes for **DAYS : HOURS : MINS : SECS** — the DAYS box only
  appears when days > 0. Each box: white background, light border, rounded-lg, ~44–48px
  wide; big bold 2-digit number in the brand color + tiny label under it; colons between
  boxes. Ticks every second (one `setInterval`, cleared on unmount).
  - **When the countdown reaches zero, remove the entire campaign section from the screen**
    (the sale is over).
- **CTA button** on the same row as the countdown (right-aligned): brand-colored solid
  button, label = `buttonLabel` or `"Shop Now"` + chevron-right, navigates to the Campaign
  screen (`slug`).
- Thin divider, then a **horizontal product rail**: the campaign's `products` (≤10) as
  Product Cards (spec below), card width ~160–170, gap 12, snap scrolling.
- **"View more" card:** if `productCount > products.length`, append one extra tile at the
  end of the rail — dashed 2px border, rounded-2xl, centered content:
  `+N` (extrabold, brand color) / `more deals` / `View All →`. Tap → Campaign screen.

### 6. First feature-type section

For the **first** feature type (from `GET /feature-types`, in given order) that returns at
least one product from `GET /products?featureType=<slug>&limit=10`:

- White card, rounded-2xl, light border, padding 16.
- Header row: 48×48 rounded tile with a **star icon** on brand @ 10% background · feature
  **name** (20px extrabold) · right-aligned **"View All →"** link in brand color →
  product-list screen pre-filtered by `featureType=<slug>`.
- Divider, then a horizontal rail of its products as Product Cards (same rail spec as §5).
- Feature types whose product fetch comes back empty are **skipped entirely** (never render
  an empty rail).

### 7. First promotional banner

The **first** promotion from `GET /promotions`:

- Full-width image, `mobileBannerUrl || webBannerUrl`, `cloudinaryUrl(src, 800)`,
  rounded-2xl, natural aspect ratio (compute from the loaded image, or default 2:1),
  `resizeMode="cover"`.
- Non-interactive is acceptable for v1 (the web version isn't linked either).

### 8. Interleave the remaining campaigns / feature rails / promotions

After the first `campaign → feature → promotion` cycle, keep alternating with this exact
priority until all three queues are empty:

```
queues: C = campaigns[1:], F = featureRails[1:], P = promotions[1:]
repeat until C, F and P are all empty:
    if C is not empty  -> render next campaign section   (same spec as §5)
    if F is not empty  -> render next feature section    (same spec as §6)
    if P is not empty  -> render next promotion banner   (same spec as §7)
```

So: another campaign if one exists, otherwise the next feature rail, otherwise the next
promotion — and so on. Every fetched campaign, non-empty feature rail, and promotion must
appear on the screen exactly once. Vertical gap between all sections: ~24.

### 9. "For You" section — 10-product grid

- Section header: "For You" (20px extrabold) — optional small "View All →" to the full
  product list screen.
- Fetch `GET /products?limit=10&sort=newest`, render **10 Product Cards in a 2-column grid**
  (gap 12, cards stretch to equal height per row).
- Below the grid, a full-width outline button **"View All Products"** → product list screen.

### 10. Footer section (inside the scroll, at the very end)

An informational footer block (light gray / `secondary` background, padding 20):

- Company `logoUrl` (or `companyName` text) + `description` (12px gray, 2–3 lines).
- Contact rows with small brand-colored circular icons: **Call us** → `phone`,
  **Email us** → `email` (tap = `Linking.openURL("tel:…"/"mailto:…")`).
- **Social icons row:** one circular brand-colored button per non-empty entry in
  `company.social` (facebook, instagram, tiktok, linkedin, twitter, youtube, whatsapp).
  WhatsApp values that aren't URLs become `https://wa.me/<digits>`. Open in browser.
- **"We Accept"** row: three white chips with the payment logos — Cash on Delivery, eSewa,
  Khalti (bundle these three logo assets into the app).
- Bottom line: `© <current year> <companyName>. All rights reserved.` (11px, gray, centered)
  and a "Terms & Conditions" link.
- Leave bottom padding ≥ tab-bar height + safe-area bottom inset.

---

## Shared component specs

### Product Card (used in every rail and the For You grid)

- Container: white, rounded-2xl (16), 1px light border, subtle shadow, overflow hidden;
  whole card tappable → Product Detail screen (`slug`).
- **Image:** square (1:1), `images[0].url` at `w_400`, gray-100 placeholder background;
  "No image" text fallback.
- **Discount badge:** if `hasDiscount`, top-left pill `-{discountPercent}%` — brand
  background, white bold 11px text.
- **Wishlist heart:** top-right, 32×32 white circular button with shadow; toggles wishlist
  via global context (guests → prompt to log in).
- **Body (padding 12):**
  - Name — 13–14px semibold, exactly 2 lines (`numberOfLines={2}`, fixed min-height so
    cards align).
  - Rating row — star icons for `averageRating` + `(reviewCount)` in 11px gray; if
    `reviewCount === 0` show "No ratings yet" in light gray.
  - Price — `Rs. {finalPrice.toLocaleString()}` bold 15px in brand color when discounted
    (with `Rs. {basePrice}` struck-through 11px gray beside it), otherwise plain
    near-black bold.
  - Button — full-width small rounded-xl brand button:
    `variantCount > 1` → **"Select Options"** (navigates to detail);
    else **"Add to Cart"** → adds qty 1 of the single variant via cart context, shows
    "Added!" success state (green) for 2s; disabled "Adding…" while pending; out-of-stock
    error shown as tiny red text under the button.

### Horizontal product rail

`FlatList horizontal` · card width ~160–170 · `ItemSeparator` 12 · content padding 16 ·
`showsHorizontalScrollIndicator={false}` · `snapToInterval` = card width + gap ·
`initialNumToRender={4}` `windowSize={5}`.

### Countdown timer

Single source of truth `endDate`; compute `days/hours/mins/secs` from
`new Date(endDate) - Date.now()` each second; pad to 2 digits; hide DAYS box when
`days === 0`; call `onExpire` exactly once when remaining ≤ 0.

---

## Data loading, skeletons, and resilience

- Fire the independent requests **in parallel on mount**: banners, categories, campaigns,
  feature types (then one products call per feature type, also parallel), promotions,
  For-You products, company + theme settings.
- **Each section loads and renders independently** — never block the whole screen on one
  slow call. Every section has its own shimmer skeleton mirroring its final layout
  (banner block; capsule row; campaign card with icon/title/countdown-boxes/rail of card
  skeletons; feature card with rail; grid of card skeletons).
- **A failed or empty section disappears silently** — no error card in the middle of Home.
  The screen must still look complete with only, say, banners + For You.
- **Pull-to-refresh** (`RefreshControl`) re-runs all fetches.
- Currency is always `Rs. {n.toLocaleString()}` — no decimals.
- All list keys = `_id`. Guard every array access (`products ?? []`).

## Design tokens

- Brand/primary color: from `GET /settings/theme`; fallback red-600 `#dc2626`
  (dark hover variant `#b91c1c`, 10% tint backgrounds).
- Background: near-white `#f9fafb`; cards white; borders `#f3f4f6`/`#e5e7eb`.
- Text: near-black `#111827`, secondary `#6b7280`, muted `#9ca3af`.
- Radii: cards 16, buttons 12, pills/capsules fully rounded. Base spacing unit 4;
  screen horizontal padding 16; between-section gap 24.
- Typography: system font; section titles 20/extrabold; card titles 13–14/semibold;
  meta 11–12/regular.
- "HOT" badge yellow `#facc15`; success green `#16a34a`; error red `#dc2626`.

## Acceptance checklist

- [ ] Banner carousel starts at the very top of the screen, behind the status bar, and
      auto-advances every 5s with pill-style dot indicators.
- [ ] Hero banners render `mobileImageUrl` (2:1) and fall back to `imageUrl` when it is
      empty.
- [ ] Logo + long pill search bar + notification bell float over the banner within the safe
      area, readable via a gradient scrim.
- [ ] Categories render as image+name capsule chips in one horizontal line.
- [ ] Shipping / discounts / payments trust cards appear right after the categories.
- [ ] Each running campaign renders a tinted card with HOT badge, live per-second countdown,
      CTA, a 10-product rail, and a `+N more deals` tile when `productCount > 10`; the whole
      section vanishes the moment its countdown hits zero.
- [ ] Sections after the first campaign follow the interleave rule:
      campaign → feature rail → promotion → (repeat with whatever queues remain).
- [ ] Feature rails with zero products never render.
- [ ] Promotions use the mobile banner URL with web fallback.
- [ ] "For You" shows 10 products in a 2-column grid with a View-All button.
- [ ] Footer shows company info, tappable phone/email, social icons, We-Accept payment
      chips, and copyright, clear of the tab bar.
- [ ] Every section has a shimmer skeleton, loads independently, hides itself on error,
      and pull-to-refresh reloads everything.
- [ ] Product cards show server-computed pricing (`finalPrice`, `discountPercent`) with the
      `Rs.` format, star ratings, wishlist heart, and the Add-to-Cart / Select-Options rule
      based on `variantCount`.

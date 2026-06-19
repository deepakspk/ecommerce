# Ecommerce Nepal — Phase 2 Feature Guide (Beyond Prompt 8)

This extends `ecommerce-build-guide-nepal.md`. Prompts 0–8 plus the
add-on rounds (Khalti, eSewa, Wishlist, subcategories) are done. This
document specs out the features a mature ecommerce platform still needs,
and continues the same phased-prompt format — **one module per prompt,
test before moving on.**

Same golden rule as before: don't ask for "all of this." Run Prompt 9,
test it, commit, then Prompt 10, and so on.

---

## 9. What's missing — feature checklist

**Customer side (new)**
- Product reviews & star ratings (verified-purchase only)
- Coupon / discount codes at checkout
- Customer-initiated order cancellation and return/refund requests
- Order-related transactional emails (confirmed, shipped, delivered, payment failed)
- "Notify me" when an out-of-stock variant is restocked
- Related products + recently viewed products

**Admin side (new)**
- Admin/staff user management UI (promote/demote roles — no more raw Mongo edits)
- Audit log of admin actions (who adjusted stock, who changed an order status)
- Sales & inventory reporting with date ranges and CSV export
- Coupon management
- Return/refund request queue (approve/reject, trigger refund)

**Lower priority (bundle into the last prompt or skip for v1)**
- `sitemap.xml` / `robots.txt` generation
- Order invoice PDF download
- Abandoned-cart email nudge
- Compare products
- CAPTCHA / login lockout beyond the existing rate limiter

---

## 10. Data model additions (give this to the AI verbatim, alongside the original data model)

```
Review
  _id, productId -> Product, userId -> User, orderId -> Order,
  rating (1-5), comment, isVerifiedPurchase (bool),
  createdAt

Coupon
  _id, code (unique, uppercase), type (PERCENTAGE | FIXED),
  value, minOrderValue, maxDiscountAmount (nullable, caps PERCENTAGE coupons),
  usageLimit (nullable), usedCount, perUserLimit (nullable),
  startsAt, expiresAt, isActive, createdAt

ReturnRequest
  _id, orderId -> Order, userId -> User,
  items: [{ variantId -> ProductVariant, quantity, reason }],
  status (REQUESTED | APPROVED | REJECTED | PICKED_UP | REFUNDED),
  adminNote, createdAt

StockAlert                  // "notify me when back in stock"
  _id, userId -> User, variantId -> ProductVariant,
  notifiedAt (nullable), createdAt

AuditLog
  _id, adminUserId -> User, action, targetType, targetId,
  meta (mixed/object), createdAt

// --- field additions to existing collections ---
Order gains: couponCode (nullable), discountAmount (default 0)
User gains: nothing required, but admin user-management needs a
  PUT to change `role` and possibly `isActive` (ban/disable account)
```

**Key design notes:**
- A `Review` should only be creatable if the `userId` has a `DELIVERED` order containing that `productId` — set `isVerifiedPurchase` from that check, don't trust a client flag.
- Discount math: validate the coupon server-side at order-creation time (not just at "apply" time in the cart), recheck `expiresAt`/`usageLimit`/`perUserLimit` inside the same transaction that creates the order, and snapshot `discountAmount` onto the `Order` — never recompute it later from a coupon that might change.
- `ReturnRequest` is separate from `Order.status` — an order can be `DELIVERED` and still have a pending return. Refund execution (calling back into the Khalti/eSewa refund or just marking COD as refunded) happens when admin sets status to `REFUNDED`.
- `AuditLog` writes should be fire-and-forget from existing admin controllers (stock adjustment, order status change, product delete, role change) — don't block the response on it.

---

## 11. Phased prompts (continue numbering from Prompt 8)

### Prompt 9 — Reviews & ratings
```
Using the existing Product, Order, and User schemas, add a Review schema:
_id, productId -> Product, userId -> User, orderId -> Order, rating (1-5),
comment, isVerifiedPurchase, createdAt.

Backend (Express, plain JavaScript):
- POST /api/products/:productId/reviews — only allowed if the user has a
  DELIVERED order containing that product; set isVerifiedPurchase from
  that check server-side, never from client input. One review per
  user per product (upsert or reject duplicates).
- GET /api/products/:productId/reviews — paginated, newest first
- Update the product detail response to include average rating + review count

Frontend (React, Tailwind, plain JS):
- Star rating display on ProductCard and ProductDetailPage
- Review list + "write a review" form on ProductDetailPage, only shown/enabled
  for eligible users; show a clear message if not eligible (no purchase yet)
Validate inputs server-side, handle empty states (no reviews yet).
Do not build moderation/admin review management yet.
```

### Prompt 10 — Coupons & discounts
```
Add a Coupon schema: code (unique), type (PERCENTAGE | FIXED), value,
minOrderValue, maxDiscountAmount, usageLimit, usedCount, perUserLimit,
startsAt, expiresAt, isActive.

Backend:
- Admin CRUD for coupons under /api/admin/coupons (ADMIN only)
- POST /api/cart/apply-coupon — validates the code against cart subtotal
  and returns the computed discount (don't persist yet, this is a preview)
- In order creation, re-validate the coupon server-side inside the same
  MongoDB transaction that creates the Order (check isActive, dates,
  usageLimit, perUserLimit again — a coupon could have expired between
  preview and checkout). Snapshot discountAmount and couponCode onto Order,
  increment Coupon.usedCount.

Frontend:
- Coupon code field on CartPage or CheckoutPage with apply/remove,
  showing the discount in the order summary
- Admin CouponsPage: table + create/edit form, Tailwind CSS

Handle invalid/expired/already-used coupon errors with clear messages,
not generic 500s.
```

### Prompt 11 — Order cancellation, returns & refunds
```
Add a ReturnRequest schema: orderId -> Order, userId -> User,
items: [{ variantId, quantity, reason }], status (REQUESTED | APPROVED |
REJECTED | PICKED_UP | REFUNDED), adminNote.

Backend:
- POST /api/orders/:id/cancel — customer can cancel only while status is
  PENDING or CONFIRMED (before it ships); restock the variants in the same
  transaction, write an InventoryLog entry, set Order.status to CANCELLED
- POST /api/orders/:id/return — customer can request a return only when
  status is DELIVERED, within a configurable window (e.g. 7 days);
  creates a ReturnRequest
- Admin endpoints to list/filter ReturnRequests and transition status
  (APPROVED -> PICKED_UP -> REFUNDED); on REFUNDED, set the parent
  Order.paymentStatus to REFUNDED and write a Payment record for the refund

Frontend:
- "Cancel order" button on OrdersPage/OrderDetailPage when eligible
- "Request return" form (pick items + reason) when eligible
- Admin ReturnsPage: queue with status filter, detail view, approve/reject/
  mark-refunded actions

Show the customer clear status messaging at every stage. Do not auto-trigger
a real gateway refund call yet — log it as an admin action for now (manual
refund via Khalti/eSewa merchant dashboard is fine for v1).
```

### Prompt 12 — Transactional emails & back-in-stock alerts
```
Using the existing sendEmail utility (already used for auth emails), add
order lifecycle emails:
- Order confirmed (right after creation)
- Payment failed (when a gateway verification comes back FAILED)
- Order shipped / delivered (when admin changes status)
- Return request approved/rejected

Add a StockAlert schema: userId -> User, variantId -> ProductVariant,
notifiedAt (nullable).
- A "Notify me" button on out-of-stock variants (ProductDetailPage) that
  creates a StockAlert for the logged-in user
- When admin increases stock on a variant from 0 to >0 (inventory
  controller), find matching StockAlerts with notifiedAt null, email each
  user once, then set notifiedAt

Keep all email sending fire-and-forget (don't block the API response on
SMTP latency) but log failures. Do not build SMS notifications yet.
```
completteddddddd 

### Prompt 13 — Admin: user management & audit log
```
Add an AuditLog schema: adminUserId -> User, action, targetType, targetId,
meta, createdAt.

Backend:
- GET /api/admin/users — list/search/filter customers and admins
- PATCH /api/admin/users/:id/role — promote/demote CUSTOMER <-> ADMIN
- PATCH /api/admin/users/:id/status — enable/disable (ban) an account;
  disabled accounts can't log in
- Write an AuditLog entry (fire-and-forget) from: role changes, account
  status changes, manual stock adjustments (already exists — add logging),
  order status changes, product deletes
- GET /api/admin/audit-log — paginated, filter by admin/action/date

Frontend:
- Admin UsersPage: table with role/status badges, role-change and
  disable/enable actions (with a confirmation modal — these are
  consequential actions)
- Admin AuditLogPage: read-only table

This replaces the current manual-MongoDB-edit process for promoting admins.
Protect everything behind the existing requireRole("ADMIN") middleware, and
prevent an admin from demoting/disabling their own account.
```

### Prompt 14 — Recommendations & recently viewed
```
Add to the product detail API response: a list of related products
(same category, excluding the current product, in stock, limit 8).

Frontend:
- "Recently viewed" rail using localStorage (last 10 viewed product slugs,
  client-side only, no new backend needed) shown on ProductDetailPage
  and the homepage
- "Related products" rail on ProductDetailPage using the new API field

Keep this lightweight — no collaborative-filtering/ML recommendation engine
for v1, just same-category and recently-viewed.
```

### Prompt 15 — Admin analytics, reporting & CSV export
```
Extend the admin dashboard with a reporting view:
- Date-range filter (today / 7d / 30d / custom) applied to orders
- Sales-over-time chart data (group orders by day), top 10 products by
  revenue and by units sold, new customers in range
- CSV export endpoint for orders in a date range (admin-only, streamed,
  not loaded fully into memory for large ranges)

Frontend: ReportsPage with the date filter, summary cards, a simple chart
(any lightweight charting lib is fine), and an "Export CSV" button.
Keep this read-only — no scheduled/emailed reports for v1.
```

### Prompt 16 — Final polish (optional, bundle what you need)
```
Add whichever of these the business actually needs:
- sitemap.xml and robots.txt generation (list active product/category URLs)
- Order invoice PDF download (order detail page, customer + admin)
- Abandoned-cart email: if a logged-in user's cart has items untouched for
  24h and no recent order, send one reminder email (don't spam — once per
  cart per 7 days max)
- Login lockout after N failed attempts (on top of the existing rate limiter)
Pick only what's needed — don't build all of these speculatively.
```

---

## 12. Updated build order summary

```
[Prompts 0-8 done] →
Reviews & ratings → Coupons & discounts → Cancellation/returns & refunds →
Transactional emails & back-in-stock alerts → Admin user mgmt & audit log →
Recommendations & recently viewed → Admin analytics/reporting → Final polish
```

Reuse the **Quality bar** from section 7 of the original guide on every
prompt above. Test after each step, commit to git after each working phase.

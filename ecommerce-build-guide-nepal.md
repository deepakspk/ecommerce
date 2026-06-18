# Building a Scalable Ecommerce Platform in Nepal — Prompting & Project Guide

This document gives you two things:

1. **A complete project specification** — the tech stack, data model, and features, so any AI assistant or developer understands what you want.
2. **A phased prompt template** — copy-paste prompts that build the platform one safe, testable module at a time.

The golden rule: **never ask anyone to "build the whole thing." Build one module, test it, then move to the next.**

---

## 1. Core prompting principles

| Principle | Why it matters | Bad prompt | Good prompt |
|---|---|---|---|
| **Phase the work** | One huge prompt = shallow, broken code | "Build me an ecommerce site" | "Set up the project scaffold and database connection only" |
| **Give the data model first** | Keeps every later feature consistent | "Add a products page" | "Using the Mongoose schemas below, build the product listing page" |
| **Be specific about stack & constraints** | Removes guesswork | "Make it modern" | "React + Express + MongoDB (MERN), plain JavaScript, Tailwind CSS" |
| **State Nepal context** | Payments/addresses differ from US | "Add online payment" | "Integrate eSewa & Khalti, plus Cash-on-Delivery" |
| **Define 'done'** | Avoids happy-path-only demos | "Add a login" | "Add login with input validation, error states, and rate limiting" |
| **One feature per prompt** | Easier to test & debug | "Add cart, checkout, and payment" | "Add the cart (add/remove/update quantity) only" |

---

## 2. Recommended tech stack

You can adapt this, but this combination is the classic **MERN stack in plain JavaScript** (no TypeScript) — modern, well-documented, and works cleanly with Nepali payment gateways.

- **Frontend:** React (Vite) + React Router — plain JavaScript (`.jsx`), no TypeScript.
- **Backend:** Node.js + Express — REST API, with payment secrets kept server-side in environment variables.
- **Database:** MongoDB — flexible document model for products, variants, orders; use MongoDB transactions for stock/order consistency.
- **ODM:** Mongoose — schema definitions, validation, and queries for MongoDB.
- **Styling/UI:** Tailwind CSS (+ a plain-JS component library like Headless UI or simple custom components — avoid TypeScript-only UI kits).
- **Authentication:** Plain JS auth with `jsonwebtoken` + `bcrypt` for email/password, Passport.js for Google OAuth, and a phone OTP flow for Nepali numbers (phone OTP is widely expected in Nepal).
- **File/Image storage:** Cloudinary or AWS S3 (product images, variant images).
- **Payments:** eSewa (largest user base) + Khalti (cleanest API) + **Cash-on-Delivery** (still the most-used option in Nepal). Optionally Fonepay / Connect IPS for bank users.
- **Hosting:** Frontend on Vercel/Netlify; backend (Express API) on Render/Railway; MongoDB Atlas for the managed database.


---

## 3. The data model (give this to the AI verbatim)

This is the most important section. Paste it into your prompts so everything stays consistent. Each block below is a MongoDB collection, described as a Mongoose schema would define it (plain JavaScript, no TypeScript types).

```
User
  _id, name, email (unique), phone, passwordHash, role (CUSTOMER | ADMIN),
  emailVerified, createdAt

Address                     // a user can have MANY (embedded array or separate collection)
  _id, userId -> User, label (Home/Office), recipientName, phone,
  province, district, city, area, street, landmark, isDefault

Category
  _id, name, slug (unique), parentId -> Category (nullable, for subcategories)

Product
  _id, name, slug (unique), description, categoryId -> Category,
  basePrice, isActive, createdAt,
  images: [{ url, altText, sortOrder }]   // can be embedded sub-documents

ProductVariant              // one document per size+color combo
  _id, productId -> Product, size, color, sku (unique),
  price (overrides basePrice if set), stockQuantity, imageUrl

Cart
  _id, userId -> User (or sessionId for guests),
  items: [{ variantId -> ProductVariant, quantity }]   // embedded array

Order
  _id, userId -> User, address (snapshot the address fields directly, not a reference),
  status (PENDING | CONFIRMED | PACKED | SHIPPED | DELIVERED | CANCELLED),
  subtotal, deliveryFee, total,
  paymentMethod (ESEWA | KHALTI | COD),
  paymentStatus (PENDING | PAID | FAILED | REFUNDED),
  items: [{ variantId -> ProductVariant, productName, size, color, unitPrice, quantity }], // snapshot values
  createdAt

Payment
  _id, orderId -> Order, gateway, amount,
  transactionId, gatewayRef, status, rawResponse (mixed/object), createdAt

InventoryLog               // optional but recommended for tracking
  _id, variantId -> ProductVariant, change (+/-), reason, createdAt
```

**Key design notes to mention in prompts:**
- Inventory lives on `ProductVariant`, not `Product` — a Medium/Red shirt has its own stock.
- `Order` **snapshots** price/address at purchase time (copy the fields in, don't just store a reference), so later price or address edits don't rewrite history.
- Always decrement stock **inside the same MongoDB transaction/session** that creates a paid order, to prevent overselling.

---

## 4. Feature checklist

**Customer side**
- Browse products by category, search, filter by size/color/price
- Product page with variant selection (size + color), stock display
- Cart: add, update quantity, remove, persist for logged-in users
- Multiple saved addresses; pick one at checkout; set a default
- Checkout: choose address → choose payment (eSewa / Khalti / COD) → confirm
- Order history and order status tracking
- Auth: signup/login (email + Google + phone OTP), password reset, email verification

**Admin side**
- Dashboard (sales, recent orders, low-stock alerts)
- Product CRUD with image upload and multiple variants per product
- Inventory tracking and manual stock adjustments
- Order management (view, update status, mark paid/shipped)
- Category management
- Role-protected routes (only ADMIN can access)

---

## 5. Nepal-specific requirements (state these explicitly)

- **Payments:** Integrate **eSewa** and **Khalti** (both have v2 ePayment APIs), plus **Cash-on-Delivery**. Start with Khalti if you want the gentlest integration; add eSewa for reach.
- **Security rule (critical):** The redirect back to your success URL is **not** proof of payment. Always make a **server-to-server verification call** to the gateway to confirm the transaction before marking an order paid. eSewa v2 uses HMAC-SHA256 signature verification; keep secret keys in environment variables, never in client code.
- **Addresses:** Use Nepal's structure — Province → District → City/Municipality → Area/Tole → landmark. Landmarks matter for delivery here.
- **Phone:** Nepali mobile numbers (+977, 10 digits starting with 98/97). Phone OTP login is expected and trusted.
- **Delivery:** Plan for integration (or manual handoff) with local couriers like Pathao, NepXpress, or Aramex. At minimum, store a delivery fee per order.
- **Trust signal:** Show eSewa and Khalti logos at checkout — familiarity raises conversion in Nepal.

> You'll need a **verified merchant account** with eSewa and Khalti before going live. Both provide sandbox/test credentials for development.

---

## 6. The phased master prompt template

Run these **in order**. After each phase, test before moving on. Replace the bracketed parts as needed.

### Prompt 0 — Project setup
```
I'm building an ecommerce platform for a business in Nepal.
Stack: MERN — React (Vite) frontend, Node.js + Express backend, MongoDB with
Mongoose. Plain JavaScript only, no TypeScript. Tailwind CSS for styling.
For this first step ONLY: scaffold a monorepo with /client (React) and
/server (Express) folders, connect Mongoose to MongoDB, and create the full
set of Mongoose schemas/models based on this data model:
[PASTE THE DATA MODEL FROM SECTION 3].
Do not build any UI or features yet.
Explain the folder structure you created.
```

### Prompt 1 — Authentication
```
Using the existing project and User schema, implement authentication
(plain JavaScript, no TypeScript) on the Express backend with JWT:
- Email/password signup + login (hash passwords with bcrypt, validate inputs)
- Google OAuth via Passport.js
- Phone OTP login for Nepali numbers (+977, 10 digits)
- Password reset and email verification
- Role-based access: CUSTOMER and ADMIN, with Express middleware to protect admin routes
- React pages/forms on the client that call these API endpoints
Include input validation, clear error states, and basic rate limiting on login.
Do not build product or cart features yet.
```

### Prompt 2 — Product catalog (customer-facing)
```
Using the Product, ProductVariant, and Category schemas, build:
- An Express REST API: list/search/filter products (by category, size,
  color, price) and get a single product with its variants
- A React product listing page that calls this API, with category filter,
  search, and filters for size/color/price
- A React product detail page where the user selects size and color (variant),
  sees the variant's stock and price, and an "Add to Cart" button
- Show "out of stock" when stockQuantity is 0
Build the UI with Tailwind CSS, plain JavaScript (.jsx), no TypeScript.
Do not build the cart logic yet — just a non-functional "Add to Cart" button.
```

### Prompt 3 — Cart
```
Implement the cart using the Cart schema:
- Express endpoints to add a selected variant to cart, update quantity, remove items
- Persist the cart for logged-in users; merge guest cart (localStorage) on login
- Prevent adding more than available stock
- A React cart page showing items, quantities, line totals, and subtotal
Do not build checkout or payment yet.
```

### Prompt 4 — Addresses & checkout (no payment yet)
```
Using the Address schema, let customers (Express API + React pages):
- Add, edit, delete, and set a default address (Nepal format:
  Province, District, City, Area, Street, Landmark, recipient name + phone)
- Manage multiple addresses
Then build a checkout page: select a saved address, review the order summary,
calculate delivery fee, and create an Order with status PENDING and
paymentStatus PENDING. For now, only support Cash-on-Delivery as the payment method.
Snapshot the address and item prices directly onto the Order document.
Decrement stock inside the same MongoDB transaction. Do not integrate online payment yet.
```

### Prompt 5 — Online payments (do eSewa and Khalti separately)
```
Add Khalti payment to checkout using the Khalti ePayment v2 API, in the
Express backend (plain JavaScript).
Critical requirements:
- Initiate payment server-side; keep the secret key in an environment variable
- After the redirect back, do NOT trust it — make a server-to-server
  verification call to Khalti to confirm the payment before marking the order PAID
- Record the result in the Payment collection (transactionId, gatewayRef, raw response)
- Update Order.paymentStatus only after verified success; handle FAILED/cancelled cases
Show me how to test it with sandbox credentials.
```
*(Then repeat the same prompt for eSewa, noting eSewa v2 uses HMAC-SHA256 signature verification.)*

### Prompt 6 — Admin: products & inventory
```
Build an admin section (ADMIN role only, React + Express API) with:
- Product CRUD, including image upload (Cloudinary) and adding multiple
  variants (size + color + SKU + price + stock) per product
- Category management
- Inventory view with low-stock highlighting and manual stock adjustments
  that write to InventoryLog
Protect all admin API routes with Express middleware checking role. Build clean
tables and forms with Tailwind CSS, plain JavaScript.
```

### Prompt 7 — Admin: orders & dashboard
```
Build the admin order management and dashboard:
- List/filter orders, view order detail, update status
  (PENDING -> CONFIRMED -> PACKED -> SHIPPED -> DELIVERED / CANCELLED)
- Mark COD orders as PAID when collected
- Dashboard cards: total sales, today's orders, pending orders, low-stock count
```

### Prompt 8 — Hardening & polish
```
Review the whole app and add: server-side validation on every form/endpoint,
proper error and loading states, image optimization, SEO metadata (React),
basic security (rate limiting, secure headers via helmet, CORS config,
no secrets in client code), and a responsive mobile layout.
List any security gaps you find.
```

---

## 7. Quality bar to attach to every prompt

Paste this at the end of any prompt when you want production-quality output:

```
Requirements for this code:
- Validate all inputs on the server, not just the client
- Handle errors and edge cases (empty states, network failures, out-of-stock)
- No secrets in client-side code; use environment variables
- Plain JavaScript only (no TypeScript), consistent with the existing
  Mongoose schemas and patterns
- Explain what you built and how to test it
```

---

## 8. Suggested build order summary

`Scaffold + schema → Auth → Catalog → Cart → Addresses/Checkout → Payments → Admin products/inventory → Admin orders → Hardening`

Test after each step. Commit to git after each working phase so you can roll back safely.

> **Phase 2:** once Prompt 8 is done, see `ecommerce-build-guide-nepal-phase2.md`
> for the next round — reviews/ratings, coupons, order cancellation/returns,
> transactional emails, admin user management, recommendations, and reporting.

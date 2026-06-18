Khalti integration done
Backend: server/src/config/khalti.js wraps Khalti's /epayment/initiate/ and /epayment/lookup/ calls. server/src/controllers/paymentController.js exposes initiateKhalti/verifyKhalti at /api/payments/khalti/*. Verification always does a server-to-server lookup — the redirect query params are never trusted. Each attempt is logged to the Payment collection, and Order.paymentStatus only flips after a verified Completed lookup result (Refunded→REFUNDED, Expired/User canceled→FAILED, Pending→left alone). Order.createOrder now takes paymentMethod (COD or KHALTI) instead of hardcoding COD.

Frontend: Checkout has a COD/Khalti radio; choosing Khalti creates the order then redirects to Khalti's hosted payment page. A new /payment/khalti/callback page verifies the result and shows success/failed/error states. Order pages now show the real payment method, and there's a "Pay with Khalti" retry button for unpaid/failed Khalti orders.

Verified: server boots and connects to Atlas cleanly, the new route is auth-gated (401 unauthenticated, confirmed it's actually wired and not a stale process), client build/lint pass with no new issues.

How to test with sandbox credentials
Sign up at test-admin.khalti.com, go to Settings → Keys, copy the test secret key.
Paste it into server/.env as KHALTI_SECRET_KEY= (already has KHALTI_BASE_URL=https://dev.khalti.com/api/v2 set).
Restart the server (npm run dev in server/) and client (npm run dev in client/).
Go through checkout, select "Pay with Khalti", place the order — you'll be redirected to Khalti's sandbox payment page.
Use a test number 9800000000–9800000005, MPIN 1111, OTP 987654 to complete payment.
You'll land back on /payment/khalti/callback, which calls the server to verify and shows success/failure; check /orders/:id to confirm paymentStatus flipped to PAID.
To test the failure path, cancel on Khalti's page instead — paymentStatus should become FAILED and the retry button should appear.
Per the guide, eSewa is next (same flow, but HMAC-SHA256 signature verification instead of a lookup-by-pidx call) — let me know when you want to move on to it.
// Only allow internal app paths (e.g. "/checkout") so a crafted
// ?redirect= value can never send users to an external site.
export function safeRedirectPath(value, fallback = "/") {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }
  return fallback;
}

// Query string to append to auth links so the redirect survives
// navigation between login / signup / OTP pages.
export function redirectQuery(redirect) {
  return redirect && redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : "";
}

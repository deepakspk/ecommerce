const PORT_RE = /^\d{1,5}$/;
const URL_RE = /^https?:\/\/.+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function port(value) {
  if (isBlank(value)) return null;
  if (!PORT_RE.test(String(value).trim())) return "must be a valid port number";
  const n = Number(value);
  if (n < 1 || n > 65535) return "must be between 1 and 65535";
  return null;
}

function url(value) {
  if (isBlank(value)) return null;
  return URL_RE.test(String(value).trim()) ? null : "must be a valid http(s) URL";
}

function email(value) {
  if (isBlank(value)) return null;
  return EMAIL_RE.test(String(value).trim()) ? null : "must be a valid email address";
}

function oneOf(allowed) {
  return (value) => {
    if (isBlank(value)) return null;
    return allowed.includes(String(value).trim().toUpperCase()) ? null : `must be one of ${allowed.join(", ")}`;
  };
}

function text() {
  return () => null;
}

export const SETTINGS_SCHEMA = {
  SMTP: [
    { key: "SMTP_HOST", label: "SMTP Host", isSecret: false, validate: text(), envFallback: "SMTP_HOST", default: "" },
    { key: "SMTP_PORT", label: "SMTP Port", isSecret: false, validate: port, envFallback: "SMTP_PORT", default: "587" },
    { key: "SMTP_USER", label: "SMTP Username", isSecret: false, validate: text(), envFallback: "SMTP_USER", default: "" },
    { key: "SMTP_PASS", label: "SMTP Password", isSecret: true, validate: text(), envFallback: "SMTP_PASS", default: "" },
    {
      key: "SMTP_ENCRYPTION",
      label: "SMTP Encryption",
      isSecret: false,
      validate: oneOf(["TLS", "SSL", "NONE"]),
      envFallback: "",
      default: "TLS",
    },
    { key: "EMAIL_FROM_NAME", label: "Sender Name", isSecret: false, validate: text(), envFallback: "", default: "Ecommerce Nepal" },
    {
      key: "EMAIL_FROM_ADDRESS",
      label: "Sender Email",
      isSecret: false,
      validate: email,
      envFallback: "EMAIL_FROM",
      default: "no-reply@ecommerce-nepal.local",
    },
  ],
  CLOUDINARY: [
    {
      key: "CLOUDINARY_CLOUD_NAME",
      label: "Cloudinary Cloud Name",
      isSecret: false,
      validate: text(),
      envFallback: "CLOUDINARY_CLOUD_NAME",
      default: "",
    },
    {
      key: "CLOUDINARY_API_KEY",
      label: "API Key",
      isSecret: false,
      validate: text(),
      envFallback: "CLOUDINARY_API_KEY",
      default: "",
    },
    {
      key: "CLOUDINARY_API_SECRET",
      label: "API Secret",
      isSecret: true,
      validate: text(),
      envFallback: "CLOUDINARY_API_SECRET",
      default: "",
    },
  ],
  KHALTI: [
    { key: "KHALTI_PUBLIC_KEY", label: "Public Key", isSecret: false, validate: text(), envFallback: "", default: "" },
    {
      key: "KHALTI_SECRET_KEY",
      label: "Secret Key",
      isSecret: true,
      validate: text(),
      envFallback: "KHALTI_SECRET_KEY",
      default: "",
    },
  ],
  ESEWA: [
    {
      key: "ESEWA_MERCHANT_ID",
      label: "Merchant ID",
      isSecret: false,
      validate: text(),
      envFallback: "ESEWA_PRODUCT_CODE",
      default: "EPAYTEST",
    },
    {
      key: "ESEWA_SECRET_KEY",
      label: "Secret Key",
      isSecret: true,
      validate: text(),
      envFallback: "ESEWA_SECRET_KEY",
      default: "",
    },
    { key: "ESEWA_SUCCESS_URL", label: "Success URL", isSecret: false, validate: url, envFallback: "", default: "" },
    { key: "ESEWA_FAILURE_URL", label: "Failure URL", isSecret: false, validate: url, envFallback: "", default: "" },
  ],
  LOGISTICS: [
    {
      key: "LOGISTICS_PARTNER_NAME",
      label: "Partner Name",
      isSecret: false,
      validate: text(),
      envFallback: "",
      default: "NCM",
    },
    {
      key: "LOGISTICS_API_BASE_URL",
      label: "API Base URL",
      isSecret: false,
      validate: url,
      envFallback: "NCM_BASE_URL",
      default: "https://demo.nepalcanmove.com/api",
    },
    {
      key: "LOGISTICS_API_TOKEN",
      label: "API Token",
      isSecret: true,
      validate: text(),
      envFallback: "NCM_API_TOKEN",
      default: "",
    },
    {
      key: "LOGISTICS_PICKUP_BRANCH",
      label: "Pickup Branch",
      isSecret: false,
      validate: text(),
      envFallback: "NCM_PICKUP_BRANCH",
      default: "TINKUNE",
    },
  ],
  APPLICATION: [
    { key: "BASE_URL", label: "Base URL", isSecret: false, validate: url, envFallback: "", default: "" },
    {
      key: "FRONTEND_URL",
      label: "Frontend URL",
      isSecret: false,
      validate: url,
      envFallback: "CLIENT_URL",
      default: "http://localhost:5173",
    },
    {
      key: "DEFAULT_CURRENCY",
      label: "Default Currency",
      isSecret: false,
      validate: text(),
      envFallback: "",
      default: "NPR",
    },
    { key: "TIMEZONE", label: "Timezone", isSecret: false, validate: text(), envFallback: "", default: "Asia/Kathmandu" },
  ],
};

export const SETTINGS_GROUPS = Object.keys(SETTINGS_SCHEMA);

export function findKeyDef(key) {
  for (const group of SETTINGS_GROUPS) {
    const def = SETTINGS_SCHEMA[group].find((d) => d.key === key);
    if (def) return def;
  }
  return null;
}

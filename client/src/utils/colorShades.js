function hexToHsl(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      default: h = ((r - g) / d + 4) * 60;
    }
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Picks white or near-black text depending on which gives better contrast against
// the given background hex (WCAG relative luminance), so any admin-picked color works.
export function getContrastColor(hex) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return "#ffffff";
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#111827" : "#ffffff";
}

// Treats the given hex as the "600" shade (the one already used for buttons/links
// throughout this codebase) and derives the rest of the scale by adjusting lightness only.
export function deriveBrandScale(primaryHex) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primaryHex)) return null;
  const { h, s, l } = hexToHsl(primaryHex);

  return {
    50: hslToHex(h, s, Math.min(97, l + 44)),
    100: hslToHex(h, s, Math.min(93, l + 38)),
    500: hslToHex(h, s, Math.min(90, l + 8)),
    600: primaryHex,
    700: hslToHex(h, s, Math.max(5, l - 8)),
    800: hslToHex(h, s, Math.max(3, l - 15)),
  };
}

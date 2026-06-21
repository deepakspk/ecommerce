import { useEffect, useState } from "react";
import ThemeSettingsContext from "./ThemeSettingsContext";
import * as themeSettingsApi from "../api/themeSettings";
import { deriveBrandScale, getContrastColor } from "../utils/colorShades";

// primaryColor and secondaryColor are wired to the storefront — they drive the existing
// --color-brand-* / --color-secondary* CSS variables (client/src/index.css) that branded
// elements already consume via Tailwind's brand-*/secondary* classes, so no per-component
// changes are needed when the admin picks a new color.
// accentColor/buttonColor/textColor/backgroundColor are saved for later use.
function applyPrimaryColor(primaryColor) {
  const scale = deriveBrandScale(primaryColor);
  if (!scale) return;
  const root = document.documentElement.style;
  for (const [shade, hex] of Object.entries(scale)) {
    root.setProperty(`--color-brand-${shade}`, hex);
  }
}

function applySecondaryColor(secondaryColor) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(secondaryColor || "")) return;
  const root = document.documentElement.style;
  root.setProperty("--color-secondary", secondaryColor);
  root.setProperty("--color-secondary-contrast", getContrastColor(secondaryColor));
}

export default function ThemeSettingsProvider({ children }) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { theme: data } = await themeSettingsApi.getThemeSettings();
        if (ignore) return;
        setTheme(data);
        applyPrimaryColor(data?.primaryColor);
        applySecondaryColor(data?.secondaryColor);
      } catch {
        if (!ignore) setTheme({});
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <ThemeSettingsContext.Provider value={{ theme: theme || {}, loading }}>
      {children}
    </ThemeSettingsContext.Provider>
  );
}

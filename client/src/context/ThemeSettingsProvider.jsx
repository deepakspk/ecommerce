import { useEffect, useState } from "react";
import ThemeSettingsContext from "./ThemeSettingsContext";
import * as themeSettingsApi from "../api/themeSettings";
import { deriveBrandScale } from "../utils/colorShades";

// Only primaryColor is wired to the storefront right now — it drives the existing
// --color-brand-* CSS variables (client/src/index.css) that almost every branded element
// already consumes via Tailwind's brand-* classes, so no per-component changes are needed.
// secondaryColor/accentColor/buttonColor/textColor/backgroundColor are saved for later use.
function applyPrimaryColor(primaryColor) {
  const scale = deriveBrandScale(primaryColor);
  if (!scale) return;
  const root = document.documentElement.style;
  for (const [shade, hex] of Object.entries(scale)) {
    root.setProperty(`--color-brand-${shade}`, hex);
  }
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

import { useContext } from "react";
import ThemeSettingsContext from "../context/ThemeSettingsContext";

export function useThemeSettings() {
  return useContext(ThemeSettingsContext);
}

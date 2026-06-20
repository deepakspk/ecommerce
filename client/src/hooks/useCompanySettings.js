import { useContext } from "react";
import CompanySettingsContext from "../context/CompanySettingsContext";

export function useCompanySettings() {
  return useContext(CompanySettingsContext);
}

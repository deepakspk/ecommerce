import { useEffect, useState } from "react";
import CompanySettingsContext from "./CompanySettingsContext";
import * as companySettingsApi from "../api/companySettings";

function applyFavicon(faviconUrl) {
  if (!faviconUrl) return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}

export default function CompanySettingsProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { company: data } = await companySettingsApi.getCompanySettings();
        if (ignore) return;
        setCompany(data);
        applyFavicon(data?.faviconUrl);
      } catch {
        if (!ignore) setCompany({});
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
    <CompanySettingsContext.Provider value={{ company: company || {}, loading }}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

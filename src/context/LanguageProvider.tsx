import { useState, useCallback, useEffect, type ReactNode } from "react";
import { LanguageContext, translations, resolve, interpolate } from "./language";

type Lang = "en" | "es";

function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("portfolio-lang") as Lang) || "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("portfolio-lang", l);
    document.documentElement.setAttribute("data-lang", l);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = resolve(translations[lang], key);
      if (typeof value === "string") return interpolate(value, params);
      if (typeof value === "object" && value !== null) return JSON.stringify(value);
      return key;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;

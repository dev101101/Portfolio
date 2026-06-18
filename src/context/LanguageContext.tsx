import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import en from "../i18n/en";
import es from "../i18n/es";
import type { Translations } from "../i18n/en";

type Lang = "en" | "es";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Lang, Translations> = { en, es };

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

function resolve(obj: Record<string, unknown>, key: string): unknown {
  return (obj as Record<string, unknown>)[key];
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
});

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

function useT() {
  const ctx = useContext(LanguageContext);
  return { t: ctx.t, lang: ctx.lang, setLang: ctx.setLang };
}

function useLanguage() {
  return useContext(LanguageContext);
}

export { LanguageProvider, useT, useLanguage };
export default LanguageContext;

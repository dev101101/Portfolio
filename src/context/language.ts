import { createContext, useContext } from "react";
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

function useT() {
  const ctx = useContext(LanguageContext);
  return { t: ctx.t, lang: ctx.lang, setLang: ctx.setLang };
}

function useLanguage() {
  return useContext(LanguageContext);
}

export type { Lang };
export { LanguageContext, useT, useLanguage, interpolate, resolve, translations };

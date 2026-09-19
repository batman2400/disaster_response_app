"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { HOME_COPY, type HomeCopyKey } from "./home-copy";
import { TRANSLATIONS, type SupportedLanguage, type TranslationDictionary } from "./translations";

export type I18nKey = keyof TranslationDictionary | HomeCopyKey;

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

function lookup(lang: SupportedLanguage, key: I18nKey): string {
  const home = HOME_COPY[lang] as unknown as Record<string, string> | undefined;
  const core = TRANSLATIONS[lang] as unknown as Record<string, string> | undefined;
  return (
    home?.[key] ||
    core?.[key] ||
    HOME_COPY.en[key as HomeCopyKey] ||
    TRANSLATIONS.en[key as keyof TranslationDictionary] ||
    String(key)
  );
}

interface LanguageContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "fender_lang_pref";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (saved && (saved === "en" || saved === "si" || saved === "ta")) {
        setLangState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (next: SupportedLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: I18nKey, vars?: Record<string, string | number>): string => {
    return interpolate(lookup(lang, key), vars);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback safe dummy context if rendered outside provider
    return {
      lang: "en" as SupportedLanguage,
      setLang: () => {},
      t: (key: I18nKey, vars?: Record<string, string | number>) => interpolate(lookup("en", key), vars),
    };
  }
  return ctx;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  const options: { id: SupportedLanguage; label: string; full: string }[] = [
    { id: "en", label: "EN", full: "English" },
    { id: "si", label: "සිං", full: "සිංහල" },
    { id: "ta", label: "த", full: "தமிழ்" },
  ];

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-white/90 p-0.5 shadow-sm backdrop-blur-md ${className}`}
      role="group"
      aria-label={t("language_selector")}
    >
      {options.map((opt) => {
        const active = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLang(opt.id)}
            title={opt.full}
            className={`rounded-lg px-1.5 py-1 text-[10px] font-bold transition-all sm:px-2.5 sm:text-xs ${
              active
                ? "bg-brand text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

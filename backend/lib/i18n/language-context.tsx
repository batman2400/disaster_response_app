"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TRANSLATIONS, type SupportedLanguage, type TranslationDictionary } from "./translations";

interface LanguageContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary) => string;
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

  const t = (key: keyof TranslationDictionary): string => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || String(key);
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
      t: (key: keyof TranslationDictionary) => TRANSLATIONS.en[key] || String(key),
    };
  }
  return ctx;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  const options: { id: SupportedLanguage; label: string; full: string }[] = [
    { id: "en", label: "EN", full: "English" },
    { id: "si", label: "සිං", full: "සිංහල" },
    { id: "ta", label: "த", full: "தமிழ்" },
  ];

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200 bg-white/90 p-0.5 shadow-sm backdrop-blur-md ${className}`}
      role="group"
      aria-label="Select Language"
    >
      {options.map((opt) => {
        const active = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLang(opt.id)}
            title={opt.full}
            className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all sm:px-2.5 sm:text-xs ${
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

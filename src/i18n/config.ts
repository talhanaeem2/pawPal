import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en/translation.json";
import ur from "./locales/ur/translation.json";
import ar from "./locales/ar/translation.json";

export const SUPPORTED_LANGUAGES = ["en", "ur", "ar"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const RTL_LANGUAGES: Set<SupportedLanguage> = new Set(["ur", "ar"]);

export function isRTL(lang: string): boolean {
    return RTL_LANGUAGES.has(lang as SupportedLanguage);
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ur: { translation: ur },
            ar: { translation: ar },
        },
        // Language detection order: localStorage → browser language → fallback
        detection: {
            order: ["localStorage", "navigator"],
            lookupLocalStorage: "pawpal-language",
            caches: ["localStorage"],
        },
        fallbackLng: "en",
        supportedLngs: SUPPORTED_LANGUAGES,
        interpolation: {
            // React already handles XSS
            escapeValue: false,
        },
    });

// Apply RTL direction to the document whenever the language changes
function applyDirection(lang: string) {
    if (typeof document === "undefined") return;

    const dir = isRTL(lang) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
}

i18n.on("languageChanged", applyDirection);

// Apply on initial load
if (typeof document !== "undefined") {
    applyDirection(i18n.language);
}

export default i18n;
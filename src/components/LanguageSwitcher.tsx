import { useTranslation } from "react-i18next";
import { useState } from "react";

const flags: Record<string, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
};

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 px-2 py-1 border rounded bg-white hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
        aria-label="Select language"
      >
        <span className="text-xl">{flags[i18n.language] || "🌐"}</span>
        <span className="hidden md:inline">{i18n.language.toUpperCase()}</span>
        <svg className="w-3 h-3 ml-1" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5L10 12.25L14.75 7.5" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-28 bg-white border rounded shadow-lg z-10">
          <button
            className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-100 ${i18n.language === "en" ? "font-bold bg-gray-50" : ""}`}
            onClick={() => changeLanguage("en")}
          >
            <span className="text-xl">{flags.en}</span> English
          </button>
          <button
            className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-100 ${i18n.language === "de" ? "font-bold bg-gray-50" : ""}`}
            onClick={() => changeLanguage("de")}
          >
            <span className="text-xl">{flags.de}</span> Deutsch
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

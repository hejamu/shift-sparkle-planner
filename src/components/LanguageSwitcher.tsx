import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => changeLanguage("en")}
        className={
          i18n.language === "en"
            ? "font-bold underline text-blue-600"
            : "text-gray-600 hover:underline"
        }
      >
        English
      </button>
      <span>|</span>
      <button
        onClick={() => changeLanguage("de")}
        className={
          i18n.language === "de"
            ? "font-bold underline text-blue-600"
            : "text-gray-600 hover:underline"
        }
      >
        Deutsch
      </button>
    </div>
  );
};

export default LanguageSwitcher;

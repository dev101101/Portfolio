import { useT } from "../context/language";

function LangSwitcher() {
  const { lang, setLang } = useT();

  return (
    <div className="lang-switcher">
      <button
        className={`lang-switcher-btn${lang === "en" ? " active" : ""}`}
        onClick={() => setLang("en")}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        className={`lang-switcher-btn${lang === "es" ? " active" : ""}`}
        onClick={() => setLang("es")}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  );
}

export default LangSwitcher;

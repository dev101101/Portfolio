import type { ReactNode } from "react";
import { useT } from "../context/language";

interface FileProps {
  detail: ReactNode;
  onBack?: () => void;
}

function File({ detail, onBack }: FileProps) {
  const { t } = useT();
  return (
    <div className="window-content-inner">
      {onBack && (
        <button className="filebrowser-back" onClick={onBack} aria-label={t("explorer.back")}>
          {t("explorer.back")}
        </button>
      )}
      {detail}
    </div>
  );
}

export default File;

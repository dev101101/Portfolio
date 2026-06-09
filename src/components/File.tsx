import type { ReactNode } from "react";

interface FileProps {
  detail: ReactNode;
  onBack?: () => void;
}

function File({ detail, onBack }: FileProps) {
  return (
    <div className="window-content-inner">
      {onBack && (
        <button className="filebrowser-back" onClick={onBack}>
          ← Back
        </button>
      )}
      {detail}
    </div>
  );
}

export default File;

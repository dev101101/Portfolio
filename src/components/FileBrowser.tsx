import { useState } from "react";
import { FolderSmallSvg, FileSmallSvg } from "./FolderSvgs";

interface FileBrowserItem {
  name: string;
  type: "file" | "folder";
  detail: React.ReactNode;
}

interface FileBrowserProps {
  title: string;
  items: FileBrowserItem[];
}

function FileBrowser({ title, items }: FileBrowserProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    const item = items.find((i) => i.name === selected);
    if (!item) return null;
    return (
      <div className="window-content-inner">
        <button className="filebrowser-back" onClick={() => setSelected(null)}>
          ← Back
        </button>
        {item.detail}
      </div>
    );
  }

  return (
    <div className="window-content-inner">
      <h1>{title}</h1>
      <div className="filebrowser-list">
        {items.map((item) => (
          <div
            key={item.name}
            className="filebrowser-item"
            onClick={() => setSelected(item.name)}
          >
            {item.type === "folder" ? <FolderSmallSvg /> : <FileSmallSvg />}
            <span className="filebrowser-item-name">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileBrowser;
export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export interface Folder {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
}

export const FOLDERS: Folder[] = [
  { id: "about", label: "About Me", type: "file" },
  { id: "projects", label: "Projects", type: "folder" },
  { id: "blog", label: "Blog", type: "folder" },
  { id: "github", label: "GitHub", type: "folder" },
  { id: "speaking", label: "Speaking", type: "folder" },
  { id: "terminal", label: "Terminal", type: "terminal" },
];

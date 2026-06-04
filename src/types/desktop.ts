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
  icon: string;
}

export const FOLDERS: Folder[] = [
  { id: "about", label: "About Me", icon: "📁" },
  { id: "projects", label: "Projects", icon: "📁" },
  { id: "blog", label: "Blog", icon: "📁" },
  { id: "github", label: "GitHub", icon: "📁" },
  { id: "speaking", label: "Speaking", icon: "📁" },
];

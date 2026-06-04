export interface Theme {
  id: string;
  name: string;
  description: string;
}

export const THEMES: Theme[] = [
  { id: "pixel", name: "Pixel", description: "Retro 8-bit aesthetic" },
  { id: "classic", name: "Classic", description: "Windows 95 nostalgia" },
  { id: "modern", name: "Modern", description: "Clean and minimal" },
  { id: "terminal", name: "Terminal", description: "Green-on-black terminal" },
];

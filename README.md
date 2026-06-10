# Portfolio — Desktop Simulator

An interactive desktop simulator portfolio built with React, TypeScript, and an in-browser SQLite database. Drag icons, open windows, edit files, run a terminal — all in the browser.

## Features

- **Desktop Environment** — Drag-and-drop icons, resizable windows, right-click context menus, inline rename
- **4 Themes** — Pixel (retro 8-bit), Classic (Windows 95), Modern (clean flat), Terminal (green-on-black)
- **In-Browser SQLite** — Full SQL database via sql.js (WebAssembly), persisted to localStorage
- **File Explorer** — Browse sections and items with a sidebar, preview/edit item content with markdown
- **File Editor** — Custom directive syntax (`[title]`, `[description]`, `[tags]`, `[meta]`), preview mode
- **CLI Terminal** — Full command-line interface: `ls`, `cd`, `cat`, `sections`, `add-item`, `rm-section`, `export`, raw SQL
- **Blog API** — Fetches articles from dev.to (stale-while-revalidate), falls back to rich seed data
- **Drag to/from Explorer** — Items inside folders can be dragged to the desktop; file icons can be dropped onto folders
- **PWA** — Installable as a standalone app with offline support (manifest + service worker)
- **Mobile Responsive** — Touch events, scaled layout at 768px and 480px breakpoints

## Architecture

```
┌───────────────────────────────────────────┐
│                   App                      │
│  (window manager, theme, DB coordinator)   │
├──────────┬──────────────────┬──────────────┤
│ Desktop  │   Window (x N)   │   Taskbar    │
│ (icons,  │ ┌──────────────┐ │ (start menu, │
│  drag)   │ │ FileExplorer │ │  apps list,  │
│          │ │ ContentPage  │ │  clock)      │
│          │ │ ItemEditor   │ │              │
│          │ │ TextEditor   │ │              │
│          │ │ Terminal     │ │              │
│          │ └──────────────┘ │              │
└──────────┴──────────────────┴──────────────┘
         │            │
    localStorage  sql.js (WASM)
```

| Layer | Technology | Role |
|-------|-----------|------|
| Rendering | React 19 + Vite | Component tree, window reconciliation, HMR |
| Styling | Plain CSS + custom properties | 4 themes via `data-theme` attribute |
| State | React hooks (useState, useCallback, useRef) | Window positions, z-index, drag state |
| Database | sql.js (SQLite → WebAssembly) | Persistence to localStorage |
| Content | react-markdown + remark-gfm | Markdown rendering for articles |

## Themes

| Theme | Description |
|-------|-------------|
| **Pixel** | Retro 8-bit aesthetic with pixel fonts and sharp borders |
| **Classic** | Windows 95 look with outset borders and navy titlebars |
| **Modern** | Clean flat design with rounded corners and macOS-style buttons |
| **Terminal** | Green-on-black terminal aesthetic with glow effects |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run ESLint across the codebase |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Screenshots

*(Add screenshots here)*

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 |
| Database | sql.js (SQLite via WebAssembly) |
| Styling | Plain CSS with CSS variables |

## Project Structure

```
src/
├── App.tsx                  # Main app (windows, theme, DB, drag logic)
├── components/
│   ├── Clock.tsx            # Taskbar clock
│   ├── ContentPage.tsx      # Card-style markdown renderer
│   ├── Desktop.tsx          # Desktop icons, wallpaper, drag-drop
│   ├── File.tsx             # Single file content wrapper
│   ├── FileExplorer.tsx     # Sidebar + file browser
│   ├── FileNavbar.tsx       # Reusable toolbar (Save, Preview, etc.)
│   ├── Folder.tsx           # Item list within a section
│   ├── FolderIcon.tsx       # Desktop icon with drag/rename
│   ├── FolderSvgs.tsx       # Theme-aware SVG icons
│   ├── ItemEditor.tsx       # Edit individual items in a folder
│   ├── StartMenu.tsx        # Theme picker menu
│   ├── Taskbar.tsx          # Bottom taskbar with start/apps/clock
│   ├── Terminal.tsx         # In-browser CLI
│   ├── TextEditor.tsx       # Section-level text editor
│   ├── Window.tsx           # Draggable/resizable window container
│   └── buildProfileDetail.tsx
├── data/
│   ├── blog-api.ts          # dev.to API client with cache
│   ├── constants.ts         # PROTECTED_IDS, DEVTO_USERNAME
│   ├── controllers/         # Business logic layer
│   ├── db.ts                # Database initialization
│   ├── models/              # SQL query layer
│   └── seed.ts              # Rich seed data (projects, blog, talks)
├── styles/
│   └── App.css              # All CSS (~2640 lines)
└── types/
    ├── desktop.ts           # WindowState, Folder interfaces
    └── themes.ts            # Theme type definitions
```

## Terminal Commands

| Command | Description |
|---------|-------------|
| `help` | List available commands |
| `ls` | List sections |
| `cd <id>` | Navigate to a section |
| `pwd` | Show current section |
| `cat <title>` | Show item content |
| `profile` | View profile data |
| `sections` | List all sections with IDs |
| `items` | List items in current section |
| `add-section <id> <label> <type>` | Create a new section |
| `add-item <section_id> <title>` | Add an item to a section |
| `rm-item <id>` | Remove an item |
| `rm-section <id>` | Remove a section and its items |
| `export` | Export database as JSON |
| `sql <query>` | Run raw SQL |

## Contributing

Contributions are welcome. Open an issue or PR for any improvements.

## License

MIT

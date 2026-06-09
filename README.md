# Portfolio

An interactive desktop simulator portfolio built with React, TypeScript, and an in-browser SQLite database.

## Features

- **Desktop Environment** — Draggable icons, resizable windows, right-click context menus
- **4 Themes** — Pixel (retro 8-bit), Classic (Windows 95), Modern (clean), Terminal (green-on-black)
- **In-Browser Database** — SQLite via sql.js, persisted to localStorage
- **CLI Terminal** — Full command-line interface for database management
- **File Editor** — Custom directive syntax with preview mode
- **PWA** — Installable as a standalone app with offline support

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 |
| Database | sql.js (SQLite via WebAssembly) |
| Styling | Plain CSS with CSS variables |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |

## Terminal Commands

| Command | Description |
|---------|-------------|
| `help` | List available commands |
| `ls`, `cd`, `pwd`, `cat` | File system navigation |
| `profile` | View profile data |
| `sections` | List all sections |
| `items <section_id>` | List items in a section |
| `add-section <id> <label> <type>` | Create a new section |
| `add-item <section_id> <title>` | Add an item |
| `rm-item <id>` | Remove an item |
| `rm-section <id>` | Remove a section |
| `export` | Export database as JSON |
| `sql <query>` | Run raw SQL |

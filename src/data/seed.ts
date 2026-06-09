import type { Database } from "sql.js";
import { upsertProfile } from "./models/profile";
import { upsertSection, upsertItem } from "./models/section";

export function seed(db: Database) {
  upsertProfile(db, {
    avatar: "https://avatars.githubusercontent.com/u/170589535",
    name: "Hey, I'm Diego!",
    tagline: "Software Engineer & Creator",
    bio: `I am a Software Engineer with a solid track record of building scalable and efficient applications since 2022. My core ecosystem is built on Node.js, where I architect robust server-side logic and manage relational databases such as MySQL and SQLite. On the client side, I have extensive experience using React to develop dynamic and interactive user interfaces.

Currently, I am dedicated to deepening my expertise in backend services, optimizing data handling, and refining business logic. I am passionate about solving complex infrastructure challenges and am actively seeking new professional opportunities where I can contribute to high-performance backend systems.

Beyond the terminal, I am an enthusiast of Pixel Art. This hobby allows me to merge my love for technology with visual creativity, a discipline I occasionally showcase through my social media pieces.`,
    skills: ["TypeScript", "React", "Node.js", "Rust", "Python", "Go", "PostgreSQL", "Docker"],
  });

  const sections = [
    { id: "about", label: "About Me", type: "file" as const, sort_order: 0 },
    { id: "projects", label: "Projects", type: "folder" as const, sort_order: 1 },
    { id: "blog", label: "Blog", type: "folder" as const, sort_order: 2 },
    { id: "github", label: "GitHub", type: "folder" as const, sort_order: 3 },
    { id: "speaking", label: "Speaking", type: "folder" as const, sort_order: 4 },
  ];

  for (const s of sections) {
    upsertSection(db, s);
  }

  upsertItem(db, {
    id: "about-profile", section_id: "about", title: "Profile", description: "Avatar and tagline", sort_order: 0,
    meta: { avatarUrl: "https://avatars.githubusercontent.com/u/170589535", name: "Hey, I'm Diego!", tagline: "Software Engineer & Creator" },
  });
  upsertItem(db, {
    id: "about-bio", section_id: "about", title: "Bio", description: "Full biography", body: `I am a Software Engineer with a solid track record of building scalable and efficient applications since 2022. My core ecosystem is built on Node.js, where I architect robust server-side logic and manage relational databases such as MySQL and SQLite. On the client side, I have extensive experience using React to develop dynamic and interactive user interfaces.

Currently, I am dedicated to deepening my expertise in backend services, optimizing data handling, and refining business logic. I am passionate about solving complex infrastructure challenges and am actively seeking new professional opportunities where I can contribute to high-performance backend systems.

Beyond the terminal, I am an enthusiast of Pixel Art. This hobby allows me to merge my love for technology with visual creativity, a discipline I occasionally showcase through my social media pieces.`, sort_order: 1,
  });
  upsertItem(db, {
    id: "about-skills", section_id: "about", title: "Skills", description: "Technologies and tools", sort_order: 2,
    tags: ["TypeScript", "React", "Node.js", "Rust", "Python", "Go", "PostgreSQL", "Docker"],
  });

  upsertItem(db, {
    id: "proj-contab", section_id: "projects", title: "Contab", description: "Automation of purchase and sale invoice registration for accounting", sort_order: 0,
    tags: ["accounting", "invoicing", "SMEs"],
    meta: { language: "TypeScript" },
    body: `# Contab

System to transfer purchase and sale documents to an accounting program.

Automates the registration of purchase and sale invoices and receipts, eliminating manual data entry and reducing errors in daily accounting.

## Features
- Automated registration of purchase and sale invoices
- Direct transfer to accounting programs
- Reduction of human errors in data entry
- Simple interface for small businesses`,
  });
  upsertItem(db, {
    id: "proj-contab2", section_id: "projects", title: "Contab2", description: "Extension of Contab with receipt management and monthly worksheet", sort_order: 1,
    tags: ["accounting", "receipts", "export", "SMEs"],
    meta: { language: "TypeScript" },
    body: `# Contab2

Extension of Contab that adds receipt-by-honorarium management and a worksheet for monthly tax declarations.

## Features
- Everything in Contab (invoice and receipt registration)
- Receipt-by-honorarium management
- Mass export format for receipts-by-honorarium
- Worksheet to preview how the monthly declaration would look
- Preliminary reports before sending to the accountant`,
  });
  upsertItem(db, {
    id: "proj-contabia", section_id: "projects", title: "ContabIA", description: "AI-powered accounting for micro and small businesses", sort_order: 2,
    tags: ["AI", "accounting", "voice", "cardex", "SMEs"],
    meta: { language: "TypeScript" },
    body: `# ContabIA

The evolution of Contab with integrated artificial intelligence, designed especially for micro and small businesses (corner stores, street vendors).

## Current features
- Everything in Contab and Contab2
- Automatic USD to PEN conversion using AI
- Intelligent assistant for tax deduction recommendations
- Personalized recommendations based on client profile

## Coming soon
- Voice-activated invoice and receipt issuance using AI
- Cardex for product warehouse management
- Mobile-optimized interface
- Real-time multi-currency support`,
  });

  upsertItem(db, {
    id: "blog-arch", section_id: "blog", title: "Why I Switched to Arch Linux (and never looked back)", description: "My journey from distro-hopper to devoted Arch user", date: "2026-06-01", sort_order: 0,
    body: `After years on Ubuntu, I finally took the plunge into Arch Linux. The rolling release model, the AUR, and the sheer control over every aspect of the system won me over. Here's my journey from distro-hopper to devoted Arch user, including my first painful but rewarding install experience.`,
  });
  upsertItem(db, {
    id: "blog-niri", section_id: "blog", title: "Niri: A Scrollable-Tiling Window Manager", description: "A Wayland compositor redefining productivity on Linux", date: "2026-05-15", sort_order: 1,
    body: `Niri is a Wayland compositor inspired by GNOME's horizontal scrollable workspaces. It offers a unique tiling model where windows are arranged in columns that you scroll through. Combined with its built-in AI scene recognition for smart window placement, Niri is redefining productivity on Linux.`,
  });
  upsertItem(db, {
    id: "blog-ai-dev", section_id: "blog", title: "AI-Assisted Development: Boosting Productivity in 2026", description: "How AI is transforming the developer workflow", date: "2026-04-20", sort_order: 2,
    body: `From AI-powered code completion to intelligent debugging assistants, the developer workflow has been transformed. I share my setup combining local LLMs, automated refactoring tools, and voice commands to achieve a truly frictionless coding environment on Arch Linux.`,
  });
  upsertItem(db, {
    id: "blog-terminal", section_id: "blog", title: "My Terminal-First Productivity Workflow", description: "tmux, Neovim, yazi, and a curated set of CLI tools", date: "2026-03-10", sort_order: 3,
    body: `tmux, Neovim, yazi, and a carefully curated set of CLI tools form the backbone of my daily workflow. I walk through my dotfiles, my keybindings, and how I manage projects, tasks, and notes entirely from the terminal — with Niri as my canvas.`,
  });

  upsertItem(db, {
    id: "gh-profile", section_id: "github", title: "dev101101", description: "Software Engineer \u2022 Backend & AI \u2022 Arch Linux", sort_order: 0,
    url: "https://github.com/dev101101",
    tags: ["TypeScript", "Node.js", "React", "Python", "Rust", "PostgreSQL"],
    body: `I build scalable backend systems and AI-powered tools for small businesses. My work focuses on automating accounting workflows with modern web technologies.`,
  });

  upsertItem(db, {
    id: "talk-fosdem", section_id: "speaking", title: "Building Desktop Apps with Web Tech @ FOSDEM 2026", description: "How I built a desktop experience in the browser", date: "Feb 2026", sort_order: 0,
    meta: { event: "FOSDEM 2026" },
    body: `How I built a full desktop experience in the browser using React, TypeScript, and CSS \u2014 blurring the line between web and native.`,
  });
  upsertItem(db, {
    id: "talk-lima", section_id: "speaking", title: "AI for Small Business @ Lima Tech Summit 2025", description: "Practical AI applications for micro enterprises in Peru", date: "Nov 2025", sort_order: 1,
    meta: { event: "Lima Tech Summit 2025" },
    body: `Practical applications of AI for micro and small enterprises in Peru \u2014 from automated accounting to voice-based invoicing.`,
  });
  upsertItem(db, {
    id: "talk-flisol", section_id: "speaking", title: "Linux on the Desktop: My Arch Journey @ FLISOL 2025", description: "Adopting Arch Linux and Niri as a daily driver", date: "Apr 2025", sort_order: 2,
    meta: { event: "FLISOL 2025" },
    body: `A talk about adopting Arch Linux as a daily driver, the Niri window manager, and building a terminal-first productivity workflow.`,
  });
}

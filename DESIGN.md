# LocalAI — UI/UX Design Specification & System Guide

**Version**: 2.0  
**Design Philosophy**: Minimalism + Swiss Design + Bento Grid  
**Governing Standard**: Apple Human Interface Guidelines (HIG) + Modern Productivity Tool Standards

---

## 1. UI/UX Design Brief

LocalAI is a private, offline AI desktop assistant running natively on Windows. Its interface communicates serenity, precision, and privacy. The design strictly rejects the flashy, hyper-saturated aesthetic common in generic AI demos in favor of timeless Swiss typography, balanced Bento structures, and distraction-free white space.

### Core Principles
1. **One Screen, One Job**: The Chat screen is exclusively for focused conversation and reading. Knowledge Base / Library, Workspaces, and System Settings are dedicated, quiet full views or unobtrusive sheets, never congested panels fighting for viewport space.
2. **Swiss Typography & Rhythm**: Clean neutral hierarchy, strict vertical rhythm, generous line heights (`leading-relaxed`), and high legibility.
3. **Bento Grid Architecture**: Balanced rectangular cards with subtle 1px dividers, restrained border radiuses (`rounded-xl` to `rounded-2xl`), and consistent 8px grid padding.
4. **Restrained Color Discipline**: 95% neutral grayscale with exactly one soft accent hue. Never use decorative gradients, glow effects, or purple blurs.
5. **Calm Productivity Motion**: Transitions use 150–250ms ease-out curves (`transition-all duration-200 ease-out`). Springy or bouncy animations are forbidden.

---

## 2. Color Palette & Theming

The application fully supports light and dark modes, automatically inheriting Windows system preferences on launch while allowing explicit override.

### Light Mode (`bg-neutral-50` / `#F9FAFB`)
- **Canvas / App Background**: `#F8F9FA` (`bg-slate-50/50`)
- **Chat Reading Column**: `#FFFFFF` (`bg-white`)
- **Sidebar Background**: `#F4F5F7` (`bg-gray-100/70`)
- **Card / Bento Surface**: `#FFFFFF` (`bg-white`) with border `#E5E7EB` (`border-gray-200`)
- **Dividers & Borders**: `#E5E7EB` (`border-gray-200`)
- **Primary Text**: `#111827` (`text-gray-900`)
- **Secondary / Subtext**: `#4B5563` (`text-gray-600`)
- **Muted / Metadata**: `#6B7280` (`text-gray-500`)
- **Soft Accent**: `#2563EB` (Soft Royal Blue / Slate Indigo, subtle hover `#1D4ED8`)
- **Destructive**: `#DC2626` (`text-red-600`)

### Dark Mode (`dark` / `#0F1012`)
- **Canvas / App Background**: `#0F1012` (Quiet deep obsidian)
- **Chat Reading Column**: `#131416` (Soft charcoal)
- **Sidebar Background**: `#17181B`
- **Card / Bento Surface**: `#1C1D21` with border `#282A2E`
- **Dividers & Borders**: `#26282D`
- **Primary Text**: `#F3F4F6` (`text-gray-100`)
- **Secondary / Subtext**: `#9CA3AF` (`text-gray-400`)
- **Muted / Metadata**: `#6B7280` (`text-gray-500`)
- **Soft Accent**: `#3B82F6` (Muted electric blue, hover `#60A5FA`)
- **Destructive**: `#EF4444` (`text-red-400`)

---

## 3. Typography Scale (Apple HIG & Swiss Standards)

LocalAI utilizes system sans-serif (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) with monospace for telemetry, code, and token statistics.

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display** | 20px (`text-xl`) | Medium (500) | 1.4 | Calm empty-state greeting |
| **Headline** | 16px (`text-base`) | Medium (500) | 1.4 | Modal titles, Workspace names |
| **Body (Chat)** | 14px (`text-sm`) | Normal (400) | 1.6 (`leading-relaxed`) | User & Assistant messages |
| **Subheadline** | 13px (`text-xs`) | Medium (500) | 1.4 | Sidebar items, tab labels |
| **Caption / Meta** | 11px-12px | Normal (400) | 1.3 | Model name, tok/s, citations, dates |
| **Code / Data** | 12px (`text-xs`) | Normal (400) | 1.5 (`font-mono`) | Inlined code, statistics, paths |

---

## 4. Spacing System (8px Grid)

Consistent increments throughout the UI:
- `4px` (`gap-1`, `p-1`): Micro button spacing
- `8px` (`gap-2`, `p-2`): Compact groupings, icon + label spacing
- `16px` (`gap-4`, `p-4`): Standard Bento card padding, sidebar margins
- `24px` (`gap-6`, `p-6`): Modal inner padding, section separations
- `32px` (`py-8`): Message bubble vertical spacing in the chat thread

---

## 5. Layout Architecture & Wireframes

### A. Window Shell (1280x800 & 1920x1080 Responsive)
- **Left Sidebar**: 260px fixed width, collapsible on narrow viewports (`<1024px`).
  - Top: Workspace Switcher dropdown ("All Chats" or selected Workspace).
  - Primary Action: Exactly ONE prominent "New Chat" button.
  - Navigation links: Workspaces, Library (Knowledge), Search.
  - History Feed: Grouped chronologically: *Today*, *Yesterday*, *This Week*, *Older*.
  - Rule: Max 7 visible history items per group with clean "Show more" expander.
  - Bottom Footer: Detected Model status, Hardware spec link, Settings trigger.
- **Main Viewport**: Dedicated view container switching seamlessly between:
  1. `chat` (Focused conversation view)
  2. `workspaces` (Workspace management Bento hub)
  3. `library` (Folder & file tree, sync status, document inspector)
  4. `settings` (System settings, hardware diagnostics, privacy audit)

### B. Chat Column Layout
- Centered reading column strictly constrained to `max-w-3xl` (~768px).
- Generous line height and comfortable margins preventing eye fatigue.
- Under assistant messages: Subtle metadata in small muted text: `qwen3:4b · 34.2 tok/s · 1.4s`. No loud colorful badges.
- Citations: Clean, collapsible footnote cards: `Source: MyDocs/Report.pdf, p.3`.

### C. Chat Input Box
- Bottom-docked inside the centered `max-w-3xl` column.
- One rounded container (`rounded-2xl` or `rounded-xl`) with subtle 1px border.
- Exactly three visible primary controls:
  1. **Attach (`+`)**: Opens file or folder upload popover.
  2. **Voice (`Mic`)**: Starts instant offline Whisper transcription.
  3. **Send / Stop (`ArrowUp` / `Square`)**: Dispatches message or cancels stream.
- Advanced settings (temperature, system prompt, context length) are moved into an unobtrusive `...` menu or Workspace settings, never crowding the input row.

### D. Calm Empty State
- Centered vertically and horizontally.
- Calm headline: `LocalAI`.
- Single subtitle: *"Your private AI — chats and files stay on this PC"*.
- Exactly 3 subtle suggested prompt cards in a clean Bento row.
- Zero clutter, zero feature dumps.

---

## 6. Rejected Looks (Forbidden in LocalAI)

- ❌ **Purple Gradients**: No generic purple/violet gradient text or buttons.
- ❌ **Random Emojis**: Use clean monochrome SVG icons (Lucide React) instead of illustrative emojis.
- ❌ **Glassmorphism Overload**: No extreme backdrop-blur layers with 20% opacity borders.
- ❌ **Neumorphism**: No inset soft double-shadows with poor contrast.
- ❌ **Maximalism & Brutalism**: No raw harsh borders, no shouting all-caps slogans, no neon glow.
- ❌ **Cluttered Sidebars**: Never exceed 1 primary action button and never pack 10 loose action icons.
- ❌ **Horizontal Scrolling**: Strictly no horizontal scrolling at 1280x800 or 1920x1080.
- ❌ **More than 3 Cards in a Row**: Bento grids max out at 3 cards across.

---

## 7. Interactive Feedback & Confirmations

- **Hover & Focus**: All buttons, cards, and input fields provide a visible, smooth 150ms state change (`hover:bg-neutral-100 dark:hover:bg-neutral-800` and `focus-visible:ring-2 focus-visible:ring-blue-500/50`).
- **Destructive Confirmation**: Every delete action (deleting a chat, workspace, file, or model) prompts with a clear modal confirmation:
  - Deleting a Workspace asks: *"Move chats to All Chats"* vs *"Delete chats and files too"*.
  - Deleting a chat requires an explicit confirmation.

---

## 8. Built Component Inventory & References

- **ChatArea (`src/renderer/src/components/ChatArea.tsx`)**: Centered `max-w-3xl` reading column, quiet tokens/sec metadata, rendered Markdown with syntax highlighting.
- **ChatInput (`src/renderer/src/components/ChatInput.tsx`)**: Rounded bottom box with `+` Attach, `Mic` Offline Whisper, and `Send` action.
- **Sidebar (`src/renderer/src/components/Sidebar.tsx`)**: Collapsible 260px bar, workspace filter, single New Chat button, grouped history with 7-item overflow cap.
- **WorkspacesView (`src/renderer/src/components/WorkspacesView.tsx`)**: Bento grid of project spaces with custom memory, instruction notes, and scoped file count.
- **LibraryView (`src/renderer/src/components/LibraryView.tsx`)**: Document repository with differential sync status, file hash tracking, and size metrics.
- **SettingsModal (`src/renderer/src/components/SettingsModal.tsx`)**: Tabbed configuration with Hardware Specs, Models & Engine, Voice, System Persona, Appearance, Privacy Audit, and About tab.
- **ImageLightboxModal (`src/renderer/src/components/ImageLightboxModal.tsx`)**: Distraction-free zoom modal with dark overlay for vision inputs.
- **OomWarningModal (`src/renderer/src/components/OomWarningModal.tsx`)**: Non-disruptive memory guardrail providing one-click fallback to 4B/1.7B tiers.
- **FolderUploadModal (`src/renderer/src/components/FolderUploadModal.tsx`)**: Recursive directory scanner with differential sync count before indexing.



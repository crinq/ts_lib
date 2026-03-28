# ts_lib

Reusable TypeScript UI components for browser-based panel applications.

## Components

### Layout System
- **LayoutManager** — Header/main/footer shell with panel registry and state broadcasting
- **HorizontalSplitter / VerticalSplitter** — Resizable split panes with drag handles
- **HorizontalSwitcher / VerticalSwitcher** — Tabbed panel containers
- **Panel** — Interface for content panels (`id`, `title`, `createView`, `onStateChange`)

### Text Editor
- **TextEditor** — Syntax-highlighted code editor panel with:
  - Configurable keyword/builtin/comment highlighting
  - Line numbers with scroll sync
  - Undo/redo stack (Ctrl+Z / Ctrl+Shift+Z)
  - Auto-indent on Enter, Tab inserts spaces
  - Error panel with line/column display
  - Debounced change callbacks

### Tutorial
- **startTutorial** — Step-by-step guided tour with spotlight cutouts and positioned tooltips
- **shouldShowTutorial** — Check localStorage for first-visit detection
- Steps defined as `{ target, title, body, placement }` — fully app-agnostic

### Utilities
- **createModal** — Modal overlay with backdrop dismiss, toggle support, custom styling
- **escapeHtml / escapeRegex** — String escaping helpers

## Usage

```typescript
import { LayoutManager, HorizontalSplitter, TextEditor } from 'ts_lib/src/index';
import 'ts_lib/styles/theme.css';
import 'ts_lib/styles/layout.css';
import 'ts_lib/styles/editor.css';
```

## Example

```bash
cd ts_lib
npm install
npm run dev
```

Opens a demo app at `http://localhost:5173` showing all components in use: split layout, tabbed panels, JSON editor with syntax highlighting, modal dialogs, and a tutorial walkthrough.

## CSS

Import the stylesheets you need:
- `styles/theme.css` — CSS custom properties (light/dark), reset, scrollbars
- `styles/layout.css` — Splitter, switcher, panels, buttons, modals
- `styles/editor.css` — Text editor, syntax colors, error panel
- `styles/tutorial.css` — Tutorial overlay and tooltip

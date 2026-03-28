import '../styles/theme.css';
import '../styles/layout.css';
import '../styles/editor.css';
import '../styles/tutorial.css';

import {
  LayoutManager,
  HorizontalSplitter,
  VerticalSplitter,
  VerticalSwitcher,
  TextEditor,
  startTutorial,
  shouldShowTutorial,
  createModal,
  initTheme,
  cycleThemeMode,
  getThemeMode,
  themeModeLabel,
  onThemeChange,
} from '../src/index';
import type { Panel, TutorialStep } from '../src/index';

// -- A simple output panel that shows parsed JSON --

class OutputPanel implements Panel {
  readonly id = 'output';
  readonly title = 'Output';
  private container!: HTMLElement;

  createView(container: HTMLElement): void {
    this.container = container;
    this.container.style.padding = '12px';
    this.container.style.overflowY = 'auto';
    this.container.style.fontFamily = "'SF Mono', 'Fira Code', monospace";
    this.container.style.fontSize = '12px';
    this.container.style.whiteSpace = 'pre-wrap';
    this.container.style.color = 'var(--text-secondary)';
    this.container.textContent = 'Edit the JSON on the right to see output here.';
  }

  setContent(html: string): void {
    if (this.container) this.container.innerHTML = html;
  }

  onStateChange(change: Record<string, unknown>): void {
    if (change['type'] === 'editor-changed' && typeof change['text'] === 'string') {
      const text = change['text'] as string;
      if (!text.trim()) {
        this.setContent('<span style="color:var(--text-secondary);font-style:italic">Empty</span>');
        return;
      }
      try {
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, 2);
        const keys = Object.keys(parsed);
        this.setContent(
          `<div style="margin-bottom:8px;color:var(--success);font-weight:600">Valid JSON &mdash; ${keys.length} key(s)</div>` +
          `<div style="color:var(--text-primary)">${escapeHtmlSimple(formatted)}</div>`
        );
      } catch (e) {
        this.setContent(`<span style="color:var(--error)">Parse error: ${escapeHtmlSimple(String(e))}</span>`);
      }
    }
  }
}

// -- A placeholder panel --

class PlaceholderPanel implements Panel {
  readonly id: string;
  readonly title: string;
  private message: string;

  constructor(id: string, title: string, message: string) {
    this.id = id;
    this.title = title;
    this.message = message;
  }

  createView(container: HTMLElement): void {
    container.style.padding = '20px';
    container.style.color = 'var(--text-secondary)';
    container.style.fontSize = '12px';
    container.innerHTML = this.message;
  }
}

function escapeHtmlSimple(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// -- App setup --

initTheme();

const app = document.getElementById('app')!;
app.style.height = '100%';

const layout = new LayoutManager(app);

// Header
const header = layout.getHeader();
header.innerHTML = `
  <div style="display:flex;align-items:center;gap:12px">
    <strong style="font-size:14px">ts_lib Example</strong>
    <span style="font-size:12px;color:var(--text-secondary)">Layout + Editor + Tutorial</span>
  </div>
  <div style="display:flex;gap:6px">
    <button class="btn btn-small" id="btn-theme">Theme: ${themeModeLabel(getThemeMode())}</button>
    <button class="btn btn-small" id="btn-about">About</button>
    <button class="btn btn-small" id="btn-tutorial">Tutorial</button>
  </div>
`;

// Footer with status notifications
const footer = layout.getFooter();
footer.style.justifyContent = 'space-between';
footer.innerHTML = `
  <span id="status-left" style="color:var(--text-secondary)">Ready</span>
  <span id="status-right" style="color:var(--text-secondary);transition:opacity 0.3s"></span>
`;

const statusLeft = document.getElementById('status-left')!;
const statusRight = document.getElementById('status-right')!;

let statusTimer: ReturnType<typeof setTimeout> | null = null;

function showStatus(text: string, color = 'var(--text-secondary)', durationMs = 3000): void {
  statusRight.textContent = text;
  statusRight.style.color = color;
  statusRight.style.opacity = '1';
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusRight.style.opacity = '0';
  }, durationMs);
}

// Create panels
const outputPanel = new OutputPanel();
const logPanel = new PlaceholderPanel('log', 'Log', 'Application log messages appear here.');
const helpPanel = new PlaceholderPanel('help', 'Help', 'Press <b>Tutorial</b> in the header for a guided tour.');

// JSON editor with syntax highlighting
const editor = new TextEditor('editor', 'Editor', {
  syntax: {
    keywords: new Set(['true', 'false', 'null']),
    builtins: new Set([]),
    commentChar: '//',
    operatorChars: ':{}[],',
  },
  placeholder: '// Type some JSON here\n{\n  "name": "example",\n  "version": 1\n}',
  indentTrigger: '{',
});

// Layout: horizontal split between left (output + tabs) and right (editor)
const mainSplit = HorizontalSplitter();

const leftSplit = VerticalSplitter();
leftSplit.add(outputPanel, 2);

const bottomTabs = VerticalSwitcher();
bottomTabs.add(logPanel, 'Log');
bottomTabs.add(helpPanel, 'Help');
leftSplit.add(bottomTabs, 1);

mainSplit.add(leftSplit, 1);
mainSplit.add(editor, 1);

layout.body = mainSplit;

// Wire up editor -> output panel + status updates
editor.onChange((text) => {
  layout.broadcastStateChange({ type: 'editor-changed', text });
  const lines = text.split('\n').length;
  const chars = text.length;
  statusLeft.textContent = `${lines} line${lines !== 1 ? 's' : ''}, ${chars} char${chars !== 1 ? 's' : ''}`;
});

// Add a button to the editor toolbar
const toolbar = editor.getToolbar();
const formatBtn = document.createElement('button');
formatBtn.className = 'btn btn-small btn-primary';
formatBtn.textContent = 'Format';
formatBtn.addEventListener('click', () => {
  try {
    const parsed = JSON.parse(editor.getText());
    editor.setText(JSON.stringify(parsed, null, 2));
    editor.setErrors([]);
    showStatus('JSON formatted', 'var(--success)');
  } catch (e) {
    const msg = String(e);
    const lineMatch = msg.match(/position (\d+)/);
    const pos = lineMatch ? parseInt(lineMatch[1], 10) : 0;
    const text = editor.getText();
    const line = text.substring(0, pos).split('\n').length;
    editor.setErrors([{ message: msg, line, column: 1 }]);
    showStatus('Format failed — invalid JSON', 'var(--error)');
  }
});
toolbar.appendChild(formatBtn);

// Theme toggle: light -> dark -> auto
const themeBtn = document.getElementById('btn-theme')!;
themeBtn.addEventListener('click', () => {
  cycleThemeMode();
});
onThemeChange((mode) => {
  themeBtn.textContent = `Theme: ${themeModeLabel(mode)}`;
  showStatus(`Theme: ${themeModeLabel(mode)}`, 'var(--accent)');
});

// About modal
document.getElementById('btn-about')!.addEventListener('click', () => {
  const result = createModal({ toggle: '.modal-overlay' });
  if (!result) return;
  const { modal, close } = result;
  modal.innerHTML = `
    <div style="padding:16px">
      <h2 style="font-size:16px;margin-bottom:8px">About ts_lib Example</h2>
      <p style="color:var(--text-secondary);font-size:12px;line-height:1.6;margin-bottom:12px">
        This is a minimal example showing the reusable components from <code>ts_lib</code>:
      </p>
      <ul style="color:var(--text-secondary);font-size:12px;line-height:1.8;padding-left:20px">
        <li><strong>LayoutManager</strong> &mdash; header / main / footer shell</li>
        <li><strong>HorizontalSplitter / VerticalSplitter</strong> &mdash; resizable panes</li>
        <li><strong>VerticalSwitcher</strong> &mdash; tabbed panels</li>
        <li><strong>TextEditor</strong> &mdash; syntax-highlighted editor with undo/redo</li>
        <li><strong>Tutorial</strong> &mdash; step-by-step guided tour</li>
        <li><strong>createModal</strong> &mdash; modal overlay utility</li>
      </ul>
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn-small btn-primary" id="modal-close">Close</button>
      </div>
    </div>
  `;
  modal.querySelector('#modal-close')!.addEventListener('click', close);
});

// Tutorial
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: () => document.querySelector('.app-header') as HTMLElement,
    title: 'Welcome',
    body: 'This example app shows the reusable UI components from <code>ts_lib</code>.',
    placement: 'bottom',
  },
  {
    target: () => document.querySelector('[data-panel-id="editor"]') as HTMLElement,
    title: 'Text Editor',
    body: 'A generic code editor with syntax highlighting, line numbers, undo/redo, and auto-indent.<br><br>The highlighting rules are fully configurable &mdash; this one highlights JSON keywords.',
    placement: 'left',
  },
  {
    target: () => document.querySelector('[data-panel-id="output"]') as HTMLElement,
    title: 'Output Panel',
    body: 'Panels receive state changes via <code>onStateChange()</code>. This panel shows parsed JSON from the editor.',
    placement: 'right',
  },
  {
    target: () => document.querySelector('.splitter-handle') as HTMLElement,
    title: 'Resizable Splitters',
    body: 'Drag splitter handles to resize panels. Horizontal and vertical splitters can be nested.',
    placement: 'right',
  },
  {
    target: () => document.querySelector('.switcher-tabs') as HTMLElement,
    title: 'Tabbed Switcher',
    body: 'The <code>Switcher</code> component provides tabbed panel containers. Click tabs to switch.',
    placement: 'top',
  },
  {
    target: '#btn-about',
    title: 'Modal Utility',
    body: 'The <code>createModal()</code> utility creates overlay modals with backdrop-dismiss. Click "About" to see it.',
    placement: 'bottom',
  },
  {
    target: () => document.querySelector('.app-header') as HTMLElement,
    title: 'Ready!',
    body: 'That\'s the tour. All these components come from <code>ts_lib</code> and can be used in any project.',
    placement: 'bottom',
  },
];

const tutorialConfig = {
  steps: TUTORIAL_STEPS,
  storageKey: 'example-tutorial-seen',
  onStart: () => showStatus('Tutorial started', 'var(--accent)'),
  onEnd: () => showStatus('Tutorial complete', 'var(--success)'),
};

document.getElementById('btn-tutorial')!.addEventListener('click', () => {
  startTutorial(tutorialConfig);
});

if (shouldShowTutorial('example-tutorial-seen')) {
  startTutorial(tutorialConfig);
}

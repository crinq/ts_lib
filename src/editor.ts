import type { Panel } from './panel';
import { escapeHtml } from './utils';

/**
 * Configuration for the syntax highlighter.
 *
 * Defines the lexical categories for a language: keywords, built-in
 * identifiers, comment syntax, and operator characters. The highlighter
 * tokenizes each line and wraps matches in `<span>` elements with
 * CSS classes (`ce-keyword`, `ce-builtin`, `ce-string`, `ce-number`,
 * `ce-operator`, `ce-comment`).
 *
 * ```typescript
 * const jsonSyntax: SyntaxConfig = {
 *   keywords: new Set(['true', 'false', 'null']),
 *   builtins: new Set([]),
 *   commentChar: '//',
 *   operatorChars: ':{}[],',
 * };
 * ```
 */
export interface SyntaxConfig {
  /** Set of language keywords (wrapped in `.ce-keyword`). */
  keywords: Set<string>;
  /** Set of built-in identifiers (wrapped in `.ce-builtin`). */
  builtins: Set<string>;
  /**
   * Comment prefix string. Everything from this string to end-of-line
   * is wrapped in `.ce-comment`. Default: `'#'`.
   */
  commentChar?: string;
  /**
   * Characters treated as operators (each wrapped in `.ce-operator`).
   * Default: `'=!&|^*@'`.
   */
  operatorChars?: string;
  /**
   * Optional callback returning additional builtins to merge at
   * highlight time. Useful when the set of built-in names depends
   * on runtime state (e.g., user-defined variables).
   */
  dynamicBuiltins?: () => Set<string>;
}

/**
 * Describes a single error to display in the editor's error panel.
 */
export interface EditorError {
  /** Human-readable error message. */
  message: string;
  /** 1-based line number where the error occurs. */
  line: number;
  /** 1-based column number where the error occurs. */
  column: number;
  /** Optional fix suggestion shown alongside the error. */
  suggestion?: string;
}

/**
 * Result returned by an external parser for the editor content.
 */
export interface EditorParseResult {
  /** List of parse errors found in the editor text. */
  errors: EditorError[];
}

/**
 * Configuration for a {@link TextEditor} instance.
 *
 * ```typescript
 * const editor = new TextEditor('my-editor', 'Code', {
 *   syntax: jsonSyntax,
 *   placeholder: '// Type code here',
 *   debounceMs: 200,
 *   tabWidth: 4,
 *   indentTrigger: '{',
 * });
 * ```
 */
export interface EditorConfig {
  /** Syntax highlighting rules for this editor. */
  syntax: SyntaxConfig;
  /** Placeholder text shown when the textarea is empty. */
  placeholder?: string;
  /** Debounce delay (ms) before firing change callbacks. Default: `300`. */
  debounceMs?: number;
  /** Number of spaces inserted for Tab key. Default: `2`. */
  tabWidth?: number;
  /**
   * Auto-indent trigger string. When a line ends with this string
   * and the user presses Enter, an extra indent level is added.
   * Default: `':'`.
   */
  indentTrigger?: string;
}

/**
 * Highlight a single line of source code (without comment handling).
 * Tokenizes identifiers, strings, numbers, and operators, wrapping
 * each in the appropriate CSS class span.
 */
function highlightCodeLine(code: string, config: SyntaxConfig): string {
  const builtins = config.dynamicBuiltins
    ? new Set([...config.builtins, ...config.dynamicBuiltins()])
    : config.builtins;
  const operators = config.operatorChars ?? '=!&|^*@';

  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '"') {
      const start = i; i++;
      while (i < code.length && code[i] !== '"') i++;
      if (i < code.length) i++;
      result += `<span class="ce-string">${escapeHtml(code.substring(start, i))}</span>`;
      continue;
    }
    if (/[a-zA-Z_]/.test(code[i])) {
      const start = i;
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
      const word = code.substring(start, i);
      if (config.keywords.has(word)) {
        result += `<span class="ce-keyword">${escapeHtml(word)}</span>`;
      } else if (builtins.has(word)) {
        result += `<span class="ce-builtin">${escapeHtml(word)}</span>`;
      } else {
        result += escapeHtml(word);
      }
      continue;
    }
    if (/[0-9]/.test(code[i])) {
      const start = i;
      while (i < code.length && /[0-9]/.test(code[i])) i++;
      result += `<span class="ce-number">${escapeHtml(code.substring(start, i))}</span>`;
      continue;
    }
    if (operators.includes(code[i])) {
      result += `<span class="ce-operator">${escapeHtml(code[i])}</span>`;
      i++; continue;
    }
    result += escapeHtml(code[i]); i++;
  }
  return result;
}

/**
 * Highlight a multi-line block of source code.
 *
 * Splits on newlines, extracts comments (from `commentChar` to EOL),
 * highlights the code portion with {@link SyntaxConfig} rules, and
 * wraps comments in `.ce-comment`. Returns an HTML string suitable
 * for `innerHTML` of a `<pre>` element.
 *
 * @param code The raw source code string.
 * @param config Syntax highlighting rules.
 * @returns HTML string with syntax spans.
 */
export function highlightCode(code: string, config: SyntaxConfig): string {
  const commentChar = config.commentChar ?? '#';
  return code.split('\n').map(line => {
    const commentIdx = line.indexOf(commentChar);
    let src = line, comment = '';
    if (commentIdx >= 0) {
      src = line.substring(0, commentIdx);
      comment = line.substring(commentIdx);
    }
    let result = highlightCodeLine(src, config);
    if (comment) result += `<span class="ce-comment">${escapeHtml(comment)}</span>`;
    return result;
  }).join('\n');
}

/**
 * A full-featured text editor panel with syntax highlighting, line
 * numbers, undo/redo, auto-indent, and an error display panel.
 *
 * Implements the {@link Panel} interface so it can be placed directly
 * into a {@link Splitter} or {@link Switcher} layout.
 *
 * **Features:**
 * - Real-time syntax highlighting via an overlaid `<pre>` element
 * - Line numbers that scroll in sync with the textarea
 * - Undo/redo stack (Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z)
 * - Tab key inserts spaces (configurable width)
 * - Auto-indent on Enter (extra level after `indentTrigger`)
 * - Error panel showing up to 5 errors with line/column locations
 * - Toolbar and status bar areas for custom buttons and messages
 * - Debounced change callbacks for external consumers
 *
 * ```typescript
 * const editor = new TextEditor('code', 'Source', {
 *   syntax: { keywords: new Set(['if', 'else']), builtins: new Set([]), commentChar: '//' },
 *   placeholder: '// Enter code here',
 * });
 *
 * editor.onChange((text) => console.log('Changed:', text));
 * editor.setErrors([{ message: 'Unexpected token', line: 3, column: 5 }]);
 * ```
 *
 * **CSS classes used:** `.text-editor`, `.ce-toolbar`, `.ce-editor-wrapper`,
 * `.ce-line-numbers`, `.ce-line-num`, `.ce-code-area`, `.ce-textarea`,
 * `.ce-highlight`, `.ce-error-panel`, `.ce-error-item`, `.ce-error-loc`,
 * `.ce-error-msg`, `.ce-error-more`, `.ce-suggestion`, `.ce-error-line`,
 * `.ce-solver-status`.
 */
export class TextEditor implements Panel {
  /** Unique panel identifier for layout registry lookup. */
  readonly id: string;
  /** Display title shown in the panel header. */
  readonly title: string;

  private config: EditorConfig;
  private container!: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private highlightEl!: HTMLPreElement;
  private lineNumbers!: HTMLDivElement;
  private errorPanel!: HTMLDivElement;
  private statusBar!: HTMLDivElement;
  private errors: EditorError[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private changeCallbacks: Array<(text: string) => void> = [];

  // Undo/redo
  private undoStack: string[] = [''];
  private undoIndex = 0;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MAX_UNDO = 100;

  constructor(id: string, title: string, config: EditorConfig) {
    this.id = id;
    this.title = title;
    this.config = config;
  }

  createView(container: HTMLElement): void {
    this.container = container;
    this.container.classList.add('text-editor');

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'ce-toolbar';
    this.container.appendChild(toolbar);

    // Editor wrapper
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'ce-editor-wrapper';

    this.lineNumbers = document.createElement('div');
    this.lineNumbers.className = 'ce-line-numbers';
    this.lineNumbers.textContent = '1';
    editorWrapper.appendChild(this.lineNumbers);

    const codeArea = document.createElement('div');
    codeArea.className = 'ce-code-area';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'ce-textarea';
    this.textarea.spellcheck = false;
    this.textarea.autocapitalize = 'off';
    this.textarea.autocomplete = 'off';
    if (this.config.placeholder) this.textarea.placeholder = this.config.placeholder;
    codeArea.appendChild(this.textarea);

    this.highlightEl = document.createElement('pre');
    this.highlightEl.className = 'ce-highlight';
    codeArea.appendChild(this.highlightEl);

    editorWrapper.appendChild(codeArea);
    this.container.appendChild(editorWrapper);

    // Error panel
    this.errorPanel = document.createElement('div');
    this.errorPanel.className = 'ce-error-panel';
    this.errorPanel.style.display = 'none';
    this.container.appendChild(this.errorPanel);

    // Status bar
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'ce-solver-status';
    this.container.appendChild(this.statusBar);

    // Events
    this.textarea.addEventListener('input', () => this.onInput());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('keydown', (e) => this.onKeyDown(e));

    this.updateHighlight();
    this.updateLineNumbers();
  }

  /** Get the toolbar element for adding custom buttons. */
  getToolbar(): HTMLElement {
    return this.container.querySelector('.ce-toolbar')!;
  }

  /** Get the status bar element for displaying messages. */
  getStatusBar(): HTMLElement {
    return this.statusBar;
  }

  /** Register a callback for text changes (debounced). */
  onChange(callback: (text: string) => void): void {
    this.changeCallbacks.push(callback);
  }

  /** Get the current editor text content. */
  getText(): string {
    return this.textarea.value;
  }

  /** Set the editor text content and trigger highlighting + change callbacks. */
  setText(text: string): void {
    this.textarea.value = text;
    this.onInput();
  }

  /** Update errors displayed in the error panel. */
  setErrors(errors: EditorError[]): void {
    this.errors = errors;
    this.updateErrors();
    this.updateHighlight();
  }

  onStateChange(_change: Record<string, unknown>): void {
    // Override in subclass if needed
  }

  /** Undo the last text change. Triggered by Ctrl/Cmd+Z. */
  undo(): void {
    if (this.undoIndex > 0) {
      const current = this.textarea.value;
      if (current !== this.undoStack[this.undoIndex]) {
        this.undoStack.length = this.undoIndex + 1;
        this.undoStack.push(current);
        this.undoIndex = this.undoStack.length - 1;
      }
      this.undoIndex--;
      this.textarea.value = this.undoStack[this.undoIndex];
      this.onInput();
    }
  }

  /** Redo a previously undone text change. Triggered by Ctrl/Cmd+Shift+Z. */
  redo(): void {
    if (this.undoIndex < this.undoStack.length - 1) {
      this.undoIndex++;
      this.textarea.value = this.undoStack[this.undoIndex];
      this.onInput();
    }
  }

  private onInput(): void {
    this.updateHighlight();
    this.updateLineNumbers();
    this.pushUndoSnapshot();

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      for (const cb of this.changeCallbacks) {
        cb(this.textarea.value);
      }
    }, this.config.debounceMs ?? 300);
  }

  private pushUndoSnapshot(): void {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => {
      const text = this.textarea.value;
      if (text === this.undoStack[this.undoIndex]) return;
      this.undoStack.length = this.undoIndex + 1;
      this.undoStack.push(text);
      if (this.undoStack.length > TextEditor.MAX_UNDO) {
        this.undoStack.shift();
      }
      this.undoIndex = this.undoStack.length - 1;
    }, 400);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.redo();
      return;
    }

    const tabStr = ' '.repeat(this.config.tabWidth ?? 2);

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.textarea.value;
      this.textarea.value = value.substring(0, start) + tabStr + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + tabStr.length;
      this.onInput();
    }

    if (e.key === 'Enter') {
      const start = this.textarea.selectionStart;
      const value = this.textarea.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const line = value.substring(lineStart, start);
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const trimmed = line.trim();
      const trigger = this.config.indentTrigger ?? ':';
      const extra = trimmed.endsWith(trigger) ? tabStr : '';

      e.preventDefault();
      const insertion = '\n' + indent + extra;
      this.textarea.value = value.substring(0, start) + insertion + value.substring(start);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + insertion.length;
      this.onInput();
    }
  }

  private updateHighlight(): void {
    const text = this.textarea.value;
    if (!text) {
      this.highlightEl.innerHTML = '';
      return;
    }

    const errorLines = new Set<number>();
    for (const err of this.errors) {
      errorLines.add(err.line);
    }

    const lines = text.split('\n');
    const highlighted = lines.map((line, idx) => {
      const lineNum = idx + 1;
      let html = this.highlightLine(line);
      if (errorLines.has(lineNum)) {
        html = `<span class="ce-error-line">${html}</span>`;
      }
      return html;
    });

    this.highlightEl.innerHTML = highlighted.join('\n');
    this.syncScroll();
  }

  private highlightLine(line: string): string {
    const commentChar = this.config.syntax.commentChar ?? '#';
    const commentIdx = line.indexOf(commentChar);
    let code = line, comment = '';
    if (commentIdx >= 0) {
      code = line.substring(0, commentIdx);
      comment = line.substring(commentIdx);
    }
    let result = highlightCodeLine(code, this.config.syntax);
    if (comment) result += `<span class="ce-comment">${escapeHtml(comment)}</span>`;
    return result;
  }

  private updateLineNumbers(): void {
    const lines = this.textarea.value.split('\n');
    this.lineNumbers.innerHTML = lines
      .map((_, i) => `<div class="ce-line-num">${i + 1}</div>`)
      .join('');
  }

  private updateErrors(): void {
    if (this.errors.length === 0) {
      this.errorPanel.style.display = 'none';
      return;
    }

    this.errorPanel.style.display = 'block';
    this.errorPanel.innerHTML = this.errors
      .slice(0, 5)
      .map(err => {
        const suggestion = err.suggestion ? `<span class="ce-suggestion">${escapeHtml(err.suggestion)}</span>` : '';
        return `<div class="ce-error-item">
          <span class="ce-error-loc">Line ${err.line}:${err.column}</span>
          <span class="ce-error-msg">${escapeHtml(err.message)}</span>
          ${suggestion}
        </div>`;
      })
      .join('');

    if (this.errors.length > 5) {
      this.errorPanel.innerHTML += `<div class="ce-error-more">...and ${this.errors.length - 5} more errors</div>`;
    }
  }

  private syncScroll(): void {
    this.highlightEl.scrollTop = this.textarea.scrollTop;
    this.highlightEl.scrollLeft = this.textarea.scrollLeft;
    this.lineNumbers.scrollTop = this.textarea.scrollTop;
  }
}

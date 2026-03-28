/**
 * Escape HTML special characters (`&`, `<`, `>`, `"`) for safe
 * insertion into `innerHTML`. Does not escape single quotes.
 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Escape special regex characters in a string so it can be used
 * as a literal pattern in `new RegExp()`.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a modal overlay with backdrop-dismiss behavior.
 *
 * Appends a full-screen overlay to `document.body` containing a
 * centered modal dialog. Clicking the overlay backdrop (outside the
 * modal) calls `close()` which removes the entire overlay from the DOM.
 *
 * **Toggle behavior:** If `opts.toggle` is set to a CSS selector and
 * an element matching that selector already exists, it is removed and
 * `null` is returned (toggle-off). Otherwise a new overlay is created
 * (toggle-on). This makes it easy to wire up a button that opens/closes
 * the modal on each click.
 *
 * ```typescript
 * const result = createModal({ toggle: '.my-overlay' });
 * if (!result) return; // was already open, now closed
 * const { modal, close } = result;
 * modal.innerHTML = '<p>Hello</p>';
 * ```
 *
 * @param opts.overlayClass CSS class for the overlay element. Default: `'modal-overlay'`.
 * @param opts.modalClass CSS class for the modal dialog element. Default: `'modal-dialog'`.
 * @param opts.toggle CSS selector for toggle behavior (see above).
 * @param opts.zIndex Optional z-index for the overlay.
 * @param opts.modalStyle Optional inline styles applied to the modal element.
 * @returns `{ overlay, modal, close }` or `null` if toggled off.
 */
export function createModal(opts: {
  overlayClass?: string;
  modalClass?: string;
  toggle?: string;
  zIndex?: string;
  modalStyle?: Partial<CSSStyleDeclaration>;
}): { overlay: HTMLDivElement; modal: HTMLDivElement; close: () => void } | null {
  const overlayClass = opts.overlayClass ?? 'modal-overlay';
  const modalClass = opts.modalClass ?? 'modal-dialog';

  if (opts.toggle) {
    const existing = document.querySelector(opts.toggle);
    if (existing) { existing.remove(); return null; }
  }

  const overlay = document.createElement('div');
  overlay.className = overlayClass;
  if (opts.zIndex) overlay.style.zIndex = opts.zIndex;

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const modal = document.createElement('div');
  modal.className = modalClass;
  if (opts.modalStyle) {
    for (const [k, v] of Object.entries(opts.modalStyle)) {
      (modal.style as unknown as Record<string, unknown>)[k] = v;
    }
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { overlay, modal, close };
}

/**
 * Open a modal dialog with a title bar, close button, and body area.
 *
 * This is a higher-level wrapper around `createModal` that adds a header
 * with title text and a close button. The `buildBody` callback receives
 * the body element and a `close` function.
 *
 * @param title Text shown in the modal header.
 * @param buildBody Callback to populate the modal body.
 * @param opts Optional overrides for overlay/modal classes and styles.
 */
export function openModal(
  title: string,
  buildBody: (body: HTMLElement, close: () => void) => void,
  opts?: {
    overlayClass?: string;
    modalClass?: string;
    modalStyle?: Partial<CSSStyleDeclaration>;
  },
): void {
  const result = createModal({
    overlayClass: opts?.overlayClass,
    modalClass: opts?.modalClass ?? 'modal',
    modalStyle: opts?.modalStyle,
  });
  if (!result) return;
  const { modal, close } = result;

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  const titleEl = document.createElement('span');
  titleEl.style.fontWeight = '600';
  titleEl.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-small';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', close);
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';

  modal.appendChild(header);
  modal.appendChild(body);

  buildBody(body, close);
}

// ---- Form helpers ----

/** Create a labeled input row (label on left, input on right). */
export function formRow(label: string, input: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.justifyContent = 'space-between';
  row.style.alignItems = 'center';
  row.style.marginBottom = '4px';
  const lbl = document.createElement('label');
  lbl.style.fontSize = '12px';
  lbl.textContent = label;
  row.appendChild(lbl);
  row.appendChild(input);
  return row;
}

/** Create a text input element. */
export function textInput(value: string, onChange: (v: string) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'settings-input';
  input.style.width = '180px';
  input.value = value;
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

/** Create a number input element. */
export function numberInput(value: number, onChange: (v: number) => void, step?: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'settings-input';
  input.value = String(value);
  if (step) input.step = step;
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (!isNaN(v)) onChange(v);
  });
  return input;
}

/** Create a select dropdown. */
export function selectInput(options: { value: string; label: string }[], current: string, onChange: (v: string) => void): HTMLSelectElement {
  const sel = document.createElement('select');
  sel.className = 'settings-input';
  sel.style.width = '180px';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === current) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

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

  const close = () => overlay.remove();
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

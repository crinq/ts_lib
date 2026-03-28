/** Toast notification system */

export type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastEntry {
  el: HTMLElement;
  timeout: ReturnType<typeof setTimeout>;
}

let container: HTMLElement | null = null;
const toasts: ToastEntry[] = [];

function ensureContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000): void {
  const c = ensureContainer();

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;

  // Dismiss on click
  el.addEventListener('click', () => dismissToast(entry));

  c.appendChild(el);

  // Trigger enter animation
  requestAnimationFrame(() => el.classList.add('toast-visible'));

  const timeout = setTimeout(() => dismissToast(entry), duration);
  const entry: ToastEntry = { el, timeout };
  toasts.push(entry);

  // Limit visible toasts
  while (toasts.length > 5) {
    dismissToast(toasts[0]);
  }
}

function dismissToast(entry: ToastEntry): void {
  const idx = toasts.indexOf(entry);
  if (idx < 0) return;
  toasts.splice(idx, 1);
  clearTimeout(entry.timeout);
  entry.el.classList.remove('toast-visible');
  entry.el.classList.add('toast-exit');
  setTimeout(() => entry.el.remove(), 300);
}

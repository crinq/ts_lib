/** Reusable context menu component */

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

let activeMenu: HTMLElement | null = null;

function closeActive(): void {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onDocKey);
  document.removeEventListener('contextmenu', onDocContext);
}

function onDocClick() { closeActive(); }
function onDocKey(e: KeyboardEvent) { if (e.key === 'Escape') closeActive(); }
function onDocContext() { closeActive(); }

export function showContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
  closeActive();

  const menu = document.createElement('div');
  menu.className = 'context-menu';

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'context-menu-separator';
      menu.appendChild(sep);
      continue;
    }

    const row = document.createElement('div');
    row.className = 'context-menu-item';
    if (item.disabled) row.classList.add('context-menu-disabled');
    row.textContent = item.label;

    if (!item.disabled) {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        closeActive();
        item.action();
      });
    }
    menu.appendChild(row);
  }

  // Position: ensure menu stays in viewport
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${x - rect.width}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${y - rect.height}px`;
  }

  activeMenu = menu;

  // Defer listeners to avoid immediate close
  requestAnimationFrame(() => {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    document.addEventListener('contextmenu', onDocContext);
  });
}

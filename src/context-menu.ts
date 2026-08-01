/** Reusable context menu component */

export interface ContextMenuItem {
  label: string;
  /** Invoked on click. Omit for items that only open a submenu. */
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  /** Nested items — rendered as a submenu that opens on hover. */
  children?: ContextMenuItem[];
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

/** Build a `.context-menu` element (recursing into `children` as submenus). */
function buildMenu(items: ContextMenuItem[]): HTMLElement {
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

    const hasChildren = !item.disabled && !!item.children?.length;
    if (hasChildren) {
      row.classList.add('context-menu-has-submenu');
      const arrow = document.createElement('span');
      arrow.className = 'context-menu-arrow';
      arrow.textContent = '▸'; // ▸
      row.appendChild(arrow);
      const submenu = buildMenu(item.children!);
      submenu.classList.add('context-menu-submenu');
      row.appendChild(submenu);
    } else if (!item.disabled && item.action) {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        closeActive();
        item.action!();
      });
    }
    menu.appendChild(row);
  }
  return menu;
}

export function showContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
  closeActive();

  const menu = buildMenu(items);

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

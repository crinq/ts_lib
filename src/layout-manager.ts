import type { Panel } from './panel';
import type { Splitter } from './splitter';

/**
 * Top-level application layout shell.
 *
 * Creates a three-row structure inside the root container:
 * - **Header** (`<header class="app-header">`) — for toolbar, title, navigation
 * - **Main** (`<main class="app-main">`) — filled by assigning a Splitter to `body`
 * - **Footer** (`<footer class="app-footer">`) — for status messages, hints
 *
 * Maintains a registry of all panels within the layout tree for lookup
 * by id and state change broadcasting.
 *
 * ```typescript
 * const layout = new LayoutManager(document.getElementById('app')!);
 *
 * const split = HorizontalSplitter();
 * split.add(editorPanel, 1);
 * split.add(previewPanel, 1);
 * layout.body = split;
 *
 * layout.getHeader().textContent = 'My App';
 * layout.broadcastStateChange({ type: 'init' });
 * ```
 *
 * **CSS classes used:** `.app-layout`, `.app-header`, `.app-main`, `.app-footer`.
 */
export class LayoutManager {
  private panels = new Map<string, Panel>();
  private rootContainer: HTMLElement;
  private mainElement: HTMLElement;

  /**
   * @param rootContainer The DOM element to build the layout inside.
   *   Its contents are replaced. The element gets the `app-layout` CSS class.
   */
  constructor(rootContainer: HTMLElement) {
    this.rootContainer = rootContainer;
    this.rootContainer.innerHTML = '';
    this.rootContainer.classList.add('app-layout');

    const header = document.createElement('header');
    header.className = 'app-header';
    header.id = 'app-header';
    this.rootContainer.appendChild(header);

    this.mainElement = document.createElement('main');
    this.mainElement.className = 'app-main';
    this.rootContainer.appendChild(this.mainElement);

    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.id = 'app-footer';
    this.rootContainer.appendChild(footer);
  }

  /**
   * Set the main content area to the given splitter tree.
   * All panels within the tree are registered for lookup and broadcasting.
   * Replaces any previous content.
   */
  set body(splitter: Splitter) {
    this.mainElement.innerHTML = '';
    this.mainElement.appendChild(splitter.element);

    this.panels.clear();
    for (const panel of splitter.collectPanels()) {
      this.panels.set(panel.id, panel);
    }
  }

  /** Look up a panel by its id. Returns null if not found. */
  getPanel(id: string): Panel | null {
    return this.panels.get(id) ?? null;
  }

  /** Get the header element for adding toolbar buttons, title, etc. */
  getHeader(): HTMLElement {
    return this.rootContainer.querySelector('#app-header')!;
  }

  /** Get the footer element for adding status text, hints, etc. */
  getFooter(): HTMLElement {
    return this.rootContainer.querySelector('#app-footer')!;
  }

  /**
   * Send a state change to all registered panels.
   * Each panel's `onStateChange()` method is called with the change object.
   * By convention, include a `type` string field to discriminate changes.
   */
  broadcastStateChange(change: Record<string, unknown>): void {
    for (const panel of this.panels.values()) {
      panel.onStateChange?.(change);
    }
  }
}

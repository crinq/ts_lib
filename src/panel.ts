/**
 * Any layout container (splitter, switcher) that can be nested inside
 * other containers. Exposes its root DOM element and recursively
 * collects all Panel instances it contains.
 */
export interface LayoutNode {
  /** The root DOM element of this layout node. */
  readonly element: HTMLElement;
  /** Recursively collect all Panel instances within this node. */
  collectPanels(): Panel[];
}

/**
 * A child that can be added to a splitter or switcher.
 * Either a concrete Panel (which gets a header + content wrapper)
 * or a nested LayoutNode (which is embedded directly).
 */
export type SplitChild = Panel | LayoutNode;

/**
 * A content panel that renders into a provided container element.
 *
 * Panels are the leaf nodes of the layout tree. Each panel has a unique
 * `id` and a display `title` shown in the panel header. The layout
 * system calls `createView()` once to render the panel's DOM, and
 * `onStateChange()` whenever another part of the app broadcasts a
 * state update via `LayoutManager.broadcastStateChange()`.
 *
 * ```typescript
 * class MyPanel implements Panel {
 *   readonly id = 'my-panel';
 *   readonly title = 'My Panel';
 *
 *   createView(container: HTMLElement): void {
 *     container.textContent = 'Hello!';
 *   }
 *
 *   onStateChange(change: Record<string, unknown>): void {
 *     if (change['type'] === 'data-loaded') { ... }
 *   }
 * }
 * ```
 */
export interface Panel {
  /** Unique identifier used for panel lookup and DOM data attributes. */
  readonly id: string;
  /** Display title shown in the panel header bar. */
  readonly title: string;

  /**
   * Called once by the layout system. Render the panel's DOM into
   * the provided container element.
   */
  createView(container: HTMLElement): void;
  /** Called when the panel's tab/pane becomes visible (switcher only). */
  onActivate?(): void;
  /** Called when the panel's tab/pane is hidden (switcher only). */
  onDeactivate?(): void;
  /**
   * Receive a state change broadcast from `LayoutManager.broadcastStateChange()`.
   * The change object is untyped — consumers define their own state shape
   * using a discriminated `type` field by convention.
   */
  onStateChange?(change: Record<string, unknown>): void;
  /** Called when the panel is removed from the layout. Clean up event listeners, timers, etc. */
  destroy?(): void;
}

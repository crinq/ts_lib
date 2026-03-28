/**
 * A single step in a guided tutorial.
 *
 * Each step highlights a target element with a spotlight cutout in
 * a semi-transparent overlay, and positions a tooltip nearby with
 * a title, body text, and navigation buttons.
 *
 * ```typescript
 * const step: TutorialStep = {
 *   target: '#save-btn',
 *   title: 'Save your work',
 *   body: 'Click this button to save changes.',
 *   placement: 'bottom',
 * };
 * ```
 */
export interface TutorialStep {
  /**
   * The element to spotlight. Can be a CSS selector string or a
   * callback returning the element (useful for dynamically created DOM).
   * If the element is not found, the tooltip is centered on screen.
   */
  target: string | (() => HTMLElement | null);
  /** Tooltip title text. */
  title: string;
  /** Tooltip body content (supports HTML markup). */
  body: string;
  /**
   * Preferred tooltip placement relative to the target element.
   * The tooltip is clamped to the viewport if it would overflow.
   */
  placement: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Configuration for a tutorial session.
 *
 * ```typescript
 * startTutorial({
 *   steps: mySteps,
 *   storageKey: 'my-app-tutorial-seen',
 *   onEnd: () => console.log('Tour complete'),
 * });
 * ```
 */
export interface TutorialConfig {
  /** The ordered list of tutorial steps to present. */
  steps: TutorialStep[];
  /**
   * localStorage key used to persist whether the user has completed
   * this tutorial. Default: `'tutorial-seen'`.
   */
  storageKey?: string;
  /** Called when the tutorial overlay is created, before the first step renders. */
  onStart?: () => void;
  /** Called when the tutorial finishes (last step completed) or is skipped. */
  onEnd?: () => void;
}

let overlay: HTMLElement | null = null;
let currentStep = 0;
let activeConfig: TutorialConfig | null = null;

function getTargetElement(step: TutorialStep): HTMLElement | null {
  if (typeof step.target === 'function') return step.target();
  return document.querySelector(step.target) as HTMLElement | null;
}

function positionTooltip(
  tooltip: HTMLElement,
  target: HTMLElement,
  placement: TutorialStep['placement'],
): void {
  const tr = target.getBoundingClientRect();
  const gap = 12;

  tooltip.style.left = '0';
  tooltip.style.top = '0';
  const tt = tooltip.getBoundingClientRect();

  let left: number;
  let top: number;

  switch (placement) {
    case 'bottom':
      left = tr.left + tr.width / 2 - tt.width / 2;
      top = tr.bottom + gap;
      break;
    case 'top':
      left = tr.left + tr.width / 2 - tt.width / 2;
      top = tr.top - tt.height - gap;
      break;
    case 'right':
      left = tr.right + gap;
      top = tr.top + tr.height / 2 - tt.height / 2;
      break;
    case 'left':
      left = tr.left - tt.width - gap;
      top = tr.top + tr.height / 2 - tt.height / 2;
      break;
  }

  const pad = 8;
  left = Math.max(pad, Math.min(left, window.innerWidth - tt.width - pad));
  top = Math.max(pad, Math.min(top, window.innerHeight - tt.height - pad));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function renderStep(): void {
  if (!overlay || !activeConfig) return;
  const steps = activeConfig.steps;

  const step = steps[currentStep];
  const target = getTargetElement(step);

  if (target) {
    const r = target.getBoundingClientRect();
    const pad = 4;
    const x1 = r.left - pad, y1 = r.top - pad;
    const x2 = r.right + pad, y2 = r.bottom + pad;
    overlay.style.clipPath = `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px
    )`;
  } else {
    overlay.style.clipPath = '';
  }

  const old = document.querySelector('.tutorial-tooltip');
  if (old) old.remove();

  const tooltip = document.createElement('div');
  tooltip.className = 'tutorial-tooltip';
  tooltip.innerHTML = `
    <div class="tutorial-tooltip-title">${step.title}</div>
    <div class="tutorial-tooltip-body">${step.body}</div>
    <div class="tutorial-tooltip-nav">
      <span class="tutorial-tooltip-progress">${currentStep + 1} / ${steps.length}</span>
      <div class="tutorial-tooltip-buttons">
        ${currentStep > 0 ? '<button class="btn btn-small tutorial-btn-back">Back</button>' : ''}
        <button class="btn btn-small tutorial-btn-skip">Skip</button>
        ${currentStep < steps.length - 1
          ? '<button class="btn btn-small btn-primary tutorial-btn-next">Next</button>'
          : '<button class="btn btn-small btn-primary tutorial-btn-next">Done</button>'}
      </div>
    </div>
  `;

  document.body.appendChild(tooltip);

  if (target) {
    positionTooltip(tooltip, target, step.placement);
  } else {
    const tt = tooltip.getBoundingClientRect();
    tooltip.style.left = `${(window.innerWidth - tt.width) / 2}px`;
    tooltip.style.top = `${(window.innerHeight - tt.height) / 2}px`;
  }

  tooltip.querySelector('.tutorial-btn-next')?.addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep();
    } else {
      closeTutorial();
    }
  });
  tooltip.querySelector('.tutorial-btn-back')?.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
  });
  tooltip.querySelector('.tutorial-btn-skip')?.addEventListener('click', closeTutorial);
}

function closeTutorial(): void {
  overlay?.remove();
  overlay = null;
  document.querySelector('.tutorial-tooltip')?.remove();
  const key = activeConfig?.storageKey ?? 'tutorial-seen';
  localStorage.setItem(key, '1');
  activeConfig?.onEnd?.();
  activeConfig = null;
}

/**
 * Start or restart a guided tutorial.
 *
 * Creates a semi-transparent overlay with a spotlight cutout around each
 * step's target element and a positioned tooltip with navigation buttons.
 * Any previously active tutorial is closed first.
 *
 * **User interaction:**
 * - Click overlay or press `→` / `Enter` to advance
 * - Press `←` to go back
 * - Press `Escape` or click "Skip" to close
 * - The overlay and tooltip reposition on window resize
 *
 * On completion or skip, the `storageKey` is written to localStorage
 * so `shouldShowTutorial()` returns false on subsequent visits.
 *
 * **CSS classes used:** `.tutorial-overlay`, `.tutorial-tooltip`,
 * `.tutorial-tooltip-title`, `.tutorial-tooltip-body`,
 * `.tutorial-tooltip-nav`, `.tutorial-tooltip-progress`,
 * `.tutorial-tooltip-buttons`, `.tutorial-btn-back`,
 * `.tutorial-btn-skip`, `.tutorial-btn-next`.
 */
export function startTutorial(config: TutorialConfig): void {
  closeTutorial();
  activeConfig = config;

  if (config.onStart) config.onStart();

  currentStep = 0;

  overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (currentStep < config.steps.length - 1) {
        currentStep++;
        renderStep();
      } else {
        closeTutorial();
      }
    }
  });

  document.body.appendChild(overlay);

  const onResize = () => { if (overlay) renderStep(); };
  window.addEventListener('resize', onResize);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(overlay!)) {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });

  const onKey = (e: KeyboardEvent) => {
    if (!activeConfig) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') {
      closeTutorial();
      document.removeEventListener('keydown', onKey);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (currentStep < activeConfig.steps.length - 1) { currentStep++; renderStep(); }
      else closeTutorial();
    } else if (e.key === 'ArrowLeft') {
      if (currentStep > 0) { currentStep--; renderStep(); }
    }
  };
  document.addEventListener('keydown', onKey);

  renderStep();
}

/**
 * Check whether the tutorial should be shown automatically.
 *
 * Returns `true` if the given `storageKey` has never been set in
 * localStorage (i.e., the user has not completed or skipped the tutorial).
 *
 * @param storageKey The localStorage key to check. Default: `'tutorial-seen'`.
 */
export function shouldShowTutorial(storageKey = 'tutorial-seen'): boolean {
  return localStorage.getItem(storageKey) === null;
}

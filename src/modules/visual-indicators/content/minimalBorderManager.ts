/**
 * Draws a thin colour bar pinned to the bottom of the page.
 *
 * This runs inside the content script, i.e. on every page the user visits, so
 * nothing here is allowed to be permanently expensive: the element is created
 * on first show() and the re-attach observer only runs while the bar is
 * actually visible.
 */

const BORDER_ID = 'env-switcher-minimal-border';

/** Delays (ms) at which styles are re-applied after showing, for pages that restyle late. */
const RESTYLE_DELAYS_MS = [100, 500];

export class MinimalBorderManager {
    private borderElement: HTMLDivElement | null = null;
    private observer: MutationObserver | null = null;
    private restyleTimers: ReturnType<typeof setTimeout>[] = [];
    private isActive: boolean = false;
    private currentColor: string = '';
    private height: number = 4; // Default height

    public show(color: string, height?: number) {
        this.currentColor = color;
        this.isActive = true;
        if (height !== undefined) {
            this.height = height;
        }

        this.ensureElement();
        this.applyStyles();
        this.startObserving();
        this.scheduleRestyles();
    }

    public hide() {
        this.isActive = false;
        this.clearRestyleTimers();
        this.stopObserving();
        if (this.borderElement) {
            this.applyStyles();
        }
    }

    public refresh() {
        if (this.isActive && this.currentColor) {
            this.show(this.currentColor, this.height);
        }
    }

    /** Remove the bar and release every listener/timer it owns. */
    public destroy() {
        this.isActive = false;
        this.clearRestyleTimers();
        this.stopObserving();
        this.borderElement?.remove();
        this.borderElement = null;
    }

    // ── element ───────────────────────────────────────────────────────────────

    private ensureElement() {
        if (!this.borderElement) {
            this.borderElement = document.createElement('div');
            this.borderElement.id = BORDER_ID;
        }
        this.attach();
    }

    private attach() {
        const el = this.borderElement;
        if (!el) return;

        if (document.body) {
            if (el.parentNode !== document.body) {
                document.body.appendChild(el);
            }
            return;
        }

        // The content script runs at document_end so body normally exists; this
        // is only a safety net, and it waits on an event rather than polling.
        document.addEventListener('DOMContentLoaded', () => this.attach(), { once: true });
    }

    private applyStyles() {
        const el = this.borderElement;
        if (!el) return;

        // setProperty() is required for the `important` flag. Assigning
        // "value !important" through a style property setter fails to parse and
        // is silently discarded by the CSSOM, which previously made hide() a
        // no-op.
        const s = el.style;
        s.setProperty('position', 'fixed', 'important');
        s.setProperty('bottom', '0', 'important');
        s.setProperty('left', '0', 'important');
        s.setProperty('right', '0', 'important');
        s.setProperty('height', `${this.height}px`, 'important');
        s.setProperty('background-color', this.isActive ? this.currentColor : 'transparent', 'important');
        s.setProperty('z-index', '2147483647', 'important');
        s.setProperty('pointer-events', 'none', 'important');
        s.setProperty('display', this.isActive ? 'block' : 'none', 'important');
        s.setProperty('box-shadow', 'none', 'important');
        s.setProperty('border', 'none', 'important');
        s.setProperty('margin', '0', 'important');
        s.setProperty('padding', '0', 'important');
    }

    private scheduleRestyles() {
        this.clearRestyleTimers();
        for (const delay of RESTYLE_DELAYS_MS) {
            this.restyleTimers.push(setTimeout(() => {
                if (this.isActive) {
                    this.attach();
                    this.applyStyles();
                }
            }, delay));
        }
    }

    private clearRestyleTimers() {
        this.restyleTimers.forEach(clearTimeout);
        this.restyleTimers = [];
    }

    // ── re-attach observer ────────────────────────────────────────────────────

    /**
     * Re-attach the bar if the page tears it out. Only direct children of <html>
     * and <body> are watched (no subtree), so the browser does not have to
     * record a mutation for every DOM change on the page — which is what made
     * the previous document-wide observer so costly.
     */
    private startObserving() {
        if (this.observer || !document.body) return;

        this.observer = new MutationObserver(() => {
            if (this.isActive && this.borderElement && this.borderElement.parentNode !== document.body) {
                this.attach();
                this.applyStyles();
            }
        });

        this.observer.observe(document.body, { childList: true });
        if (document.documentElement) {
            // Catches the page replacing <body> wholesale.
            this.observer.observe(document.documentElement, { childList: true });
        }
    }

    private stopObserving() {
        this.observer?.disconnect();
        this.observer = null;
    }
}

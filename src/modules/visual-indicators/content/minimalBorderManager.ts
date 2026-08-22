// Minimal Border Manager Class
export class MinimalBorderManager {
    private borderElement: HTMLDivElement | null = null;
    private isActive: boolean = false;
    private currentColor: string = '';
    private height: number = 4; // Default height

    constructor() {
        this.createBorderElement();
    }

    private createBorderElement() {
        // Create a persistent border element
        this.borderElement = document.createElement('div');
        this.borderElement.id = 'env-switcher-minimal-border';
        this.borderElement.style.cssText = `
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: ${this.height}px !important;
      background-color: transparent !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      display: none !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
    `;

        // Add to document immediately when DOM is ready
        if (document.body) {
            document.body.appendChild(this.borderElement);
        } else {
            // Wait for DOM to be ready
            const addWhenReady = () => {
                if (document.body) {
                    document.body.appendChild(this.borderElement!);
                } else {
                    setTimeout(addWhenReady, 10);
                }
            };
            addWhenReady();
        }

        // Ensure the border stays in place even when DOM changes
        this.setupMutationObserver();
    }

    private setupMutationObserver() {
        const observer = new MutationObserver(() => {
            // Re-attach the border element if it gets removed
            if (this.borderElement && !document.contains(this.borderElement)) {
                if (document.body) {
                    document.body.appendChild(this.borderElement);
                }
            }
        });

        // Start observing when DOM is ready
        const startObserving = () => {
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } else {
                setTimeout(startObserving, 10);
            }
        };
        startObserving();
    }

    public show(color: string, height?: number) {
        if (!this.borderElement) return;

        this.currentColor = color;
        this.isActive = true;
        if (height !== undefined) {
            this.height = height;
        }

        this.borderElement.style.backgroundColor = `${color} !important`;
        this.borderElement.style.height = `${this.height}px !important`;
        this.borderElement.style.display = 'block !important';

        // Ensure it stays visible by re-applying styles
        this.ensureVisibility();
    }

    public hide() {
        if (!this.borderElement) return;

        this.isActive = false;
        this.borderElement.style.display = 'none !important';
        this.borderElement.style.backgroundColor = 'transparent !important';
    }

    private ensureVisibility() {
        if (!this.isActive || !this.borderElement) return;

        // Periodically ensure the border stays visible and properly styled
        const ensureStyles = () => {
            if (this.borderElement && this.isActive) {
                this.borderElement.style.cssText = `
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: ${this.height}px !important;
          background-color: ${this.currentColor} !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
          display: block !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
        `;
            }
        };

        // Apply styles immediately and periodically
        ensureStyles();
        setTimeout(ensureStyles, 100);
        setTimeout(ensureStyles, 500);
    }

    public refresh() {
        if (this.isActive && this.currentColor) {
            this.show(this.currentColor, this.height);
        }
    }
}
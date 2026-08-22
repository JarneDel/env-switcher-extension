// Favicon Updater Class
import type { FaviconInfo } from "../types";
import type { Environment } from "@/modules/environments/types";
import { URLUtils } from "@/modules/environments/utils/urlUtils";
import { MinimalBorderManager } from "./minimalBorderManager";
import { ExtensionStorage } from "@/modules/sync/services/storage";

/** Give up on a favicon that has not loaded within this window. */
const FAVICON_LOAD_TIMEOUT_MS = 5_000;

export class FaviconUpdater {
    private originalFavicons: FaviconInfo[] = [];
    private currentEnvironment: Environment | null = null;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private originalBodyBorder: string = '';
    private bodyBorderApplied: boolean = false;
    /**
     * Created on first use only. The minimal border is off by default, and this
     * class is instantiated on every page, so building it eagerly injected an
     * element and a MutationObserver into every page for a disabled feature.
     */
    private minimalBorderManager: MinimalBorderManager | null = null;
    /** Rendered favicons keyed by `${sourceUrl}|${color}`, to avoid re-encoding PNGs. */
    private readonly borderedFaviconCache = new Map<string, string>();

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        this.init();
    }

    private getMinimalBorderManager(): MinimalBorderManager {
        if (!this.minimalBorderManager) {
            this.minimalBorderManager = new MinimalBorderManager();
        }
        return this.minimalBorderManager;
    }

    private async init() {
        // Store original states
        this.storeOriginalFavicons();
        this.storeOriginalBodyBorder();

        // Apply environment styling
        await this.updateForCurrentEnvironment();
    }

    private storeOriginalFavicons() {
        const faviconSelectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
            'link[rel="apple-touch-icon"]'
        ];

        faviconSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector) as NodeListOf<HTMLLinkElement>;
            elements.forEach(element => {
                const type = element.rel as FaviconInfo['type'];
                this.originalFavicons.push({
                    element,
                    originalHref: element.href,
                    originalOriginalHref: element.href, // Store the very original
                    type,
                    isModified: false
                });
            });
        });
    }


    private storeOriginalBodyBorder() {
        this.originalBodyBorder = document.documentElement.style.border || '';
    }

    private async updateForCurrentEnvironment() {
        try {
            const config = await ExtensionStorage.getConfig();
            const currentUrl = window.location.href;

            const environment = URLUtils.detectCurrentEnvironment(currentUrl, config.environments);

            if (environment && environment.color) {
                this.currentEnvironment = environment;

                // Only update favicon if enabled in settings
                if (config.faviconEnabled === true) {
                    await this.updateFavicons(environment.color);
                }

                // Only update border if enabled in settings
                if (config.borderEnabled === true) {
                    const borderHeight = config.borderHeight || 3; // Default to 3px if not specified
                    this.updateBodyBorder(environment.color, borderHeight);
                }

                // Only update minimal border if enabled in settings
                if (config.minimalBorderEnabled === true) {
                    const height = config.minimalBorderHeight || 4; // Default to 4px if not specified
                    this.getMinimalBorderManager().show(environment.color, height);
                } else {
                    this.minimalBorderManager?.hide();
                }
            } else {
                this.restoreOriginalFavicons();
                this.restoreOriginalBodyBorder();
                this.minimalBorderManager?.hide();
            }
        } catch (error) {
            this.restoreOriginalFavicons();
            this.restoreOriginalBodyBorder();
            this.minimalBorderManager?.hide();
        }
    }

    private async updateFavicons(borderColor: string) {
        if (this.originalFavicons.length === 0) {
            return;
        }

        for (let i = 0; i < this.originalFavicons.length; i++) {
            const faviconInfo = this.originalFavicons[i];

            // Skip if already modified
            if (faviconInfo.isModified) {
                continue;
            }

            try {
                // Always use the original original URL
                const sourceUrl = faviconInfo.originalOriginalHref || faviconInfo.originalHref;
                const newHref = await this.addBorderToFavicon(sourceUrl, borderColor);
                faviconInfo.element.href = newHref;
                faviconInfo.isModified = true;

                const parent = faviconInfo.element.parentNode;
                if (parent) {
                    parent.removeChild(faviconInfo.element);
                    parent.appendChild(faviconInfo.element);
                }
            } catch (error) {
                // Do nothing - just skip this favicon if it fails to load
            }
        }
    }


    private updateBodyBorder(borderColor: string, borderHeight: number = 3) {
        try {
            document.documentElement.style.border = `${borderHeight}px solid ${borderColor}`;
            document.documentElement.style.boxSizing = 'border-box';
            this.bodyBorderApplied = true;
        } catch (error) {
            // Silent error handling
        }
    }

    private restoreOriginalBodyBorder() {
        try {
            if (this.bodyBorderApplied) {
                document.documentElement.style.border = this.originalBodyBorder;
                if (!this.originalBodyBorder) {
                    document.documentElement.style.removeProperty('border');
                    document.documentElement.style.removeProperty('box-sizing');
                }
                this.bodyBorderApplied = false;
            }
        } catch (error) {
            // Silent error handling
        }
    }

    private async addBorderToFavicon(faviconUrl: string, borderColor: string): Promise<string> {
        const cacheKey = `${faviconUrl}|${borderColor}`;
        const cached = this.borderedFaviconCache.get(cacheKey);
        if (cached) return cached;

        const dataUrl = await this.renderBorderedFavicon(faviconUrl, borderColor);
        this.borderedFaviconCache.set(cacheKey, dataUrl);
        return dataUrl;
    }

    private renderBorderedFavicon(faviconUrl: string, borderColor: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // A favicon URL that never fires load or error would otherwise leave
            // this promise pending and the Image reachable forever, and every
            // later refresh would allocate another one.
            let settled = false;
            const cleanup = () => {
                clearTimeout(timeout);
                // Dropping the handlers is enough to release the Image; assigning
                // an empty src would make some browsers request the page URL.
                img.onload = null;
                img.onerror = null;
            };
            const succeed = (value: string) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(value);
            };
            const fail = (error: Error) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(error);
            };
            const timeout = setTimeout(
                () => fail(new Error(`Timed out loading favicon: ${faviconUrl}`)),
                FAVICON_LOAD_TIMEOUT_MS
            );

            img.onload = () => {
                try {
                    const size = Math.max(img.width, img.height, 32);
                    this.canvas.width = size;
                    this.canvas.height = size;

                    this.ctx.clearRect(0, 0, size, size);

                    const borderWidth = Math.max(2, Math.floor(size * 0.1));
                    this.ctx.fillStyle = borderColor;
                    this.ctx.fillRect(0, 0, size, size);

                    const innerSize = size - (borderWidth * 2);
                    this.ctx.clearRect(borderWidth, borderWidth, innerSize, innerSize);

                    const scale = Math.min(innerSize / img.width, innerSize / img.height);
                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;
                    const x = borderWidth + (innerSize - scaledWidth) / 2;
                    const y = borderWidth + (innerSize - scaledHeight) / 2;

                    this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                    const dataUrl = this.canvas.toDataURL('image/png');
                    succeed(dataUrl);
                } catch (error) {
                    fail(error instanceof Error ? error : new Error(String(error)));
                }
            };

            img.onerror = (error) => {
                fail(new Error(`Failed to load favicon: ${error}`));
            };

            // Handle different URL formats
            let finalUrl = faviconUrl;

            if (faviconUrl.startsWith('data:')) {
                finalUrl = faviconUrl;
            } else if (faviconUrl.startsWith('//')) {
                finalUrl = window.location.protocol + faviconUrl;
            } else if (faviconUrl.startsWith('/')) {
                finalUrl = window.location.origin + faviconUrl;
            } else if (!faviconUrl.startsWith('http')) {
                finalUrl = new URL(faviconUrl, window.location.href).href;
            } else {
                finalUrl = faviconUrl;
            }

            img.src = finalUrl;
        });
    }

    private restoreOriginalFavicons() {
        this.originalFavicons.forEach((faviconInfo) => {
            faviconInfo.element.href = faviconInfo.originalHref;
            faviconInfo.isModified = false; // Reset the flag
        });
    }

    public async refresh() {
        await this.updateForCurrentEnvironment();
        this.minimalBorderManager?.refresh();
    }
}
interface Environment {
    id: string;
    name: string;
    baseUrl?: string;
    pattern?: string;
    color?: string;
}

export class PopupController {
    private static hostElement: HTMLElement | null = null;
    private static keyHandler: ((e: KeyboardEvent) => void) | null = null;

    public static async show(): Promise<void> {
        if (this.hostElement || document.getElementById('env-switcher-shortcut-root')) {
            return;
        }

        const host = document.createElement('div');
        host.id = 'env-switcher-shortcut-root';
        this.hostElement = host;
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                all: initial;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(2px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.1s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .modal {
                background: #0f172a;
                color: #f1f5f9;
                border: 1px solid #334155;
                border-radius: 12px;
                width: 340px;
                max-width: 90vw;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
                overflow: hidden;
                box-sizing: border-box;
            }
            .header {
                padding: 14px 16px;
                font-size: 14px;
                font-weight: 600;
                border-bottom: 1px solid #1e293b;
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: #e2e8f0;
            }
            .list {
                padding: 6px;
                max-height: 320px;
                overflow-y: auto;
            }
            .item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                border-radius: 6px;
                font-size: 13px;
                color: #cbd5e1;
                cursor: pointer;
                transition: background-color 0.1s, color 0.1s;
                user-select: none;
            }
            .item:hover {
                background: #1e293b;
                color: #ffffff;
            }
            .key-badge {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
                font-size: 11px;
                font-weight: 600;
                background: #1e293b;
                border: 1px solid #334155;
                color: #94a3b8;
                padding: 2px 6px;
                border-radius: 4px;
                min-width: 12px;
                text-align: center;
            }
            .color-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .env-name {
                flex: 1;
                text-transform: capitalize;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .footer {
                padding: 10px 16px;
                font-size: 11px;
                color: #64748b;
                border-top: 1px solid #1e293b;
                background: #090d16;
                text-align: center;
            }
            .footer strong {
                color: #94a3b8;
            }
            .status-msg {
                padding: 16px;
                font-size: 13px;
                text-align: center;
                color: #94a3b8;
            }
        `;
        shadow.appendChild(style);

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        shadow.appendChild(overlay);

        const modal = document.createElement('div');
        modal.className = 'modal';
        overlay.appendChild(modal);

        modal.innerHTML = `
            <div class="header">
                <span>Switch Environment</span>
            </div>
            <div class="list" id="modal-list">
                <div class="status-msg">Loading...</div>
            </div>
            <div class="footer">
                Press <strong>1-0</strong> to select, <strong>Esc</strong> to close
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        });

        let environments: Environment[] = [];

        const navigateToEnv = (env: Environment) => {
            const target = env.baseUrl || env.pattern;
            if (!target) return;
            try {
                const currentUrl = new URL(window.location.href);
                const newUrl = new URL(target);
                currentUrl.hostname = newUrl.hostname;
                currentUrl.port = newUrl.port;
                currentUrl.protocol = newUrl.protocol;
                window.location.href = currentUrl.toString();
            } catch (err) {
                console.error('Error switching environment:', err);
            }
            this.hide();
        };

        try {
            const response = await browser.runtime.sendMessage({ action: 'getEnvironmentsForPopup' }) as any;
            const listEl = modal.querySelector('#modal-list');
            if (response?.success && Array.isArray(response.environments)) {
                environments = response.environments.slice(0, 10);
                if (listEl) {
                    if (environments.length === 0) {
                        listEl.innerHTML = '<div class="status-msg">No environments configured.</div>';
                    } else {
                        listEl.innerHTML = '';
                        environments.forEach((env, index) => {
                            const keyLabel = index + 1 === 10 ? '0' : String(index + 1);
                            const item = document.createElement('div');
                            item.className = 'item';
                            item.innerHTML = `
                                <span class="key-badge">${keyLabel}</span>
                                ${env.color ? `<span class="color-dot" style="background-color: ${env.color}"></span>` : ''}
                                <span class="env-name">${env.name}</span>
                            `;
                            item.addEventListener('click', () => navigateToEnv(env));
                            listEl.appendChild(item);
                        });
                    }
                }
            } else if (listEl) {
                listEl.innerHTML = '<div class="status-msg">Failed to load environments.</div>';
            }
        } catch (err) {
            const listEl = modal.querySelector('#modal-list');
            if (listEl) listEl.innerHTML = '<div class="status-msg">Failed to load environments.</div>';
        }

        this.keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
                return;
            }

            const key = e.key === '0' ? 10 : parseInt(e.key, 10);
            if (!isNaN(key) && key >= 1 && key <= environments.length) {
                e.preventDefault();
                e.stopPropagation();
                navigateToEnv(environments[key - 1]);
            }
        };

        document.addEventListener('keydown', this.keyHandler, true);
    }

    public static hide(): void {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler, true);
            this.keyHandler = null;
        }
        if (this.hostElement) {
            this.hostElement.remove();
            this.hostElement = null;
        }
    }
}

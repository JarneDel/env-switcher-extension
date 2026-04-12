import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

// Assuming this type is defined in a shared types file
interface Environment {
    id: string;
    name: string;
    pattern: string; // The URL pattern/domain for the environment
    color: string;
}

interface ContentPopupProps {
    onClose: () => void;
}

export const ContentPopup: React.FC<ContentPopupProps> = ({ onClose }) => {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch environments from the background script on mount
    useEffect(() => {
        const fetchEnvironments = async () => {
            try {
                const response = await browser.runtime.sendMessage({ action: 'getEnvironmentsForPopup' }) as any;
                if (response?.success) {
                    // Take only the first 10 environments for keys 1-0
                    setEnvironments(response.environments.slice(0, 10));
                } else {
                    throw new Error(response.error || 'Failed to fetch environments.');
                }
            } catch (err) {
                console.error('Error fetching environments:', err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEnvironments();
    }, []);

    // 2. Handle keyboard events for selection and closing
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            // Map '1'-'9' to indices 0-8, and '0' to index 9
            const key = event.key === '0' ? 10 : parseInt(event.key, 10);
            if (!isNaN(key) && key >= 1 && key <= environments.length) {
                const selectedEnv = environments[key - 1];

                // --- URL Switching Logic ---
                try {
                    const currentUrl = new URL(window.location.href);
                    const newUrl = new URL(selectedEnv.pattern);

                    // Preserve the path, search params, and hash from the original URL
                    currentUrl.hostname = newUrl.hostname;
                    currentUrl.port = newUrl.port;
                    currentUrl.protocol = newUrl.protocol;

                    window.location.href = currentUrl.toString();
                } catch (e) {
                    console.error("Invalid URL pattern for environment:", selectedEnv.name, e);
                    // Optionally show an error to the user
                }

                onClose(); // Close after attempting navigation
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, environments]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="shortcut-item">Loading...</div>;
        }
        if (error) {
            return <div className="shortcut-item error">Error: {error}</div>;
        }
        if (environments.length === 0) {
            return <div className="shortcut-item">No environments configured.</div>;
        }
        return environments.map((env, index) => (
            <div key={env.id} className="shortcut-item">
                <span>{index + 1 === 10 ? 0 : index + 1}</span> {env.name}
            </div>
        ));
    };

    return (
        <div id="shortcut-overlay" onClick={onClose}>
            <div id="shortcut-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Switch Environment</h2>
                <div id="shortcut-list">{renderContent()}</div>
                <div className="shortcut-footer">
                    Press <strong>1-0</strong> to select, <strong>Esc</strong> to close
                </div>
            </div>
        </div>
    );
};
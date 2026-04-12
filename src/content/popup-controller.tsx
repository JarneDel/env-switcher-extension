import React from 'react';
import ReactDOM from 'react-dom/client';
import {ContentPopup} from './components/ContentPopup';

let reactRoot: ReactDOM.Root | null = null;

export class PopupController {
    // Called by ContentScript
    public static show() {
        if (document.getElementById('react-popup-root')) {
            return;
        }
        const rootDiv = document.createElement('div');
        rootDiv.id = 'react-popup-root';
        document.body.appendChild(rootDiv);

        reactRoot = ReactDOM.createRoot(rootDiv);
        reactRoot.render(
            <React.StrictMode>
                {/* It renders the React component and passes its own hide method */}
                <ContentPopup onClose={this.hide}/>
            </React.StrictMode>
        );
    }

    // Called by the React component itself (via the onClose prop)
    public static hide() {
        if (reactRoot) {
            reactRoot.unmount();
            reactRoot = null;
            document.getElementById('react-popup-root')?.remove();
        }
    }
}
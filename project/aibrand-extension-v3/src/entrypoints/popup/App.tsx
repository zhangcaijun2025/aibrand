/**
 * AiBrand Extension v3 — Popup
 *
 * Quick-access popup for the extension toolbar icon.
 * Shows connection status and provides shortcuts to AiBrand Studio.
 */

import { useEffect, useState } from 'react';

export default function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'AIBRAND_GET_STATE' }, (response) => {
      if (response?.success) {
        setWsConnected(response.data.wsConnected);
      }
    });
  }, []);

  const openDashboard = () => {
    chrome.tabs.create({ url: 'http://localhost:6060/dashboard' });
  };

  const openSidePanel = () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  };

  return (
    <div className="w-[360px] p-4 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">AiBrand</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-600/20 text-brand-400">
            v3
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-white/40">
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="space-y-2">
        <button
          onClick={openDashboard}
          className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-sm font-medium transition-colors"
        >
          🚀 Open AiBrand Studio
        </button>
        <button
          onClick={openSidePanel}
          className="w-full py-2.5 px-4 rounded-lg bg-surface-elevated hover:bg-surface-overlay border border-surface-border text-sm font-medium transition-colors"
        >
          📋 Open Side Panel {taskCount > 0 && `(${taskCount})`}
        </button>
      </div>

      {/* Footer */}
      <footer className="pt-3 border-t border-surface-border text-center">
        <a
          href="https://aibrand.ai"
          target="_blank"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
          rel="noreferrer"
        >
          aibrand.ai
        </a>
      </footer>
    </div>
  );
}

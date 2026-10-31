import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        aria-label="Install Offline App"
      >
        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Install Offline PWA</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3
                id="pwa-install-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Install Be Ready for Offline Blackout Access
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Installing Be Ready caches your entire household roster, FIFO inventory, and 1-Page Irish Action Plan locally on your device so it works with zero mobile signal.
            </p>
            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> button in your Safari toolbar.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Launch <strong>Be Ready</strong> anytime—even in Airplane/Blackout mode.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                <li>Click the <strong>Install</strong> icon in your browser address bar (or browser menu &rarr; <strong>Install App / Add to Home Screen</strong>).</li>
                <li>All household data is persisted locally in offline storage.</li>
              </ol>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-slate-900 px-3.5 py-2 text-xs font-medium text-amber-300 shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Offline Mode Active — Running from cached local household storage</span>
    </div>
  );
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster, ToastBar } from 'react-hot-toast';

import App from './App';
import { queryClient } from './lib/query-client';
import { SocketProvider } from './providers/SocketProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
          <App />
      </SocketProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            fontSize: '13px',
            padding: '10px 14px',
            maxWidth: '340px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#f1f5f9',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9',
            },
          },
        }}
      >
        {(t) => (
          <div
            style={{
              animation: t.visible
                ? 'toast-slide-in 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards'
                : 'toast-slide-out 0.4s cubic-bezier(0.06, 0.71, 0.55, 1) forwards',
            }}
          >
            <ToastBar toast={t} style={{ ...t.style, animation: 'none' }} />
          </div>
        )}
      </Toaster>
    </QueryClientProvider>
  </React.StrictMode>
);

// Register service worker for offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);
        // Check for updates periodically
        setInterval(() => reg.update(), 60 * 60 * 1000); // Every hour
      })
      .catch(err => console.error('SW registration failed:', err));
  });
}

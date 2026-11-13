// Cache bust: 1
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App.tsx';
import './index.css';
import { queryClient } from './lib/queryClient';
import { setupGlobalErrorListeners } from './utils/errorMonitoring';

// Initialize global error monitoring and suppression
setupGlobalErrorListeners();

// Reload the page when a dynamically imported chunk fails to load (e.g. after a new deployment)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// Render the app
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

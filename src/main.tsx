/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : '';

  if (url.startsWith('/api')) {
    const newConfig: RequestInit = { ...config, credentials: 'include' };
    const response = await originalFetch(resource, newConfig);

    // Auto-logout visual feedback and state reset on 401
    // Auto-logout visual feedback and state reset on 401
    // Ignore /api/login, /api/refresh and /api/account 401s (which might just be wrong password checks)
    if (response.status === 401 && !url.includes('/api/login') && !url.includes('/api/refresh') && !url.includes('/api/account')) {
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return response;
  }
  return originalFetch(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

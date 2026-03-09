/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

let isRefreshing = false;
let refreshSubscribers: ((tokenRefreshed: boolean) => void)[] = [];

const subscribeTokenRefresh = (cb: (tokenRefreshed: boolean) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (success: boolean) => {
  refreshSubscribers.forEach(cb => cb(success));
  refreshSubscribers = [];
};

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : '';

  if (url.startsWith('/api')) {
    const newConfig: RequestInit = { ...config, credentials: 'include' };
    let response = await originalFetch(resource, newConfig);

    // If we get a 401 on a protected route (not login, not refresh itself, not account checks)
    if (response.status === 401 && !url.includes('/api/login') && !url.includes('/api/refresh') && !url.includes('/api/account')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Attempt silently to refresh the token
          const refreshRes = await originalFetch('/api/refresh', { method: 'POST', credentials: 'include' });
          if (refreshRes.ok) {
            isRefreshing = false;
            onRefreshed(true);
            // Retry the original request that failed
            response = await originalFetch(resource, newConfig);
          } else {
            isRefreshing = false;
            onRefreshed(false);
            window.dispatchEvent(new Event('auth-unauthorized'));
          }
        } catch (error) {
          isRefreshing = false;
          onRefreshed(false);
          window.dispatchEvent(new Event('auth-unauthorized'));
        }
      } else {
        // If it's already refreshing someone else triggered it, we await the result
        return new Promise(resolve => {
          subscribeTokenRefresh(async (tokenRefreshed) => {
            if (tokenRefreshed) {
              resolve(await originalFetch(resource, newConfig));
            } else {
              resolve(response); // Will just return the 401 and let it fail downstream
            }
          });
        });
      }
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

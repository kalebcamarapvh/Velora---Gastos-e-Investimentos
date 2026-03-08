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
    const token = import.meta.env.VITE_API_SECRET_TOKEN;
    if (token) {
      const newConfig: RequestInit = { ...config };
      newConfig.headers = {
        ...newConfig.headers,
        Authorization: `Bearer ${token}`
      };
      return originalFetch(resource, newConfig);
    }
  }
  return originalFetch(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

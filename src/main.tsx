import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/i18n'

// --- GLOBAL FETCH CONCURRENCY LIMITER ---
// Enforce a hard limit of 5 concurrent fetch requests across the entire application
// This completely solves Safari's "Network connection was lost" errors on heavy pages
const originalFetch = window.fetch;
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>(resolve => requestQueue.push(resolve));
  }
  
  activeRequests++;
  try {
    return await originalFetch(input, init);
  } finally {
    activeRequests--;
    if (requestQueue.length > 0) {
      const next = requestQueue.shift();
      if (next) next();
    }
  }
};
// ----------------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

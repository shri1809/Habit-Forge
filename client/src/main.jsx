import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress noisy third-party browser extension connection errors (e.g. ad blockers, devtools, wallet extensions)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event?.reason?.message || String(event?.reason || "");
    if (
      msg.includes("Could not establish connection. Receiving end does not exist") ||
      msg.includes("runtime.lastError")
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

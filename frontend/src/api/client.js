import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,  // 15s timeout — prevents indefinite hangs
});

// ── Request interceptor — attach JWT ──────────────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('kl_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Response interceptor — auth + offline handling ────────────────────────────
api.interceptors.response.use(
  r => r,
  err => {
    // ── Offline / network error ───────────────────────────────────────────────
    // err.response is undefined when there is no network connection or the
    // server is unreachable. Without this check, the app shows a blank white
    // screen because every component that awaits an api call gets an uncaught
    // rejection.
    if (!err.response) {
      // Enrich the error so components can distinguish network vs API errors
      err.isOffline = true;
      err.message   = 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen.';
      return Promise.reject(err);
    }

    // ── 401 Unauthorized — session expired ───────────────────────────────────
    if (err.response.status === 401) {
      const isAuthEndpoint =
        err.config?.url?.includes('/auth/login')           ||
        err.config?.url?.includes('/auth/register')        ||
        err.config?.url?.includes('/auth/password')        ||
        err.config?.url?.includes('/auth/forgot-password') ||
        err.config?.url?.includes('/auth/reset-password')  ||
        err.config?.url?.includes('/vocab/progress')       ||
        err.config?.url?.includes('/toggle-learned');
      if (!isAuthEndpoint && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('kl_token');
        window.location.href = '/login';
      }
    }

    // ── 429 Rate limited ─────────────────────────────────────────────────────
    if (err.response.status === 429) {
      err.message = err.response.data?.error || 'Zu viele Anfragen. Bitte kurz warten.';
    }

    // ── 5xx Server error ─────────────────────────────────────────────────────
    if (err.response.status >= 500) {
      err.message = 'Serverfehler. Bitte versuche es in einem Moment erneut.';
    }

    return Promise.reject(err);
  }
);

// ── Online/offline event banner ───────────────────────────────────────────────
// Shows a subtle banner when network is lost/restored.
// Does not import React — runs once at module load, pure DOM.
if (typeof window !== 'undefined') {
  let banner = null;

  const showBanner = (msg, color) => {
    if (!banner) {
      banner = document.createElement('div');
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
        'padding:10px 20px', 'text-align:center', 'font-size:14px',
        'font-weight:700', 'color:#fff', 'transition:transform .3s ease',
        'font-family:system-ui,sans-serif',
      ].join(';');
      document.body.appendChild(banner);
    }
    banner.textContent = msg;
    banner.style.background = color;
    banner.style.transform = 'translateY(0)';
  };

  const hideBanner = () => {
    if (banner) {
      banner.style.transform = 'translateY(-100%)';
    }
  };

  window.addEventListener('offline', () =>
    showBanner('⚠️  Keine Internetverbindung', '#D94040')
  );

  window.addEventListener('online', () => {
    showBanner('✓  Verbindung wiederhergestellt', '#0B9E88');
    setTimeout(hideBanner, 2500);
  });
}

// ── extractError — normalize backend errors for display ───────────────────────
// Maps known backend error strings to i18n-friendly messages.
// Frontend components call this instead of err.response?.data?.error directly.
export function extractError(err, fallback = 'Ein Fehler ist aufgetreten') {
  if (err?.isOffline) return err.message;
  return err?.response?.data?.error || err?.message || fallback;
}

export default api;

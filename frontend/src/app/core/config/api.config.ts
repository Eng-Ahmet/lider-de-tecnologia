/**
 * Dynamic API Base URL resolver for CalleFix AI Málaga
 * Automatically detects hostname (localhost, 127.0.0.1, or local IP)
 * and targets isolated port 3880 in development.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3880/api';
  }

  const hostname = window.location.hostname || 'localhost';
  const port = window.location.port;

  // Development mode: Angular served on port (4880, 4200, etc.)
  if (port && port !== '80' && port !== '443') {
    return `http://${hostname}:3880/api`;
  }

  // Production mode: reverse proxied under /api
  return '/api';
}

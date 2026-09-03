/**
 * Safe API error helpers.
 *
 * Why this file exists
 * --------------------
 * React Native's Hermes runtime + LogBox console polyfill can CRASH while
 * trying to pretty-print a full Axios error object (they contain circular
 * `config` / `request` / `response` references and minified internal
 * properties). That serialization failure surfaces as:
 *
 *   ReferenceError: Property 'c' doesn't exist
 *   Failed to print error: Property 'c' doesn't exist
 *
 * So we NEVER pass a raw error object to console.log/error or JSON.stringify.
 * `logApiError` only logs flat, primitive values, and `getApiErrorMessage`
 * reduces any thrown value to one short, user-friendly sentence that surfaces
 * the actual backend message (e.g. "Invalid credentials", "User already
 * exists with this email") instead of the cryptic Hermes error.
 */

/**
 * Turns any thrown value (Axios error, JS Error, string) into a short, safe,
 * user-friendly message. Never throws.
 *
 * Priority:
 *   1. Network failures      -> "Unable to connect to the server…"
 *   2. Timeouts              -> "The request took too long…"
 *   3. Backend `message`     -> e.g. "Invalid credentials"
 *   4. HTTP status mapping   -> friendly per-status text
 *   5. `error.message` / raw string
 *   6. fallback
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;
  const err = error as any;

  // Network-level failure (server unreachable, DNS, refused/closed connection).
  const isNetworkError =
    err?.code === 'ERR_NETWORK' ||
    (typeof err?.message === 'string' && err.message === 'Network Error') ||
    (!err?.response && !!err?.request);

  if (isNetworkError) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  // Request timeout.
  if (err?.code === 'ECONNABORTED') {
    return 'The request took too long. Please try again.';
  }

  // Prefer the backend's own human-readable message.
  const backendMessage: unknown =
    err?.response?.data?.message ?? err?.response?.data?.error;
  if (
    typeof backendMessage === 'string' &&
    backendMessage.trim().length > 0 &&
    backendMessage.length < 200
  ) {
    return backendMessage.trim();
  }

  const status: number | undefined = err?.response?.status;
  if (typeof status === 'number' && status > 0) {
    if (status === 400) return 'Some of the details are not valid. Please review and try again.';
    if (status === 401) return 'Invalid email or password.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'We could not find what you were looking for.';
    if (status === 409) return 'That action conflicts with the current state.';
    if (status >= 500) return 'The server ran into a problem. Please try again shortly.';
  }

  if (typeof error === 'string' && error.length < 200) return error;
  if (typeof err?.message === 'string' && err.message.length < 200) return err.message;

  return fallback;
}

/**
 * Logs an API failure using ONLY flat primitive values so the Hermes/LogBox
 * console polyfill can never crash with "Property 'c' doesn't exist".
 */
export function logApiError(tag: string, error: unknown): void {
  try {
    const err = error as any;
    const status: unknown = err?.response?.status;
    const backendMsg: unknown =
      err?.response?.data?.message ?? err?.response?.data?.error;
    const url: unknown = err?.config?.url;
    const method: unknown = err?.config?.method;
    const code: unknown = err?.code;
    const message: unknown = err?.message;

    console.error(`❌ ${tag}`, {
      status: typeof status === 'number' ? status : undefined,
      code: typeof code === 'string' ? code : undefined,
      method: typeof method === 'string' ? method.toUpperCase() : undefined,
      url: typeof url === 'string' ? url : undefined,
      serverMessage: typeof backendMsg === 'string' ? backendMsg : undefined,
      message: typeof message === 'string' ? message : undefined,
    });
  } catch {
    // Logging must never crash the app. If even the summary fails, ignore it.
    try {
      console.error(`❌ ${tag} (unable to inspect error)`);
    } catch {
      /* no-op */
    }
  }
}
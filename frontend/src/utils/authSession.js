/** Shared auth bootstrap flag (avoids circular imports between api.js and authStore). */
let bootstrapping = false;

export function setAuthBootstrapping(value) {
  bootstrapping = !!value;
}

export function isAuthBootstrapping() {
  return bootstrapping;
}

export function hasPersistedSession() {
  try {
    if (localStorage.getItem('user')) return true;
    if (localStorage.getItem('accessToken')) return true;
    if (localStorage.getItem('refreshToken')) return true;
    if (sessionStorage.getItem('accessToken')) return true;
    if (sessionStorage.getItem('refreshToken')) return true;
    return false;
  } catch {
    return false;
  }
}

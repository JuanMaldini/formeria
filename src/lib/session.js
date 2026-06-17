// Sesion guardada SOLO en la pestaña (sessionStorage). Se borra al cerrar la pestaña.
const KEY = "formeria.session";

export function getSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.email !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export function setSession(email) {
  sessionStorage.setItem(KEY, JSON.stringify({ email }));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

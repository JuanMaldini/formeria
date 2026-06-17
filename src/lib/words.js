// Normalizacion y validacion de palabras / correos.

export const ALLOWED_DOMAIN = (
  import.meta.env.VITE_ALLOWED_DOMAIN || "tuempresa.com"
)
  .trim()
  .toLowerCase();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida formato basico y que el correo pertenezca al dominio permitido.
export function validateEmail(input) {
  const email = String(input || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Escribe tu correo." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Correo no valido." };
  if (!email.endsWith("@" + ALLOWED_DOMAIN)) {
    return { ok: false, error: `Not allowed domain.` };
  }
  return { ok: true, email };
}

export const MAX_WORD_LEN = 40;

// Rechaza caracteres de control (U+0000–U+001F y U+007F).
const CONTROL_RE = /[\u0000-\u001F\u007F]/;

// Normaliza una palabra para que "Hola", "hola " y "HOLA" sean la misma:
// trim, colapsa espacios internos y pasa a MAYUSCULAS.
export function normalizeWord(input) {
  const word = String(input || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!word) return { ok: false, error: "Escribe una palabra." };
  if (word.length > MAX_WORD_LEN) {
    return { ok: false, error: `Maximo ${MAX_WORD_LEN} caracteres.` };
  }
  if (CONTROL_RE.test(word)) {
    return { ok: false, error: "Caracteres no permitidos." };
  }
  return { ok: true, word };
}

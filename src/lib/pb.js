import PocketBase from "pocketbase";
import { normalizeWord } from "./words.js";

// La URL y el token son OBLIGATORIOS: ambos deben estar en .env.
// ADVERTENCIA: cualquier variable VITE_* queda visible en el bundle del navegador.
const PB_URL = (import.meta.env.VITE_PB_URL || "").trim();
const COLLECTION = (import.meta.env.VITE_PB_COLLECTION || "participants").trim();
const PB_TOKEN = (import.meta.env.VITE_PB_TOKEN || "").trim();

export { PB_URL, COLLECTION as PB_COLLECTION, PB_TOKEN };

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export const PB_READY = Boolean(PB_URL && PB_TOKEN);
if (PB_READY) {
  pb.authStore.save(PB_TOKEN, null);
}

function assertReady() {
  if (!PB_URL) {
    throw new Error(
      "Falta VITE_PB_URL. Define la URL de PocketBase en .env (ej: http://127.0.0.1:8090)."
    );
  }
  if (!PB_TOKEN) {
    throw new Error(
      "Falta VITE_PB_TOKEN. Configura el token de PocketBase en .env para que la app funcione."
    );
  }
}

// Modelo: un record por usuario en la coleccion.
//   { email: string, json: string[] (palabras en MAYUSCULAS, sin repetir) }
// Las palabras se guardan en el campo "json" (tipo JSON) de la coleccion.

// Lee el array de palabras de un record (el campo json puede venir null/objeto).
function wordsOf(record) {
  return Array.isArray(record?.json) ? record.json : [];
}

// Busca el record del usuario por email. Devuelve null si no existe.
async function findUserRecord(email) {
  try {
    return await pb
      .collection(COLLECTION)
      .getFirstListItem(`email="${email.replace(/"/g, '\\"')}"`);
  } catch (err) {
    if (err && err.status === 404) return null;
    throw err;
  }
}

// Garantiza que exista el record del usuario. Lo crea (json: []) si no existe.
// Idempotente y con manejo de carrera (dos pestañas creando a la vez).
export async function ensureUser(email) {
  assertReady();
  const existing = await findUserRecord(email);
  if (existing) return existing;
  try {
    return await pb.collection(COLLECTION).create({ email, json: [] });
  } catch (err) {
    // Si otro proceso lo creo en paralelo, re-consulta.
    const again = await findUserRecord(email);
    if (again) return again;
    throw err;
  }
}

// Agrega una palabra al record del usuario.
// Devuelve { ok, error } — error si el usuario ya la habia enviado.
export async function addWord(email, rawWord) {
  assertReady();
  const norm = normalizeWord(rawWord);
  if (!norm.ok) return norm;
  const word = norm.word;

  const record = await ensureUser(email);
  const words = wordsOf(record);
  if (words.includes(word)) {
    return { ok: false, error: "Ya enviaste esa palabra." };
  }
  await pb.collection(COLLECTION).update(record.id, { json: [...words, word] });
  return { ok: true, word };
}

// Devuelve el array de palabras (votos) del usuario actual. [] si no tiene record.
export async function getMyWords(email) {
  assertReady();
  const record = await findUserRecord(email);
  return record ? wordsOf(record) : [];
}

// Quita una palabra (el voto del usuario) de su record.
// Devuelve { ok, removed }. removed=false si no la tenia.
export async function removeWord(email, rawWord) {
  assertReady();
  const norm = normalizeWord(rawWord);
  if (!norm.ok) return norm;
  const word = norm.word;

  const record = await findUserRecord(email);
  if (!record) return { ok: true, removed: false };
  const words = wordsOf(record);
  if (!words.includes(word)) return { ok: true, removed: false };

  await pb
    .collection(COLLECTION)
    .update(record.id, { json: words.filter((w) => w !== word) });
  return { ok: true, removed: true, word };
}

// Trae SOLO el campo json de todos los records (no expone emails) y los mezcla:
// cuenta en cuantos usuarios aparece cada palabra -> relevancia.
export async function getWordCounts() {
  assertReady();
  const records = await pb.collection(COLLECTION).getFullList({
    fields: "json",
    batch: 500,
  });
  const counts = new Map();
  for (const rec of records) {
    // Set para que un mismo usuario cuente como 1 por palabra (defensivo).
    for (const w of new Set(wordsOf(rec))) {
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  // [{ word, count }] ordenado por relevancia desc.
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

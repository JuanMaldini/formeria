import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  addWord,
  removeWord,
  getWordCounts,
  getMyWords,
  PB_URL,
  PB_COLLECTION,
  PB_TOKEN,
} from "../lib/pb.js";
import { formatPbError } from "../lib/errors.js";
import { normalizeWord } from "../lib/words.js";
import WordCloud from "./WordCloud.jsx";

const PB_ENV = { PB_URL, PB_COLLECTION, PB_TOKEN };
const MAX_SUGGESTIONS = 8;

export default function Dashboard({ email, onLogout, onOpenLogin }) {
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState(() => new Set()); // palabras que voto este usuario
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // sugerencia resaltada
  const [open, setOpen] = useState(false); // mostrar desplegable
  const blurTimer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      // La nube se carga siempre (con o sin sesion); los votos propios solo si hay login.
      const counts = await getWordCounts();
      setItems(counts);
      setMine(new Set(email ? await getMyWords(email) : []));
      setError("");
      setErrorDetail("");
    } catch (err) {
      const f = formatPbError(err, { where: "Dashboard.refresh / getWordCounts" }, PB_ENV);
      setError(
        f.status
          ? `No se pudo conectar con PocketBase (HTTP ${f.status}).`
          : "No se pudo conectar con PocketBase. Revisa la URL en src/lib/pb.js y las reglas."
      );
      setErrorDetail(f.hint);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sugerencias: filtra TODAS las palabras existentes (de todos los usuarios)
  // contra lo que se va escribiendo. Prefijo primero, luego coincidencia parcial.
  const suggestions = useMemo(() => {
    const q = normalizeWord(value);
    if (!q.ok) return [];
    const term = q.word;
    const starts = [];
    const contains = [];
    for (const it of items) {
      if (it.word === term) continue; // ya es exactamente esa palabra
      if (it.word.startsWith(term)) starts.push(it);
      else if (it.word.includes(term)) contains.push(it);
    }
    // items ya viene ordenado por relevancia (count desc).
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [value, items]);

  const showList = open && suggestions.length > 0;

  async function submitWord(rawWord) {
    const word = String(rawWord || "").trim();
    if (!word || sending) return;
    // El input es visible siempre, pero para guardar hace falta sesion.
    if (!email) {
      setOpen(false);
      onOpenLogin && onOpenLogin();
      return;
    }
    setSending(true);
    setError("");
    setErrorDetail("");
    setOpen(false);
    setActiveIndex(-1);
    try {
      const res = await addWord(email, word);
      if (!res.ok) {
        setError(res.error);
      } else {
        setValue("");
        await refresh();
      }
    } catch (err) {
      const f = formatPbError(err, { where: "Dashboard.submitWord / addWord" }, PB_ENV);
      setError(
        f.status ? `Error al guardar la palabra (HTTP ${f.status}).` : "Error al guardar la palabra."
      );
      setErrorDetail(f.hint);
    } finally {
      setSending(false);
    }
  }

  // Clic en una palabra de la nube (con sesion): si ya es tuya quita tu voto,
  // si no, suma tu voto (igual que escribirla). Si queda sin votos, desaparece.
  async function handleWordClick(word) {
    if (sending) return;
    if (!email) {
      onOpenLogin && onOpenLogin();
      return;
    }
    setSending(true);
    setError("");
    setErrorDetail("");
    try {
      const res = mine.has(word) ? await removeWord(email, word) : await addWord(email, word);
      if (!res.ok) setError(res.error || "No se pudo registrar tu voto.");
      else await refresh();
    } catch (err) {
      const f = formatPbError(err, { where: "Dashboard.handleWordClick" }, PB_ENV);
      setError(
        f.status ? `Error al registrar el voto (HTTP ${f.status}).` : "Error al registrar el voto."
      );
      setErrorDetail(f.hint);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      submitWord(suggestions[activeIndex].word);
    } else {
      submitWord(value);
    }
  }

  function handleKeyDown(e) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="screen">
      {/* Boton de sesion flotante (sin navbar). */}
      <div className="authbar">
        {email ? (
          <>
            <span className="muted topbar__email">{email.split("@")[0]}</span>
            <button className="btn btn--ghost" onClick={onLogout}>
              Salir
            </button>
          </>
        ) : (
          <button className="btn btn--ghost" onClick={onOpenLogin}>
            Login
          </button>
        )}
      </div>

      {/* Input siempre visible, arriba a la izquierda. */}
      <form className="composer" onSubmit={handleSubmit}>
        <div className="composer__field">
          <input
            className="input input--big"
            placeholder="Escribe una palabra y presiona Enter"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={handleKeyDown}
            maxLength={40}
            autoFocus
            disabled={sending}
            role="combobox"
            aria-expanded={showList}
            aria-autocomplete="list"
          />
          {showList && (
            <ul className="suggestions" role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={s.word}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={
                    "suggestions__item" + (i === activeIndex ? " suggestions__item--active" : "")
                  }
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    submitWord(s.word);
                  }}
                >
                  <span className="suggestions__word">{s.word}</span>
                  <span className="suggestions__count">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
      {error && <p className="error error--center">{error}</p>}
      {errorDetail && <p className="error-detail error--center">{errorDetail}</p>}

      {loading ? (
        <div className="cloud cloud--empty">
          <p className="muted">Cargando…</p>
        </div>
      ) : (
        <WordCloud items={items} mine={mine} onWordClick={handleWordClick} canVote={Boolean(email)} />
      )}
    </div>
  );
}

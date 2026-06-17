import { useState, useEffect } from "react";
import { validateEmail } from "../lib/words.js";
import { setSession } from "../lib/session.js";
import { ensureUser, PB_READY, PB_URL, PB_COLLECTION, PB_TOKEN } from "../lib/pb.js";
import { formatPbError } from "../lib/errors.js";

const PB_ENV = { PB_URL, PB_COLLECTION, PB_TOKEN };

export default function Login({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState(""); // pista tecnica (status / hint)
  const [submitting, setSubmitting] = useState(false);

  // Cerrar con la tecla Escape.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && onClose) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const res = validateEmail(email);
    if (!res.ok) {
      setError(res.error);
      setErrorDetail("");
      return;
    }
    if (!PB_READY) {
      setError("La app no esta configurada (revisa VITE_PB_URL y VITE_PB_TOKEN en .env).");
      setErrorDetail("PB_READY = false (falta URL o token).");
      return;
    }

    setError("");
    setErrorDetail("");
    setSubmitting(true);
    try {
      // Apenas entra el usuario, se garantiza/crea su registro en PocketBase.
      await ensureUser(res.email);
      setSession(res.email);
      onLogin({ email: res.email });
    } catch (err) {
      const f = formatPbError(err, { where: "Login.handleSubmit / ensureUser" }, PB_ENV);
      setError(
        f.status ? "No se pudo entrar (HTTP " + f.status + ")." : "No se pudo conectar con PocketBase."
      );
      setErrorDetail(f.hint);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <form className="card login" onSubmit={handleSubmit}>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            disabled={submitting}
          />
          {error && <p className="error">{error}</p>}
          {errorDetail && <p className="error-detail">{errorDetail}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

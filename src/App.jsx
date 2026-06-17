import { useState } from "react";
import { getSession, clearSession } from "./lib/session.js";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const [session, setSessionState] = useState(() => getSession());
  const [showLogin, setShowLogin] = useState(false);

  function handleLogout() {
    clearSession();
    setSessionState(null);
  }

  function handleLogin(s) {
    setSessionState(s);
    setShowLogin(false);
  }

  // El dashboard es siempre la home. La nube se ve con o sin sesion;
  // la barra para agregar palabras solo aparece si hay login (lo controla el Dashboard).
  return (
    <>
      <Dashboard
        email={session ? session.email : null}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLogin(true)}
      />
      {showLogin && <Login onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
    </>
  );
}

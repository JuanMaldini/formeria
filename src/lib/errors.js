// Helper para loguear errores de PocketBase con contexto completo.
// Se usa desde Login y Dashboard para no perder la causa raiz en los catch.

// Convierte cualquier error (ClientResponseError de PocketBase, TypeError de red,
// o cualquier otra cosa) en { status, message, hint }.
// Ademas lo loguea con detalle a la consola para no perder la causa raiz.
export function formatPbError(err, ctx = {}, env = {}) {
  const status = err?.status ?? err?.response?.code ?? null;
  const pbMsg =
    err?.response?.message || err?.message || (typeof err === "string" ? err : "");
  const url = err?.url || err?.response?.url || ctx.url || "";
  // Errores por campo que devuelve PocketBase: { campo: { code, message } }
  const data = err?.response?.data || err?.data?.data || err?.data || null;
  const collection = env.PB_COLLECTION || "?";

  // Convierte el mapa de errores por campo en texto legible.
  function fieldErrors() {
    if (!data || typeof data !== "object") return "";
    const parts = [];
    for (const [field, info] of Object.entries(data)) {
      const msg = info && typeof info === "object" ? info.message || info.code : info;
      if (msg) parts.push('"' + field + '": ' + msg);
    }
    return parts.join(" | ");
  }

  // Mensaje + pista segun el tipo de fallo
  let hint = "";
  if (!status && (err?.name === "TypeError" || /fetch|network/i.test(pbMsg))) {
    hint = "No se pudo contactar el servidor (red, CORS o URL incorrecta). Revisa VITE_PB_URL.";
  } else if (status === 400) {
    const fe = fieldErrors();
    hint = fe
      ? "400: PocketBase rechazo los datos. Campos -> " + fe
      : "400: los datos enviados no coinciden con el esquema de la coleccion (campos 'email' y 'words'). Revisa que existan y que 'words' sea tipo JSON.";
  } else if (status === 401) {
    hint = "401: token invalido o expirado. Renueva VITE_PB_TOKEN.";
  } else if (status === 403) {
    hint =
      '403: el token no tiene permiso sobre la coleccion "' +
      collection +
      '". Revisa las API Rules (List, View, Create) o usa un token de _superusers.';
  } else if (status === 404) {
    hint =
      '404: endpoint no encontrado. Verifica VITE_PB_COLLECTION (actual: "' +
      collection +
      '") y que la coleccion exista.';
  } else if (status >= 500) {
    hint = "500: error interno del servidor de PocketBase.";
  } else if (status) {
    hint = "PocketBase respondio con HTTP " + status + ".";
  }

  // Log agrupado: una linea-resumen legible + el detalle desplegable.
  const where = ctx.where || "unknown";
  /* eslint-disable no-console */
  console.groupCollapsed("[formeria] PocketBase " + (status ?? "ERR") + " en " + where);
  console.error(hint || pbMsg || "Error desconocido");
  console.log("status :", status);
  console.log("message:", pbMsg);
  console.log("url    :", url);
  console.log("fields :", data);
  console.log("env    :", {
    PB_URL: env.PB_URL,
    PB_COLLECTION: env.PB_COLLECTION,
    PB_TOKEN: env.PB_TOKEN ? env.PB_TOKEN.slice(0, 6) + "..." : "(vacio)",
  });
  console.log("raw    :", err);
  console.groupEnd();
  /* eslint-enable no-console */

  return { status, message: pbMsg, hint };
}

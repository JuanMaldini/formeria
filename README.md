# formeria

Web mínima: login por correo (solo validación de dominio) + un dashboard con una
**nube de palabras radial y colorida**. Cada usuario aporta palabras; el tamaño de
cada palabra crece según en cuántos usuarios distintos aparece (su relevancia).

- **Stack:** Vite + React, sin backend propio. PocketBase se usa **solo como almacén de datos**.
- **Sesión:** se guarda en `sessionStorage` (vive solo mientras la pestaña está abierta).
- **Sin sistema de usuarios de PocketBase:** el "login" es únicamente validación de dominio.

## Cómo funciona

1. **Login** (`/`): el usuario escribe su correo. Si termina en `@VITE_ALLOWED_DOMAIN`,
   se guarda `{ email }` en `sessionStorage` y entra al dashboard.
2. **Dashboard:** input de palabra. Al presionar **Enter**:
   - La palabra se normaliza (trim, espacios colapsados, **MAYÚSCULAS**), así
     `Hola`, `hola ` y `HOLA` cuentan como la misma.
   - Se agrega al **record del usuario** en PocketBase. Si ese usuario ya la había
     enviado, se rechaza ("Ya enviaste esa palabra") — **no puede enviar dos veces la misma**.
3. **Nube:** el frontend trae todos los records, **mezcla** sus arrays `words` y
   cuenta en cuántos usuarios aparece cada palabra. Esa cuenta = tamaño en la nube.
   La nube **no muestra quién** escribió cada palabra (solo se consulta el campo `words`).

## Modelo de datos

**Un solo record por usuario**, colección `participants`:

| Campo   | Tipo          | Notas                                              |
| ------- | ------------- | -------------------------------------------------- |
| `email` | text (único)  | Correo del usuario. Índice único.                  |
| `words` | json (array)  | Palabras en MAYÚSCULAS, sin repetir dentro del usuario. |

## Configuración

1. Copia `.env.example` a `.env` y ajusta los valores:

   ```
   VITE_ALLOWED_DOMAIN=tuempresa.com
   VITE_PB_URL=http://127.0.0.1:8090     # requerida: URL de tu PocketBase
   VITE_PB_COLLECTION=participants
   VITE_PB_TOKEN=                        # opcional — ver "Seguridad" abajo
   ```

2. Instala y corre:

   ```
   npm install
   npm run dev      # desarrollo
   npm run build    # producción -> carpeta dist/
   ```

## Setup de PocketBase

1. Crea una colección **base** llamada `participants`.
2. Campos:
   - `email` — tipo **Text**, requerido. En "Options" marca **Unique** (o crea un
     índice único sobre `email`).
   - `words` — tipo **JSON**.
3. Reglas de API (pestaña **API Rules** de la colección): ver abajo según el modo
   de acceso que elijas.

### Seguridad — elige UN modo de acceso

⚠️ **Importante:** cualquier variable `VITE_*` se compila dentro del bundle de
JavaScript y es **visible** para quien abra la web. No pongas ahí un token de
superusuario salvo en un entorno cerrado/demo.

**Modo A — Sin token (recomendado).** Deja `VITE_PB_TOKEN` vacío y haz las reglas
de la colección públicas pero acotadas. En API Rules pon estas (vacías = público):

- **List/Search:** ``  (público — necesario para construir la nube)
- **View:** ``
- **Create:** ``  (público — para registrar palabras)
- **Update:** ``  (público — para agregar palabras al array del usuario)
- **Delete:** deja en `null` (bloqueado) para que nadie borre records.

Así, en el peor caso alguien puede crear/editar registros de esa colección, pero
**no** tocar el resto de tu base ni borrar datos. Es el equilibrio razonable para
una web 100% frontend.

**Modo B — Con token.** Pon `VITE_PB_TOKEN` en `.env`. El frontend lo usará como
auth. Funciona, pero el token queda **expuesto en el navegador**; úsalo solo en
red interna o demos desechables. Si lo usas, que sea un token con el mínimo alcance
posible, no de superusuario.

> Nota sobre el "registro por usuario": como no hay autenticación real, el email es
> **auto-declarado** por el frontend. Sirve para deduplicar y agrupar, no como
> barrera de seguridad. Para una barrera real necesitarías auth de PocketBase o un
> backend/proxy que guarde el token (fuera del alcance de esta versión mínima).

## Estructura

```
src/
  main.jsx                 punto de entrada
  App.jsx                  enruta Login <-> Dashboard según la sesión
  styles.css               estilos
  lib/
    session.js             sessionStorage (sesión por pestaña)
    words.js               normalización y validación (correo + palabra)
    pb.js                  cliente PocketBase: addWord / getWordCounts
  components/
    Login.jsx              validación de dominio
    Dashboard.jsx          input + estado + refresh
    WordCloud.jsx          nube radial colorida
```

## Notas de seguridad implementadas

- **XSS:** React escapa el texto por defecto; las palabras nunca se inyectan como HTML.
- **Validación de entrada:** longitud máxima (40), normalización y rechazo de
  caracteres de control.
- **Dedupe defensivo:** se usa un `Set` tanto al guardar como al contar.
- **Privacidad:** la nube consulta solo el campo `words` (no trae emails).
- **Sesión efímera:** `sessionStorage`, no persiste al cerrar la pestaña.

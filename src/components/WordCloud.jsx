// Nube radial centrada: la palabra mas relevante va al centro y crece;
// las demas se reparten en espiral alrededor. Colorida y en MAYUSCULAS.

// ===========================================================================
// MULTIPLICADOR DEL TAMANO DE LAS PALABRAS  (ajustalo aqui, NO en .env)
// Controla cuanto crece la palabra mas votada respecto a la menos votada.
//   1    = crecimiento original (palabra grande llega a ~64px)
//   0.25 = un cuarto de ese crecimiento (actual)
//   2    = el doble, etc.
const SIZE_MULTIPLIER = 0.25;
// ===========================================================================

const MIN_FONT = 16; // px de la palabra menos votada
const MAX_GROWTH = (64 - MIN_FONT) * SIZE_MULTIPLIER; // px extra para la mas votada

// Tamaño de fuente en funcion de la relevancia (count).
function fontSizeFor(count, max) {
  if (max <= 1) return Math.round(MIN_FONT + MAX_GROWTH * 0.3);
  const t = (count - 1) / (max - 1); // 0..1
  return Math.round(MIN_FONT + t * MAX_GROWTH);
}

// Color estable por palabra (HSL) -> "colorfull" pero consistente entre renders.
function colorFor(word) {
  let h = 0;
  for (let i = 0; i < word.length; i++) {
    h = (h * 31 + word.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 70% 60%)`;
}

// Posiciones en espiral (Vogel / phyllotaxis) para repartir de forma radial.
function spiralPositions(n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const r = i === 0 ? 0 : Math.sqrt(i) * 13; // % desde el centro
    const a = i * golden;
    pts.push({
      x: 50 + r * Math.cos(a),
      y: 50 + r * Math.sin(a),
    });
  }
  return pts;
}

export default function WordCloud({ items, mine, onWordClick, canVote }) {
  if (!items.length) {
    return (
      <div className="cloud cloud--empty">
        <p className="muted">Aun no hay palabras. Escribe la primera.</p>
      </div>
    );
  }

  const max = items[0].count; // items viene ordenado desc
  const pos = spiralPositions(items.length);
  const owns = (word) => Boolean(mine && mine.has(word));

  return (
    <div className="cloud" role="list" aria-label="Nube de palabras">
      {items.map((item, i) => {
        const size = fontSizeFor(item.count, max);
        const isMine = owns(item.word);
        const style = {
          left: `${pos[i].x}%`,
          top: `${pos[i].y}%`,
          color: colorFor(item.word),
          fontSize: `${size}px`,
        };
        const inner = (
          <>
            <span className="cloud__text">{item.word}</span>
            <span className="cloud__count">×{item.count}</span>
          </>
        );

        // Con sesion, cualquier palabra es clicable: las tuyas quitan tu voto,
        // las demas suman tu voto. Sin sesion, solo se muestran.
        if (canVote) {
          const className =
            "cloud__word " + (isMine ? "cloud__word--mine" : "cloud__word--votable");
          return (
            <button
              key={item.word}
              type="button"
              className={className}
              style={style}
              onClick={() => onWordClick && onWordClick(item.word)}
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={item.word}
            role="listitem"
            className="cloud__word"
            style={style}
            title={`${item.word} · ${item.count}`}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

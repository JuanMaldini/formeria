// Analiticas minimas de la nube: grafico de barras del top de palabras.
// Se recalcula solo cada vez que cambian las palabras/votos (recibe `items`).

const TOP_N = 10; // cuantas palabras mostrar en el grafico de barras

// Color estable por palabra (mismo criterio que la nube).
function colorFor(word) {
  let h = 0;
  for (let i = 0; i < word.length; i++) {
    h = (h * 31 + word.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 70% 60%)`;
}

export default function Analytics({ items }) {
  const max = items[0] ? items[0].count : 0;
  const bars = items.slice(0, TOP_N);

  return (
    <section className="analytics">
      {bars.length === 0 ? (
        <p className="muted analytics__empty">Aún no hay datos para graficar.</p>
      ) : (
        <ul className="bars">
          {bars.map((it) => {
            const pct = max ? Math.round((it.count / max) * 100) : 0;
            return (
              <li className="bar" key={it.word}>
                <span className="bar__label" title={it.word}>
                  {it.word}
                </span>
                <span className="bar__track">
                  <span
                    className="bar__fill"
                    style={{ width: `${pct}%`, background: colorFor(it.word) }}
                  />
                </span>
                <span className="bar__value">{it.count}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

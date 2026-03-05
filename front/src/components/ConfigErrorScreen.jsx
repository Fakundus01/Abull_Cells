export default function ConfigErrorScreen({ missingKeys = [] }) {
  return (
    <main className="config-error-screen" role="alert" aria-live="assertive">
      <section className="config-error-card card">
        <h1>Configuracion incompleta</h1>
        <p>
          La app no puede iniciar porque faltan variables de entorno obligatorias.
        </p>

        <div className="config-error-list-wrap">
          <strong>Variables faltantes:</strong>
          <ul className="config-error-list">
            {missingKeys.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <p className="config-error-hint">
          Defini estas variables en <code>front/.env</code> y reinicia <code>npm run dev</code>.
        </p>
      </section>
    </main>
  );
}

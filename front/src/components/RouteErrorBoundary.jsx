import { Component } from "react";

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep a client-side trace to aid debugging in production.
    console.error("[RouteErrorBoundary]", error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="route-error-screen" role="alert">
        <div className="route-error-card card">
          <h1>Algo salio mal en esta vista</h1>
          <p>
            Detectamos un error inesperado. Podes recargar la pagina o volver al inicio.
          </p>
          <div className="route-error-actions">
            <button type="button" className="btn-primary" onClick={this.handleReload}>
              Recargar pagina
            </button>
            <a className="btn-secondary" href="/">
              Ir al inicio
            </a>
          </div>
        </div>
      </section>
    );
  }
}

export default RouteErrorBoundary;

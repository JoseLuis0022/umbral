import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';
import { errores as copy } from '../copy';

type Props = {
  children?: ReactNode;
  /**
   * Cuando cambia, un límite que está mostrando el error vuelve a intentar
   * pintar a sus hijos. Sirve donde NO conviene remontar con `key` (el chat:
   * pasar de /chat a /chat/c-1 a media respuesta no debe desmontar nada).
   */
  claveReinicio?: string;
  /** `pantalla` ocupa el viewport entero; `seccion` se acomoda en su contenedor. */
  variante?: 'pantalla' | 'seccion';
};

type Estado = { error: Error | null };

/**
 * Límite de error de React.
 *
 * Sin él, una excepción en el render de CUALQUIER componente desmonta el árbol
 * entero y la app queda en blanco, sin cabecera ni forma de salir. Con él, la
 * falla se queda en la pantalla que la produjo, la persona lee qué pasó y
 * tiene dos salidas: reintentar (volver a pintar sin recargar, conserva la
 * sesión y el historial) o recargar la página.
 *
 * Tiene que ser una clase: React no ofrece todavía un equivalente en hooks
 * para `getDerivedStateFromError` / `componentDidCatch`.
 */
export class LimiteError extends Component<Props, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola para quien depura; a la persona no se le muestra.
    console.error('Error de render atrapado por LimiteError', error, info.componentStack);
  }

  componentDidUpdate(previas: Props) {
    if (this.state.error && previas.claveReinicio !== this.props.claveReinicio) {
      this.setState({ error: null });
    }
  }

  private reintentar = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    const pantalla = this.props.variante === 'pantalla';
    return (
      <div
        role="alert"
        className={
          pantalla
            ? 'flex min-h-full w-full flex-1 flex-col items-center justify-center gap-3 bg-bg px-6 py-16 text-center'
            : 'flex w-full flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center'
        }
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-red-soft text-status-red">
          <AlertTriangle size={22} strokeWidth={1.75} />
        </span>
        <h2 className="font-ui text-15 font-medium text-text-1">{copy.renderTitulo}</h2>
        <p className="max-w-sm font-ui text-13 text-text-2">{copy.renderDetalle}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={this.reintentar}>
            {copy.reintentar}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            {copy.recargar}
          </Button>
        </div>
      </div>
    );
  }
}

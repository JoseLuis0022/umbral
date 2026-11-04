import { Button, Modal } from '../../ui';
import { admin as copy } from '../../../copy';
import { useDialogoAccesible } from './useDialogoAccesible';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Tienes cambios sin guardar',
  cuerpo: (titulo: string) =>
    `Lo que escribiste en "${titulo}" todavía no se ha publicado. Si cambias de boletín ahora, se pierde.`,
  seguir: 'Seguir editando',
  descartar: 'Descartar los cambios',
  guardar: copy.guardarCambios,
};

/**
 * Aviso al salir del editor con cambios pendientes.
 *
 * Es un `Modal` y no un `window.confirm`: el diálogo nativo no se puede
 * redactar, no respeta la tipografía ni el foco de la app, y en varios
 * navegadores se puede suprimir sin que el usuario lo sepa.
 *
 * Las tres salidas están nombradas por lo que hacen —nada de "Aceptar" y
 * "Cancelar", que aquí serían ambiguas: ¿aceptar qué? La opción segura
 * (seguir editando) es la primera y la que se enfoca al abrir.
 */
export function DialogoCambiosSinGuardar({
  abierto,
  titulo,
  guardando,
  onSeguir,
  onDescartar,
  onGuardar,
}: {
  abierto: boolean;
  /** Título del boletín que se está abandonando. */
  titulo: string;
  guardando: boolean;
  onSeguir: () => void;
  onDescartar: () => void;
  onGuardar: () => void;
}) {
  useDialogoAccesible(abierto, onSeguir);

  return (
    <Modal
      open={abierto}
      onClose={onSeguir}
      size="sm"
      title={TEXTO.titulo}
      footer={
        <>
          <Button variant="ghost" onClick={onSeguir} disabled={guardando}>
            {TEXTO.seguir}
          </Button>
          <Button variant="destructive" onClick={onDescartar} disabled={guardando}>
            {TEXTO.descartar}
          </Button>
          <Button variant="primary" onClick={onGuardar} loading={guardando}>
            {TEXTO.guardar}
          </Button>
        </>
      }
    >
      <p className="font-ui text-13 text-text-2">{TEXTO.cuerpo(titulo)}</p>
    </Modal>
  );
}

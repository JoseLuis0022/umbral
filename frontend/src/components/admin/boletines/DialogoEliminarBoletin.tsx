import { useCallback } from 'react';
import type { Guia } from '../../../types';
import { Button, Modal } from '../../ui';
import { CLASES_CATEGORIA } from '../../guias';
import { cn } from '../../../lib/cn';
import { useDialogoAccesible } from './useDialogoAccesible';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  tituloPublicado: 'Eliminar boletín',
  tituloNuevo: 'Descartar el boletín',
  cuerpoPublicado:
    'Deja de aparecer en "Al día" para toda la comunidad universitaria. Esta acción no se puede deshacer.',
  cuerpoNuevo: 'Nunca llegó a publicarse: al descartarlo no queda nada de lo que escribiste.',
  conservar: 'Conservar el boletín',
  seguirEscribiendo: 'Seguir escribiendo',
  sinTitulo: 'Boletín sin título',
};

/**
 * Confirmación de retiro.
 *
 * El botón peligroso NOMBRA la acción ("Eliminar boletín", no "Sí") y usa
 * `variant="destructive"`, que es el rojo terroso de estatus: el color de marca
 * sigue significando "acción principal", nunca "cuidado".
 *
 * El título del boletín se repite dentro del diálogo porque el editor queda
 * tapado por el fondo esmerilado: sin él, no hay forma de verificar qué se va a
 * retirar antes de confirmarlo.
 */
export function DialogoEliminarBoletin({
  guia,
  esNuevo,
  eliminando,
  onCerrar,
  onConfirmar,
}: {
  guia: Guia | null;
  esNuevo: boolean;
  eliminando: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  const cerrar = useCallback(() => {
    if (!eliminando) onCerrar();
  }, [eliminando, onCerrar]);

  useDialogoAccesible(guia !== null, cerrar);

  return (
    <Modal
      open={guia !== null}
      onClose={cerrar}
      size="sm"
      title={esNuevo ? TEXTO.tituloNuevo : TEXTO.tituloPublicado}
      footer={
        <>
          <Button variant="ghost" onClick={cerrar} disabled={eliminando}>
            {esNuevo ? TEXTO.seguirEscribiendo : TEXTO.conservar}
          </Button>
          <Button variant="destructive" onClick={onConfirmar} loading={eliminando}>
            {esNuevo ? TEXTO.tituloNuevo : TEXTO.tituloPublicado}
          </Button>
        </>
      }
    >
      {guia && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 rounded-celda bg-bg px-3 py-2.5">
            <p
              className={cn(
                'font-ui text-13 font-medium',
                guia.titulo.trim() ? 'text-text-1' : 'italic text-text-3'
              )}
            >
              {guia.titulo.trim() || TEXTO.sinTitulo}
            </p>
            <span
              className={cn(
                'inline-flex h-6 w-fit items-center rounded-celda px-2 font-ui text-12 font-medium',
                CLASES_CATEGORIA[guia.categoria]
              )}
            >
              {guia.categoria}
            </span>
          </div>
          <p className="font-ui text-13 text-text-2">{esNuevo ? TEXTO.cuerpoNuevo : TEXTO.cuerpoPublicado}</p>
        </div>
      )}
    </Modal>
  );
}

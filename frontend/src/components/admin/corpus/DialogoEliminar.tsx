import { useCallback } from 'react';
import type { Documento } from '../../../types';
import { tamanoLegible } from '../../../lib/fechas';
import { Button, Modal } from '../../ui';
import { admin as copy } from '../../../copy';
import { useDialogoAccesible } from './useDialogoAccesible';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  titulo: 'Eliminar documento',
  cuerpo: 'Se quita de la base y el asistente deja de citarlo. Esta acción no se puede deshacer.',
  cancelar: 'Conservar el documento',
};

/**
 * Confirmación de borrado.
 *
 * El botón peligroso NOMBRA la acción ("Eliminar documento", no "Sí") y usa
 * `variant="destructive"`, que es el rojo terroso de estatus: el rojo de marca
 * sigue significando "acción principal", nunca "cuidado".
 *
 * El nombre del archivo se repite dentro del diálogo porque el menú desde el
 * que se abrió ya se cerró: sin él, no hay forma de verificar qué se va a
 * borrar antes de confirmarlo.
 */
export function DialogoEliminar({
  documento,
  eliminando,
  onCerrar,
  onConfirmar,
}: {
  documento: Documento | null;
  eliminando: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  const cerrar = useCallback(() => {
    if (!eliminando) onCerrar();
  }, [eliminando, onCerrar]);

  useDialogoAccesible(documento !== null, cerrar);

  return (
    <Modal
      open={documento !== null}
      onClose={cerrar}
      size="sm"
      title={textos.titulo}
      footer={
        <>
          <Button variant="ghost" onClick={cerrar} disabled={eliminando}>
            {textos.cancelar}
          </Button>
          <Button variant="destructive" onClick={onConfirmar} loading={eliminando}>
            {copy.eliminarDoc}
          </Button>
        </>
      }
    >
      {documento && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 rounded-celda bg-bg px-3 py-2.5">
            <span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-celda bg-surface-1 font-ui text-12 font-semibold uppercase text-text-2">
              {documento.tipo}
            </span>
            <div className="min-w-0">
              <p className="truncate font-ui text-13 font-medium text-text-1">{documento.nombre}</p>
              <p className="font-ui text-12 tabular-nums text-text-3">{tamanoLegible(documento.tamanoBytes)}</p>
            </div>
          </div>
          <p className="font-ui text-13 text-text-2">{textos.cuerpo}</p>
        </div>
      )}
    </Modal>
  );
}

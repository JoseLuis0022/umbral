import { useCallback } from 'react';
import { Button, Modal } from '../../ui';
import { useDialogoAccesible } from './useDialogoAccesible';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Restaurar el original',
  cuerpo: (nombre: string) =>
    `"${nombre}" vuelve al texto con el que se publicó y se descartan todos los cambios hechos desde administración.`,
  detalle: 'Los votos de la comunidad no se tocan: solo cambia el contenido.',
  cancelar: 'Conservar mis cambios',
  confirmar: 'Restaurar el original',
};

/**
 * Confirmación de restauración.
 *
 * Restaurar borra trabajo, así que se confirma igual que un borrado, pero el
 * botón NO es destructivo: lo que devuelve es el texto revisado y publicado.
 * Pintarlo del rojo de riesgo diría que restaurar es peligroso, cuando es la
 * salida para quien editó de más.
 */
export function DialogoRestaurar({
  abierto,
  titulo,
  restaurando,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  titulo: string;
  restaurando: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  const cerrar = useCallback(() => {
    if (!restaurando) onCerrar();
  }, [restaurando, onCerrar]);

  useDialogoAccesible(abierto, cerrar);

  return (
    <Modal
      open={abierto}
      onClose={cerrar}
      size="sm"
      title={TEXTO.titulo}
      footer={
        <>
          <Button variant="ghost" onClick={cerrar} disabled={restaurando}>
            {TEXTO.cancelar}
          </Button>
          <Button variant="primary" onClick={onConfirmar} loading={restaurando}>
            {TEXTO.confirmar}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="font-ui text-13 text-text-2">{TEXTO.cuerpo(titulo)}</p>
        <p className="font-ui text-12 text-text-3">{TEXTO.detalle}</p>
      </div>
    </Modal>
  );
}

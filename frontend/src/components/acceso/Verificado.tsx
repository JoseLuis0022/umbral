import { Link } from 'react-router-dom';
import { PalomitaExito } from '../brand/PalomitaExito';
import { registro as copy } from '../../copy';

/** La confirmación con la palomita verde. Sin sesión, lleva a iniciar sesión. */
export function Verificado({ conSesion }: { conSesion: boolean }) {
  return (
    <div>
      <PalomitaExito />
      <h1 className="mt-6 font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.verificadoTitulo}</h1>
      <p className="mt-2 font-ui text-15 text-text-2">{conSesion ? copy.verificadoDetalle : copy.yaVerificadoDetalle}</p>
      {!conSesion && (
        <Link
          to="/login"
          className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-control bg-accent font-ui text-14 font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          {copy.entrar}
        </Link>
      )}
    </div>
  );
}

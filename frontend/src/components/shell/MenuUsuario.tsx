import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, Settings, User, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { springSnappy, dur } from '../../lib/motion';
import { useAuth } from '../../context/AuthContext';
import { perfil as copy, ajustes as copyAjustes } from '../../copy';

/**
 * Menú del avatar: identidad y sesión, nada más.
 *
 * Corpus y Auditoría VIVÍAN aquí y se mudaron al navbar (`NavAdmin`). Son
 * pantallas de trabajo diarias, y este menú es para lo que se toca una vez al
 * mes: quién eres y cómo sales.
 *
 * Ya no hay "Cambiar de perfil": con roles reales, el rol lo decide el backend
 * al iniciar sesión, y el navegador no puede cambiarlo.
 */
export function MenuUsuario() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { usuario, cerrarSesion } = useAuth();

  useEffect(() => {
    if (!abierto) return;
    function alPresionar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function alEscapar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', alPresionar);
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('mousedown', alPresionar);
      document.removeEventListener('keydown', alEscapar);
    };
  }, [abierto]);

  if (!usuario) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={`Menú de ${usuario.nombre}`}
        className="flex items-center gap-1.5 rounded-control py-1 pl-1 pr-1.5 transition-colors duration-150 hover:bg-accent-soft"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-12 font-semibold text-accent-fg">
          {usuario.iniciales}
        </span>
        <ChevronDown size={14} className={cn('hidden text-text-3 sm:block transition-transform duration-150 ease-umbral', abierto && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: dur.fast } }}
            transition={springSnappy}
            className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-tarjeta border border-hairline bg-surface-3 p-1.5 shadow-3"
          >
            <div className="border-b border-hairline px-2.5 pb-2.5 pt-1.5">
              <p className="truncate font-ui text-13 font-medium text-text-1">{usuario.nombre}</p>
              <p className="truncate font-ui text-12 text-text-3">{usuario.area}</p>
            </div>

            <div className="flex flex-col py-1.5">
              <ElementoMenu icono={User} onClick={() => { setAbierto(false); navigate('/perfil'); }}>
                {copy.titulo}
              </ElementoMenu>
              {/* Solo en teléfono: ahí la cabecera esconde su botón de Ajustes. */}
              <div className="md:hidden">
                <ElementoMenu icono={Settings} onClick={() => { setAbierto(false); navigate('/ajustes'); }}>
                  {copyAjustes.titulo}
                </ElementoMenu>
              </div>
            </div>

            <div className="border-t border-hairline pt-1.5">
              <ElementoMenu icono={LogOut} onClick={() => { setAbierto(false); cerrarSesion(); navigate('/login', { replace: true }); }}>
                {copy.cerrarSesion}
              </ElementoMenu>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ElementoMenu({
  icono: Icono,
  onClick,
  children,
}: {
  icono: LucideIcon;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left font-ui text-13 text-text-1 transition-colors duration-150 hover:bg-accent-soft"
    >
      <Icono size={16} className="shrink-0 text-text-2" />
      {children}
    </button>
  );
}

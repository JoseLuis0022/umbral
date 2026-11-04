import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  MessagesSquare,
  Newspaper,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { springSnappy, dur } from '../../lib/motion';
import { navegacion as copy } from '../../copy';

/**
 * Entradas de administración del navbar.
 *
 * Antes vivían dentro del menú del avatar, que es el peor sitio posible para
 * ellas: son PANTALLAS DE TRABAJO, no ajustes de cuenta. Quien administra
 * entra y sale de Corpus y Auditoría decenas de veces al día, y esconderlas
 * detrás de un avatar cobraba dos clics por cada viaje.
 *
 * Son cinco, así que no siempre caben. Por encima de `xl` se muestran todas;
 * por debajo se pliegan en un único botón "Más". No se recortan a las tres que
 * quepan: una navegación que cambia de contenido según el ancho obliga a
 * aprenderla dos veces.
 */

export interface EntradaAdmin {
  a: string;
  etiqueta: string;
  icono: LucideIcon;
}

export const ENTRADAS_ADMIN: EntradaAdmin[] = [
  { a: '/admin/tablero', etiqueta: copy.tablero, icono: LayoutDashboard },
  { a: '/admin/corpus', etiqueta: copy.corpus, icono: ShieldCheck },
  { a: '/admin/conversaciones', etiqueta: copy.auditoria, icono: MessagesSquare },
  { a: '/admin/al-dia', etiqueta: copy.boletines, icono: Newspaper },
  { a: '/admin/laboratorio', etiqueta: copy.laboratorio, icono: FlaskConical },
];

const CLASES_ENLACE =
  'whitespace-nowrap rounded-control px-2.5 py-1.5 font-ui text-14 font-medium transition-colors duration-150 sm:px-3';

export function NavAdmin() {
  return (
    <>
      {/* El filete separa dos mundos: usar la herramienta y administrarla. Sin
          él, "Al día" y "Tablero" se leen como hermanos y no lo son. */}
      <span aria-hidden className="mx-1 hidden h-5 w-px shrink-0 bg-hairlineStrong xl:block" />

      <div className="hidden items-center gap-1 xl:flex">
        {ENTRADAS_ADMIN.map((entrada) => (
          <NavLink
            key={entrada.a}
            to={entrada.a}
            className={({ isActive }) =>
              cn(
                CLASES_ENLACE,
                isActive
                  ? 'bg-accent-soft text-accent-fg'
                  : 'text-text-2 hover:bg-accent-soft hover:text-text-1'
              )
            }
          >
            {entrada.etiqueta}
          </NavLink>
        ))}
      </div>

      <MenuPlegado />
    </>
  );
}

/** Las mismas cinco entradas, en un desplegable, cuando no caben en línea. */
function MenuPlegado() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Cambiar de pantalla cierra el menú. Sin esto queda abierto sobre la
  // pantalla nueva, tapándola.
  useEffect(() => setAbierto(false), [pathname]);

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

  const enAdministracion = ENTRADAS_ADMIN.some((e) => pathname.startsWith(e.a));

  return (
    <div className="relative xl:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className={cn(
          CLASES_ENLACE,
          'flex items-center gap-1',
          // El botón se marca como activo cuando la pantalla abierta está
          // dentro: si no, administrando no habría NINGUNA pestaña encendida.
          enAdministracion
            ? 'bg-accent-soft text-accent-fg'
            : 'text-text-2 hover:bg-accent-soft hover:text-text-1'
        )}
      >
        {copy.mas}
        <ChevronDown size={13} className={cn('transition-transform', abierto && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: dur.fast } }}
            transition={springSnappy}
            // En teléfono el botón queda a media barra: anclado a él, el menú
            // se saldría por un borde u otro. Ahí se fija bajo la cabecera con
            // el mismo margen lateral que el contenido.
            className="fixed inset-x-4 top-16 z-50 mt-1.5 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:w-60 rounded-tarjeta border border-hairline bg-surface-3 p-1.5 shadow-3"
          >
            <p className="px-2.5 pb-1 pt-1 font-ui text-12 text-text-3">{copy.administracion}</p>
            {ENTRADAS_ADMIN.map(({ a, etiqueta, icono: Icono }) => {
              const activa = pathname.startsWith(a);
              return (
                <button
                  key={a}
                  type="button"
                  role="menuitem"
                  onClick={() => navigate(a)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left font-ui text-13 transition-colors duration-150',
                    activa ? 'bg-accent-soft text-accent-fg' : 'text-text-1 hover:bg-accent-soft'
                  )}
                >
                  <Icono size={16} className={cn('shrink-0', activa ? 'text-accent-fg' : 'text-text-2')} />
                  {etiqueta}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

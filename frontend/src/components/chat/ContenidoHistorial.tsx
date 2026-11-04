import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Conversacion } from '../../types';
import { cn } from '../../lib/cn';
import { esSoloLectura, grupoDeFecha, haceCuanto, type GrupoHistorial } from '../../lib/fechas';
import { springSnappy, dur, ease } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Button, EmptyState, Field, Input, Modal, Skeleton } from '../ui';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';

const ORDEN: GrupoHistorial[] = ['hoy', 'ayer', 'semana', 'anteriores'];

type Props = {
  conversaciones: Conversacion[];
  cargando: boolean;
  activaId: string | null;
  ahora: number;
  onAbrir: (id: string) => void;
  onNueva: () => void;
  onRenombrar: (id: string, titulo: string) => void;
  onEliminar: (id: string) => void;
  /** El cajón móvil ya tiene su propio encabezado; el panel de escritorio no. */
  conEncabezado?: boolean;
};

/*
 * `memo`: el historial cuelga de la misma pantalla que el hilo, y esa pantalla
 * se vuelve a renderizar una vez por frame mientras llega texto por streaming.
 * Nada de lo que ve esta lista cambia durante una transmisión, así que sin la
 * comparación de props se reagrupaba y se repintaba la lista entera 60 veces
 * por segundo para dibujar exactamente lo mismo.
 */
export const ContenidoHistorial = memo(function ContenidoHistorial({
  conversaciones,
  cargando,
  activaId,
  ahora,
  onAbrir,
  onNueva,
  onRenombrar,
  onEliminar,
  conEncabezado = true,
}: Props) {
  const [menuDe, setMenuDe] = useState<{ conv: Conversacion; x: number; y: number } | null>(null);
  const [renombrando, setRenombrando] = useState<Conversacion | null>(null);
  const [eliminando, setEliminando] = useState<Conversacion | null>(null);
  const [nombre, setNombre] = useState('');

  // `new Date(ahora)` se construye UNA vez, no una por conversación y grupo:
  // la versión anterior creaba 4 × N objetos Date en cada render.
  const grupos = useMemo(() => {
    const referencia = new Date(ahora);
    return ORDEN.map((clave) => ({
      clave,
      items: conversaciones.filter((c) => grupoDeFecha(c.ultimoMensajeEn, referencia) === clave),
    })).filter((g) => g.items.length > 0);
  }, [conversaciones, ahora]);

  function abrirMenu(conv: Conversacion, boton: HTMLElement) {
    const caja = boton.getBoundingClientRect();
    setMenuDe({ conv, x: caja.right, y: caja.bottom + 6 });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {conEncabezado && (
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
          <h2 className="px-1 font-ui text-13 font-semibold text-text-2">{copy.historialTitulo}</h2>
        </div>
      )}

      <div className={cn('px-3', conEncabezado ? 'pb-3' : 'pb-3 pt-1')}>
        <Button variant="secondary" size="sm" className="w-full justify-start" onClick={onNueva}>
          <Plus size={14} /> {copy.nuevaSesion}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {cargando ? (
          <EsqueletoHistorial />
        ) : conversaciones.length === 0 ? (
          <EmptyState
            title={copy.historialVacio}
            action={
              <Button variant="secondary" size="sm" onClick={onNueva}>
                <Plus size={14} /> {copy.nuevaSesion}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {grupos.map((grupo) => (
              <section key={grupo.clave}>
                <h3 className="px-2 pb-1 font-ui text-12 font-semibold uppercase tracking-wide text-text-3">
                  {copy.grupos[grupo.clave]}
                </h3>
                <ul className="flex flex-col">
                  {grupo.items.map((conv) => (
                    <FilaConversacion
                      key={conv.id}
                      conv={conv}
                      activa={conv.id === activaId}
                      cerrada={esSoloLectura(conv.ultimoMensajeEn, ahora)}
                      ahora={ahora}
                      onAbrir={() => onAbrir(conv.id)}
                      onMenu={(boton) => abrirMenu(conv, boton)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <MenuFila
        estado={menuDe}
        onCerrar={() => setMenuDe(null)}
        onRenombrar={(conv) => {
          setNombre(conv.titulo);
          setRenombrando(conv);
          setMenuDe(null);
        }}
        onEliminar={(conv) => {
          setEliminando(conv);
          setMenuDe(null);
        }}
      />

      <Modal
        open={!!renombrando}
        onClose={() => setRenombrando(null)}
        title={copyLocal.renombrarTitulo}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRenombrando(null)}>
              {copyLocal.cancelar}
            </Button>
            <Button
              size="sm"
              disabled={!nombre.trim()}
              onClick={() => {
                if (renombrando) onRenombrar(renombrando.id, nombre);
                setRenombrando(null);
              }}
            >
              {copyLocal.guardarNombre}
            </Button>
          </>
        }
      >
        <Field label={copyLocal.renombrarCampo}>
          <Input
            autoFocus
            value={nombre}
            maxLength={80}
            placeholder={copyLocal.renombrarPlaceholder}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nombre.trim() && renombrando) {
                onRenombrar(renombrando.id, nombre);
                setRenombrando(null);
              }
            }}
          />
        </Field>
      </Modal>

      <Modal
        open={!!eliminando}
        onClose={() => setEliminando(null)}
        title={copyLocal.eliminarTitulo}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEliminando(null)}>
              {copyLocal.cancelar}
            </Button>
            {/* Destructivo con --status-red, nunca con el color de marca. */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (eliminando) onEliminar(eliminando.id);
                setEliminando(null);
              }}
            >
              {copyLocal.eliminarConfirmar}
            </Button>
          </>
        }
      >
        <p className="font-ui text-14 text-text-2">
          {eliminando ? copyLocal.eliminarDetalle(eliminando.titulo) : ''}
        </p>
      </Modal>
    </div>
  );
});

function FilaConversacion({
  conv,
  activa,
  cerrada,
  ahora,
  onAbrir,
  onMenu,
}: {
  conv: Conversacion;
  activa: boolean;
  cerrada: boolean;
  ahora: number;
  onAbrir: () => void;
  onMenu: (boton: HTMLElement) => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onAbrir}
        aria-current={activa ? 'true' : undefined}
        className={cn(
          'flex min-h-[44px] w-full items-center gap-2 rounded-celda py-2 pl-2.5 pr-9 text-left transition-colors duration-150',
          activa ? 'bg-accent-soft' : 'hover:bg-bg'
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'truncate font-ui text-14',
              activa ? 'font-medium text-accent-fg' : 'text-text-1'
            )}
          >
            {conv.titulo}
          </span>
          <span className="truncate font-ui text-12 text-text-3">{haceCuanto(conv.ultimoMensajeEn, ahora)}</span>
        </span>
        {/* Indicador discreto de solo lectura: el candado no compite con el
            título, y el `title` da la explicación a quien la busque. */}
        {cerrada && (
          <Lock
            size={12}
            strokeWidth={2}
            aria-hidden
            className="shrink-0 text-text-3"
          />
        )}
        {cerrada && <span className="sr-only">{copyLocal.soloLecturaEtiqueta}</span>}
      </button>

      <button
        type="button"
        aria-label={copyLocal.opcionesConversacion}
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e.currentTarget);
        }}
        className={cn(
          'absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-celda text-text-3',
          'transition-colors duration-150 hover:bg-surface-1 hover:text-text-1',
          // En escritorio aparece al pasar el cursor; en táctil no hay hover,
          // así que ahí vive visible desde el principio.
          'lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 lg:focus-visible:opacity-100'
        )}
      >
        <MoreHorizontal size={16} />
      </button>
    </li>
  );
}

function MenuFila({
  estado,
  onCerrar,
  onRenombrar,
  onEliminar,
}: {
  estado: { conv: Conversacion; x: number; y: number } | null;
  onCerrar: () => void;
  onRenombrar: (conv: Conversacion) => void;
  onEliminar: (conv: Conversacion) => void;
}) {
  const reducido = useReducedMotion();
  const menu = useRef<HTMLDivElement>(null);
  const [ajuste, setAjuste] = useState(0);

  // El menú va en un portal porque el panel lateral tiene overflow-y-auto y un
  // popover absoluto dentro se recortaría contra el borde del panel.
  useLayoutEffect(() => {
    if (!estado || !menu.current) return;
    const caja = menu.current.getBoundingClientRect();
    const sobrante = caja.bottom - (window.innerHeight - 8);
    setAjuste(sobrante > 0 ? -sobrante : 0);
  }, [estado]);

  useEffect(() => {
    if (!estado) return;
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclado);
    window.addEventListener('resize', onCerrar);
    window.addEventListener('scroll', onCerrar, true);
    return () => {
      window.removeEventListener('keydown', alTeclado);
      window.removeEventListener('resize', onCerrar);
      window.removeEventListener('scroll', onCerrar, true);
    };
  }, [estado, onCerrar]);

  if (typeof document === 'undefined') return null;

  // z-1250: por encima del cajón móvil (z-1200). En móvil este menú se abre
  // DENTRO del Drawer, y con una z menor quedaría detrás de él.
  return createPortal(
    <AnimatePresence>
      {estado && (
        <div className="fixed inset-0 z-[1250]">
          <div className="absolute inset-0" onClick={onCerrar} aria-hidden />
          <motion.div
            ref={menu}
            role="menu"
            aria-label={copyLocal.opcionesConversacion}
            initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
            transition={springSnappy}
            style={{ top: estado.y + ajuste, left: estado.x, transformOrigin: 'top right' }}
            className="absolute w-52 -translate-x-full overflow-hidden rounded-tarjeta border border-hairline bg-surface-3 p-1 shadow-3"
          >
            <OpcionMenu icono={Pencil} onClick={() => onRenombrar(estado.conv)}>
              {copy.renombrar}
            </OpcionMenu>
            <OpcionMenu icono={Trash2} peligro onClick={() => onEliminar(estado.conv)}>
              {copy.eliminar}
            </OpcionMenu>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function OpcionMenu({
  icono: Icono,
  peligro,
  onClick,
  children,
}: {
  icono: typeof Pencil;
  peligro?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] w-full items-center gap-2.5 rounded-celda px-3 font-ui text-14 transition-colors duration-150 md:min-h-[36px]',
        peligro ? 'text-status-red hover:bg-status-red-soft' : 'text-text-1 hover:bg-accent-soft'
      )}
    >
      <Icono size={15} strokeWidth={2} />
      {children}
    </button>
  );
}

/** Altura real de una fila (44 px) para que la lista no brinque al cargar. */
function EsqueletoHistorial() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[3, 2, 4].map((cuantas, grupo) => (
        <div key={grupo} className="flex flex-col gap-1">
          <Skeleton className="mb-1 ml-2 h-3 w-20" />
          {Array.from({ length: cuantas }).map((_, i) => (
            <Skeleton key={i} className="h-[44px] w-full rounded-celda" />
          ))}
        </div>
      ))}
    </div>
  );
}

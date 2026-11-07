import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Archive, ArchiveRestore, ChevronRight, Loader2, MailOpen, Mail, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import type { Conversacion } from '../../types';
import { cn } from '../../lib/cn';
import { grupoDeFecha, haceCuanto, type GrupoHistorial } from '../../lib/fechas';
import { salidaPanel, springLayout, springPanel, dur } from '../../lib/motion';
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
  /** Fijar, archivar o marcar como (no) leída. */
  onMarcar: (id: string, cambios: Partial<Pick<Conversacion, 'fijada' | 'archivada' | 'noLeida'>>) => void;
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
  onMarcar,
  conEncabezado = true,
}: Props) {
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [menuDe, setMenuDe] = useState<{ conv: Conversacion; x: number; y: number } | null>(null);
  const [renombrando, setRenombrando] = useState<Conversacion | null>(null);
  const [eliminando, setEliminando] = useState<Conversacion | null>(null);
  const [nombre, setNombre] = useState('');

  // `new Date(ahora)` se construye UNA vez, no una por conversación y grupo:
  // la versión anterior creaba 4 × N objetos Date en cada render.
  const grupos = useMemo(() => {
    const referencia = new Date(ahora);
    // Fijadas arriba; luego por fecha; las archivadas, aparte y plegadas.
    const visibles = conversaciones.filter((c) => !c.archivada && !c.fijada);
    const porFecha = ORDEN.map((clave) => ({
      clave: clave as string,
      titulo: copy.grupos[clave],
      items: visibles.filter((c) => grupoDeFecha(c.ultimoMensajeEn, referencia) === clave),
    }));
    return [{ clave: 'fijadas', titulo: copy.grupoFijadas, items: conversaciones.filter((c) => c.fijada && !c.archivada) }, ...porFecha].filter(
      (g) => g.items.length > 0
    );
  }, [conversaciones, ahora]);
  const archivadas = useMemo(() => conversaciones.filter((c) => c.archivada), [conversaciones]);

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
          // `LayoutGroup` con id: el panel de escritorio y el cajón móvil montan
          // dos copias de esta lista, y sin espacio de nombres el tinte de la
          // fila activa saltaría de una a otra.
          <LayoutGroup id={conEncabezado ? 'historial-panel' : 'historial-cajon'}>
          <div className="flex flex-col gap-5">
            {grupos.map((grupo) => (
              <section key={grupo.clave}>
                <h3 className="flex items-center gap-1.5 px-2.5 pb-1 font-ui text-12 font-medium text-text-3">
                  {grupo.clave === 'fijadas' && <Pin size={11} strokeWidth={2.25} aria-hidden />}
                  {grupo.titulo}
                </h3>
                <ul className="flex flex-col">
                  {grupo.items.map((conv) => (
                    <FilaConversacion
                      key={conv.id}
                      conv={conv}
                      activa={conv.id === activaId}
                      ahora={ahora}
                      onAbrir={() => onAbrir(conv.id)}
                      onMenu={(boton) => abrirMenu(conv, boton)}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {archivadas.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setVerArchivadas((v) => !v)}
                  aria-expanded={verArchivadas}
                  className="flex w-full items-center gap-1 rounded-xs px-2.5 pb-1 font-ui text-12 font-medium text-text-3 outline-none transition-colors hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ChevronRight size={12} aria-hidden className={cn('transition-transform duration-150', verArchivadas && 'rotate-90')} />
                  {copy.grupoArchivadas(archivadas.length)}
                </button>
                {verArchivadas && (
                  <ul className="flex flex-col opacity-80">
                    {archivadas.map((conv) => (
                      <FilaConversacion
                        key={conv.id}
                        conv={conv}
                        activa={conv.id === activaId}
                        ahora={ahora}
                        onAbrir={() => onAbrir(conv.id)}
                        onMenu={(boton) => abrirMenu(conv, boton)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
          </LayoutGroup>
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
        onMarcar={(conv, cambios) => {
          onMarcar(conv.id, cambios);
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
  ahora,
  onAbrir,
  onMenu,
}: {
  conv: Conversacion;
  activa: boolean;
  ahora: number;
  onAbrir: () => void;
  onMenu: (boton: HTMLElement) => void;
}) {
  const reducido = useReducedMotion();
  return (
    <li className="group relative">
      {/* La fila activa se marca con un tinte neutro que VIAJA de fila en
          fila (`layoutId`), no con azul: el azul de marca es para acciones. */}
      {activa && (
        <motion.span
          layoutId={reducido ? undefined : 'historial-activa'}
          transition={springLayout}
          aria-hidden
          className="absolute inset-0 rounded-celda bg-tinta/[.06]"
        />
      )}
      <button
        type="button"
        onClick={onAbrir}
        aria-current={activa ? 'true' : undefined}
        // Una línea por fila (36 px): la antigüedad pasa al `title`. Con dos
        // renglones la lista se leía como una tabla, no como un índice.
        title={`${conv.titulo}, ${haceCuanto(conv.ultimoMensajeEn, ahora)}`}
        className={cn(
          'relative flex h-11 w-full items-center gap-2 rounded-celda pl-2.5 pr-9 text-left transition-colors duration-[120ms] lg:h-9',
          !activa && 'hover:bg-tinta/[.04]'
        )}
      >
        {conv.noLeida && !activa && (
          <span aria-label={copy.noLeida} title={copy.noLeida} className="h-2 w-2 shrink-0 rounded-full bg-accent" />
        )}
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-ui text-14',
            activa || conv.noLeida ? 'font-medium text-text-1' : 'text-text-2 group-hover:text-text-1'
          )}
        >
          {conv.titulo}
        </span>
        {/* Trabaja en el servidor aunque no la estés viendo. */}
        {conv.trabajoPendiente && (
          <Loader2
            size={13}
            strokeWidth={2.5}
            aria-label={copy.trabajando}
            className="shrink-0 animate-spin text-accent-fg motion-reduce:animate-none"
          />
        )}
        <span className="sr-only">{haceCuanto(conv.ultimoMensajeEn, ahora)}</span>
      </button>

      <button
        type="button"
        aria-label={copyLocal.opcionesConversacion}
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e.currentTarget);
        }}
        className={cn(
          'absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xs text-text-3',
          'transition-colors duration-[120ms] hover:bg-tinta/[.06] hover:text-text-1',
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
  onMarcar,
}: {
  estado: { conv: Conversacion; x: number; y: number } | null;
  onCerrar: () => void;
  onRenombrar: (conv: Conversacion) => void;
  onEliminar: (conv: Conversacion) => void;
  onMarcar: (conv: Conversacion, cambios: Partial<Pick<Conversacion, 'fijada' | 'archivada' | 'noLeida'>>) => void;
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
    const conv = estado.conv;
    // Atajos de una letra con el menú abierto, como en Claude (se ven a la derecha de cada opción).
    const acciones: Record<string, () => void> = {
      u: () => onMarcar(conv, { noLeida: conv.noLeida ? undefined : true }),
      p: () => onMarcar(conv, { fijada: conv.fijada ? undefined : true }),
      r: () => onRenombrar(conv),
      a: () => onMarcar(conv, { archivada: conv.archivada ? undefined : true }),
      d: () => onEliminar(conv),
    };
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCerrar();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const accion = acciones[e.key.toLowerCase()];
      if (accion) {
        e.preventDefault();
        accion();
      }
    };
    window.addEventListener('keydown', alTeclado);
    window.addEventListener('resize', onCerrar);
    window.addEventListener('scroll', onCerrar, true);
    return () => {
      window.removeEventListener('keydown', alTeclado);
      window.removeEventListener('resize', onCerrar);
      window.removeEventListener('scroll', onCerrar, true);
    };
  }, [estado, onCerrar, onEliminar, onMarcar, onRenombrar]);

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
            initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, transition: salidaPanel }}
            transition={reducido ? { duration: dur.fast } : springPanel}
            style={{ top: estado.y + ajuste, left: estado.x, transformOrigin: 'top right' }}
            className="absolute w-60 -translate-x-full overflow-hidden rounded-menu bg-surface-3 p-1.5 shadow-menu"
          >
            <OpcionMenu
              icono={estado.conv.noLeida ? MailOpen : Mail}
              atajo="U"
              onClick={() => onMarcar(estado.conv, { noLeida: estado.conv.noLeida ? undefined : true })}
            >
              {estado.conv.noLeida ? copy.marcarLeida : copy.marcarNoLeida}
            </OpcionMenu>
            <div aria-hidden className="mx-2 my-1 h-px bg-tinta/[.07]" />
            <OpcionMenu
              icono={estado.conv.fijada ? PinOff : Pin}
              atajo="P"
              onClick={() => onMarcar(estado.conv, { fijada: estado.conv.fijada ? undefined : true })}
            >
              {estado.conv.fijada ? copy.desfijar : copy.fijar}
            </OpcionMenu>
            <OpcionMenu icono={Pencil} atajo="R" onClick={() => onRenombrar(estado.conv)}>
              {copy.renombrar}
            </OpcionMenu>
            <div aria-hidden className="mx-2 my-1 h-px bg-tinta/[.07]" />
            <OpcionMenu
              icono={estado.conv.archivada ? ArchiveRestore : Archive}
              atajo="A"
              onClick={() => onMarcar(estado.conv, { archivada: estado.conv.archivada ? undefined : true })}
            >
              {estado.conv.archivada ? copy.desarchivar : copy.archivar}
            </OpcionMenu>
            <OpcionMenu icono={Trash2} atajo="D" peligro onClick={() => onEliminar(estado.conv)}>
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
  atajo,
  onClick,
  children,
}: {
  icono: typeof Pencil;
  peligro?: boolean;
  /** Tecla que la ejecuta con el menú abierto. */
  atajo?: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] w-full items-center gap-2.5 rounded-celda px-2.5 font-ui text-14 transition-colors duration-[120ms] md:min-h-8',
        peligro ? 'text-status-red hover:bg-status-red-soft' : 'text-text-1 hover:bg-tinta/[.05]'
      )}
    >
      <Icono size={15} strokeWidth={2} />
      <span className="flex-1 text-left">{children}</span>
      {atajo && (
        <kbd aria-hidden className="font-ui text-12 text-text-3">
          {atajo}
        </kbd>
      )}
    </button>
  );
}

/** Altura real de una fila (44 px en táctil, 36 px en escritorio) para que la lista no brinque al cargar. */
function EsqueletoHistorial() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[3, 2, 4].map((cuantas, grupo) => (
        <div key={grupo} className="flex flex-col gap-1">
          <Skeleton className="mb-1 ml-2 h-3 w-20" />
          {Array.from({ length: cuantas }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-celda lg:h-9" />
          ))}
        </div>
      ))}
    </div>
  );
}

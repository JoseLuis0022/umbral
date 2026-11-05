import { memo, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ModeloDisponible } from '../../types';
import { PREDETERMINADO, type AjusteModelo, type EsfuerzoElegido } from '../../lib/ajusteModelo';
import { agruparModelos, nombreCorto, type ModeloMenu } from '../../lib/modelos';
import { cn } from '../../lib/cn';
import { dur, ease, salidaPanel, springLayout, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { PanelAnclado, Z_MENU_ANCLADO, useEsCompacto } from '../ui';
import { copyLocal } from './copyLocal';

/**
 * Selector combinado de modelo y esfuerzo, al estilo de Claude Code desktop
 * (docs/especificacion-diseno.md §5).
 *
 * UN solo disparador con la tipografía de la barra ("Opus 5.5 · Medio") y un
 * menú con los modelos principales —check y atajo numérico—, "Esfuerzo ›" y
 * "Más modelos ›" como submenús. Sin ids técnicos: a lo más, un `title`.
 *
 * POR QUÉ RADIX (`@radix-ui/react-dropdown-menu`, MIT): lo difícil de un menú
 * con submenús no es pintarlo, es el comportamiento —roving tabindex, búsqueda
 * por letra, foco de vuelta al disparador, colisión con los bordes de la
 * ventana y, sobre todo, el triángulo de seguridad para cruzar en diagonal
 * hacia el submenú sin que se cierre—. `menuAnclado` resuelve una superficie
 * sin submenús; extenderlo era reescribir Radix a mano. Radix no trae estilos:
 * todo lo visual sale de los tokens, y la animación sigue siendo Framer.
 *
 * En móvil no hay sitio para un submenú al lado: el menú es una hoja inferior
 * y los submenús, páginas que se deslizan dentro de ella.
 */

const ESFUERZOS: { valor: EsfuerzoElegido; texto: string }[] = [
  { valor: PREDETERMINADO, texto: copyLocal.automatico },
  { valor: 'low', texto: copyLocal.esfuerzoBajo },
  { valor: 'medium', texto: copyLocal.esfuerzoMedio },
  { valor: 'high', texto: copyLocal.esfuerzoAlto },
  { valor: 'xhigh', texto: copyLocal.esfuerzoMuyAlto },
  { valor: 'max', texto: copyLocal.esfuerzoMaximo },
];

const textoEsfuerzo = (valor: EsfuerzoElegido) => ESFUERZOS.find((e) => e.valor === valor)?.texto ?? copyLocal.automatico;

type Props = {
  modelos: ModeloDisponible[];
  ajuste: AjusteModelo;
  onCambiar: (cambio: Partial<AjusteModelo>) => void;
};

export const MenuModelo = memo(function MenuModelo({ modelos, ajuste, onCambiar }: Props) {
  const compacto = useEsCompacto();
  const { principales, mas } = useMemo(() => agruparModelos(modelos), [modelos]);

  const nombreModelo = ajuste.modelo === PREDETERMINADO ? copyLocal.automatico : nombreCorto(ajuste.modelo, modelos);
  const nombreEsfuerzo = textoEsfuerzo(ajuste.esfuerzo);
  const etiqueta = copyLocal.modeloYEsfuerzo(nombreModelo, nombreEsfuerzo);

  const datos = { principales, mas, ajuste, onCambiar, nombreModelo, nombreEsfuerzo, etiqueta };
  return compacto ? <HojaModelo {...datos} /> : <MenuEscritorio {...datos} />;
});

type Datos = {
  principales: ModeloMenu[];
  mas: ModeloMenu[];
  ajuste: AjusteModelo;
  onCambiar: (cambio: Partial<AjusteModelo>) => void;
  nombreModelo: string;
  nombreEsfuerzo: string;
  etiqueta: string;
};

/** El disparador: modelo en text-1, esfuerzo en text-3, chevron de 12 px. Fundido cruzado al cambiar. */
const Disparador = motion.button;

function ContenidoDisparador({ nombreModelo, nombreEsfuerzo }: { nombreModelo: string; nombreEsfuerzo: string }) {
  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${nombreModelo}|${nombreEsfuerzo}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.fast, ease }}
          className="min-w-0 truncate"
        >
          <span className="text-text-1">{nombreModelo}</span>
          {/* El esfuerzo solo se nombra cuando se eligió uno: "Automático ·
              Automático" se leía como un error de la interfaz. */}
          {ajuste.esfuerzo !== PREDETERMINADO && <span className="text-text-3"> · {nombreEsfuerzo}</span>}
        </motion.span>
      </AnimatePresence>
      <ChevronDown size={12} strokeWidth={2.25} className="shrink-0 text-text-3" aria-hidden />
    </>
  );
}

const CLASE_DISPARADOR =
  'inline-flex h-8 min-w-0 max-w-[220px] items-center gap-1 rounded-celda px-2.5 font-ui text-13 font-medium outline-none transition-colors duration-[120ms] hover:bg-tinta/[.05] focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-tinta/[.05]';

/* ───────────────────────────────── Escritorio ───────────────────────────────── */

const CLASE_FILA =
  'relative flex h-8 cursor-default select-none items-center gap-2 rounded-celda px-2.5 font-ui text-14 text-text-1 outline-none transition-colors duration-[120ms] data-[highlighted]:bg-tinta/[.05] data-[state=open]:bg-tinta/[.05] data-[disabled]:text-text-3';

function MenuEscritorio({ principales, mas, ajuste, onCambiar, nombreModelo, nombreEsfuerzo, etiqueta }: Datos) {
  const [abierto, setAbierto] = useState(false);
  const [sub, setSub] = useState<'esfuerzo' | 'mas' | null>(null);
  const reducido = useReducedMotion();

  // Atajos: 1 = Automático, 2… = los principales en orden. Eligen y cierran.
  const atajos = [PREDETERMINADO, ...principales.map((p) => p.id)];
  function alTeclado(e: KeyboardEvent) {
    if (sub || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > atajos.length) return;
    e.preventDefault();
    onCambiar({ modelo: atajos[n - 1] });
    setAbierto(false);
  }

  const animacion = reducido
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: salidaPanel }, transition: { duration: dur.fast } }
    : {
        initial: { opacity: 0, scale: 0.97, y: 4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 4, transition: salidaPanel },
        transition: springPanel,
      };

  return (
    <Menu.Root
      open={abierto}
      onOpenChange={(a) => {
        setAbierto(a);
        if (!a) setSub(null);
      }}
      modal={false}
    >
      <Menu.Trigger asChild>
        <Disparador type="button" layout="size" transition={springLayout} aria-label={etiqueta} title={etiqueta} className={CLASE_DISPARADOR}>
          <ContenidoDisparador nombreModelo={nombreModelo} nombreEsfuerzo={nombreEsfuerzo} />
        </Disparador>
      </Menu.Trigger>

      {/* AnimatePresence va POR FUERA del portal: dentro, el `Presence` de
          Radix le pasaría un `ref` que un componente de función no acepta. */}
      <AnimatePresence>
        {abierto && (
          <Menu.Portal forceMount>
            <Menu.Content
              forceMount
              asChild
              side="top"
              align="end"
              sideOffset={8}
              collisionPadding={8}
              loop
              onKeyDown={alTeclado}
              style={{ zIndex: Z_MENU_ANCLADO }}
            >
              <motion.div
                {...animacion}
                style={{ transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)' }}
                className="w-[260px] rounded-menu bg-surface-3 p-1.5 shadow-menu outline-none"
              >
                <Menu.RadioGroup value={ajuste.modelo} onValueChange={(modelo) => onCambiar({ modelo })}>
                  <FilaRadio valor={PREDETERMINADO} texto={copyLocal.automatico} atajo={1} grupo="principal" />
                  {principales.map((m, i) => (
                    <FilaRadio key={m.id} valor={m.id} texto={m.nombre} atajo={i + 2} grupo="principal" />
                  ))}
                </Menu.RadioGroup>

                <Menu.Separator className="mx-1 my-1.5 h-px bg-tinta/[.07]" />

                <Menu.Sub open={sub === 'esfuerzo'} onOpenChange={(a) => setSub(a ? 'esfuerzo' : null)}>
                  <Menu.SubTrigger className={CLASE_FILA}>
                    <span className="flex-1">{copyLocal.esfuerzoEtiqueta}</span>
                    <span className="text-13 text-text-3">{nombreEsfuerzo}</span>
                    <ChevronRight size={14} strokeWidth={2} className="text-text-3" aria-hidden />
                  </Menu.SubTrigger>
                  <Submenu abierto={sub === 'esfuerzo'}>
                    <Menu.RadioGroup
                      value={ajuste.esfuerzo}
                      onValueChange={(v) => onCambiar({ esfuerzo: v as EsfuerzoElegido })}
                    >
                      {ESFUERZOS.map((e) => (
                        <FilaRadio key={e.valor} valor={e.valor} texto={e.texto} grupo="esfuerzo" />
                      ))}
                    </Menu.RadioGroup>
                  </Submenu>
                </Menu.Sub>

                {mas.length > 0 && (
                  <Menu.Sub open={sub === 'mas'} onOpenChange={(a) => setSub(a ? 'mas' : null)}>
                    <Menu.SubTrigger className={CLASE_FILA}>
                      <span className="flex-1">{copyLocal.masModelos}</span>
                      <ChevronRight size={14} strokeWidth={2} className="text-text-3" aria-hidden />
                    </Menu.SubTrigger>
                    <Submenu abierto={sub === 'mas'}>
                      <Menu.RadioGroup value={ajuste.modelo} onValueChange={(modelo) => onCambiar({ modelo })}>
                        {mas.map((m) => (
                          <FilaRadio key={m.id} valor={m.id} texto={m.nombre} titulo={m.id} grupo="mas" />
                        ))}
                      </Menu.RadioGroup>
                    </Submenu>
                  </Menu.Sub>
                )}
              </motion.div>
            </Menu.Content>
          </Menu.Portal>
        )}
      </AnimatePresence>
    </Menu.Root>
  );
}

/** Submenú: se abre a la derecha (o a la izquierda si no cabe) montado 4 px sobre el menú. */
function Submenu({ abierto, children }: { abierto: boolean; children: ReactNode }) {
  const reducido = useReducedMotion();
  return (
    <AnimatePresence>
      {abierto && (
        <Menu.Portal forceMount>
          <Menu.SubContent forceMount asChild sideOffset={-4} alignOffset={-6} collisionPadding={8} style={{ zIndex: Z_MENU_ANCLADO }}>
            <motion.div
              initial={reducido ? { opacity: 0 } : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={reducido ? { duration: dur.fast } : springPanel}
              className="max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] w-[220px] overflow-y-auto rounded-menu bg-surface-3 p-1.5 shadow-menu outline-none"
            >
              {children}
            </motion.div>
          </Menu.SubContent>
        </Menu.Portal>
      )}
    </AnimatePresence>
  );
}

function FilaRadio({
  valor,
  texto,
  atajo,
  titulo,
  grupo,
}: {
  valor: string;
  texto: string;
  atajo?: number;
  /** El id técnico solo como `title`, para distinguir dos versiones con el mismo nombre. */
  titulo?: string;
  /** El check viaja con `layoutId` dentro de su grupo. */
  grupo: string;
}) {
  return (
    <Menu.RadioItem value={valor} textValue={texto} title={titulo} className={CLASE_FILA}>
      <span className="min-w-0 flex-1 truncate">{texto}</span>
      <span className="flex w-3.5 shrink-0 justify-center">
        <Menu.ItemIndicator asChild>
          <motion.span layoutId={`check-${grupo}`} transition={springLayout} className="flex text-accent-fg">
            <Check size={14} strokeWidth={2.5} aria-hidden />
          </motion.span>
        </Menu.ItemIndicator>
      </span>
      {atajo !== undefined && (
        <span className="w-3 shrink-0 text-right font-ui text-12 tabular-nums text-text-3" aria-hidden>
          {atajo}
        </span>
      )}
    </Menu.RadioItem>
  );
}

/* ─────────────────────────────────── Móvil ─────────────────────────────────── */

type Pagina = 'principal' | 'esfuerzo' | 'mas';

function HojaModelo({ principales, mas, ajuste, onCambiar, nombreModelo, nombreEsfuerzo, etiqueta }: Datos) {
  const [abierto, setAbierto] = useState(false);
  const [pagina, setPagina] = useState<Pagina>('principal');
  const disparador = useRef<HTMLButtonElement>(null);
  const reducido = useReducedMotion();

  const cerrar = () => {
    setAbierto(false);
    setPagina('principal');
    disparador.current?.focus();
  };
  const elegir = (cambio: Partial<AjusteModelo>) => {
    onCambiar(cambio);
    cerrar();
  };

  // Las páginas se deslizan: hacia la izquierda al entrar a un submenú, de
  // vuelta al salir.
  const haciaDentro = pagina !== 'principal';
  const anim = reducido
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: haciaDentro ? 24 : -24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: haciaDentro ? -24 : 24 },
      };

  return (
    <>
      <button
        ref={disparador}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={etiqueta}
        onClick={() => setAbierto((a) => !a)}
        data-state={abierto ? 'open' : 'closed'}
        className={CLASE_DISPARADOR}
      >
        <ContenidoDisparador nombreModelo={nombreModelo} nombreEsfuerzo={nombreEsfuerzo} />
      </button>

      <PanelAnclado abierto={abierto} cerrar={cerrar} disparadorRef={disparador} tituloHoja={copyLocal.modeloEtiqueta}>
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pagina}
              {...anim}
              transition={reducido ? { duration: dur.fast } : springPanel}
              role="menu"
              aria-label={pagina === 'esfuerzo' ? copyLocal.esfuerzoEtiqueta : copyLocal.modeloEtiqueta}
              className="flex max-h-[60vh] flex-col overflow-y-auto p-2"
            >
              {pagina !== 'principal' && (
                <button
                  type="button"
                  onClick={() => setPagina('principal')}
                  className="flex h-11 items-center gap-1.5 rounded-celda px-2 font-ui text-14 font-medium text-text-2"
                >
                  <ChevronLeft size={16} aria-hidden /> {copyLocal.volver}
                </button>
              )}

              {pagina === 'principal' && (
                <>
                  <FilaHoja texto={copyLocal.automatico} activa={ajuste.modelo === PREDETERMINADO} onClick={() => elegir({ modelo: PREDETERMINADO })} />
                  {principales.map((m) => (
                    <FilaHoja key={m.id} texto={m.nombre} activa={ajuste.modelo === m.id} onClick={() => elegir({ modelo: m.id })} />
                  ))}
                  <span className="mx-2 my-1.5 h-px bg-tinta/[.07]" aria-hidden />
                  <FilaHoja texto={copyLocal.esfuerzoEtiqueta} valor={nombreEsfuerzo} submenu onClick={() => setPagina('esfuerzo')} />
                  {mas.length > 0 && <FilaHoja texto={copyLocal.masModelos} submenu onClick={() => setPagina('mas')} />}
                </>
              )}

              {pagina === 'esfuerzo' &&
                ESFUERZOS.map((e) => (
                  <FilaHoja key={e.valor} texto={e.texto} activa={ajuste.esfuerzo === e.valor} onClick={() => elegir({ esfuerzo: e.valor })} />
                ))}

              {pagina === 'mas' &&
                mas.map((m) => (
                  <FilaHoja key={m.id} texto={m.nombre} titulo={m.id} activa={ajuste.modelo === m.id} onClick={() => elegir({ modelo: m.id })} />
                ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </PanelAnclado>
    </>
  );
}

function FilaHoja({
  texto,
  valor,
  activa,
  submenu,
  titulo,
  onClick,
}: {
  texto: string;
  valor?: string;
  activa?: boolean;
  submenu?: boolean;
  titulo?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={submenu ? 'menuitem' : 'menuitemradio'}
      aria-checked={submenu ? undefined : !!activa}
      aria-haspopup={submenu ? 'menu' : undefined}
      title={titulo}
      onClick={onClick}
      className={cn(
        'flex h-11 shrink-0 items-center gap-2 rounded-celda px-3 text-left font-ui text-15 text-text-1 transition-colors duration-[120ms] active:bg-tinta/[.05]'
      )}
    >
      <span className="min-w-0 flex-1 truncate">{texto}</span>
      {valor && <span className="text-14 text-text-3">{valor}</span>}
      {activa && <Check size={16} strokeWidth={2.5} className="text-accent-fg" aria-hidden />}
      {submenu && <ChevronRight size={16} className="text-text-3" aria-hidden />}
    </button>
  );
}

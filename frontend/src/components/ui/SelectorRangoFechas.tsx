import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as EventoTeclado,
  type ReactNode,
} from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  DIAS_SEMANA_CORTOS,
  claveFecha,
  claveHoy,
  diaSemanaLunes,
  fechaDeClave,
  finSemana,
  formatoDiaLargo,
  formatoFechaCortaLocal,
  formatoMesAno,
  inicioSemana,
  sumarDias,
  sumarMeses,
} from '../../lib/fechas';
import { PanelAnclado } from './menuAnclado';

/**
 * Selector de RANGO de fechas, con calendario propio.
 *
 * POR QUÉ NO ES UN `<input type="date">` — ese control abre el calendario del
 * sistema operativo: una caja gris que no conoce ni un token de la app, que en
 * cada navegador se ve distinta, que no sabe nada de "últimos 7 días" y que,
 * siendo dos campos, deja que alguien escriba un "hasta" anterior al "desde" y
 * solo se entera después.
 *
 * POR QUÉ UN SOLO CALENDARIO DE RANGO Y NO DOS CALENDARIOS INDEPENDIENTES.
 * La pregunta real de una auditoría no es "¿qué día empieza?" seguida de "¿qué
 * día termina?": es "¿qué pasó ENTRE estos dos días". Con dos calendarios hay
 * que abrir dos menús, recordar en el segundo lo que se eligió en el primero y
 * comparar dos retículas que casi siempre muestran el mismo mes. Con uno solo:
 *
 *  - el tramo elegido se VE pintado sobre la misma retícula, así que el largo
 *    del rango —que es el dato que importa— se lee de un vistazo;
 *  - el rango imposible deja de ser posible por construcción, no por
 *    validación: mientras se elige el final, los días anteriores al inicio
 *    están DESHABILITADOS y no hay nada que corregir después;
 *  - los atajos ("Hoy", "Últimos 7 días", "Este mes") resuelven los dos
 *    extremos con una sola pulsación, que es el 90 % de los usos reales.
 *
 * QUÉ EXTREMO SE ESTÁ ELIGIENDO. Arriba del calendario hay dos pastillas,
 * "Desde" y "Hasta"; la activa dice qué extremo recibe el siguiente clic y va
 * avanzando sola (eliges el inicio → pasa a "Hasta"). Son pulsables porque son
 * también la salida de emergencia: si te equivocaste de inicio, vuelves a
 * "Desde" sin borrar nada. Sin ellas, deshabilitar los días anteriores dejaría
 * a la persona encerrada.
 *
 * Un extremo puede quedarse vacío a propósito: "Desde 02 sep" sin final es un
 * filtro abierto perfectamente válido, y el servicio ya lo entiende así.
 *
 * ZONA HORARIA. Todo se mueve en claves `YYYY-MM-DD` locales, construidas con
 * `claveFecha`/`fechaDeClave` (ver `src/lib/fechas.ts`). Aquí NUNCA se hace
 * `new Date('2026-09-02')` ni `toISOString().slice(0, 10)`: las dos cosas pasan
 * por UTC y en México pintarían y filtrarían el día anterior.
 *
 * TECLADO (`role="grid"` con recorrido de foco móvil):
 *   ←/→            un día        ↑/↓            una semana
 *   AvPág/RePág    un mes        ⇧+AvPág/RePág  un año
 *   Inicio/Fin     lunes/domingo de la semana en curso
 *   Entrar/Espacio elige el día bajo el foco
 *   Escape         cierra sin cambiar nada y devuelve el foco al disparador
 */

/** Textos del control. Viven en el objeto `TEXTO` de la pantalla que lo usa. */
export interface TextosRangoFechas {
  /** Lo que dice el disparador cuando no hay filtro. */
  todasFechas: string;
  desde: string;
  hasta: string;
  /** Nombre accesible de las pastillas de extremo. */
  elegirDesde: string;
  elegirHasta: string;
  hoy: string;
  ultimos7: string;
  esteMes: string;
  borrar: string;
  mesAnterior: string;
  mesSiguiente: string;
  /** Título de la hoja inferior en móvil. */
  tituloHoja: string;
  /** Pie de ayuda dentro del panel. */
  ayuda: string;
  /** Marcador del extremo todavía sin elegir. */
  sinElegir: string;
}

export interface RangoFechas {
  /** Clave `YYYY-MM-DD` local, o `null` para no acotar ese extremo. */
  desde: string | null;
  hasta: string | null;
}

/** Seis semanas SIEMPRE: la retícula no cambia de alto al cambiar de mes. */
const SEMANAS = 6;

/** "02 sep – 05 sep", "Desde 02 sep", "Hasta 05 sep" o "Todas las fechas". */
export function resumenRango(rango: RangoFechas, textos: TextosRangoFechas) {
  const corta = (clave: string) => formatoFechaCortaLocal(fechaDeClave(clave));
  if (rango.desde && rango.hasta) {
    if (rango.desde === rango.hasta) return corta(rango.desde);
    return `${corta(rango.desde)} – ${corta(rango.hasta)}`;
  }
  if (rango.desde) return `${textos.desde} ${corta(rango.desde)}`;
  if (rango.hasta) return `${textos.hasta} ${corta(rango.hasta)}`;
  return textos.todasFechas;
}

export function SelectorRangoFechas({
  rango,
  onCambiar,
  etiqueta,
  textos,
  disabled,
  className,
}: {
  rango: RangoFechas;
  onCambiar: (rango: RangoFechas) => void;
  /** Nombre accesible del disparador: en una barra de filtros no hay rótulo visible. */
  etiqueta: string;
  textos: TextosRangoFechas;
  disabled?: boolean;
  className?: string;
}) {
  const idMes = useId();
  const idAyuda = useId();

  const [abierto, setAbierto] = useState(false);
  /** Qué extremo recibe el siguiente clic. */
  const [extremo, setExtremo] = useState<'desde' | 'hasta'>('desde');
  /** Día bajo el foco, en clave local. Es también quien decide el mes visible. */
  const [foco, setFoco] = useState(() => rango.desde ?? rango.hasta ?? claveHoy());

  const disparadorRef = useRef<HTMLButtonElement>(null);
  const rejillaRef = useRef<HTMLDivElement>(null);
  /**
   * Solo se mueve el foco real del navegador cuando el movimiento vino del
   * TECLADO. Sin esta marca, cualquier render que cambiara el día activo
   * —pulsar un atajo con el ratón, por ejemplo— robaría el foco al botón que
   * la persona acababa de tocar.
   */
  const enfocarPendiente = useRef(false);

  const hoy = claveHoy();

  const cerrar = useCallback(() => {
    setAbierto(false);
    // El foco vuelve SIEMPRE al disparador: quien navega con teclado se
    // quedaría al principio del documento si lo soltáramos dentro del panel.
    disparadorRef.current?.focus();
  }, []);

  const abrir = useCallback(() => {
    if (disabled) return;
    // Con un inicio ya puesto y sin final, se retoma justo donde se dejó.
    setExtremo(rango.desde && !rango.hasta ? 'hasta' : 'desde');
    setFoco(rango.desde ?? rango.hasta ?? claveHoy());
    enfocarPendiente.current = true;
    setAbierto(true);
  }, [disabled, rango.desde, rango.hasta]);

  /**
   * Límites del extremo que se está eligiendo. Comparar claves `YYYY-MM-DD`
   * como cadenas es exactamente comparar fechas: el formato es de ancho fijo y
   * va de lo más significativo a lo menos.
   */
  const minimo = extremo === 'hasta' ? rango.desde : null;
  const maximo = extremo === 'desde' ? rango.hasta : null;
  const deshabilitado = useCallback(
    (clave: string) => Boolean((minimo && clave < minimo) || (maximo && clave > maximo)),
    [minimo, maximo]
  );

  const elegirDia = useCallback(
    (clave: string) => {
      if (deshabilitado(clave)) return;
      // El recorrido de tabulación sigue al día elegido: si el foco móvil se
      // quedara en otra celda, el siguiente Tab volvería a entrar por un día
      // que ya no es el que la persona acaba de tocar.
      setFoco(clave);
      if (extremo === 'desde') {
        onCambiar({ desde: clave, hasta: rango.hasta });
        setExtremo('hasta');
      } else {
        onCambiar({ desde: rango.desde, hasta: clave });
      }
    },
    [deshabilitado, extremo, onCambiar, rango.desde, rango.hasta]
  );

  /** Los atajos responden la pregunta entera, así que además cierran el panel. */
  const aplicarAtajo = useCallback(
    (siguiente: RangoFechas) => {
      onCambiar(siguiente);
      cerrar();
    },
    [onCambiar, cerrar]
  );

  const mesVisible = useMemo(() => {
    const f = fechaDeClave(foco);
    return new Date(f.getFullYear(), f.getMonth(), 1);
  }, [foco]);

  /** 42 días: los del mes más el relleno de los vecinos, para no dejar huecos. */
  const dias = useMemo(() => {
    const primeraCasilla = sumarDias(mesVisible, -diaSemanaLunes(mesVisible));
    return Array.from({ length: SEMANAS * 7 }, (_, i) => sumarDias(primeraCasilla, i));
  }, [mesVisible]);

  const moverFoco = useCallback((destino: Date) => {
    enfocarPendiente.current = true;
    setFoco(claveFecha(destino));
  }, []);

  function alTeclaRejilla(e: EventoTeclado<HTMLDivElement>) {
    const actual = fechaDeClave(foco);
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moverFoco(sumarDias(actual, -1));
        return;
      case 'ArrowRight':
        e.preventDefault();
        moverFoco(sumarDias(actual, 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        moverFoco(sumarDias(actual, -7));
        return;
      case 'ArrowDown':
        e.preventDefault();
        moverFoco(sumarDias(actual, 7));
        return;
      case 'Home':
        e.preventDefault();
        moverFoco(inicioSemana(actual));
        return;
      case 'End':
        e.preventDefault();
        moverFoco(finSemana(actual));
        return;
      case 'PageUp':
        e.preventDefault();
        moverFoco(sumarMeses(actual, e.shiftKey ? -12 : -1));
        return;
      case 'PageDown':
        e.preventDefault();
        moverFoco(sumarMeses(actual, e.shiftKey ? 12 : 1));
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        elegirDia(foco);
        return;
      default:
    }
  }

  // El foco del navegador sigue al día activo, pero solo tras una tecla (o al
  // abrir). `enfocarPendiente` es lo que evita robárselo al ratón.
  useEffect(() => {
    if (!abierto || !enfocarPendiente.current) return;
    enfocarPendiente.current = false;
    rejillaRef.current?.querySelector<HTMLElement>(`[data-dia="${foco}"]`)?.focus();
  }, [abierto, foco]);

  const aplicarAlto = useCallback((px: number | null) => {
    if (rejillaRef.current?.parentElement) {
      const caja = rejillaRef.current.parentElement;
      caja.style.maxHeight = px === null ? '' : `${px}px`;
    }
  }, []);

  const activo = Boolean(rango.desde || rango.hasta);
  const resumen = resumenRango(rango, textos);

  return (
    <>
      <button
        ref={disparadorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`${etiqueta}. ${resumen}`}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        className={cn(
          // Mismas medidas y misma piel que el disparador de `SelectorLista`:
          // los dos filtros viven en la misma fila y tienen que pesar igual.
          'flex h-10 shrink-0 items-center gap-2 rounded-control border bg-surface-1 px-3.5 text-left font-ui text-14 text-text-1 transition-colors duration-150',
          'focus:outline-none focus:ring-[3px] focus:ring-accent-soft',
          abierto ? 'border-accent ring-[3px] ring-accent-soft' : 'border-hairline focus:border-accent',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-hairlineStrong',
          activo && 'border-accent/40 bg-accent-soft text-accent-fg',
          className
        )}
      >
        <CalendarDays size={16} strokeWidth={2} aria-hidden className="shrink-0" />
        {/* En pantallas angostas el icono basta: el resumen completo se anuncia
            igual por `aria-label`, y el rango se ve al abrir. */}
        <span className={cn('hidden text-13 tabular-nums sm:inline', activo && 'font-medium')}>
          {resumen}
        </span>
      </button>

      <PanelAnclado
        abierto={abierto}
        cerrar={cerrar}
        disparadorRef={disparadorRef}
        tituloHoja={textos.tituloHoja}
        ancho={320}
        altoMaximo={460}
        altoMinimoUtil={300}
        aplicarAlto={aplicarAlto}
      >
        <div
          role="group"
          aria-label={etiqueta}
          aria-describedby={idAyuda}
          // Escape se atiende en el contenedor y no en cada control: dentro hay
          // pastillas, flechas, retícula y atajos, y en todos tiene que cerrar.
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            cerrar();
          }}
          className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto overscroll-contain p-3"
        >
          {/* ── Qué extremo se está eligiendo ── */}
          <div className="grid grid-cols-2 gap-1.5">
            <PastillaExtremo
              activa={extremo === 'desde'}
              rotulo={textos.desde}
              valor={rango.desde}
              vacio={textos.sinElegir}
              etiqueta={textos.elegirDesde}
              onClick={() => setExtremo('desde')}
            />
            <PastillaExtremo
              activa={extremo === 'hasta'}
              rotulo={textos.hasta}
              valor={rango.hasta}
              vacio={textos.sinElegir}
              etiqueta={textos.elegirHasta}
              onClick={() => setExtremo('hasta')}
            />
          </div>

          {/* ── Mes visible ── */}
          <div className="flex items-center justify-between gap-1">
            <FlechaMes
              etiqueta={textos.mesAnterior}
              onClick={() => moverFoco(sumarMeses(fechaDeClave(foco), -1))}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </FlechaMes>
            {/*
              `aria-live` en el propio rótulo: al cambiar de mes con AvPág o con
              las flechas, el lector anuncia el mes nuevo. Sin esto, quien no ve
              la pantalla navega a ciegas entre 42 celdas sin saber que cruzó a
              otro mes. `first-letter:uppercase` porque `Intl` en es-MX devuelve
              "septiembre de 2026" en minúscula.
            */}
            <span
              id={idMes}
              aria-live="polite"
              aria-atomic="true"
              className="flex-1 text-center font-ui text-14 font-semibold text-text-1 first-letter:uppercase"
            >
              {formatoMesAno(mesVisible)}
            </span>
            <FlechaMes
              etiqueta={textos.mesSiguiente}
              onClick={() => moverFoco(sumarMeses(fechaDeClave(foco), 1))}
            >
              <ChevronRight size={16} strokeWidth={2} />
            </FlechaMes>
          </div>

          {/* ── Retícula ── */}
          <div
            ref={rejillaRef}
            role="grid"
            aria-labelledby={idMes}
            onKeyDown={alTeclaRejilla}
            className="select-none"
          >
            <div role="row" className="grid grid-cols-7">
              {DIAS_SEMANA_CORTOS.map((dia) => (
                <div
                  key={dia}
                  role="columnheader"
                  // El nombre completo del día se queda en el título: la
                  // abreviatura de dos o tres letras no se lee bien en voz alta.
                  aria-label={dia}
                  className="pb-1 text-center font-ui text-12 font-medium text-text-3 first-letter:uppercase"
                >
                  {dia.replace('.', '')}
                </div>
              ))}
            </div>

            {Array.from({ length: SEMANAS }, (_, semana) => (
              <div role="row" key={semana} className="grid grid-cols-7">
                {dias.slice(semana * 7, semana * 7 + 7).map((fecha) => {
                  const clave = claveFecha(fecha);
                  const esDesde = clave === rango.desde;
                  const esHasta = clave === rango.hasta;
                  const extremoElegido = esDesde || esHasta;
                  const dentro =
                    Boolean(rango.desde && rango.hasta) &&
                    clave >= (rango.desde as string) &&
                    clave <= (rango.hasta as string);
                  const inhabil = deshabilitado(clave);
                  const otroMes = fecha.getMonth() !== mesVisible.getMonth();
                  const esHoy = clave === hoy;

                  return (
                    <div
                      key={clave}
                      role="gridcell"
                      data-dia={clave}
                      // Recorrido de foco MÓVIL: un solo día en el orden de
                      // tabulación, para que Tab entre y salga del calendario
                      // de una vez en lugar de recorrer 42 paradas.
                      tabIndex={clave === foco ? 0 : -1}
                      aria-selected={extremoElegido}
                      aria-disabled={inhabil || undefined}
                      aria-current={esHoy ? 'date' : undefined}
                      aria-label={formatoDiaLargo(fecha)}
                      onClick={() => elegirDia(clave)}
                      className={cn(
                        'relative flex h-10 items-center justify-center outline-none',
                        // El tramo intermedio se pinta en la CELDA y los
                        // extremos en la pastilla de dentro: así el rango se lee
                        // como una barra continua y no como días sueltos.
                        dentro && !extremoElegido && 'bg-accent-soft',
                        dentro && esDesde && 'rounded-l-celda bg-accent-soft',
                        dentro && esHasta && 'rounded-r-celda bg-accent-soft',
                        inhabil ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-celda font-ui text-13 tabular-nums transition-colors duration-150',
                          otroMes ? 'text-text-3' : 'text-text-1',
                          !inhabil && !extremoElegido && 'hover:bg-accent-soft',
                          extremoElegido && 'bg-accent font-semibold text-white',
                          inhabil && 'text-text-3 opacity-40',
                          // El anillo de foco va DENTRO de la pastilla y no en
                          // la celda, para que no lo recorte el borde del tramo.
                          clave === foco && 'ring-2 ring-accent ring-offset-2 ring-offset-surface-3'
                        )}
                      >
                        {fecha.getDate()}
                      </span>
                      {/*
                        HOY se marca con un punto, no con un color de fondo: el
                        fondo ya significa "elegido", y dos significados en el
                        mismo canal no se distinguen. El punto se pone blanco
                        cuando cae encima de un extremo elegido.
                      */}
                      {esHoy && (
                        <span
                          aria-hidden
                          className={cn(
                            'pointer-events-none absolute bottom-1 h-1 w-1 rounded-full',
                            extremoElegido ? 'bg-white' : 'bg-accent'
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Atajos: lo que se pulsa el 90 % de las veces ── */}
          <div className="flex flex-wrap gap-1.5 border-t border-hairline pt-2">
            <Atajo onClick={() => aplicarAtajo({ desde: hoy, hasta: hoy })}>{textos.hoy}</Atajo>
            <Atajo
              onClick={() =>
                // Siete días CONTANDO hoy: "últimos 7 días" incluye el de hoy.
                aplicarAtajo({ desde: claveFecha(sumarDias(fechaDeClave(hoy), -6)), hasta: hoy })
              }
            >
              {textos.ultimos7}
            </Atajo>
            <Atajo
              onClick={() => {
                const h = fechaDeClave(hoy);
                aplicarAtajo({ desde: claveFecha(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: hoy });
              }}
            >
              {textos.esteMes}
            </Atajo>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p id={idAyuda} className="min-w-0 flex-1 font-ui text-12 leading-snug text-text-3">
              {textos.ayuda}
            </p>
            {/* "Borrar" NO cierra el panel: casi siempre se pulsa para empezar
                de nuevo, no para irse. */}
            <button
              type="button"
              disabled={!activo}
              onClick={() => {
                onCambiar({ desde: null, hasta: null });
                setExtremo('desde');
              }}
              className="shrink-0 rounded-control px-2.5 py-1.5 font-ui text-13 font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-soft focus:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:bg-transparent"
            >
              {textos.borrar}
            </button>
          </div>
        </div>
      </PanelAnclado>
    </>
  );
}

/** Pastilla de extremo: dice qué se está eligiendo y deja volver al otro. */
function PastillaExtremo({
  activa,
  rotulo,
  valor,
  vacio,
  etiqueta,
  onClick,
}: {
  activa: boolean;
  rotulo: string;
  valor: string | null;
  vacio: string;
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      aria-label={etiqueta}
      className={cn(
        'flex flex-col items-start rounded-celda border px-2.5 py-1.5 text-left transition-colors duration-150',
        'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft',
        activa
          ? 'border-accent bg-accent-soft'
          : 'border-hairline bg-surface-1 hover:border-hairlineStrong'
      )}
    >
      <span className={cn('font-ui text-12', activa ? 'text-accent-fg' : 'text-text-3')}>{rotulo}</span>
      <span
        className={cn(
          'font-ui text-13 tabular-nums',
          valor ? 'font-medium text-text-1' : 'text-text-3'
        )}
      >
        {valor ? formatoFechaCortaLocal(fechaDeClave(valor)) : vacio}
      </span>
    </button>
  );
}

function FlechaMes({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-2 transition-colors duration-150 hover:bg-accent-soft hover:text-accent-fg focus:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft"
    >
      {children}
    </button>
  );
}

function Atajo({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-control border border-hairline bg-surface-1 px-2.5 py-1.5 font-ui text-12 font-medium text-text-2 transition-colors duration-150 hover:border-accent/30 hover:bg-accent-soft hover:text-accent-fg focus:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft"
    >
      {children}
    </button>
  );
}

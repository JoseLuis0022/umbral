import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as EventoTeclado,
  type ReactNode,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { PanelAnclado } from './menuAnclado';

/**
 * Selector propio (patrón combobox/listbox de ARIA).
 *
 * POR QUÉ EXISTE — un `<select>` nativo dibuja el menú del sistema operativo:
 * ni se puede vestir con los tokens de la app ni admite más de UNA línea por
 * opción. Eso obligaba a apretar información en la etiqueta ("GPT-4.1 ·
 * Equilibrado") y a repetir debajo del control lo que no cabía. Aquí cada
 * opción es un bloque libre —quien lo usa decide qué pinta dentro— y el
 * disparador se queda limpio.
 *
 * Lo que un `<select>` daba gratis y aquí hay que construir a mano está todo
 * abajo: teclado completo, `aria-activedescendant`, foco de vuelta al
 * disparador y desplazamiento de la opción resaltada. La caja flotante —portal,
 * colocación, volteo, hoja inferior en móvil, clic fuera— vive en
 * `menuAnclado.tsx` y se comparte con el selector de fechas.
 *
 * EL FOCO SE MUDA A LA LISTA. Mientras está abierto, el foco vive en el
 * `role="listbox"` y la opción resaltada se comunica con
 * `aria-activedescendant`. Así Escape y Tab devuelven el foco al disparador sin
 * ambigüedad, y en móvil —donde el desplegable es una hoja modal— el foco no se
 * queda atrás del fondo esmerilado.
 */

/** Ventana del buscador por letra: pasado este tiempo, la siguiente tecla empieza de cero. */
const MS_TYPEAHEAD = 600;

/** Sin acentos y en minúsculas: quien escribe "economico" espera encontrar "Económico". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export interface OpcionLista<T> {
  /** Lo que viaja a `onCambiar`. Único en la lista. */
  valor: string;
  /** Texto plano: es lo que busca el teclado y lo que se pinta si nadie define un disparador. */
  texto: string;
  /** El dato completo, para que `renderOpcion` pinte lo suyo sin volver a buscarlo. */
  dato: T;
}

export interface EstadoOpcion {
  seleccionada: boolean;
  /** Resaltada por teclado o por el cursor. No es lo mismo que elegida. */
  activa: boolean;
}

/**
 * El control necesita un nombre accesible y hay exactamente dos formas de
 * dárselo, según haya o no un rótulo VISIBLE:
 *
 *  - `etiquetaId` — hay un rótulo en pantalla (el caso del laboratorio, donde
 *    cada parámetro lleva su `span` con `id`). Se referencia con
 *    `aria-labelledby`, que además hace que el lector lea "Modelo, GPT-4.1,
 *    cuadro combinado" en ese orden.
 *  - `etiqueta` — el control vive en una barra de filtros compacta y no hay
 *    sitio para un rótulo (auditoría, boletines). Se aplica como `aria-label`.
 *
 * El tipo obliga a elegir una: pasar las dos, o ninguna, no compila. Se
 * prefirió esto a un envoltorio que generase el `id` con `useId()`, porque los
 * tres usos nuevos NO tienen rótulo visible y un envoltorio de rótulo no les
 * habría ahorrado nada.
 */
type PropsEtiqueta =
  | { etiquetaId: string; etiqueta?: never }
  | { etiqueta: string; etiquetaId?: never };

type PropsSelector<T> = {
  opciones: OpcionLista<T>[];
  valor: string;
  onCambiar: (valor: string) => void;
  /** Título de la hoja inferior en móvil, donde el rótulo de la pantalla no se ve. */
  tituloHoja: string;
  placeholder?: string;
  disabled?: boolean;
  describedBy?: string;
  className?: string;
  renderOpcion: (opcion: OpcionLista<T>, estado: EstadoOpcion) => ReactNode;
  renderDisparador?: (opcion: OpcionLista<T>) => ReactNode;
};

export function SelectorLista<T>({
  opciones,
  valor,
  onCambiar,
  etiquetaId,
  etiqueta,
  tituloHoja,
  placeholder,
  disabled,
  describedBy,
  className,
  renderOpcion,
  renderDisparador,
}: PropsSelector<T> & PropsEtiqueta) {
  const idDisparador = useId();
  const idLista = useId();
  const idOpcion = (indice: number) => `${idLista}-op-${indice}`;

  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);

  const disparadorRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const busquedaRef = useRef({ texto: '', ts: 0 });

  const elegida = opciones.find((o) => o.valor === valor);
  const indiceElegida = opciones.findIndex((o) => o.valor === valor);

  const cerrar = useCallback(() => {
    setAbierto(false);
    // El foco vuelve SIEMPRE al disparador: quien navega con teclado se
    // quedaría al principio del documento si soltáramos el foco con la lista.
    disparadorRef.current?.focus();
  }, []);

  const abrir = useCallback(
    (inicio: 'seleccionada' | 'primera' | 'ultima' = 'seleccionada') => {
      if (disabled || opciones.length === 0) return;
      // Se abre sobre lo ya elegido; solo si no hay nada elegido manda de dónde
      // vino la orden (Flecha arriba entra por el final de la lista).
      const arranque =
        indiceElegida >= 0 ? indiceElegida : inicio === 'ultima' ? opciones.length - 1 : 0;
      setActiva(arranque);
      busquedaRef.current = { texto: '', ts: 0 };
      setAbierto(true);
    },
    [disabled, opciones.length, indiceElegida]
  );

  const elegir = useCallback(
    (siguiente: string) => {
      if (siguiente !== valor) onCambiar(siguiente);
      cerrar();
    },
    [valor, onCambiar, cerrar]
  );

  /** Flechas: sin dar la vuelta, igual que un `<select>` nativo. */
  const mover = useCallback(
    (paso: number) => {
      const total = opciones.length;
      if (total === 0) return;
      setActiva((previa) => {
        if (previa < 0) return paso > 0 ? 0 : total - 1;
        return Math.min(total - 1, Math.max(0, previa + paso));
      });
    },
    [opciones.length]
  );

  /**
   * Buscador por letra. Repetir la MISMA tecla cicla entre las opciones que
   * empiezan por ella (es lo que hace un `<select>` y lo que la gente espera
   * al teclear "g" tres veces); teclas distintas dentro de la ventana de
   * tiempo van formando un prefijo más largo.
   */
  const buscar = useCallback(
    (tecla: string) => {
      const total = opciones.length;
      if (total === 0) return;

      const ahora = Date.now();
      const previo = busquedaRef.current;
      const acumulado = ahora - previo.ts < MS_TYPEAHEAD ? previo.texto + tecla : tecla;
      busquedaRef.current = { texto: acumulado, ts: ahora };

      const repetida = acumulado.length > 1 && [...acumulado].every((c) => c === acumulado[0]);
      const aguja = normalizar(repetida ? acumulado[0] : acumulado);

      setActiva((previa) => {
        const desde = repetida ? previa + 1 : 0;
        for (let salto = 0; salto < total; salto++) {
          const indice = (desde + salto + total) % total;
          if (normalizar(opciones[indice].texto).startsWith(aguja)) return indice;
        }
        return previa;
      });
    },
    [opciones]
  );

  /** Teclado con el menú ABIERTO. Vive en la lista, que es quien tiene el foco. */
  function alTeclaAbierto(e: EventoTeclado) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        mover(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        mover(-1);
        return;
      case 'PageDown':
        e.preventDefault();
        mover(5);
        return;
      case 'PageUp':
        e.preventDefault();
        mover(-5);
        return;
      case 'Home':
        e.preventDefault();
        setActiva(0);
        return;
      case 'End':
        e.preventDefault();
        setActiva(opciones.length - 1);
        return;
      case 'Enter':
        e.preventDefault();
        if (activa >= 0) elegir(opciones[activa].valor);
        return;
      case ' ':
        // Un espacio a media búsqueda es parte del texto ("gpt 4"), no un
        // "elegir": solo confirma cuando no hay nada escrito.
        if (Date.now() - busquedaRef.current.ts < MS_TYPEAHEAD) break;
        e.preventDefault();
        if (activa >= 0) elegir(opciones[activa].valor);
        return;
      case 'Escape':
        e.preventDefault();
        // Cierra SIN cambiar la selección: se sale por donde se entró.
        cerrar();
        return;
      case 'Tab':
        // Sin `preventDefault`: al devolver el foco al disparador de forma
        // síncrona, el navegador sigue tabulando desde ahí y la persona no
        // pierde su sitio en el formulario.
        cerrar();
        return;
      default:
        break;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      buscar(e.key);
    }
  }

  /** Teclado con el menú CERRADO. */
  function alTeclaDisparador(e: EventoTeclado) {
    if (abierto) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      // `preventDefault` evita que el botón dispare además su `click` y el
      // menú se abra y se cierre en el mismo gesto.
      e.preventDefault();
      abrir('primera');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      abrir('ultima');
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      abrir('primera');
      buscar(e.key);
    }
  }

  // El foco se muda a la lista al abrir.
  useEffect(() => {
    if (abierto) listaRef.current?.focus();
  }, [abierto]);

  // La opción resaltada tiene que seguir viéndose al navegar con el teclado.
  // `nearest`: desplaza lo justo, sin recentrar la lista en cada flecha.
  useEffect(() => {
    if (!abierto || activa < 0) return;
    const nodo = listaRef.current?.querySelector<HTMLElement>(`[data-indice="${activa}"]`);
    nodo?.scrollIntoView({ block: 'nearest' });
  }, [abierto, activa]);

  const aplicarAlto = useCallback((px: number | null) => {
    if (listaRef.current) listaRef.current.style.maxHeight = px === null ? '' : `${px}px`;
  }, []);

  const contenidoDisparador = elegida ? (
    renderDisparador ? (
      renderDisparador(elegida)
    ) : (
      <span className="truncate">{elegida.texto}</span>
    )
  ) : (
    <span className="truncate text-text-3">{placeholder ?? '—'}</span>
  );

  return (
    <>
      <button
        ref={disparadorRef}
        type="button"
        id={idDisparador}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        // Con rótulo visible: primero el rótulo y después el propio disparador,
        // para que el lector anuncie "Modelo, GPT-4.1, cuadro combinado".
        aria-labelledby={etiquetaId ? `${etiquetaId} ${idDisparador}` : undefined}
        aria-label={etiqueta}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclaDisparador}
        className={cn(
          // Mismas medidas que el `Input` del sistema (h-10, px-3.5, radio de
          // control): sustituye a un campo, así que tiene que pesar lo mismo en
          // la retícula — y el esqueleto de carga sigue midiendo igual.
          'flex h-10 w-full items-center gap-2 rounded-control border bg-surface-1 px-3.5 text-left font-ui text-14 text-text-1 transition-colors duration-150',
          'focus:outline-none focus:ring-[3px] focus:ring-accent-soft',
          abierto ? 'border-accent ring-[3px] ring-accent-soft' : 'border-hairline focus:border-accent',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-hairlineStrong',
          className
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">{contenidoDisparador}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={cn(
            'shrink-0 text-text-3 transition-transform duration-150 ease-umbral',
            abierto && 'rotate-180'
          )}
        />
      </button>

      <PanelAnclado
        abierto={abierto}
        cerrar={cerrar}
        disparadorRef={disparadorRef}
        tituloHoja={tituloHoja}
        aplicarAlto={aplicarAlto}
      >
        <ul
          ref={listaRef}
          id={idLista}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={etiquetaId}
          aria-label={etiquetaId ? undefined : etiqueta}
          aria-activedescendant={activa >= 0 ? idOpcion(activa) : undefined}
          onKeyDown={alTeclaAbierto}
          className="max-h-[60vh] overflow-y-auto overscroll-contain p-1.5 focus:outline-none sm:max-h-[320px]"
        >
          {opciones.map((opcion, indice) => {
            const seleccionada = opcion.valor === valor;
            const resaltada = indice === activa;
            return (
              <li
                key={opcion.valor}
                id={idOpcion(indice)}
                role="option"
                aria-selected={seleccionada}
                data-indice={indice}
                // `pointermove` y no `mouseenter`: al navegar con flechas la
                // lista se desplaza bajo un cursor quieto y `mouseenter`
                // robaría el resaltado a la tecla. Aquí, si el puntero no se
                // mueve, no pasa nada; y si el índice ya es el mismo, React
                // descarta el render.
                onPointerMove={() => setActiva((previa) => (previa === indice ? previa : indice))}
                onClick={() => elegir(opcion.valor)}
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-celda px-2.5 py-2 transition-colors duration-[120ms]',
                  resaltada && 'bg-tinta/[.05]'
                )}
              >
                <div className="min-w-0 flex-1">
                  {renderOpcion(opcion, { seleccionada, activa: resaltada })}
                </div>
                {/* La palomita, y no solo el fondo, es lo que distingue
                    "elegida" de "resaltada": el color por sí solo no basta. */}
                <Check
                  size={15}
                  strokeWidth={2.5}
                  aria-hidden
                  className={cn(
                    'mt-0.5 shrink-0 text-accent-fg transition-opacity duration-150',
                    seleccionada ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </li>
            );
          })}
        </ul>
      </PanelAnclado>
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Download, Search } from 'lucide-react';
import { Button, DataTable, Field, IconButton, Input, Select, Skeleton, type Column } from '../../ui';
import { formatoFechaLarga, haceCuanto } from '../../../lib/fechas';
import type { NivelAnalisis } from '../../../types';
import type { FilaImpacto, Periodo } from '../../../services/tablero.service';
import {
  ETIQUETA_NIVEL,
  PESO_RIESGO,
  PESO_SIN_ANALISIS,
  SIN_ANALISIS,
  entero,
  horasConUnidad,
  normalizar,
  pesos,
  plural,
} from './formato';
import { useEsEscritorio } from './hooks';
import { IndicadorNivel } from './IndicadorNivel';

/**
 * `FilaImpacto` ya trae `riesgo` y `ahorroTiempo`, pero TODAVÍA NO
 * `ahorroCosto`: `construirFilas()` en `src/services/tablero.service.ts` lo
 * omite aunque el análisis de la conversación sí lo tiene (la auditoría lo
 * pinta). Se lee de forma opcional para que la columna de costo encienda sola
 * en cuanto se agregue esa línea al servicio, sin tocar nada de esta carpeta.
 * Mientras tanto la celda muestra la cifra exacta y un "sin nivel" honesto, no
 * un nivel inventado. Pedido en el reporte.
 */
type FilaConNiveles = FilaImpacto & { ahorroCosto?: NivelAnalisis | null };
const nivelCosto = (f: FilaImpacto) => (f as FilaConNiveles).ahorroCosto ?? null;

/** Etiqueta de nivel para el CSV. Sin nivel no se inventa uno: se dice que falta. */
const etiquetaNivel = (n: NivelAnalisis | null) => (n ? ETIQUETA_NIVEL[n] : SIN_ANALISIS);

const TEXTO = {
  titulo: 'Detalle por conversación',
  subtitulo: 'Todo lo que resume el tablero, conversación por conversación.',
  buscar: 'Buscar por conversación, persona o área',
  buscarPlaceholder: 'Buscar…',
  filtroRiesgo: 'Nivel de riesgo',
  todosRiesgos: 'Todos los niveles',
  ordenarPor: 'Ordenar por',
  exportar: 'Exportar a CSV',
  pistaOrden: 'Haz clic en un encabezado para ordenar.',
  ascendente: 'Cambiar a orden descendente',
  descendente: 'Cambiar a orden ascendente',
  colConversacion: 'Conversación',
  colRiesgo: 'Riesgo',
  colTiempo: 'Ahorro de tiempo',
  colDinero: 'Ahorro de costo',
  colMensajes: 'Mensajes',
  colActividad: 'Última actividad',
  minutos: (n: string) => `Equivale a ${n} minutos.`,
  mxn: (n: string) => `Costo evitado: ${n} MXN.`,
  totales: 'Totales de lo que estás viendo',
  sinResultados: 'Ninguna conversación coincide',
  sinResultadosDetalle: 'Prueba con otras palabras o quita el filtro de riesgo.',
  limpiar: 'Quitar filtros',
};

type CampoOrden = 'titulo' | 'riesgo' | 'tiempo' | 'dinero' | 'mensajes' | 'fecha';
type Direccion = 'asc' | 'desc';
type FiltroRiesgo = 'todos' | NivelAnalisis | 'sin';

/**
 * El ORDEN de este arreglo es el contrato con `DataTable`: la posición de cada
 * campo coincide con la posición de su columna, y es lo que permite resolver
 * qué encabezado se pulsó a partir del índice del `<th>`. Si se reordenan las
 * columnas hay que reordenar esto igual.
 */
const CAMPOS: CampoOrden[] = ['titulo', 'riesgo', 'tiempo', 'dinero', 'mensajes', 'fecha'];

const ETIQUETA_CAMPO: Record<CampoOrden, string> = {
  titulo: TEXTO.colConversacion,
  riesgo: TEXTO.colRiesgo,
  tiempo: TEXTO.colTiempo,
  dinero: TEXTO.colDinero,
  mensajes: TEXTO.colMensajes,
  fecha: TEXTO.colActividad,
};

const OPCIONES_RIESGO: { valor: FiltroRiesgo; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: TEXTO.todosRiesgos },
  { valor: 'alto', etiqueta: 'Alto' },
  { valor: 'medio', etiqueta: 'Medio' },
  { valor: 'bajo', etiqueta: 'Bajo' },
  { valor: 'sin', etiqueta: SIN_ANALISIS },
];

/** Texto vs. número: el título se compara con `localeCompare`, el resto resta. */
function valorOrden(fila: FilaImpacto, campo: CampoOrden): string | number {
  switch (campo) {
    case 'titulo':
      return fila.titulo;
    case 'riesgo':
      return fila.riesgo ? PESO_RIESGO[fila.riesgo] : PESO_SIN_ANALISIS;
    case 'tiempo':
      return fila.minutosAhorrados;
    case 'dinero':
      return fila.costoEvitadoMxn;
    case 'mensajes':
      return fila.mensajes;
    case 'fecha':
      return new Date(fila.ultimoMensajeEn).getTime();
  }
}

/**
 * Una celda CSV se entrecomilla en cuanto contiene una coma, una comilla o un
 * salto de línea, y las comillas internas se duplican. Sin esto, el campo
 * `resumen` —que casi siempre trae comas— corre las columnas de sitio y el
 * archivo se abre desalineado.
 */
function celdaCsv(valor: string | number) {
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// El CSV lleva las CIFRAS CRUDAS, no las etiquetas: un CSV se abre para sumar
// en Excel y "alto" no se suma. Los niveles van además en columnas propias
// —sirven para segmentar una tabla dinámica—, nunca EN LUGAR de la cifra.
const ENCABEZADOS_CSV = [
  'Conversación',
  'Persona',
  'Área',
  'Riesgo',
  'Nivel de ahorro de tiempo',
  'Minutos ahorrados',
  'Nivel de ahorro de costo',
  'Costo evitado (MXN)',
  'Mensajes',
  'Última actividad (ISO 8601)',
  'Resumen del análisis',
];

function construirCsv(filas: FilaImpacto[]) {
  const lineas = [
    ENCABEZADOS_CSV.map(celdaCsv).join(','),
    ...filas.map((f) =>
      [
        f.titulo,
        f.persona,
        f.area,
        etiquetaNivel(f.riesgo),
        etiquetaNivel(f.ahorroTiempo),
        // Las cifras van SIN formato de miles ni separador decimal local: un
        // "1,234" o un "12,5" los interpreta Excel como texto o como otra
        // cifra según el idioma de la instalación.
        f.minutosAhorrados,
        etiquetaNivel(nivelCosto(f)),
        f.costoEvitadoMxn,
        f.mensajes,
        f.ultimoMensajeEn,
        f.resumen,
      ]
        .map(celdaCsv)
        .join(',')
    ),
  ];
  // CRLF y BOM UTF-8: sin el BOM, Excel en Windows abre el archivo como
  // Latin-1 y "Informática" se convierte en "InformÃ¡tica".
  return `\uFEFF${lineas.join('\r\n')}\r\n`;
}

export function TablaImpacto({
  filas,
  periodo,
  cargando,
  onExportado,
}: {
  filas: FilaImpacto[];
  periodo: Periodo;
  cargando: boolean;
  onExportado?: () => void;
}) {
  const esEscritorio = useEsEscritorio();
  const contenedorRef = useRef<HTMLDivElement>(null);

  const [texto, setTexto] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<FiltroRiesgo>('todos');
  // Campo y dirección viven en UN solo estado: al cambiar de columna hay que
  // cambiar los dos a la vez, y con dos `useState` separados eso obliga a
  // llamar a un setter dentro del actualizador del otro — algo que StrictMode
  // ejecuta dos veces en desarrollo y que aquí cancelaría el cambio de sentido.
  // Por defecto, el dinero de mayor a menor: es la pregunta con la que un
  // directivo abre esta tabla.
  const [orden, setOrden] = useState<{ campo: CampoOrden; direccion: Direccion }>({
    campo: 'dinero',
    direccion: 'desc',
  });

  const visibles = useMemo(() => {
    const consulta = normalizar(texto.trim());
    const filtradas = filas.filter((f) => {
      if (filtroRiesgo === 'sin' && f.riesgo !== null) return false;
      if (filtroRiesgo !== 'todos' && filtroRiesgo !== 'sin' && f.riesgo !== filtroRiesgo) return false;
      if (!consulta) return true;
      return normalizar(`${f.titulo} ${f.persona} ${f.area}`).includes(consulta);
    });

    const signo = orden.direccion === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const va = valorOrden(a, orden.campo);
      const vb = valorOrden(b, orden.campo);
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'es-MX') * signo;
      return ((va as number) - (vb as number)) * signo;
    });
  }, [filas, texto, filtroRiesgo, orden]);

  const totales = useMemo(
    () =>
      visibles.reduce(
        (acc, f) => ({
          minutos: acc.minutos + f.minutosAhorrados,
          pesos: acc.pesos + f.costoEvitadoMxn,
        }),
        { minutos: 0, pesos: 0 }
      ),
    [visibles]
  );

  const alternar = useCallback((siguiente: CampoOrden) => {
    setOrden((actual) =>
      actual.campo === siguiente
        ? { campo: actual.campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
        : // Al estrenar columna, el sentido útil depende del dato: los textos
          // se leen de la A a la Z, las cifras y las fechas de mayor a menor.
          { campo: siguiente, direccion: siguiente === 'titulo' ? 'asc' : 'desc' }
    );
  }, []);

  /**
   * `Column.header` es un `string` y `DataTable` no expone ningún gancho de
   * ordenamiento, así que el clic se resuelve por delegación sobre el `<th>`
   * usando su posición (ver CAMPOS). Es un parche a la espera de que el
   * componente acepte encabezados ordenables — está descrito en el reporte.
   */
  const alClicEncabezado = (e: ReactMouseEvent<HTMLDivElement>) => {
    const th = (e.target as HTMLElement).closest('th');
    const fila = th?.parentElement;
    if (!th || !fila) return;
    const indice = Array.prototype.indexOf.call(fila.children, th);
    const siguiente = CAMPOS[indice];
    if (siguiente) alternar(siguiente);
  };

  // `aria-sort` no se puede pasar por props con esta API, así que se escribe
  // sobre el DOM ya renderizado. Sin él, un lector de pantalla anuncia la
  // tabla como si no estuviera ordenada por nada.
  useEffect(() => {
    const ths = contenedorRef.current?.querySelectorAll('thead th');
    ths?.forEach((th, i) => {
      const suyo = CAMPOS[i] === orden.campo;
      th.setAttribute('aria-sort', suyo ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    // Sin `visibles` en las dependencias: los `th` no cambian al escribir en el
    // buscador, y tenerla ahí hacía un `querySelectorAll` sobre el DOM en cada
    // pulsación, justo después del commit y justo antes de que Framer midiera
    // el reacomodo de las filas.
  }, [orden, cargando]);

  const columnas: Column<FilaImpacto>[] = useMemo(() => {
    // La flecha solo se añade en escritorio: por debajo de 768px `DataTable`
    // pinta tarjetas y este mismo texto pasa a ser la ETIQUETA de un par
    // dato/valor, donde una flecha de ordenamiento no significa nada.
    const encabezado = (campoColumna: CampoOrden) => {
      const base = ETIQUETA_CAMPO[campoColumna];
      if (!esEscritorio || campoColumna !== orden.campo) return base;
      return `${base} ${orden.direccion === 'asc' ? '↑' : '↓'}`;
    };

    return [
      {
        key: 'titulo',
        header: encabezado('titulo'),
        cardTitle: true,
        width: 340,
        // Wrapper `span` y no `div`: en móvil `DataTable` mete el título de la
        // tarjeta DENTRO de un <span>, y un <div> ahí es anidamiento inválido.
        render: (f) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="block max-w-[300px] truncate font-ui text-13 font-medium text-text-1" title={f.titulo}>
              {f.titulo}
            </span>
            <span className="block max-w-[300px] truncate font-ui text-12 text-text-3" title={`${f.persona} · ${f.area}`}>
              {f.persona} · {f.area}
            </span>
          </span>
        ),
      },
      // Las tres columnas de análisis hablan el MISMO lenguaje visual que la
      // barra de la auditoría (icono en cuadrado + nivel escrito + escala de
      // tres segmentos, teñidos con el color semántico del nivel). Se dejan en
      // columnas separadas, y no agrupadas en una sola celda, porque el
      // ordenamiento por encabezado es por columna: una celda "Análisis" no
      // sabría si ordenar por riesgo, por horas o por pesos.
      //
      // La CIFRA exacta no se pierde: va sobre el nivel, en cada fila. El
      // encabezado ya dice de qué dimensión hablamos, así que ese renglón —que
      // en la auditoría gasta en repetir la etiqueta— aquí se aprovecha para el
      // dato duro, que es lo que se lleva a una junta de presupuesto.
      {
        key: 'riesgo',
        header: encabezado('riesgo'),
        width: 150,
        render: (f) => <IndicadorNivel clase="riesgo" nivel={f.riesgo} sinAnalisis={f.riesgo === null} />,
      },
      {
        key: 'tiempo',
        header: encabezado('tiempo'),
        width: 168,
        // Siempre en horas, aunque sean 0.8: mezclar "45 min" y "3.2 h" en la
        // misma columna obliga a convertir mentalmente para comparar dos filas.
        // Los minutos exactos siguen a un `title` de distancia, y sin redondear
        // en el CSV.
        // Sin análisis no hay cifra que enseñar: un "0.0 h" se leería como
        // "midieron y salió cero", que es justo lo contrario de lo que pasó.
        render: (f) => (
          <IndicadorNivel
            clase="ahorroTiempo"
            nivel={f.ahorroTiempo}
            sinAnalisis={f.riesgo === null}
            cifra={f.riesgo === null ? undefined : horasConUnidad(f.minutosAhorrados)}
            detalle={f.riesgo === null ? undefined : TEXTO.minutos(entero(f.minutosAhorrados))}
          />
        ),
      },
      {
        key: 'dinero',
        header: encabezado('dinero'),
        width: 168,
        render: (f) => (
          <IndicadorNivel
            clase="ahorroCosto"
            nivel={nivelCosto(f)}
            sinAnalisis={f.riesgo === null}
            cifra={f.riesgo === null ? undefined : pesos(f.costoEvitadoMxn)}
            detalle={f.riesgo === null ? undefined : TEXTO.mxn(pesos(f.costoEvitadoMxn))}
          />
        ),
      },
      {
        key: 'mensajes',
        header: encabezado('mensajes'),
        align: 'right',
        mono: true,
        render: (f) => entero(f.mensajes),
      },
      {
        key: 'fecha',
        header: encabezado('fecha'),
        align: 'right',
        render: (f) => (
          <span className="whitespace-nowrap text-text-2" title={formatoFechaLarga(f.ultimoMensajeEn)}>
            {haceCuanto(f.ultimoMensajeEn)}
          </span>
        ),
      },
    ];
  }, [orden, esEscritorio]);

  const exportar = () => {
    // Se exporta lo que se está VIENDO, ya filtrado y ordenado. Un CSV que
    // ignora los filtros de pantalla obliga a rehacer el filtrado en Excel.
    const blob = new Blob([construirCsv(visibles)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `aurora-al-dia-impacto-${periodo}-${new Date().toISOString().slice(0, 10)}.csv`;
    // El enlace se inserta en el documento antes de pulsarlo y la URL se libera
    // en el siguiente tick: Firefox y Safari ignoran el clic de un ancla que no
    // está en el DOM, y revocar la URL en la misma vuelta del bucle de eventos
    // cancela la descarga antes de que empiece.
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    onExportado?.();
  };

  const limpiar = () => {
    setTexto('');
    setFiltroRiesgo('todos');
  };

  return (
    <section className="flex flex-col gap-4" aria-label={TEXTO.titulo}>
      <header className="flex flex-col gap-0.5">
        <h2 className="font-ui text-15 font-semibold text-text-1">{TEXTO.titulo}</h2>
        <p className="font-ui text-12 text-text-3">{TEXTO.subtitulo}</p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <Field label={TEXTO.buscar} className="min-w-0 flex-1 lg:max-w-xs">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={2}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
            />
            {/* Sin debounce a propósito: el filtrado es local sobre una lista
                corta, así que cada tecla ya responde por debajo de 16 ms.
                Retrasarlo aquí solo añadiría lag inventado. */}
            <Input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={TEXTO.buscarPlaceholder}
              className="pl-9"
            />
          </div>
        </Field>

        <Field label={TEXTO.filtroRiesgo} className="w-full lg:w-52">
          <Select value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value as FiltroRiesgo)}>
            {OPCIONES_RIESGO.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </Select>
        </Field>

        {/* En móvil no hay encabezados que pulsar (DataTable pinta tarjetas),
            así que el orden necesita su propio control. En escritorio sobra: lo
            hacen los encabezados. */}
        <Field label={TEXTO.ordenarPor} className="w-full md:hidden">
          <div className="flex items-center gap-2">
            <Select
              value={orden.campo}
              onChange={(e) => setOrden((o) => ({ ...o, campo: e.target.value as CampoOrden }))}
              className="min-w-0 flex-1"
            >
              {CAMPOS.map((c) => (
                <option key={c} value={c}>
                  {ETIQUETA_CAMPO[c]}
                </option>
              ))}
            </Select>
            <IconButton
              aria-label={orden.direccion === 'asc' ? TEXTO.ascendente : TEXTO.descendente}
              onClick={() =>
                setOrden((o) => ({ ...o, direccion: o.direccion === 'asc' ? 'desc' : 'asc' }))
              }
              className="shrink-0 border border-hairline"
            >
              {orden.direccion === 'asc' ? (
                <ArrowUpNarrowWide size={18} strokeWidth={1.75} />
              ) : (
                <ArrowDownWideNarrow size={18} strokeWidth={1.75} />
              )}
            </IconButton>
          </div>
        </Field>

        <div className="flex items-center gap-3 lg:ml-auto">
          <p className="hidden font-ui text-12 text-text-3 lg:block">{TEXTO.pistaOrden}</p>
          {/* Único botón primario de la pantalla: llevarse el detalle es la
              acción que un directivo viene a hacer aquí. */}
          <Button onClick={exportar} disabled={cargando || visibles.length === 0}>
            <Download size={16} strokeWidth={2} aria-hidden />
            {TEXTO.exportar}
          </Button>
        </div>
      </div>

      <div ref={contenedorRef} onClick={alClicEncabezado} className="[&_thead_th]:cursor-pointer [&_thead_th]:select-none">
        <DataTable<FilaImpacto>
          columns={columnas}
          rows={visibles}
          state={cargando ? 'loading' : 'idle'}
          rowKey={(f) => f.id}
          emptyState={{
            title: TEXTO.sinResultados,
            description: TEXTO.sinResultadosDetalle,
            action: (
              <Button variant="secondary" size="sm" onClick={limpiar}>
                {TEXTO.limpiar}
              </Button>
            ),
          }}
        />
      </div>

      {/* Pie de totales. Va como una franja aparte y no como un `<tfoot>`
          porque `DataTable` no expone ninguno; suma SIEMPRE lo visible tras
          filtrar, que es la única suma que le cuadra a quien está mirando.
          Mientras carga se dibuja con la MISMA altura, para que la franja no
          empuje la página cuando llegan las cifras. */}
      {(cargando || visibles.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-tarjeta border border-hairline bg-surface-1 px-5 py-3.5 shadow-1">
          {cargando ? (
            <>
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-52" />
            </>
          ) : (
            <>
              <span className="font-ui text-13 font-medium text-text-2">
                {TEXTO.totales} · {plural(visibles.length, 'conversación', 'conversaciones')}
              </span>
              <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <div className="flex items-baseline gap-2">
                  <dt className="font-ui text-12 text-text-3">{TEXTO.colTiempo}</dt>
                  <dd className="font-ui text-15 font-semibold tabular-nums text-text-1">
                    {horasConUnidad(totales.minutos)}
                  </dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="font-ui text-12 text-text-3">{TEXTO.colDinero}</dt>
                  <dd className="font-ui text-15 font-semibold tabular-nums text-text-1">{pesos(totales.pesos)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      )}
    </section>
  );
}

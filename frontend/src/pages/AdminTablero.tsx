import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarOff } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageEnter, SegmentedControl, useToast } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  BarrasArea,
  DonutRiesgo,
  EsqueletoAreas,
  EsqueletoKpis,
  EsqueletoRiesgo,
  EsqueletoSerie,
  FilaKpis,
  GraficaSerie,
  TablaImpacto,
} from '../components/admin/tablero';
import { dur, ease } from '../lib/motion';
import { PERIODOS, tableroService, type DatosTablero, type Periodo } from '../services/tablero.service';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Tablero directivo',
  subtitulo: 'Cuánto está resolviendo el asistente, cuánto ahorra y dónde hay que mirar.',
  periodo: 'Periodo',
  actualizando: 'Actualizando…',
  errorTitulo: 'No pudimos cargar el tablero',
  errorDetalle: 'Revisa tu conexión e intenta de nuevo. Las cifras no se perdieron, solo no llegaron.',
  vacioTitulo: 'Sin actividad en este periodo',
  vacioDetalle:
    'Nadie usó el asistente en el rango que elegiste. Amplía el periodo para ver si hubo movimiento antes.',
  vacioAccion: 'Ver todo el periodo',
  exportado: 'Descargamos el detalle en CSV.',
  // Etiquetas cortas para el selector: "Últimos 7 días" no cabe cuatro veces
  // seguidas en una barra de acciones. El nombre largo va en el `title`.
  periodoCorto: { '7d': '7 días', '30d': '30 días', '90d': '90 días', todo: 'Todo' } as Record<Periodo, string>,
};

type EstadoCarga = 'cargando' | 'actualizando' | 'listo' | 'error';

/**
 * Tablero directivo (/admin/tablero).
 *
 * Está escrito para una sola persona: alguien que abre esto entre dos juntas y
 * necesita salir con tres cosas en la cabeza —si la herramienta se usa, cuánto
 * está ahorrando y dónde hay un problema—. Por eso el orden de la pantalla es
 * de menor a mayor detalle: KPIs, gráficas y, al final, la tabla exportable,
 * que es la que sirve para defender el presupuesto por escrito.
 *
 * Cambiar de periodo NO vacía la pantalla: se conservan las cifras anteriores
 * y solo se avisa "Actualizando…" (estado parcial). Ver los KPIs desaparecer
 * en cada clic se lee como que algo se rompió, no como que algo va rápido.
 */
export default function AdminTablero() {
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [datos, setDatos] = useState<DatosTablero | null>(null);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  // Fuerza un reintento sin tocar el periodo.
  const [intento, setIntento] = useState(0);
  const yaCargoUnaVez = useRef(false);
  const { push } = useToast();

  useEffect(() => {
    let vigente = true;
    setEstado(yaCargoUnaVez.current ? 'actualizando' : 'cargando');
    tableroService
      .obtener(periodo)
      .then((resultado) => {
        if (!vigente) return;
        yaCargoUnaVez.current = true;
        setDatos(resultado);
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [periodo, intento]);

  const etiquetaPeriodo = PERIODOS.find((p) => p.valor === periodo)?.etiqueta ?? '';
  const primeraCarga = estado === 'cargando' && !datos;
  const sinActividad = datos !== null && datos.resumen.conversaciones === 0;

  /*
   * El aviso "Actualizando…" ocupa un hueco RESERVADO y solo se le cruza la
   * opacidad. Antes se montaba y desmontaba dentro del flujo del `flex`, así
   * que al cambiar de periodo empujaba el selector unos noventa píxeles a la
   * derecha justo mientras la pastilla `layoutId` viajaba a la opción nueva:
   * la pastilla perseguía un destino que se había movido sin animación, daba un
   * tirón, y al terminar la carga el control volvía a saltar a su sitio.
   * Con el hueco reservado no se mueve nada.
   */
  const selector = (
    <div className="flex items-center gap-3">
      <motion.span
        initial={false}
        animate={{ opacity: estado === 'actualizando' ? 1 : 0 }}
        transition={{ duration: dur.fast, ease: [...ease] }}
        role="status"
        aria-hidden={estado !== 'actualizando'}
        className="hidden w-[86px] text-right font-ui text-12 text-text-3 sm:block"
      >
        {TEXTO.actualizando}
      </motion.span>
      <SegmentedControl
        layoutId="tablero-periodo"
        value={periodo}
        onChange={(valor) => setPeriodo(valor as Periodo)}
        options={PERIODOS.map((p) => ({ value: p.valor, label: TEXTO.periodoCorto[p.valor] }))}
      />
    </div>
  );

  return (
    <PageEnter className="flex flex-col pb-2">
      <PageHeader compacto title={TEXTO.titulo} subtitle={TEXTO.subtitulo} actions={selector} />

      {estado === 'error' ? (
        <Card>
          <ErrorState
            title={TEXTO.errorTitulo}
            description={TEXTO.errorDetalle}
            onRetry={() => setIntento((n) => n + 1)}
          />
        </Card>
      ) : primeraCarga ? (
        <div className="flex flex-col gap-4">
          <EsqueletoKpis />
          <EsqueletoSerie />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EsqueletoAreas />
            </div>
            <EsqueletoRiesgo />
          </div>
          {/* La tabla no lleva esqueleto propio: `DataTable` ya reutiliza el
              encabezado REAL y solo sustituye las celdas, así que se monta la
              tabla de verdad con `cargando` y el layout no cambia al llegar
              los datos. */}
          <div className="mt-2">
            <TablaImpacto filas={[]} periodo={periodo} cargando />
          </div>
        </div>
      ) : sinActividad ? (
        <Card>
          <EmptyState
            icon={CalendarOff}
            title={TEXTO.vacioTitulo}
            description={TEXTO.vacioDetalle}
            action={
              periodo !== 'todo' && (
                <Button variant="secondary" size="sm" onClick={() => setPeriodo('todo')}>
                  {TEXTO.vacioAccion}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        datos && (
          <div className="flex flex-col gap-4">
            <FilaKpis resumen={datos.resumen} periodoEtiqueta={etiquetaPeriodo} />

            <Card className="p-5">
              <GraficaSerie serie={datos.serie} />
            </Card>

            {/* Las áreas piden ancho (los nombres institucionales son largos)
                y la dona no: 2/3 y 1/3, no mitad y mitad. */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <BarrasArea areas={datos.areas} />
              </Card>
              <Card className="p-5">
                <DonutRiesgo resumen={datos.resumen} />
              </Card>
            </div>

            <div className="mt-2">
              {/* `cargando` va en false incluso mientras se recarga: durante
                  un cambio de periodo la tabla sigue mostrando las filas
                  anteriores, igual que los KPIs. */}
              <TablaImpacto
                filas={datos.filas}
                periodo={periodo}
                cargando={false}
                onExportado={() => push({ message: TEXTO.exportado, tone: 'success' })}
              />
            </div>
          </div>
        )
      )}
    </PageEnter>
  );
}

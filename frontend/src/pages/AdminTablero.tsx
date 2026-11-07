import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarOff } from 'lucide-react';
import {
  AnimatedNumber,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  KpiCard,
  PageEnter,
  SegmentedControl,
  type Column,
} from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import { EsqueletoAreas, EsqueletoKpis, EsqueletoSerie, GraficaCostoDia } from '../components/admin/tablero';
import { formatoEntero, formatoUsd } from '../components/admin/laboratorio/formato';
import { dur, ease } from '../lib/motion';
import { formatoFechaCorta } from '../lib/fechas';
import {
  auditoriaService,
  nombreDe,
  type ResumenAuditoria,
  type ResumenModelo,
  type ResumenUsuario,
} from '../services/auditoria.service';
import { tablero as copy } from '../copy';

const PERIODOS = [7, 30, 90] as const;
type Periodo = (typeof PERIODOS)[number];
type EstadoCarga = 'cargando' | 'actualizando' | 'listo' | 'error';

/**
 * Tablero (/admin/tablero): los números REALES del registro de consultas,
 * desde `GET /api/admin/resumen`. Consultas, costo en dólares, costo por día,
 * por persona y por modelo.
 *
 * Cambiar de periodo no vacía la pantalla: se conservan las cifras anteriores y
 * solo se avisa "Actualizando…" (estado parcial).
 */
export default function AdminTablero() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [datos, setDatos] = useState<ResumenAuditoria | null>(null);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [intento, setIntento] = useState(0);
  const yaCargoUnaVez = useRef(false);

  useEffect(() => {
    let vigente = true;
    setEstado(yaCargoUnaVez.current ? 'actualizando' : 'cargando');
    auditoriaService
      .obtenerResumen(periodo)
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

  const primeraCarga = estado === 'cargando' && !datos;
  const sinActividad = datos !== null && datos.periodo.consultas === 0;

  const columnasPersona: Column<ResumenUsuario>[] = [
    {
      key: 'persona',
      header: copy.colPersona,
      cardTitle: true,
      render: (f) => (
        <span className="flex flex-col">
          <span className="font-medium text-text-1">{nombreDe(f.usuario)}</span>
          <span className="text-12 text-text-3">{f.usuario.correo ?? '—'}</span>
        </span>
      ),
    },
    { key: 'consultas', header: copy.colConsultas, align: 'right', render: (f) => formatoEntero(f.consultas) },
    { key: 'costo', header: copy.colCosto, align: 'right', render: (f) => formatoUsd(f.costoUsd) },
    {
      key: 'ultima',
      header: copy.colUltima,
      align: 'right',
      render: (f) => (f.ultima ? formatoFechaCorta(f.ultima) : '—'),
    },
  ];

  const columnasModelo: Column<ResumenModelo>[] = [
    { key: 'modelo', header: copy.colModelo, cardTitle: true, mono: true, render: (f) => f.modelo || copy.sinModelo },
    { key: 'consultas', header: copy.colConsultas, align: 'right', render: (f) => formatoEntero(f.consultas) },
    { key: 'costo', header: copy.colCosto, align: 'right', render: (f) => formatoUsd(f.costoUsd) },
  ];

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
        {copy.actualizando}
      </motion.span>
      <SegmentedControl
        layoutId="tablero-periodo"
        value={String(periodo)}
        onChange={(valor) => setPeriodo(Number(valor) as Periodo)}
        options={PERIODOS.map((p) => ({ value: String(p), label: copy.periodoCorto[p] }))}
      />
    </div>
  );

  return (
    <PageEnter className="flex flex-col pb-2">
      <PageHeader compacto title={copy.titulo} subtitle={copy.subtitulo} actions={selector} />

      {estado === 'error' && !datos ? (
        <Card>
          <ErrorState title={copy.errorTitulo} description={copy.errorDetalle} onRetry={() => setIntento((n) => n + 1)} />
        </Card>
      ) : primeraCarga ? (
        <div className="flex flex-col gap-4">
          <EsqueletoKpis />
          <EsqueletoSerie />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EsqueletoAreas />
            </div>
            <EsqueletoAreas />
          </div>
        </div>
      ) : datos && sinActividad ? (
        <Card>
          <EmptyState
            icon={CalendarOff}
            title={copy.vacioTitulo}
            description={copy.vacioDetalle}
            action={
              periodo !== 90 && (
                <Button variant="secondary" size="sm" onClick={() => setPeriodo(90)}>
                  {copy.vacioAccion}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        datos && (
          <div className="flex flex-col gap-4">
            {estado === 'error' && (
              // Parcial: el cambio de periodo falló pero quedan las cifras anteriores.
              <Card>
                <ErrorState title={copy.errorTitulo} description={copy.errorDetalle} onRetry={() => setIntento((n) => n + 1)} />
              </Card>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label={copy.kpiConsultas}
                value={<AnimatedNumber value={datos.periodo.consultas} />}
                detail={copy.kpiPeriodo(datos.dias)}
              />
              <KpiCard
                label={copy.kpiCosto}
                value={formatoUsd(datos.periodo.costoUsd)}
                detail={copy.kpiHistorico(formatoEntero(datos.historico.consultas), formatoUsd(datos.historico.costoUsd))}
              />
              <KpiCard
                label={copy.kpiPromedio}
                value={formatoUsd(datos.periodo.consultas ? datos.periodo.costoUsd / datos.periodo.consultas : 0)}
                detail={copy.kpiPeriodo(datos.dias)}
              />
              <KpiCard
                label={copy.kpiErrores}
                value={<AnimatedNumber value={(datos.porEstado.error ?? 0) + (datos.porEstado.cancelada ?? 0)} />}
                detail={copy.kpiErroresDetalle(datos.porEstado.error ?? 0, datos.porEstado.cancelada ?? 0)}
              />
            </div>

            <Card className="p-5">
              <GraficaCostoDia serie={datos.porDia} />
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="flex flex-col gap-2 lg:col-span-2">
                <div>
                  <h2 className="font-ui text-15 font-semibold text-text-1">{copy.porPersona}</h2>
                  <p className="font-ui text-13 text-text-2">{copy.porPersonaDetalle}</p>
                </div>
                <DataTable
                  columns={columnasPersona}
                  rows={datos.porUsuario}
                  rowKey={(f) => f.usuario.id}
                  onRowClick={(f) => navigate(`/admin/conversaciones?usuario=${encodeURIComponent(f.usuario.id)}`)}
                />
              </section>
              <section className="flex flex-col gap-2">
                <div>
                  <h2 className="font-ui text-15 font-semibold text-text-1">{copy.porModelo}</h2>
                  <p className="font-ui text-13 text-text-2">{copy.porModeloDetalle}</p>
                </div>
                <DataTable columns={columnasModelo} rows={datos.porModelo} rowKey={(f) => f.modelo || '—'} />
              </section>
            </div>
          </div>
        )
      )}
    </PageEnter>
  );
}

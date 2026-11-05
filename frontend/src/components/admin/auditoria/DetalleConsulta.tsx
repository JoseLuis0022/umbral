import type { ReactNode } from 'react';
import { ChevronLeft, MessageSquareOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Banner, Button, EmptyState, StatusPill } from '../../ui';
import { Markdown } from '../../Markdown';
import { dur, ease } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoFechaLarga, formatoHora } from '../../../lib/fechas';
import { auditoria as copy } from '../../../copy';
import { formatoDuracion, formatoEntero, formatoUsd } from '../laboratorio/formato';
import {
  inicialesDe,
  nombreDe,
  tokensTotales,
  type ConsultaDetalle as Consulta,
} from '../../../services/auditoria.service';

/**
 * Detalle de una consulta: quién, la pregunta, la respuesta tal como la vio la
 * persona (markdown renderizado) y, al final, cómo se resolvió: modelo, costo,
 * tokens con caché, vueltas, herramientas y duración.
 *
 * Una sola superficie de arriba abajo: se lee como un documento —evidencia
 * primero, métricas después—, no como un tablero de tarjetas.
 */
export function DetalleConsulta({ consulta, onVolver }: { consulta: Consulta; onVolver: () => void }) {
  const reducido = useReducedMotion();
  const { usuario, tokens } = consulta;
  const fmt = (n: number | null | undefined) => (n == null ? copy.sinDato : formatoEntero(n));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center border-b border-hairline px-3 py-2 lg:hidden">
        <Button variant="ghost" size="sm" onClick={onVolver} className="gap-1 px-2">
          <ChevronLeft size={16} aria-hidden />
          {copy.volver}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <motion.div
          key={consulta.id}
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease }}
          className="flex flex-col gap-6 px-5 py-6 lg:px-6"
        >
          {/* Identidad completa a la vista: se audita a personas. */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-13 font-semibold text-accent-fg"
            >
              {inicialesDe(usuario)}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="truncate font-ui text-14 font-semibold text-text-1">{nombreDe(usuario)}</p>
              <p className="truncate font-ui text-12 text-text-2">{usuario.correo ?? copy.cuentaEliminada}</p>
              <p className="truncate font-ui text-12 text-text-3">
                {usuario.rol ?? copy.sinDato} · {copy.conversacion} {consulta.conversacionId}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
              <p className="hidden font-ui text-12 tabular-nums text-text-3 sm:block">
                {copy.hecha(formatoFechaLarga(consulta.creadoEn), formatoHora(consulta.creadoEn))}
              </p>
              <StatusPill
                label={copy.estados[consulta.estado]}
                tone={consulta.estado === 'completa' ? 'green' : consulta.estado === 'error' ? 'red' : 'amber'}
              />
            </div>
          </div>

          {consulta.estado === 'error' && (
            <Banner tone="red">{copy.error(consulta.error ?? copy.sinDato)}</Banner>
          )}
          {consulta.estado === 'cancelada' && <Banner tone="amber">{copy.cancelada}</Banner>}

          <section className="flex flex-col gap-1.5">
            <h3 className="font-ui text-13 font-medium text-text-2">{copy.pregunta}</h3>
            <p className="max-w-[68ch] whitespace-pre-wrap rounded-tarjeta bg-bg px-4 py-3 font-ui text-15 leading-relaxed text-text-1">
              {consulta.pregunta}
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-ui text-13 font-medium text-text-2">{copy.respuesta}</h3>
            {consulta.respuesta ? (
              <Markdown className="max-w-[72ch]">{consulta.respuesta}</Markdown>
            ) : (
              <div className="rounded-tarjeta border border-dashed border-hairlineStrong">
                <EmptyState icon={MessageSquareOff} title={copy.sinRespuesta} description={copy.sinRespuestaDetalle} />
              </div>
            )}
          </section>

          <div className="border-t border-dashed border-hairlineStrong" role="separator" />

          <section className="flex flex-col gap-3">
            <h3 className="font-ui text-13 font-medium text-text-2">{copy.metricas}</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Metrica nombre={copy.modelo} valor={consulta.modelo ?? copy.sinDato} />
              <Metrica nombre={copy.perfil} valor={consulta.perfil} />
              <Metrica
                nombre={copy.costo}
                valor={consulta.costoUsd != null ? formatoUsd(consulta.costoUsd) : copy.sinDato}
              />
              <Metrica
                nombre={copy.tokens}
                valor={formatoEntero(tokensTotales(tokens))}
                detalle={copy.tokensDetalle(
                  fmt(tokens.entrada),
                  fmt(tokens.salida),
                  fmt(tokens.cacheLectura),
                  fmt(tokens.cacheEscritura)
                )}
              />
              <Metrica nombre={copy.vueltas} valor={fmt(consulta.vueltas)} />
              <Metrica
                nombre={copy.duracion}
                valor={consulta.duracionMs != null ? formatoDuracion(consulta.duracionMs) : copy.sinDato}
              />
              <Metrica
                nombre={copy.herramientas}
                valor={consulta.herramientas.length ? consulta.herramientas.join(', ') : copy.sinHerramientas}
                ancho
              />
            </dl>
          </section>
        </motion.div>
      </div>
    </div>
  );
}

function Metrica({
  nombre,
  valor,
  detalle,
  ancho = false,
}: {
  nombre: string;
  valor: ReactNode;
  detalle?: string;
  ancho?: boolean;
}) {
  return (
    <div className={ancho ? 'col-span-2 sm:col-span-3' : undefined}>
      <dt className="font-ui text-12 text-text-3">{nombre}</dt>
      <dd className="mt-0.5 break-words font-ui text-14 font-medium tabular-nums text-text-1">{valor}</dd>
      {detalle && <dd className="mt-0.5 font-ui text-12 tabular-nums text-text-3">{detalle}</dd>}
    </div>
  );
}

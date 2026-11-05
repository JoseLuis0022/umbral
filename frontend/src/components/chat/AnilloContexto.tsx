import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { CategoriaContexto, ContextoSesion } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { PanelAnclado } from '../ui';
import { copyLocal } from './copyLocal';

/**
 * Indicador de contexto de la sesión, en círculo (el `/context` de Claude
 * Code, compacto). El anillo se llena con lo que ocupa la conversación; al
 * hacer clic, un panel muestra el desglose que devuelve `get_context_usage`.
 *
 * El dato llega con el evento `fin` de cada respuesta, así que refleja el
 * contexto DESPUÉS de la última respuesta: es lo que viajará en la siguiente.
 *
 * Sin dato NO se dibuja. Un anillo vacío y deshabilitado en la barra se leía
 * como un botón de radio sin marcar; aparece con la primera respuesta.
 */

/** Claude Code nombra las categorías en inglés; aquí se dicen en español. */
const NOMBRES: Record<string, string> = {
  'System prompt': 'Instrucciones del sistema',
  'System tools': 'Herramientas del sistema',
  'MCP tools': 'Herramientas MCP',
  'Custom agents': 'Agentes',
  'Memory files': 'Memoria',
  Skills: 'Skills',
  Messages: 'Mensajes',
  'Autocompact buffer': 'Reserva de autocompactación',
  'Free space': 'Libre',
};

/** Color por categoría, siempre desde los tokens. Lo libre no pinta. */
const COLORES: Record<string, string> = {
  'System prompt': 'var(--text-2)',
  'System tools': 'var(--status-blue)',
  'MCP tools': 'var(--status-green)',
  'Custom agents': 'var(--status-amber)',
  'Memory files': 'var(--status-amber)',
  Skills: 'var(--status-red)',
  Messages: 'var(--accent)',
  'Autocompact buffer': 'var(--hairline-strong)',
};

const COMPACTO = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const PCT = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

const libre = (c: CategoriaContexto) => c.nombre === 'Free space';

export function AnilloContexto({ contexto, className }: { contexto?: ContextoSesion; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);
  const reducido = useReducedMotion();

  // Se calcula aquí y no con `porcentaje`: el agente lo redondea a entero, y
  // con ventanas de 1M tokens casi todo saldría "0 %".
  const pct = contexto && contexto.maximo > 0 ? (contexto.usados / contexto.maximo) * 100 : 0;
  const radio = 7;
  const circunferencia = 2 * Math.PI * radio;
  const etiqueta = contexto
    ? copyLocal.contextoResumen(COMPACTO.format(contexto.usados), COMPACTO.format(contexto.maximo), PCT.format(pct))
    : copyLocal.contextoSinDato;

  const visibles = contexto?.categorias.filter((c) => !c.diferida && c.tokens > 0) ?? [];

  if (!contexto) return null;

  return (
    <>
      <motion.button
        ref={disparador}
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={etiqueta}
        title={etiqueta}
        aria-expanded={abierto}
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reducido ? { duration: dur.fast, ease } : springPanel}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-[120ms] hover:bg-tinta/[.05]',
          abierto && 'bg-tinta/[.05]',
          className
        )}
      >
        <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] -rotate-90" aria-hidden="true">
          <circle cx="9" cy="9" r={radio} fill="none" stroke="var(--hairline-strong)" strokeWidth="2" />
          <circle
            cx="9"
            cy="9"
            r={radio}
            fill="none"
            stroke={pct > 80 ? 'var(--status-amber)' : 'var(--accent)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            // Un mínimo visible: con 0.5 % el arco no se vería y el anillo
            // parecería vacío aunque la sesión ya tenga algo.
            strokeDashoffset={circunferencia * (1 - Math.max(2, Math.min(pct, 100)) / 100)}
            className="transition-[stroke-dashoffset] duration-500 ease-umbral"
          />
        </svg>
      </motion.button>

      {contexto && (
        <PanelAnclado
          abierto={abierto}
          cerrar={() => setAbierto(false)}
          disparadorRef={disparador}
          tituloHoja={copyLocal.contextoTitulo}
          ancho={320}
        >
          <div className="flex flex-col gap-3 p-4">
            <div>
              <p className="font-ui text-13 font-medium text-text-1">{copyLocal.contextoTitulo}</p>
              <p className="font-ui text-12 tabular-nums text-text-2">{etiqueta}</p>
            </div>

            {/* Barra apilada: el mismo reparto que la lista, de un vistazo. */}
            <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-hairline" aria-hidden="true">
              {visibles
                .filter((c) => !libre(c))
                .map((c) => (
                  <span
                    key={c.nombre}
                    style={{ width: `${(c.tokens / contexto.maximo) * 100}%`, background: COLORES[c.nombre] ?? 'var(--text-3)' }}
                    className="h-full min-w-[2px]"
                  />
                ))}
              {contexto.umbralCompactacion && (
                <span
                  title={copyLocal.contextoUmbral}
                  className="absolute inset-y-0 w-px bg-tinta/40"
                  style={{ left: `${(contexto.umbralCompactacion / contexto.maximo) * 100}%` }}
                />
              )}
            </div>

            <ul className="flex flex-col gap-1.5">
              {visibles.map((c) => (
                <li key={c.nombre} className="flex items-center gap-2 font-ui text-12">
                  <span
                    className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', libre(c) && 'border border-hairlineStrong')}
                    style={libre(c) ? undefined : { background: COLORES[c.nombre] ?? 'var(--text-3)' }}
                  />
                  <span className="min-w-0 flex-1 truncate text-text-1">{NOMBRES[c.nombre] ?? c.nombre}</span>
                  <span className="tabular-nums text-text-2">{COMPACTO.format(c.tokens)}</span>
                  <span className="w-12 text-right tabular-nums text-text-3">
                    {PCT.format((c.tokens / contexto.maximo) * 100)} %
                  </span>
                </li>
              ))}
            </ul>

            {contexto.umbralCompactacion && (
              <p className="border-t border-tinta/[.07] pt-2.5 font-ui text-12 leading-snug text-text-3">
                {copyLocal.contextoCompactacion(COMPACTO.format(Math.max(0, contexto.umbralCompactacion - contexto.usados)))}
              </p>
            )}
          </div>
        </PanelAnclado>
      )}
    </>
  );
}

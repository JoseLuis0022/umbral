import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, MessagesSquare, ShieldAlert, Timer, Users } from 'lucide-react';
import { AnimatedNumber, KpiCard } from '../../ui';
import { cn } from '../../../lib/cn';
import type { ResumenTablero } from '../../../services/tablero.service';
import { aHoras, entero, pesos, plural, porcentaje, unaDecimal } from './formato';

const TEXTO = {
  conversaciones: 'Conversaciones',
  personas: 'Personas activas',
  horas: 'Horas ahorradas',
  dinero: 'Costo evitado',
  riesgo: 'Conversaciones de riesgo alto',
  riesgoCorto: 'Riesgo alto',
  sinComparacion: 'Sin periodo anterior con qué comparar',
  subeDesc: (n: number) => `${n} por ciento más que el periodo anterior`,
  bajaDesc: (n: number) => `${n} por ciento menos que el periodo anterior`,
  deDirectorio: (activas: number, total: number) =>
    `${entero(activas)} de ${entero(total)} personas del directorio`,
  jornadas: (n: number) => `Equivale a ${unaDecimal(n)} jornadas de 8 horas`,
  porHora: (n: number) => `${pesos(n)} evitados por hora de uso`,
  analizadas: (n: number) => `de ${plural(n, 'conversación analizada', 'conversaciones analizadas')}`,
  sinRiesgo: 'Ninguna conversación cruzó la política',
  sinAnalisis: 'Todavía sin conversaciones analizadas',
};

/**
 * Delta contra el periodo anterior.
 *
 * Verde cuando sube, ÁMBAR cuando baja — no rojo. En este sistema el rojo
 * terroso (`--status-red`) significa riesgo, y una caída de uso no es un
 * peligro: es algo que hay que mirar. Pintarla del mismo color que una
 * conversación que expuso datos personales igualaría dos cosas que un
 * directivo tiene que poder distinguir de reojo.
 *
 * Cuando la variación llega en `null` este componente no se renderiza: el
 * servicio devuelve `null` justamente porque no hay base de comparación, y un
 * "0 %" inventado se leería como "no cambió nada", que es una afirmación
 * distinta y falsa.
 */
function Delta({ variacion }: { variacion: number }) {
  const sube = variacion >= 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      // El bloque entero es un solo dato para el lector de pantalla: leer
      // "flecha arriba, más, 18, por ciento" por separado no dice nada.
      role="img"
      aria-label={sube ? TEXTO.subeDesc(variacion) : TEXTO.bajaDesc(Math.abs(variacion))}
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap font-ui text-13 font-semibold leading-none',
        sube ? 'text-status-green' : 'text-status-amber'
      )}
    >
      <Icono size={14} strokeWidth={2.5} aria-hidden />
      {porcentaje(variacion)}
    </span>
  );
}

/** Cifra + delta en la misma línea base, para que se lean como un solo dato. */
function Cifra({ children, delta }: { children: ReactNode; delta?: ReactNode }) {
  return (
    <span className="flex items-baseline gap-2">
      {children}
      {delta}
    </span>
  );
}

/**
 * Fila de KPIs del tablero.
 *
 * Orden deliberado: primero el VOLUMEN (se usa), luego el RETORNO (horas y
 * pesos) y al final el RIESGO. Es la secuencia de preguntas que hace un
 * directivo —"¿esto se usa?", "¿cuánto nos ahorra?", "¿dónde tengo un
 * problema?"— y la última tarjeta es la que se queda en la cabeza.
 */
export function FilaKpis({ resumen, periodoEtiqueta }: { resumen: ResumenTablero; periodoEtiqueta: string }) {
  const horas = aHoras(resumen.minutosAhorrados);
  const analizadas = resumen.riesgoAlto + resumen.riesgoMedio + resumen.riesgoBajo;
  const hayRiesgo = resumen.riesgoAlto > 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        icon={MessagesSquare}
        label={TEXTO.conversaciones}
        detail={resumen.variacionConversaciones === null ? TEXTO.sinComparacion : periodoEtiqueta}
        value={
          <Cifra
            delta={
              resumen.variacionConversaciones !== null && (
                <Delta variacion={resumen.variacionConversaciones} />
              )
            }
          >
            <AnimatedNumber value={resumen.conversaciones} format={entero} />
          </Cifra>
        }
      />

      <KpiCard
        icon={Users}
        label={TEXTO.personas}
        detail={TEXTO.deDirectorio(resumen.personasActivas, resumen.personasTotales)}
        value={<AnimatedNumber value={resumen.personasActivas} format={entero} />}
      />

      <KpiCard
        icon={Timer}
        label={TEXTO.horas}
        detail={TEXTO.jornadas(horas / 8)}
        value={
          <Cifra>
            <AnimatedNumber value={horas} format={unaDecimal} />
            <span className="font-ui text-15 text-text-2">h</span>
          </Cifra>
        }
      />

      <KpiCard
        icon={Banknote}
        label={TEXTO.dinero}
        detail={
          resumen.variacionCosto === null ? TEXTO.sinComparacion : TEXTO.porHora(resumen.pesosPorHora)
        }
        value={
          <Cifra delta={resumen.variacionCosto !== null && <Delta variacion={resumen.variacionCosto} />}>
            <AnimatedNumber value={resumen.costoEvitadoMxn} format={pesos} />
          </Cifra>
        }
      />

      {/*
        El riesgo NO puede vestir el rojo de marca. `KpiCard` fija el badge del
        icono en `bg-accent-soft`/`text-accent-fg`, así que aquí se repinta al
        rojo terroso de estatus mediante el hijo — es un parche local a la
        espera de que `KpiCard` acepte un `tono` (ver reporte). Cuando no hay
        ninguna conversación de riesgo alto el badge va en verde: cero es una
        buena noticia y teñirla de rojo dejaría de distinguir la alarma real.
      */}
      <KpiCard
        icon={ShieldAlert}
        label={TEXTO.riesgoCorto}
        detail={
          analizadas === 0
            ? TEXTO.sinAnalisis
            : hayRiesgo
              ? TEXTO.analizadas(analizadas)
              : TEXTO.sinRiesgo
        }
        className={
          hayRiesgo
            ? '[&>span:first-child]:bg-status-red-soft [&>span:first-child]:text-status-red'
            : '[&>span:first-child]:bg-status-green-soft [&>span:first-child]:text-status-green'
        }
        value={
          <span
            aria-label={`${TEXTO.riesgo}: ${entero(resumen.riesgoAlto)}`}
            className={hayRiesgo ? 'text-status-red' : 'text-text-1'}
          >
            <AnimatedNumber value={resumen.riesgoAlto} format={entero} />
          </span>
        }
      />
    </div>
  );
}

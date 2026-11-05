import { motion } from 'framer-motion';
import { dur, ease } from '../../../lib/motion';
import { formatoDuracion, formatoEntero, formatoUsd, tokensAprox } from './formato';
import { copyLab } from './copyLocal';
import type { MetricasRespuesta } from './tipos';

/**
 * Las cinco cifras de una respuesta. `Primer fragmento` va primero a
 * propósito: es la que decide si la pantalla se siente viva.
 *
 * Dos modos, según lo que haya llegado:
 *
 *  - **Con `consumo`** (backend real): costo, vueltas y tokens MEDIDOS por la
 *    API, incluida la caché. Es la fila que importa en este laboratorio.
 *  - **Sin `consumo`** (simulador): fragmentos, caracteres y tokens ESTIMADOS,
 *    marcados como estimación por partida triple —etiqueta, signo ≈ y
 *    explicación al pasar el cursor—, porque en una pantalla que existe para
 *    medir, una estimación disfrazada de medición es peor que no dar el dato.
 *
 * Se pinta como una rejilla que crece de dos a cinco columnas, nunca como una
 * frase corrida: son números que se comparan entre respuestas, y comparar exige
 * que estén siempre en el mismo sitio.
 */
export function Metricas({ metricas, modelo }: { metricas: MetricasRespuesta; modelo?: string }) {
  const { consumo } = metricas;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.base, ease }}
      className="flex flex-col gap-2 rounded-menu bg-tinta/[.03] px-3.5 py-3"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        <Cifra
          etiqueta={copyLab.metricaPrimer}
          valor={
            metricas.msPrimerFragmento === null
              ? copyLab.metricaSinDato
              : formatoDuracion(metricas.msPrimerFragmento)
          }
        />
        <Cifra etiqueta={copyLab.metricaTotal} valor={formatoDuracion(metricas.msTotal)} />

        {consumo ? (
          <>
            <Cifra
              etiqueta={copyLab.metricaVueltas}
              valor={consumo.vueltas === null ? copyLab.metricaSinDato : formatoEntero(consumo.vueltas)}
              detalle={copyLab.metricaVueltasDetalle}
            />
            <Cifra
              etiqueta={copyLab.metricaCosto}
              valor={consumo.costoUsd === null ? copyLab.metricaSinDato : formatoUsd(consumo.costoUsd)}
              detalle={copyLab.metricaCostoDetalle}
            />
            <Cifra
              etiqueta={copyLab.metricaTokensReales}
              valor={formatoEntero(
                consumo.tokens.entrada +
                  consumo.tokens.cacheLectura +
                  consumo.tokens.cacheEscritura +
                  consumo.tokens.salida
              )}
              detalle={copyLab.metricaTokensRealesDetalle(
                formatoEntero(consumo.tokens.entrada),
                formatoEntero(consumo.tokens.cacheLectura),
                formatoEntero(consumo.tokens.cacheEscritura),
                formatoEntero(consumo.tokens.salida)
              )}
            />
          </>
        ) : (
          <>
            <Cifra etiqueta={copyLab.metricaFragmentos} valor={formatoEntero(metricas.fragmentos)} />
            <Cifra etiqueta={copyLab.metricaCaracteres} valor={formatoEntero(metricas.caracteres)} />
            <Cifra
              etiqueta={copyLab.metricaTokens}
              valor={`≈ ${formatoEntero(tokensAprox(metricas.caracteres))}`}
              detalle={copyLab.metricaTokensDetalle(
                formatoEntero(tokensAprox(metricas.caracteresEntrada)),
                formatoEntero(tokensAprox(metricas.caracteres))
              )}
            />
          </>
        )}
      </dl>

      {/* El modelo que REPORTÓ el agente gana al que se pidió: si el backend
          cayó a otro, aquí se ve. */}
      {(consumo?.modelo ?? modelo) && (
        <p className="truncate font-mono text-12 text-text-3" title={consumo?.modelo ?? modelo}>
          {consumo?.modelo ?? modelo}
        </p>
      )}
    </motion.div>
  );
}

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="flex min-w-0 flex-col" title={detalle}>
      <dt className="truncate font-ui text-12 text-text-3">{etiqueta}</dt>
      <dd className="font-ui text-15 font-semibold tabular-nums text-text-1">{valor}</dd>
    </div>
  );
}

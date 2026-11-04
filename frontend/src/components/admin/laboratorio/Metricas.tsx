import { motion } from 'framer-motion';
import { dur, ease } from '../../../lib/motion';
import { formatoDuracion, formatoEntero, tokensAprox } from './formato';
import { copyLab } from './copyLocal';
import type { MetricasRespuesta } from './tipos';

/**
 * Las cinco cifras de una respuesta. `Primer fragmento` va primero a
 * propósito: es la que decide si la pantalla se siente viva, y en un sistema
 * multi-agente puede ser cuatro veces mayor que en una pregunta directa.
 *
 * Se pinta como una rejilla que crece de dos a cinco columnas, nunca como una
 * frase corrida: son números que se comparan entre respuestas, y comparar exige
 * que estén siempre en el mismo sitio.
 *
 * "Tokens aprox." es la única cifra ESTIMADA de la fila y se marca como tal por
 * partida triple —etiqueta, signo ≈ y explicación al pasar el cursor— porque en
 * una pantalla que existe para medir, una estimación disfrazada de medición es
 * peor que no dar el dato. Ver `tokensAprox` en formato.ts para el porqué.
 */
export function Metricas({ metricas, modelo }: { metricas: MetricasRespuesta; modelo?: string }) {
  const tokensSalida = tokensAprox(metricas.caracteres);
  const tokensEntrada = tokensAprox(metricas.caracteresEntrada);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.base, ease }}
      className="flex flex-col gap-2 rounded-tarjeta border border-hairline bg-bg px-4 py-3"
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
        <Cifra etiqueta={copyLab.metricaFragmentos} valor={formatoEntero(metricas.fragmentos)} />
        <Cifra etiqueta={copyLab.metricaCaracteres} valor={formatoEntero(metricas.caracteres)} />
        {/* Se muestran los de SALIDA, que son los que crecen con la respuesta y
            los que se comparan entre modelos; los de entrada viajan en el
            title para no meter seis cifras apretadas en la misma fila. */}
        <Cifra
          etiqueta={copyLab.metricaTokens}
          valor={`≈ ${formatoEntero(tokensSalida)}`}
          detalle={copyLab.metricaTokensDetalle(formatoEntero(tokensEntrada), formatoEntero(tokensSalida))}
        />
      </dl>

      {modelo && (
        <p className="truncate font-mono text-12 text-text-3" title={modelo}>
          {modelo}
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

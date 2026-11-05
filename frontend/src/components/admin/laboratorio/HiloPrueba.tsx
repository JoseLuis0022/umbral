import { memo } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, ScissorsLineDashed } from 'lucide-react';
import { Markdown } from '../../Markdown';
import { EmptyState, Skeleton } from '../../ui';
import { cn } from '../../../lib/cn';
import { springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { CadenaAgentes, ResumenCadena } from './CadenaAgentes';
import { Metricas } from './Metricas';
import { copyLab } from './copyLocal';
import type { EstadoLab, MensajeLab, PasoAgente } from './tipos';

/**
 * Hilo de la conversación de prueba.
 *
 * La asimetría es la misma que en /chat y por el mismo motivo: la pregunta del
 * administrador es una burbuja corta a la derecha; la respuesta ocupa el ancho
 * completo porque trae markdown, tablas y bloques de código. Lo que cambia
 * aquí es el PIE de cada respuesta: cadena de agentes y métricas. En el chat de
 * la comunidad estorbarían; en el laboratorio son el producto.
 */
export function HiloPrueba({
  mensajes,
  textoParcial,
  estado,
  cadenaViva,
}: {
  mensajes: MensajeLab[];
  textoParcial: string;
  estado: EstadoLab;
  cadenaViva: PasoAgente[];
}) {
  const activo = estado === 'esperando' || estado === 'transmitiendo';

  return (
    // `role="log"`: los mensajes se anuncian conforme se añaden, sin robar el
    // foco de quien está escribiendo la siguiente pregunta.
    <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-8">
      {mensajes.map((mensaje) =>
        mensaje.rol === 'usuario' ? (
          <PreguntaPrueba key={mensaje.id} mensaje={mensaje} />
        ) : (
          <RespuestaPrueba key={mensaje.id} mensaje={mensaje} />
        )
      )}

      {activo && (
        <div className="flex flex-col gap-3">
          {cadenaViva.length > 0 && <CadenaAgentes pasos={cadenaViva} />}
          {textoParcial ? (
            <RespuestaViva texto={textoParcial} transmitiendo={estado === 'transmitiendo'} />
          ) : (
            <EsqueletoRespuesta conCadena={cadenaViva.length > 0} />
          )}
        </div>
      )}
    </div>
  );
}

/*
 * `memo` en las dos piezas del hilo: es la misma corrección que en /chat.
 * Mientras llega texto, esta pantalla se re-renderiza una vez por frame, y sin
 * memo cada mensaje ya cerrado volvía a ejecutar su `motion.article`, su
 * `ResumenCadena` y sus `Metricas` en cada uno de esos frames — decenas de
 * nodos de Framer revisando props de animación para pintar lo mismo. Los props
 * ya son estables: `mensaje` es un objeto congelado al confirmarse.
 */
const PreguntaPrueba = memo(function PreguntaPrueba({ mensaje }: { mensaje: MensajeLab }) {
  const reducido = useReducedMotion();
  return (
    <motion.article
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-tarjeta rounded-br-celda border border-hairline bg-surface-1 px-4 py-2.5 shadow-1">
        {/* Lo que se escribió se conserva tal cual: la pregunta no es markdown. */}
        <p className="whitespace-pre-wrap break-words font-ui text-15 leading-relaxed text-text-1">
          {mensaje.contenido}
        </p>
      </div>
    </motion.article>
  );
});

const RespuestaPrueba = memo(function RespuestaPrueba({ mensaje }: { mensaje: MensajeLab }) {
  const reducido = useReducedMotion();
  return (
    <motion.article
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className="flex flex-col gap-3"
    >
      {mensaje.contenido ? (
        <Markdown>{mensaje.contenido}</Markdown>
      ) : (
        // Sin texto no hay nada que pintar, pero el hueco tiene que explicarse:
        // un mensaje en blanco parecería un fallo de la pantalla.
        <p className="font-ui text-13 italic text-text-3">
          {mensaje.incompleta ? copyLab.respuestaIncompleta : copyLab.respuestaVacia}
        </p>
      )}

      {mensaje.incompleta && mensaje.contenido && (
        <p className="flex items-center gap-1.5 font-ui text-12 text-text-3">
          <ScissorsLineDashed size={13} strokeWidth={2} aria-hidden />
          {copyLab.respuestaIncompleta}
        </p>
      )}

      {mensaje.cadena && mensaje.cadena.length > 0 && <ResumenCadena pasos={mensaje.cadena} />}
      {mensaje.metricas && <Metricas metricas={mensaje.metricas} modelo={mensaje.modelo} />}
    </motion.article>
  );
});

/**
 * Texto que va llegando. Mientras transmite se OCULTA al lector de pantalla y
 * en su lugar se anuncia una sola vez que el asistente escribe: sin esto, cada
 * fragmento — decenas por segundo — se leería en voz alta como contenido nuevo.
 */
const RespuestaViva = memo(function RespuestaViva({
  texto,
  transmitiendo,
}: {
  texto: string;
  transmitiendo: boolean;
}) {
  return (
    <div className="relative">
      {transmitiendo && (
        <span role="status" className="sr-only">
          {copyLab.escribiendo}
        </span>
      )}
      <div aria-hidden={transmitiendo}>
        <Markdown>{texto}</Markdown>
      </div>
      {/* Cursor por CSS y no por keyframes de Framer: este componente se
          re-renderiza una vez por frame mientras llega texto, y un
          `animate={{ opacity: [1, 0.15, 1] }}` crea un array NUEVO en cada uno
          de esos renders. Framer lo lee como otro destino y reinicia el
          parpadeo sesenta veces por segundo, así que el cursor se quedaba
          clavado sin llegar a parpadear — y recalculando la animación cada
          frame. En CSS vive en el compositor y sobrevive a los renders. Es el
          mismo arreglo, y por lo mismo, que en el chat. */}
      {transmitiendo && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] animate-parpadeo rounded-[2px] bg-accent align-baseline"
        />
      )}
    </div>
  );
});

/**
 * Espera antes del primer fragmento. Las barras miden 16 px con 6 px de
 * separación — exactamente el interlineado de 22 px del cuerpo — para que al
 * llegar el texto real la altura no cambie y el hilo no brinque.
 *
 * Cuando la cadena de agentes ya está informando quién trabaja, el rótulo
 * "Preparando respuesta…" sobra: sería decir dos veces lo mismo.
 */
function EsqueletoRespuesta({ conCadena }: { conCadena: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {!conCadena && (
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
          <span className="font-ui text-13 text-text-3">{copyLab.pensando}</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5" aria-hidden>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[68%]" />
      </div>
    </div>
  );
}

/**
 * Estado vacío. Los ejemplos son pulsables y NO se envían solos: cargan el
 * campo para que el administrador pueda retocarlos antes de probar — que es lo
 * que hace cualquiera que esté afinando un system prompt.
 */
export function EstadoVacioLab({ onEjemplo }: { onEjemplo: (pregunta: string) => void }) {
  return (
    <EmptyState
      icon={FlaskConical}
      title={copyLab.vacioTitulo}
      description={copyLab.vacioDetalle}
      action={
        <ul className="flex max-w-lg flex-wrap justify-center gap-2">
          {copyLab.ejemplos.map((pregunta) => (
            <li key={pregunta}>
              <motion.button
                type="button"
                onClick={() => onEjemplo(pregunta)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className={cn(
                  'rounded-control border border-hairline bg-surface-1 px-3 py-2 font-ui text-13 text-text-2 shadow-1',
                  'transition-colors duration-150 hover:border-accent/30 hover:bg-accent-soft hover:text-accent-fg'
                )}
              >
                {pregunta}
              </motion.button>
            </li>
          ))}
        </ul>
      }
    />
  );
}

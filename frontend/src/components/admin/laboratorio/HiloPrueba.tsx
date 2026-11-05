import { memo } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, ScissorsLineDashed } from 'lucide-react';
import { Markdown, MarkdownEnVivo } from '../../Markdown';
import { EmptyState } from '../../ui';
import { BurbujaTrabajando, PensandoUmbral } from '../../chat/IndicadorPensando';
import { entradaMensaje, entradaMensajeUsuario, entradaReducida, springPress } from '../../../lib/motion';
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
    <div role="log" aria-live="polite" aria-relevant="additions" className="mx-auto flex w-full max-w-[680px] flex-col gap-7">
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
            <EsperaPrueba cadena={cadenaViva} />
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
    <motion.article {...(reducido ? entradaReducida : entradaMensajeUsuario)} className="flex justify-end">
      <div className="max-w-[80%] rounded-burbuja bg-burbuja px-4 py-2.5">
        {/* Lo que se escribió se conserva tal cual: la pregunta no es markdown. */}
        <p className="whitespace-pre-wrap break-words font-ui text-15 leading-6 text-text-1">
          {mensaje.contenido}
        </p>
      </div>
    </motion.article>
  );
});

const RespuestaPrueba = memo(function RespuestaPrueba({ mensaje }: { mensaje: MensajeLab }) {
  const reducido = useReducedMotion();
  return (
    <motion.article {...(reducido ? entradaReducida : entradaMensaje)} className="flex flex-col gap-3">
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
        {/* Por bloques, como en /chat: solo el último se vuelve a analizar. */}
        <MarkdownEnVivo>{texto}</MarkdownEnVivo>
      </div>
      {/* La misma burbujita de "sigue trabajando" que /chat, en CSS: este
          componente se re-renderiza una vez por frame mientras llega texto. */}
      {transmitiendo && <BurbujaTrabajando etiqueta={copyLab.escribiendo} className="mt-3" />}
    </div>
  );
});

/**
 * Espera antes del primer fragmento: el isotipo vivo de /chat, sin barras de
 * skeleton. La frase es el paso que corre ahora (aquí con su dato técnico,
 * porque es una pantalla para medir) o "Preparando respuesta…".
 */
function EsperaPrueba({ cadena }: { cadena: PasoAgente[] }) {
  let frase: string = copyLab.pensando;
  for (let i = cadena.length - 1; i >= 0; i--) {
    if (cadena[i].estado === 'trabajando') {
      frase = cadena[i].nombre;
      break;
    }
  }
  return <PensandoUmbral frase={frase} />;
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
                whileTap={{ scale: 0.97 }}
                transition={springPress}
                className="min-h-9 rounded-pastilla bg-surface-1 px-3.5 py-1.5 font-ui text-13 text-text-2 shadow-anillo transition-colors duration-[120ms] hover:bg-tinta/[.04] hover:text-text-1"
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

import { useId, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy, springSoft } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { IconButton } from '../ui';
import { AyudaEmergente } from './AyudaEmergente';
import { CONSULTA_ANCHA, CONSULTA_ESCRITORIO, usarConsultaMedia } from './usarConsultaMedia';

/**
 * Ancho del carril: 60 px.
 *
 * No es un número redondo por gusto, es la suma de un requisito de
 * accesibilidad y del aire mínimo que necesita: 44 px de diana táctil (el
 * mínimo del manual) + 8 px a cada lado. Cualquier cosa por debajo obliga a
 * apuntar; por encima de 64 el carril deja de leerse como "una tira de
 * iconos" y empieza a parecer una columna estrecha a medio plegar.
 *
 * De propina, es el ancho exacto en el que caben centrados los tres
 * identificadores que el carril tiene que mostrar: el avatar de 32 px de
 * auditoría, la ficha de categoría de 32 px de boletines y la etiqueta
 * MD/PDF de 36 px de corpus.
 */
export const ANCHO_CARRIL = 60;

/** Alto reservado arriba del carril para que el botón no tape el primer elemento. */
const ALTO_BOTON = 48;

/** Ancho desplegado por punto de corte. `xl` cae en `lg` si no se declara. */
export interface AnchoPanel {
  lg: number;
  xl?: number;
}

/** Lo que el carril puede pedirle al panel que lo contiene. */
export interface ApiCarril {
  /** Despliega el panel. Lo usa el laboratorio para saltar a una sección. */
  desplegar: () => void;
}

/**
 * Panel lateral que se pliega a un carril de iconos.
 *
 * Es el mismo gesto que el historial de /chat —mismo icono, mismo sitio, misma
 * física— con una diferencia deliberada: aquí NO se pliega hasta desaparecer.
 * En el chat, plegar el historial es "quítate de en medio"; en las cuatro
 * pantallas de administración, la lista de la izquierda es de dónde se elige lo
 * que se está mirando a la derecha, y hacerla desaparecer obligaría a
 * desplegarla otra vez para cambiar de elemento. El carril conserva lo mínimo
 * para seguir saltando entre elementos con el panel plegado.
 *
 * CUATRO DECISIONES QUE EXPLICAN EL ARCHIVO
 *
 *  1. **El relevo lista → carril es un CRUCE, y la caja que encoge tiene fondo
 *     propio.** Esperar al final del pliegue para ocultar el interior dejaba
 *     casi medio segundo de lista guillotinada a media palabra ("Restablece tu
 *     contrase|"), que es justo lo que se lee como un fallo. Y esconderla de
 *     golpe sin más dejaba una franja vacía encogiéndose, que se lee igual de
 *     mal. La salida es hacer las dos cosas a la vez: la caja que se anima
 *     lleva su propia superficie (`bg-surface-1` + filete INTERIOR, que no
 *     ocupa layout y por tanto no desalinea el contenido de ancho fijo), así
 *     que puede quedarse vacía sin parecer rota; encima, el interior se
 *     desvanece al EMPEZAR el pliegue y el carril se monta en ese mismo
 *     instante y entra con un retardo corto. Lo que se ve es una tarjeta
 *     sólida encogiéndose mientras su contenido se cambia por el carril.
 *
 *  2. **Se anima `width`, que es cara, y se conserva a conciencia.** Plegar
 *     tiene que RECOLOCAR la columna de trabajo —es todo el objetivo del
 *     gesto—, y eso no lo hace ningún `transform`. El coste está acotado: es
 *     una interacción puntual, no trabajo por frame, y el contenido de dentro
 *     va en una caja de ancho FIJO, así que solo se recalcula la caja de
 *     recorte y la columna principal; la lista no se re-maqueta mientras dura.
 *
 *  3. **El estado se recuerda POR PANTALLA.** Quien pliega la lista de
 *     Auditoría la quiere plegada mañana, y eso no dice nada sobre Corpus. De
 *     ahí que la clave de `localStorage` sea un prop y no una constante.
 *
 *  4. **Por debajo de `lg` esto no existe.** Ahí las cuatro pantallas ya se
 *     apilan en dos niveles (lista → detalle) y un carril de 60 px al lado de
 *     nada no aporta: el componente devuelve su contenido tal cual, sin
 *     envoltura ni botón. Ver `usarConsultaMedia` para por qué la decisión se
 *     toma en JavaScript y no con clases `lg:`.
 */
export function PanelPlegable({
  clave,
  ancho,
  anchoCarril = ANCHO_CARRIL,
  lado = 'izquierda',
  textoPlegar,
  textoDesplegar,
  carril,
  className,
  children,
}: {
  /**
   * Clave de `localStorage` (bajo el prefijo `umbral:`). Una por pantalla:
   * es lo que hace que plegar Auditoría no pliegue Corpus.
   */
  clave: string;
  /** Ancho desplegado, el que ya tenía la columna en cada punto de corte. */
  ancho: AnchoPanel;
  anchoCarril?: number;
  /** Dónde vive el panel. El laboratorio lo tiene a la derecha. */
  lado?: 'izquierda' | 'derecha';
  /** Nombre accesible del botón cuando el panel está abierto ("Plegar la lista"). */
  textoPlegar: string;
  /** …y cuando está plegado ("Desplegar la lista"). */
  textoDesplegar: string;
  /** Contenido del carril. Recibe la API si se declara como función. */
  carril: ReactNode | ((api: ApiCarril) => ReactNode);
  className?: string;
  children: ReactNode;
}) {
  const reducido = useReducedMotion();
  const tocado = useRef(false);
  const escritorio = usarConsultaMedia(CONSULTA_ESCRITORIO);
  const ancha = usarConsultaMedia(CONSULTA_ANCHA);
  const [plegado, setPlegado] = useLocalStorage<boolean>(clave, false);
  /*
   * Cómo estaba el panel en el MONTAJE, congelado. Quien vuelve a la pantalla
   * con el panel ya plegado tiene que encontrarse el carril puesto en el primer
   * pintado, sin fundido de entrada: ahí no hubo gesto que acompañar, y un
   * fundido al cargar se lee como que la pantalla llega a medio pintar.
   */
  const [arrancoPlegado] = useState(() => plegado);
  const idContenido = useId();

  // Por debajo de lg no hay ni envoltura ni botón: la pantalla apilada manda.
  if (!escritorio) return <>{children}</>;

  const anchoDesplegado = ancha ? (ancho.xl ?? ancho.lg) : ancho.lg;
  const esIzquierda = lado === 'izquierda';

  const Icono = esIzquierda
    ? plegado
      ? PanelLeft
      : PanelLeftClose
    : plegado
      ? PanelRight
      : PanelRightClose;
  const etiquetaBoton = plegado ? textoDesplegar : textoPlegar;

  /*
   * El botón se ancla al borde INTERIOR del panel (el que da a la columna de
   * trabajo), así que al plegarse viaja con ese borde en vez de saltar. Con el
   * panel abierto se pega a la esquina; con el carril se centra en sus 60 px,
   * que es donde el ojo lo busca cuando ya no hay esquina.
   */
  const desplazamiento = plegado ? (anchoCarril - 40) / 2 : 4;

  const desplegar = () => setPlegado(false);

  return (
    <motion.div
      initial={false}
      animate={{ width: plegado ? anchoCarril : anchoDesplegado }}
      transition={reducido ? { duration: 0 } : springSoft}
      // La sombra sube AQUÍ desde la tarjeta de dentro: con `overflow-hidden`
      // en la caja que se anima, la sombra del panel quedaría recortada contra
      // el recorte y el panel se vería plano frente al de al lado.
      //
      // Y con la sombra sube la SUPERFICIE, por el mismo motivo del comentario
      // (1) de arriba: durante el pliegue esta caja se queda momentáneamente
      // sin contenido opaco, y sin fondo propio enseñaría el lienzo de la
      // página por debajo. El filete va `inset` a propósito: un `border` real
      // metería 1 px de padding box y desplazaría el interior de ancho fijo,
      // que es justo lo que este componente se cuida de no tocar.
      className={cn(
        'relative min-h-0 overflow-hidden rounded-tarjeta bg-surface-1 shadow-1',
        'ring-1 ring-inset ring-hairline',
        className
      )}
    >
      {/* Primero en el DOM aunque se dibuje flotando: quien recorre la pantalla
          con el tabulador encuentra el interruptor ANTES que las cien filas que
          controla, no después. */}
      <div
        // El desplazamiento cambia de 4 px a centrado en el carril, y sin
        // transición ese salto de 6 px ocurría en un fotograma mientras el
        // borde al que el botón se ancla sí venía viajando suave.
        className="absolute top-1.5 z-20 transition-[left,right] duration-200 ease-umbral motion-reduce:transition-none"
        style={esIzquierda ? { right: desplazamiento } : { left: desplazamiento }}
      >
        {/* La ayuda sale hacia la columna de trabajo, nunca hacia dentro del
            panel: hacia dentro taparía justo la lista que se está mirando. */}
        <AyudaEmergente texto={etiquetaBoton} lado={esIzquierda ? 'derecha' : 'izquierda'}>
          <IconButton
            aria-label={etiquetaBoton}
            aria-expanded={!plegado}
            aria-controls={idContenido}
            onClick={() => {
              tocado.current = true;
              setPlegado(!plegado);
            }}
          >
            <motion.span
              // El icono no salta: se cruza consigo mismo con un giro corto, el
              // mismo feedback de microinteracción que dan los demás controles
              // del sistema. Con movimiento reducido, solo el cruce.
              key={plegado ? 'plegado' : 'abierto'}
              // Solo después de tocarlo: al montar la pantalla el ícono ya está
              // en su sitio (si giraba al entrar, era parpadeo, no respuesta).
              initial={!tocado.current ? false : reducido ? { opacity: 0 } : { opacity: 0, rotate: esIzquierda ? -20 : 20 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={reducido ? { duration: dur.fast, ease } : springSnappy}
              className="flex items-center justify-center"
            >
              <Icono size={18} />
            </motion.span>
          </IconButton>
        </AyudaEmergente>
      </div>

      {/*
        Ancho FIJO, el desplegado, pase lo que pase: es lo que hace que el
        interior no se re-maquete durante el pliegue. Lo que encoge es la caja
        de recorte de arriba, no la lista.

        Se ancla al borde EXTERIOR (el que no se mueve): el pliegue se come el
        panel por el lado que da a la columna de trabajo, que es de donde el
        gesto promete sacar el espacio. Sin el anclaje, un panel de la derecha
        —el laboratorio— se recortaría al revés y parecería que se desplaza en
        vez de encogerse.

        `invisible` y no solo recortado: con el panel plegado, el contenido
        seguiría siendo alcanzable con el tabulador y el foco se perdería dentro
        de algo que no se ve. `visibility` se transiciona junto con la opacidad
        para que el relevo con el carril sea un cruce y no un parpadeo — al
        ocultarse, la visibilidad cambia AL FINAL de la transición; al volver,
        al principio.

        El disparador es `plegado` —el gesto—, NO el final de la animación de
        ancho: el fundido tiene que correr MIENTRAS la caja encoge, que es lo
        que evita que se vea la lista cortada a media palabra.

        Al VOLVER, el mismo recorte pasa al revés —la caja aún es estrecha y el
        contenido ya está a plena opacidad—, así que el fundido de entrada sale
        con un retardo corto. El retardo vive en el estado destino (desplegado),
        que es de donde CSS toma la transición: al plegar no lo hay y el
        contenido se va de inmediato.
      */}
      <div
        id={idContenido}
        aria-hidden={plegado}
        style={{ width: anchoDesplegado }}
        className={cn(
          'absolute inset-y-0 transition-[opacity,visibility] duration-150 ease-umbral',
          esIzquierda ? 'left-0' : 'right-0',
          plegado ? 'invisible opacity-0' : 'delay-[80ms] motion-reduce:delay-0'
        )}
      >
        {children}
      </div>

      {plegado && (
        <motion.div
          // Sin fundido si la pantalla ya llegó plegada: ahí no hay gesto que
          // acompañar. El retardo es la otra mitad del cruce — le da al
          // interior sus 150 ms para irse, así que el carril no aparece
          // encima de una lista que todavía se está viendo.
          initial={arrancoPlegado || reducido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reducido ? { duration: 0 } : { duration: dur.fast, ease, delay: 0.08 }}
          style={{ width: anchoCarril }}
          className={cn(
            // Opaco y con su propio borde: tapa por completo la lista recortada
            // que sigue debajo, así que el carril se lee como un panel entero y
            // no como un panel a medio cerrar.
            'absolute inset-y-0 z-10 flex flex-col rounded-tarjeta border border-hairline bg-surface-1',
            esIzquierda ? 'left-0' : 'right-0'
          )}
        >
          {/* Hueco del botón, FUERA del scroll: dentro, los elementos pasarían
              por debajo del interruptor al desplazar la lista. */}
          <div className="shrink-0" style={{ height: ALTO_BOTON }} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
            {typeof carril === 'function' ? carril({ desplegar }) : carril}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

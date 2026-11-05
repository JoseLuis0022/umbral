import { forwardRef, useLayoutEffect, useRef, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useNavigationType, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { Loader2, SquarePen, Settings } from 'lucide-react';
import { cn } from '../lib/cn';
import { pageTransitionVariants } from '../lib/routeTransition';
import { MarcaProducto } from '../components/brand/Logo';
import { MenuUsuario } from '../components/shell/MenuUsuario';
import { NavAdmin } from '../components/shell/NavAdmin';
import { IconButton } from '../components/ui';
import { LimiteError } from '../components/LimiteError';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { chat as copyChat, navegacion as copyNav, ajustes as copyAjustes } from '../copy';

/**
 * Shell de la aplicación: cabecera fija arriba y contenido debajo.
 *
 * No hay barra lateral global a propósito. El único panel lateral de la app es
 * el historial de conversaciones, y vive DENTRO de /chat: si fuera global,
 * ocuparía ancho permanente en Ajustes y en Administración, donde no significa
 * nada.
 *
 * El scroll vive en el contenedor de contenido, no en el body, para que la
 * cabecera quede fija sin position:fixed y el rebote elástico de macOS no
 * arrastre la página entera.
 */
export function LayoutApp() {
  const location = useLocation();
  /*
   * UN solo shell para todas las pantallas. Antes el chat tenía su propio
   * <LayoutApp scrollPropio /> en otra rama de rutas: al pasar de Inicio a
   * Corpus, React veía otro componente, destruía la cabecera entera y la
   * volvía a construir — ese era el parpadeo. Ahora la cabecera nunca se
   * desmonta y solo cambia el contenido de abajo.
   */
  const scrollPropio = location.pathname === '/chat' || location.pathname.startsWith('/chat/');
  const { trabajosEnCurso } = useChat();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const { esAdmin } = useAuth();
  const contenido = useRef<HTMLElement>(null);

  /*
   * El contenido de la ruta se resuelve AQUÍ, con `useOutlet()`, en vez de
   * dejar un `<Outlet />` dentro del bloque animado.
   *
   * `<Outlet />` es un componente que lee la ruta del contexto, así que la
   * página que se está YENDO también renderizaba la ruta NUEVA: la animación de
   * salida desvanecía la pantalla entrante en lugar de la que se va, y durante
   * la transición se veían dos copias de la misma pantalla. `useOutlet()`
   * devuelve el elemento ya resuelto, y el bloque saliente conserva el suyo.
   */
  const contenidoRuta = useOutlet();

  /*
   * El scroll vuelve arriba al cambiar de ruta.
   *
   * El scroll de la app vive en este <main>, no en el documento, así que el
   * navegador no lo reinicia por su cuenta: la pantalla nueva se montaba
   * conservando el `scrollTop` de la anterior. Recorrer el tablero hasta abajo y
   * abrir otra pantalla la dejaba empezada a media página, y la transición
   * horizontal de 24 px se sumaba a un salto vertical de cientos.
   *
   * Va en `useLayoutEffect` para que ocurra ANTES del pintado (en un efecto
   * normal se vería un frame en la posición vieja), y se salta en POP: volver
   * atrás debe devolverte donde estabas, no al principio.
   */
  useLayoutEffect(() => {
    if (navType === 'POP') return;
    contenido.current?.scrollTo({ top: 0 });
  }, [location.pathname, navType]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg">
      {/* Sin `backdrop-blur`: el shell es una columna flex y la cabecera NO se
          superpone al contenido —el scroll vive en el <main> de abajo—, así que
          no había nada detrás que desenfocar. Lo único que hacía era obligar al
          navegador a mantener una capa de `backdrop-filter` de 100vw × 64 px y
          reprocesarla cada vez que algo cambiaba debajo, transiciones de ruta
          incluidas. El color no cambia: sin nada detrás, el 85 % resuelve igual. */}
      {/* En el chat (`scrollPropio`) la barra no lleva hairline ni fondo
          propio: debajo va la cabecera del chat, y dos líneas seguidas eran
          doble cromo. La única línea aparece cuando el hilo tiene scroll. */}
      <header
        className={cn(
          // El fondo y la línea cambian entre el chat y lo demás: con transición, no de golpe.
          'sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-colors duration-200 lg:px-6',
          scrollPropio ? 'border-transparent bg-bg' : 'border-hairline bg-surface-2'
        )}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <NavLink to="/chat" className="shrink-0" aria-label="Ir al inicio">
            <MarcaProducto />
          </NavLink>
          <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            <EnlaceNav to="/chat">
              {copyNav.inicio}
              {/* Una tarea del agente sigue en el servidor: se ve desde cualquier pantalla. */}
              {trabajosEnCurso > 0 && (
                <span title={copyChat.tareasEnCurso(trabajosEnCurso)} className="ml-1.5 inline-flex items-center">
                  <Loader2 size={13} strokeWidth={2.5} aria-hidden className="animate-spin text-accent-fg motion-reduce:animate-none" />
                  <span className="sr-only">{copyChat.tareasEnCurso(trabajosEnCurso)}</span>
                </span>
              )}
            </EnlaceNav>
            {esAdmin && <NavAdmin />}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Icono, no botón con texto: con las cinco entradas de
              administración en la barra, un botón rotulado se comía el ancho
              justo donde hace falta. `aria-label` conserva el nombre completo
              para quien no ve el icono.

              Por debajo de `md` los dos se esconden: en un teléfono no caben
              junto a la navegación sin encimarse. "Sesión nueva" ya existe en
              la barra del chat y Ajustes pasa al menú del avatar. */}
          <IconButton
            className="hidden md:inline-flex"
            aria-label={copyChat.nuevaSesion}
            title={copyChat.nuevaSesion}
            onClick={() => navigate('/chat')}
          >
            <SquarePen size={18} />
          </IconButton>
          <IconButton
            className="hidden md:inline-flex"
            aria-label={copyAjustes.titulo}
            title={copyAjustes.titulo}
            onClick={() => navigate('/ajustes')}
          >
            <Settings size={18} />
          </IconButton>

          <MenuUsuario />
        </div>
      </header>

      {/* Las pantallas con scroll propio (el chat, que ancla su input abajo)
          reciben el alto completo y se encargan ellas del desbordamiento.

          El <main> lleva `layoutScroll` porque Framer mide las animaciones de
          layout en coordenadas de viewport: sin ese aviso, cualquier animación
          `layout`/`layoutId` de dentro (las pastillas de los selectores) queda desfasada si este contenedor se desplaza a media
          animación, y el indicador aterriza en el sitio equivocado. */}
      {scrollPropio ? (
        <div className="min-h-0 flex-1">
          {/* Aquí no se remonta con `key`: pasar de /chat a /chat/c-1 a media
              respuesta no debe desmontar el chat. El límite solo se reinicia
              al navegar si estaba mostrando un error. */}
          <LimiteError claveReinicio={location.pathname}>
            <Outlet />
          </LimiteError>
        </div>
      ) : (
        <motion.main
          ref={contenido}
          layoutScroll
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {/* `mode="wait"` y no "popLayout": este <main> ES el contenedor de
              scroll de la aplicación. Con "popLayout" la pantalla saliente
              convive con la entrante y, aunque quede en posición absoluta,
              sigue contando para el `scrollHeight` del contenedor — así que
              venir de una pantalla larga (el tablero) dejaba cientos de píxeles
              de scroll vacío en la siguiente. Esperando a que salga, en el
              <main> nunca hay más de una pantalla y el alto no puede mentir. */}
          <AnimatePresence mode="wait" initial={false}>
            <TransicionPagina key={location.pathname}>
              {/* Un límite por pantalla, con `key` = ruta: si una pantalla falla,
                  la cabecera sigue viva y navegar a otra la reinicia limpia. */}
              <LimiteError key={location.pathname}>{contenidoRuta}</LimiteError>
            </TransicionPagina>
          </AnimatePresence>
        </motion.main>
      )}
    </div>
  );
}

function EnlaceNav({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center whitespace-nowrap rounded-control px-2.5 py-1.5 font-ui text-14 font-medium transition-colors duration-150 sm:px-3',
          isActive ? 'bg-accent-soft text-accent-fg' : 'text-text-2 hover:bg-tinta/[.05] hover:text-text-1'
        )
      }
    >
      {children}
    </NavLink>
  );
}

// forwardRef es obligatorio: AnimatePresence necesita el nodo real para saber
// cuándo termina de salir. Sin él, Framer Motion falla en silencio y la
// pantalla entrante no llega a montarse.
const TransicionPagina = forwardRef<HTMLDivElement, { children?: ReactNode }>(
  function TransicionPagina({ children }, ref) {
    const isPresent = useIsPresent();
    return (
      <motion.div
        ref={ref}
        variants={pageTransitionVariants}
        initial="enter"
        animate="center"
        /*
         * La SALIDA es un tween de 100 ms (va en las variantes).
         *
         * Con `mode="wait"` las dos fases van en serie, así que la salida se
         * paga entera antes de ver nada nuevo; una salida no necesita física
         * —nadie está mirando lo que se va—. Lo que tiene que sentirse vivo es
         * lo que llega: 220 ms subiendo 6 px.
         */
        exit="exit"
        style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
        /*
         * `h-full` + padding: el envoltorio ocupa exactamente el alto que le
         * da el <main>, y las pantallas que quieren pantalla completa piden
         * `h-full` en vez de calcular `100dvh` menos números mágicos. Ese
         * cálculo a mano es lo que se rompía en cuanto la barra cambiaba de
         * altura, y ahora la barra tiene dos.
         */
        className="mx-auto flex h-full max-w-[1400px] flex-col px-4 py-5 lg:px-8 lg:py-6"
      >
        {children}
      </motion.div>
    );
  }
);

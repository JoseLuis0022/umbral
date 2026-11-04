import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass, LifeBuoy, MessageSquareText } from 'lucide-react';
import { Button, ErrorState, EmptyState, PageEnter, useToast } from '../components/ui';
import { Markdown } from '../components/Markdown';
import {
  BotonEstrella,
  CLASES_CATEGORIA,
  EsqueletoDetalle,
  ICONO_CATEGORIA,
  PasosGuia,
} from '../components/guias';
import { cn } from '../lib/cn';
import { dur, ease } from '../lib/motion';
import { guidesService } from '../services/guides.service';
import type { Guia } from '../types';
import { alDia as copy } from '../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  volver: 'Al día',
  errorTitulo: 'No pudimos abrir esta guía',
  errorDetalle: 'Revisa tu conexión e intenta de nuevo.',
  noExisteTitulo: 'Esta guía ya no está aquí',
  noExisteDetalle: 'La dirección que abriste no corresponde a ninguna guía publicada.',
  volverAGuias: 'Ver todas las guías',
  errorVoto: 'No pudimos registrar tu voto. Lo dejamos como estaba; intenta de nuevo.',
  ctaTitulo: '¿Te quedó una duda?',
  ctaDetalle: 'Abrimos el asistente con esta pregunta ya escrita. Puedes cambiarla antes de enviarla.',
};

type EstadoCarga = 'cargando' | 'listo' | 'noExiste' | 'error';

/**
 * Detalle de una guía (/al-dia/:guiaId).
 *
 * Es una pieza de lectura, no un tablero: una sola columna de 44rem —unos 75
 * caracteres por renglón, el ancho en el que se lee sin perder el renglón— y
 * cero elementos flotantes que compitan con el texto.
 *
 * **Continuidad espacial.** Al llegar desde una tarjeta, la navegación trae la
 * guía en `location.state`; título, categoría, resumen y estrellas se pintan en
 * el primer frame y el esqueleto queda solo para el cuerpo (estado PARCIAL).
 * La pantalla continúa lo que se estaba mirando en vez de borrarlo y volverlo a
 * escribir. Entrando por URL directa no hay avance y el esqueleto es completo,
 * que es la verdad: ahí no se conoce nada todavía.
 *
 * La transición de entrada/salida la pone el shell (LayoutApp): avanzar entra
 * desde la derecha y "atrás" deshace el movimiento. Esta pantalla no agrega
 * otra encima; dos coreografías simultáneas se sienten trabadas, no fluidas.
 */
export default function AlDiaDetalle() {
  const { guiaId } = useParams<{ guiaId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();

  // Adelanto que viaja desde la tarjeta. Se lee una sola vez por id: si el voto
  // cambia después, manda el estado, no lo que traía la navegación.
  const avance = (location.state as { avance?: Guia } | null)?.avance;
  const avanceVigente = avance && avance.id === guiaId ? avance : undefined;

  const [guia, setGuia] = useState<Guia | null>(avanceVigente ?? null);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [intento, setIntento] = useState(0);

  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!guiaId) {
      setEstado('noExiste');
      return;
    }
    let vigente = true;
    // Volver al adelanto (o a nada) al cambiar de guía: sin esto, saltar de una
    // guía a otra dejaría la cabecera de la anterior mientras carga la nueva,
    // que es exactamente el error que el adelanto vino a evitar.
    setGuia(avanceVigente ?? null);
    setEstado('cargando');
    guidesService
      .obtener(guiaId)
      .then((datos) => {
        if (!vigente) return;
        setGuia(datos);
        setEstado(datos ? 'listo' : 'noExiste');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [guiaId, intento]);

  // Cambiar de ruta en una SPA no mueve el foco: quien navega con teclado o
  // lector de pantalla se quedaría al final del documento anterior. Se lleva al
  // título, sin scroll —el contenedor ya está arriba— para no pelearse con la
  // transición de entrada del shell.
  useEffect(() => {
    if (estado === 'listo') tituloRef.current?.focus({ preventScroll: true });
  }, [estado, guiaId]);

  const alternarVoto = useCallback(async () => {
    if (!guia) return;
    const previa = guia;
    const votar = !previa.votadaPorMi;

    setGuia({ ...previa, votadaPorMi: votar, estrellas: previa.estrellas + (votar ? 1 : -1) });

    try {
      const actualizada = votar
        ? await guidesService.votar(previa.id)
        : await guidesService.quitarVoto(previa.id);
      setGuia(actualizada);
    } catch {
      // Se vuelve al objeto ANTERIOR completo, no a "una estrella menos": el
      // rollback tiene que dejar la tarjeta exactamente como estaba.
      setGuia(previa);
      push({ message: TEXTO.errorVoto, tone: 'error' });
    }
  }, [guia, push]);

  // El chat lee la pregunta de location.state y precarga la barra de entrada.
  function preguntarAlAsistente() {
    if (!guia) return;
    navigate('/chat', { state: { pregunta: guia.preguntaSugerida } });
  }

  if (estado === 'error') {
    return (
      <div className="mx-auto w-full max-w-[44rem]">
        <VolverAlDia />
        <div className="mt-6 rounded-tarjeta border border-hairline bg-surface-1">
          <ErrorState
            title={TEXTO.errorTitulo}
            description={TEXTO.errorDetalle}
            onRetry={() => setIntento((n) => n + 1)}
          />
        </div>
      </div>
    );
  }

  if (estado === 'noExiste') {
    return (
      <div className="mx-auto w-full max-w-[44rem]">
        <VolverAlDia />
        <div className="mt-6 rounded-tarjeta border border-hairline bg-surface-1">
          <EmptyState
            icon={Compass}
            title={TEXTO.noExisteTitulo}
            description={TEXTO.noExisteDetalle}
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/al-dia')}>
                {TEXTO.volverAGuias}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Cargando SIN avance: no se conoce ni el título. Esqueleto completo.
  if (!guia) {
    return <EsqueletoDetalle />;
  }

  const Icono = ICONO_CATEGORIA[guia.categoria];
  const cargandoCuerpo = estado === 'cargando';

  return (
    // Los tres bloques son estables entre el estado parcial y el ideal: la
    // cascada de entrada corre una sola vez y el cuerpo se rellena dentro del
    // mismo hueco, sin volver a animar la cabecera.
    <PageEnter className="mx-auto w-full flex max-w-[44rem] flex-col">
      <VolverAlDia />

      <header className="mt-6">
        <span
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-celda px-2 font-ui text-12 font-medium',
            CLASES_CATEGORIA[guia.categoria]
          )}
        >
          <Icono size={13} strokeWidth={2} />
          {guia.categoria}
        </span>

        {/* tabIndex -1: destino de foco al entrar, no parada del tabulador. */}
        <h1 ref={tituloRef} tabIndex={-1} className="mt-4 font-ui text-28 text-text-1">
          {guia.titulo}
        </h1>
        <p className="mt-4 font-ui text-15 text-text-2">{guia.resumen}</p>

        <div className="mt-6 flex items-center justify-between gap-4 border-b border-hairline pb-6">
          <span className="font-ui text-13 text-text-3">{copy.minutos(guia.minutosLectura)}</span>
          <BotonEstrella
            estrellas={guia.estrellas}
            votada={guia.votadaPorMi}
            titulo={guia.titulo}
            onToggle={alternarVoto}
          />
        </div>
      </header>

      <div>
        {cargandoCuerpo ? (
          <div className="mt-8">
            <EsqueletoDetalle conCabecera={false} />
          </div>
        ) : (
          // Solo opacidad, sin desplazamiento: la cabecera ya está en su sitio
          // y el cuerpo tiene que llegar debajo de ella, no empujarla.
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur.base, ease }}
          >
            {guia.requisitos.length > 0 && (
              <section aria-labelledby="titulo-requisitos" className="mt-8 rounded-tarjeta border border-hairline bg-surface-1 p-5">
                <h2 id="titulo-requisitos" className="font-ui text-15 font-semibold text-text-1">
                  {copy.requisitos}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {guia.requisitos.map((requisito) => (
                    <li key={requisito} className="flex gap-3 font-ui text-15 text-text-2">
                      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span className="min-w-0 flex-1">{requisito}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="titulo-pasos" className="mt-10">
              {/* El encabezado va solo para lectores de pantalla: los pasos
                  numerados se explican solos a la vista, y un "Pasos" impreso
                  entre la tarjeta de requisitos y el 1 sería una etiqueta que
                  ocupa un renglón para no decir nada. */}
              <h2 id="titulo-pasos" className="sr-only">
                {copy.pasos}
              </h2>
              <PasosGuia pasos={guia.pasos} />
            </section>

            <section
              aria-labelledby="titulo-si-algo-falla"
              className="mt-10 rounded-tarjeta border border-hairline bg-bg p-5"
            >
              <h2
                id="titulo-si-algo-falla"
                className="flex items-center gap-2 font-ui text-15 font-semibold text-text-1"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-celda bg-status-amber-soft text-status-amber">
                  <LifeBuoy size={14} strokeWidth={2} />
                </span>
                {copy.siAlgoFalla}
              </h2>
              <Markdown className="mt-4 text-text-2">{guia.siAlgoFalla}</Markdown>
            </section>

            {/* Única acción primaria de la pantalla. El botón de estrella es
                tinta sobre `accent-soft`, no relleno, así que no compite. */}
            <section className="mt-10 rounded-tarjeta border border-hairline bg-surface-1 p-5 shadow-1">
              <h2 className="font-ui text-15 font-semibold text-text-1">{TEXTO.ctaTitulo}</h2>
              <p className="mt-1 font-ui text-13 text-text-3">{TEXTO.ctaDetalle}</p>
              <blockquote className="mt-4 border-l-2 border-accent/40 pl-4 font-ui text-15 text-text-2">
                {guia.preguntaSugerida}
              </blockquote>
              <Button className="mt-5" onClick={preguntarAlAsistente}>
                <MessageSquareText size={14} strokeWidth={2} />
                {copy.preguntarAsistente}
              </Button>
            </section>
          </motion.div>
        )}
      </div>
    </PageEnter>
  );
}

/**
 * Vuelta a la galería. Es un enlace y no un `history.back()`: quien llega por
 * una URL compartida no tiene a dónde volver, y un botón "atrás" que no hace
 * nada es peor que no tenerlo. El shell detecta el POP y desanda la transición
 * de entrada cuando sí se venía de la lista.
 */
function VolverAlDia() {
  return (
    <Link
      to="/al-dia"
      className="inline-flex h-11 w-fit items-center gap-1.5 rounded-control px-2.5 font-ui text-13 font-medium text-text-2 transition-colors duration-150 hover:bg-accent-soft hover:text-accent-fg md:h-8"
    >
      <ArrowLeft size={14} strokeWidth={2} />
      {TEXTO.volver}
    </Link>
  );
}

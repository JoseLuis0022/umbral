import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clock, SearchX, Star } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageEnter, SegmentedControl, useToast } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  EsqueletoTarjetaGuia,
  FiltroCategorias,
  TarjetaGuia,
  type FiltroCategoria,
} from '../components/guias';
import { dur, ease, springSoft } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { guidesService } from '../services/guides.service';
import type { Guia } from '../types';
import { alDia as copy } from '../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  ordenar: 'Ordenar guías',
  filtrarCategoria: 'Filtrar por categoría',
  conteo: (n: number) => `${n} ${n === 1 ? 'guía' : 'guías'}`,
  actualizando: 'Actualizando…',
  vacioTotal: 'Todavía no hay guías publicadas',
  vacioTotalDetalle: 'En cuanto el equipo publique la primera, aparecerá aquí.',
  vacioCategoriaDetalle: 'Prueba con otra categoría o revisa todas las guías.',
  verTodas: 'Ver todas las guías',
  errorTitulo: 'No pudimos cargar las guías',
  errorDetalle: 'Revisa tu conexión e intenta de nuevo.',
  errorVoto: 'No pudimos registrar tu voto. Lo dejamos como estaba; intenta de nuevo.',
};

type Orden = 'estrellas' | 'recientes';
type EstadoCarga = 'cargando' | 'actualizando' | 'listo' | 'error';

const OPCIONES_ORDEN = [
  { value: 'estrellas', label: copy.ordenEstrellas, icon: <Star size={13} strokeWidth={2} /> },
  { value: 'recientes', label: copy.ordenRecientes, icon: <Clock size={13} strokeWidth={2} /> },
];

// Cuántos esqueletos pinta la primera carga. Seis llena dos renglones completos
// en escritorio: con menos, la rejilla crece al llegar los datos; con más,
// encoge. Las dos cosas son el mismo brinco de layout con distinto signo.
const ESQUELETOS = 6;

/**
 * Galería de guías (/al-dia).
 *
 * Contenido corto y accionable, no un blog: la rejilla se recorre de un
 * vistazo, se filtra por categoría y se ordena por utilidad o por novedad.
 *
 * Dos decisiones que se notan al usar la pantalla:
 *
 *  - **Votar no reordena la lista.** El orden "Más útiles" se congela con las
 *    cifras que trajo el servicio. Si votar reacomodara la rejilla, la tarjeta
 *    que acabas de tocar saldría corriendo debajo del cursor y la siguiente
 *    ocuparía su lugar: el gesto castigaría a quien vota.
 *  - **Filtrar y ordenar son movimientos, no parpadeos.** Las tarjetas que se
 *    quedan viajan a su nueva posición con `layout`; solo las que entran o
 *    salen usan opacidad. Es lo que explica que la lista es la misma y solo
 *    cambió de acomodo.
 */
export default function AlDia() {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [categoria, setCategoria] = useState<FiltroCategoria>('Todas');
  const [orden, setOrden] = useState<Orden>('estrellas');

  // Fuerza una recarga sin tocar filtros: reintento tras error y resincronía
  // después de un voto que no se pudo guardar.
  const [intento, setIntento] = useState(0);

  const reducido = useReducedMotion();
  const { push } = useToast();

  const yaCargoUnaVez = useRef(false);

  // Cifras de estrellas tal como llegaron del servicio. Es la CLAVE DE ORDEN, y
  // se guarda en una ref a propósito: si el orden leyera el estado, cada voto
  // optimista reacomodaría la rejilla en el mismo frame del clic.
  const rangoEstrellas = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let vigente = true;
    // La primera carga muestra esqueletos; una recarga posterior conserva las
    // tarjetas y solo avisa "Actualizando…" (estado parcial). Vaciar la
    // rejilla para volver a llenarla se siente roto, no rápido.
    setEstado(yaCargoUnaVez.current ? 'actualizando' : 'cargando');
    guidesService
      .listar()
      .then((datos) => {
        if (!vigente) return;
        yaCargoUnaVez.current = true;
        rangoEstrellas.current = new Map(datos.map((g) => [g.id, g.estrellas]));
        setGuias(datos);
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Cambiar de orden vuelve a fijar la clave con las cifras actuales: es el
  // momento en que la persona PIDE un reacomodo, así que ahí sí se recalcula.
  const cambiarOrden = useCallback(
    (valor: string) => {
      rangoEstrellas.current = new Map(guias.map((g) => [g.id, g.estrellas]));
      setOrden(valor as Orden);
    },
    [guias]
  );

  const visibles = useMemo(() => {
    const filtradas = categoria === 'Todas' ? guias : guias.filter((g) => g.categoria === categoria);
    if (orden === 'recientes') return filtradas; // el servicio ya devuelve la semilla en orden cronológico
    return [...filtradas].sort(
      (a, b) =>
        (rangoEstrellas.current.get(b.id) ?? b.estrellas) - (rangoEstrellas.current.get(a.id) ?? a.estrellas)
    );
  }, [guias, categoria, orden]);

  /**
   * Voto optimista: la cifra sube en el mismo frame del clic y la verdad del
   * servicio llega después. Si el servicio falla, se revierte al valor exacto
   * que tenía la tarjeta —no a "uno menos", que se equivocaría si otra cosa la
   * hubiera cambiado en el intervalo— y se resincroniza la lista, porque tras
   * un error el conteo del servidor es justamente lo que dejó de saberse.
   */
  const alternarVoto = useCallback(
    async (guia: Guia) => {
      const votar = !guia.votadaPorMi;

      setGuias((gs) =>
        gs.map((g) =>
          g.id === guia.id
            ? { ...g, votadaPorMi: votar, estrellas: g.estrellas + (votar ? 1 : -1) }
            : g
        )
      );

      try {
        const actualizada = votar
          ? await guidesService.votar(guia.id)
          : await guidesService.quitarVoto(guia.id);
        setGuias((gs) => gs.map((g) => (g.id === actualizada.id ? actualizada : g)));
      } catch {
        setGuias((gs) =>
          gs.map((g) =>
            g.id === guia.id ? { ...g, votadaPorMi: guia.votadaPorMi, estrellas: guia.estrellas } : g
          )
        );
        push({ message: TEXTO.errorVoto, tone: 'error' });
        setIntento((n) => n + 1);
      }
    },
    [push]
  );

  const sinGuias = estado === 'listo' && guias.length === 0;
  const sinResultados = estado !== 'cargando' && guias.length > 0 && visibles.length === 0;

  return (
    <PageEnter className="flex flex-col">
      <PageHeader
        title={copy.titulo}
        subtitle={copy.subtitulo}
        actions={
          // El grupo lleva el nombre accesible: el SegmentedControl no expone
          // uno propio, y dos botones sueltos que dicen "Más útiles" y
          // "Recientes" no explican de qué son opciones.
          <div role="group" aria-label={TEXTO.ordenar}>
            <SegmentedControl
              options={OPCIONES_ORDEN}
              value={orden}
              onChange={cambiarOrden}
              layoutId="orden-guias"
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <FiltroCategorias valor={categoria} onCambiar={setCategoria} etiqueta={TEXTO.filtrarCategoria} />

        <div className="flex items-center gap-3 pr-1">
          {/* Hueco reservado y solo crossfade de opacidad: montándose y
              desmontándose dentro del flujo, este aviso empujaba el conteo de
              guías a un lado y otro en cada recarga. */}
          <motion.span
            initial={false}
            animate={{ opacity: estado === 'actualizando' ? 1 : 0 }}
            transition={{ duration: dur.fast, ease }}
            role="status"
            aria-hidden={estado !== 'actualizando'}
            className="w-[86px] text-right font-ui text-12 text-text-3"
          >
            {TEXTO.actualizando}
          </motion.span>
          <span className="font-ui text-12 tabular-nums text-text-3">
            {/* Espacio duro mientras no hay nada que contar: un "0 guías" que
                dura medio segundo y luego dice "5" se lee como un error. */}
            {estado === 'cargando' ? ' ' : TEXTO.conteo(visibles.length)}
          </span>
        </div>
      </div>

      <section aria-label={copy.titulo} aria-busy={estado === 'cargando'}>
        {estado === 'cargando' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: ESQUELETOS }).map((_, i) => (
              <EsqueletoTarjetaGuia key={i} />
            ))}
          </div>
        ) : estado === 'error' ? (
          <div className="rounded-tarjeta border border-hairline bg-surface-1">
            <ErrorState
              title={TEXTO.errorTitulo}
              description={TEXTO.errorDetalle}
              onRetry={() => setIntento((n) => n + 1)}
            />
          </div>
        ) : sinGuias ? (
          <div className="rounded-tarjeta border border-hairline bg-surface-1">
            <EmptyState icon={BookOpen} title={TEXTO.vacioTotal} description={TEXTO.vacioTotalDetalle} />
          </div>
        ) : sinResultados ? (
          <div className="rounded-tarjeta border border-hairline bg-surface-1">
            <EmptyState
              icon={SearchX}
              title={copy.vacio}
              description={TEXTO.vacioCategoriaDetalle}
              action={
                <Button variant="secondary" size="sm" onClick={() => setCategoria('Todas')}>
                  {TEXTO.verTodas}
                </Button>
              }
            />
          </div>
        ) : (
          // `layout` en la lista: al filtrar, la altura de la rejilla también
          // viaja, y las tarjetas de abajo no se teletransportan.
          <motion.ul
            layout={!reducido}
            transition={springSoft}
            className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* popLayout saca a la tarjeta que se va del flujo ANTES de animar
                el hueco: sin él, las que se quedan esperan a que termine la
                salida y el reacomodo se ve en dos tiempos. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {visibles.map((guia) => (
                <motion.li
                  key={guia.id}
                  /*
                   * `layout="position"` y entrada/salida SOLO por opacidad.
                   *
                   * Las dos cosas arreglan el mismo síntoma. `layout` completo
                   * mide también el tamaño y aplica una corrección de escala
                   * inversa al contenido; encima, una `scale` animada en el
                   * MISMO elemento pelea con esa corrección por el único
                   * `transform` disponible, y el resultado es el texto de la
                   * tarjeta estirándose mientras viaja. Las tarjetas no cambian
                   * de tamaño al filtrar: solo de sitio.
                   */
                  layout={reducido ? false : 'position'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springSoft}
                >
                  <TarjetaGuia guia={guia} onToggleVoto={alternarVoto} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>
    </PageEnter>
  );
}

import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Guia } from '../../types';
import { cn } from '../../lib/cn';
import { Card, Skeleton } from '../ui';
import { alDia as copy } from '../../copy';
import { BotonEstrella } from './BotonEstrella';
import { CLASES_CATEGORIA, ICONO_CATEGORIA } from './categorias';

/**
 * Tarjeta de la galería.
 *
 * El enlace es el TÍTULO, y se estira sobre toda la tarjeta con un
 * pseudoelemento (`after:absolute after:inset-0`). Es la forma de tener una
 * tarjeta entera clicable sin anidar el botón de estrella dentro de un enlace
 * —HTML inválido— y sin duplicar el destino en un segundo enlace que los
 * lectores de pantalla tendrían que anunciar dos veces.
 *
 * No hay animación de hover: el movimiento en esta pantalla se reserva para la
 * respuesta al voto. La tarjeta responde oscureciendo su borde, que es
 * suficiente afordancia y no compite con el rebote de la estrella.
 */
/*
 * `memo`: cada voto sustituye el array completo de guías, así que sin esto las
 * veinte tarjetas de la rejilla se re-renderizaban por un voto — y con `layout`
 * en cada `li`, Framer volvía a medir las veinte cajas. `guia` es un objeto
 * nuevo solo para la tarjeta que cambió; las demás conservan su referencia.
 */
export const TarjetaGuia = memo(function TarjetaGuia({
  guia,
  onToggleVoto,
}: {
  guia: Guia;
  onToggleVoto: (guia: Guia) => void;
}) {
  const Icono = ICONO_CATEGORIA[guia.categoria];

  return (
    <Card className="relative flex h-full flex-col p-5 transition-[border-color,box-shadow] duration-150 hover:border-hairlineStrong">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-celda',
            CLASES_CATEGORIA[guia.categoria]
          )}
        >
          <Icono size={14} strokeWidth={2} />
        </span>
        <span className="font-ui text-12 font-medium text-text-2">{guia.categoria}</span>
      </div>

      <div className="mt-3 flex-1">
        <h2 className="font-ui text-15 font-semibold leading-[22px] text-text-1">
          {/* La guía viaja en el state de la navegación. No es cache: es
              CONTINUIDAD. El detalle pinta título, categoría y estrellas en el
              primer frame —los mismos que la persona acaba de tocar— y deja el
              esqueleto solo para el cuerpo, que sí desconoce. Sin esto, abrir
              una tarjeta borra lo que se estaba mirando y lo vuelve a escribir
              medio segundo después: se siente un salto, no una continuación. */}
          <Link
            to={`/al-dia/${guia.id}`}
            state={{ avance: guia }}
            className="line-clamp-2 rounded-tarjeta after:absolute after:inset-0 after:rounded-tarjeta"
          >
            {guia.titulo}
          </Link>
        </h2>
        <p className="mt-1.5 line-clamp-2 font-ui text-13 text-text-2">{guia.resumen}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className="font-ui text-12 text-text-3">{copy.minutos(guia.minutosLectura)}</span>
        {/* z-10: queda por encima del enlace estirado, si no el clic navegaría. */}
        <BotonEstrella
          estrellas={guia.estrellas}
          votada={guia.votadaPorMi}
          titulo={guia.titulo}
          onToggle={() => onToggleVoto(guia)}
          className="relative z-10"
        />
      </div>
    </Card>
  );
});

/**
 * Esqueleto de la tarjeta. Reproduce el MISMO andamio (paddings, separador,
 * alturas de línea) que la tarjeta real, con dos renglones de título y dos de
 * resumen, que es el máximo que la tarjeta muestra. Así la cuadrícula no
 * brinca al llegar los datos.
 */
export function EsqueletoTarjetaGuia() {
  return (
    <div className="flex h-full flex-col rounded-tarjeta border border-hairline bg-surface-1 p-5 shadow-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <div className="mt-3 flex-1">
        <Skeleton className="h-[22px] w-full" />
        <Skeleton className="mt-1.5 h-[22px] w-4/5" />
        <Skeleton className="mt-2.5 h-[18px] w-full" />
        <Skeleton className="mt-1.5 h-[18px] w-2/3" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-[76px] rounded-control md:h-8" />
      </div>
    </div>
  );
}

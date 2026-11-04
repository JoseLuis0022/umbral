import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, StatusPill } from '../ui';

/**
 * Bloque de ajustes: rótulo fuera de la tarjeta, controles dentro.
 *
 * El rótulo va FUERA a propósito. Un panel de ajustes se recorre buscando
 * ("dónde estaba lo del texto grande"), no se lee de corrido: sacar el título
 * al fondo de la página deja que la vista salte de rótulo en rótulo sin tener
 * que entrar a cada tarjeta.
 */
export function Seccion({
  titulo,
  icono: Icono,
  aviso,
  nota,
  children,
}: {
  titulo: string;
  icono: LucideIcon;
  /** Contenido entre el rótulo y la tarjeta: un Banner cuando hay algo que advertir. */
  aviso?: ReactNode;
  /** Letra pequeña bajo la tarjeta. */
  nota?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-center gap-2 px-1 font-ui text-13 font-semibold text-text-2">
        <Icono size={14} strokeWidth={2} className="text-text-3" />
        {titulo}
      </h2>
      {aviso}
      <Card className="flex flex-col divide-y divide-hairline">{children}</Card>
      {nota && <p className="px-1 font-ui text-12 text-text-3">{nota}</p>}
    </section>
  );
}

type IdsFila = { titulo: string; detalle: string };

/**
 * Fila de un ajuste: nombre + explicación a la izquierda, control a la derecha.
 *
 * El control se recibe como función porque necesita los `id` del título y del
 * detalle para colgarse de ellos (`aria-labelledby` / `aria-describedby`): ni
 * el segmentado ni el interruptor llevan texto propio, y sin eso un lector de
 * pantalla anuncia "botón" sin decir de qué.
 *
 * En móvil el control baja a su propio renglón con 12 px de aire; apretado
 * contra la etiqueta se lee como si fueran dos cosas distintas.
 */
export function FilaAjuste({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle: string;
  children: (ids: IdsFila) => ReactNode;
}) {
  const base = useId();
  const ids: IdsFila = { titulo: `${base}-t`, detalle: `${base}-d` };
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 id={ids.titulo} className="font-ui text-15 font-medium text-text-1">
          {titulo}
        </h3>
        <p id={ids.detalle} className="mt-1 font-ui text-13 text-text-2">
          {detalle}
        </p>
      </div>
      <div className="shrink-0 sm:self-center">{children(ids)}</div>
    </div>
  );
}

/**
 * Fila puramente informativa: explica una regla del producto que nadie
 * configura (cuánto duran las conversaciones, quién puede leerlas). Va en la
 * misma tarjeta que los ajustes porque es donde la gente viene a buscarla.
 */
export function FilaTexto({ titulo, detalle, valor }: { titulo: string; detalle: string; valor?: string }) {
  return (
    <div className="flex flex-col gap-1 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="font-ui text-15 font-medium text-text-1">{titulo}</h3>
        {valor && <span className="font-ui text-13 font-medium tabular-nums text-text-2">{valor}</span>}
      </div>
      <p className="font-ui text-13 text-text-2">{detalle}</p>
    </div>
  );
}

/** Fila de solo lectura: un dato que la app conoce y la persona no puede cambiar aquí. */
export function FilaDato({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: string }) {
  return (
    <div className="flex flex-col gap-1 p-5 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-52 shrink-0 font-ui text-13 text-text-2">{etiqueta}</dt>
      <dd className="min-w-0 font-ui text-15 text-text-1">
        {valor}
        {detalle && <span className="mt-1 block font-ui text-13 text-text-2">{detalle}</span>}
      </dd>
    </div>
  );
}

/**
 * Ajuste diseñado pero todavía sin conectar.
 *
 * Deliberadamente NO trae control: un interruptor apagado invita a moverlo, y
 * moverlo no haría nada. Se muestra el nombre, lo que hará, y una píldora que
 * dice cuándo — el mismo trato honesto que el botón de Microsoft en el login.
 */
export function FilaPendiente({ titulo, detalle, etiqueta }: { titulo: string; detalle: string; etiqueta: string }) {
  return (
    <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className="font-ui text-15 font-medium text-text-2">{titulo}</h3>
        <p className="mt-1 font-ui text-13 text-text-3">{detalle}</p>
      </div>
      <StatusPill label={etiqueta} tone="gray" className="self-start sm:self-center" />
    </div>
  );
}

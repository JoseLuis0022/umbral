// Utilidades de fecha compartidas por el historial de chat y por la auditoría.
// Fuente única: si el chat agrupa "Hoy / Ayer" con una regla y la auditoría
// filtra con otra, las dos pantallas acaban discrepando sobre el mismo dato.

export const CINCO_HORAS_MS = 5 * 60 * 60 * 1000;

/**
 * Una conversación se cierra cinco horas después de su último mensaje.
 * Se CALCULA, nunca se almacena: guardarlo obligaría a un proceso que lo
 * actualice y quedaría desincronizado en cuanto la app estuviera cerrada.
 */
export function esSoloLectura(ultimoMensajeEn: string, ahora = Date.now()) {
  return ahora - new Date(ultimoMensajeEn).getTime() > CINCO_HORAS_MS;
}

export type GrupoHistorial = 'hoy' | 'ayer' | 'semana' | 'anteriores';

export function grupoDeFecha(iso: string, ahora = new Date()): GrupoHistorial {
  const fecha = new Date(iso);
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const t = fecha.getTime();
  if (t >= inicioHoy) return 'hoy';
  if (t >= inicioHoy - 86_400_000) return 'ayer';
  if (t >= inicioHoy - 7 * 86_400_000) return 'semana';
  return 'anteriores';
}

const HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });
const FECHA_CORTA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' });
const FECHA_LARGA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

export const formatoHora = (iso: string) => HORA.format(new Date(iso));
export const formatoFechaCorta = (iso: string) => FECHA_CORTA.format(new Date(iso));
export const formatoFechaLarga = (iso: string) => FECHA_LARGA.format(new Date(iso));

/** "hace 3 h", "hace 2 días" — para filas de historial y de auditoría. */
export function haceCuanto(iso: string, ahora = Date.now()) {
  const minutos = Math.floor((ahora - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return formatoFechaCorta(iso);
}

/** Fecha ISO desplazada hacia el pasado — solo para construir las semillas. */
export function haceHoras(horas: number) {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

export function tamanoLegible(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─────────────────────────────────────────────────────────────────────────
 * FECHAS DE CALENDARIO (`YYYY-MM-DD` en hora LOCAL)
 *
 * Añadido para el selector de rango de la auditoría. Los filtros de
 * `admin.service.ts` interpretan sus límites en hora local
 * (`new Date('2026-09-02T00:00:00')`), así que todo lo que produzca o consuma
 * una de esas claves tiene que hacerlo en la misma zona.
 *
 * LA TRAMPA: `new Date('2026-09-02')` —cadena sola, sin hora— se interpreta
 * como UTC, y en México (UTC−6) eso es el 1 de septiembre a las 18:00. Un
 * calendario construido así pinta el día anterior al que el usuario eligió.
 * Por eso las dos conversiones de abajo pasan SIEMPRE por los componentes
 * (año, mes, día) y nunca por `Date.parse` ni por `toISOString()`.
 * ───────────────────────────────────────────────────────────────────────── */

/** `Date` local → clave `YYYY-MM-DD`. Nunca uses `toISOString().slice(0,10)`. */
export function claveFecha(fecha: Date): string {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Clave `YYYY-MM-DD` → `Date` a medianoche LOCAL de ese día. */
export function fechaDeClave(clave: string): Date {
  const [ano, mes, dia] = clave.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Clave de hoy, en hora local. */
export function claveHoy(ahora = new Date()): string {
  return claveFecha(ahora);
}

/** Suma días naturales. El constructor normaliza el desbordamiento de mes. */
export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

/**
 * Suma meses ACOTANDO el día: 31 de enero + 1 mes = 28 de febrero, no 3 de
 * marzo. Sin el acotado, avanzar de mes con AvPág desde un día 31 saltaría
 * dos meses cada vez que el siguiente fuera corto.
 */
export function sumarMeses(fecha: Date, meses: number): Date {
  const destino = new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1);
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(fecha.getDate(), ultimoDia));
  return destino;
}

/**
 * Índice del día dentro de la semana MEXICANA: 0 = lunes … 6 = domingo.
 * `getDay()` devuelve 0 = domingo, que es la convención de EE. UU. y la que
 * haría que el calendario empezara en el día equivocado.
 */
export function diaSemanaLunes(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

/** Lunes de la semana de `fecha`. */
export function inicioSemana(fecha: Date): Date {
  return sumarDias(fecha, -diaSemanaLunes(fecha));
}

/** Domingo de la semana de `fecha`. */
export function finSemana(fecha: Date): Date {
  return sumarDias(fecha, 6 - diaSemanaLunes(fecha));
}

const MES_ANO = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const DIA_LARGO = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const DIA_CORTO = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });

/** "septiembre de 2026" — encabezado del calendario. */
export const formatoMesAno = (fecha: Date) => MES_ANO.format(fecha);

/** "miércoles, 2 de septiembre de 2026" — nombre accesible de cada celda. */
export const formatoDiaLargo = (fecha: Date) => DIA_LARGO.format(fecha);

/** Mismos formateadores de arriba, pero para un `Date` ya construido en local. */
export const formatoFechaCortaLocal = (fecha: Date) => FECHA_CORTA.format(fecha);
export const formatoFechaLargaLocal = (fecha: Date) => FECHA_LARGA.format(fecha);

/**
 * Encabezados de columna del calendario, de LUNES a domingo.
 * El 1 de enero de 2024 fue lunes; se usa solo como ancla para nombrar los
 * siete días con `Intl`, en vez de escribir la lista a mano en español.
 */
export const DIAS_SEMANA_CORTOS: string[] = Array.from({ length: 7 }, (_, i) =>
  DIA_CORTO.format(new Date(2024, 0, 1 + i))
);

import type { Conversacion, NivelAnalisis, Usuario } from '../types';
import { conversacionesSemilla } from '../data/conversaciones';
import { usuarios, usuarioPorId } from '../data/usuarios';
import { esperar } from './simulacion';

/**
 * Analítica del tablero directivo, SIMULADA.
 *
 * Lee la MISMA semilla que la auditoría y que el chat. No hay una tabla de
 * métricas aparte a propósito: en cuanto el tablero tuviera sus propios
 * números, empezaría a discrepar de las conversaciones que dice resumir, y un
 * tablero que no cuadra con su propio detalle no se vuelve a abrir.
 *
 * Todas las cifras se derivan de `analisis.minutosAhorrados` y
 * `analisis.costoEvitadoMxn`. Las conversaciones SIN análisis existen (una en
 * la semilla) y cuentan para el volumen, pero no para los ahorros: inventarles
 * un valor promedio inflaría el retorno con datos que nadie calculó.
 */

export type Periodo = '7d' | '30d' | '90d' | 'todo';

export const PERIODOS: { valor: Periodo; etiqueta: string; dias: number | null }[] = [
  { valor: '7d', etiqueta: 'Últimos 7 días', dias: 7 },
  { valor: '30d', etiqueta: 'Últimos 30 días', dias: 30 },
  { valor: '90d', etiqueta: 'Últimos 90 días', dias: 90 },
  { valor: 'todo', etiqueta: 'Todo el periodo', dias: null },
];

/** Una fila de la tabla: la conversación con su autor y sus cifras ya resueltos. */
export interface FilaImpacto {
  id: string;
  titulo: string;
  persona: string;
  area: string;
  ultimoMensajeEn: string;
  mensajes: number;
  riesgo: NivelAnalisis | null;
  ahorroTiempo: NivelAnalisis | null;
  ahorroCosto: NivelAnalisis | null;
  minutosAhorrados: number;
  costoEvitadoMxn: number;
  resumen: string;
}

export interface PuntoSerie {
  etiqueta: string;
  /** ISO del día, para ordenar y para el tooltip. */
  fecha: string;
  conversaciones: number;
  minutos: number;
  pesos: number;
}

export interface BarraArea {
  area: string;
  conversaciones: number;
  minutos: number;
  pesos: number;
  /** Conversaciones de riesgo alto en esa área. Es lo que un directivo busca. */
  riesgoAlto: number;
}

export interface ResumenTablero {
  conversaciones: number;
  personasActivas: number;
  /** Del total de personas del directorio, cuántas usaron la herramienta. */
  personasTotales: number;
  minutosAhorrados: number;
  costoEvitadoMxn: number;
  riesgoAlto: number;
  riesgoMedio: number;
  riesgoBajo: number;
  /** Costo evitado por hora de uso. La cifra que justifica el presupuesto. */
  pesosPorHora: number;
  /** Variación contra el periodo inmediatamente anterior, en porcentaje. */
  variacionConversaciones: number | null;
  variacionCosto: number | null;
}

export interface DatosTablero {
  resumen: ResumenTablero;
  serie: PuntoSerie[];
  areas: BarraArea[];
  filas: FilaImpacto[];
}

const DIA_MS = 86_400_000;

function diasDelPeriodo(periodo: Periodo) {
  return PERIODOS.find((p) => p.valor === periodo)?.dias ?? null;
}

function enVentana(c: Conversacion, desde: number | null, hasta: number) {
  const t = new Date(c.ultimoMensajeEn).getTime();
  return t <= hasta && (desde === null || t >= desde);
}

function autorDe(c: Conversacion): Usuario | undefined {
  return usuarioPorId(c.usuarioId);
}

function sumas(lista: Conversacion[]) {
  return lista.reduce(
    (acc, c) => {
      acc.minutos += c.analisis?.minutosAhorrados ?? 0;
      acc.pesos += c.analisis?.costoEvitadoMxn ?? 0;
      return acc;
    },
    { minutos: 0, pesos: 0 }
  );
}

/** `null` cuando no hay base de comparación: un "+100 %" contra cero es ruido. */
function variacion(actual: number, previo: number): number | null {
  if (previo === 0) return null;
  return Math.round(((actual - previo) / previo) * 100);
}

/**
 * Serie diaria. Se rellenan los días SIN actividad con ceros: una gráfica que
 * salta del día 3 al día 9 miente sobre el ritmo de adopción.
 */
function construirSerie(lista: Conversacion[], desde: number, hasta: number): PuntoSerie[] {
  const porDia = new Map<string, PuntoSerie>();
  const formato = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' });

  for (let t = desde; t <= hasta; t += DIA_MS) {
    const dia = new Date(t);
    const clave = dia.toISOString().slice(0, 10);
    porDia.set(clave, {
      etiqueta: formato.format(dia),
      fecha: dia.toISOString(),
      conversaciones: 0,
      minutos: 0,
      pesos: 0,
    });
  }

  for (const c of lista) {
    const clave = new Date(c.ultimoMensajeEn).toISOString().slice(0, 10);
    const punto = porDia.get(clave);
    if (!punto) continue;
    punto.conversaciones += 1;
    punto.minutos += c.analisis?.minutosAhorrados ?? 0;
    punto.pesos += c.analisis?.costoEvitadoMxn ?? 0;
  }

  return [...porDia.values()];
}

function construirAreas(lista: Conversacion[]): BarraArea[] {
  const porArea = new Map<string, BarraArea>();

  for (const c of lista) {
    const area = autorDe(c)?.area ?? 'Sin área registrada';
    const fila = porArea.get(area) ?? { area, conversaciones: 0, minutos: 0, pesos: 0, riesgoAlto: 0 };
    fila.conversaciones += 1;
    fila.minutos += c.analisis?.minutosAhorrados ?? 0;
    fila.pesos += c.analisis?.costoEvitadoMxn ?? 0;
    if (c.analisis?.riesgo === 'alto') fila.riesgoAlto += 1;
    porArea.set(area, fila);
  }

  // De mayor a menor ahorro: la primera barra debe ser la que más aporta.
  return [...porArea.values()].sort((a, b) => b.pesos - a.pesos);
}

function construirFilas(lista: Conversacion[]): FilaImpacto[] {
  return lista
    .map((c) => {
      const autor = autorDe(c);
      return {
        id: c.id,
        titulo: c.titulo,
        persona: autor?.nombre ?? 'Persona fuera del directorio',
        area: autor?.area ?? 'Sin área registrada',
        ultimoMensajeEn: c.ultimoMensajeEn,
        mensajes: c.mensajes.length,
        riesgo: c.analisis?.riesgo ?? null,
        ahorroTiempo: c.analisis?.ahorroTiempo ?? null,
        ahorroCosto: c.analisis?.ahorroCosto ?? null,
        minutosAhorrados: c.analisis?.minutosAhorrados ?? 0,
        costoEvitadoMxn: c.analisis?.costoEvitadoMxn ?? 0,
        resumen: c.analisis?.resumen ?? 'Esta conversación todavía no tiene análisis.',
      };
    })
    .sort((a, b) => new Date(b.ultimoMensajeEn).getTime() - new Date(a.ultimoMensajeEn).getTime());
}

export const tableroService = {
  async obtener(periodo: Periodo = '30d'): Promise<DatosTablero> {
    await esperar();

    const ahora = Date.now();
    const dias = diasDelPeriodo(periodo);
    const desde = dias === null ? null : ahora - dias * DIA_MS;

    const actuales = conversacionesSemilla.filter((c) => enVentana(c, desde, ahora));

    // Ventana anterior del MISMO tamaño, para la variación. Con "todo el
    // periodo" no hay contra qué comparar y las variaciones quedan en null.
    const previas =
      desde === null ? [] : conversacionesSemilla.filter((c) => enVentana(c, desde - dias! * DIA_MS, desde));

    const totalActual = sumas(actuales);
    const totalPrevio = sumas(previas);

    const riesgo = { alto: 0, medio: 0, bajo: 0 };
    for (const c of actuales) {
      if (c.analisis) riesgo[c.analisis.riesgo] += 1;
    }

    const horas = totalActual.minutos / 60;

    return {
      resumen: {
        conversaciones: actuales.length,
        personasActivas: new Set(actuales.map((c) => c.usuarioId)).size,
        personasTotales: usuarios.length,
        minutosAhorrados: totalActual.minutos,
        costoEvitadoMxn: totalActual.pesos,
        riesgoAlto: riesgo.alto,
        riesgoMedio: riesgo.medio,
        riesgoBajo: riesgo.bajo,
        pesosPorHora: horas > 0 ? Math.round(totalActual.pesos / horas) : 0,
        variacionConversaciones: variacion(actuales.length, previas.length),
        variacionCosto: variacion(totalActual.pesos, totalPrevio.pesos),
      },
      serie: construirSerie(actuales, desde ?? ahora - 30 * DIA_MS, ahora),
      areas: construirAreas(actuales),
      filas: construirFilas(actuales),
    };
  },
};

import { pedirJson } from './api';

/**
 * Auditoría REAL: lo que el backend guardó de cada consulta (tabla `consultas`
 * de `backend/lab.db`), leído por `GET /api/admin/*`. Exige el permiso
 * `auditoria` (rol admin); el backend responde 403 a cualquier otra cuenta.
 *
 * Solo lectura: el administrador observa, no edita ni borra consultas.
 */

export type EstadoConsulta = 'completa' | 'cancelada' | 'error';

export interface UsuarioAuditado {
  id: string;
  /** `null` si la cuenta se borró después de preguntar: el registro se conserva. */
  nombre: string | null;
  correo: string | null;
  rol: string | null;
}

export interface TokensConsulta {
  entrada?: number;
  salida?: number;
  cacheLectura?: number;
  cacheEscritura?: number;
}

export interface ConsultaAuditada {
  id: number;
  usuario: UsuarioAuditado;
  conversacionId: string;
  perfil: string;
  motor: string;
  modelo: string | null;
  pregunta: string;
  /** Los primeros ~280 caracteres de la respuesta. */
  extracto: string | null;
  costoUsd: number | null;
  vueltas: number | null;
  duracionMs: number | null;
  tokens: TokensConsulta;
  herramientas: string[];
  estado: EstadoConsulta;
  error: string | null;
  creadoEn: string;
}

export interface ConsultaDetalle extends ConsultaAuditada {
  respuesta: string | null;
}

export interface PaginaConsultas {
  consultas: ConsultaAuditada[];
  /** Id para pedir la página siguiente; `null` = no hay más. */
  siguiente: number | null;
}

export interface FiltrosAuditoria {
  /** `null` = todas las personas. */
  usuarioId: string | null;
  estado: EstadoConsulta | null;
  /** Busca en la pregunta y en la respuesta. */
  texto: string;
  /** `YYYY-MM-DD` en hora local, o `null`. */
  desde: string | null;
  hasta: string | null;
}

export const FILTROS_VACIOS: FiltrosAuditoria = {
  usuarioId: null,
  estado: null,
  texto: '',
  desde: null,
  hasta: null,
};

export function hayFiltrosActivos(f: FiltrosAuditoria) {
  return Boolean(f.usuarioId || f.estado || f.texto.trim() || f.desde || f.hasta);
}

export interface TotalPeriodo {
  consultas: number;
  costoUsd: number;
}

export interface ResumenUsuario {
  usuario: UsuarioAuditado;
  consultas: number;
  costoUsd: number;
  ultima: string | null;
}

export interface ResumenModelo {
  modelo: string;
  consultas: number;
  costoUsd: number;
}

export interface ResumenDia {
  /** `YYYY-MM-DD` en UTC. */
  dia: string;
  consultas: number;
  costoUsd: number;
}

export interface ResumenAuditoria {
  dias: number;
  desde: string;
  historico: TotalPeriodo;
  periodo: TotalPeriodo;
  porEstado: Partial<Record<EstadoConsulta, number>>;
  porUsuario: ResumenUsuario[];
  porModelo: ResumenModelo[];
  porDia: ResumenDia[];
}

export const TAMANO_PAGINA = 50;

/**
 * Los límites del rango son días LOCALES y el "hasta" incluye el día completo:
 * quien elige el 5 de noviembre en los dos extremos espera ver lo de ese día.
 */
function inicioDelDia(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toISOString();
}
function finDelDia(fecha: string) {
  return new Date(`${fecha}T23:59:59.999`).toISOString();
}

export const auditoriaService = {
  async listarConsultas(filtros: FiltrosAuditoria, antesDe?: number | null): Promise<PaginaConsultas> {
    const p = new URLSearchParams({ limite: String(TAMANO_PAGINA) });
    if (filtros.usuarioId) p.set('usuario', filtros.usuarioId);
    if (filtros.estado) p.set('estado', filtros.estado);
    if (filtros.texto.trim()) p.set('q', filtros.texto.trim());
    if (filtros.desde) p.set('desde', inicioDelDia(filtros.desde));
    if (filtros.hasta) p.set('hasta', finDelDia(filtros.hasta));
    if (antesDe) p.set('antesDe', String(antesDe));
    return pedirJson<PaginaConsultas>(`/admin/consultas?${p}`, {}, 'No pudimos cargar las consultas.');
  },

  async obtenerConsulta(id: number): Promise<ConsultaDetalle> {
    return pedirJson<ConsultaDetalle>(`/admin/consultas/${id}`, {}, 'No pudimos abrir esta consulta.');
  },

  async obtenerResumen(dias = 30): Promise<ResumenAuditoria> {
    return pedirJson<ResumenAuditoria>(`/admin/resumen?dias=${dias}`, {}, 'No pudimos cargar el resumen.');
  },
};

/** Nombre para mostrar aunque la cuenta ya no exista. */
export function nombreDe(u: UsuarioAuditado): string {
  return u.nombre || u.correo || 'Cuenta eliminada';
}

export function inicialesDe(u: UsuarioAuditado): string {
  const partes = (u.nombre ?? '').split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '··';
}

/** Tokens totales de una consulta, caché incluida. */
export function tokensTotales(t: TokensConsulta): number {
  return (t.entrada ?? 0) + (t.salida ?? 0) + (t.cacheLectura ?? 0) + (t.cacheEscritura ?? 0);
}

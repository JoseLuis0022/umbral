import type { Conversacion, Usuario } from '../types';
import { conversacionesSemilla } from '../data/conversaciones';
import { usuarios, usuarioPorId } from '../data/usuarios';
import { esperar } from './simulacion';

/**
 * Servicio SIMULADO de administración.
 *
 * La auditoría lee la MISMA semilla que el chat (`data/conversaciones`) y le
 * resuelve el usuario encima. No copia ni transforma la semilla: si el
 * administrador y la persona vieran dos listas distintas de la misma
 * conversación, la auditoría dejaría de ser auditoría.
 *
 * Este servicio es de solo lectura a propósito. El administrador observa; no
 * edita ni borra conversaciones de otras personas desde aquí.
 */

/** Conversación con su autor ya resuelto: la pantalla nunca cruza ids a mano. */
export interface ConversacionAuditada extends Conversacion {
  usuario: Usuario;
}

export interface FiltrosAuditoria {
  /** `null` = todas las personas. */
  usuarioId: string | null;
  /** `YYYY-MM-DD` tal como lo entrega `<input type="date">`, o `null`. */
  desde: string | null;
  hasta: string | null;
  /** Texto libre: busca en el título Y en el contenido de los mensajes. */
  texto: string;
}

export const FILTROS_VACIOS: FiltrosAuditoria = {
  usuarioId: null,
  desde: null,
  hasta: null,
  texto: '',
};

export function hayFiltrosActivos(f: FiltrosAuditoria) {
  return Boolean(f.usuarioId || f.desde || f.hasta || f.texto.trim());
}

/**
 * Normaliza para comparar: sin acentos y en minúsculas. Sin esto, buscar
 * "politica" no encuentra "política", que es exactamente lo que alguien
 * escribe cuando teclea rápido en un buscador.
 */
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Los límites del rango se interpretan en la zona horaria LOCAL y el día
 * "hasta" se incluye completo: quien escribe 5 de septiembre en ambos campos
 * espera ver lo de ese día, no un rango vacío de medianoche a medianoche.
 */
function limiteInferior(fecha: string) {
  return new Date(`${fecha}T00:00:00`).getTime();
}
function limiteSuperior(fecha: string) {
  return new Date(`${fecha}T23:59:59.999`).getTime();
}

function coincideTexto(conversacion: Conversacion, consulta: string) {
  const q = normalizar(consulta);
  if (normalizar(conversacion.titulo).includes(q)) return true;
  // El contenido de los mensajes cuenta como cuerpo buscable: en una auditoría
  // casi nunca se recuerda el título, se recuerda una frase de la charla.
  return conversacion.mensajes.some((m) => normalizar(m.contenido).includes(q));
}

/** Un autor faltante no debe tumbar la pantalla; se muestra como desconocido. */
const USUARIO_DESCONOCIDO = (id: string): Usuario => ({
  id,
  nombre: 'Persona fuera del directorio',
  correo: '—',
  area: 'Sin área registrada',
  rol: 'usuario',
  iniciales: '··',
});

function conAutor(conversacion: Conversacion): ConversacionAuditada {
  return { ...conversacion, usuario: usuarioPorId(conversacion.usuarioId) ?? USUARIO_DESCONOCIDO(conversacion.usuarioId) };
}

function aplicarFiltros(base: Conversacion[], filtros: FiltrosAuditoria) {
  const consulta = filtros.texto.trim();
  const desde = filtros.desde ? limiteInferior(filtros.desde) : null;
  const hasta = filtros.hasta ? limiteSuperior(filtros.hasta) : null;

  return base.filter((c) => {
    if (filtros.usuarioId && c.usuarioId !== filtros.usuarioId) return false;
    if (desde !== null || hasta !== null) {
      // Se filtra por la ÚLTIMA actividad, no por la creación: en auditoría la
      // pregunta siempre es "qué pasó en estos días", y una conversación
      // abierta hace un mes que siguió ayer pertenece a ayer.
      const t = new Date(c.ultimoMensajeEn).getTime();
      if (desde !== null && t < desde) return false;
      if (hasta !== null && t > hasta) return false;
    }
    if (consulta && !coincideTexto(c, consulta)) return false;
    return true;
  });
}

export const adminService = {
  /** Directorio completo para el filtro por persona. Sin latencia: es local. */
  listarPersonas(): Usuario[] {
    return usuarios;
  },

  /**
   * Todas las conversaciones de todas las personas, con su autor resuelto y
   * ordenadas de la actividad más reciente a la más antigua.
   */
  async listarConversaciones(filtros: FiltrosAuditoria = FILTROS_VACIOS): Promise<ConversacionAuditada[]> {
    await esperar();
    return aplicarFiltros(conversacionesSemilla, filtros)
      .map(conAutor)
      .sort((a, b) => new Date(b.ultimoMensajeEn).getTime() - new Date(a.ultimoMensajeEn).getTime());
  },

  /**
   * Detalle por id. Se pide aparte de la lista para que cambiar un filtro no
   * borre la conversación que el administrador está leyendo.
   */
  async obtenerConversacion(id: string): Promise<ConversacionAuditada | null> {
    await esperar();
    const encontrada = conversacionesSemilla.find((c) => c.id === id);
    return encontrada ? conAutor(encontrada) : null;
  },
};

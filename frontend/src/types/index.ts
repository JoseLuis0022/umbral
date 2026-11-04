// Modelo de datos de Umbral. Fuente única de tipos: si un servicio o una
// pantalla necesita una forma nueva, se declara aquí, no en el archivo que la usa.

/** Los roles los define el backend (`backend/app/perfiles.py`). */
export type Rol = 'usuario' | 'especialista' | 'admin';

/**
 * Un modo del agente al que la cuenta tiene acceso. La lista viene del
 * backend en el login: el front MUESTRA estos perfiles, el backend DECIDE.
 */
export interface PerfilAgente {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  area: string;
  rol: Rol;
  iniciales: string;
}

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamanoBytes: number;
}

export interface Mensaje {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string; // markdown
  creadoEn: string; // ISO
  adjuntos?: Adjunto[];
  reaccion?: 'positiva' | 'negativa' | null;
}

export type NivelAnalisis = 'bajo' | 'medio' | 'alto';

export interface AnalisisConversacion {
  resumen: string;
  riesgo: NivelAnalisis;
  ahorroTiempo: NivelAnalisis;
  ahorroCosto: NivelAnalisis;
  /**
   * Cifras del tablero directivo. Los tres niveles de arriba sirven para leer
   * UNA conversación; estas dos sirven para SUMAR muchas. Un directivo no
   * suma "altos" y "medios": suma horas y pesos.
   *
   * `minutosAhorrados` es el tiempo que la persona no gastó en hacerlo a mano.
   * `costoEvitadoMxn` es ese tiempo valuado al costo del área, más lo que se
   * habría ido en licencias o servicios externos.
   */
  minutosAhorrados: number;
  costoEvitadoMxn: number;
}

export interface Conversacion {
  id: string;
  usuarioId: string;
  titulo: string;
  mensajes: Mensaje[];
  creadoEn: string;
  ultimoMensajeEn: string;
  // `soloLectura` NO se almacena: se deriva de ultimoMensajeEn en cada render.
  // Guardarlo obligaría a un job que lo actualice y quedaría desincronizado.
  analisis?: AnalisisConversacion;
}

export interface Corpus {
  id: string;
  nombre: string;
  descripcion: string;
  /**
   * Clave del icono en el catálogo de `components/admin/corpus/iconos`. Se
   * guarda la CLAVE, no el componente: el corpus se persiste en localStorage y
   * un componente de React no sobrevive a `JSON.stringify`. Si la clave no
   * existe (catálogo cambiado entre versiones), la tarjeta cae a uno neutro.
   */
  icono: string;
  systemPrompt: string;
  agentesAsociados: string[];
  actualizadoEn: string;
}

export type EstadoDocumento = 'en_cola' | 'procesando' | 'indexado' | 'error';

export interface Documento {
  id: string;
  corpusId: string;
  nombre: string;
  tipo: 'md' | 'pdf';
  tamanoBytes: number;
  estado: EstadoDocumento;
  progreso?: number; // 0-100, solo mientras procesa
  mensajeError?: string;
  contenido?: string; // markdown crudo, o URL del PDF
  subidoEn: string;
}

export type CategoriaGuia = 'Correo' | 'Documentos' | 'Reuniones' | 'TI' | 'Gobernanza';

export interface PasoGuia {
  titulo: string;
  contenido: string; // markdown
}

export interface Guia {
  id: string;
  titulo: string;
  resumen: string;
  categoria: CategoriaGuia;
  estrellas: number;
  votadaPorMi: boolean;
  minutosLectura: number;
  requisitos: string[];
  pasos: PasoGuia[];
  siAlgoFalla: string;
  preguntaSugerida: string; // precarga el chat desde el detalle
}

export interface Sesion {
  usuario: Usuario;
  perfiles: PerfilAgente[];
}

/* ─────────────── Protocolo de eventos del chat (backend/app/protocolo.py) ───────────────
 *
 * El backend transmite SSE con cinco eventos:
 *
 *   inicio     EventoInicio
 *   texto      { delta }               ← muchas veces
 *   actividad  ActividadAgente         ← herramientas y subagentes
 *   fin        ResumenConsulta         ← costo y tokens REALES
 *   error      { codigo, mensaje }
 *
 * Mismos nombres y formas en los dos lados. Si cambias uno, cambia el otro.
 */

export interface EventoInicio {
  conversacionId: string;
  perfil: string;
  motor: 'sdk' | 'prueba';
}

export interface ActividadAgente {
  /** Empareja el `inicio` con su `fin`. */
  id: string;
  clase: 'herramienta' | 'subagente';
  /** Nombre de la herramienta (`Read`, `Grep`…) o del subagente. */
  nombre: string;
  /** Qué está tocando, legible: una ruta relativa, un patrón de búsqueda. */
  detalle: string;
  fase: 'inicio' | 'fin';
  /** Solo en `fin`: si la herramienta terminó bien. */
  ok: boolean | null;
  /** `id` de la actividad de subagente que la contiene; `null` = agente principal. */
  dentroDe: string | null;
}

export interface TokensConsulta {
  entrada: number;
  salida: number;
  /** Contexto repetido leído de la caché: cuesta ~10% de la entrada normal. */
  cacheLectura: number;
  cacheEscritura: number;
}

export interface ResumenConsulta {
  costoUsd: number | null;
  /** Vueltas del agentic loop. */
  vueltas: number | null;
  duracionMs: number | null;
  tokens: TokensConsulta;
  modelo: string | null;
}

export type CodigoErrorChat =
  | 'configuracion'
  | 'credenciales'
  | 'saldo'
  | 'limite_api'
  | 'limite_vueltas'
  | 'limite_presupuesto'
  | 'motor';

export interface EventoError {
  codigo: CodigoErrorChat;
  mensaje: string;
}

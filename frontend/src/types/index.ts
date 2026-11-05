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
  /**
   * Miniatura JPEG chica (data URL, ~10 KB) de una imagen adjunta. Es lo único
   * de la imagen que se guarda en localStorage: la imagen completa vive solo en
   * memoria (`lib/imagenes.ts`) y se pierde al recargar.
   */
  miniatura?: string;
}

export interface Mensaje {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string; // markdown
  creadoEn: string; // ISO
  adjuntos?: Adjunto[];
  reaccion?: 'positiva' | 'negativa' | null;
  /** Lo que hizo el agente antes y durante la respuesta: razonamiento y pasos. */
  proceso?: ItemProceso[];
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
  /** Último uso de contexto que reportó el agente para esta conversación. */
  contexto?: ContextoSesion;
}

export interface Sesion {
  usuario: Usuario;
  perfiles: PerfilAgente[];
  /** Permisos extra del rol ("parametros", "usuarios"…), según el backend. */
  permisos: string[];
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
  /** Qué hace, en palabras y SIN rutas ("Leyendo el resumen de la Clase 12"). Para todos. */
  descripcion: string;
  /**
   * Detalle técnico (ruta relativa, patrón de búsqueda). El backend solo lo
   * manda a cuentas con permiso "parametros"; a las demás les llega `null`.
   */
  detalle: string | null;
  fase: 'inicio' | 'fin';
  /** Solo en `fin`: si la herramienta terminó bien. */
  ok: boolean | null;
  /** `id` de la actividad de subagente que la contiene; `null` = agente principal. */
  dentroDe: string | null;
}

/** Un elemento del panel "Proceso", en el orden en que ocurrió. */
export type ItemProceso =
  | { tipo: 'pensamiento'; texto: string }
  | {
      tipo: 'paso';
      id: string;
      clase: ActividadAgente['clase'];
      nombre: string;
      descripcion: string;
      detalle: string | null;
      estado: 'trabajando' | 'listo' | 'fallo';
      dentroDe: string | null;
    };

export interface TokensConsulta {
  entrada: number;
  salida: number;
  /** Contexto repetido leído de la caché: cuesta ~10% de la entrada normal. */
  cacheLectura: number;
  cacheEscritura: number;
}

/** Niveles nativos del Agent SDK (`effort`). */
export type Esfuerzo = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface CategoriaContexto {
  /** Nombre que da Claude Code ("System prompt", "Messages", "Free space"…). */
  nombre: string;
  tokens: number;
  /** Herramientas cargadas bajo demanda: no ocupan contexto todavía. */
  diferida: boolean;
}

/** Lo mismo que muestra `/context` en Claude Code (`get_context_usage`). */
export interface ContextoSesion {
  usados: number;
  maximo: number;
  porcentaje: number;
  umbralCompactacion: number | null;
  categorias: CategoriaContexto[];
}

export interface ModeloDisponible {
  id: string;
  nombre: string;
}

export interface ResumenConsulta {
  /** `null` si no se pudo leer (el agente terminó con error, por ejemplo). */
  contexto?: ContextoSesion | null;
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

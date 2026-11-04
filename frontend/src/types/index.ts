// Modelo de datos de Umbral. Fuente única de tipos: si un servicio o una
// pantalla necesita una forma nueva, se declara aquí, no en el archivo que la usa.

export type Rol = 'usuario' | 'admin';

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
}

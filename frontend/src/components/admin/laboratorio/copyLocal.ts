/**
 * Cadenas del laboratorio de modelos. Viven aquí, juntas y no repartidas por
 * los componentes, por el mismo motivo que `src/components/chat/copyLocal.ts`:
 * el día que se suban a `src/copy/index.ts` es mover un bloque, no ir a
 * cazarlas archivo por archivo.
 *
 * REPORTADO al orquestador: `src/copy/index.ts` no tiene todavía una sección
 * `laboratorio`. Si se crea, este archivo desaparece.
 *
 * REGLA DE ESTA PANTALLA: ninguna cadena visible nombra la tecnología que hay
 * detrás. Esto se presenta como maqueta de demostración y el nombre del motor
 * de automatización no le dice nada a quien la ve; en los comentarios de código
 * sí se nombra, porque ahí es información técnica correcta y útil.
 */
export const copyLab = {
  // ── Cabecera ──
  titulo: 'Laboratorio de modelos',
  subtitulo: 'Prueba el asistente con otros ajustes antes de tocar la configuración de producción.',
  abrirParametros: 'Parámetros',
  sesionEtiqueta: 'sessionId',
  copiarSesion: 'Copiar el sessionId',
  sesionCopiada: 'sessionId copiado al portapapeles.',

  // ── Panel de parámetros ──
  panelTitulo: 'Parámetros del modelo',
  panelPlegar: 'Plegar los parámetros',
  panelDesplegar: 'Desplegar los parámetros',

  // ── Carril (panel plegado) ──
  /** Cada icono del carril dice qué grupo es y en qué valor está ahora mismo. */
  carrilValor: (etiqueta: string, valor: string) => `${etiqueta}: ${valor}`,
  carrilAbrirSeccion: 'Pulsa para desplegar el panel aquí.',
  carrilSinElegir: 'sin elegir',
  carrilInstruccionesPuestas: 'puestas',
  carrilInstruccionesVacias: 'sin instrucciones',
  avisoAlcance:
    'Todo lo que ajustes aquí vale solo para esta sesión de pruebas. No cambia el asistente que usa la comunidad ni entra a su historial.',

  // ── Base de conocimiento (primera decisión) ──
  corpusEtiqueta: 'Base de conocimiento',
  corpusAyuda: 'Es la primera decisión: define qué documentos consulta el asistente en esta prueba.',
  corpusPlaceholder: 'Elige una base…',
  corpusCargando: 'Cargando bases de conocimiento…',
  corpusError: 'No pudimos cargar las bases de conocimiento.',
  corpusReintentar: 'Reintentar',
  corpusVacio: 'Todavía no hay bases de conocimiento. Crea una en Corpus y vuelve a esta pantalla.',
  corpusPendiente: 'Elige una base para poder preguntar.',
  corpusAbrir: 'Elegir base de conocimiento',
  // El conteo de documentos llega DESPUÉS de la lista (es una consulta aparte):
  // hasta entonces la opción no miente con un cero, se calla.
  corpusDocumentos: (n: number) => (n === 1 ? '1 documento' : `${n} documentos`),
  corpusCambiado: (nombre: string) => `Ahora consultas «${nombre}». La conversación empieza de cero.`,

  modeloEtiqueta: 'Modelo',
  modeloAbrir: 'Elegir modelo',
  modeloAyuda: 'El identificador técnico es el que se copia en la configuración del asistente.',

  // ── Instrucciones del sistema ──
  instruccionesEtiqueta: 'Instrucciones del sistema',
  instruccionesAyuda: 'Se mandan con cada mensaje, por delante de la pregunta.',
  instruccionesVacio: 'Sin instrucciones. El asistente responde con su configuración de siempre.',
  instruccionesEditar: 'Editar instrucciones',
  instruccionesAbrir: 'Abrir el editor de instrucciones del sistema',
  instruccionesPlaceholder:
    'Eres el asistente de gobernanza de la Universidad Aurora. Responde en español, cita la normativa aplicable y di cuándo no estás seguro…',
  instruccionesGuardadas: 'Instrucciones guardadas.',
  contador: (usados: number, tope: number) => `${usados} / ${tope} caracteres`,
  contadorCasiLleno: 'Te quedan pocos caracteres.',
  topeAlcanzado: 'Llegaste al tope de caracteres: no cabe más formato.',

  // ── Editor de instrucciones (modal) ──
  editorBarra: 'Formato',
  editorNegrita: 'Negritas',
  editorCursiva: 'Cursiva',
  editorTitulo: 'Título',
  editorSubtitulo: 'Subtítulo',
  editorLista: 'Lista',
  editorEscribir: 'Escribir',
  editorVistaPrevia: 'Vista previa',
  editorVistaVacia: 'Escribe algo y aquí verás cómo se lee.',
  editorGuardar: 'Guardar instrucciones',
  editorCancelar: 'Cancelar',
  editorDescartarAviso: 'Tienes cambios sin guardar.',
  editorDescartarSi: 'Descartar cambios',
  editorDescartarNo: 'Seguir editando',

  pensamientoEtiqueta: 'Nivel de pensamiento',
  pensamientoAyuda: 'Cuánto razona el modelo antes de hablar. A más nivel, mejor respuesta y más espera.',
  pensamientoNinguno: 'Ninguno',
  pensamientoBajo: 'Bajo',
  pensamientoMedio: 'Medio',
  pensamientoAlto: 'Alto',

  temperaturaEtiqueta: 'Temperatura',
  temperaturaMin: 'Determinista',
  temperaturaMax: 'Creativo',
  temperaturaAyuda:
    'En 0.00 la misma pregunta devuelve casi siempre la misma respuesta; cerca de 1.00 el modelo se arriesga y varía.',

  memoriaTitulo: 'Memoria y contexto',
  memoriaExplicacion:
    'La memoria de la conversación no vive en esta pantalla: vive del lado del servidor, indexada por el sessionId. Por eso borrarla significa estrenar un sessionId — es lo único que corta el contexto de verdad.',
  memoriaBoton: 'Borrar memoria y contexto',
  memoriaHecho: (sesion: string) => `Memoria borrada. Sesión nueva: ${sesion}`,

  restablecerBoton: 'Restablecer parámetros',
  restablecerHecho: 'Parámetros de vuelta en sus valores por defecto.',

  // ── Conversación de prueba ──
  conversacionTitulo: 'Conversación de prueba',
  vacioTitulo: 'Haz la primera pregunta',
  vacioDetalle:
    'Cambia los parámetros y mira cómo cambia la respuesta. Nada de lo que pruebes aquí entra al historial de la comunidad.',
  sinCorpusTitulo: 'Elige una base de conocimiento',
  sinCorpusDetalle:
    'La prueba consulta los documentos de la base que elijas, así que esa es la primera decisión. Escógela en Parámetros y podrás preguntar.',
  preparandoTitulo: 'Preparando el laboratorio',
  preparandoDetalle: 'Estamos trayendo las bases de conocimiento disponibles.',
  ejemplos: [
    '¿Puedo usar ChatGPT con datos de alumnos?',
    'Resume la política de uso de IA en cinco puntos.',
    '¿Qué hago si sospecho una fuga de información?',
    'Redacta un correo para pedir acceso a una herramienta nueva.',
  ],
  placeholderEntrada: 'Escribe una pregunta de prueba…',
  placeholderBloqueado: 'Elige una base de conocimiento para empezar…',
  ayudaEntrada: 'Enter envía, Mayús + Enter salta de línea.',
  enviar: 'Enviar pregunta',
  detener: 'Detener respuesta',
  pensando: 'Preparando respuesta…',
  escribiendo: 'El asistente está escribiendo la respuesta.',
  respuestaIncompleta: 'Respuesta incompleta: la transmisión se cortó.',
  respuestaVacia: 'El asistente cerró la respuesta sin devolver texto.',

  // ── Cadena de agentes ──
  cadenaTitulo: 'Cadena de agentes',
  cadenaPrincipal: 'Orquestador',
  cadenaDelegado: 'Delegado',
  cadenaTrabajando: 'trabajando…',

  // ── Métricas ──
  metricaPrimer: 'Primer fragmento',
  metricaTotal: 'Tiempo total',
  metricaFragmentos: 'Fragmentos',
  metricaCaracteres: 'Caracteres',
  metricaTokens: 'Tokens aprox.',
  /** Se lee al pasar el cursor: dice de dónde sale la cifra y que es estimada. */
  metricaTokensDetalle: (entrada: string, salida: string) =>
    `Estimación, no medición: el asistente no reporta el consumo real. Se calcula a razón de 4 caracteres por token. Entrada ≈ ${entrada} · Salida ≈ ${salida}.`,
  metricaSinDato: '—',

  // ── Errores ──
  errorGenerico: 'No pudimos completar la respuesta. Revisa tu conexión e intenta de nuevo.',
  reintentar: 'Reintentar',
};

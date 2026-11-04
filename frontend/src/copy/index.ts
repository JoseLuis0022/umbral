/**
 * Todas las cadenas visibles de la interfaz, en un solo lugar, para poder
 * revisar el tono de una pasada.
 *
 * Reglas de redacción del proyecto:
 *  - Etiquetas en oración, nunca en mayúsculas.
 *  - Los botones nombran su acción, y ese nombre no cambia entre el botón y su
 *    confirmación: "Guardar cambios" produce "Cambios guardados".
 *  - Los errores dicen qué pasó y qué hacer. No se disculpan ni son vagos.
 */

export const marca = {
  nombre: 'Umbral',
  universidad: 'Universidad Aurora Ciudad de México',
  descriptor: 'Asistente interno',
};

export const login = {
  titulo: 'Umbral',
  subtitulo: 'Asistente interno · Universidad Aurora',
  correo: 'Correo institucional',
  contrasena: 'Contraseña',
  entrar: 'Entrar',
  entrando: 'Entrando…',
  microsoft: 'Continuar con cuenta institucional Microsoft',
  microsoftNota: 'Disponible en la siguiente versión',
  demoAbrir: 'Entrar como otro perfil',
  demoNota: 'Cualquier contraseña funciona en la demostración.',
  errorVacio: 'Escribe tu correo y tu contraseña para entrar.',
  pie: 'Herramienta interna · personal administrativo y profesorado',
};

export const chat = {
  saludo: (nombre: string) => `Hola, ${nombre}`,
  placeholder: 'Escribe tu pregunta…',
  enviar: 'Enviar mensaje',
  detener: 'Detener',
  adjuntar: 'Adjuntar archivo',
  nuevaSesion: 'Nueva sesión',
  avisoIA: 'La IA puede cometer errores. Verifica la información importante.',
  irAlUltimo: 'Ir al último mensaje',
  copiar: 'Copiar',
  copiado: 'Copiado',
  regenerar: 'Regenerar',
  utilSi: 'Respuesta útil',
  utilNo: 'Respuesta poco útil',
  // Rotan cada 4 segundos bajo el saludo del estado vacío.
  preguntasRotativas: [
    '¿Cómo resumo 250 correos sin leerlos uno por uno?',
    '¿Cómo restablezco mi contraseña institucional?',
    '¿Puedo usar IA para calificar exámenes?',
    '¿Cómo saco la minuta de una reunión de Teams?',
    '¿Cómo convierto un documento de 40 páginas en cinco puntos?',
  ],

  /**
   * Banco de sugerencias del estado vacío. Se muestran de cuatro en cuatro y
   * van rotando (ver `EstadoVacio`).
   *
   * TODAS preguntan CÓMO se hace algo, nunca ordenan la tarea. La diferencia no
   * es de estilo: "Resume mi bandeja de entrada" promete que la herramienta va
   * a entrar al correo de la persona y hacerlo, y no es lo que hace. Esto es un
   * asistente que ENSEÑA a usar Copilot y las herramientas institucionales, así
   * que la primera frase que alguien lee tiene que fijar esa expectativa; si la
   * fija mal, la segunda pregunta ya es un reclamo.
   */
  chips: [
    '¿Cómo resumo mi bandeja de entrada?',
    '¿Cómo hago el resumen de un documento de Word?',
    '¿Cómo saco la minuta de una reunión de Teams?',
    '¿Qué dice la política de IA de la Universidad?',
    '¿Cómo restablezco mi contraseña institucional?',
    '¿Cómo entro a Brightspace si me rechaza la contraseña?',
    '¿Cómo comparo dos versiones de un reglamento?',
    '¿Cómo redacto una convocatoria con ayuda de IA?',
    '¿Qué datos de estudiantes no puedo subir a la IA?',
    '¿Cómo configuro mi correo institucional en el teléfono?',
    '¿Cómo traduzco una carta sin que suene a traducción?',
    '¿Cómo preparo una rúbrica de evaluación con IA?',
  ],
  soloLecturaTitulo: 'Esta sesión se cerró',
  soloLecturaDetalle: 'Las conversaciones se cierran cinco horas después del último mensaje. Puedes seguir leyéndola.',
  soloLecturaAccion: 'Iniciar una nueva sesión sobre este tema',
  historialTitulo: 'Conversaciones',
  historialVacio: 'Aquí aparecerán tus conversaciones.',
  grupos: { hoy: 'Hoy', ayer: 'Ayer', semana: 'Últimos 7 días', anteriores: 'Anteriores' },
  renombrar: 'Renombrar',
  eliminar: 'Eliminar',
  errorEnvio: 'No pudimos enviar tu mensaje. Revisa tu conexión e intenta de nuevo.',
  errorTimeout: 'El asistente tardó demasiado en responder. Intenta de nuevo o reformula tu pregunta.',
};

export const alDia = {
  titulo: 'Al día',
  subtitulo: 'Guías cortas para resolver lo del día a día.',
  ordenEstrellas: 'Más útiles',
  ordenRecientes: 'Recientes',
  todasCategorias: 'Todas',
  minutos: (n: number) => `${n} min de lectura`,
  votar: 'Marcar como útil',
  quitarVoto: 'Quitar mi voto',
  requisitos: 'Antes de empezar',
  pasos: 'Pasos',
  siAlgoFalla: 'Si algo falla',
  preguntarAsistente: 'Preguntar al asistente',
  vacio: 'No hay guías en esta categoría.',
};

export const navegacion = {
  inicio: 'Inicio',
  alDia: 'Al día',
  /** Rótulo del grupo de administración en el menú plegado. */
  administracion: 'Administración',
  mas: 'Más',
  tablero: 'Tablero',
  corpus: 'Corpus',
  auditoria: 'Auditoría',
  boletines: 'Boletines',
  laboratorio: 'Laboratorio',
};

export const admin = {
  corpusTitulo: 'Corpus',
  corpusSubtitulo: 'Bases de conocimiento que alimentan al asistente.',
  nuevoCorpus: 'Nuevo corpus',
  documentos: (n: number) => `${n} ${n === 1 ? 'documento' : 'documentos'}`,
  soltarArchivos: 'Arrastra archivos aquí',
  soltarDetalle: 'o haz clic para elegirlos. Markdown y PDF, hasta 10 MB.',
  systemPrompt: 'System prompt',
  guardarCambios: 'Guardar cambios',
  cambiosGuardados: 'Cambios guardados',
  descartar: 'Descartar',
  reindexar: 'Reindexar',
  descargar: 'Descargar',
  eliminarDoc: 'Eliminar documento',
  visorVacio: 'Elige un documento de la lista para leerlo aquí.',
  estados: {
    en_cola: 'En cola',
    procesando: 'Procesando',
    indexado: 'Indexado',
    error: 'Error',
  },
  conversacionesTitulo: 'Auditoría de conversaciones',
  conversacionesSubtitulo: 'Todas las conversaciones de la comunidad universitaria.',
  filtrarPersona: 'Filtrar por persona',
  filtrarFecha: 'Filtrar por fecha',
  buscar: 'Buscar en conversaciones',
  todasPersonas: 'Todas las personas',
  resumenEjecutivo: 'Resumen ejecutivo',
  transcripcion: 'Transcripción',
  sinSeleccion: 'Elige una conversación de la lista para revisarla.',
  riesgo: 'Riesgo',
  ahorroTiempo: 'Ahorro de tiempo',
  ahorroCosto: 'Ahorro de costo',

  tableroTitulo: 'Tablero',
  tableroSubtitulo: 'Uso, ahorro y riesgo de la herramienta en toda la universidad.',
  boletinesTitulo: 'Boletines de Al día',
  boletinesSubtitulo: 'Aquí se redacta y se publica lo que lee la comunidad.',
  laboratorioTitulo: 'Laboratorio',
  laboratorioSubtitulo: 'Prueba el asistente con otros ajustes antes de moverlos en producción.',
};

export const ajustes = {
  titulo: 'Ajustes',
  subtitulo: 'Preferencias de esta instalación.',
  densidad: 'Densidad de la interfaz',
  densidadComoda: 'Cómoda',
  densidadCompacta: 'Compacta',
  tipografia: 'Tamaño de tipografía',
  restablecer: 'Restablecer datos de demostración',
  restablecerDetalle: 'Devuelve conversaciones, guías y corpus a su estado inicial. No se puede deshacer.',
  restablecerConfirmar: 'Restablecer datos',
  datosRestablecidos: 'Datos de demostración restablecidos',
};

export const perfil = {
  titulo: 'Perfil',
  subtitulo: 'Estos datos se sincronizan desde el directorio institucional.',
  nombre: 'Nombre',
  correo: 'Correo institucional',
  area: 'Área',
  rol: 'Rol en la herramienta',
  nota: 'Para corregir algún dato, escribe a la Dirección de Recursos Humanos.',
  cerrarSesion: 'Cerrar sesión',
  cambiarPerfil: 'Cambiar de perfil',
};

export const errores = {
  noEncontrada: 'No encontramos esa página',
  noEncontradaDetalle: 'La dirección que abriste no existe o cambió de lugar.',
  volverInicio: 'Volver al inicio',
  sinPermiso: 'Esta sección es solo para administradores',
  sinPermisoDetalle: 'Tu perfil actual no tiene acceso. Cambia de perfil si necesitas entrar.',
};

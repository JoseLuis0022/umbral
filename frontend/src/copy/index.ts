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

import type { Rol } from '../types';

export const marca = {
  nombre: 'Umbral',
  universidad: 'Universidad Aurora',
  descriptor: 'Asistente interno',
};

export const login = {
  titulo: 'Umbral',
  subtitulo: 'Asistente de estudio · Procesamiento Digital de Imágenes',
  correo: 'Correo',
  contrasena: 'Contraseña',
  entrar: 'Entrar',
  entrando: 'Entrando…',
  errorVacio: 'Escribe tu correo y tu contraseña para entrar.',
  errorCredenciales: 'Correo o contraseña incorrectos.',
  errorServidor: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  pie: 'Acceso solo con una cuenta que te haya dado quien administra el laboratorio',
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
    '¿Qué es la ecualización de histograma y cuándo conviene?',
    '¿En qué se diferencia el filtro de mediana del promedio?',
    '¿Qué entra en el próximo examen?',
    '¿Cómo se interpreta el espectro de Fourier de una imagen?',
    '¿Qué es la apertura en morfología matemática?',
  ],

  /**
   * Banco de sugerencias del estado vacío. Se muestran de cuatro en cuatro y
   * van rotando (ver `EstadoVacio`).
   *
   * Todas son preguntas que el agente de Procesamiento Digital de Imágenes
   * puede contestar con lo que hay en su carpeta (clases, diapositivas,
   * apuntes): un chip que el agente no sabe responder enseña, en la primera
   * frase, a desconfiar de él.
   */
  chips: [
    '¿Qué es la ecualización de histograma?',
    '¿Cómo funciona el filtro de Sobel?',
    '¿Qué es unsharp masking y high-boost?',
    '¿Qué dijo el profesor sobre la transformada de Fourier?',
    '¿Cuál es la diferencia entre filtrado espacial y en frecuencia?',
    '¿Qué es la transformada de Radón?',
    '¿Cuándo uso un filtro de mediana?',
    '¿Qué es la erosión y la dilatación?',
    '¿Qué temas entran en el próximo examen?',
    '¿Qué es la corrección gamma?',
    '¿Cómo se muestrea y cuantiza una imagen?',
    '¿Qué modelos de ruido vimos en clase?',
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

export const navegacion = {
  inicio: 'Inicio',
  /** Rótulo del grupo de administración en el menú plegado. */
  administracion: 'Administración',
  mas: 'Más',
  tablero: 'Tablero',
  corpus: 'Corpus',
  auditoria: 'Auditoría',
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
  restablecerDetalle: 'Borra lo que este navegador guarda (lista de conversaciones y preferencias). No se puede deshacer.',
  restablecerConfirmar: 'Restablecer datos',
  datosRestablecidos: 'Datos de demostración restablecidos',
};

export const perfil = {
  titulo: 'Perfil',
  subtitulo: 'Los datos de tu cuenta en el laboratorio.',
  nombre: 'Nombre',
  correo: 'Correo',
  area: 'Área',
  rol: 'Rol en la herramienta',
  nota: 'Para corregir algún dato, pídeselo a quien administra el laboratorio.',
  cerrarSesion: 'Cerrar sesión',
  // `satisfies Record<Rol, string>`: si el backend estrena un rol, el
  // compilador obliga a nombrarlo aquí en vez de mostrarlo como otro.
  roles: {
    usuario: 'Estudiante',
    especialista: 'Especialista',
    admin: 'Administrador',
  } satisfies Record<Rol, string>,
  modos: 'Modos del agente',
  sinAreaRegistrada: 'Sin área registrada',
};

export const errores = {
  noEncontrada: 'No encontramos esa página',
  noEncontradaDetalle: 'La dirección que abriste no existe o cambió de lugar.',
  volverInicio: 'Volver al inicio',
  sinPermiso: 'Esta sección es solo para administradores',
  sinPermisoDetalle: 'Tu cuenta no tiene acceso. Si lo necesitas, pídeselo a quien administra el laboratorio.',
  // Límite de error (LimiteError): una pantalla que falló al pintarse.
  renderTitulo: 'Esta pantalla dejó de responder',
  renderDetalle: 'Algo falló al mostrarla. Tu sesión sigue abierta: intenta de nuevo y, si se repite, recarga la página.',
  reintentar: 'Reintentar',
  recargar: 'Recargar la página',
};

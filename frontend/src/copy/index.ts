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
  historialTitulo: 'Conversaciones',
  historialVacio: 'Aquí aparecerán tus conversaciones.',
  grupos: { hoy: 'Hoy', ayer: 'Ayer', semana: 'Últimos 7 días', anteriores: 'Anteriores' },
  renombrar: 'Renombrar',
  eliminar: 'Eliminar',
  errorEnvio: 'No pudimos enviar tu mensaje. Revisa tu conexión e intenta de nuevo.',
  errorTimeout: 'El asistente tardó demasiado en responder. Intenta de nuevo o reformula tu pregunta.',
  errorCorte: 'Se cortó la conexión con el servidor antes de terminar la respuesta. Intenta de nuevo.',
  errorServidor: 'No pudimos contactar al servidor. Revisa tu conexión o espera un momento e intenta de nuevo.',
  motivoServidor: 'No pudimos contactar al servidor',
  avisoListo: 'Umbral terminó',
  avisoFallo: 'Umbral no pudo terminar',
  trabajando: 'Trabajando',
  trabajandoDetalle: 'Puedes cambiar de pantalla o cerrar la página: seguirá en el servidor.',
  tareasEnCurso: (n: number) => (n === 1 ? '1 tarea en curso' : `${n} tareas en curso`),
  pasos: (n: number) => (n === 1 ? '1 paso' : `${n} pasos`),
  continuar: 'Continuar donde se quedó',
  /** Lo que se le manda al agente al pulsar "Continuar": su sesión tiene todo lo que ya hizo. */
  textoContinuar: 'Continúa la tarea desde donde te quedaste. Revisa primero lo que ya quedó hecho para no repetirlo.',
  errorTrabajoPerdido: 'Esta respuesta se perdió porque el servidor se reinició mientras trabajaba. Vuelve a pedirla.',
  /** Lo que se lee mientras algo se reintenta solo. */
  reintentando: (motivo: string, intento: number, maximo: number) => `${motivo}. Reintentando (${intento} de ${maximo})…`,
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
  conversacionesTitulo: 'Auditoría',
  conversacionesSubtitulo: 'Cada pregunta que se le hizo al agente, con su respuesta, quién la hizo y cuánto costó.',
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

  laboratorioTitulo: 'Laboratorio',
  laboratorioSubtitulo: 'Prueba el asistente con otros ajustes antes de moverlos en producción.',
};

/** Auditoría real: `/admin/conversaciones`, leída de `GET /api/admin/consultas`. */
export const auditoria = {
  buscarPlaceholder: 'Buscar en preguntas y respuestas…',
  quitarBusqueda: 'Borrar la búsqueda',
  personasTitulo: 'Filtrar por persona',
  todasPersonas: 'Todas las personas',
  todasPersonasDetalle: 'Las consultas de todas las cuentas',
  consultasDe: (n: number) => `${n} ${n === 1 ? 'consulta' : 'consultas'} en el último año`,
  estadoTitulo: 'Filtrar por cómo terminó',
  todosEstados: 'Cualquier estado',
  estados: { corriendo: 'En curso', completa: 'Completa', cancelada: 'Cancelada', error: 'Con error' },
  actualizando: 'Actualizando…',
  conteo: (n: number, hayMas: boolean) => `${n}${hayMas ? '+' : ''} ${n === 1 && !hayMas ? 'consulta' : 'consultas'}`,
  cargarMas: 'Cargar más consultas',
  errorMas: 'No pudimos traer más. Intenta de nuevo.',
  sinResultados: 'Ninguna consulta coincide',
  sinResultadosDetalle: 'Prueba con otras palabras, otra persona u otro rango de fechas.',
  limpiarFiltros: 'Quitar todos los filtros',
  sinConsultas: 'Todavía nadie le ha preguntado al agente',
  sinConsultasDetalle: 'En cuanto alguien use el chat, su pregunta y la respuesta aparecerán aquí.',
  errorLista: 'No pudimos cargar las consultas',
  errorListaDetalle: 'Revisa que el servidor del laboratorio esté encendido e intenta de nuevo.',
  errorDetalle: 'No pudimos abrir esta consulta',
  errorDetalleDetalle: 'Intenta de nuevo o elige otra de la lista.',
  sinSeleccionTitulo: 'Ninguna consulta abierta',
  sinSeleccion: 'Elige una consulta de la lista para leer la pregunta, la respuesta y lo que costó.',
  plegarLista: 'Plegar la lista de consultas',
  desplegarLista: 'Desplegar la lista de consultas',
  volver: 'Volver a la lista',
  pregunta: 'Pregunta',
  respuesta: 'Respuesta',
  sinRespuesta: 'No hay respuesta guardada',
  sinRespuestaDetalle:
    'Las consultas anteriores a la auditoría solo guardaban la pregunta, y una consulta cancelada o con error puede no haber llegado a responder.',
  metricas: 'Cómo se resolvió',
  modelo: 'Modelo',
  perfil: 'Modo',
  costo: 'Costo',
  tokens: 'Tokens',
  tokensDetalle: (e: string, s: string, l: string, c: string) => `Entrada ${e} · salida ${s} · caché leída ${l} · caché escrita ${c}`,
  vueltas: 'Vueltas',
  duracion: 'Duración',
  herramientas: 'Herramientas',
  sinHerramientas: 'Ninguna',
  conversacion: 'Conversación',
  error: (codigo: string) => `La consulta terminó con error: ${codigo}.`,
  cancelada: 'La persona detuvo la respuesta antes de que terminara.',
  hecha: (fecha: string, hora: string) => `${fecha} a las ${hora}`,
  cuentaEliminada: 'Cuenta eliminada',
  sinDato: '—',
};

/** Tablero (`/admin/tablero`), leído de `GET /api/admin/resumen`. */
export const tablero = {
  titulo: 'Tablero',
  subtitulo: 'Cuánto se usa el agente, cuánto cuesta y quién lo usa.',
  periodoCorto: { 7: '7 días', 30: '30 días', 90: '90 días' } as Record<number, string>,
  actualizando: 'Actualizando…',
  errorTitulo: 'No pudimos cargar el tablero',
  errorDetalle: 'Revisa que el servidor del laboratorio esté encendido e intenta de nuevo.',
  vacioTitulo: 'Sin consultas en este periodo',
  vacioDetalle: 'Nadie le preguntó al agente en estos días. Amplía el periodo para ver si hubo movimiento antes.',
  vacioAccion: 'Ver los últimos 90 días',
  kpiConsultas: 'Consultas',
  kpiCosto: 'Costo',
  kpiPromedio: 'Costo por consulta',
  kpiErrores: 'Sin terminar',
  kpiErroresDetalle: (errores: number, canceladas: number) => `${errores} con error · ${canceladas} canceladas`,
  kpiHistorico: (consultas: string, costo: string) => `Histórico: ${consultas} · ${costo}`,
  kpiPeriodo: (dias: number) => `Últimos ${dias} días`,
  costoDia: 'Costo por día',
  costoDiaDetalle: 'Días en UTC, como los guarda el servidor.',
  lecturaDia: (dia: string, costo: string, n: number) => `${dia}: ${costo} · ${n} ${n === 1 ? 'consulta' : 'consultas'}`,
  lecturaTotal: (costo: string, n: number) => `Total: ${costo} · ${n} ${n === 1 ? 'consulta' : 'consultas'}`,
  colDia: 'Día',
  colConsultas: 'Consultas',
  colCosto: 'Costo',
  porPersona: 'Por persona',
  porPersonaDetalle: 'Quién usa el agente y cuánto cuesta cada quien.',
  colPersona: 'Persona',
  colUltima: 'Última consulta',
  porModelo: 'Por modelo',
  porModeloDetalle: 'Qué modelo respondió.',
  colModelo: 'Modelo',
  sinModelo: 'Sin dato',
  verConsultas: 'Ver sus consultas en Auditoría',
};

/** Corpus real (`/admin/corpus`), leído de `GET /api/admin/corpus`. */
export const corpus = {
  titulo: 'Corpus',
  subtitulo: 'Los archivos reales que el agente consulta, tal como están en su carpeta.',
  soloLectura:
    'Solo lectura. Los archivos los mantiene el agente: se actualizan desde la carpeta del agente, no desde aquí.',
  coleccion: 'Colección',
  coleccionTitulo: 'Elegir colección',
  archivos: (n: number) => `${n} ${n === 1 ? 'archivo' : 'archivos'}`,
  buscarPlaceholder: 'Buscar por nombre…',
  buscar: 'Buscar archivos por nombre',
  quitarBusqueda: 'Borrar la búsqueda',
  sensible: 'Sensible',
  sensibleDetalle:
    'Entregas calificadas del equipo. El modo de consulta de los estudiantes no puede leerlas; aquí se muestran solo a quien administra.',
  plegarLista: 'Plegar la lista de archivos',
  desplegarLista: 'Desplegar la lista de archivos',
  errorLista: 'No pudimos leer la carpeta del agente',
  errorListaDetalle: 'Revisa que el servidor del laboratorio esté encendido y que la carpeta exista.',
  vacioTitulo: 'La carpeta del agente está vacía',
  vacioDetalle: 'Cuando el agente procese clases y apuntes, sus archivos aparecerán aquí.',
  coleccionVacia: 'Esta colección no tiene archivos todavía.',
  sinResultados: 'Ningún archivo se llama así',
  sinResultadosDetalle: 'Prueba con otra parte del nombre o cambia de colección.',
  visorVacioTitulo: 'Ningún archivo abierto',
  visorVacio: 'Elige un archivo de la lista para leerlo aquí.',
  errorArchivo: 'No pudimos abrir este archivo',
  errorArchivoDetalle: 'Puede que se haya movido o que pese demasiado. Intenta de nuevo o descárgalo.',
  sinVistaTitulo: 'Este archivo no se puede previsualizar',
  sinVistaDetalle: 'Es un archivo de MATLAB, una imagen o un comprimido. Descárgalo para abrirlo en su programa.',
  descargar: 'Descargar',
  descargaFallo: 'No pudimos descargar el archivo. Intenta de nuevo.',
  modificado: (fecha: string) => `Modificado el ${fecha}`,
  htmlNota: 'Vista sin scripts ni imágenes externas: así se ve el texto del apunte, no su diseño completo.',
  pdfPagina: (n: number, total: number) => `Página ${n} de ${total}`,
  pdfAnterior: 'Página anterior',
  pdfSiguiente: 'Página siguiente',
  pdfCargando: 'Abriendo el PDF…',
  contenido: 'Contenido del archivo',
  volver: 'Volver a la lista',
  // Portada de carpetas
  carpetas: 'Carpetas',
  raiz: 'En la carpeta principal',
  volverCarpetas: 'Volver a las carpetas',
  grupoMaterial: 'Material del curso',
  grupoMaterialDetalle: 'Lo que los alumnos pueden pedir: el agente se los manda por el chat.',
  grupoMemoria: 'Memoria del agente',
  grupoMemoriaDetalle: 'Lo que el agente lee primero para orientarse. Los alumnos no lo reciben.',
  grupoPrivado: 'Privado',
  grupoPrivadoDetalle: 'Entregas del equipo. El modo de consulta no puede leerlas ni mandarlas.',
  actualizado: (fecha: string) => `actualizado ${fecha}`,
  buscarTodo: 'Buscar en todas las carpetas…',
  resultados: (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`,
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

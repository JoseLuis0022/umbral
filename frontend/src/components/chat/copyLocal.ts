/**
 * Cadenas que la pantalla de chat necesita y que `src/copy/index.ts` todavía
 * no tiene. Viven aquí, juntas y no repartidas por los componentes, para que
 * migrarlas al copy central sea mover un bloque — no ir a cazarlas.
 *
 * REPORTADO al orquestador: si estas cadenas se suben a `copy.chat`, este
 * archivo desaparece y los componentes cambian el import.
 */
export const copyLocal = {
  // Panel lateral
  mostrarHistorial: 'Mostrar conversaciones',
  ocultarHistorial: 'Ocultar conversaciones',
  opcionesConversacion: 'Opciones de la conversación',

  // Renombrar
  renombrarTitulo: 'Renombrar conversación',
  renombrarCampo: 'Nombre de la conversación',
  renombrarPlaceholder: 'Escribe un nombre corto',
  guardarNombre: 'Guardar nombre',
  nombreGuardado: 'Nombre guardado',
  cancelar: 'Cancelar',

  // Eliminar
  eliminarTitulo: 'Eliminar conversación',
  eliminarDetalle: (titulo: string) =>
    `Se quita "${titulo}" de tu historial junto con sus mensajes. No se puede deshacer.`,
  eliminarConfirmar: 'Eliminar conversación',
  conversacionEliminada: 'Conversación eliminada',

  // Adjuntos
  adjuntoPesado: (nombre: string) =>
    `${nombre} no cabe: un mensaje admite unos 22 MB de adjuntos en total (el tope de la API de Claude). Mándalo en otro mensaje o en una versión más ligera.`,
  adjuntoIlegible: (nombre: string) => `No pudimos leer ${nombre}. Prueba de nuevo o con otro formato.`,
  adjuntoLimite: 'Puedes adjuntar hasta 10 archivos por mensaje.',
  modoTitulo: 'Modo del agente',
  modoEtiqueta: (nombre: string) => `Modo del agente: ${nombre}`,
  modoFijo: 'El modo se elige al empezar la conversación. Para usar otro, abre una sesión nueva.',
  modoNota: 'Se aplica a la conversación nueva y queda fijo en ella. El generador puede ejecutar comandos y escribir en la carpeta del agente.',
  videoDetalle: (n: number) => `Video: el modelo verá ${n} fotogramas`,
  formatoAdjunto: { pdf: 'PDF', texto: 'Texto', video: 'Video', imagen: 'Imagen' } as Record<string, string>,
  adjuntarImagen: 'Adjuntar archivos',
  adjuntarImagenAyuda: 'Adjuntar archivos: imágenes, PDF, texto, código o video (también con ⌘V o arrastrándolos)',
  preparandoImagen: 'Preparando el archivo…',
  soltarImagenes: 'Suelta los archivos para adjuntarlos',
  verImagen: (nombre: string) => `Ver ${nombre}`,
  imagenNoDisponible: 'La imagen completa ya no está en esta sesión; se muestra la miniatura.',

  // Modelo y esfuerzo
  modeloEtiqueta: 'Modelo',
  /** "Lo que tenga configurado el perfil", para el modelo y para el esfuerzo. */
  automatico: 'Automático',
  modeloYEsfuerzo: (modelo: string, esfuerzo: string) => `Modelo: ${modelo}. Esfuerzo: ${esfuerzo}`,
  masModelos: 'Más modelos',
  volver: 'Volver',
  esfuerzoEtiqueta: 'Esfuerzo',
  esfuerzoBajo: 'Bajo',
  esfuerzoMedio: 'Medio',
  esfuerzoAlto: 'Alto',
  esfuerzoMuyAlto: 'Muy alto',
  esfuerzoMaximo: 'Máximo',

  // Contexto
  contextoTitulo: 'Contexto de la sesión',
  contextoResumen: (usados: string, maximo: string, pct: string) => `${usados} de ${maximo} tokens (${pct} %)`,
  contextoSinDato: 'El uso de contexto aparece después de la primera respuesta',
  contextoUmbral: 'Aquí el agente compacta la conversación automáticamente',
  contextoCompactacion: (restante: string) =>
    `Faltan ${restante} tokens para que el agente compacte la conversación (la resume para seguir).`,

  // Proceso del agente
  pensamientoEnVivo: 'Pensando…',
  procesoTitulo: 'Proceso',
  procesoPenso: (segundos: number) => `Pensó ${segundos} s`,
  procesoBusquedas: (n: number) => (n === 1 ? '1 búsqueda' : `${n} búsquedas`),
  procesoLecturas: (n: number) => (n === 1 ? '1 lectura' : `${n} lecturas`),
  procesoPasos: (n: number) => (n === 1 ? '1 paso' : `${n} pasos`),
  procesoSoloPensamiento: 'Pensamiento',
  procesoVer: 'Ver el proceso del agente',
  pasoListo: 'Listo',
  pasoFallo: 'No se completó',
  verMas: 'Ver más',
  verMenos: 'Ver menos',
  quitarAdjunto: (nombre: string) => `Quitar ${nombre}`,
  adjuntosNota: 'Las imágenes se reducen en tu navegador y el servidor no las guarda.',

  // Hilo
  pensando: 'Preparando respuesta…',
  /**
   * Las frases de cada paso del agente las redacta el backend
   * (`motor.describir`), sin rutas: ver lib/actividad.ts.
   */
  consultandoAgente: (nombre: string) => `Consultando a ${nombre.replace(/\s+/g, ' ').trim()}…`,
  escribiendo: 'El asistente está escribiendo la respuesta',
  conversacionNoEncontrada: 'No encontramos esa conversación',
  conversacionNoEncontradaDetalle:
    'Puede que se haya eliminado desde otra pestaña. Empieza una sesión nueva o elige otra del historial.',
  reintentar: 'Reintentar',
  hiloEtiqueta: 'Conversación con el asistente',
  sugerenciaEtiqueta: 'Usar esta pregunta',

  // Archivos que manda el agente
  archivosEtiqueta: 'Archivos que te mandó el asistente',
  abrirArchivo: (nombre: string) => `Abrir ${nombre}`,
  descargarArchivo: (nombre: string) => `Descargar ${nombre}`,
  descargaFallo: 'No pudimos descargar el archivo. Intenta de nuevo.',
  cerrarVisor: 'Cerrar',
  galeriaEtiqueta: (n: number) => `${n} ${n === 1 ? 'imagen' : 'imágenes'}`,
  descargarTodas: 'Descargar todas',
  formatoArchivo: { pdf: 'PDF', html: 'Apunte web', txt: 'Texto', md: 'Texto', imagen: 'Imagen', otro: 'Archivo' } as Record<string, string>,

} as const;

/** Muchas pantallas saludan por nombre; el apellido sobra en un saludo. */
export function primerNombre(nombreCompleto: string) {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

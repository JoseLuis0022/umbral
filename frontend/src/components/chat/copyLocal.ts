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
  soloLecturaEtiqueta: 'Solo lectura',
  soloLecturaTitulo: 'Sesión cerrada, solo lectura',

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
  adjuntoPesado: (nombre: string) => `${nombre} pesa más de 10 MB. Adjunta una versión más ligera.`,
  adjuntoTipo: (nombre: string) => `${nombre} no es un formato admitido. Se aceptan PDF, Word, correos e imágenes.`,
  adjuntoLimite: 'Puedes adjuntar hasta 5 archivos por mensaje.',
  quitarAdjunto: (nombre: string) => `Quitar ${nombre}`,
  adjuntosNota: 'Se procesan en esta sesión y no se guardan en ningún servidor.',

  // Hilo
  pensando: 'Preparando respuesta…',
  /**
   * Lo que el agente está haciendo antes de escribir, en lenguaje de persona.
   * `lib/actividad.ts` traduce cada herramienta y ruta a una de estas frases:
   * el estudiante lee "Leyendo el resumen de la Clase 12…", no
   * "Read estado/inventario/clase-12.md".
   */
  consultandoAgente: (nombre: string) => `Consultando a ${nombre.replace(/\s+/g, ' ').trim()}…`,
  actividadIndice: 'Revisando el índice de temas…',
  actividadResumenClase: (n: string) => `Leyendo el resumen de la Clase ${n}…`,
  actividadPractica: (n: string) => `Leyendo qué pide la Práctica ${n}…`,
  actividadDiapositivas: 'Revisando las diapositivas del profesor…',
  actividadCalendario: 'Revisando el calendario del curso…',
  actividadApuntes: (n: string) => `Leyendo los apuntes del Tema ${n}…`,
  actividadTranscripcion: (n: string) => `Buscando en la grabación de la Clase ${n}…`,
  actividadBuscar: (patron: string) => `Buscando «${patron}» en el material…`,
  actividadRevisar: 'Revisando el material del curso…',
  escribiendo: 'El asistente está escribiendo la respuesta',
  conversacionNoEncontrada: 'No encontramos esa conversación',
  conversacionNoEncontradaDetalle:
    'Puede que se haya eliminado desde otra pestaña. Empieza una sesión nueva o elige otra del historial.',
  reintentar: 'Reintentar',
  hiloEtiqueta: 'Conversación con el asistente',
  sugerenciaEtiqueta: 'Usar esta pregunta',

  // Nueva sesión desde una conversación cerrada
  contextoNuevaSesion: (titulo: string) => `Retomo el tema de "${titulo}": `,
} as const;

/** Muchas pantallas saludan por nombre; el apellido sobra en un saludo. */
export function primerNombre(nombreCompleto: string) {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

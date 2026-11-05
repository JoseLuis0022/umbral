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
  carrilInstruccionesPuestas: 'puestas',
  carrilInstruccionesVacias: 'sin instrucciones',
  avisoAlcance:
    'Todo lo que ajustes aquí vale solo para esta sesión de pruebas. No cambia el asistente que usa la comunidad ni entra a su historial.',

  // ── Base de conocimiento (primera decisión) ──
  corpusEtiqueta: 'Fuente de consulta',
  corpusAyuda:
    'El agente busca siempre en su carpeta completa: resúmenes de clase, apuntes, transcripciones y diapositivas. No hay una base que elegir.',
  corpusVer: 'Ver los archivos en Corpus',
  corpusCarril: 'Carpeta del agente',

  modeloEtiqueta: 'Modelo',
  modeloAbrir: 'Elegir modelo',
  modeloAyuda: 'El identificador técnico es el que se copia en la configuración del perfil del agente.',

  // ── Instrucciones del sistema ──
  instruccionesEtiqueta: 'Instrucciones del sistema',
  instruccionesAyuda: 'Reemplazan por completo las instrucciones del perfil de consulta en esta prueba.',
  instruccionesVacio: 'Sin instrucciones propias. El agente usa las del perfil de consulta.',
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
    'El agente actual no usa este ajuste: se ignora al enviar. Se conserva para comparar con otros motores.',

  memoriaTitulo: 'Memoria y contexto',
  memoriaExplicacion:
    'La memoria de la conversación no vive en esta pantalla: el servidor reanuda la sesión del agente asociada a este sessionId. Por eso borrarla significa estrenar un sessionId — es lo único que corta el contexto de verdad.',
  memoriaBoton: 'Borrar memoria y contexto',
  memoriaHecho: (sesion: string) => `Memoria borrada. Sesión nueva: ${sesion}`,

  restablecerBoton: 'Restablecer parámetros',
  restablecerHecho: 'Parámetros de vuelta en sus valores por defecto.',

  // ── Conversación de prueba ──
  conversacionTitulo: 'Conversación de prueba',
  vacioTitulo: 'Haz la primera pregunta',
  vacioDetalle:
    'Cambia los parámetros y mira cómo cambia la respuesta. Nada de lo que pruebes aquí entra al historial de la comunidad.',
  ejemplos: [
    '¿Qué es la ecualización de histograma y cómo se calcula?',
    '¿En qué se diferencia un filtro de mediana de uno de promedio?',
    'Resume lo que entra en el Examen 7.',
    '¿Qué es la transformada de Radón y para qué sirve?',
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

  // ── Recorrido del agente ──
  cadenaTitulo: 'Recorrido del agente',
  cadenaPrincipal: 'Agente',
  cadenaDelegado: 'Subagente',
  cadenaTrabajando: 'trabajando…',

  // ── Métricas ──
  metricaPrimer: 'Primer fragmento',
  metricaTotal: 'Tiempo total',
  metricaFragmentos: 'Fragmentos',
  metricaCaracteres: 'Caracteres',
  metricaTokens: 'Tokens aprox.',
  /** Se lee al pasar el cursor: dice de dónde sale la cifra y que es estimada. */
  metricaTokensDetalle: (entrada: string, salida: string) =>
    `Estimación, no medición: el simulador no reporta consumo. Se calcula a razón de 4 caracteres por token. Entrada ≈ ${entrada} · Salida ≈ ${salida}.`,
  // Con el backend real, el evento `fin` trae el consumo MEDIDO.
  metricaCosto: 'Costo',
  metricaCostoDetalle: 'Lo que reportó la API de Anthropic para esta respuesta, en dólares.',
  metricaVueltas: 'Vueltas',
  metricaVueltasDetalle: 'Veces que el agente llamó al modelo en el agentic loop.',
  metricaTokensReales: 'Tokens',
  /** Entrada + caché / salida. Se lee al pasar el cursor. */
  metricaTokensRealesDetalle: (entrada: string, cacheLectura: string, cacheEscritura: string, salida: string) =>
    `Medido por la API. Entrada nueva: ${entrada} · leída de caché: ${cacheLectura} · escrita en caché: ${cacheEscritura} · salida: ${salida}. La caché se cobra a cerca del 10% de la entrada normal.`,
  metricaSinDato: '—',

  // ── Errores ──
  errorGenerico: 'No pudimos completar la respuesta. Revisa tu conexión e intenta de nuevo.',
  reintentar: 'Reintentar',
};

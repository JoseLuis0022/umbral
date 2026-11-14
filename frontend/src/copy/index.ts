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

export const acceso = {
  legal: 'Documentos legales',
  privacidad: 'Privacidad',
  terminos: 'Términos',
  leyendaGrafica:
    'Una imagen en escala de grises se vuelve blanco y negro al cruzar el umbral T. Umbral responde tus dudas del curso citando la clase de donde sale cada dato.',
};

/**
 * Landing pública (`/` sin sesión) y su encabezado y pie, que comparten las
 * páginas legales. Para reclutadores, desarrolladores y equipos que buscan
 * llevar un agente a producción. Cifras con fecha y fuente: nada que no se
 * pueda comprobar en el repo o en el registro de consultas. Las respuestas de
 * las preguntas frecuentes son concretas a propósito: se citan solas.
 */
const REPO = 'https://github.com/JoseLuis0022/umbral';

export const landing = {
  github: REPO,
  readme: `${REPO}#readme`,
  licencia: `${REPO}/blob/main/LICENSE`,
  contacto: 'joseluismacedo@imperioon.com',
  nav: {
    inicio: 'Umbral, inicio',
    principal: 'Secciones',
    funciones: 'Funciones',
    comoFunciona: 'Cómo funciona',
    preguntas: 'Preguntas',
    codigo: 'Código',
    entrar: 'Entrar',
  },
  hero: {
    titulo: 'Tu agente de Claude, de la laptop a una app web para tu equipo.',
    subtitulo:
      'Umbral toma la carpeta de un agente de Claude Code (su CLAUDE.md, sus skills y su material) y la sirve con cuentas, control de gasto y respuestas que citan su fuente.',
    probar: 'Probar la demo',
    codigo: 'Ver en GitHub',
    nota: 'Código abierto con licencia MIT. Se despliega con un solo docker compose up.',
    altMac: 'Umbral en una laptop: una respuesta del asistente que cita la clase de donde sale.',
    altIphone: 'La misma conversación en un celular.',
  },
  confianza: {
    etiqueta: 'Lo esencial',
    puntos: [
      ['Código abierto', 'Licencia MIT, en GitHub'],
      ['Cita su fuente', 'Clase y página del PDF'],
      ['Gasto con tope', 'Por consulta, cuenta y mes'],
      ['Despliegue con Docker', 'Con docker compose up'],
      ['53 pruebas', 'En cada push, con CI'],
    ] as const,
  },
  problema: {
    etiqueta: 'El problema',
    titulo: 'En tu computadora, un agente es una carpeta. Para tu equipo tiene que ser un producto.',
    texto: 'El agente funciona en Claude Code, pero solo para quien lo corre. Para que lo use alguien más faltan cuatro piezas.',
    piezas: [
      ['Cuentas y permisos', 'Registro con verificación por correo, roles y los modos que cada rol puede usar.'],
      ['Un gasto con techo', 'Tope por consulta, por cuenta y por mes, aplicado en el servidor y no en el navegador.'],
      ['Tareas que no dependen de la pestaña', 'Una respuesta de varios minutos no puede morir porque alguien cerró el navegador.'],
      ['Un servidor', 'Docker Compose, nginx y un túnel de Cloudflare. Sin servicios administrados.'],
    ] as const,
  },
  funciones: {
    etiqueta: 'Funciones',
    titulo: 'Lo que el agente ya sabía hacer, ahora para más personas.',
    etiquetaPestanas: 'Funciones de Umbral',
    pestanas: [
      {
        id: 'chat',
        nombre: 'Chat',
        imagen: 'mac-chat',
        alt: 'El chat de Umbral con una respuesta que cita la clase de donde sale.',
        titulo: 'Respuestas con su fuente.',
        puntos: [
          'Cada dato enlaza la clase o el apunte de donde sale; un clic abre el PDF en la página exacta, con la frase marcada.',
          'La consulta vive en el servidor: cerrar la pestaña o recargar no la cancela.',
          'Historial en el servidor, el mismo en la laptop y en el celular.',
          'Adjunta imágenes, PDF o texto a la pregunta.',
        ],
      },
      {
        id: 'tablero',
        nombre: 'Tablero',
        imagen: 'mac-tablero',
        alt: 'Tablero de Umbral con el costo por día, por persona y por modelo.',
        titulo: 'Sabes cuánto cuesta cada día.',
        puntos: [
          'Consultas y gasto por día, por persona y por modelo.',
          'Las consultas en curso suman en vivo, antes de terminar.',
          'Crédito propio por cuenta de invitado y un tope mensual compartido.',
        ],
      },
      {
        id: 'auditoria',
        nombre: 'Auditoría',
        imagen: 'mac-auditoria',
        alt: 'Auditoría de Umbral con el detalle de una consulta.',
        titulo: 'Cada respuesta se puede revisar.',
        puntos: [
          'La pregunta y la respuesta tal como la vio la persona.',
          'Modelo, tokens, duración y costo de cada consulta.',
          'Las herramientas que usó el agente, en orden, con errores y reintentos.',
          'Búsqueda por texto, por persona y por fecha.',
        ],
      },
      {
        id: 'material',
        nombre: 'Material',
        imagen: 'mac-corpus',
        alt: 'Explorador del material del agente en Umbral.',
        titulo: 'El material, tal como está.',
        puntos: [
          'El agente busca en su carpeta con Grep y Read, igual que en la laptop.',
          'Sin índice que mantener ni fragmentos que se desactualicen.',
          'PDF, Markdown y transcripciones; carpetas privadas que el agente no lee.',
          'Solo lectura desde la web: el material lo mantiene el agente.',
        ],
      },
    ] as const,
  },
  caso: {
    etiqueta: 'El caso real',
    titulo: 'Un asistente de estudio para un curso universitario.',
    texto:
      'El primer agente que corre en Umbral acompaña un curso de Procesamiento Digital de Imágenes. Los alumnos preguntan como le preguntarían a un compañero, y el agente responde con el material del curso: las clases, sus transcripciones y los PDF.',
    puntos: [
      ['Cita la clase y la página', 'Cada respuesta dice de qué clase sale el dato y en qué página del PDF está. Un clic abre el documento ahí.'],
      ['Busca antes de responder', 'Lee el material con Grep y Read antes de escribir, como lo haría quien estudia con los apuntes abiertos.'],
      ['Abierto para probar', 'Cualquiera puede crear una cuenta de invitado con Claude Haiku y un crédito de US$0.30.'],
    ] as const,
    ejemplo: {
      leyenda: 'Una respuesta del asistente, tal como se ve en el chat.',
      pregunta: '¿Por qué el filtro de mediana quita mejor el ruido sal y pimienta que el promedio?',
      proceso: 'Pensó 6 s: 1 búsqueda, 2 lecturas',
      respuesta:
        'El ruido sal y pimienta son pixeles aislados que valen 0 o 255. El filtro de promedio los mezcla con sus vecinos y los reparte; la mediana los descarta. Un pixel de ruido queda en un extremo de la lista ordenada, así que casi nunca es el valor central',
      cita: 'Clase 5',
    },
  },
  cifras: {
    etiqueta: 'En producción',
    titulo: 'Lo que cuesta y lo que tarda, medido.',
    nota: 'Medianas del registro de consultas en producción, noviembre de 2026, modo Consulta.',
    datos: [
      { valor: 0.033, decimales: 3, prefijo: 'US$', sufijo: '', etiqueta: 'por pregunta con Claude Sonnet 5.5' },
      { valor: 8, decimales: 0, prefijo: '', sufijo: ' s', etiqueta: 'por respuesta, con búsqueda en el material' },
      { valor: 3.4, decimales: 1, prefijo: '', sufijo: '×', etiqueta: 'más barato que Opus 5.5, que cuesta US$0.114 por pregunta' },
      { valor: 53, decimales: 0, prefijo: '', sufijo: '', etiqueta: 'pruebas automáticas en cada push' },
    ] as const,
  },
  funciona: {
    etiqueta: 'Cómo funciona',
    titulo: 'Una puerta delante del agente, sin tocar el agente.',
    pasos: [
      ['El navegador', 'React y Vite. Muestra; no decide nada de seguridad.'],
      ['La puerta', 'FastAPI: quién eres, qué rol tienes, qué modo puedes usar y cuánto crédito te queda.'],
      ['El trabajo', 'Cada consulta es una tarea propia en el servidor; la conexión solo la observa por SSE.'],
      ['El motor', 'Claude Agent SDK: corre el agente y traduce sus pasos a eventos.'],
      ['El agente', 'La misma carpeta de la laptop: CLAUDE.md, skills y material.'],
    ] as const,
    stackTitulo: 'Con qué está hecho',
    stack: [
      ['Agente', 'Claude Agent SDK, Claude Code'],
      ['Backend', 'Python, FastAPI, SQLite, SSE'],
      ['Frontend', 'React, TypeScript, Tailwind CSS'],
      ['Infraestructura', 'Docker Compose, nginx, Cloudflare Tunnel'],
    ] as const,
  },
  desplegar: {
    etiqueta: 'Despliégalo en tu servidor',
    titulo: 'Tres pasos en un servidor con Docker.',
    pasos: [
      ['Clona el repositorio', 'En cualquier servidor Linux con Docker y Docker Compose v2.'],
      ['Llena el .env', 'Tu API key de Anthropic y una clave para firmar las sesiones. Lo demás trae valores por defecto.'],
      ['Levántalo', 'nginx, el backend y el respaldo diario de la base arrancan juntos. Umbral queda en el puerto 8080.'],
    ] as const,
    codigo: [
      { texto: 'git clone https://github.com/JoseLuis0022/umbral.git' },
      { texto: 'cd umbral' },
      { texto: 'cp .env.example .env', comentario: 'ANTHROPIC_API_KEY y JWT_SECRETO' },
      { texto: 'docker compose up -d' },
    ] as const,
    etiquetaCodigo: 'Comandos para desplegar Umbral',
    copiar: 'Copiar',
    copiado: 'Copiado',
    nota: 'La guía completa, con HTTPS, la carpeta del agente y la cuenta de administrador, está en el README.',
    leerGuia: 'Leer la guía',
  },
  preguntas: {
    etiqueta: 'Preguntas',
    titulo: 'Preguntas frecuentes',
    lista: [
      [
        '¿Qué modelos usa?',
        'Claude, de Anthropic. El modo Consulta usa Claude Sonnet 5.5; el Generador de apuntes, solo para especialistas y administradores, usa Claude Opus 5.5. Las cuentas de invitado usan siempre Claude Haiku 5.5. El modelo lo decide el rol de cada cuenta, no la persona.',
      ],
      [
        '¿Necesito RAG o embeddings?',
        'No. El agente busca en su carpeta con Grep y Read, como lo hace en tu laptop con Claude Code: no hay índice vectorial que construir ni fragmentos que se desactualicen al cambiar un archivo. Esta búsqueda agéntica se está midiendo contra un RAG con embeddings, BM25 y reranker sobre un banco de 202 preguntas del mismo material; los resultados se publicarán en el repositorio.',
      ],
      [
        '¿Cuánto cuesta operarlo?',
        'El software es gratuito. Pagas el servidor y el uso de la API de Anthropic. En producción, la mediana es de US$0.033 por pregunta con Sonnet 5.5 y de US$0.0035 con Haiku 5.5. Umbral corta el gasto en el servidor con tres topes: por consulta, por cuenta y uno mensual para todas las cuentas de invitado.',
      ],
      [
        '¿Dónde viven los datos?',
        'En tu servidor. Las cuentas, el historial y el registro de consultas se guardan en una base SQLite dentro del propio despliegue, con un respaldo diario. Lo que sale del servidor es lo que el agente manda a la API de Anthropic para responder: la pregunta, los adjuntos y los fragmentos del material que lee.',
      ],
      [
        '¿Puedo usar mi propio material?',
        'Sí. Umbral sirve cualquier carpeta de agente de Claude Code: un CLAUDE.md con las instrucciones, tus skills y tu material en PDF, Markdown o texto. Montas la carpeta en el servidor y la variable AGENTE_DIR apunta a ella. Puedes marcar carpetas privadas que el modo Consulta nunca lee.',
      ],
      [
        '¿Qué pasa si cierro la pestaña a mitad de una respuesta?',
        'La consulta sigue. Cada pregunta es una tarea en el servidor y el navegador solo la observa; al volver, la respuesta está completa en el historial, también desde otro dispositivo.',
      ],
      [
        '¿Es código abierto?',
        'Sí, con licencia MIT: puedes usarlo, modificarlo y desplegarlo, también con fines comerciales. El código está en GitHub. El material de cada agente o curso no forma parte del repositorio y pertenece a sus autores.',
      ],
    ] as const,
  },
  comparacion: {
    etiqueta: 'Comparación',
    titulo: 'Qué cambia frente a las otras opciones.',
    texto: 'Una comparación general y honesta. Un chatbot con RAG o una plataforma concreta puede tener algunas de estas funciones; donde depende, lo decimos.',
    leyenda: 'Umbral comparado con Claude Code en tu laptop, un chatbot con RAG y construirlo desde cero.',
    columnas: ['Umbral', 'Claude Code en tu laptop', 'Un chatbot con RAG', 'Construirlo desde cero'] as const,
    si: 'Sí',
    no: 'No',
    // `true` = sí, `false` = no; el texto aclara cuando depende.
    filas: [
      ['Lo usan otras personas con su cuenta', [true, false, 'Según la plataforma', 'Lo programas tú']],
      ['Cita la página exacta de la fuente', ['Clase y página, con la frase', 'Si se lo pides en el CLAUDE.md', 'Suele citar el fragmento', 'Lo programas tú']],
      ['Tope de gasto por cuenta y por mes', [true, false, 'Según la plataforma', 'Lo programas tú']],
      ['La respuesta sigue si cierras la pestaña', [true, 'Corre en tu terminal', 'Según la plataforma', 'Lo programas tú']],
      ['Auditoría de cada consulta', [true, false, 'Según la plataforma', 'Lo programas tú']],
      ['Mantener un índice de embeddings', ['No hace falta', 'No hace falta', 'Sí, al cambiar el material', 'Según el diseño']],
      ['Tiempo para tenerlo en producción', ['Horas: clonar, .env y docker compose up', 'No está pensado para eso', 'Días, según la plataforma', 'Semanas']],
      ['Código abierto', ['MIT', false, 'Según la plataforma', 'Es tuyo']],
    ] as const,
  },
  cierre: {
    titulo: 'Pruébalo con el asistente de estudio.',
    texto: 'Crea una cuenta de invitado y pregúntale lo que quieras sobre Procesamiento Digital de Imágenes. Usa Claude Haiku con un crédito de prueba de US$0.30, sin tarjeta.',
    probar: 'Probar la demo',
    codigo: 'Ver en GitHub',
    alt: 'Umbral en una tableta: el chat del asistente de estudio.',
  },
  equipo: {
    etiqueta: 'Para tu equipo',
    titulo: '¿Tienes un agente o un corpus que quieras poner en manos de tu equipo?',
    texto:
      'Puedo ayudarte a montarlo con tu material: documentación interna, manuales o un curso. Cuéntame qué tienes y qué quieres que responda.',
    escribir: 'Escríbeme',
    asunto: 'Umbral para mi equipo',
  },
  pie: {
    descripcion: 'Una app web para poner un agente de Claude Code en manos de tu equipo, con cuentas, control de gasto y respuestas con fuente.',
    producto: 'Producto',
    recursos: 'Recursos',
    legal: 'Legal',
    contacto: 'Contacto',
    probar: 'Probar la demo',
    github: 'GitHub',
    documentacion: 'Documentación',
    licencia: 'Licencia MIT',
    privacidad: 'Privacidad',
    terminos: 'Términos',
    derechos: '© 2026 José Luis Macedo Escamilla. Hecho en México.',
    productoDe: 'Un producto de',
    imperioon: 'Imperioon',
    urlImperioon: 'https://imperioon.com',
  },
};

/**
 * Páginas legales públicas (`/privacidad` y `/terminos`). Redactadas a partir
 * de lo que el backend hace de verdad (backend/app/: db.py, rutas_auth.py,
 * rutas_chat.py, correo.py, respaldo.py): si cambia qué se guarda o con quién
 * se comparte, este texto cambia en el mismo commit.
 */
export type SeccionLegal = { titulo: string; parrafos?: readonly string[]; lista?: readonly string[]; cierre?: string };

export const legal = {
  actualizado: 'Última actualización: 13 de noviembre de 2026',
  indice: 'En esta página',
  otra: { privacidad: 'Leer la política de privacidad', terminos: 'Leer los términos de uso' },
  privacidad: {
    titulo: 'Política de privacidad',
    intro:
      'Esta política explica qué datos personales recaba Umbral (umbral.imperioon.com), para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.',
    secciones: [
      {
        titulo: 'Quién es responsable de tus datos',
        parrafos: [
          'José Luis Macedo Escamilla (Imperioon), con domicilio en Fraccionamiento Los Héroes Tecámac, Sector 19, Manzana 51, Lote 15, Casa 4, Tecámac, Estado de México, México, es el responsable del tratamiento de tus datos personales.',
          'Para cualquier asunto de privacidad escribe a joseluismacedo@imperioon.com.',
        ],
      },
      {
        titulo: 'Qué datos recabamos',
        lista: [
          'Al crear tu cuenta: tu nombre, tu correo y tu contraseña. La contraseña no se guarda: se guarda solo una huella calculada con Argon2, que no permite recuperarla.',
          'La dirección IP desde la que te registras. Sirve para limitar a tres las cuentas nuevas por dirección en 24 horas y evitar abusos.',
          'El enlace y el código de verificación que te enviamos por correo, guardados solo como huella y con fecha de caducidad.',
          'Tus conversaciones: el historial que ves en el chat se guarda en el servidor para que lo encuentres desde cualquier dispositivo.',
          'El registro de cada consulta: la pregunta, la respuesta, el modelo, los tokens, las herramientas que usó el agente, la duración y el costo. Sirve para revisar la calidad de las respuestas y controlar el gasto.',
          'Los archivos que adjuntas: se envían al modelo para responder tu pregunta y no se guardan como archivos sueltos. El historial conserva su nombre, su tamaño y, en las imágenes, una miniatura, y el registro de la sesión del agente en el servidor puede conservar su contenido para poder continuar la conversación.',
          'Registros técnicos del servidor: la dirección IP, la fecha, la dirección solicitada y el navegador de cada petición, además de eventos como registros, intentos fallidos de inicio de sesión y consultas, que incluyen tu correo.',
        ],
        cierre: 'No pedimos datos personales sensibles. Te pedimos no incluirlos en tus preguntas ni en tus adjuntos.',
      },
      {
        titulo: 'Qué guarda tu navegador',
        parrafos: [
          'Umbral usa el almacenamiento local de tu navegador para tu token de sesión, los datos básicos de tu cuenta, una copia del historial para mostrarlo al instante y tus preferencias de interfaz (densidad, tamaño de texto, contraste y movimiento).',
          'No usamos cookies de rastreo ni herramientas de analítica o publicidad de terceros. Puedes borrar lo que guarda tu navegador desde Ajustes o desde la configuración del propio navegador.',
        ],
      },
      {
        titulo: 'Para qué los usamos',
        lista: [
          'Crear y proteger tu cuenta, y confirmar que el correo es tuyo.',
          'Responder tus preguntas y guardar tu historial.',
          'Aplicar tu crédito de prueba, los límites diarios y los topes de gasto.',
          'Revisar la calidad y el costo de las respuestas para mejorar el agente.',
          'Prevenir abusos, mantener la seguridad del servicio y resolver fallas.',
        ],
        cierre:
          'Todas son necesarias para darte el servicio. No vendemos tus datos, no los usamos para publicidad y no hacemos perfiles comerciales.',
      },
      {
        titulo: 'Con quién los compartimos',
        parrafos: [
          'Umbral corre en un servidor propio ubicado en México. Para funcionar se apoya en estos proveedores, que tratan tus datos por cuenta nuestra y solo para lo que se indica:',
        ],
        lista: [
          'Anthropic (Estados Unidos): procesa tus preguntas, tus adjuntos y los fragmentos del material del curso para generar cada respuesta con Claude, a través de su API.',
          'Cloudflare (Estados Unidos): la red y el túnel por los que viaja el tráfico entre tu navegador y el servidor.',
          'Google, con Gmail (Estados Unidos): envía los correos de verificación, así que recibe tu dirección de correo y el contenido de ese mensaje.',
        ],
        cierre:
          'Fuera de ellos, solo compartiríamos tus datos si lo exige una autoridad competente conforme a la ley.',
      },
      {
        titulo: 'Cuánto tiempo los conservamos',
        parrafos: [
          'Tu cuenta, tus conversaciones y el registro de tus consultas se conservan mientras tu cuenta exista. Puedes borrar cualquier conversación desde el chat en cualquier momento.',
          'Si pides cancelar tu cuenta, borramos tus datos de la cuenta (nombre, correo y contraseña) y tus conversaciones. El registro de tus consultas (pregunta, respuesta, modelo, tokens y costo) se conserva para la auditoría de costos, pero queda desvinculado: ya no muestra a qué persona pertenecía. Si quieres que también se borre, pídelo por correo y lo eliminamos. La base de datos se respalda una vez al día y se guardan los últimos 14 respaldos, así que una copia puede tardar hasta 14 días en desaparecer de ellos.',
          'Los registros técnicos del servidor se conservan solo el tiempo necesario para la seguridad y el diagnóstico de fallas.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso (derechos ARCO), así como revocar tu consentimiento o limitar su uso.',
          'Para hacerlo, escribe a joseluismacedo@imperioon.com con el asunto "Derechos ARCO" e incluye tu nombre, el correo de tu cuenta, qué derecho quieres ejercer y sobre qué datos, y una copia de una identificación oficial (o la de tu representante, con el documento que lo acredite).',
          'Te responderemos en un plazo máximo de 20 días hábiles, y si la solicitud procede, la haremos efectiva dentro de los 15 días hábiles siguientes.',
        ],
      },
      {
        titulo: 'Cómo los protegemos',
        parrafos: [
          'Todo el tráfico viaja cifrado por HTTPS. Las contraseñas y los códigos se guardan solo como huella. La identidad de cada petición sale de tu sesión y no del navegador, y solo el administrador puede leer el registro de consultas.',
        ],
      },
      {
        titulo: 'Cambios a esta política',
        parrafos: [
          'Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización. Si el cambio afecta cómo usamos tus datos, te avisaremos además por correo.',
        ],
      },
    ] satisfies SeccionLegal[],
  },
  terminos: {
    titulo: 'Términos de uso',
    intro:
      'Estos términos regulan el uso de Umbral (umbral.imperioon.com), operado por José Luis Macedo Escamilla (Imperioon). Al crear una cuenta o usar el servicio los aceptas, junto con la Política de privacidad.',
    secciones: [
      {
        titulo: 'Qué es Umbral',
        parrafos: [
          'Umbral es un servicio de demostración y de uso educativo: muestra cómo poner un agente de Claude Code en manos de un equipo. El agente que hoy responde es un asistente de estudio para un curso universitario de Procesamiento Digital de Imágenes.',
          'No es un servicio comercial, no tiene costo para ti y puede cambiar, interrumpirse o dejar de existir sin previo aviso.',
        ],
      },
      {
        titulo: 'La IA puede equivocarse',
        parrafos: [
          'Las respuestas las genera un modelo de inteligencia artificial y pueden contener errores, aunque citen su fuente. Verifica la información importante en la fuente citada o con tu profesor.',
          'Umbral no sustituye la clase, los materiales oficiales del curso ni la asesoría de un profesional.',
        ],
      },
      {
        titulo: 'Tu cuenta',
        lista: [
          'Usa datos verdaderos y un correo al que tengas acceso.',
          'Cuida tu contraseña: eres responsable de lo que se haga con tu cuenta.',
          'Una cuenta por persona. No crees varias para evadir los límites.',
        ],
      },
      {
        titulo: 'Modo invitado y crédito de prueba',
        parrafos: [
          'Las cuentas nuevas entran en modo invitado: usan Claude Haiku, tienen un crédito de prueba de US$0.30 y hasta 25 consultas al día. El crédito no se recarga solo y, al agotarse, la cuenta deja de poder preguntar.',
          'Además, todas las cuentas de invitado comparten un tope de gasto mensual, así que el servicio puede dejar de responder antes de que agotes tu crédito. Si necesitas más acceso, escríbenos.',
        ],
      },
      {
        titulo: 'Uso aceptable',
        parrafos: ['Al usar Umbral te comprometes a no:'],
        lista: [
          'Intentar acceder a cuentas, datos o partes del servidor que no te corresponden, ni probar sus defensas sin permiso.',
          'Automatizar consultas o sobrecargar el servicio.',
          'Enviar contenido ilícito, ofensivo o datos personales de otras personas sin su permiso.',
          'Usarlo para incumplir las reglas académicas de tu institución o las políticas de uso de Anthropic.',
        ],
        cierre: 'Podemos suspender o borrar cuentas que incumplan estos términos.',
      },
      {
        titulo: 'Código y material',
        parrafos: [
          'El código de Umbral es abierto, con licencia MIT, y está publicado en GitHub.',
          'El material de cada curso (clases, transcripciones, diapositivas, PDF y apuntes) no forma parte de ese código: pertenece a sus autores y se muestra solo para estudiar dentro del servicio. No lo copies ni lo redistribuyas fuera de él.',
          'Tus preguntas son tuyas. Nos das permiso de procesarlas para responderte y para revisar la calidad del servicio, como describe la Política de privacidad.',
        ],
      },
      {
        titulo: 'Sin garantía',
        parrafos: [
          'Umbral se ofrece tal cual y según esté disponible, sin garantía de ningún tipo sobre su funcionamiento continuo ni sobre la exactitud de sus respuestas.',
        ],
      },
      {
        titulo: 'Limitación de responsabilidad',
        parrafos: [
          'En la medida máxima que permita la ley, no somos responsables de daños directos o indirectos derivados del uso del servicio o de decisiones tomadas con base en sus respuestas, ni de la pérdida de conversaciones o datos.',
        ],
      },
      {
        titulo: 'Cambios y ley aplicable',
        parrafos: [
          'Podemos actualizar estos términos; la versión vigente es la publicada en esta página, con su fecha. Si sigues usando Umbral después de un cambio, lo aceptas.',
          'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.',
        ],
      },
      {
        titulo: 'Contacto',
        parrafos: ['Para cualquier duda sobre estos términos escribe a joseluismacedo@imperioon.com.'],
      },
    ] satisfies SeccionLegal[],
  },
};

/**
 * Metadatos de las páginas públicas (título, descripción y vista previa al
 * compartir) y títulos de pestaña de la app. Los lee el prerender
 * (src/prerender/) para el <head> de cada HTML estático, y el cliente para
 * `document.title` al navegar (src/lib/tituloDocumento.ts). Títulos de ≤ 60
 * caracteres y descripciones de ≤ 160: lo que Google y las redes muestran
 * completo.
 */
export const seo = {
  sitio: 'Umbral',
  autor: 'José Luis Macedo Escamilla',
  urlAutor: 'https://github.com/JoseLuis0022',
  paginas: {
    inicio: {
      ruta: '/',
      titulo: 'Umbral · Tu agente de Claude, de la laptop a la web',
      tituloSocial: 'Umbral: tu agente de Claude, de la laptop a una app web para tu equipo',
      descripcion:
        'Umbral sirve la carpeta de un agente de Claude Code como app web: cuentas, control de gasto y respuestas que citan su fuente. Código abierto, MIT.',
    },
    privacidad: {
      ruta: '/privacidad',
      titulo: 'Política de privacidad · Umbral',
      tituloSocial: 'Política de privacidad de Umbral',
      descripcion:
        'Qué datos personales recaba Umbral, para qué los usa, con quién los comparte y cómo ejercer tus derechos de acceso, rectificación, cancelación y oposición.',
    },
    terminos: {
      ruta: '/terminos',
      titulo: 'Términos de uso · Umbral',
      tituloSocial: 'Términos de uso de Umbral',
      descripcion:
        'Las condiciones para usar Umbral: cuentas, modo invitado, uso aceptable del asistente, propiedad de tus preguntas y límites de responsabilidad.',
    },
  },
  /** El shell de la app (rutas privadas): genérico y fuera del índice. */
  app: {
    titulo: 'Umbral',
    descripcion: 'Pregúntale a tu agente de Claude: cada respuesta cita la fuente de donde sale.',
  },
  imagen: {
    ruta: '/og.png?v=4',
    ancho: 1200,
    alto: 630,
    alt: 'Umbral: tu agente de Claude, de la laptop a una app web para tu equipo. Una MacBook con el chat de Umbral.',
  },
  /** Título de la pestaña en cada pantalla de la app: «Chat · Umbral». */
  pantallas: {
    '/login': 'Entrar',
    '/registro': 'Crear cuenta',
    '/verificar': 'Verificar correo',
    '/chat': 'Chat',
    '/ajustes': 'Ajustes',
    '/perfil': 'Perfil',
    '/admin/tablero': 'Tablero',
    '/admin/corpus': 'Corpus',
    '/admin/conversaciones': 'Auditoría',
    '/admin/laboratorio': 'Laboratorio',
    '/_dev/sistema-diseno': 'Sistema de diseño',
  } as Record<string, string>,
};

export const login = {
  titulo: 'Inicia sesión',
  subtitulo: 'El asistente de estudio de Procesamiento Digital de Imágenes.',
  correo: 'Correo',
  contrasena: 'Contraseña',
  entrar: 'Entrar',
  entrando: 'Entrando…',
  errorVacio: 'Escribe tu correo y tu contraseña para entrar.',
  errorCredenciales: 'Correo o contraseña incorrectos.',
  errorServidor: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  pie: 'Las cuentas nuevas entran en modo invitado, sin costo y con un crédito de prueba.',
  sinCuenta: '¿No tienes cuenta?',
  crearCuenta: 'Crear una cuenta',
  reenviar: 'Reenviar el correo de confirmación',
  reenviado: 'Te mandamos otro correo con enlace y código. Revisa también el spam.',
};

export const registro = {
  titulo: 'Crea tu cuenta',
  subtitulo: 'Entras en modo invitado, sin costo, para probar el asistente.',
  nombre: 'Tu nombre',
  correo: 'Correo',
  contrasena: 'Contraseña',
  pistaContrasena: 'Mínimo 8 caracteres.',
  crear: 'Crear cuenta',
  creando: 'Creando…',
  yaTienes: '¿Ya tienes cuenta?',
  entrar: 'Inicia sesión',
  errorNombre: 'Escribe tu nombre.',
  errorCorreo: 'Escribe un correo válido.',
  errorContrasena: 'La contraseña necesita al menos 8 caracteres.',
  errorServidor: 'No pudimos conectar con el servidor. Intenta de nuevo.',
  errorVerificar: 'No pudimos confirmar tu correo. Intenta de nuevo.',
  revisaTitulo: 'Revisa tu correo',
  revisaEnviamos: 'Te enviamos un enlace y un código a',
  revisaInstruccion: 'Abre el enlace o escribe aquí el código de 6 dígitos. Si no aparece en unos minutos, revisa la carpeta de spam.',
  codigo: 'Código del correo',
  confirmarCodigo: 'Confirmar',
  confirmandoCodigo: 'Confirmando…',
  errorCodigoIncompleto: 'El código tiene 6 dígitos.',
  reenviar: 'Reenviar el correo',
  reenviarEn: (s: number) => `Reenviar en ${s} s`,
  reenviado: 'Te mandamos otro correo con un enlace y un código nuevos.',
  irAEntrar: 'Ir a iniciar sesión',
  volver: 'Volver a iniciar sesión',
  invitadoNota: 'Las cuentas nuevas usan Claude Haiku con un crédito de prueba de US$0.30.',
  verificando: 'Confirmando tu correo…',
  verificadoTitulo: 'Correo verificado',
  verificadoDetalle: 'Tu cuenta está activa. Entrando a Umbral…',
  yaVerificadoDetalle: 'Tu cuenta ya está activa. Inicia sesión con tu contraseña.',
  verificarFalloTitulo: 'No pudimos confirmar tu correo',
  codigoTitulo: 'Confirma tu correo',
  codigoSubtitulo: 'Escribe tu correo y el código de 6 dígitos que te enviamos.',
  tengoCodigo: 'Tengo un código',
  // "Al crear tu cuenta aceptas los Términos y la Política de privacidad."
  aceptas: { antes: 'Al crear tu cuenta aceptas los ', terminos: 'Términos', medio: ' y la ', privacidad: 'Política de privacidad', despues: '.' },
};

export const invitado = {
  titulo: 'Estás en modo invitado',
  detalle:
    'En modo invitado solo podemos usar modelos económicos (Claude Haiku) y tienes un crédito de prueba. Si quieres más preguntas o mejorar el plan, escríbeme y te doy acceso.',
  agotado: 'Ya usaste tu crédito de prueba.',
  credito: (gastado: string, limite: string) => `Usaste US$${gastado} de US$${limite}`,
  pastilla: (resto: string) => `Modo invitado con Claude Haiku: quedan US$${resto}`,
  escribirme: 'Escribirme',
  copiarCorreo: 'Copiar correo',
  correoCopiado: 'Correo copiado',
  asunto: 'Quiero más acceso a Umbral',
  cerrar: 'Seguir en modo invitado',
  sinContacto: 'Pídele acceso a quien administra Umbral.',
};

export const configCorreo = {
  boton: 'Configurar correo',
  titulo: 'Correo de envío (Gmail)',
  descripcion:
    'Con este correo se mandan los enlaces para confirmar las cuentas nuevas. Usa una contraseña de aplicación de Google, no tu contraseña normal.',
  ayuda: 'Crear una contraseña de aplicación',
  usuario: 'Correo de Gmail',
  contrasena: 'Contraseña de aplicación',
  contrasenaGuardada: 'Ya está guardada (cifrada). Escribe otra solo para cambiarla.',
  contrasenaPista: '16 letras; Google la muestra en bloques de 4. Se guarda cifrada y nunca se vuelve a mostrar.',
  remitente: 'Nombre del remitente',
  contacto: 'Correo de contacto',
  contactoPista: 'El que verán los invitados para pedir más acceso.',
  urlPublica: 'Dirección pública de Umbral',
  urlPublicaPista: 'Con ella se arman los enlaces de los correos (en tu laptop: http://localhost:5173).',
  guardar: 'Guardar',
  guardado: 'Configuración guardada',
  probar: 'Enviar correo de prueba a este Gmail',
  estadoListo: 'Configurado: el registro público está abierto.',
  estadoFalta: 'Sin configurar: el registro público está cerrado.',
  errorCarga: 'No pudimos leer la configuración.',
};

export const chat = {
  saludo: (nombre: string) => `¿Qué repasamos hoy, ${nombre}?`,
  subtituloVacio: 'Pregunta por un tema, una clase o un ejercicio. Cada respuesta cita de dónde sale.',
  paraEmpezar: 'Para empezar',
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
  fijar: 'Fijar',
  desfijar: 'Desfijar',
  archivar: 'Archivar',
  desarchivar: 'Desarchivar',
  marcarNoLeida: 'Marcar como no leída',
  marcarLeida: 'Marcar como leída',
  grupoFijadas: 'Fijadas',
  grupoArchivadas: (n: number) => `Archivadas (${n})`,
  noLeida: 'Respuesta nueva sin leer',
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
  encolar: 'Poner en cola',
  enCola: 'En cola',
  enColaDetalle: 'Se enviará cuando termine la respuesta actual.',
  quitarDeCola: 'Quitar de la cola',
  quitarTodos: 'Quitar todos',
  enColaCuenta: (n: number) => (n === 1 ? '1 mensaje en cola' : `${n} mensajes en cola`),
  enColaJuntos: 'Se enviarán juntos cuando termine la respuesta actual.',
  colaLlena: (n: number) => `La cola admite hasta ${n} mensajes. Espera a que termine la respuesta.`,
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
  tokensDetalle: (e: string, s: string, l: string, c: string) => `Entrada ${e}, salida ${s}, caché leída ${l}, caché escrita ${c}`,
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
  kpiErroresDetalle: (errores: number, canceladas: number) => `${errores} con error y ${canceladas} canceladas`,
  kpiHistorico: (consultas: string, costo: string) => `Histórico: ${consultas} consultas, ${costo}`,
  kpiPeriodo: (dias: number) => `Últimos ${dias} días`,
  costoDia: 'Costo por día',
  costoDiaDetalle: 'Días en UTC, como los guarda el servidor.',
  lecturaDia: (dia: string, costo: string, n: number) => `${dia}: ${costo}, ${n} ${n === 1 ? 'consulta' : 'consultas'}`,
  lecturaTotal: (costo: string, n: number) => `Total: ${costo}, ${n} ${n === 1 ? 'consulta' : 'consultas'}`,
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

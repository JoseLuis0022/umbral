/**
 * Banco de respuestas del SIMULADOR de chat.
 *
 * Existe para que `chat.service.ts` pueda transmitir token por token sin
 * backend. El tono se calibró contra las respuestas ya escritas en
 * `conversaciones.ts` — que son la referencia del asistente institucional:
 * directo, sin disculpas, con el procedimiento primero y la advertencia de
 * gobernanza después, y siempre cerrando con a dónde ir si hace falta más.
 *
 * Cada respuesta ejercita a propósito una parte distinta del renderizador
 * (`Markdown.tsx`): encabezados, listas numeradas y con viñetas, negritas,
 * tablas, bloques de código y enlaces. Si el banco solo tuviera párrafos, la
 * demostración nunca mostraría que el hilo sabe renderizar una tabla.
 */

export type TemaRespuesta =
  | 'correo'
  | 'politica'
  | 'brightspace'
  | 'contrasena'
  | 'wifi'
  | 'correoTelefono'
  | 'documentos'
  | 'minuta'
  | 'generica';

export const respuestasPorTema: Record<TemaRespuesta, string> = {
  correo: `## Resumen por lotes en Outlook

Copilot puede resumir la bandeja sin que abras correo por correo. El camino corto:

1. Abre **Outlook en el navegador** y entra a la carpeta que quieres resumir.
2. Selecciona un bloque de **50 correos como máximo**: arriba de esa cifra el resumen empieza a perder los detalles con fecha.
3. En la barra de Copilot pide el resumen **por tema, no por remitente**.
4. Repite con el siguiente bloque y junta los resúmenes al final.

El prompt que mejor resultado da en admisiones:

\`\`\`texto
Agrupa estos correos en temas.
Para cada tema dime: de qué trata, cuántos correos lo tocan
y cuáles piden una respuesta mía con fecha límite.
\`\`\`

### Qué esperar de cada bloque

| Volumen | Tiempo aproximado | Calidad del resumen |
| --- | --- | --- |
| 25 correos | menos de 1 min | Alta, con detalle por remitente |
| 50 correos | 1 a 2 min | Alta, agrupada por tema |
| 100 correos | 3 a 4 min | Media: conviene partirlo |
| 250 correos | no recomendado | Se pierden fechas y responsables |

Dos cosas que conviene cuidar:

- **No pegues el contenido de los correos en una herramienta pública.** Copilot dentro de tu cuenta institucional opera bajo el acuerdo de tratamiento de datos de la universidad; la versión abierta de cualquier otro asistente, no.
- Revisa a mano lo que el resumen marque con fecha límite. Es donde un modelo se equivoca más seguido, y es justo lo que no puedes dejar pasar.

La guía **Resume tu bandeja de entrada con Copilot en Outlook** tiene los pasos con capturas.`,

  politica: `## Lo que permite la política institucional de IA

La regla de fondo es una sola: **la IA apoya, la persona decide**. De ahí se desprende todo lo demás.

### Sí puedes

- Preparar rúbricas, guiones, borradores y retroalimentación escrita.
- Resumir documentos y correos propios del trabajo.
- Traducir y corregir estilo de comunicaciones institucionales.
- Generar variantes de reactivos a partir de los que tú ya escribiste.

### No puedes

- Delegar una **calificación final** o una decisión de admisión, contratación o sanción.
- Subir a herramientas fuera del entorno institucional cualquier dato que identifique a una persona: nombre, matrícula, número de empleado, correo, expediente.
- Presentar como propio un texto generado sin revisión.

### Dónde queda cada herramienta

| Herramienta | Datos personales | Uso institucional |
| --- | --- | --- |
| Copilot con cuenta @aurora.edu.mx | Permitido | Sí |
| Umbral | Permitido | Sí |
| ChatGPT, Gemini u otros públicos | **No permitido** | Solo texto sin datos |

> Toda decisión apoyada en IA debe poder explicarse sin mencionar al modelo. Si la única justificación es "lo dijo la herramienta", la decisión no está fundamentada.

El documento completo vive en el corpus de **Gobernanza de IA**. Si tu caso no encaja en ninguna de las dos listas, escríbelo aquí y lo revisamos contra la política.`,

  brightspace: `## Brightspace no acepta la carga

Casi siempre es una de tres cosas, y el mensaje de error dice cuál:

| Lo que ves en pantalla | Causa | Quién lo resuelve |
| --- | --- | --- |
| "No tienes permiso para modificar este elemento" | No tienes el rol de titular en ese grupo | Mesa de Ayuda, en el momento |
| "El periodo de calificación está cerrado" | Servicios Escolares cerró el libro | Servicios Escolares |
| "Formato de archivo no válido" | Las columnas no coinciden con la plantilla | Tú, reexportando la plantilla |

### Si es el rol

1. Ten a la mano tu **número de empleado** y la **clave del grupo**.
2. Llama a Mesa de Ayuda a la extensión **7777** o levanta el ticket desde el portal.
3. Pide explícitamente el rol de *titular*, no el de *lector*: es la diferencia entre ver y capturar.

### Si es el archivo

Exporta primero la plantilla desde el mismo Brightspace y llénala encima; no armes el CSV a mano. El encabezado tiene que quedar exactamente así:

\`\`\`csv
Username,End-of-Line Indicator
#12345678,#
\`\`\`

La columna \`End-of-Line Indicator\` parece de adorno y no lo es: sin ella la importación se rechaza completa, sin decirte por qué.

Si ninguna de las tres aplica, dime el texto exacto del error y lo revisamos.`,

  contrasena: `## Restablecer tu contraseña institucional

Puedes hacerlo tú, sin llamar a Mesa de Ayuda, **si ya registraste un método de verificación**.

1. Entra a \`micuenta.aurora.edu.mx\` desde cualquier navegador.
2. Elige **Olvidé mi contraseña**.
3. Escribe tu correo \`@aurora.edu.mx\` completo y resuelve el captcha.
4. Confirma con el código que llega a tu teléfono o a tu correo alterno.
5. Define la nueva contraseña y espera **cinco minutos** antes de entrar a los demás servicios.

### Requisitos de la contraseña

- Mínimo 12 caracteres.
- Al menos una mayúscula, una minúscula y un número.
- **No puede repetir** ninguna de tus últimas cinco contraseñas.
- No debe contener tu nombre ni tu número de empleado.

Un detalle que cuesta tiempo a mucha gente: después de cambiarla hay que **volver a iniciar sesión en el teléfono**. Si no lo haces, el correo del celular sigue intentando con la contraseña vieja y la cuenta se bloquea sola a los pocos intentos.

Si nunca registraste un método de verificación, el autoservicio no te va a dejar y ahí sí hay que llamar a la extensión **7777** con tu número de empleado.`,

  wifi: `## Red inalámbrica institucional

Hay dos redes y se confunden seguido:

- **AURORA-Empleados**: para equipo institucional y personal de la universidad. Usa tu cuenta \`@aurora.edu.mx\` y un certificado.
- **AURORA-Invitados**: acceso limitado, sin impresoras ni unidades de red. No sirve para trabajar.

### Conectar un equipo por primera vez

1. Elige **AURORA-Empleados** en la lista de redes.
2. Cuando pida usuario, escribe tu correo institucional completo.
3. Acepta el certificado que muestra el equipo. El emisor debe decir **Universidad Aurora**; si dice otra cosa, no lo aceptes y repórtalo.
4. Reinicia el navegador antes de probar.

### Si fallan varios equipos a la vez

Eso ya no es configuración: cuando **todas** las máquinas de un espacio pierden la red al mismo tiempo, casi siempre caducó el certificado del grupo de equipos. Ese trámite lo hace **Infraestructura de Red** con el inventario del área, no se resuelve equipo por equipo.

Reporta con estos tres datos y se resuelve mucho más rápido:

- Edificio y número de salón o laboratorio.
- Cuántos equipos están afectados.
- La hora aproximada en que dejó de funcionar.`,

  correoTelefono: `## Correo institucional en el teléfono

No necesitas configurar servidores a mano: la autenticación institucional se encarga.

1. Instala **Outlook** desde la tienda de tu teléfono. No uses la app de correo que viene de fábrica.
2. Ábrela y escribe tu correo \`@aurora.edu.mx\`.
3. Te redirige a la pantalla institucional. Ahí va tu contraseña, no en la app.
4. Confirma la **verificación en dos pasos** con el código o la notificación.
5. Acepta el perfil de seguridad que solicita la universidad.

Ese último paso es el que más gente cancela. Sin él, la app se instala pero el correo nunca sincroniza, así que no lo saltes.

### Lo que implica el perfil de seguridad

- Exige que el teléfono tenga **código de desbloqueo**.
- Permite borrar **solo los datos institucionales** en caso de robo o extravío. Tus fotos, mensajes y aplicaciones personales no se tocan.

Si cambiaste tu contraseña hace poco y el teléfono se quedó en un ciclo de "contraseña incorrecta", quita la cuenta de Outlook y vuelve a agregarla: la app guarda la credencial vieja y sigue reintentando hasta bloquear la cuenta.`,

  documentos: `## Resumir un documento largo

Adjunta el archivo y lo trabajo aquí. Formatos que puedo leer: \`.pdf\`, \`.docx\`, \`.msg\` y \`.eml\`, hasta 10 MB.

### Lo que te devuelvo

1. **Idea central** en un párrafo.
2. **Puntos clave**, entre cinco y ocho, con la página donde está cada uno.
3. **Acuerdos y responsables**, si el documento los tiene.
4. **Lo que quedó abierto**: preguntas sin respuesta y decisiones pendientes.

Si quieres otro corte, pídelo con este formato y sale más preciso:

\`\`\`texto
Resume este documento para [quién lo va a leer].
Quiero [cuántos] puntos, enfocados en [tema].
Marca lo que requiera una decisión mía.
\`\`\`

### Antes de adjuntar

- Si el documento trae **datos personales de estudiantes o aspirantes**, quítalos o sustitúyelos por identificadores neutros ("aspirante A"). Los repones tú al final.
- Si es un documento normativo, revisa a mano lo que marque como **cambio de fondo**: ahí la lectura humana no es opcional.
- Los PDF escaneados sin texto seleccionable no se pueden leer. Necesitan pasar antes por reconocimiento de texto.

Cuando tengas el archivo listo, adjúntalo y dime en una línea para quién es el resumen.`,

  minuta: `## Minuta de reunión

Te dejo la estructura que usamos en la universidad. Es corta a propósito: una minuta que nadie lee no sirve de nada.

### Encabezado

| Campo | Contenido |
| --- | --- |
| Reunión | Nombre del comité o del proyecto |
| Fecha y hora | Día, hora de inicio y de cierre |
| Convoca | Área y persona responsable |
| Asistentes | Nombre y área de cada quien |

### Cuerpo

1. **Puntos tratados**, en el orden en que se vieron.
2. **Acuerdos**, uno por línea, cada uno con responsable y fecha.
3. **Pendientes**, con lo que falta para poder cerrarlos.
4. **Siguiente sesión**, si quedó fecha.

La parte que hay que cuidar es la de acuerdos. Un acuerdo sin responsable y sin fecha **no es un acuerdo**, es una intención. Escríbelos siempre así:

\`\`\`markdown
- [ ] Enviar el padrón depurado a Servicios Escolares
      Responsable: Coordinación de Admisiones
      Fecha: 12 de septiembre
\`\`\`

### Para que la escriba yo

Pégame las notas crudas, o adjunta la grabación transcrita, y te la devuelvo en este formato. Dos advertencias:

- No incluyas **datos personales de terceros** en las notas que me pegues; descríbelos por su rol.
- Revisa los acuerdos antes de circular la minuta: es el único apartado donde un error se vuelve compromiso institucional.`,

  generica: `Puedo ayudarte con eso. Para darte algo útil de una vez, dime un poco más de contexto: **qué necesitas lograr** y **para cuándo**.

Mientras tanto, esto es lo que resuelvo con más frecuencia:

- **Correo y documentos** — resumir bandejas, sacar acuerdos de una minuta, comparar dos versiones de un documento.
- **Redacción institucional** — convocatorias, respuestas formales, comunicados y traducciones.
- **Incidencias de TI** — Brightspace, contraseña institucional, red inalámbrica, correo en el teléfono.
- **Gobernanza de IA** — qué permite y qué no la política de la universidad.

Dos cosas que conviene tener presentes:

1. Si vas a compartir un documento, **quita los datos que identifiquen a una persona** antes de pegarlo.
2. Lo que te responda hay que verificarlo cuando la decisión sea importante. La sección **Al día** tiene guías cortas con los procedimientos oficiales.

¿Sobre cuál de esos temas quieres que empecemos?`,
};

/**
 * Palabras clave por tema. El orden importa solo para desempatar: los temas
 * más específicos (una incidencia concreta de TI) van antes que los amplios,
 * porque "no puedo entrar a Brightspace" también contiene "entrar".
 */
const CLAVES: Array<{ tema: TemaRespuesta; palabras: string[] }> = [
  { tema: 'brightspace', palabras: ['brightspace', 'calificacion', 'calificaciones', 'libro de calificaciones', 'subir notas', 'plataforma educativa'] },
  { tema: 'contrasena', palabras: ['contrasena', 'password', 'restablecer', 'olvide mi', 'cuenta bloqueada', 'micuenta'] },
  { tema: 'wifi', palabras: ['wifi', 'wi-fi', 'red inalambrica', 'inalambrica', 'internet', 'no se conecta', 'laboratorio'] },
  { tema: 'correoTelefono', palabras: ['telefono', 'celular', 'movil', 'app de correo', 'outlook en el telefono', 'configurar el correo'] },
  { tema: 'minuta', palabras: ['minuta', 'minutas', 'acta', 'reunion', 'reuniones', 'junta', 'acuerdos', 'comite'] },
  { tema: 'politica', palabras: ['politica', 'gobernanza', 'normativa', 'permitido', 'puedo usar ia', 'reglamento de ia', 'datos personales', 'privacidad', 'examen', 'examenes', 'evaluar'] },
  { tema: 'correo', palabras: ['bandeja', 'correos', 'correo electronico', 'outlook', 'inbox', 'mensajes sin leer', 'resumir correo', 'copilot'] },
  { tema: 'documentos', palabras: ['documento', 'documentos', 'pdf', 'docx', 'archivo', 'resumen de', 'resume este', 'paginas', 'reglamento', 'contrato'] },
];

/** Quita acentos y baja a minúsculas para que "política" y "politica" pesen igual. */
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Elige el tema por conteo de coincidencias, no por la primera que aparezca:
 * un mensaje como "no puedo abrir Brightspace desde el teléfono" menciona dos
 * temas y debe ganar el que tenga más señales, no el que aparezca primero.
 */
export function temaDeMensaje(mensaje: string): TemaRespuesta {
  const texto = normalizar(mensaje);
  let mejor: TemaRespuesta = 'generica';
  let mejorPuntaje = 0;

  for (const { tema, palabras } of CLAVES) {
    let puntaje = 0;
    for (const palabra of palabras) {
      if (texto.includes(palabra)) {
        // Una frase de varias palabras es una señal mucho más fuerte que un
        // término suelto: pesa por número de palabras.
        puntaje += palabra.includes(' ') ? 3 : 1;
      }
    }
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = tema;
    }
  }

  return mejor;
}

export function respuestaSimulada(mensaje: string): string {
  return respuestasPorTema[temaDeMensaje(mensaje)];
}

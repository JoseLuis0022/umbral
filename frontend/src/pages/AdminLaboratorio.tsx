import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Library, SlidersHorizontal } from 'lucide-react';
import { Banner, Button, Drawer, IconButton, PageEnter, useToast } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  CLAVE_PARAMETROS,
  CarrilParametros,
  EntradaPrueba,
  EstadoSinCorpus,
  EstadoVacioLab,
  HiloPrueba,
  MAX_SYSTEM_PROMPT,
  MODELOS,
  PARAMETROS_POR_DEFECTO,
  PanelParametros,
  copyLab,
  nuevaSesionId,
  sonParametrosPorDefecto,
  type EstadoCorpus,
  type EstadoLab,
  type MensajeLab,
  type MetricasRespuesta,
  type NivelPensamiento,
  type ParametrosLab,
  type PasoAgente,
  type SeccionParametros,
} from '../components/admin/laboratorio';
import { PanelPlegable } from '../components/shell';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../context/AuthContext';
import { listarCorpus, listarDocumentos } from '../services/corpus.service';
import type { Corpus } from '../types';
import {
  enviarMensaje,
  type MetadatosNodo,
  type ParametrosModelo,
} from '../services/chat.service';

const NIVELES_VALIDOS: NivelPensamiento[] = ['ninguno', 'bajo', 'medio', 'alto'];

/** Distancia al final por debajo de la cual el hilo se considera "pegado abajo". */
const MARGEN_PEGADO = 72;

/** Clave propia de esta pantalla: plegar aquí no pliega ninguna de las otras tres. */
const CLAVE_PLEGADO = 'panel-plegado:laboratorio';

/** Aire por encima de la sección a la que salta el carril, para que no quede pegada al borde. */
const AIRE_SALTO = 8;

/**
 * Laboratorio de modelos (/admin/laboratorio).
 *
 * Es el modo desarrollador del asistente: a la izquierda una conversación de
 * prueba con streaming real, a la derecha los parámetros que viajan al flujo
 * dentro de `metadata`. En móvil el panel se convierte en cajón; en escritorio
 * se pliega a un carril de iconos —uno por grupo de parámetros— que además dice
 * el valor vigente de cada uno al pasar el cursor (ver `CarrilParametros`).
 *
 * NOTA DE COPY: en esta pantalla ninguna cadena VISIBLE nombra la tecnología
 * que hay detrás (se presenta como maqueta de demostración). En los comentarios
 * sí se nombra —n8n, Postgres—: aquí es información técnica correcta y útil.
 *
 * Cuatro decisiones que explican el resto del archivo:
 *
 *  - **Primero la base de conocimiento, después todo lo demás.** Sin corpus
 *    elegido no hay documentos contra los que responder, así que la entrada
 *    está deshabilitada y el hilo lo explica en una línea. Cambiar de base a
 *    media conversación estrena `sessionId` por el mismo motivo que borrar la
 *    memoria: el contexto guardado venía de otros documentos.
 *
 *  - **El hilo NO se guarda.** No pasa por `ChatContext` ni por el historial de
 *    la comunidad: lo que se prueba aquí es basura de laboratorio y ensuciaría
 *    la auditoría de /admin/conversaciones.
 *
 *  - **Borrar la memoria = estrenar `sessionId`.** El flujo guarda el contexto
 *    en Postgres indexado por ese identificador, así que vaciar los mensajes de
 *    la pantalla no borra nada del lado del servidor. Lo que corta el contexto
 *    de verdad es cambiar la llave.
 *
 *  - **La cadena de agentes es el espectáculo.** Cuando el orquestador delega,
 *    el primer texto tarda 3-4 s; `alMetadatos` cuenta en vivo quién está
 *    trabajando, y esa espera deja de ser un hueco en blanco.
 *
 * El streaming se implementa aquí y no con `useStreamingChat` porque ese hook
 * no expone `parametros` ni `alMetadatos`, que son justo las dos cosas que esta
 * pantalla necesita. La mecánica (buffer en un ref y volcado por frame, carrera
 * entre transmisiones resuelta comparando el controlador vigente) sí es la
 * misma: repintar markdown una vez por fragmento tira el presupuesto de frame.
 */
export default function AdminLaboratorio() {
  const { usuario } = useAuth();
  const { push } = useToast();
  const reducido = useReducedMotion();

  const [parametros, setParametros] = useLocalStorage<ParametrosLab>(
    CLAVE_PARAMETROS,
    PARAMETROS_POR_DEFECTO
  );

  // El `sessionId` se estrena en cada montaje y NO se persiste: si sobreviviera
  // al refresh, el flujo recordaría en Postgres una conversación que la
  // pantalla ya no muestra, y el laboratorio arrancaría con contexto invisible.
  const [sessionId, setSessionId] = useState(nuevaSesionId);

  const [mensajes, setMensajes] = useState<MensajeLab[]>([]);
  const [textoParcial, setTextoParcial] = useState('');
  const [estado, setEstado] = useState<EstadoLab>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [cadenaViva, setCadenaViva] = useState<PasoAgente[]>([]);

  // Bases de conocimiento. Se cargan una sola vez por montaje (y por
  // reintento): la lista es corta y estable, y volver a pedirla en cada render
  // del panel haría cuatro llamadas por abrir el cajón de móvil.
  const [corpus, setCorpus] = useState<Corpus[]>([]);
  const [estadoCorpus, setEstadoCorpus] = useState<EstadoCorpus>('cargando');
  const [intentoCorpus, setIntentoCorpus] = useState(0);
  // Cuántos documentos tiene cada base. Es lo que deja elegir entre dos bases
  // de nombre parecido, y por eso se muestra dentro de cada opción del
  // desplegable. Va en su propio estado porque llega DESPUÉS de la lista.
  const [conteoDocumentos, setConteoDocumentos] = useState<Record<string, number>>({});

  const [borrador, setBorrador] = useState('');
  const [senalFoco, setSenalFoco] = useState(0);
  const [cajonAbierto, setCajonAbierto] = useState(false);

  const controlRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');
  const frameRef = useRef<number | null>(null);
  const montadoRef = useRef(true);
  const cadenaRef = useRef<PasoAgente[]>([]);
  const memoriaReiniciadaRef = useRef(false);

  const hiloRef = useRef<HTMLDivElement>(null);
  const pegadoRef = useRef(true);
  /** Contenedor que scrollea del panel de escritorio: es donde vive el ancla del salto. */
  const panelRef = useRef<HTMLDivElement>(null);

  const activo = estado === 'esperando' || estado === 'transmitiendo';

  useEffect(() => {
    // `vigente` evita escribir estado si la pantalla muere (o si se reintenta)
    // antes de que la promesa resuelva.
    let vigente = true;
    setEstadoCorpus('cargando');
    setConteoDocumentos({});
    listarCorpus()
      .then((lista) => {
        if (!vigente) return;
        setCorpus(lista);
        setEstadoCorpus('listo');

        // Estado PARCIAL a propósito: la lista ya se puede usar y el conteo
        // llega detrás. Esperar a contar los documentos de todas las bases
        // retrasaría la primera decisión de la pantalla por un dato de apoyo.
        // Si el conteo falla no se marca error: la base sigue siendo elegible,
        // simplemente su opción no dice cuántos archivos tiene.
        Promise.all(lista.map((c) => listarDocumentos(c.id)))
          .then((listas) => {
            if (!vigente) return;
            const mapa: Record<string, number> = {};
            lista.forEach((c, i) => {
              mapa[c.id] = listas[i].length;
            });
            setConteoDocumentos(mapa);
          })
          .catch(() => {
            /* Dato de apoyo: sin él la opción se pinta sin conteo y ya. */
          });
      })
      .catch(() => {
        if (!vigente) return;
        setEstadoCorpus('error');
      });
    return () => {
      vigente = false;
    };
  }, [intentoCorpus]);

  /**
   * localStorage es entrada NO confiable: una versión anterior de la app pudo
   * dejar ahí un modelo que ya no existe o una temperatura fuera de rango, y un
   * `<input type="range">` con `value = 7` se pinta en el tope sin avisar. Se
   * normaliza al leer en vez de al escribir, que es donde sí se puede reparar.
   */
  const parametrosVigentes = useMemo<ParametrosLab>(
    () => ({
      // El corpus guardado se acepta mientras la lista no haya llegado (si no,
      // al recargar la pantalla parpadearía como "sin elegir" y estrenaría
      // sesión sola). Ya con la lista en mano, un id que no existe —la base se
      // borró desde /admin/corpus— vuelve a "sin elegir".
      corpusId:
        typeof parametros.corpusId === 'string' &&
        (estadoCorpus !== 'listo' || corpus.some((c) => c.id === parametros.corpusId))
          ? parametros.corpusId
          : '',
      modelo: MODELOS.some((m) => m.id === parametros.modelo)
        ? parametros.modelo
        : PARAMETROS_POR_DEFECTO.modelo,
      temperatura: Number.isFinite(parametros.temperatura)
        ? Math.min(1, Math.max(0, parametros.temperatura))
        : PARAMETROS_POR_DEFECTO.temperatura,
      nivelPensamiento: NIVELES_VALIDOS.includes(parametros.nivelPensamiento)
        ? parametros.nivelPensamiento
        : PARAMETROS_POR_DEFECTO.nivelPensamiento,
      systemPrompt:
        typeof parametros.systemPrompt === 'string'
          ? parametros.systemPrompt.slice(0, MAX_SYSTEM_PROMPT)
          : '',
    }),
    [parametros, corpus, estadoCorpus]
  );

  const enDefecto = sonParametrosPorDefecto(parametrosVigentes);

  const corpusElegido = corpus.find((c) => c.id === parametrosVigentes.corpusId);
  /** Sin base elegida no se puede preguntar: es la primera decisión, no un extra. */
  const puedePreguntar = Boolean(corpusElegido);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      // Cambiar de pantalla a media respuesta: se aborta la petición y se
      // cancela el frame pendiente, o quedaría un setState sobre un componente
      // muerto y una conexión abierta contra n8n.
      controlRef.current?.abort();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* ------------------------------ Streaming ------------------------------ */

  const volcar = useCallback(() => {
    frameRef.current = null;
    setTextoParcial(bufferRef.current);
  }, []);

  /**
   * Cada `begin` abre un paso de la cadena y cada `end` lo cierra. Se guarda en
   * un ref además del estado porque al terminar la respuesta hay que congelar
   * la cadena dentro del mensaje, y leerla del estado en ese punto daría el
   * valor del render anterior.
   */
  const registrarNodo = useCallback((metadatos: MetadatosNodo) => {
    const clave = metadatos.nodeId ?? metadatos.nodeName ?? 'nodo';
    const ahora = performance.now();
    const previa = cadenaRef.current;
    const indice = previa.findIndex((p) => p.clave === clave);

    let siguiente: PasoAgente[];
    if (metadatos.fase === 'inicio') {
      // Un `begin` repetido del mismo nodo no abre fila nueva: el flujo puede
      // reentrar en un agente y duplicarlo solo ensuciaría la lectura.
      if (indice !== -1) return;
      siguiente = [
        ...previa,
        {
          clave,
          nombre: metadatos.nodeName ?? 'Agente',
          principal: metadatos.principal,
          estado: 'trabajando',
          msInicio: ahora,
        },
      ];
    } else {
      if (indice === -1) return;
      siguiente = [...previa];
      siguiente[indice] = { ...siguiente[indice], estado: 'listo', msFin: ahora };
    }

    cadenaRef.current = siguiente;
    setCadenaViva(siguiente);
  }, []);

  const ejecutar = useCallback(
    async (historial: MensajeLab[]) => {
      controlRef.current?.abort();
      const control = new AbortController();
      controlRef.current = control;

      bufferRef.current = '';
      cadenaRef.current = [];
      setTextoParcial('');
      setCadenaViva([]);
      setError(null);
      setEstado('esperando');

      const t0 = performance.now();
      let msPrimerFragmento: number | null = null;
      let fragmentos = 0;

      const instrucciones = parametrosVigentes.systemPrompt.trim();
      // Caracteres que salen de aquí en esta vuelta. El historial NO se manda
      // (el flujo guarda la conversación por su cuenta), así que la entrada es
      // exactamente la última pregunta más las instrucciones del sistema.
      const caracteresEntrada =
        (historial[historial.length - 1]?.contenido.length ?? 0) + instrucciones.length;

      // `corpusId` todavía no vive en `ParametrosModelo` — lo añade el
      // orquestador en chat.service. La intersección lo deja pasar sin `any` y
      // sin romper el día que la propiedad exista: el tipo será idéntico.
      const parametrosEnvio: ParametrosModelo & { corpusId?: string } = {
        corpusId: parametrosVigentes.corpusId || undefined,
        modelo: parametrosVigentes.modelo,
        temperatura: parametrosVigentes.temperatura,
        nivelPensamiento: parametrosVigentes.nivelPensamiento,
        // Vacío = "no mandes nada", no "manda una cadena vacía": un
        // systemPrompt en blanco dentro del payload puede sobrescribir el que
        // el flujo ya tenga configurado.
        systemPrompt: instrucciones || undefined,
        reiniciarMemoria: memoriaReiniciadaRef.current || undefined,
      };

      const resultado = await enviarMensaje({
        mensajes: historial.map((m) => ({ rol: m.rol, contenido: m.contenido })),
        conversacionId: sessionId,
        usuario: usuario
          ? { id: usuario.id, nombre: usuario.nombre, area: usuario.area }
          : undefined,
        parametros: parametrosEnvio,
        senal: control.signal,
        alFragmento: (_fragmento, acumulado) => {
          if (msPrimerFragmento === null) msPrimerFragmento = performance.now() - t0;
          fragmentos += 1;
          bufferRef.current = acumulado;
          if (frameRef.current === null) frameRef.current = requestAnimationFrame(volcar);
          // Sale de "esperando" con el primer fragmento: es lo que retira el
          // esqueleto. Del segundo en adelante React descarta el mismo valor.
          setEstado((previo) => (previo === 'esperando' ? 'transmitiendo' : previo));
        },
        alMetadatos: registrarNodo,
      });

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      // Otra transmisión tomó el relevo (o la pantalla murió): esta ya no tiene
      // derecho a escribir el estado.
      if (!montadoRef.current || controlRef.current !== control) return;
      controlRef.current = null;

      // El aviso de sesión nueva es de un solo uso: viaja en el primer mensaje
      // posterior al borrado y ahí se agota.
      memoriaReiniciadaRef.current = false;

      const metricas: MetricasRespuesta = {
        msPrimerFragmento,
        msTotal: performance.now() - t0,
        fragmentos,
        caracteres: resultado.texto.length,
        caracteresEntrada,
      };

      // Un agente que se quedó "trabajando" es un ciclo que el flujo nunca
      // cerró (o una transmisión cortada): se cierra al terminar la respuesta
      // para no dejar un punto latiendo para siempre en el resumen.
      const cierre = performance.now();
      const cadena = cadenaRef.current.map((paso) =>
        paso.estado === 'trabajando' ? { ...paso, estado: 'listo' as const, msFin: cierre } : paso
      );

      setTextoParcial('');
      setCadenaViva([]);

      if (resultado.estado === 'error') {
        setEstado('error');
        setError(resultado.error?.message ?? copyLab.errorGenerico);
      } else {
        setEstado('inactivo');
      }

      // Lo que alcanzó a llegar se conserva aunque la transmisión se cortara: en
      // un laboratorio, media respuesta CON sus métricas dice más que nada.
      if (resultado.texto || resultado.estado === 'completo') {
        setMensajes((previos) => [
          ...previos,
          {
            id: `lab-a-${Date.now()}-${previos.length}`,
            rol: 'asistente',
            contenido: resultado.texto,
            metricas,
            cadena,
            modelo: parametrosVigentes.modelo,
            incompleta: resultado.estado !== 'completo',
          },
        ]);
      }
    },
    [sessionId, usuario, parametrosVigentes, volcar, registrarNodo]
  );

  /* ------------------------------- Acciones ------------------------------ */

  const enviar = useCallback(() => {
    const limpio = borrador.trim();
    // La guarda va aquí además de en el campo deshabilitado: Enter llega a este
    // callback antes de que el navegador aplique el `disabled`.
    if (!limpio || activo || !puedePreguntar) return;

    const pregunta: MensajeLab = {
      id: `lab-u-${Date.now()}`,
      rol: 'usuario',
      contenido: limpio,
    };
    const siguiente = [...mensajes, pregunta];

    setMensajes(siguiente);
    setBorrador('');
    pegadoRef.current = true;
    void ejecutar(siguiente);
  }, [borrador, activo, puedePreguntar, mensajes, ejecutar]);

  const detener = useCallback(() => {
    controlRef.current?.abort();
  }, []);

  /**
   * Reintento tras un error. Se recorta el hilo hasta la última pregunta y se
   * vuelve a pedir: reenviar sin recortar dejaría dos respuestas al mismo
   * mensaje, y el flujo de n8n ya tiene la pregunta en su memoria.
   */
  const reintentar = useCallback(() => {
    // `puedePreguntar` también aquí: la base pudo desaparecer de /admin/corpus
    // mientras el error estaba en pantalla, y reintentar contra una base que ya
    // no existe volvería a fallar sin explicar por qué.
    if (activo || !puedePreguntar) return;
    const corte = [...mensajes];
    while (corte.length > 0 && corte[corte.length - 1].rol === 'asistente') corte.pop();
    if (corte.length === 0) return;

    setMensajes(corte);
    pegadoRef.current = true;
    void ejecutar(corte);
  }, [activo, puedePreguntar, mensajes, ejecutar]);

  /**
   * Estrena `sessionId` y deja el hilo en blanco. Devuelve la llave nueva.
   *
   * Lo comparten "Borrar memoria" y el cambio de base de conocimiento porque
   * son el mismo problema: el contexto que el flujo guarda del lado del
   * servidor ya no corresponde a lo que la pantalla muestra, y lo único que lo
   * corta de verdad es cambiar la llave.
   *
   * Se corta la transmisión Y se suelta el controlador: sin lo segundo, la
   * petición abortada resolvería después y colgaría su respuesta a medias del
   * hilo que acabamos de vaciar.
   */
  const reiniciarSesion = useCallback(() => {
    controlRef.current?.abort();
    controlRef.current = null;

    const nueva = nuevaSesionId();
    setSessionId(nueva);
    setMensajes([]);
    setTextoParcial('');
    setCadenaViva([]);
    cadenaRef.current = [];
    bufferRef.current = '';
    setError(null);
    setEstado('inactivo');

    // El `sessionId` nuevo ya corta el contexto por sí solo. La bandera viaja
    // además en el próximo mensaje para que el flujo sepa que fue deliberado y
    // no una sesión perdida.
    memoriaReiniciadaRef.current = true;
    return nueva;
  }, []);

  const cambiarParametros = useCallback(
    (cambio: Partial<ParametrosLab>) => {
      const anterior = parametrosVigentes.corpusId;
      setParametros({ ...parametrosVigentes, ...cambio });

      const nuevoCorpus = cambio.corpusId;
      if (nuevoCorpus === undefined || nuevoCorpus === anterior) return;

      // Cambiar de base a media conversación: lo que el asistente recordaba
      // salió de OTROS documentos, así que arrastrarlo daría respuestas que
      // mezclan dos normativas. Sesión nueva.
      reiniciarSesion();

      // Solo se avisa cuando había una base anterior: en la primera elección no
      // se ha reiniciado nada que el usuario pueda echar de menos.
      if (anterior) {
        const nombre = corpus.find((c) => c.id === nuevoCorpus)?.nombre ?? '';
        push({ message: copyLab.corpusCambiado(nombre), tone: 'success' });
      }
    },
    [parametrosVigentes, setParametros, reiniciarSesion, corpus, push]
  );

  const borrarMemoria = useCallback(() => {
    const nueva = reiniciarSesion();
    setCajonAbierto(false);
    push({ message: copyLab.memoriaHecho(nueva), tone: 'success' });
  }, [reiniciarSesion, push]);

  const restablecer = useCallback(() => {
    // La base elegida se conserva: "restablecer parámetros" habla de los
    // ajustes del modelo, no de con qué documentos se prueba. Borrarla
    // obligaría a volver a elegirla —y tiraría el hilo— por pulsar un botón que
    // promete otra cosa.
    setParametros({ ...PARAMETROS_POR_DEFECTO, corpusId: parametrosVigentes.corpusId });
    push({ message: copyLab.restablecerHecho, tone: 'success' });
  }, [setParametros, parametrosVigentes.corpusId, push]);

  const reintentarCorpus = useCallback(() => setIntentoCorpus((n) => n + 1), []);

  const usarEjemplo = useCallback((pregunta: string) => {
    setBorrador(pregunta);
    setSenalFoco((n) => n + 1);
  }, []);

  const copiarSesion = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      push({ message: copyLab.sesionCopiada, tone: 'success' });
    } catch {
      // El portapapeles puede estar bloqueado por permisos del navegador; el
      // identificador sigue estando a la vista y se puede seleccionar a mano.
    }
  }, [sessionId, push]);

  /* -------------------------------- Scroll ------------------------------- */

  /*
   * El scroll se lee UNA vez por frame, no una por evento.
   *
   * Un gesto de trackpad emite decenas de eventos de scroll, y cada uno hacía
   * tres lecturas de layout (`scrollHeight`, `scrollTop`, `clientHeight`)
   * intercaladas con las escrituras del autoscroll de abajo y con las
   * mediciones de layout de la cadena de agentes: el frame se llenaba de
   * reflows sincrónicos justo mientras llega texto. Colapsado a un
   * `requestAnimationFrame` y con el listener en modo pasivo, el navegador
   * puede además desplazar sin esperar al handler. Es el mismo patrón que ya
   * usa el hilo de /chat.
   */
  useEffect(() => {
    const el = hiloRef.current;
    if (!el) return;
    let frame: number | null = null;
    const alScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const actual = hiloRef.current;
        if (!actual) return;
        // Si el usuario subió a releer una respuesta anterior, el autoscroll se
        // apaga: arrastrarlo al final cada 16 ms haría el hilo ilegible.
        pegadoRef.current =
          actual.scrollHeight - actual.scrollTop - actual.clientHeight < MARGEN_PEGADO;
      });
    };
    el.addEventListener('scroll', alScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', alScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const el = hiloRef.current;
    if (!el || !pegadoRef.current) return;
    // `auto` y no `smooth`: durante la transmisión esto corre una vez por
    // frame, y un scroll suave reiniciado sesenta veces por segundo se ve como
    // un temblor, no como un desplazamiento.
    el.scrollTop = el.scrollHeight;
  }, [mensajes, textoParcial, estado]);

  /**
   * Salto desde el carril a un grupo de parámetros.
   *
   * Corre en el frame SIGUIENTE al despliegue: en el mismo, el contenido del
   * panel todavía está oculto y su caja aún no está donde va a quedar, así que
   * cualquier medida saldría del sitio equivocado.
   *
   * El ancla se busca DENTRO del contenedor de escritorio, no en el documento:
   * en móvil el cajón monta una segunda copia del panel con los mismos
   * `data-seccion`, y un `querySelector` global podría llevarse la equivocada.
   *
   * Y se mueve el foco al primer control del grupo. No es un adorno: quien
   * pulsa el carril con el teclado lo hace sobre un botón que desaparece al
   * desplegarse (el carril se desmonta), y sin esto el foco se caería al
   * principio del documento.
   */
  const irASeccion = useCallback(
    (seccion: SeccionParametros) => {
      requestAnimationFrame(() => {
        const contenedor = panelRef.current;
        const objetivo = contenedor?.querySelector<HTMLElement>(`[data-seccion="${seccion}"]`);
        if (!contenedor || !objetivo) return;

        const desfase =
          objetivo.getBoundingClientRect().top - contenedor.getBoundingClientRect().top;
        contenedor.scrollTo({
          top: contenedor.scrollTop + desfase - AIRE_SALTO,
          behavior: reducido ? 'auto' : 'smooth',
        });

        // `preventScroll`: enfocar arrastra la vista por su cuenta y pelearía
        // con el desplazamiento suave que acabamos de pedir.
        objetivo
          .querySelector<HTMLElement>(
            'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
          )
          ?.focus({ preventScroll: true });
      });
    },
    [reducido]
  );

  /* -------------------------------- Render ------------------------------- */

  const hiloVacio = mensajes.length === 0 && !activo;

  // Se memoiza junto con el componente: el elemento JSX creado en línea es
  // nuevo en cada render, y durante el streaming esta pantalla renderiza una
  // vez por frame.
  const panel = (
    <PanelParametros
      parametros={parametrosVigentes}
      onCambiar={cambiarParametros}
      corpus={corpus}
      estadoCorpus={estadoCorpus}
      onReintentarCorpus={reintentarCorpus}
      conteoDocumentos={conteoDocumentos}
      sessionId={sessionId}
      ocupado={activo}
      puedeRestablecer={!enDefecto}
      onBorrarMemoria={borrarMemoria}
      onRestablecer={restablecer}
    />
  );

  return (
    <>
      {/* Misma mecánica de alto que /admin/conversaciones: la pantalla ocupa el
          viewport y el único scroll es el del hilo, no el de la página. */}
      <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">
        {/*
          Sin `actions`: la píldora del motor se retiró (decía en qué modo corría
          la maqueta, que no es una pregunta que se haga quien la usa) y el botón
          de parámetros se mudó a la cabecera del hilo. Sin acciones, `PageHeader
          compacto` no dibuja NADA —ni el contenedor con su margen—, y la
          pantalla gana los 12 px que gastaba esa banda vacía en escritorio.
        */}
        <PageHeader compacto title={copyLab.titulo} subtitle={copyLab.subtitulo} />

        {/* La columna de parámetros es `auto` y no un ancho fijo: el ancho lo
            pone ahora `PanelPlegable` como estilo en línea (es lo que anima al
            plegar) y la rejilla lo sigue. Por debajo de `lg` el panel no está
            aquí: es el cajón del pie de este archivo. */}
        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          {/* ── Izquierda: conversación de prueba ── */}
          <section
            aria-label={copyLab.conversacionTitulo}
            className="flex min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-2 lg:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="shrink-0 font-ui text-12 text-text-3">{copyLab.sesionEtiqueta}</span>
                <code className="min-w-0 truncate font-mono text-12 text-text-2" title={sessionId}>
                  {sessionId}
                </code>
                <IconButton
                  aria-label={copyLab.copiarSesion}
                  title={copyLab.copiarSesion}
                  className="shrink-0"
                  onClick={copiarSesion}
                >
                  <Copy size={14} />
                </IconButton>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* En el hueco donde antes se rotulaba el motor va ahora la base
                    consultada: en una demostración, saber CON QUÉ documentos se
                    respondió importa más que con qué pieza de infraestructura. */}
                {corpusElegido && (
                  // En teléfono no cabe: se lee en el cajón de Parámetros.
                  <span
                    className="hidden max-w-[16rem] min-w-0 shrink items-center gap-1.5 font-ui text-12 text-text-3 sm:flex"
                    title={corpusElegido.nombre}
                  >
                    <Library size={13} strokeWidth={2} className="shrink-0" aria-hidden />
                    <span className="truncate">{corpusElegido.nombre}</span>
                  </span>
                )}
                {/* Solo por debajo de lg: a partir de ahí el panel de parámetros
                    está siempre a la vista y el cajón no existe. */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 lg:hidden"
                  onClick={() => setCajonAbierto(true)}
                >
                  <SlidersHorizontal size={14} /> {copyLab.abrirParametros}
                </Button>
              </div>
            </header>

            <div
              ref={hiloRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 lg:px-6"
            >
              {!puedePreguntar ? (
                <EstadoSinCorpus cargando={estadoCorpus === 'cargando'} />
              ) : hiloVacio ? (
                <EstadoVacioLab onEjemplo={usarEjemplo} />
              ) : (
                <HiloPrueba
                  mensajes={mensajes}
                  textoParcial={textoParcial}
                  estado={estado}
                  cadenaViva={cadenaViva}
                />
              )}
            </div>

            <footer className="flex shrink-0 flex-col gap-2 border-t border-hairline px-4 py-3 lg:px-6">
              {/* `role="alert"` en la envoltura y no en el Banner: el error
                  aparece sin que nadie mire el pie de la pantalla, y sin esto un
                  lector de pantalla no lo anunciaría nunca. */}
              {/* `empty:hidden`: la región vive siempre en el DOM (es lo que la
                  hace anunciable), pero sin error no ocupa ni el hueco del flex. */}
              <div role="alert" className="empty:hidden">
                {error && (
                  <Banner
                    tone="red"
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={reintentar}
                        disabled={activo || !puedePreguntar}
                      >
                        {copyLab.reintentar}
                      </Button>
                    }
                  >
                    {error}
                  </Banner>
                )}
              </div>

              <EntradaPrueba
                valor={borrador}
                onCambio={setBorrador}
                onEnviar={enviar}
                onDetener={detener}
                transmitiendo={activo}
                bloqueado={!puedePreguntar}
                motivoBloqueo={
                  estadoCorpus === 'cargando' ? copyLab.corpusCargando : copyLab.corpusPendiente
                }
                senalFoco={senalFoco}
              />
            </footer>
          </section>

          {/* ── Derecha: parámetros (escritorio) ── */}
          <PanelPlegable
            clave={CLAVE_PLEGADO}
            ancho={{ lg: 360, xl: 400 }}
            lado="derecha"
            textoPlegar={copyLab.panelPlegar}
            textoDesplegar={copyLab.panelDesplegar}
            carril={({ desplegar }) => (
              <CarrilParametros
                parametros={parametrosVigentes}
                corpus={corpus}
                onIr={(seccion) => {
                  desplegar();
                  irASeccion(seccion);
                }}
              />
            )}
          >
            <aside
              aria-label={copyLab.panelTitulo}
              className="hidden min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1 lg:flex lg:h-full"
            >
              {/* `lg:pl-12` reserva la esquina para el botón de plegar, que
                  flota sobre ella. Es el borde INTERIOR de este panel: al estar
                  a la derecha, el botón y el carril se invierten. */}
              <header className="shrink-0 border-b border-hairline px-5 py-3 lg:pl-12">
                <h2 className="font-ui text-14 font-semibold text-text-1">{copyLab.panelTitulo}</h2>
              </header>
              <div
                ref={panelRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
              >
                {panel}
              </div>
            </aside>
          </PanelPlegable>
        </div>
      </PageEnter>

      {/* ── Parámetros (móvil) ── */}
      <Drawer open={cajonAbierto} onClose={() => setCajonAbierto(false)} title={copyLab.panelTitulo}>
        {panel}
      </Drawer>
    </>
  );
}

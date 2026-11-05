import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Adjunto, ArchivoCompartido, Conversacion, ItemProceso, Mensaje, ModeloDisponible } from '../types';
import { conversacionesSemilla } from '../data/conversaciones';
import { escribir, esperar, idNuevo, leer } from '../services/simulacion';
import { listarModelos } from '../services/modelos.service';
import type { ParametrosModelo } from '../services/chat.service';
import { adjuntoEnMemoria, paraEnviar, type AdjuntoPreparado } from '../lib/adjuntos';
import { AJUSTE_INICIAL, PREDETERMINADO, type AjusteModelo } from '../lib/ajusteModelo';
import { useStreamingChat, type EstadoStream } from '../hooks/useStreamingChat';
import { useAuth } from './AuthContext';

const CLAVE_AJUSTES = 'chat:ajustes-modelo';

const CLAVE = 'conversaciones';

/**
 * El historial persiste, pero CADUCA a las 12 horas.
 *
 * Las semillas de `conversaciones.ts` calculan sus fechas hacia atrás desde
 * "ahora" en cada arranque, justamente para que la demostración siempre tenga
 * casos de los cuatro grupos (Hoy / Ayer / Últimos 7 días / Anteriores). Si
 * guardáramos esas fechas para siempre, al día siguiente TODA la lista sería
 * "Anteriores": la pantalla se vería rota sin estarlo. Guardar con fecha de corte
 * conserva lo que el usuario hizo en su sesión y devuelve el escenario limpio
 * al día siguiente.
 */
const VIGENCIA_MS = 12 * 60 * 60 * 1000;

type Guardado = { guardadoEn: string; conversaciones: Conversacion[] };

function cargarConversaciones(): Conversacion[] {
  const guardado = leer<Guardado | null>(CLAVE, null);
  if (guardado?.conversaciones && Date.now() - new Date(guardado.guardadoEn).getTime() < VIGENCIA_MS) {
    return guardado.conversaciones;
  }
  return conversacionesSemilla;
}

function guardarConversaciones(lista: Conversacion[]) {
  escribir<Guardado>(CLAVE, { guardadoEn: new Date().toISOString(), conversaciones: lista });
}

/**
 * Título a partir de las primeras palabras del primer mensaje. Se corta por
 * palabra y no por carácter para no partir una a la mitad, y se limpia el signo
 * final: "¿Cómo resumo 250 correos…?" da un título mejor sin el signo.
 */
// Sin `export`: este archivo solo exporta el provider y su hook (Fast Refresh).
function tituloDesde(texto: string) {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const palabras = limpio.split(' ');
  const recorte = palabras.slice(0, 7).join(' ').replace(/[¿?¡!.,;:]+$/g, '');
  const titulo = recorte.length > 52 ? `${recorte.slice(0, 52).trimEnd()}…` : recorte;
  const conPuntos = palabras.length > 7 && !titulo.endsWith('…') ? `${titulo}…` : titulo;
  return conPuntos.charAt(0).toUpperCase() + conPuntos.slice(1) || 'Conversación nueva';
}

type ChatCtx = {
  /** Conversaciones del usuario de la sesión, de la más reciente a la más vieja. */
  conversaciones: Conversacion[];
  cargando: boolean;
  conversacionActiva: Conversacion | null;
  seleccionar: (id: string | null) => void;

  /** Devuelve el id de la conversación (nueva o existente) de inmediato. */
  enviar: (texto: string, adjuntos?: AdjuntoPreparado[]) => string | null;
  detener: () => void;
  /** Borra la última respuesta y vuelve a pedirla. */
  regenerar: () => void;
  /** Repite la petición sin borrar nada: para el estado de error. */
  reintentar: () => void;

  estadoStream: EstadoStream;
  textoParcial: string;
  /** Proceso en vivo del agente: razonamiento y pasos, en orden. */
  proceso: ItemProceso[];
  /** Archivos que el agente ya mandó en la respuesta en curso. */
  archivosEnVivo: ArchivoCompartido[];

  /** `true` si la cuenta puede elegir modelo y esfuerzo (permiso "parametros"). */
  puedeAjustarModelo: boolean;
  modelos: ModeloDisponible[];
  ajusteModelo: AjusteModelo;
  cambiarAjusteModelo: (ajuste: Partial<AjusteModelo>) => void;
  /** Sub-agente que está trabajando ahora mismo, o `null`. */
  actividad: string | null;
  /** Lo que tardó el primer token de la respuesta en curso ("Pensó 8 s"); `null` mientras espera. */
  pensoMs: number | null;
  errorStream: string | null;
  /** En qué conversación está transmitiendo, para no pintar el parcial en otra. */
  streamEnId: string | null;

  renombrar: (id: string, titulo: string) => void;
  eliminar: (id: string) => void;
  reaccionar: (conversacionId: string, mensajeId: string, reaccion: 'positiva' | 'negativa') => void;
};

const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children?: ReactNode }) {
  const { usuario, puede } = useAuth();
  const stream = useStreamingChat();
  const puedeAjustarModelo = puede('parametros');

  // Modelo y esfuerzo elegidos en la barra. Se recuerdan entre sesiones; se
  // leen desde un ref en `responder` para no recrear el callback al cambiarlos.
  const [ajusteModelo, setAjusteModelo] = useState<AjusteModelo>(() => leer(CLAVE_AJUSTES, AJUSTE_INICIAL));
  const ajusteRef = useRef(ajusteModelo);
  ajusteRef.current = ajusteModelo;
  const cambiarAjusteModelo = useCallback((cambio: Partial<AjusteModelo>) => {
    setAjusteModelo((previo) => {
      const siguiente = { ...previo, ...cambio };
      escribir(CLAVE_AJUSTES, siguiente);
      return siguiente;
    });
  }, []);

  const [modelos, setModelos] = useState<ModeloDisponible[]>([]);
  useEffect(() => {
    if (!puedeAjustarModelo) return;
    let vivo = true;
    listarModelos()
      .then((lista) => vivo && setModelos(lista))
      .catch(() => vivo && setModelos([])); // sin lista, el selector solo ofrece el predeterminado
    return () => {
      vivo = false;
    };
  }, [puedeAjustarModelo]);

  /*
   * "Pensó 8 s": se mide AQUÍ, en el navegador, del envío al primer token. Es
   * lo que la persona esperó viendo el isotipo, que es lo que el rótulo
   * cuenta. No toca el protocolo ni `useStreamingChat`: se observa el paso de
   * `esperando` a `transmitiendo` que el hook ya publica.
   */
  const inicioEsperaRef = useRef<number | null>(null);
  const pensoRef = useRef<number | null>(null);
  const [pensoMs, setPensoMs] = useState<number | null>(null);
  useEffect(() => {
    if (stream.estado !== 'transmitiendo' || pensoRef.current !== null || inicioEsperaRef.current === null) return;
    pensoRef.current = performance.now() - inicioEsperaRef.current;
    setPensoMs(pensoRef.current);
  }, [stream.estado]);

  const [todas, setTodas] = useState<Conversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activaId, setActivaId] = useState<string | null>(null);
  const [streamEnId, setStreamEnId] = useState<string | null>(null);

  // Espejo síncrono de la lista: `enviar` y `regenerar` necesitan leer el
  // estado más reciente dentro de un callback que puede haberse creado en un
  // render anterior, y una closure sobre `todas` les daría datos viejos.
  const todasRef = useRef<Conversacion[]>([]);
  todasRef.current = todas;

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    (async () => {
      // Latencia artificial: sin ella el skeleton del historial nunca se ve y
      // se acaba construyendo una pantalla que no contempla su propia carga.
      await esperar();
      if (!vivo) return;
      setTodas(cargarConversaciones());
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const actualizar = useCallback((transformar: (previo: Conversacion[]) => Conversacion[]) => {
    setTodas((previo) => {
      const siguiente = transformar(previo);
      todasRef.current = siguiente;
      guardarConversaciones(siguiente);
      return siguiente;
    });
  }, []);

  const conversaciones = useMemo(() => {
    if (!usuario) return [];
    return todas
      .filter((c) => c.usuarioId === usuario.id)
      .slice()
      .sort((a, b) => new Date(b.ultimoMensajeEn).getTime() - new Date(a.ultimoMensajeEn).getTime());
  }, [todas, usuario]);

  const conversacionActiva = useMemo(
    () => conversaciones.find((c) => c.id === activaId) ?? null,
    [conversaciones, activaId]
  );

  const seleccionar = useCallback((id: string | null) => {
    setActivaId(id);
  }, []);

  /**
   * Pide la respuesta y la confirma en la conversación.
   *
   * Una cancelación NO se descarta: lo que el asistente alcanzó a escribir se
   * guarda igual. Cortar a media respuesta y perder lo leído sería castigar al
   * usuario por haber usado el botón que le ofrecimos.
   */
  const responder = useCallback(
    async (conversacionId: string, historial: Mensaje[]) => {
      setStreamEnId(conversacionId);

      // Los archivos completos viven en memoria (lib/adjuntos.ts). Si la sesión
      // se recargó, ya no están: el mensaje se reenvía sin ellos.
      const adjuntos = historial[historial.length - 1]?.adjuntos ?? [];
      const { imagenes, documentos } = paraEnviar(
        adjuntos.flatMap((a) => {
          const completo = adjuntoEnMemoria(a.id);
          return completo ? [completo] : [];
        })
      );

      const { modelo, esfuerzo } = ajusteRef.current;
      const parametros: ParametrosModelo | undefined =
        puedeAjustarModelo && (modelo !== PREDETERMINADO || esfuerzo !== PREDETERMINADO)
          ? {
              modelo: modelo !== PREDETERMINADO ? modelo : undefined,
              esfuerzo: esfuerzo !== PREDETERMINADO ? esfuerzo : undefined,
            }
          : undefined;

      inicioEsperaRef.current = performance.now();
      pensoRef.current = null;
      setPensoMs(null);

      const resultado = await stream.iniciar({
        conversacionId,
        mensajes: historial.map((m) => ({ rol: m.rol, contenido: m.contenido })),
        // Sin `usuario`: quién eres lo dice el token, no el cuerpo de la petición.
        adjuntos: adjuntos.map((a) => ({ nombre: a.nombre, tipo: a.tipo, tamanoBytes: a.tamanoBytes })),
        imagenes,
        documentos,
        parametros,
      });

      // El contexto se guarda aunque no haya texto: una respuesta cortada
      // también ocupó contexto.
      const contexto = resultado.resumen?.contexto ?? undefined;
      if (contexto) {
        actualizar((previo) => previo.map((c) => (c.id === conversacionId ? { ...c, contexto } : c)));
      }

      // Un archivo mandado sin texto también es respuesta: no se pierde la tarjeta.
      if (resultado.texto.trim() || resultado.archivos.length) {
        const creadoEn = new Date().toISOString();
        const respuesta: Mensaje = {
          id: idNuevo('m'),
          rol: 'asistente',
          contenido: resultado.texto,
          creadoEn,
          reaccion: null,
          proceso: resultado.proceso.length ? resultado.proceso : undefined,
          pensoMs: pensoRef.current ?? undefined,
          archivos: resultado.archivos.length ? resultado.archivos : undefined,
        };
        actualizar((previo) =>
          previo.map((c) =>
            c.id === conversacionId
              ? { ...c, mensajes: [...c.mensajes, respuesta], ultimoMensajeEn: creadoEn }
              : c
          )
        );
        // El texto vivo se cambia por el mensaje confirmado en el mismo lote de
        // React 18, así que no hay un frame en el que se vea duplicado o vacío.
        stream.limpiar();
        setStreamEnId(null);
        return;
      }

      // Sin texto: o falló, o lo detuvieron antes del primer fragmento. En el
      // primer caso el error se conserva para pintar el aviso con reintento.
      if (resultado.estado !== 'error') {
        stream.limpiar();
        setStreamEnId(null);
      }
    },
    [actualizar, stream, puedeAjustarModelo]
  );

  const enviar = useCallback(
    (texto: string, preparados: AdjuntoPreparado[] = []): string | null => {
      const contenido = texto.trim();
      if ((!contenido && !preparados.length) || !usuario || stream.activo) return null;
      // En el mensaje se guarda la FICHA de cada archivo (con su miniatura si
      // es imagen o video); los datos completos se quedan en memoria, por id.
      const adjuntos: Adjunto[] = preparados.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        tipo: a.clase === 'imagen' ? a.tipo : a.clase === 'video' ? 'video' : a.formato,
        tamanoBytes: a.tamanoBytes,
        miniatura: a.clase === 'documento' ? undefined : a.miniatura,
        formato: a.clase === 'documento' ? a.formato : a.clase,
      }));

      const creadoEn = new Date().toISOString();
      const mensaje: Mensaje = {
        id: idNuevo('m'),
        rol: 'usuario',
        contenido,
        creadoEn,
        adjuntos: adjuntos?.length ? adjuntos : undefined,
        reaccion: null,
      };

      const actual = activaId ? todasRef.current.find((c) => c.id === activaId) : undefined;

      if (!actual) {
        const id = idNuevo('c');
        const nueva: Conversacion = {
          id,
          usuarioId: usuario.id,
          titulo: tituloDesde(contenido || preparados[0]?.nombre || 'Archivo'),
          mensajes: [mensaje],
          creadoEn,
          ultimoMensajeEn: creadoEn,
        };
        actualizar((previo) => [nueva, ...previo]);
        setActivaId(id);
        void responder(id, [mensaje]);
        return id;
      }

      const historial = [...actual.mensajes, mensaje];
      actualizar((previo) =>
        previo.map((c) => (c.id === actual.id ? { ...c, mensajes: historial, ultimoMensajeEn: creadoEn } : c))
      );
      void responder(actual.id, historial);
      return actual.id;
    },
    [activaId, actualizar, responder, stream.activo, usuario]
  );

  const regenerar = useCallback(() => {
    const conv = todasRef.current.find((c) => c.id === activaId);
    if (!conv || stream.activo) return;
    const indice = conv.mensajes.map((m) => m.rol).lastIndexOf('asistente');
    const base = indice === -1 ? conv.mensajes : conv.mensajes.slice(0, indice);
    if (!base.length) return;
    actualizar((previo) => previo.map((c) => (c.id === conv.id ? { ...c, mensajes: base } : c)));
    void responder(conv.id, base);
  }, [activaId, actualizar, responder, stream.activo]);

  const reintentar = useCallback(() => {
    const conv = todasRef.current.find((c) => c.id === activaId);
    if (!conv || stream.activo || !conv.mensajes.length) return;
    void responder(conv.id, conv.mensajes);
  }, [activaId, responder, stream.activo]);

  const renombrar = useCallback(
    (id: string, titulo: string) => {
      const limpio = titulo.trim();
      if (!limpio) return;
      actualizar((previo) => previo.map((c) => (c.id === id ? { ...c, titulo: limpio } : c)));
    },
    [actualizar]
  );

  const eliminar = useCallback(
    (id: string) => {
      if (streamEnId === id) stream.detener();
      actualizar((previo) => previo.filter((c) => c.id !== id));
      setActivaId((previo) => (previo === id ? null : previo));
    },
    [actualizar, stream, streamEnId]
  );

  /** Optimista y con alternancia: volver a pulsar el mismo pulgar retira el voto. */
  const reaccionar = useCallback(
    (conversacionId: string, mensajeId: string, reaccion: 'positiva' | 'negativa') => {
      actualizar((previo) =>
        previo.map((c) =>
          c.id !== conversacionId
            ? c
            : {
                ...c,
                mensajes: c.mensajes.map((m) =>
                  m.id === mensajeId ? { ...m, reaccion: m.reaccion === reaccion ? null : reaccion } : m
                ),
              }
        )
      );
    },
    [actualizar]
  );

  const valor = useMemo<ChatCtx>(
    () => ({
      conversaciones,
      cargando,
      conversacionActiva,
      seleccionar,
      enviar,
      detener: stream.detener,
      regenerar,
      reintentar,
      estadoStream: stream.estado,
      textoParcial: stream.textoParcial,
      proceso: stream.proceso,
      archivosEnVivo: stream.archivos,
      puedeAjustarModelo,
      modelos,
      ajusteModelo,
      cambiarAjusteModelo,
      actividad: stream.actividad,
      pensoMs,
      errorStream: stream.error,
      streamEnId,
      renombrar,
      eliminar,
      reaccionar,
    }),
    [
      conversaciones,
      cargando,
      conversacionActiva,
      seleccionar,
      enviar,
      stream.detener,
      stream.estado,
      stream.textoParcial,
      stream.proceso,
      stream.archivos,
      puedeAjustarModelo,
      modelos,
      ajusteModelo,
      cambiarAjusteModelo,
      stream.actividad,
      pensoMs,
      stream.error,
      regenerar,
      reintentar,
      streamEnId,
      renombrar,
      eliminar,
      reaccionar,
    ]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useChat() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChat debe usarse dentro de <ChatProvider>');
  return ctx;
}

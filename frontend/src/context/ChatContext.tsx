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
import type { Adjunto, Conversacion, Mensaje } from '../types';
import { conversacionesSemilla } from '../data/conversaciones';
import { escribir, esperar, idNuevo, leer } from '../services/simulacion';
import { useStreamingChat, type EstadoStream } from '../hooks/useStreamingChat';
import { useAuth } from './AuthContext';

const CLAVE = 'conversaciones';

/**
 * El historial persiste, pero CADUCA a las 12 horas.
 *
 * Las semillas de `conversaciones.ts` calculan sus fechas hacia atrás desde
 * "ahora" en cada arranque, justamente para que la demostración siempre tenga
 * casos de los cuatro grupos (Hoy / Ayer / Últimos 7 días / Anteriores) y de
 * los dos modos (activa y solo lectura). Si guardáramos esas fechas para
 * siempre, al día siguiente TODA la lista sería "Anteriores" y estaría en solo
 * lectura: la pantalla se vería rota sin estarlo. Guardar con fecha de corte
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
export function tituloDesde(texto: string) {
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
  enviar: (texto: string, adjuntos?: Adjunto[]) => string | null;
  detener: () => void;
  /** Borra la última respuesta y vuelve a pedirla. */
  regenerar: () => void;
  /** Repite la petición sin borrar nada: para el estado de error. */
  reintentar: () => void;

  estadoStream: EstadoStream;
  textoParcial: string;
  /** Sub-agente que está trabajando ahora mismo, o `null`. */
  actividad: string | null;
  errorStream: string | null;
  /** En qué conversación está transmitiendo, para no pintar el parcial en otra. */
  streamEnId: string | null;

  renombrar: (id: string, titulo: string) => void;
  eliminar: (id: string) => void;
  reaccionar: (conversacionId: string, mensajeId: string, reaccion: 'positiva' | 'negativa') => void;
};

const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children?: ReactNode }) {
  const { usuario } = useAuth();
  const stream = useStreamingChat();

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

      const resultado = await stream.iniciar({
        conversacionId,
        mensajes: historial.map((m) => ({ rol: m.rol, contenido: m.contenido })),
        // Sin `usuario`: quién eres lo dice el token, no el cuerpo de la petición.
        adjuntos: historial[historial.length - 1]?.adjuntos?.map((a) => ({
          nombre: a.nombre,
          tipo: a.tipo,
          tamanoBytes: a.tamanoBytes,
        })),
      });

      if (resultado.texto.trim()) {
        const creadoEn = new Date().toISOString();
        const respuesta: Mensaje = {
          id: idNuevo('m'),
          rol: 'asistente',
          contenido: resultado.texto,
          creadoEn,
          reaccion: null,
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
    [actualizar, stream]
  );

  const enviar = useCallback(
    (texto: string, adjuntos?: Adjunto[]): string | null => {
      const contenido = texto.trim();
      if (!contenido || !usuario || stream.activo) return null;

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
          titulo: tituloDesde(contenido),
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
      actividad: stream.actividad,
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
      stream.actividad,
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

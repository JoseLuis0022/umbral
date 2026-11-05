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
import type { Adjunto, ArchivoCompartido, Conversacion, ItemProceso, Mensaje, ModeloDisponible, PerfilAgente } from '../types';
import { conversacionesSemilla } from '../data/conversaciones';
import { escribir, esperar, idNuevo, leer } from '../services/simulacion';
import { listarModelos } from '../services/modelos.service';
import { enviarMensaje, type ParametrosModelo, type ResultadoEnvio } from '../services/chat.service';
import { detenerTrabajo, listarTrabajos } from '../services/trabajos.service';
import { cerrarProceso, conActividad, conPensamiento } from '../lib/proceso';
import { notificar, pedirPermisoAvisos, sonarTermino } from '../lib/avisos';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui';
import { chat as copyChat } from '../copy';
import { adjuntoEnMemoria, paraEnviar, type AdjuntoPreparado } from '../lib/adjuntos';
import { AJUSTE_INICIAL, PREDETERMINADO, type AjusteModelo } from '../lib/ajusteModelo';
import { useStreamingChat, type EstadoStream } from '../hooks/useStreamingChat';
import { useAuth } from './AuthContext';

const CLAVE_AJUSTES = 'chat:ajustes-modelo';
const CLAVE_PERFIL = 'chat:perfil';
const PERFIL_BASE = 'consulta';

const CLAVE = 'conversaciones';

/** Cada cuánto se pregunta por los trabajos que corren sin nadie mirando. */
const SONDEO_MS = 3000;
/** Una tarea que tardó menos que esto no merece sonido ni notificación. */
const AVISO_DESDE_MS = 15_000;

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
  /** Modos que esta cuenta puede usar (los decide el backend por rol). */
  perfiles: PerfilAgente[];
  /** Modo de la conversación abierta, o el elegido para la próxima. */
  perfilActual: string;
  /** `true` si la conversación abierta ya empezó: su modo no se cambia. */
  perfilFijo: boolean;
  cambiarPerfil: (id: string) => void;
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
  /** Avance de los trabajos que corren sin que nadie los mire, por conversación. */
  progresoTrabajos: Record<string, { pasos: number; actividad: string | null }>;
  /** Cuántas conversaciones tienen un trabajo en curso (para el indicador de la barra). */
  trabajosEnCurso: number;

  renombrar: (id: string, titulo: string) => void;
  eliminar: (id: string) => void;
  reaccionar: (conversacionId: string, mensajeId: string, reaccion: 'positiva' | 'negativa') => void;
};

const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children?: ReactNode }) {
  const { usuario, puede, perfiles } = useAuth();
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

  // Modo para la PRÓXIMA conversación. Se recuerda; si la cuenta ya no tiene
  // ese modo (le cambiaron el rol), cae a consulta.
  const [perfilNuevo, setPerfilNuevo] = useState<string>(() => leer(CLAVE_PERFIL, PERFIL_BASE));
  const perfilValido = perfiles.some((p) => p.id === perfilNuevo) ? perfilNuevo : PERFIL_BASE;
  const perfilNuevoRef = useRef(perfilValido);
  perfilNuevoRef.current = perfilValido;
  const cambiarPerfil = useCallback((id: string) => {
    setPerfilNuevo(id);
    escribir(CLAVE_PERFIL, id);
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
  const [progresoTrabajos, setProgresoTrabajos] = useState<Record<string, { pasos: number; actividad: string | null }>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const rutaRef = useRef(location.pathname);
  rutaRef.current = location.pathname;
  const { push } = useToast();

  /*
   * La consulta vive en el SERVIDOR como trabajo (backend/app/trabajos.py); la
   * conexión solo la observa. Aquí se decide quién mira qué:
   *
   *  - Hay UNA conexión en vivo (`stream`), y sigue a la conversación abierta.
   *  - Abrir otra conversación o mandar en otra SUELTA la actual: el trabajo
   *    sigue en el servidor y queda como `trabajoPendiente` de su conversación.
   *  - Un sondeo vigila los pendientes que nadie mira; cuando uno termina, se
   *    RECOGE su respuesta (se repiten sus eventos sin animación) y se guarda.
   *  - Al recargar o volver otro día, lo mismo: los pendientes guardados en el
   *    navegador se recogen o se vuelven a observar.
   */
  const primerPlanoRef = useRef<string | null>(null); // trabajo que observa `stream`
  const duenoRef = useRef(0); // quién es dueño de la pantalla del stream ahora
  const soltadosRef = useRef(new Set<string>());
  const recogiendoRef = useRef(new Set<string>());

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

  // Una conversación que ya empezó conserva su modo; si no, manda el elegido.
  const perfilFijo = !!conversacionActiva && conversacionActiva.mensajes.length > 0;
  const perfilActual = perfilFijo ? conversacionActiva?.perfil ?? PERFIL_BASE : perfilValido;

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
  /** Trabajo que sigue corriendo en el servidor y que esta conversación espera. */
  const marcarPendiente = useCallback(
    (conversacionId: string, trabajoId: string, desde: string) => {
      actualizar((previo) =>
        previo.map((c) =>
          c.id === conversacionId ? { ...c, trabajoPendiente: trabajoId, trabajoDesde: desde, errorPendiente: undefined } : c
        )
      );
    },
    [actualizar]
  );

  /** "Ya terminó": sonido y notificación, solo si tardó y la persona no la está viendo. */
  const avisarTermino = useCallback(
    (conv: Conversacion, resultado: ResultadoEnvio) => {
      if (resultado.estado === 'cancelado' || !conv.trabajoDesde) return;
      if (Date.now() - new Date(conv.trabajoDesde).getTime() < AVISO_DESDE_MS) return;
      const mirando = !document.hidden && rutaRef.current === `/chat/${conv.id}`;
      if (mirando) return;
      const ok = resultado.estado === 'completo';
      sonarTermino(ok);
      const titulo = ok ? copyChat.avisoListo : copyChat.avisoFallo;
      if (document.hidden) notificar(titulo, conv.titulo, () => navigate(`/chat/${conv.id}`));
      else push({ message: `${titulo}: «${conv.titulo}»`, tone: ok ? 'success' : 'default', duration: 6000 });
    },
    [navigate, push]
  );

  /**
   * Deja la respuesta de un trabajo en su conversación (una sola vez: el
   * `trabajoId` del mensaje evita guardarla doble si dos caminos la recogen).
   */
  const finalizar = useCallback(
    (conversacionId: string, trabajoId: string | undefined, resultado: ResultadoEnvio, proceso: ItemProceso[], pensoMs?: number) => {
      const conv = todasRef.current.find((c) => c.id === conversacionId);
      if (!conv) return;
      const yaEsta = !!trabajoId && conv.mensajes.some((m) => m.trabajoId === trabajoId);
      const hayRespuesta = !yaEsta && (!!resultado.texto.trim() || resultado.archivos.length > 0);
      const creadoEn = new Date().toISOString();
      const contexto = resultado.resumen?.contexto ?? undefined;
      actualizar((previo) =>
        previo.map((c) => {
          if (c.id !== conversacionId) return c;
          const siguiente: Conversacion = { ...c, contexto: contexto ?? c.contexto };
          if (!trabajoId || c.trabajoPendiente === trabajoId) {
            siguiente.trabajoPendiente = undefined;
            siguiente.trabajoDesde = undefined;
          }
          if (hayRespuesta) {
            const respuesta: Mensaje = {
              id: idNuevo('m'),
              rol: 'asistente',
              contenido: resultado.texto,
              creadoEn,
              reaccion: null,
              proceso: proceso.length ? proceso : undefined,
              pensoMs,
              archivos: resultado.archivos.length ? resultado.archivos : undefined,
              trabajoId,
            };
            siguiente.mensajes = [...c.mensajes, respuesta];
            siguiente.ultimoMensajeEn = creadoEn;
            siguiente.errorPendiente = undefined;
          } else if (resultado.estado === 'error' && !yaEsta) {
            siguiente.errorPendiente = resultado.error?.message ?? copyChat.errorEnvio;
          }
          return siguiente;
        })
      );
      if (!yaEsta) avisarTermino(conv, resultado);
    },
    [actualizar, avisarTermino]
  );

  /** Deja de mirar el trabajo en primer plano SIN detenerlo. */
  const soltarPrimerPlano = useCallback(() => {
    if (!stream.activo) return;
    if (primerPlanoRef.current) soltadosRef.current.add(primerPlanoRef.current);
    primerPlanoRef.current = null;
    stream.soltar();
  }, [stream]);

  /**
   * Observa en vivo (primer plano) un trabajo: uno nuevo (`peticion` sin
   * `seguir`) o uno que ya corre en el servidor (`seguir`).
   */
  const enPrimerPlano = useCallback(
    async (conversacionId: string, peticion: Parameters<typeof stream.iniciar>[0], medirEspera: boolean) => {
      const turno = ++duenoRef.current;
      primerPlanoRef.current = peticion.seguir ?? null;
      setStreamEnId(conversacionId);
      inicioEsperaRef.current = medirEspera ? performance.now() : null;
      pensoRef.current = null;
      setPensoMs(null);

      let trabajoId = peticion.seguir;
      const resultado = await stream.iniciar({
        ...peticion,
        alInicio: (inicio) => {
          if (!inicio.trabajoId || peticion.seguir) return;
          trabajoId = inicio.trabajoId;
          if (duenoRef.current === turno) primerPlanoRef.current = inicio.trabajoId;
          marcarPendiente(conversacionId, inicio.trabajoId, new Date().toISOString());
        },
      });

      // Se soltó para mirar otra cosa: el trabajo sigue y lo recogerá el sondeo.
      if (trabajoId && soltadosRef.current.delete(trabajoId)) return;

      finalizar(conversacionId, trabajoId, resultado, resultado.proceso, pensoRef.current ?? undefined);
      if (duenoRef.current !== turno) return;
      primerPlanoRef.current = null;
      // Con texto, el parcial se cambia por el mensaje confirmado en el mismo
      // lote de React. Sin texto y con error, el aviso se queda con su reintento.
      if (resultado.texto.trim() || resultado.archivos.length || resultado.estado !== 'error') {
        stream.limpiar();
        setStreamEnId(null);
      }
    },
    [finalizar, marcarPendiente, stream]
  );

  /** Pide la respuesta de `historial` en vivo. */
  const responder = useCallback(
    async (conversacionId: string, historial: Mensaje[]) => {
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

      actualizar((previo) => previo.map((c) => (c.id === conversacionId ? { ...c, errorPendiente: undefined } : c)));
      const perfil = todasRef.current.find((c) => c.id === conversacionId)?.perfil ?? PERFIL_BASE;
      await enPrimerPlano(
        conversacionId,
        {
          conversacionId,
          perfil,
          mensajes: historial.map((m) => ({ rol: m.rol, contenido: m.contenido })),
          // Sin `usuario`: quién eres lo dice el token, no el cuerpo de la petición.
          adjuntos: adjuntos.map((a) => ({ nombre: a.nombre, tipo: a.tipo, tamanoBytes: a.tamanoBytes })),
          imagenes,
          documentos,
          parametros,
        },
        true
      );
    },
    [actualizar, enPrimerPlano, puedeAjustarModelo]
  );

  /** Repite los eventos de un trabajo que terminó sin nadie mirando y guarda su respuesta. */
  const recoger = useCallback(
    async (conversacionId: string, trabajoId: string) => {
      if (recogiendoRef.current.has(trabajoId)) return;
      recogiendoRef.current.add(trabajoId);
      let proceso: ItemProceso[] = [];
      try {
        const resultado = await enviarMensaje({
          mensajes: [],
          conversacionId,
          seguir: trabajoId,
          alActividad: (a) => {
            proceso = conActividad(proceso, a);
          },
          alPensamiento: (fragmento) => {
            proceso = conPensamiento(proceso, fragmento);
          },
        });
        finalizar(conversacionId, trabajoId, resultado, cerrarProceso(proceso));
      } finally {
        recogiendoRef.current.delete(trabajoId);
      }
    },
    [finalizar]
  );

  // La conexión en vivo SIGUE a la conversación abierta: si tiene un trabajo
  // corriendo (o terminado y sin recoger), se observa aquí, desde el principio.
  const pendienteActivo = todas.find((c) => c.id === activaId)?.trabajoPendiente;
  useEffect(() => {
    if (!activaId || !pendienteActivo) return;
    if (primerPlanoRef.current === pendienteActivo || recogiendoRef.current.has(pendienteActivo)) return;
    soltarPrimerPlano();
    void enPrimerPlano(activaId, { conversacionId: activaId, mensajes: [], seguir: pendienteActivo }, false);
  }, [activaId, pendienteActivo, enPrimerPlano, soltarPrimerPlano]);

  // Sondeo de los trabajos que nadie mira: avance para la barra, y recogida al terminar.
  const clavePendientes = todas
    .filter((c) => c.trabajoPendiente)
    .map((c) => c.trabajoPendiente)
    .join(',');
  useEffect(() => {
    if (cargando || !usuario || !clavePendientes) {
      setProgresoTrabajos({});
      return;
    }
    let vivo = true;
    const revisar = async () => {
      let lista;
      try {
        lista = await listarTrabajos();
      } catch {
        return; // sin red: se vuelve a intentar en el siguiente turno
      }
      if (!vivo) return;
      const progreso: Record<string, { pasos: number; actividad: string | null }> = {};
      for (const conv of todasRef.current) {
        const pendiente = conv.trabajoPendiente;
        if (!pendiente || conv.usuarioId !== usuario.id) continue;
        const t = lista.find((x) => x.id === pendiente);
        if (!t) {
          // El servidor ya no lo conoce: se reinició a media tarea.
          if (primerPlanoRef.current === pendiente) continue;
          actualizar((previo) =>
            previo.map((c) =>
              c.id === conv.id
                ? { ...c, trabajoPendiente: undefined, trabajoDesde: undefined, errorPendiente: copyChat.errorTrabajoPerdido }
                : c
            )
          );
          continue;
        }
        progreso[conv.id] = { pasos: t.pasos, actividad: t.actividad };
        if (t.estado !== 'corriendo' && primerPlanoRef.current !== pendiente) void recoger(conv.id, pendiente);
      }
      setProgresoTrabajos(progreso);
    };
    void revisar();
    const intervalo = setInterval(revisar, SONDEO_MS);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [actualizar, cargando, clavePendientes, recoger, usuario]);

  const enviar = useCallback(
    (texto: string, preparados: AdjuntoPreparado[] = []): string | null => {
      const contenido = texto.trim();
      if ((!contenido && !preparados.length) || !usuario) return null;
      const destino = activaId ? todasRef.current.find((c) => c.id === activaId) : undefined;
      // Esta conversación ya trabaja: no se encima otra pregunta.
      if (destino?.trabajoPendiente || (stream.activo && streamEnId === destino?.id)) return null;
      // Otra conversación trabaja en vivo: se suelta (sigue en el servidor).
      soltarPrimerPlano();
      // Las tareas largas avisan al terminar; el permiso solo se puede pedir dentro de un clic.
      if ((destino?.perfil ?? perfilNuevoRef.current) !== PERFIL_BASE) pedirPermisoAvisos();
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
          perfil: perfilNuevoRef.current,
        };
        // El ref se actualiza ya: `responder` busca el perfil ahí, antes del re-render.
        todasRef.current = [nueva, ...todasRef.current];
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
    [activaId, actualizar, responder, soltarPrimerPlano, stream.activo, streamEnId, usuario]
  );

  const regenerar = useCallback(() => {
    const conv = todasRef.current.find((c) => c.id === activaId);
    if (!conv || conv.trabajoPendiente || (stream.activo && streamEnId === conv.id)) return;
    soltarPrimerPlano();
    const indice = conv.mensajes.map((m) => m.rol).lastIndexOf('asistente');
    const base = indice === -1 ? conv.mensajes : conv.mensajes.slice(0, indice);
    if (!base.length) return;
    actualizar((previo) => previo.map((c) => (c.id === conv.id ? { ...c, mensajes: base } : c)));
    void responder(conv.id, base);
  }, [activaId, actualizar, responder, soltarPrimerPlano, stream.activo, streamEnId]);

  const reintentar = useCallback(() => {
    const conv = todasRef.current.find((c) => c.id === activaId);
    if (!conv || conv.trabajoPendiente || (stream.activo && streamEnId === conv.id) || !conv.mensajes.length) return;
    soltarPrimerPlano();
    void responder(conv.id, conv.mensajes);
  }, [activaId, responder, soltarPrimerPlano, stream.activo, streamEnId]);

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
      // Borrar la conversación sí detiene su trabajo: nadie va a leer la respuesta.
      if (streamEnId === id && stream.activo) stream.detener();
      const pendiente = todasRef.current.find((c) => c.id === id)?.trabajoPendiente;
      if (pendiente) void detenerTrabajo(pendiente);
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

  const trabajosEnCurso = conversaciones.filter((c) => c.trabajoPendiente).length;

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
      perfiles,
      perfilActual,
      perfilFijo,
      cambiarPerfil,
      puedeAjustarModelo,
      modelos,
      ajusteModelo,
      cambiarAjusteModelo,
      actividad: stream.actividad,
      pensoMs,
      errorStream: stream.error,
      streamEnId,
      progresoTrabajos,
      trabajosEnCurso,
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
      perfiles,
      perfilActual,
      perfilFijo,
      cambiarPerfil,
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
      progresoTrabajos,
      trabajosEnCurso,
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

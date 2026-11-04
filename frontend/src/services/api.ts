import { escribir, leer } from './simulacion';

/**
 * Cliente HTTP del backend. TODA petición al servidor pasa por aquí, así que
 * el token, la URL base y la reacción ante un 401 viven en un solo lugar.
 *
 * URL base: `/api`, relativa. En desarrollo, Vite la reenvía al backend
 * (`server.proxy` en vite.config.ts); en el VPS, el reverse proxy sirve front y
 * back en el mismo dominio. Mismo origen = sin CORS.
 *
 * El token se guarda en localStorage. Es lo simple para el laboratorio, con un
 * costo conocido: si un día hubiera un XSS, el script podría leerlo. La versión
 * endurecida (etapa 2) es una cookie httpOnly que JavaScript no puede leer.
 */

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').trim().replace(/\/$/, '');
const CLAVE_TOKEN = 'token';

export class ErrorApi extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

export function tokenGuardado(): string | null {
  return leer<string | null>(CLAVE_TOKEN, null);
}

export function guardarToken(token: string | null) {
  escribir<string | null>(CLAVE_TOKEN, token);
}

const alExpirar = new Set<() => void>();

/**
 * Avisa cuando el backend rechaza el token (expiró, se borró la cuenta). El
 * AuthContext se suscribe para cerrar la sesión en pantalla en el mismo
 * instante, en vez de dejar al usuario en una pantalla que ya no puede usar.
 */
export function siLaSesionExpira(escucha: () => void): () => void {
  alExpirar.add(escucha);
  return () => {
    alExpirar.delete(escucha);
  };
}

type OpcionesPedido = Omit<RequestInit, 'body'> & { json?: unknown };

export async function pedir(ruta: string, { json, headers, ...resto }: OpcionesPedido = {}): Promise<Response> {
  const token = tokenGuardado();
  const respuesta = await fetch(BASE + ruta, {
    ...resto,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (respuesta.status === 401 && token) {
    guardarToken(null);
    alExpirar.forEach((escucha) => escucha());
  }
  return respuesta;
}

/** El backend responde los errores como `{ "detail": "mensaje para la persona" }`. */
export async function mensajeDeError(respuesta: Response, porDefecto: string): Promise<string> {
  try {
    const datos = (await respuesta.json()) as { detail?: unknown };
    if (typeof datos.detail === 'string') return datos.detail;
  } catch {
    /* cuerpo vacío o que no es JSON */
  }
  return porDefecto;
}

export async function pedirJson<T>(ruta: string, opciones: OpcionesPedido, porDefecto: string): Promise<T> {
  const respuesta = await pedir(ruta, opciones);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, await mensajeDeError(respuesta, porDefecto));
  return (await respuesta.json()) as T;
}

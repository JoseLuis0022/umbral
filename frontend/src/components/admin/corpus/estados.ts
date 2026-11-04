import { AlertTriangle, CheckCircle2, Clock, RefreshCw, type LucideIcon } from 'lucide-react';
import type { EstadoDocumento } from '../../../types';
import type { StatusFamily } from '../../../lib/status';
import { admin as copy } from '../../../copy';

/**
 * Tratamiento visual de cada estado de indexación.
 *
 * Las clases van ESCRITAS COMPLETAS a propósito. Tailwind escanea el código
 * como texto plano: una clase armada con plantilla (`bg-status-` + familia)
 * nunca se genera y el elemento sale sin color, sin ningún error en consola ni
 * en el typecheck. Es el bug más caro de encontrar de todo el stack.
 *
 * El error usa `status-red` (#8F2E22, terroso) y jamás el color de marca: si el
 * peligro y la acción primaria compartieran color, el mismo rojo significaría
 * "haz clic aquí" y "algo salió mal" en la misma pantalla.
 */
export const ESTADO_DOC: Record<
  EstadoDocumento,
  {
    etiqueta: string;
    familia: StatusFamily;
    icono: LucideIcon;
    texto: string;
    fondo: string;
    punto: string;
    borde: string;
  }
> = {
  indexado: {
    etiqueta: copy.estados.indexado,
    familia: 'green',
    icono: CheckCircle2,
    texto: 'text-status-green',
    fondo: 'bg-status-green-soft',
    punto: 'bg-status-green',
    borde: 'border-status-green/25',
  },
  procesando: {
    etiqueta: copy.estados.procesando,
    familia: 'blue',
    icono: RefreshCw,
    texto: 'text-status-blue',
    fondo: 'bg-status-blue-soft',
    punto: 'bg-status-blue',
    borde: 'border-status-blue/25',
  },
  en_cola: {
    etiqueta: copy.estados.en_cola,
    familia: 'amber',
    icono: Clock,
    texto: 'text-status-amber',
    fondo: 'bg-status-amber-soft',
    punto: 'bg-status-amber',
    borde: 'border-status-amber/25',
  },
  error: {
    etiqueta: copy.estados.error,
    familia: 'red',
    icono: AlertTriangle,
    texto: 'text-status-red',
    fondo: 'bg-status-red-soft',
    punto: 'bg-status-red',
    borde: 'border-status-red/25',
  },
};

/** Orden de gravedad para el resumen del panel: primero lo que pide atención. */
export const ORDEN_ESTADOS: EstadoDocumento[] = ['error', 'procesando', 'en_cola', 'indexado'];

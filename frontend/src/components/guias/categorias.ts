import { FileText, Mail, Scale, Users, Wrench, type LucideIcon } from 'lucide-react';
import type { CategoriaGuia } from '../../types';

/**
 * Identidad visual de cada categoría de guía, en un solo lugar.
 *
 * Las clases van ESCRITAS COMPLETAS y nunca compuestas con plantillas
 * (`bg-status-${x}-soft`): el JIT de Tailwind escanea texto plano, así que una
 * clase construida en tiempo de ejecución simplemente no se genera y el color
 * desaparece sin ningún error visible.
 *
 * Gobernanza usa `status-red`, el rojo terroso de riesgo, y ninguna categoría
 * usa el azul de marca: es la categoría que impone obligaciones, y el acento
 * está reservado para "haz clic aquí". Que compartieran color haría que la etiqueta
 * pareciera un botón.
 */
export const CATEGORIAS: CategoriaGuia[] = ['Correo', 'Documentos', 'Reuniones', 'TI', 'Gobernanza'];

export const ICONO_CATEGORIA: Record<CategoriaGuia, LucideIcon> = {
  Correo: Mail,
  Documentos: FileText,
  Reuniones: Users,
  TI: Wrench,
  Gobernanza: Scale,
};

export const CLASES_CATEGORIA: Record<CategoriaGuia, string> = {
  Correo: 'bg-status-blue-soft text-status-blue',
  Documentos: 'bg-status-green-soft text-status-green',
  Reuniones: 'bg-status-amber-soft text-status-amber',
  TI: 'bg-status-gray-soft text-status-gray',
  Gobernanza: 'bg-status-red-soft text-status-red',
};

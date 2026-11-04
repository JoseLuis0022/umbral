// Mapa semántico único de estatus → familia de color.
//
// Regla del sistema: NINGÚN componente decide un color comparando strings por
// su cuenta. Todo valor de estatus que aparezca en cualquier pantalla se
// resuelve aquí a una de 5 familias. Cuando se defina el vocabulario de
// estatus definitivo de Umbral, se agrega aquí y toda la app lo hereda.

export type StatusFamily = 'green' | 'blue' | 'amber' | 'red' | 'gray';

export const STATUS_FAMILY: Record<string, StatusFamily> = {
  // Éxito / confirmado
  Publicado: 'green',
  Aprobado: 'green',
  Activo: 'green',
  Completado: 'green',
  Vigente: 'green',

  // En curso
  'En revisión': 'blue',
  'En proceso': 'blue',
  Enviado: 'blue',

  // Advertencia / espera
  Pendiente: 'amber',
  Borrador: 'amber',
  'Por vencer': 'amber',

  // Error / negativo
  Rechazado: 'red',
  Vencido: 'red',
  Cancelado: 'red',
  Inactivo: 'red',

  // Neutro
  Programado: 'gray',
  Archivado: 'gray',
};

const FAMILY_CLASSES: Record<StatusFamily, string> = {
  green: 'bg-status-green-soft text-status-green',
  blue: 'bg-status-blue-soft text-status-blue',
  amber: 'bg-status-amber-soft text-status-amber',
  red: 'bg-status-red-soft text-status-red',
  gray: 'bg-status-gray-soft text-status-gray',
};

export function getStatusFamily(label: string): StatusFamily {
  return STATUS_FAMILY[label] ?? 'gray';
}

export function getStatusClasses(label: string, tone?: StatusFamily) {
  return FAMILY_CLASSES[tone ?? getStatusFamily(label)];
}

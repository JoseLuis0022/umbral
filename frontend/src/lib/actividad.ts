import type { ActividadAgente } from '../types';
import { copyLocal } from '../components/chat/copyLocal';

/**
 * Traduce una actividad del agente (herramienta + ruta) a una frase para el
 * estudiante. El Laboratorio NO usa esto: ahí se muestra el dato técnico tal
 * cual, porque es una pantalla para medir.
 *
 * Las rutas son las de `agente-imagenes/` (ver backend/app/prompts/consulta.md).
 * Lo que no se reconoce cae en una frase genérica: nunca se muestra una ruta
 * cruda en el chat.
 */
export function describirActividad(actividad: ActividadAgente): string {
  if (actividad.clase === 'subagente') return copyLocal.consultandoAgente(actividad.nombre);

  const detalle = actividad.detalle;

  if (actividad.nombre === 'Grep') {
    const patron = /^"(.+)" en /.exec(detalle)?.[1];
    return patron ? copyLocal.actividadBuscar(patron) : copyLocal.actividadRevisar;
  }

  if (/indice-temas\.md$/.test(detalle)) return copyLocal.actividadIndice;
  if (/calendario\.md$/.test(detalle)) return copyLocal.actividadCalendario;
  if (/^estado\/diapositivas\//.test(detalle)) return copyLocal.actividadDiapositivas;

  const clase = /inventario\/clase-0*(\d+)\.md$/.exec(detalle)?.[1];
  if (clase) return copyLocal.actividadResumenClase(clase);

  const practica = /inventario\/practica-(\d+)\.md$/.exec(detalle)?.[1];
  if (practica) return copyLocal.actividadPractica(practica);

  const tema = /^Apuntes\/Tema 0*(\d+)/.exec(detalle)?.[1];
  if (tema) return copyLocal.actividadApuntes(tema);

  const grabacion = /Transcripciones\/Clase (\d+)/.exec(detalle)?.[1];
  if (grabacion) return copyLocal.actividadTranscripcion(grabacion);

  return copyLocal.actividadRevisar;
}

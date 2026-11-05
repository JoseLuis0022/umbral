import type { Esfuerzo } from '../types';

/**
 * Modelo y esfuerzo que elige quien tiene permiso "parametros" en la barra del
 * chat. Vive aquí y no en ChatContext a propósito: un archivo de contexto que
 * exporta algo además de su componente y su hook rompe el Fast Refresh de
 * Vite, y al editar en caliente React volvía a renderizar el provider con otros
 * hooks y dejaba la app en blanco.
 */

/** Valor de los selectores que significa "lo que tenga configurado el perfil". */
export const PREDETERMINADO = 'predeterminado';

export type EsfuerzoElegido = Esfuerzo | typeof PREDETERMINADO;

export type AjusteModelo = { modelo: string; esfuerzo: EsfuerzoElegido };

export const AJUSTE_INICIAL: AjusteModelo = { modelo: PREDETERMINADO, esfuerzo: PREDETERMINADO };

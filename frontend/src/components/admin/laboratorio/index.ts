// Punto único de importación del laboratorio de modelos.
// La pantalla (`src/pages/AdminLaboratorio.tsx`) importa siempre desde aquí.
export { PanelParametros } from './PanelParametros';
export { CarrilParametros } from './CarrilParametros';
export type { SeccionParametros } from './CarrilParametros';
export { SelectorModelo } from './SelectorModelo';
export { EditorSystemPrompt } from './EditorSystemPrompt';
export { ControlTemperatura } from './ControlTemperatura';
export { CadenaAgentes, ResumenCadena } from './CadenaAgentes';
export { Metricas } from './Metricas';
export { HiloPrueba, EstadoVacioLab } from './HiloPrueba';
export { EntradaPrueba } from './EntradaPrueba';
export { copyLab } from './copyLocal';
export { formatoDuracion, formatoEntero, tokensAprox, CARACTERES_POR_TOKEN } from './formato';
export { envolver, prefijarLineas } from './markdownEdicion';
export type { Edicion } from './markdownEdicion';
export {
  MODELOS,
  MAX_SYSTEM_PROMPT,
  PARAMETROS_POR_DEFECTO,
  CLAVE_PARAMETROS,
  sonParametrosPorDefecto,
  nuevaSesionId,
} from './modelos';
export type {
  EstadoLab,
  MensajeLab,
  MetricasRespuesta,
  ModeloCatalogo,
  NivelPensamiento,
  ParametrosLab,
  PasoAgente,
} from './tipos';

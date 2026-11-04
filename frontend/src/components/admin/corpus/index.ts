// Punto único de importación de la pantalla de corpus (/admin/corpus).
export { TarjetaCorpus, TarjetaNuevoCorpus, TarjetaCorpusEsqueleto } from './TarjetaCorpus';
export { PanelArchivos } from './PanelArchivos';
export { FilaDocumento, FilaDocumentoEsqueleto } from './FilaDocumento';
export { CarrilArchivos } from './CarrilArchivos';
export { useSoltarArchivos, useColapsoZona, CapaSoltar, ZonaSoltar, BotonSubir } from './ZonaSoltar';
export type { ColapsoZona } from './ZonaSoltar';
export { BarraCorpus } from './BarraCorpus';
export { VisorDocumento } from './VisorDocumento';
export { EditorPrompt } from './EditorPrompt';
export { DialogoCorpus } from './DialogoCorpus';
export type { DatosCorpus } from './DialogoCorpus';
export { DialogoEliminar } from './DialogoEliminar';
export { ESTADO_DOC, ORDEN_ESTADOS } from './estados';
export { useDialogoAccesible } from './useDialogoAccesible';
export { ICONOS_CORPUS, CLAVE_ICONO_NEUTRO, iconoDeCorpus } from './iconos';
export type { IconoCorpus } from './iconos';

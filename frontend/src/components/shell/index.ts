// Punto único de importación de las piezas del armazón compartido.
// (`PageHeader`, `NavAdmin` y `MenuUsuario` se siguen importando por su ruta:
// son anteriores a este índice y no hay motivo para tocar sus consumidores.)
export { PanelPlegable, ANCHO_CARRIL } from './PanelPlegable';
export type { AnchoPanel, ApiCarril } from './PanelPlegable';
export { ElementoCarril, ListaCarril } from './ElementoCarril';
export { AyudaEmergente } from './AyudaEmergente';
export { usarConsultaMedia, CONSULTA_ESCRITORIO, CONSULTA_ANCHA } from './usarConsultaMedia';

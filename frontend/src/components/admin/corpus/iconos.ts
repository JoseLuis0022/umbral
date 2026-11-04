import {
  Banknote,
  BookOpen,
  Building2,
  GraduationCap,
  Laptop,
  Library,
  LifeBuoy,
  Megaphone,
  Microscope,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catálogo de iconos de las bases de conocimiento.
 *
 * Lo que se guarda en el corpus es la CLAVE (`corpus.icono`), no el componente:
 * las bases se persisten en localStorage y una función de React no sobrevive a
 * `JSON.stringify`. Este archivo es el único sitio donde una clave se traduce a
 * un dibujo, así que cambiar un icono es cambiar una línea aquí y no tocar
 * ninguna base ya creada.
 *
 * Las claves son SEMÁNTICAS y estables: `balanza` seguirá siendo `balanza`
 * aunque mañana se dibuje con otro trazo. Si una base guardada trae una clave
 * que ya no existe (catálogo recortado entre versiones), se cae al neutro en
 * vez de romper la tarjeta — ver `iconoDeCorpus`.
 *
 * La `etiqueta` es el nombre accesible de la opción en el selector: dice para
 * QUÉ sirve el icono, no cómo se ve. Un lector de pantalla anunciando "balanza"
 * obliga a adivinar; anunciando "Normativa", no.
 */
export interface IconoCorpus {
  clave: string;
  etiqueta: string;
  componente: LucideIcon;
}

/** Se usa cuando no se elige nada y cuando la clave guardada no existe. */
export const CLAVE_ICONO_NEUTRO = 'biblioteca';

/**
 * El orden es el de la rejilla del selector, y no es alfabético: primero el
 * neutro y las dos áreas que ya tienen base creada (normativa y soporte), luego
 * el resto por cercanía temática. Lo más probable queda bajo el pulgar.
 */
export const ICONOS_CORPUS: readonly IconoCorpus[] = [
  { clave: CLAVE_ICONO_NEUTRO, etiqueta: 'General', componente: Library },
  { clave: 'balanza', etiqueta: 'Normativa', componente: Scale },
  { clave: 'salvavidas', etiqueta: 'Soporte', componente: LifeBuoy },
  { clave: 'cumplimiento', etiqueta: 'Cumplimiento', componente: ShieldCheck },
  { clave: 'finanzas', etiqueta: 'Finanzas', componente: Banknote },
  { clave: 'escolares', etiqueta: 'Servicios escolares', componente: GraduationCap },
  { clave: 'docencia', etiqueta: 'Docencia', componente: BookOpen },
  { clave: 'investigacion', etiqueta: 'Investigación', componente: Microscope },
  { clave: 'comunicacion', etiqueta: 'Comunicación', componente: Megaphone },
  { clave: 'infraestructura', etiqueta: 'Infraestructura', componente: Building2 },
  { clave: 'personas', etiqueta: 'Personas', componente: Users },
  { clave: 'tecnologia', etiqueta: 'Tecnología', componente: Laptop },
];

// Mapa auxiliar: la tarjeta resuelve su icono en cada render de la tira y
// recorrer doce entradas por tarjeta, aunque sea barato, es trabajo que no
// hace falta repetir.
const POR_CLAVE = new Map(ICONOS_CORPUS.map((icono) => [icono.clave, icono]));

const NEUTRO = POR_CLAVE.get(CLAVE_ICONO_NEUTRO)!.componente;

/** Traduce la clave guardada a componente, con caída al neutro. */
export function iconoDeCorpus(clave: string): LucideIcon {
  return POR_CLAVE.get(clave)?.componente ?? NEUTRO;
}

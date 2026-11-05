import { Brain, Cpu, Database, Library, Pencil, Thermometer, type LucideIcon } from 'lucide-react';
import { ElementoCarril, ListaCarril } from '../../shell';
import { MODELOS } from './modelos';
import { copyLab } from './copyLocal';
import type { ParametrosLab } from './tipos';

/** Los seis grupos del panel, en el mismo orden en el que se deciden. */
export type SeccionParametros =
  | 'corpus'
  | 'modelo'
  | 'instrucciones'
  | 'pensamiento'
  | 'temperatura'
  | 'memoria';

const ETIQUETA_NIVEL: Record<ParametrosLab['nivelPensamiento'], string> = {
  ninguno: copyLab.pensamientoNinguno,
  bajo: copyLab.pensamientoBajo,
  medio: copyLab.pensamientoMedio,
  alto: copyLab.pensamientoAlto,
};

/**
 * Carril del laboratorio: un icono por grupo de parámetros.
 *
 * ESTE CARRIL ES DISTINTO A LOS OTROS TRES, y conviene decir por qué. Los de
 * auditoría y corpus pliegan una LISTA: cada icono es un elemento y
 * pulsarlo cambia lo que se está mirando sin desplegar nada. Aquí no hay lista
 * que plegar, hay un formulario, así que un icono no puede "ser" un parámetro:
 * pulsarlo despliega el panel en esa sección.
 *
 * Se conserva igual —en vez de plegarlo del todo— porque el carril sí carga
 * información real: la ayuda emergente de cada icono dice el VALOR vigente
 * ("Temperatura: 0.70", "Modelo: GPT-4.1"). Con el panel plegado se puede
 * repasar la configuración entera con el cursor sin recuperar los 400 px, que
 * es justo lo que se quiere mientras se lee una respuesta larga. Un plegado a
 * cero habría obligado a desplegar para responder "¿con qué ajustes salió
 * esto?", que es LA pregunta de esta pantalla.
 */
export function CarrilParametros({
  parametros,
  onIr,
}: {
  parametros: ParametrosLab;
  onIr: (seccion: SeccionParametros) => void;
}) {
  const nombreModelo =
    MODELOS.find((m) => m.id === parametros.modelo)?.nombre ?? parametros.modelo;
  const instrucciones = parametros.systemPrompt.trim();

  const grupos: { seccion: SeccionParametros; icono: LucideIcon; etiqueta: string }[] = [
    {
      seccion: 'corpus',
      icono: Library,
      etiqueta: copyLab.carrilValor(copyLab.corpusEtiqueta, copyLab.corpusCarril),
    },
    {
      seccion: 'modelo',
      icono: Cpu,
      etiqueta: copyLab.carrilValor(copyLab.modeloEtiqueta, nombreModelo),
    },
    {
      seccion: 'instrucciones',
      icono: Pencil,
      etiqueta: copyLab.carrilValor(
        copyLab.instruccionesEtiqueta,
        instrucciones ? copyLab.carrilInstruccionesPuestas : copyLab.carrilInstruccionesVacias
      ),
    },
    {
      seccion: 'pensamiento',
      icono: Brain,
      etiqueta: copyLab.carrilValor(
        copyLab.pensamientoEtiqueta,
        ETIQUETA_NIVEL[parametros.nivelPensamiento]
      ),
    },
    {
      seccion: 'temperatura',
      icono: Thermometer,
      etiqueta: copyLab.carrilValor(
        copyLab.temperaturaEtiqueta,
        parametros.temperatura.toFixed(2)
      ),
    },
    { seccion: 'memoria', icono: Database, etiqueta: copyLab.memoriaTitulo },
  ];

  return (
    <ListaCarril>
      {grupos.map(({ seccion, icono: Icono, etiqueta }) => (
        <ElementoCarril
          key={seccion}
          lado="derecha"
          // Sin `idSeleccion`: aquí ningún grupo está "activo". Marcar uno
          // significaría que hay una sección elegida, y no la hay.
          etiqueta={`${etiqueta}\n${copyLab.carrilAbrirSeccion}`}
          onClick={() => onIr(seccion)}
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-celda bg-bg text-text-2"
          >
            <Icono size={16} strokeWidth={2} />
          </span>
        </ElementoCarril>
      ))}
    </ListaCarril>
  );
}

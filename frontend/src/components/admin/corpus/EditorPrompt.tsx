import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bold, Eye, Heading2, Heading3, Italic, List, PenLine, type LucideIcon } from 'lucide-react';
import type { Corpus } from '../../../types';
import { cn } from '../../../lib/cn';
import { dur, ease } from '../../../lib/motion';
import { Markdown } from '../../Markdown';
import { Button, Modal, SegmentedControl, Textarea } from '../../ui';
import { admin as copy } from '../../../copy';
import { useDialogoAccesible } from './useDialogoAccesible';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  titulo: (nombre: string) => `${copy.systemPrompt} · ${nombre}`,
  ayuda:
    'Define quién es el asistente en esta base: alcance, tono y límites. Se antepone a cada respuesta que dé sobre estos documentos. Acepta Markdown.',
  etiqueta: 'Instrucciones del asistente',
  sinGuardar: 'Cambios sin guardar',
  caracteres: (n: number) => `${n.toLocaleString('es-MX')} caracteres`,
  formato: 'Formato',
  escribir: 'Escribir',
  vistaPrevia: 'Vista previa',
  previaVacia: '_Todavía no hay nada escrito._',
};

type Herramienta = {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  /** `envolver` rodea la selección; `prefijo` marca el inicio de cada línea. */
  tipo: 'envolver' | 'prefijo';
  marca: string;
};

const HERRAMIENTAS: Herramienta[] = [
  { id: 'negritas', etiqueta: 'Negritas', icono: Bold, tipo: 'envolver', marca: '**' },
  { id: 'cursiva', etiqueta: 'Cursiva', icono: Italic, tipo: 'envolver', marca: '_' },
  { id: 'titulo', etiqueta: 'Título', icono: Heading2, tipo: 'prefijo', marca: '## ' },
  { id: 'subtitulo', etiqueta: 'Subtítulo', icono: Heading3, tipo: 'prefijo', marca: '### ' },
  { id: 'lista', etiqueta: 'Lista', icono: List, tipo: 'prefijo', marca: '- ' },
];

/** Encabezado o viñeta que ya trae la línea. Se retira antes de poner el nuevo
 *  prefijo: sin esto, marcar como título una línea que ya era subtítulo
 *  produciría "## ### texto". */
const PREFIJO_EXISTENTE = /^(#{1,6}\s+|[-*]\s+)/;

/**
 * Editor del system prompt de una base.
 *
 * Cerrar NO descarta: el borrador vive en la pantalla, no aquí dentro, así que
 * volver a abrir devuelve exactamente lo que se estaba escribiendo. Perder un
 * prompt de treinta líneas por cerrar sin querer sería el peor error posible
 * de esta pantalla, y un diálogo de "¿seguro que quieres salir?" solo traslada
 * el problema a un clic más.
 *
 * Descartar sí es explícito, y por eso es un botón con nombre propio.
 *
 * El prompt se guarda como Markdown y el asistente lo lee así, de modo que la
 * barra de formato y la vista previa no son adorno: son la única forma de ver
 * si ese "##" iba a quedar como título o como dos gatos sueltos. La vista
 * previa usa el MISMO componente `Markdown` que el visor de documentos, así
 * que lo que se ve aquí es literalmente lo que se verá allá.
 */
export function EditorPrompt({
  abierto,
  corpus,
  valor,
  sucio,
  guardando,
  onValor,
  onCerrar,
  onGuardar,
  onDescartar,
}: {
  abierto: boolean;
  corpus: Corpus | null;
  valor: string;
  sucio: boolean;
  guardando: boolean;
  onValor: (valor: string) => void;
  onCerrar: () => void;
  onGuardar: () => void;
  onDescartar: () => void;
}) {
  const [vista, setVista] = useState<'escribir' | 'previa'>('escribir');
  const area = useRef<HTMLTextAreaElement>(null);

  // Dónde debe quedar el cursor DESPUÉS de que React repinte con el texto
  // nuevo. El valor es controlado por la pantalla, así que en el momento de
  // insertar la marca el textarea todavía muestra el texto viejo: mover la
  // selección aquí mismo la dejaría en el sitio equivocado.
  const seleccion = useRef<[number, number] | null>(null);

  useEffect(() => {
    const destino = seleccion.current;
    if (!destino || !area.current) return;
    seleccion.current = null;
    // Devolver el foco es parte del trabajo del botón: quien escribe sigue
    // escribiendo, no tiene que volver a hacer clic dentro del campo.
    area.current.focus();
    area.current.setSelectionRange(destino[0], destino[1]);
  }, [valor]);

  // Se vuelve a "Escribir" AL ABRIR: reabrir el editor en modo lectura porque
  // la última vez se dejó ahí se siente como si no se pudiera editar.
  useEffect(() => {
    if (abierto) setVista('escribir');
  }, [abierto]);

  const cerrar = useCallback(() => {
    if (!guardando) onCerrar();
  }, [guardando, onCerrar]);

  useDialogoAccesible(abierto && corpus !== null, cerrar);

  function aplicar(herramienta: Herramienta) {
    const campo = area.current;
    if (!campo) return;

    const { selectionStart: ini, selectionEnd: fin } = campo;
    const { marca } = herramienta;

    if (herramienta.tipo === 'envolver') {
      const elegido = valor.slice(ini, fin);
      const inicioTexto = ini + marca.length;
      onValor(valor.slice(0, ini) + marca + elegido + marca + valor.slice(fin));
      // Con selección se conserva envuelta; sin selección el cursor queda
      // ENTRE las dos marcas, listo para escribir dentro.
      seleccion.current = [inicioTexto, inicioTexto + elegido.length];
      return;
    }

    // Los prefijos actúan sobre líneas completas, aunque la selección empiece
    // a media palabra: un "##" en el centro de un renglón no es un título.
    const inicioBloque = valor.lastIndexOf('\n', ini - 1) + 1;
    const corte = valor.indexOf('\n', fin);
    const finBloque = corte === -1 ? valor.length : corte;

    const lineas = valor.slice(inicioBloque, finBloque).split('\n');
    // Si TODAS las líneas ya tienen esta marca, el botón la quita: es un
    // interruptor, no un acumulador de almohadillas.
    const yaMarcadas = lineas.every((linea) => linea.startsWith(marca));
    const nuevas = lineas.map((linea) =>
      yaMarcadas ? linea.slice(marca.length) : marca + linea.replace(PREFIJO_EXISTENTE, '')
    );

    const bloque = nuevas.join('\n');
    onValor(valor.slice(0, inicioBloque) + bloque + valor.slice(finBloque));

    if (ini === fin) {
      // Sin selección: el cursor se queda donde estaba, corrido lo que creció
      // (o encogió) el prefijo de su propia línea.
      const desfase = nuevas[0].length - lineas[0].length;
      const destino = Math.max(inicioBloque, ini + desfase);
      seleccion.current = [destino, destino];
    } else {
      seleccion.current = [inicioBloque, inicioBloque + bloque.length];
    }
  }

  if (!corpus) return null;

  const enPrevia = vista === 'previa';

  return (
    <Modal
      open={abierto}
      onClose={cerrar}
      size="lg"
      title={textos.titulo(corpus.nombre)}
      footer={
        <>
          {/* El aviso de estado sucio vive en el pie, junto a los botones que
              lo resuelven: es donde la mirada ya está cuando decide. */}
          <AnimatePresence initial={false}>
            {sucio && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur.fast, ease }}
                className="mr-auto inline-flex items-center gap-2 font-ui text-12 text-text-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-status-amber" aria-hidden />
                {textos.sinGuardar}
              </motion.span>
            )}
          </AnimatePresence>
          <Button variant="ghost" onClick={onDescartar} disabled={!sucio || guardando}>
            {copy.descartar}
          </Button>
          <Button variant="primary" onClick={onGuardar} disabled={!sucio} loading={guardando}>
            {copy.guardarCambios}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="font-ui text-13 text-text-2">{textos.ayuda}</p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-0.5" role="group" aria-label={textos.formato}>
            {HERRAMIENTAS.map((herramienta) => (
              <BotonFormato
                key={herramienta.id}
                herramienta={herramienta}
                disabled={guardando || enPrevia}
                onAplicar={() => aplicar(herramienta)}
              />
            ))}
          </div>

          <SegmentedControl
            layoutId="vista-prompt"
            value={vista}
            onChange={(v) => setVista(v === 'previa' ? 'previa' : 'escribir')}
            options={[
              { value: 'escribir', label: textos.escribir, icon: <PenLine size={14} /> },
              { value: 'previa', label: textos.vistaPrevia, icon: <Eye size={14} /> },
            ]}
          />
        </div>

        {/* Las dos vistas comparten alto mínimo: alternar no debe cambiar el
            tamaño del diálogo ni mover los botones del pie. */}
        {enPrevia ? (
          <div className="min-h-[38vh] rounded-control border border-hairline bg-bg px-4 py-3">
            <Markdown>{valor.trim() || textos.previaVacia}</Markdown>
          </div>
        ) : (
          <Textarea
            ref={area}
            aria-label={textos.etiqueta}
            value={valor}
            onChange={(e) => onValor(e.target.value)}
            disabled={guardando}
            spellCheck={false}
            className="min-h-[38vh] font-mono text-13 leading-relaxed"
          />
        )}

        <span className="self-end font-ui text-12 tabular-nums text-text-3">{textos.caracteres(valor.length)}</span>
      </div>
    </Modal>
  );
}

function BotonFormato({
  herramienta,
  disabled,
  onAplicar,
}: {
  herramienta: Herramienta;
  disabled: boolean;
  onAplicar: () => void;
}) {
  const Icono = herramienta.icono;
  return (
    <button
      type="button"
      // Sin este preventDefault el clic quita el foco del textarea ANTES del
      // onClick y la selección se pierde: la marca acabaría siempre al final.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAplicar}
      disabled={disabled}
      title={herramienta.etiqueta}
      aria-label={herramienta.etiqueta}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-control text-text-2 transition-colors duration-150',
        'hover:bg-accent-soft hover:text-accent-fg',
        'disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:bg-transparent'
      )}
    >
      <Icono size={16} strokeWidth={2} />
    </button>
  );
}

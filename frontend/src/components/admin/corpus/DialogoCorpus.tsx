import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Corpus } from '../../../types';
import { Banner, Button, Field, Input, Modal, Textarea } from '../../ui';
import { cn } from '../../../lib/cn';
import { admin as copy } from '../../../copy';
import { useDialogoAccesible } from './useDialogoAccesible';
import { CLAVE_ICONO_NEUTRO, ICONOS_CORPUS } from './iconos';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  tituloEditar: 'Editar base',
  nombre: 'Nombre de la base',
  nombreAyuda: 'Como la nombrarías en una junta: "Normativa académica", "Soporte TI".',
  nombrePlaceholder: 'Normativa académica',
  descripcion: 'Qué contiene',
  descripcionAyuda: 'Una línea. Es lo que se lee en la tarjeta.',
  descripcionPlaceholder: 'Reglamentos y lineamientos vigentes de docencia.',
  icono: 'Icono',
  iconoAyuda: 'Es lo que se ve en la tarjeta de la base y lo que la distingue de un vistazo.',
  prompt: `${copy.systemPrompt} (opcional)`,
  promptAyuda: 'Puedes dejarlo en blanco y escribirlo después.',
  promptAparte: `El ${copy.systemPrompt.toLowerCase()} no se toca aquí: tiene su propio editor, con su borrador y sus cambios sin guardar.`,
  cancelar: 'Cancelar',
  crear: 'Crear base',
  guardar: 'Guardar cambios',
  errorNombre: 'Escribe un nombre de al menos 3 caracteres.',
  errorNombreRepetido: 'Ya existe una base con ese nombre. Elige otro para no confundirlas.',
  errorDescripcion: 'Describe en una línea qué documentos va a contener.',
  errorCrear: 'No pudimos crear la base. Revisa tu conexión e intenta de nuevo.',
  errorGuardar: 'No pudimos guardar los cambios. La base sigue como estaba; intenta de nuevo.',
};

const MIN_NOMBRE = 3;

/**
 * Datos que devuelve el formulario.
 *
 * `systemPrompt` es OPCIONAL y solo viaja al crear. Al editar no se manda
 * siquiera vacío, porque "vacío" y "no lo toques" son cosas distintas: el
 * prompt se escribe en `EditorPrompt`, que tiene borrador y estado sucio
 * propios, y `actualizarCorpus` deliberadamente no lo pisa. Un campo que se
 * enviara de más aquí acabaría borrando lo que alguien tiene a medio escribir
 * en el otro editor.
 */
export interface DatosCorpus {
  nombre: string;
  descripcion: string;
  icono: string;
  systemPrompt?: string;
}

/**
 * Alta y edición de una base de conocimiento. UN solo formulario para los dos
 * modos: mismos campos, misma validación incremental y mismo selector de
 * iconos. `corpus` es lo que decide el modo — `null` crea, un corpus edita.
 *
 * Duplicarlo en dos diálogos era la alternativa, y es justo como se desincroniza
 * un formulario: se arregla la validación en uno y el otro se queda con el bug.
 *
 * Cada control lleva su `aria-label` a mano porque `Field` pinta la etiqueta
 * pero no la asocia (no expone `htmlFor`/`id`): sin esto, un lector de
 * pantalla anuncia "cuadro de texto" tres veces seguidas.
 *
 * La validación es INCREMENTAL: un campo solo puede mostrar error después de
 * que la persona salió de él o intentó enviar. Marcar en rojo un campo que
 * todavía no se termina de escribir se lee como un reproche.
 */
export function DialogoCorpus({
  abierto,
  corpus,
  nombresExistentes,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean;
  /** `null` = alta. Con un corpus, el formulario abre precargado y edita. */
  corpus: Corpus | null;
  nombresExistentes: string[];
  onCerrar: () => void;
  onGuardar: (datos: DatosCorpus) => Promise<void>;
}) {
  const editando = corpus !== null;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prompt, setPrompt] = useState('');
  // Al crear arranca en el neutro y no en uno al azar: el icono sirve para
  // reconocer la base, y uno distinto en cada apertura haría lo contrario.
  const [icono, setIcono] = useState(CLAVE_ICONO_NEUTRO);
  const [tocados, setTocados] = useState<{ nombre: boolean; descripcion: boolean }>({
    nombre: false,
    descripcion: false,
  });
  const [enviando, setEnviando] = useState(false);
  const [errorServicio, setErrorServicio] = useState(false);

  // Se siembra AL ABRIR y no al cerrar: si se limpiara al cerrar, el formulario
  // se vaciaría delante de los ojos durante la animación de salida.
  //
  // La dependencia es `corpus?.id` y no `corpus`: el objeto se sustituye entero
  // cada vez que la lista de bases cambia (guardar, indexar, tocar la fecha), y
  // con el objeto en las dependencias el formulario se resembraría solo,
  // borrando lo que la persona está escribiendo.
  const corpusId = corpus?.id ?? null;
  useEffect(() => {
    if (!abierto) return;
    setNombre(corpus?.nombre ?? '');
    setDescripcion(corpus?.descripcion ?? '');
    setPrompt('');
    setIcono(corpus?.icono ?? CLAVE_ICONO_NEUTRO);
    // Al editar, los campos nacen "tocados": el dato ya existe y ya se salió de
    // él alguna vez, así que si estuviera mal, decirlo de entrada es ayuda, no
    // reproche. Al crear se estrenan limpios.
    setTocados({ nombre: editando, descripcion: editando });
    setEnviando(false);
    setErrorServicio(false);
  }, [abierto, corpusId, editando]);

  const cerrar = useCallback(() => {
    if (!enviando) onCerrar();
  }, [enviando, onCerrar]);

  useDialogoAccesible(abierto, cerrar);

  const limpio = nombre.trim();
  // El NOMBRE PROPIO no cuenta como repetido: sin esta salvedad, abrir la
  // edición de una base y guardar sin tocar el nombre la acusaría de chocar
  // consigo misma. Es el fallo clásico de este formulario.
  const nombrePropio = corpus?.nombre.trim().toLowerCase() ?? null;
  const repetido = nombresExistentes.some((n) => {
    const otro = n.trim().toLowerCase();
    return otro === limpio.toLowerCase() && otro !== nombrePropio;
  });
  const errorNombre =
    limpio.length < MIN_NOMBRE ? textos.errorNombre : repetido ? textos.errorNombreRepetido : null;
  const errorDescripcion = descripcion.trim().length === 0 ? textos.errorDescripcion : null;
  const valido = !errorNombre && !errorDescripcion;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTocados({ nombre: true, descripcion: true });
    if (!valido || enviando) return;
    setEnviando(true);
    setErrorServicio(false);
    try {
      await onGuardar({
        nombre: limpio,
        descripcion: descripcion.trim(),
        icono,
        ...(editando ? {} : { systemPrompt: prompt.trim() }),
      });
    } catch {
      setErrorServicio(true);
      setEnviando(false);
    }
  }

  return (
    <Modal
      open={abierto}
      onClose={cerrar}
      title={editando ? textos.tituloEditar : copy.nuevoCorpus}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={cerrar} disabled={enviando}>
            {textos.cancelar}
          </Button>
          {/* El botón nombra su acción, nunca "Aceptar": lo que se va a hacer
              tiene que leerse en el botón, no deducirse del título. */}
          <Button variant="primary" type="submit" form="form-corpus" loading={enviando}>
            {editando ? textos.guardar : textos.crear}
          </Button>
        </>
      }
    >
      <form id="form-corpus" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {/* El fallo del servicio se anuncia arriba del formulario, no colgado
            de un campo: no es culpa de ningún dato escrito. */}
        {errorServicio && <Banner tone="red">{editando ? textos.errorGuardar : textos.errorCrear}</Banner>}

        <Field
          label={textos.nombre}
          required
          hint={textos.nombreAyuda}
          error={tocados.nombre && errorNombre ? errorNombre : undefined}
        >
          <Input
            aria-label={textos.nombre}
            aria-invalid={tocados.nombre && errorNombre ? true : undefined}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocados((t) => ({ ...t, nombre: true }))}
            placeholder={textos.nombrePlaceholder}
            valid={!errorNombre}
            maxLength={60}
            disabled={enviando}
          />
        </Field>

        <Field
          label={textos.descripcion}
          required
          hint={textos.descripcionAyuda}
          error={tocados.descripcion && errorDescripcion ? errorDescripcion : undefined}
        >
          <Input
            aria-label={textos.descripcion}
            aria-invalid={tocados.descripcion && errorDescripcion ? true : undefined}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={() => setTocados((t) => ({ ...t, descripcion: true }))}
            placeholder={textos.descripcionPlaceholder}
            valid={!errorDescripcion}
            maxLength={120}
            disabled={enviando}
          />
        </Field>

        {/* Selector de icono: RADIOS NATIVOS dentro de un fieldset.
            Una rejilla de botones con `aria-pressed` obligaría a reimplementar
            a mano la navegación con flechas, el foco de grupo y el anuncio de
            "opción 3 de 12"; el grupo de radios trae las tres cosas de fábrica.
            El input va en `sr-only` y no en `display:none` porque un input
            oculto de verdad no es enfocable ni existe para el lector.

            El fieldset NO es flex: el navegador coloca la `legend` fuera del
            flujo normal (va "dentro del borde"), y como ítem flexible se
            comporta distinto en cada motor. Bloque + márgenes es lo predecible.
            `min-w-0` porque un fieldset trae `min-width: min-content` de fábrica
            y eso desborda la rejilla en anchos chicos. */}
        <fieldset className="min-w-0" disabled={enviando}>
          <legend className="mb-1.5 font-ui text-13 font-medium text-text-2">{textos.icono}</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {ICONOS_CORPUS.map(({ clave, etiqueta, componente: Icono }) => (
              <label
                key={clave}
                title={etiqueta}
                className="relative flex h-11 cursor-pointer items-center justify-center"
              >
                <input
                  type="radio"
                  name="icono-corpus"
                  value={clave}
                  checked={icono === clave}
                  onChange={() => setIcono(clave)}
                  className="peer sr-only"
                />
                {/* Elegido = borde de acento + relleno tenue: el mismo código
                    visual que la tarjeta de corpus activa y que la fila de
                    documento abierta. Tres formas distintas de decir "esto es
                    lo seleccionado" en una pantalla serían tres códigos que
                    aprender. */}
                <span
                  aria-hidden
                  className={cn(
                    'flex h-full w-full items-center justify-center rounded-control border',
                    'border-hairline bg-surface-1 text-text-2 transition-colors duration-150',
                    'hover:border-accent/40 hover:bg-accent-soft hover:text-accent-fg',
                    'peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent-fg',
                    'peer-focus-visible:border-accent peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent-soft'
                  )}
                >
                  <Icono size={18} strokeWidth={1.75} />
                </span>
                <span className="sr-only">{etiqueta}</span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 font-ui text-12 text-text-3">{textos.iconoAyuda}</p>
        </fieldset>

        {/* El system prompt solo se escribe AL CREAR, que es el único momento en
            que la base todavía no tiene editor propio abierto en ningún lado.
            Al editar se dice dónde vive, en vez de ofrecer un segundo sitio
            donde escribir lo mismo. */}
        {editando ? (
          <p className="font-ui text-12 leading-relaxed text-text-3">{textos.promptAparte}</p>
        ) : (
          <Field label={textos.prompt} hint={textos.promptAyuda}>
            <Textarea
              aria-label={textos.prompt}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              spellCheck={false}
              disabled={enviando}
              className="min-h-[120px] font-mono text-13"
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}

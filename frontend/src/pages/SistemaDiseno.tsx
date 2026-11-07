import { useState, type ReactNode } from 'react';
import { Download, Plus, Users } from 'lucide-react';
import {
  AnimatedNumber, Banner, Button, Card, DataTable, Drawer, EmptyState, ErrorState, Field,
  IconButton, Input, KpiCard, Modal, PageEnter, Pagination, SegmentedControl, Select,
  Skeleton, StatusPill, Tabs, Textarea, useToast, type Column,
} from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import { GraficaUmbral } from '../components/brand/GraficaUmbral';
import { BurbujaTrabajando, IsotipoPensando, PensandoUmbral, ProcesoAgente } from '../components/chat/IndicadorPensando';
import type { ItemProceso } from '../types';

const PROCESO_EJEMPLO: ItemProceso[] = [
  { tipo: 'pensamiento', texto: 'Primero reviso el índice de temas para ubicar la clase, luego leo su resumen.' },
  { tipo: 'paso', id: 'a', clase: 'herramienta', nombre: 'Read', descripcion: 'Revisando el índice de temas', detalle: null, estado: 'listo', dentroDe: null },
  { tipo: 'paso', id: 'b', clase: 'herramienta', nombre: 'Grep', descripcion: 'Buscando «mediana» en el material', detalle: null, estado: 'listo', dentroDe: null },
];

/**
 * Vista previa del sistema de diseño. No es una pantalla de producto: es la
 * referencia viva contra la que se revisa cualquier pantalla nueva. Si un
 * componente no aparece aquí, no existe en el sistema.
 *
 * Vive en /_dev/sistema-diseno, fuera del shell y sin sesión: es documentación
 * del equipo.
 */

type Fila = { id: string; folio: string; titulo: string; area: string; fecha: string; estatus: string; alcance: number };

const FILAS: Fila[] = [
  { id: '1', folio: 'GUI-0241', titulo: 'Resumir la bandeja con Copilot', area: 'Correo', fecha: '02 sep 2026', estatus: 'Publicado', alcance: 4820 },
  { id: '2', folio: 'GUI-0240', titulo: 'Resumen ejecutivo desde Word', area: 'Documentos', fecha: '01 sep 2026', estatus: 'En revisión', alcance: 3105 },
  { id: '3', folio: 'GUI-0239', titulo: 'Restablecer contraseña', area: 'TI', fecha: '29 ago 2026', estatus: 'Pendiente', alcance: 1974 },
  { id: '4', folio: 'GUI-0238', titulo: 'Minutas de Teams', area: 'Reuniones', fecha: '27 ago 2026', estatus: 'Programado', alcance: 860 },
  { id: '5', folio: 'GUI-0237', titulo: 'IA en la evaluación', area: 'Gobernanza', fecha: '25 ago 2026', estatus: 'Vencido', alcance: 6432 },
];

const COLUMNAS: Column<Fila>[] = [
  { key: 'folio', header: 'Folio', mono: true, cardTitle: true, width: 110 },
  { key: 'titulo', header: 'Título' },
  { key: 'area', header: 'Categoría' },
  { key: 'fecha', header: 'Fecha' },
  { key: 'estatus', header: 'Estatus', render: (r) => <StatusPill label={r.estatus} /> },
  { key: 'alcance', header: 'Lecturas', mono: true, align: 'right', render: (r) => r.alcance.toLocaleString('es-MX') },
];

export function SistemaDiseno() {
  const { push } = useToast();
  const [vista, setVista] = useState('tabla');
  const [tab, setTab] = useState('componentes');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [pagina, setPagina] = useState(3);

  return (
    <div className="h-full overflow-y-auto">
      <PageEnter className="mx-auto w-full flex max-w-[1400px] flex-col gap-8 px-4 py-8 lg:px-8">
        <PageHeader
          title="Sistema de diseño"
          subtitle="Referencia viva · identidad Umbral sobre la mecánica Apple-feel de CUSOL"
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => push({ message: 'Exportando referencia…' })}>
                <Download size={14} /> Exportar
              </Button>
              <Button size="sm" onClick={() => setModalAbierto(true)}>
                <Plus size={14} /> Acción primaria
              </Button>
            </>
          }
        />

        <Banner tone="blue" action={<Button variant="ghost" size="sm">Entendido</Button>}>
          Todo lo que ves aquí usa los tokens de <strong>src/index.css</strong>. Cambia una variable y se repinta la app entera.
        </Banner>

        <Seccion titulo="Color" descripcion="Azul cobalto para marca y acción. El riesgo usa un rojo terroso y la información un azul petróleo, para que un mismo color nunca signifique 'haz clic' y 'cuidado'.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Muestra nombre="accent" valor="#2F5FE4" clase="bg-accent" />
            <Muestra nombre="accent-fg" valor="#1D41A3" clase="bg-accent-strong" />
            <Muestra nombre="riesgo" valor="#8F2E22" clase="bg-status-red" />
            <Muestra nombre="éxito" valor="#1E7A4F" clase="bg-status-green" />
            <Muestra nombre="aviso" valor="#8A5A00" clase="bg-status-amber" />
            <Muestra nombre="info" valor="#17707F" clase="bg-status-blue" />
          </div>
        </Seccion>

        <Seccion
          titulo="Tipografía"
          descripcion="Una sola familia, Google Sans. Escala cerrada de interfaz (12–15 y 22/28/40) más dos excepciones documentadas: los tamaños de LECTURA 16/26 y 18/26 (respuesta del agente y documentos, ≈72 caracteres por línea a 680 px) y el saludo 32/40 del chat. La jerarquía se construye con peso y tamaño, nunca con color."
        >
          <Card className="flex flex-col gap-3 p-6">
            <p className="font-ui text-40 text-text-1">Umbral</p>
            <p className="font-ui text-32 text-text-1">Saludo 32/40 — estado vacío del chat</p>
            <p className="font-ui text-28 text-text-1">Titular de sección</p>
            <p className="font-ui text-22 text-text-1">Título de pantalla</p>
            <p className="font-ui text-15 font-medium text-text-1">
              Encabezado de tarjeta 15 — el escalón más chico de la jerarquía.
            </p>
            <div className="max-w-[680px] rounded-tarjeta bg-bg p-5">
              <p className="font-ui text-18 text-text-1">Lectura h2 18/26</p>
              <p className="mt-2 font-ui text-16 text-text-1">
                Lectura 16/26 — el cuerpo de la respuesta del agente. A 680 px de ancho caben unos setenta y dos
                caracteres por línea: lo bastante para no cortar las ideas y lo bastante corto para no perder el renglón.
              </p>
            </div>
            <p className="font-ui text-15 text-text-1">Cuerpo 15 — el tamaño por defecto de formularios y del mensaje del usuario.</p>
            <p className="font-ui text-14 text-text-1">Cuerpo 14 — interfaz densa y botones.</p>
            <p className="font-ui text-13 text-text-2">Secundario 13 — etiquetas, celdas de tabla, ayudas.</p>
            <p className="font-ui text-12 text-text-3">Metadato 12 — solo texto no esencial.</p>
            <p className="font-ui text-13 tabular-nums text-text-1">Cifras tabulares · 02/09/2026 · 148,320</p>

          </Card>
        </Seccion>

        <Seccion titulo="Elevación y radios" descripcion="Tres capas de sombra, cada una con dos sombras superpuestas y teñidas de pizarra, más las sombras con anillo (el borde es la primera capa: borde y sombra se componen sin doblarse). Los radios se anidan: radio interior = radio exterior − relleno.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['rounded-xs', 'xs · 6', 'Código en línea, kbd'],
              ['rounded-celda', 'celda · 8', 'Filas de menú, acciones'],
              ['rounded-control', 'control · 10', 'Botones, inputs'],
              ['rounded-menu', 'menu · 14', 'Menús y popovers'],
              ['rounded-burbuja', 'burbuja · 20', 'Mensaje del usuario'],
              ['rounded-tarjeta', 'tarjeta · 20', 'Tarjetas'],
              ['rounded-composer', 'composer · 24', 'Barra de entrada'],
              ['rounded-modal', 'modal · 28', 'Modales y hojas'],
              ['rounded-pastilla', 'pastilla', 'StatusPill y chips'],
            ].map(([clase, nombre, uso]) => (
              <div key={clase} className="flex flex-col gap-2">
                <div className={`h-14 bg-surface-1 shadow-anillo ${clase}`} />
                <p className="font-ui text-13 font-medium text-text-1">{nombre}</p>
                <p className="-mt-1.5 font-ui text-12 text-text-3">{uso}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
            <div className="rounded-composer bg-surface-1 p-6 shadow-composer">
              <p className="font-ui text-14 font-semibold text-text-1">shadow-composer</p>
              <p className="mt-1 font-ui text-13 text-text-2">Con foco pasa a shadow-composer-foco: se asienta, sin anillo azul.</p>
            </div>
            <div className="rounded-menu bg-surface-3 p-6 shadow-menu">
              <p className="font-ui text-14 font-semibold text-text-1">shadow-menu</p>
              <p className="mt-1 font-ui text-13 text-text-2">Menús, popovers, &quot;Ir al último&quot;.</p>
            </div>
            <div className="rounded-burbuja bg-burbuja px-4 py-2.5">
              <p className="font-ui text-15 leading-6 text-text-1">Burbuja del usuario: gris pizarra, sin borde ni sombra.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-tarjeta bg-surface-1 p-6 shadow-1">
              <p className="font-ui text-14 font-semibold text-text-1">Elevación 1</p>
              <p className="mt-1 font-ui text-13 text-text-2">Reposo: tarjetas y filas.</p>
            </div>
            <div className="rounded-tarjeta bg-surface-1 p-6 shadow-2">
              <p className="font-ui text-14 font-semibold text-text-1">Elevación 2</p>
              <p className="mt-1 font-ui text-13 text-text-2">Hover: algo se levanta.</p>
            </div>
            <div className="rounded-tarjeta bg-surface-1 p-6 shadow-3">
              <p className="font-ui text-14 font-semibold text-text-1">Elevación 3</p>
              <p className="mt-1 font-ui text-13 text-text-2">Flotante: modal, cajón, toast.</p>
            </div>
          </div>
        </Seccion>

        <Seccion
          titulo="La espera del agente"
          descripcion="Sin skeleton: un chat no sabe cuánto medirá la respuesta. El isotipo vivo (28 px) se dibuja una vez y luego un pulso de luz recorre la M —cada nodo crece al paso y en el valle sale una onda—, con la frase de actividad en brillo. Al llegar el primer token se encoge hasta la cabecera del Proceso (16 px, quieto). La burbujita dice que sigue trabajando, también a media respuesta. Con movimiento reducido todo pasa a un latido de opacidad."
        >
          <Card className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-center gap-8">
              <PensandoUmbral frase="Buscando «mediana» en el material…" />
              <span className="flex items-center gap-3 text-accent">
                <IsotipoPensando tamano={28} />
                <IsotipoPensando tamano={16} animado={false} className="text-text-3" />
              </span>
              <BurbujaTrabajando etiqueta="Escribiendo" />
              <BurbujaTrabajando etiqueta="Trabajando" actividad="Leyendo el resumen de la Clase 12…" />
            </div>
            <div className="max-w-[680px]">
              <ProcesoAgente items={PROCESO_EJEMPLO} modo="terminado" pensoMs={8200} />
            </div>
          </Card>
        </Seccion>

        <Seccion
          titulo="La gráfica del umbral"
          descripcion="Las pantallas de acceso no usan tarjeta ni degradado: la otra mitad es la función umbral a escala real (histograma bimodal, escalón T(r), umbral de Otsu). Se traza una vez al montar; al entrar, el nodo del umbral sube al nivel alto. El azul es el único acento."
        >
          <Card className="grid gap-6 p-6 md:grid-cols-2">
            <GraficaUmbral />
            <GraficaUmbral cruzado />
          </Card>
        </Seccion>

        <Seccion titulo="Motion" descripcion="Un resorte por papel (src/lib/motion.ts). El hover nunca mueve nada: solo cambia el color en 120 ms.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['springPress', '700 / 40 / 0.6', 'Respuesta a un dedo: whileTap scale .96–.97.'],
              ['springMensaje', '320 / 32 / 1', 'Mensajes que entran: y 12→0 y blur 2→0.'],
              ['springPanel', '420 / 36 / 0.8', 'Menús y popovers desde su ancla; salen en 120 ms.'],
              ['springLayout', '380 / 38', 'Lo que cambia de sitio o tamaño: composer, Proceso.'],
            ].map(([nombre, valores, uso]) => (
              <div key={nombre} className="rounded-tarjeta bg-surface-1 p-5 shadow-anillo">
                <p className="font-mono text-13 text-text-1">{nombre}</p>
                <p className="font-ui text-12 tabular-nums text-text-3">{valores}</p>
                <p className="mt-2 font-ui text-13 text-text-2">{uso}</p>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Indicadores" descripcion="Las cifras cuentan al entrar en pantalla, no al cargar la app, y arrancan cerca del valor final para que se sientan aterrizando y no progresando.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Archivos del corpus" value={<AnimatedNumber value={241} />} detail="Carpeta del agente" />
            <KpiCard label="Consultas atendidas" value={<AnimatedNumber value={17191} />} detail="Últimos 30 días" />
            <KpiCard label="Sesiones activas" value={<AnimatedNumber value={38} />} detail="Ahora mismo" />
            <KpiCard label="Pendientes" value={<AnimatedNumber value={7} />} detail="Requieren revisión" active />
          </div>
        </Seccion>

        <Seccion titulo="Acciones" descripcion="Un solo botón rojo por pantalla. Si dos compiten, ninguno es primario. Deshabilitado cambia de color, nunca es el mismo botón con opacidad.">
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Guardar cambios</Button>
              <Button variant="secondary">Cancelar</Button>
              <Button variant="ghost">Ver detalle</Button>
              <Button variant="destructive">Eliminar documento</Button>
              <Button disabled>No disponible</Button>
              <Button loading>Guardando</Button>
              <IconButton aria-label="Descargar"><Download size={18} /></IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeño</Button>
              <Button size="md">Mediano</Button>
              <Button size="lg">Grande</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => push({ message: 'Cambios guardados', tone: 'success' })}>Toast de éxito</Button>
              <Button variant="secondary" onClick={() => push({ message: 'No pudimos guardar. Revisa tu conexión.', tone: 'error' })}>Toast de error</Button>
              <Button variant="secondary" onClick={() => setModalAbierto(true)}>Abrir modal</Button>
              <Button variant="secondary" onClick={() => setDrawerAbierto(true)}>Abrir panel lateral</Button>
            </div>
          </Card>
        </Seccion>

        <Seccion titulo="Selección" descripcion="El segmented filtra el mismo contenido; los tabs navegan entre secciones. Formas distintas para funciones distintas.">
          <Card className="flex flex-col gap-6 p-6">
            <SegmentedControl
              options={[
                { value: 'tabla', label: 'Tabla' },
                { value: 'tarjetas', label: 'Tarjetas' },
                { value: 'calendario', label: 'Calendario' },
              ]}
              value={vista}
              onChange={setVista}
            />
            <Tabs
              items={[
                { value: 'componentes', label: 'Componentes' },
                { value: 'estados', label: 'Estados' },
                { value: 'motion', label: 'Motion' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="flex flex-wrap gap-2">
              {['Publicado', 'En revisión', 'Pendiente', 'Vencido', 'Programado'].map((e) => (
                <StatusPill key={e} label={e} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {['Publicado', 'Pendiente', 'Vencido'].map((e) => (
                <StatusPill key={e} label={e} variant="dot" />
              ))}
            </div>
          </Card>
        </Seccion>

        <Seccion titulo="Formularios" descripcion="Validación incremental, al salir del campo. El anillo de foco es el color de marca al 9%, no un halo azul de navegador.">
          <Card className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <Field label="Nombre del corpus" required hint="Aparece en la tarjeta de administración.">
              <Input placeholder="Gobernanza de IA" valid />
            </Field>
            <Field label="Categoría">
              <Select defaultValue="">
                <option value="" disabled>Selecciona una categoría</option>
                <option>Correo</option>
                <option>Documentos</option>
                <option>Gobernanza</option>
              </Select>
            </Field>
            <Field label="Identificador" hint="Se genera automáticamente.">
              <Input readOnly value="corpus-gobernanza" />
            </Field>
            <Field label="Fecha de publicación" error="Elige una fecha posterior a hoy.">
              <Input type="date" defaultValue="2026-08-01" />
            </Field>
            <Field label="System prompt" className="md:col-span-2" hint="Máximo 4000 caracteres.">
              <Textarea placeholder="Eres el asistente interno de la Universidad Aurora…" />
            </Field>
          </Card>
        </Seccion>

        <Seccion titulo="Tabla" descripcion="Una sola definición de columnas: tabla real en escritorio, tarjetas apiladas en móvil. Reduce el ancho de la ventana para verlo.">
          <div className="flex flex-col gap-4">
            <DataTable columns={COLUMNAS} rows={FILAS} onRowClick={() => setDrawerAbierto(true)} />
            <Pagination page={pagina} totalPages={12} onChange={setPagina} className="self-end" />
          </div>
        </Seccion>

        <Seccion titulo="Los cinco estados" descripcion="Ninguna pantalla está terminada si solo existe el caso ideal. Cargando reutiliza el encabezado real, así que el layout no brinca al llegar los datos.">
          <div className="flex flex-col gap-4">
            <DataTable columns={COLUMNAS} rows={[]} state="loading" skeletonRows={3} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-tarjeta border border-hairline bg-surface-1">
                <EmptyState
                  icon={Users}
                  title="Todavía nadie ha preguntado"
                  description="Cuando alguien use el asistente, su consulta aparecerá aquí."
                  action={<Button size="sm" onClick={() => setModalAbierto(true)}><Plus size={14} /> Invitar a alguien</Button>}
                />
              </div>
              <div className="rounded-tarjeta border border-hairline bg-surface-1">
                <ErrorState onRetry={() => push({ message: 'Reintentando…' })} />
              </div>
            </div>
            <Card className="flex flex-col gap-3 p-6">
              <p className="font-ui text-13 font-medium text-text-2">Estado parcial — parte del contenido ya llegó</p>
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-control" />
                <div className="flex flex-1 flex-col gap-2">
                  <p className="font-ui text-15 text-text-1">Resumir la bandeja con Copilot</p>
                  <Skeleton className="h-3 w-2/5" />
                </div>
              </div>
            </Card>
          </div>
        </Seccion>

        <Modal
          open={modalAbierto}
          onClose={() => setModalAbierto(false)}
          title="Nuevo corpus"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
              <Button onClick={() => { setModalAbierto(false); push({ message: 'Corpus creado', tone: 'success' }); }}>
                Crear corpus
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Nombre" required><Input placeholder="Nombre del corpus" /></Field>
            <Field label="Descripción"><Textarea placeholder="Qué contiene este corpus…" /></Field>
          </div>
        </Modal>

        <Drawer
          open={drawerAbierto}
          onClose={() => setDrawerAbierto(false)}
          title="GUI-0241"
          footer={<Button variant="secondary" onClick={() => setDrawerAbierto(false)}>Cerrar</Button>}
        >
          <div className="flex flex-col gap-4">
            <StatusPill label="Publicado" />
            <p className="font-ui text-22 text-text-1">Resumir la bandeja con Copilot</p>
            <p className="font-ui text-15 text-text-2">
              El panel lateral es para consultar o editar un registro sin perder de vista la lista de la que salió.
            </p>
          </div>
        </Drawer>
      </PageEnter>
    </div>
  );
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: string; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-ui text-22 text-text-1">{titulo}</h2>
        <p className="mt-1 max-w-2xl font-ui text-13 text-text-2">{descripcion}</p>
      </div>
      {children}
    </section>
  );
}

function Muestra({ nombre, valor, clase }: { nombre: string; valor: string; clase: string }) {
  return (
    <div className="overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
      <div className={`flex h-16 items-end p-3 ${clase}`}>
        <span className="font-ui text-12 font-semibold text-white">Aa</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="font-ui text-13 font-medium text-text-1">{nombre}</p>
        <p className="font-ui text-12 tabular-nums text-text-3">{valor}</p>
      </div>
    </div>
  );
}

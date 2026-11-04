import { useState, type ReactNode } from 'react';
import { CalendarDays, Download, FileText, Newspaper, Plus, Users } from 'lucide-react';
import {
  AnimatedNumber, Banner, Button, Card, DataTable, Drawer, EmptyState, ErrorState, Field,
  IconButton, Input, KpiCard, Modal, PageEnter, Pagination, SegmentedControl, Select,
  Skeleton, StatusPill, Tabs, Textarea, useToast, type Column,
} from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';

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
      <PageEnter className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-8 lg:px-8">
        <PageHeader
          title="Sistema de diseño"
          subtitle="Referencia viva · identidad Aurora sobre la mecánica Apple-feel de CUSOL"
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

        <Seccion titulo="Color" descripcion="Rojo Pantone 185 C para marca y acción. El riesgo usa un rojo terroso aparte, para que un mismo color nunca signifique 'haz clic' y 'cuidado'.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Muestra nombre="accent" valor="#E00034" clase="bg-accent" />
            <Muestra nombre="accent-fg" valor="#A30026" clase="bg-accent-strong" />
            <Muestra nombre="riesgo" valor="#8F2E22" clase="bg-status-red" />
            <Muestra nombre="éxito" valor="#1E7A4F" clase="bg-status-green" />
            <Muestra nombre="aviso" valor="#8A5A00" clase="bg-status-amber" />
            <Muestra nombre="info" valor="#1F5F8B" clase="bg-status-blue" />
          </div>
        </Seccion>

        <Seccion
          titulo="Tipografía"
          descripcion="Una sola familia, Google Sans. Siete tamaños, ni uno más — la jerarquía se construye con peso y tamaño, nunca con color ni cambiando de letra."
        >
          <Card className="flex flex-col gap-3 p-6">
            <p className="font-ui text-40 text-text-1">Umbral</p>
            <p className="font-ui text-28 text-text-1">Titular de sección</p>
            <p className="font-ui text-22 text-text-1">Título de pantalla</p>
            <p className="font-ui text-15 font-medium text-text-1">
              Encabezado de tarjeta 15 — el escalón más chico de la jerarquía.
            </p>
            <p className="font-ui text-15 text-text-1">Cuerpo 15 — el tamaño por defecto de formularios y contenido.</p>
            <p className="font-ui text-14 text-text-1">Cuerpo 14 — interfaz densa y botones.</p>
            <p className="font-ui text-13 text-text-2">Secundario 13 — etiquetas, celdas de tabla, ayudas.</p>
            <p className="font-ui text-12 text-text-3">Metadato 12 — solo texto no esencial.</p>
            <p className="font-ui text-13 tabular-nums text-text-1">Cifras tabulares · 02/09/2026 · 148,320</p>

          </Card>
        </Seccion>

        <Seccion titulo="Elevación y radios" descripcion="Tres capas de sombra, cada una con dos sombras superpuestas y teñidas de cálido. Los radios se anidan: modal › tarjeta › control › celda.">
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

        <Seccion titulo="Indicadores" descripcion="Las cifras cuentan al entrar en pantalla, no al cargar la app, y arrancan cerca del valor final para que se sientan aterrizando y no progresando.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Newspaper} label="Guías publicadas" value={<AnimatedNumber value={241} />} detail="Ciclo 2026" />
            <KpiCard icon={Users} label="Consultas atendidas" value={<AnimatedNumber value={17191} />} detail="Últimos 30 días" />
            <KpiCard icon={CalendarDays} label="Sesiones activas" value={<AnimatedNumber value={38} />} detail="Ahora mismo" />
            <KpiCard icon={FileText} label="Pendientes" value={<AnimatedNumber value={7} />} detail="Requieren revisión" active />
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

        <Seccion titulo="Formularios" descripcion="Validación incremental, al salir del campo. El anillo de foco es el rojo de marca al 9%, no un halo azul de navegador.">
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
                  icon={Newspaper}
                  title="Todavía no hay guías"
                  description="Crea la primera y aparecerá aquí junto con sus lecturas."
                  action={<Button size="sm" onClick={() => setModalAbierto(true)}><Plus size={14} /> Crear guía</Button>}
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

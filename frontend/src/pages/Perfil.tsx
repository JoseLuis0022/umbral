import { PageEnter, Card } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import { useAuth } from '../context/AuthContext';
import { perfil as copy } from '../copy';

export default function Perfil() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  const campos = [
    { etiqueta: copy.nombre, valor: usuario.nombre },
    { etiqueta: copy.correo, valor: usuario.correo },
    { etiqueta: copy.area, valor: usuario.area },
    { etiqueta: copy.rol, valor: usuario.rol === 'admin' ? 'Administrador' : 'Personal administrativo' },
  ];

  return (
    <PageEnter className="mx-auto flex max-w-2xl flex-col">
      <PageHeader title={copy.titulo} subtitle={copy.subtitulo} />
      <Card className="divide-y divide-hairline">
        <div className="flex items-center gap-4 p-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-22 font-semibold text-accent-fg">
            {usuario.iniciales}
          </span>
          <div className="min-w-0">
            <p className="truncate font-ui text-15 font-medium text-text-1">{usuario.nombre}</p>
            <p className="truncate font-ui text-13 text-text-2">{usuario.area}</p>
          </div>
        </div>
        <dl className="flex flex-col">
          {campos.map((c) => (
            <div key={c.etiqueta} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
              <dt className="w-48 shrink-0 font-ui text-13 text-text-2">{c.etiqueta}</dt>
              <dd className="min-w-0 truncate font-ui text-15 text-text-1">{c.valor}</dd>
            </div>
          ))}
        </dl>
        <p className="px-6 py-4 font-ui text-12 text-text-3">{copy.nota}</p>
      </Card>
    </PageEnter>
  );
}

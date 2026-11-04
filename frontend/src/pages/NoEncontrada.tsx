import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import { errores } from '../copy';

export default function NoEncontrada() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-tarjeta border border-hairline bg-surface-1">
        <EmptyState
          icon={Compass}
          title={errores.noEncontrada}
          description={errores.noEncontradaDetalle}
          action={<Button size="sm" onClick={() => navigate('/chat')}>{errores.volverInicio}</Button>}
        />
      </div>
    </div>
  );
}

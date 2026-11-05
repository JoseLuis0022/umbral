import { useState } from 'react';
import { Copy, Mail, Sparkles } from 'lucide-react';
import type { PlanCuenta } from '../../types';
import { Button, Modal } from '../ui';
import { invitado as copy } from '../../copy';

const dinero = (n: number) => n.toFixed(2);

/**
 * El aviso del modo invitado: qué modelo usa, cuánto crédito le queda y a
 * quién escribir para tener más. Se abre cuando se acaba el crédito (402 del
 * backend) o al pulsar la pastilla de crédito bajo el composer.
 */
export function ModalInvitado({ plan, abierto, onCerrar }: { plan: PlanCuenta; abierto: boolean; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const proporcion = Math.min(1, plan.limiteUsd ? plan.gastadoUsd / plan.limiteUsd : 1);
  const enlace = plan.contacto ? `mailto:${plan.contacto}?subject=${encodeURIComponent(copy.asunto)}` : null;

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title={copy.titulo}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCerrar}>
            {copy.cerrar}
          </Button>
          {enlace && (
            <Button size="sm" onClick={() => (window.location.href = enlace)}>
              <Mail size={14} /> {copy.escribirme}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-fg">
            <Sparkles size={17} aria-hidden />
          </span>
          <p className="font-ui text-14 leading-relaxed text-text-2">
            {plan.agotado && <strong className="block font-medium text-text-1">{copy.agotado}</strong>}
            {copy.detalle}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-tinta/[.07]">
            <div
              className={plan.agotado ? 'h-full rounded-full bg-status-red' : 'h-full rounded-full bg-accent'}
              style={{ width: `${Math.max(4, proporcion * 100)}%` }}
            />
          </div>
          <p className="font-ui text-12 tabular-nums text-text-3">{copy.credito(dinero(plan.gastadoUsd), dinero(plan.limiteUsd))}</p>
        </div>

        {plan.contacto ? (
          <div className="flex items-center gap-2 rounded-control bg-tinta/[.04] py-1.5 pl-3 pr-1.5">
            <span className="min-w-0 flex-1 truncate font-ui text-14 text-text-1">{plan.contacto}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(plan.contacto ?? '');
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1800);
              }}
            >
              <Copy size={13} /> {copiado ? copy.correoCopiado : copy.copiarCorreo}
            </Button>
          </div>
        ) : (
          <p className="font-ui text-13 text-text-3">{copy.sinContacto}</p>
        )}
      </div>
    </Modal>
  );
}

/** Crédito restante, bajo el composer. Abre el aviso al pulsarlo. */
export function PastillaInvitado({ plan, onAbrir }: { plan: PlanCuenta; onAbrir: () => void }) {
  const resto = Math.max(0, plan.limiteUsd - plan.gastadoUsd);
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={
        'inline-flex items-center gap-1.5 rounded-xs px-2 py-1 font-ui text-12 outline-none transition-colors duration-[120ms] ' +
        'hover:bg-tinta/[.05] focus-visible:ring-2 focus-visible:ring-accent ' +
        (plan.agotado ? 'text-status-red' : 'text-text-2')
      }
    >
      <Sparkles size={12} aria-hidden />
      {plan.agotado ? copy.agotado : copy.pastilla(dinero(resto))}
    </button>
  );
}

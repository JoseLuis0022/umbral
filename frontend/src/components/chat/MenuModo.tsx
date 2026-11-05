import { memo, useRef, useState, type RefObject } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Lock, MessageCircleQuestion, Wrench, type LucideIcon } from 'lucide-react';
import type { PerfilAgente } from '../../types';
import { cn } from '../../lib/cn';
import { dur, salidaPanel, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Z_MENU_ANCLADO } from '../ui';
import { copyLocal } from './copyLocal';

/**
 * Modo del agente (perfil del backend): Consulta, Generador de apuntes…
 *
 * Solo existe para cuentas con más de un modo; un alumno nunca lo ve. El modo
 * es de la CONVERSACIÓN: se elige antes del primer mensaje y después queda
 * fijo (el backend guarda una sesión del agente por conversación y perfil).
 * Fijo, el disparador se vuelve una etiqueta con candado que explica por qué.
 */

const ICONOS: Record<string, LucideIcon> = { consulta: MessageCircleQuestion, generador: Wrench };

const CLASE_DISPARADOR =
  'inline-flex h-8 min-w-0 max-w-[200px] items-center gap-1.5 rounded-celda px-2.5 font-ui text-13 font-medium text-text-2 outline-none transition-colors duration-[120ms]';

export const MenuModo = memo(function MenuModo({
  perfiles,
  actual,
  fijo,
  onCambiar,
  anclaRef,
}: {
  perfiles: PerfilAgente[];
  actual: string;
  fijo: boolean;
  onCambiar: (id: string) => void;
  /** El composer: el menú se separa de SU borde, no del disparador (ver MenuModelo). */
  anclaRef?: RefObject<HTMLElement>;
}) {
  const [abierto, setAbierto] = useState(false);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const [separacion, setSeparacion] = useState(8);
  const reducido = useReducedMotion();
  const perfil = perfiles.find((p) => p.id === actual) ?? perfiles[0];
  if (!perfil || perfiles.length < 2) return null;
  const Icono = ICONOS[perfil.id] ?? MessageCircleQuestion;

  if (fijo) {
    return (
      <span className={cn(CLASE_DISPARADOR, 'cursor-default')} title={copyLocal.modoFijo}>
        <Icono size={14} strokeWidth={2} aria-hidden className="shrink-0" />
        <span className="truncate">{perfil.nombre}</span>
        <Lock size={11} strokeWidth={2.25} aria-hidden className="shrink-0 text-text-3" />
        <span className="sr-only">{copyLocal.modoFijo}</span>
      </span>
    );
  }

  const animacion = reducido
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: salidaPanel }, transition: { duration: dur.fast } }
    : {
        initial: { opacity: 0, scale: 0.97, y: 4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 4, transition: salidaPanel },
        transition: springPanel,
      };

  return (
    <Menu.Root
      open={abierto}
      onOpenChange={(a) => {
        if (a) {
          const caja = disparadorRef.current?.getBoundingClientRect();
          const ancla = anclaRef?.current?.getBoundingClientRect();
          setSeparacion(caja && ancla ? Math.max(8, caja.top - ancla.top + 8) : 8);
        }
        setAbierto(a);
      }}
      modal={false}
    >
      <Menu.Trigger
        ref={disparadorRef}
        aria-label={copyLocal.modoEtiqueta(perfil.nombre)}
        className={cn(
          CLASE_DISPARADOR,
          'hover:bg-tinta/[.05] hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-tinta/[.05]',
          // Un modo distinto de consulta se SEÑALA: tiene herramientas que escriben.
          perfil.id !== 'consulta' && 'text-accent-fg'
        )}
      >
        <Icono size={14} strokeWidth={2} aria-hidden className="shrink-0" />
        <span className="truncate">{perfil.nombre}</span>
        <ChevronDown size={12} strokeWidth={2.25} aria-hidden className="shrink-0 text-text-3" />
      </Menu.Trigger>

      <AnimatePresence>
        {abierto && (
          <Menu.Portal forceMount>
            <Menu.Content forceMount asChild side="top" align="start" sideOffset={separacion} collisionPadding={8} style={{ zIndex: Z_MENU_ANCLADO }}>
              <motion.div
                {...animacion}
                style={{ transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)' }}
                className="w-[300px] rounded-menu bg-surface-3 p-1.5 shadow-menu outline-none"
              >
                <p className="px-2.5 pb-1 pt-1.5 font-ui text-12 text-text-3">{copyLocal.modoTitulo}</p>
                <Menu.RadioGroup value={perfil.id} onValueChange={onCambiar}>
                  {perfiles.map((p) => {
                    const I = ICONOS[p.id] ?? MessageCircleQuestion;
                    return (
                      <Menu.RadioItem
                        key={p.id}
                        value={p.id}
                        className="flex cursor-default select-none items-start gap-2.5 rounded-celda px-2.5 py-2 outline-none transition-colors duration-[120ms] data-[highlighted]:bg-tinta/[.05]"
                      >
                        <I size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-text-2" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-ui text-14 font-medium text-text-1">{p.nombre}</span>
                          <span className="block font-ui text-12 leading-snug text-text-2">{p.descripcion}</span>
                        </span>
                        <Menu.ItemIndicator className="mt-0.5 flex shrink-0 text-accent-fg">
                          <Check size={14} strokeWidth={2.5} />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    );
                  })}
                </Menu.RadioGroup>
                <p className="mt-1 border-t border-tinta/[.07] px-2.5 pb-1 pt-2 font-ui text-12 leading-snug text-text-3">
                  {copyLocal.modoNota}
                </p>
              </motion.div>
            </Menu.Content>
          </Menu.Portal>
        )}
      </AnimatePresence>
    </Menu.Root>
  );
});
